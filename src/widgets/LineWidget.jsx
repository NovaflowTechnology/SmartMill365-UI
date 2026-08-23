import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useId,
  useMemo,
  useRef,
} from "react";
import {
  TECH_AXIS_STROKE,
  TECH_GRID_STROKE,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  botanicalTooltipStyle,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_CHART_DISPLAY = {
  showGrid: true,
  showLegend: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: true,
  showDots: false,
  xAxisFormat: "auto",
  xAxisTickGap: 30,
  yAxisMode: "range",
  yAxisMin: "",
  yAxisMax: "",
  yAxisTickCount: 5,
  strokeWidth: 2.5,
  lineWeight: "normal", // "thin" | "normal" | "bold"
  curveType: "linear", // "linear" | "monotone" | "step"
  linePattern: "solid", // "solid" | "dashed" | "dotted"

  // LineWidget now supports both Line and Area rendering.
  // Keep the widget type as "line" and switch this setting only.
  chartStyle: "line", // "line" | "area"
  areaOpacity: 0.35,
  areaEndOpacity: 0.02,

  // Industrial chart options.
  compactLegend: true,
  showLatestValues: true,
  showZeroLine: false,
  autoScalePerSeries: false,
};

const normaliseTimestamp = (value) => {
  if (typeof value === "number") return value;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatXAxisTime = (
  timestamp,
  historyWindow,
  formatMode = "auto"
) => {
  const date = new Date(timestamp);

  if (formatMode === "time") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (formatMode === "date") {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  if (formatMode === "datetime") {
    return `${date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const dateBasedRanges = [
    "2d",
    "7d",
    "30d",
    "90d",
    "6mo",
    "1y",
    "2y",
    "5y",
    "yesterday",
    "dayBeforeYesterday",
    "thisWeek",
    "previousWeek",
    "thisMonth",
    "previousMonth",
    "previousQuarter",
    "thisYear",
    "previousYear",
    "custom",
  ];

  if (dateBasedRanges.includes(historyWindow)) {
    if (
      ["90d", "6mo", "1y", "2y", "5y"].includes(
        historyWindow
      )
    ) {
      return date.toLocaleDateString([], {
        month: "short",
        year: "numeric",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatLatestValue = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  return numeric.toFixed(
    Number.isInteger(numeric) ? 0 : 1
  );
};

const formatYAxisTick = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  // Y-axis labels are intentionally shown as whole numbers.
  return Math.round(numeric).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
};

const getNiceStep = (rawStep) => {
  const numeric = Math.abs(
    Number(rawStep)
  );

  if (
    !Number.isFinite(numeric) ||
    numeric <= 0
  ) {
    return 1;
  }

  const magnitude = Math.pow(
    10,
    Math.floor(
      Math.log10(numeric)
    )
  );

  const normalized =
    numeric / magnitude;

  // Includes 7 so values such as 2448 can produce
  // 0, 700, 1400, 2100, 2800 instead of 2688.
  const niceSteps = [
    1,
    2,
    2.5,
    5,
    7,
    10,
  ];

  const niceNormalized =
    niceSteps.find(
      (step) =>
        normalized <= step
    ) || 10;

  return (
    niceNormalized *
    magnitude
  );
};

const buildNiceAxis = (
  domain,
  requestedTickCount = 5
) => {
  if (
    !Array.isArray(domain) ||
    domain.length < 2
  ) {
    return {
      domain,
      ticks: undefined,
    };
  }

  const rawMin =
    Number(domain[0]);
  const rawMax =
    Number(domain[1]);

  if (
    !Number.isFinite(rawMin) ||
    !Number.isFinite(rawMax) ||
    rawMax <= rawMin
  ) {
    return {
      domain,
      ticks: undefined,
    };
  }

  const tickCount = Math.max(
    2,
    Math.round(
      Number(requestedTickCount) ||
        5
    )
  );

  const rawStep =
    (rawMax - rawMin) /
    Math.max(
      1,
      tickCount - 1
    );

  const step =
    getNiceStep(rawStep);

  let niceMin =
    Math.floor(
      rawMin / step
    ) * step;

  let niceMax =
    Math.ceil(
      rawMax / step
    ) * step;

  // Do not force Automatic mode to zero here.
  // The caller decides the input domain:
  // - Auto = observed data
  // - Range = configured widget range
  // - Custom = explicit user limits

  if (niceMax <= niceMin) {
    niceMax =
      niceMin + step;
  }

  const ticks = [];

  // Guard prevents floating-point loops.
  for (
    let value = niceMin;
    value <=
      niceMax + step * 0.001;
    value += step
  ) {
    ticks.push(
      Number(
        value.toFixed(10)
      )
    );

    if (ticks.length > 20) {
      break;
    }
  }

  return {
    domain: [
      niceMin,
      niceMax,
    ],
    ticks,
  };
};

const getSeriesDomain = (
  chartData,
  key,
  fallbackRange
) => {
  const values = chartData
    .map((row) => Number(row?.[key]))
    .filter(Number.isFinite);

  if (!values.length) {
    return [
      fallbackRange.min,
      fallbackRange.max,
    ];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const pad = Math.max(
      Math.abs(min) * 0.08,
      1
    );

    return [min - pad, max + pad];
  }

  const span = max - min;
  const pad = span * 0.08;

  return [min - pad, max + pad];
};

const getCombinedSeriesDomain = (
  chartData,
  keys = [],
  fallbackRange = { min: 0, max: 100 }
) => {
  const values = [];

  chartData.forEach((row) => {
    keys.forEach((key) => {
      const numeric =
        Number(row?.[key]);

      if (Number.isFinite(numeric)) {
        values.push(numeric);
      }
    });
  });

  // Auto mode uses the configured Data Range only as a no-data fallback.
  // As soon as real data exists, the observed values determine the axis.
  if (!values.length) {
    return [
      fallbackRange.min,
      fallbackRange.max,
    ];
  }

  const observedMin =
    Math.min(...values);
  const observedMax =
    Math.max(...values);

  if (observedMin === observedMax) {
    const pad = Math.max(
      Math.abs(observedMin) * 0.08,
      1
    );

    return [
      observedMin - pad,
      observedMax + pad,
    ];
  }

  const span =
    observedMax - observedMin;

  const pad =
    span * 0.08;

  return [
    observedMin - pad,
    observedMax + pad,
  ];
};

export default function LineWidget({
  data = [],
  lines = [],
  label = "Trend",
  historyWindow = "15m",
  rangeConfig = null,
  rangeConfigs = {},
  dataLabels = {},
  chartDisplay = {},
}) {
  const rootRef = useRef(null);
  const {
    width,
    height,
    tiny,
    compact,
    wide,
  } = useWidgetSize(rootRef);

  const widgetId =
    useId().replace(/:/g, "");

  const display = {
    ...DEFAULT_CHART_DISPLAY,
    ...(chartDisplay || {}),
  };

  const chartStyle =
    display.chartStyle === "area"
      ? "area"
      : "line";

  const isAreaStyle =
    chartStyle === "area";

  const areaOpacity = Math.min(
    0.9,
    Math.max(
      0,
      Number(display.areaOpacity) || 0.35
    )
  );

  const areaEndOpacity = Math.min(
    areaOpacity,
    Math.max(
      0,
      Number(display.areaEndOpacity) || 0.02
    )
  );

  const lineWeightWidths = {
    thin: 1.5,
    normal: 2.5,
    bold: 4,
  };

  const resolvedLineWeight =
    ["thin", "normal", "bold"].includes(
      display.lineWeight
    )
      ? display.lineWeight
      : "normal";

  // Preserve custom numeric stroke widths from older templates.
  // New templates normally use Thin / Normal / Bold.
  const hasLegacyCustomStrokeWidth =
    chartDisplay?.strokeWidth !== undefined &&
    chartDisplay?.lineWeight === undefined;

  const resolvedStrokeWidth =
    hasLegacyCustomStrokeWidth
      ? Math.max(
          1,
          Number(
            chartDisplay.strokeWidth
          ) || 2.5
        )
      : lineWeightWidths[
          resolvedLineWeight
        ];

  const allowedCurveTypes = [
    "linear",
    "monotone",
    "step",
  ];

  const resolvedCurveType =
    allowedCurveTypes.includes(
      display.curveType
    )
      ? display.curveType
      : "linear";

  const allowedLinePatterns = [
    "solid",
    "dashed",
    "dotted",
  ];

  const resolvedLinePattern =
    allowedLinePatterns.includes(
      display.linePattern
    )
      ? display.linePattern
      : "solid";

  const resolvedStrokeDasharray =
    resolvedLinePattern === "dashed"
      ? "8 5"
      : resolvedLinePattern === "dotted"
      ? "1 6"
      : undefined;

  const chartData = useMemo(
    () =>
      [...data]
        .map((item) => ({
          ...item,
          timestamp: normaliseTimestamp(
            item.timestamp
          ),
        }))
        .filter((item) => item.timestamp > 0)
        .sort(
          (a, b) =>
            a.timestamp - b.timestamp
        ),
    [data]
  );

  const getRangeForKey = (key) => {
    const merged = {
      min: 0,
      max: 100,
      unit: "",
      ...(rangeConfig || {}),
      ...(rangeConfigs?.[key] || {}),
    };

    const min = toFiniteNumber(
      merged.min,
      0
    );

    const configuredMax = toFiniteNumber(
      merged.max,
      100
    );

    return {
      ...merged,
      min,
      max:
        configuredMax > min
          ? configuredMax
          : min + 1,
      unit: String(
        merged.unit || ""
      ).trim(),
    };
  };

  const firstTimestamp =
    chartData[0]?.timestamp;

  const lastTimestamp =
    chartData[
      chartData.length - 1
    ]?.timestamp;

  const visibleLines = lines.filter(
    (line) => line?.key
  );

  const latestRow =
    chartData[
      chartData.length - 1
    ] || {};

  const showLegend =
    display.showLegend &&
    !tiny &&
    visibleLines.length > 1;

  const latestItems = visibleLines.map(
    (line, index) => {
      const range = getRangeForKey(
        line.key
      );

      const name =
        dataLabels?.[line.key] ||
        line.label ||
        line.key;

      const rawValue =
        latestRow?.[line.key];

      return {
        ...line,
        index,
        name,
        range,
        rawValue,
        formattedValue:
          formatLatestValue(rawValue),
      };
    }
  );

  const leftLine =
    visibleLines[0];

  const leftRange = leftLine
    ? getRangeForKey(leftLine.key)
    : {
        min: 0,
        max: 100,
        unit: "",
      };

  const combinedRange = {
    min: Math.min(
      ...visibleLines.map(
        (line) =>
          getRangeForKey(line.key).min
      ),
      leftRange.min
    ),
    max: Math.max(
      ...visibleLines.map(
        (line) =>
          getRangeForKey(line.key).max
      ),
      leftRange.max
    ),
  };

  const observedCombinedDomain =
    getCombinedSeriesDomain(
      chartData,
      visibleLines.map(
        (line) => line.key
      ),
      combinedRange
    );

  const defaultDomain =
    display.yAxisMode === "auto"
      ? observedCombinedDomain
      : display.yAxisMode === "custom"
      ? [
          display.yAxisMin === ""
            ? combinedRange.min
            : toFiniteNumber(
                display.yAxisMin,
                combinedRange.min
              ),
          display.yAxisMax === ""
            ? combinedRange.max
            : toFiniteNumber(
                display.yAxisMax,
                combinedRange.max
              ),
        ]
      : [
          combinedRange.min,
          combinedRange.max,
        ];

  const yAxisTickCount = Math.max(
    2,
    Number(
      display.yAxisTickCount
    ) || 5
  );

  const defaultNiceAxis =
    display.yAxisMode === "custom"
      ? {
          domain: defaultDomain,
          ticks: undefined,
        }
      : buildNiceAxis(
          defaultDomain,
          yAxisTickCount
        );

  const areaRanges =
    visibleLines.map((line) =>
      getRangeForKey(line.key)
    );

  const areaGlobalMin =
    areaRanges.length
      ? Math.min(
          ...areaRanges.map(
            (range) => range.min
          )
        )
      : 0;

  const areaGlobalMax =
    areaRanges.length
      ? Math.max(
          ...areaRanges.map(
            (range) => range.max
          )
        )
      : 100;

  const areaConfiguredRange = {
    min: areaGlobalMin,
    max: areaGlobalMax,
  };

  const areaObservedDomain =
    getCombinedSeriesDomain(
      chartData,
      visibleLines.map(
        (line) => line.key
      ),
      areaConfiguredRange
    );

  const areaDomain =
    display.yAxisMode === "auto"
      ? areaObservedDomain
      : display.yAxisMode === "custom"
      ? [
          display.yAxisMin === ""
            ? areaGlobalMin
            : toFiniteNumber(
                display.yAxisMin,
                areaGlobalMin
              ),
          display.yAxisMax === ""
            ? areaGlobalMax
            : toFiniteNumber(
                display.yAxisMax,
                areaGlobalMax
              ),
        ]
      : [
          areaGlobalMin,
          areaGlobalMax,
        ];

  const areaNiceAxis =
    display.yAxisMode === "custom"
      ? {
          domain: areaDomain,
          ticks: undefined,
        }
      : buildNiceAxis(
          areaDomain,
          yAxisTickCount
        );

  const useMultipleAxes =
    Boolean(
      display.autoScalePerSeries
    ) &&
    visibleLines.length > 1 &&
    !tiny;

  const responsiveSizeKey = `${Math.round(
    width / 12
  )}-${Math.round(height / 12)}`;

  const axisDefinitions =
    useMultipleAxes
      ? visibleLines.map(
          (line, index) => {
            const range =
              getRangeForKey(line.key);

            const rawDomain =
              display.yAxisMode ===
              "custom"
                ? [
                    display.yAxisMin === ""
                      ? range.min
                      : toFiniteNumber(
                          display.yAxisMin,
                          range.min
                        ),
                    display.yAxisMax === ""
                      ? range.max
                      : toFiniteNumber(
                          display.yAxisMax,
                          range.max
                        ),
                  ]
                : display.yAxisMode ===
                  "range"
                ? [
                    range.min,
                    range.max,
                  ]
                : getSeriesDomain(
                    chartData,
                    line.key,
                    range
                  );

            const niceAxis =
              display.yAxisMode ===
              "custom"
                ? {
                    domain:
                      rawDomain,
                    ticks:
                      undefined,
                  }
                : buildNiceAxis(
                    rawDomain,
                    yAxisTickCount
                  );

            return {
              id: `series-${index}`,
              key: line.key,
              orientation:
                index % 2 === 0
                  ? "left"
                  : "right",
              domain:
                niceAxis.domain,
              ticks:
                niceAxis.ticks,
              color:
                line.color ||
                "#2563eb",
              unit: range.unit,
            };
          }
        )
      : [
          {
            id: "primary",
            key: leftLine?.key,
            orientation: "left",
            domain:
              defaultNiceAxis.domain,
            ticks:
              defaultNiceAxis.ticks,
            color:
              leftLine?.color ||
              "#2563eb",
            unit: leftRange.unit,
          },
        ];

  if (isAreaStyle) {
    return (
      <div
        ref={rootRef}
        className={`${TECH_SURFACE_CLASS} ${
          tiny
            ? "p-2.5"
            : "p-3.5"
        }`}
      >
        <TechBackdrop />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          {/* Keep Area mode visually consistent with the original AreaWidget. */}
          <div
            className="
              mb-2 flex min-w-0
              items-center gap-2
              px-1 pr-14
            "
          >
            <div
              className={`${TECH_HEADER_CLASS} min-w-0 truncate`}
              title={label}
            >
              {label}
            </div>

            {!tiny && (
              <div
                className="
                  shrink-0 rounded-full
                  border border-slate-200
                  bg-slate-50 px-2 py-1
                  text-[9px] font-medium
                  text-slate-500
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-300
                "
              >
                {historyWindow}
              </div>
            )}
          </div>

          <div className="min-h-0 min-w-0 flex-1">
            {chartData.length === 0 ? (
              <div
                className={`flex h-full items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
              >
                No area data available.
              </div>
            ) : (
              <ResponsiveContainer
                key={`area-${responsiveSizeKey}`}
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
                debounce={20}
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 8,
                    right: tiny ? 4 : 10,
                    left: tiny ? -24 : -8,
                    bottom: tiny ? -6 : 0,
                  }}
                >
                  <defs>
                    {visibleLines.map(
                      (line, index) => (
                        <linearGradient
                          key={line.key}
                          id={`area-tech-${widgetId}-${index}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={
                              line.color ||
                              "#7CB342"
                            }
                            stopOpacity={
                              areaOpacity
                            }
                          />

                          <stop
                            offset="100%"
                            stopColor={
                              line.color ||
                              "#7CB342"
                            }
                            stopOpacity={
                              areaEndOpacity
                            }
                          />
                        </linearGradient>
                      )
                    )}
                  </defs>

                  {display.showGrid && (
                    <CartesianGrid
                      strokeDasharray="3 5"
                      stroke={
                        TECH_GRID_STROKE
                      }
                      opacity={0.14}
                      vertical={!compact}
                    />
                  )}

                  {display.showXAxis && (
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      scale="time"
                      domain={[
                        firstTimestamp ||
                          "dataMin",
                        lastTimestamp ||
                          "dataMax",
                      ]}
                      tickFormatter={(
                        value
                      ) =>
                        formatXAxisTime(
                          value,
                          historyWindow,
                          display.xAxisFormat
                        )
                      }
                      tick={{
                        fontSize:
                          tiny ? 8 : 10,
                        fill:
                          TECH_AXIS_STROKE,
                      }}
                      stroke={
                        TECH_AXIS_STROKE
                      }
                      axisLine={false}
                      tickLine={false}
                      minTickGap={Math.max(
                        12,
                        Number(
                          display.xAxisTickGap
                        ) || 30
                      )}
                      interval="preserveStartEnd"
                    />
                  )}

                  {display.showYAxis && (
                    <YAxis
                      width={
                        tiny ? 30 : 44
                      }
                      tick={{
                        fontSize:
                          tiny ? 8 : 10,
                        fill:
                          TECH_AXIS_STROKE,
                      }}
                      tickFormatter={
                        formatYAxisTick
                      }
                      axisLine={false}
                      tickLine={false}
                      domain={
                        areaNiceAxis.domain
                      }
                      ticks={
                        areaNiceAxis.ticks
                      }
                      tickCount={
                        yAxisTickCount
                      }
                      allowDataOverflow={
                        display.yAxisMode !==
                        "auto"
                      }
                    />
                  )}

                  {display.showTooltip && (
                    <Tooltip
                      labelFormatter={(
                        timestamp
                      ) =>
                        new Date(
                          timestamp
                        ).toLocaleString()
                      }
                      formatter={(
                        value,
                        name,
                        tooltipItem
                      ) => {
                        const key =
                          tooltipItem?.dataKey ||
                          name;

                        const range =
                          getRangeForKey(
                            key
                          );

                        const numeric =
                          Number(value);

                        const formatted =
                          Number.isFinite(
                            numeric
                          )
                            ? numeric.toFixed(
                                1
                              )
                            : value;

                        return [
                          range.unit
                            ? `${formatted} ${range.unit}`
                            : formatted,
                          dataLabels?.[
                            key
                          ] ||
                            visibleLines.find(
                              (line) =>
                                line.key ===
                                key
                            )?.label ||
                            key,
                        ];
                      }}
                      contentStyle={{
                        background:
                          "rgba(15,23,42,0.96)",
                        border:
                          "1px solid rgba(34,211,238,0.18)",
                        borderRadius:
                          "12px",
                        color: "white",
                        fontSize:
                          "11px",
                      }}
                    />
                  )}

                  {display.showLegend &&
                    !tiny &&
                    visibleLines.length >
                      1 && (
                      <Legend
                        wrapperStyle={{
                          fontSize:
                            "10px",
                        }}
                      />
                    )}

                  {visibleLines.map(
                    (line, index) => {
                      const range =
                        getRangeForKey(
                          line.key
                        );

                      const displayName =
                        dataLabels?.[
                          line.key
                        ] ||
                        line.label ||
                        line.key;

                      return (
                        <Area
                          key={line.key}
                          type={
                            resolvedCurveType
                          }
                          dataKey={
                            line.key
                          }
                          name={
                            range.unit
                              ? `${displayName} (${range.unit})`
                              : displayName
                          }
                          stroke={
                            line.color ||
                            "#7CB342"
                          }
                          strokeWidth={
                            resolvedStrokeWidth
                          }
                          strokeDasharray={
                            resolvedStrokeDasharray
                          }
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill={`url(#area-tech-${widgetId}-${index})`}
                          dot={
                            display.showDots &&
                            !tiny
                              ? {
                                  r: 2,
                                }
                              : false
                          }
                          activeDot={{
                            r: tiny
                              ? 3
                              : 4,
                          }}
                          connectNulls
                          isAnimationActive={
                            false
                          }
                        />
                      );
                    }
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny
          ? "p-2"
          : compact
          ? "p-2.5"
          : "p-3"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* HEADER */}
        <div
          className={`
            mb-1.5 min-w-0 pr-14
            ${tiny ? "px-0.5" : "px-1"}
          `}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`${TECH_HEADER_CLASS} min-w-0 truncate`}
              title={label}
            >
              {label}
            </div>

            {!tiny && (
              <div
                className="
                  shrink-0 rounded-full
                  border border-slate-200
                  bg-slate-50 px-2 py-1
                  text-[9px] font-medium
                  text-slate-500
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-300
                "
              >
                {historyWindow}
              </div>
            )}
          </div>

          {!tiny &&
            display.showLatestValues &&
            latestItems.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {latestItems.map(
                  (item) => (
                    <div
                      key={item.key}
                      className="
                        flex items-center gap-1.5
                        text-[9px]
                      "
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            item.color,
                        }}
                      />

                      <span className="max-w-[90px] truncate text-slate-500 dark:text-slate-400">
                        {item.name}
                      </span>

                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.formattedValue}
                        {item.range.unit
                          ? ` ${item.range.unit}`
                          : ""}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
        </div>

        {/* CHART */}
        <div className="min-h-0 min-w-0 flex-1">
          {chartData.length === 0 ? (
            <div
              className={`flex h-full items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
            >
              No trend data available.
            </div>
          ) : (
            <ResponsiveContainer
              key={`line-${responsiveSizeKey}`}
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              debounce={20}
            >
              <ComposedChart
                data={chartData}
                margin={{
                  top: 8,
                  right:
                    useMultipleAxes
                      ? 22
                      : tiny
                      ? 4
                      : 10,
                  left:
                    useMultipleAxes
                      ? 8
                      : tiny
                      ? -24
                      : -8,
                  bottom:
                    showLegend &&
                    !display.compactLegend
                      ? 6
                      : tiny
                      ? -4
                      : 0,
                }}
              >
{display.showGrid && (
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke={
                      TECH_GRID_STROKE
                    }
                    opacity={0.14}
                    vertical={
                      !compact
                    }
                  />
                )}

                {display.showXAxis && (
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={[
                      firstTimestamp ||
                        "dataMin",
                      lastTimestamp ||
                        "dataMax",
                    ]}
                    tickFormatter={(
                      value
                    ) =>
                      formatXAxisTime(
                        value,
                        historyWindow,
                        display.xAxisFormat
                      )
                    }
                    tick={{
                      fontSize:
                        tiny ? 8 : 9,
                      fill:
                        TECH_AXIS_STROKE,
                    }}
                    stroke={
                      TECH_AXIS_STROKE
                    }
                    axisLine={false}
                    tickLine={false}
                    minTickGap={Math.max(
                      12,
                      Number(
                        display.xAxisTickGap
                      ) || 30
                    )}
                    interval="preserveStartEnd"
                  />
                )}

                {display.showYAxis &&
                  axisDefinitions.map(
                    (
                      axis,
                      index
                    ) => (
                      <YAxis
                        key={axis.id}
                        yAxisId={
                          axis.id
                        }
                        orientation={
                          axis.orientation
                        }
                        domain={
                          axis.domain
                        }
                        ticks={
                          axis.ticks
                        }
                        width={
                          tiny
                            ? 28
                            : 44
                        }
                        tick={{
                          fontSize:
                            tiny
                              ? 8
                              : 9,
                          fill:
                            useMultipleAxes
                              ? axis.color
                              : TECH_AXIS_STROKE,
                        }}
                        tickFormatter={
                          formatYAxisTick
                        }
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        tickCount={
                          yAxisTickCount
                        }
                        allowDataOverflow={
                          display.yAxisMode !==
                          "auto"
                        }
                        hide={
                          useMultipleAxes &&
                          index > 1 &&
                          !wide
                        }
                      />
                    )
                  )}

                {display.showZeroLine && (
                  <ReferenceLine
                    y={0}
                    stroke="#94a3b8"
                    strokeDasharray="3 4"
                    opacity={0.35}
                  />
                )}

                {display.showTooltip && (
                  <Tooltip
                    labelFormatter={(
                      timestamp
                    ) =>
                      new Date(
                        timestamp
                      ).toLocaleString()
                    }
                    formatter={(
                      value,
                      name,
                      tooltipItem
                    ) => {
                      const key =
                        tooltipItem?.dataKey ||
                        name;

                      const range =
                        getRangeForKey(
                          key
                        );

                      const number =
                        Number(value);

                      const formatted =
                        Number.isFinite(
                          number
                        )
                          ? number.toFixed(
                              1
                            )
                          : value;

                      return [
                        range.unit
                          ? `${formatted} ${range.unit}`
                          : formatted,
                        dataLabels?.[
                          key
                        ] ||
                          visibleLines.find(
                            (line) =>
                              line.key ===
                              key
                          )?.label ||
                          key,
                      ];
                    }}
                    contentStyle={botanicalTooltipStyle}
                    labelStyle={{
                      color:
                        "#cbd5e1",
                      marginBottom:
                        "4px",
                    }}
                    itemStyle={{
                      color:
                        "#f8fafc",
                    }}
                    cursor={{
                      stroke:
                        "#94a3b8",
                      strokeWidth:
                        1,
                      strokeDasharray:
                        "3 4",
                      opacity:
                        0.35,
                    }}
                  />
                )}

                {showLegend &&
                  !display.compactLegend && (
                    <Legend
                      wrapperStyle={{
                        fontSize:
                          tiny
                            ? "9px"
                            : "10px",
                      }}
                    />
                  )}

                {visibleLines.map(
                  (line, index) => {
                    const range =
                      getRangeForKey(
                        line.key
                      );

                    const displayName =
                      dataLabels?.[
                        line.key
                      ] ||
                      line.label ||
                      line.key;

                    const axisId =
                      useMultipleAxes
                        ? `series-${index}`
                        : "primary";

                    const commonProps = {
                      yAxisId: axisId,
                      type:
                        resolvedCurveType,
                      dataKey: line.key,
                      name: range.unit
                        ? `${displayName} (${range.unit})`
                        : displayName,
                      stroke:
                        line.color ||
                        "#7CB342",
                      strokeWidth:
                        resolvedStrokeWidth,
                      strokeDasharray:
                        resolvedStrokeDasharray,
                      dot:
                        display.showDots &&
                        !tiny
                          ? {
                              r: 2,
                              strokeWidth: 0,
                            }
                          : false,
                      activeDot: {
                        r: tiny
                          ? 3
                          : 4,
                        strokeWidth: 1.5,
                        stroke: "#ffffff",
                      },
                      connectNulls: true,
                      isAnimationActive: false,
                    };

                    return (
                      <Line
                        key={line.key}
                        {...commonProps}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* COMPACT LEGEND */}
        {showLegend &&
          display.compactLegend && (
            <div
              className={`
                mt-1.5 flex flex-wrap
                items-center justify-center
                gap-x-3 gap-y-1
                ${
                  compact
                    ? "px-0"
                    : "px-1"
                }
              `}
            >
              {latestItems.map(
                (item) => (
                  <div
                    key={item.key}
                    className="
                      flex min-w-0
                      items-center gap-1.5
                      text-[9px]
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    <span
                      className="h-1.5 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          item.color,
                      }}
                    />

                    <span className="max-w-[100px] truncate">
                      {item.name}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
  curveType: "monotone",
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
    "2d", "7d", "30d", "90d", "6mo",
    "1y", "2y", "5y", "yesterday",
    "dayBeforeYesterday", "thisWeek",
    "previousWeek", "thisMonth",
    "previousMonth", "previousQuarter",
    "thisYear", "previousYear", "custom",
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


export default function AreaWidget({
  data = [],
  lines = [],
  label = "Area Trend",
  historyWindow = "15m",
  rangeConfig = null,
  rangeConfigs = {},
  dataLabels = {},
  chartDisplay = {},
}) {
  const rootRef = useRef(null);
  const { tiny, compact } = useWidgetSize(rootRef);
  const widgetId = useId().replace(/:/g, "");

  const display = {
    ...DEFAULT_CHART_DISPLAY,
    ...(chartDisplay || {}),
  };

  const chartData = useMemo(
    () =>
      [...data]
        .map((item) => ({
          ...item,
          timestamp:
            normaliseTimestamp(item.timestamp),
        }))
        .filter((item) => item.timestamp > 0)
        .sort(
          (a, b) =>
            a.timestamp - b.timestamp
        ),
    [data]
  );

  const getRangeForKey = (key) => {
    const config = {
      min: 0,
      max: 100,
      unit: "",
      ...(rangeConfig || {}),
      ...(rangeConfigs?.[key] || {}),
    };

    const min = toFiniteNumber(config.min, 0);
    const configuredMax =
      toFiniteNumber(config.max, 100);

    return {
      ...config,
      min,
      max:
        configuredMax > min
          ? configuredMax
          : min + 1,
      unit: String(config.unit || "").trim(),
    };
  };

  const ranges = lines.map((line) =>
    getRangeForKey(line.key)
  );

  const globalMin = ranges.length
    ? Math.min(
        ...ranges.map((range) => range.min)
      )
    : 0;

  const globalMax = ranges.length
    ? Math.max(
        ...ranges.map((range) => range.max)
      )
    : 100;

  const yDomain =
    display.yAxisMode === "auto"
      ? ["auto", "auto"]
      : display.yAxisMode === "custom"
      ? [
          display.yAxisMin === ""
            ? "auto"
            : toFiniteNumber(
                display.yAxisMin,
                globalMin
              ),
          display.yAxisMax === ""
            ? "auto"
            : toFiniteNumber(
                display.yAxisMax,
                globalMax
              ),
        ]
      : [globalMin, globalMax];

  const firstTimestamp =
    chartData[0]?.timestamp;
  const lastTimestamp =
    chartData[chartData.length - 1]
      ?.timestamp;

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-2.5" : "p-3.5"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div
            className={`${TECH_HEADER_CLASS} truncate`}
          >
            {label}
          </div>

          {!tiny && (
            <div
              className={`text-[10px] ${TECH_MUTED_CLASS}`}
            >
              {historyWindow}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {chartData.length === 0 ? (
            <div
              className={`flex h-full items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
            >
              No area data available.
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
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
                  {lines.map(
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
                          stopColor={line.color}
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor={line.color}
                          stopOpacity="0.02"
                        />
                      </linearGradient>
                    )
                  )}
                </defs>

                {display.showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 5"
                    stroke={TECH_GRID_STROKE}
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
                      firstTimestamp || "dataMin",
                      lastTimestamp || "dataMax",
                    ]}
                    tickFormatter={(value) =>
                      formatXAxisTime(
                        value,
                        historyWindow,
                        display.xAxisFormat
                      )
                    }
                    tick={{
                      fontSize: tiny ? 8 : 10,
                      fill: TECH_AXIS_STROKE,
                    }}
                    stroke={TECH_AXIS_STROKE}
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
                    width={tiny ? 30 : 44}
                    tick={{
                      fontSize: tiny ? 8 : 10,
                      fill: TECH_AXIS_STROKE,
                    }}
                    axisLine={false}
                    tickLine={false}
                    domain={yDomain}
                    tickCount={Math.max(
                      2,
                      Number(
                        display.yAxisTickCount
                      ) || 5
                    )}
                    allowDataOverflow={
                      display.yAxisMode !== "auto"
                    }
                  />
                )}

                {display.showTooltip && (
                  <Tooltip
                    labelFormatter={(timestamp) =>
                      new Date(
                        timestamp
                      ).toLocaleString()
                    }
                    formatter={(
                      value,
                      name
                    ) => {
                      const range =
                        getRangeForKey(name);
                      const numeric =
                        Number(value);

                      return [
                        Number.isFinite(numeric)
                          ? `${
                              numeric.toFixed(1)
                            }${
                              range.unit
                                ? ` ${range.unit}`
                                : ""
                            }`
                          : value,
                        dataLabels?.[name] ||
                          name,
                      ];
                    }}
                    contentStyle={{
                      background:
                        "rgba(15,23,42,0.96)",
                      border:
                        "1px solid rgba(34,211,238,0.18)",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "11px",
                    }}
                  />
                )}

                {display.showLegend &&
                  !tiny &&
                  lines.length > 1 && (
                    <Legend
                      wrapperStyle={{
                        fontSize: "10px",
                      }}
                    />
                  )}

                {lines.map(
                  (line, index) => {
                    const range =
                      getRangeForKey(line.key);
                    const displayName =
                      dataLabels?.[line.key] ||
                      line.label ||
                      line.key;

                    return (
                      <Area
                        key={line.key}
                        type={
                          display.curveType ||
                          "monotone"
                        }
                        dataKey={line.key}
                        name={
                          range.unit
                            ? `${displayName} (${range.unit})`
                            : displayName
                        }
                        stroke={line.color}
                        strokeWidth={Math.max(
                          1,
                          Number(
                            display.strokeWidth
                          ) || 2.5
                        )}
                        fill={`url(#area-tech-${widgetId}-${index})`}
                        dot={
                          display.showDots &&
                          !tiny
                            ? { r: 2 }
                            : false
                        }
                        activeDot={{
                          r: tiny ? 3 : 4,
                        }}
                        connectNulls
                        isAnimationActive={false}
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

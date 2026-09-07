import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRef } from "react";
import {
  TECH_AXIS_STROKE,
  TECH_GRID_STROKE,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SERIES,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  botanicalTooltipStyle,
  readableFieldLabel,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_CHART_DISPLAY = {
  showGrid: true,
  showLegend: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: true,
  yAxisMode: "range",
  yAxisMin: "",
  yAxisMax: "",
  yAxisTickCount: 5,
};


const getNiceStep = (span, targetTicks = 5) => {
  if (!Number.isFinite(span) || span <= 0) return 1;

  const rawStep = span / Math.max(2, targetTicks);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
      ? 2
      : normalized <= 2.5
      ? 2.5
      : normalized <= 5
      ? 5
      : 10;

  return niceNormalized * magnitude;
};

const getNiceDomain = (values, tickCount = 5) => {
  const finiteValues = values
    .map(Number)
    .filter(Number.isFinite);

  if (!finiteValues.length) return [0, 100];

  const dataMin = Math.min(...finiteValues);
  const dataMax = Math.max(...finiteValues);

  // Bar charts read best from a zero baseline when all values share a sign.
  let min = dataMin >= 0 ? 0 : dataMin;
  let max = dataMax <= 0 ? 0 : dataMax;

  // V30: give Automatic axis more breathing room before rounding to a
  // nice tick step. This commonly turns values such as 70-80 into a clean
  // 0-100 scale instead of stopping just above the tallest bar.
  if (min < 0 && max > 0) {
    const span = max - min;
    const pad = Math.max(span * 0.15, 1);
    min -= pad;
    max += pad;
  } else if (max > 0) {
    max += Math.max(max * 0.15, 1);
  } else if (min < 0) {
    min -= Math.max(Math.abs(min) * 0.15, 1);
  }

  if (min === max) {
    const pad = Math.max(Math.abs(max) * 0.2, 1);
    min -= pad;
    max += pad;
  }

  const step = getNiceStep(max - min, tickCount);
  const niceMin =
    min < 0 ? Math.floor(min / step) * step : 0;
  const niceMax =
    max > 0 ? Math.ceil(max / step) * step : 0;

  return [
    niceMin,
    niceMax === niceMin ? niceMin + step : niceMax,
  ];
};

const formatAxisValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;

  const abs = Math.abs(numeric);

  if (abs >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }

  if (abs >= 1_000) {
    return `${(numeric / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }

  if (abs >= 100) return numeric.toFixed(0);
  if (abs >= 10) return numeric.toFixed(1).replace(/\.0$/, "");
  return numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};


const splitCategoryLabel = (
  value,
  maxChars = 16
) => {
  const labelText =
    String(value ?? "").trim();

  if (!labelText) return [""];
  if (labelText.length <= maxChars) {
    return [labelText];
  }

  const words =
    labelText.split(/\s+/);

  const lines = [""];

  for (const word of words) {
    const current =
      lines[lines.length - 1];

    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      candidate.length <=
        maxChars ||
      current === ""
    ) {
      lines[
        lines.length - 1
      ] = candidate;
      continue;
    }

    if (lines.length === 1) {
      lines.push(word);
      continue;
    }

    lines[1] =
      `${lines[1]} ${word}`;
  }

  if (
    lines[1] &&
    lines[1].length >
      maxChars + 5
  ) {
    lines[1] =
      `${lines[1].slice(
        0,
        maxChars + 2
      )}…`;
  }

  return lines.slice(0, 2);
};

const WrappedCategoryTick = ({
  x = 0,
  y = 0,
  payload,
  tiny = false,
  compact = false,
}) => {
  const maxChars =
    tiny
      ? 10
      : compact
      ? 15
      : 20;

  const lines =
    splitCategoryLabel(
      payload?.value,
      maxChars
    );

  const fontSize =
    tiny ? 8 : 9;

  return (
    <g
      transform={`translate(${x},${y})`}
    >
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill={TECH_AXIS_STROKE}
        fontSize={fontSize}
      >
        {lines.map(
          (line, index) => (
            <tspan
              key={`${line}-${index}`}
              x={0}
              dy={
                index === 0
                  ? 0
                  : fontSize + 3
              }
            >
              {line}
            </tspan>
          )
        )}
      </text>
    </g>
  );
};

export default function BarWidget({
  data = {},
  dataKeys = [],
  label = "Bar Chart",
  orientation = "vertical",
  rangeConfig = null,
  rangeConfigs = {},
  dataLabels = {},
  chartDisplay = {},
  gridWidth = null,
  gridHeight = null,
}) {
  const rootRef = useRef(null);

  const measuredSize =
    useWidgetSize(rootRef);

  const width =
    measuredSize.width;

  const height =
    measuredSize.height;

  const parsedGridWidth =
    Number(gridWidth);

  const parsedGridHeight =
    Number(gridHeight);

  const hasGridGeometry =
    Number.isFinite(
      parsedGridWidth
    ) &&
    Number.isFinite(
      parsedGridHeight
    ) &&
    parsedGridWidth > 0 &&
    parsedGridHeight > 0;

  /*
   * Use the SAVED grid span first.
   *
   * A 5-column Fit dashboard can physically shrink a card depending
   * on browser/sidebar width. The same saved 2x2 Bar widget should
   * nevertheless keep the same information density in Builder and
   * Dashboard.
   *
   * 1x1 -> tiny
   * 1x2 / 2x1 / 2x2 -> compact
   * 3+ columns -> normal/wide presentation
   */
  const tiny =
    hasGridGeometry
      ? parsedGridWidth <= 1 &&
        parsedGridHeight <= 1
      : measuredSize.tiny;

  const compact =
    hasGridGeometry
      ? parsedGridHeight <= 1 ||
        parsedGridWidth <= 2
      : measuredSize.compact;

  const wide =
    hasGridGeometry
      ? parsedGridWidth >= 3
      : Boolean(
          measuredSize.wide
        );

  const display = {
    ...DEFAULT_CHART_DISPLAY,
    ...(chartDisplay || {}),
  };

  const selectedKeys = dataKeys.length > 0 ? dataKeys : Object.keys(data).slice(0, 3);

  const getConfigForKey = (key) => ({
    min: 0,
    max: 100,
    unit: "",
    warning: 80,
    danger: 90,
    ...(rangeConfig || {}),
    ...(rangeConfigs?.[key] || {}),
  });

  const chartData = selectedKeys.map((key, index) => {
    const config = getConfigForKey(key);
    return {
      key,
      name: dataLabels?.[key] || readableFieldLabel(key),
      value: toFiniteNumber(data?.[key], 0),
      unit: String(config.unit || "").trim(),
      color:
        chartDisplay?.seriesColors?.[
          key
        ] ||
        TECH_SERIES[
          index %
            TECH_SERIES.length
        ],
    };
  });

  const mins = selectedKeys.map((key) => toFiniteNumber(getConfigForKey(key).min, 0));
  const maxs = selectedKeys.map((key) => toFiniteNumber(getConfigForKey(key).max, 100));
  const rangeMin = mins.length ? Math.min(...mins) : 0;
  const rangeMax = maxs.length ? Math.max(...maxs) : 100;
  const values = chartData.map((entry) => entry.value);
  const autoDomain = getNiceDomain(
    values,
    Math.max(3, Number(display.yAxisTickCount) || 5)
  );

  const numericDomain =
    display.yAxisMode === "custom"
      ? [
          display.yAxisMin === ""
            ? autoDomain[0]
            : toFiniteNumber(display.yAxisMin, autoDomain[0]),
          display.yAxisMax === ""
            ? autoDomain[1]
            : toFiniteNumber(display.yAxisMax, autoDomain[1]),
        ]
      : display.yAxisMode === "range"
      ? getNiceDomain(
          [
            ...values,
            rangeMin,
            rangeMax,
          ],
          Math.max(3, Number(display.yAxisTickCount) || 5)
        )
      : autoDomain;

  const isHorizontal =
    orientation === "horizontal";

  const safeWidth =
    Number(width) || 420;

  const safeHeight =
    Number(height) || 240;

  const longestLabelLength =
    chartData.reduce(
      (max, entry) =>
        Math.max(
          max,
          String(entry.name || "").length
        ),
      0
    );


  const numericLabelSamples = [
    ...values,
    rangeMin,
    rangeMax,
    ...(Array.isArray(
      numericDomain
    )
      ? numericDomain.filter(
          (value) =>
            Number.isFinite(
              Number(value)
            )
        )
      : []),
  ].map(formatAxisValue);

  const longestNumericLabel =
    numericLabelSamples.reduce(
      (max, value) =>
        Math.max(
          max,
          String(value ?? "").length
        ),
      1
    );

  // Reserve actual space for Y-axis numbers.
  // The old implementation relied on negative
  // left margins, which pushed the labels outside
  // an overflow-hidden widget card.
  const verticalYAxisWidth =
    Math.round(
      Math.min(
        tiny ? 50 : 68,
        Math.max(
          tiny ? 40 : 48,
          longestNumericLabel *
            (tiny ? 5.4 : 6.2) +
            18
        )
      )
    );

  const xAxisHeight =
    !display.showXAxis
      ? 0
      : longestLabelLength >
        (tiny ? 10 : 18)
      ? tiny
        ? 42
        : 52
      : tiny
      ? 30
      : 36;

  // Horizontal charts need enough room for category names.
  // Avoid negative left margins that can clip labels.
  const horizontalLabelWidth = Math.round(
    Math.min(
      safeWidth * 0.32,
      Math.max(
        tiny ? 54 : 72,
        Math.min(
          compact ? 100 : 138,
          longestLabelLength * (tiny ? 4.8 : 5.8) + 18
        )
      )
    )
  );

  const horizontalBarSize = Math.max(
    12,
    Math.min(
      tiny ? 22 : 34,
      Math.floor(
        (safeHeight -
          (display.showLegend && !tiny ? 58 : 38)) /
          Math.max(1, chartData.length) *
          0.48
      )
    )
  );

  const verticalBarSize = Math.max(
    16,
    Math.min(
      tiny
        ? 28
        : wide
        ? 56
        : compact
        ? 46
        : 52,
      Math.floor(
        (
          safeWidth -
          verticalYAxisWidth -
          24
        ) /
          Math.max(
            1,
            chartData.length
          ) *
          (
            compact
              ? 0.48
              : 0.44
          )
      )
    )
  );

  const maxBarSize =
    isHorizontal
      ? horizontalBarSize
      : verticalBarSize;

  const chartMargins =
    isHorizontal
      ? {
          top:
            tiny ? 10 : 14,
          right:
            tiny ? 34 : 54,
          left: 4,
          bottom:
            tiny ? 4 : 8,
        }
      : {
          // Leave enough room for the value label
          // rendered above the tallest column.
          top:
            tiny ? 20 : 30,
          right:
            tiny ? 10 : 16,
          // Critical: keep this non-negative.
          left: 4,
          bottom:
            tiny ? 4 : 8,
        };

  const categoryGap =
    chartData.length <= 2
      ? "46%"
      : chartData.length <= 4
      ? "36%"
      : "28%";

  const showValueLabels =
    !tiny &&
    (
      hasGridGeometry
        ? parsedGridHeight >= 2 ||
          parsedGridWidth >= 2
        : isHorizontal
        ? safeWidth >= 320
        : safeHeight >= 180
    );

  const legendItems =
    chartData.map((entry) => ({
      key: entry.key,
      name: entry.name,
      color: entry.color,
    }));

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} min-h-0 min-w-0 ${
        tiny ? "p-2.5" : "p-3.5"
      }`}
    >
      <TechBackdrop />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="mb-2 flex items-center px-1 pr-14">
          <div className={`${TECH_HEADER_CLASS} truncate`}>{label}</div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {chartData.length === 0 ? (
            <div
              className={`flex h-full min-h-[90px] items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
            >
              No bar data available.
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              debounce={20}
            >
            <BarChart
              data={chartData}
              layout={isHorizontal ? "vertical" : "horizontal"}
              margin={chartMargins}
              barCategoryGap={categoryGap}
            >
              {display.showGrid && (
                <CartesianGrid
                  strokeDasharray="2 5"
                  stroke={TECH_GRID_STROKE}
                  opacity={0.55}
                  horizontal={!isHorizontal}
                  vertical={isHorizontal}
                />
              )}

              {isHorizontal ? (
                <>
                  {display.showXAxis && (
                    <XAxis
                      type="number"
                      domain={numericDomain}
                      tick={{
                        fontSize: tiny ? 8 : 9,
                        fill: TECH_AXIS_STROKE,
                      }}
                      tickFormatter={formatAxisValue}
                      tickCount={Math.max(
                        3,
                        Number(
                          display.yAxisTickCount
                        ) || 5
                      )}
                      allowDecimals
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                  )}
                  {display.showYAxis && (
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={
                        horizontalLabelWidth
                      }
                      tick={{
                        fontSize:
                          tiny ? 8 : 9,
                        fill:
                          TECH_AXIS_STROKE,
                      }}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                  )}
                </>
              ) : (
                <>
                  {display.showXAxis && (
                    <XAxis
                      dataKey="name"
                      tick={
                        <WrappedCategoryTick
                          tiny={tiny}
                          compact={compact}
                        />
                      }
                      tickMargin={6}
                      height={xAxisHeight}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      minTickGap={4}
                    />
                  )}
                  {display.showYAxis && (
                    <YAxis
                      domain={numericDomain}
                      width={
                        verticalYAxisWidth
                      }
                      tick={{
                        fontSize:
                          tiny ? 8 : 9,
                        fill:
                          TECH_AXIS_STROKE,
                      }}
                      tickFormatter={
                        formatAxisValue
                      }
                      tickMargin={6}
                      axisLine={false}
                      tickLine={false}
                      tickCount={Math.max(3, Number(display.yAxisTickCount) || 5)}
                      allowDecimals
                    />
                  )}
                </>
              )}

              {display.showTooltip && (
                <Tooltip
                  formatter={(value, _name, props) => {
                    const unit = props?.payload?.unit || "";
                    return [
                      `${Number(value).toFixed(1)}${unit ? ` ${unit}` : ""}`,
                      props?.payload?.name || "Value",
                    ];
                  }}
                  contentStyle={
                    botanicalTooltipStyle
                  }
                  allowEscapeViewBox={{
                    x: true,
                    y: true,
                  }}
                  wrapperStyle={{
                    zIndex: 140,
                    pointerEvents: "none",
                  }}
                  labelStyle={{
                    color: "#cbd5e1",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                />
              )}

              <Bar
                dataKey="value"
                isAnimationActive={false}
                radius={
                  isHorizontal
                    ? [0, 7, 7, 0]
                    : [7, 7, 2, 2]
                }
                maxBarSize={
                  maxBarSize
                }
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
                {showValueLabels && (
                  <LabelList
                    dataKey="value"
                    position={isHorizontal ? "right" : "top"}
                    formatter={(value) =>
                      formatAxisValue(value)
                    }
                    fill={TECH_AXIS_STROKE}
                    fontSize={9}
                  />
                )}
              </Bar>
            </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {display.showLegend &&
          !tiny &&
          legendItems.length > 1 && (
            <div
              className="
                mt-2 flex min-h-[18px]
                flex-wrap items-center
                justify-center gap-x-3
                gap-y-1 px-2
              "
            >
              {legendItems.map(
                (entry) => (
                  <div
                    key={entry.key}
                    className={`flex min-w-0 items-center gap-1.5 text-[8.5px] ${TECH_MUTED_CLASS}`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-[3px]"
                      style={{
                        background:
                          entry.color,
                      }}
                    />
                    <span className="max-w-[120px] truncate">
                      {entry.name}
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

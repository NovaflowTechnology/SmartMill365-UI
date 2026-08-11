import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useRef } from "react";
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
  const { tiny, compact } = useWidgetSize(rootRef);

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
    const merged = {
      min: 0,
      max: 100,
      unit: "",
      ...(rangeConfig || {}),
      ...(rangeConfigs?.[key] || {}),
    };

    const min = toFiniteNumber(merged.min, 0);
    const configuredMax =
      toFiniteNumber(merged.max, 100);

    return {
      ...merged,
      min,
      max:
        configuredMax > min
          ? configuredMax
          : min + 1,
      unit: String(merged.unit || "").trim(),
    };
  };

  const leftLine = lines[0];
  const leftRange = leftLine
    ? getRangeForKey(leftLine.key)
    : { min: 0, max: 100, unit: "" };

  const yDomain =
    display.yAxisMode === "auto"
      ? ["auto", "auto"]
      : display.yAxisMode === "custom"
      ? [
          display.yAxisMin === ""
            ? "auto"
            : toFiniteNumber(
                display.yAxisMin,
                leftRange.min
              ),
          display.yAxisMax === ""
            ? "auto"
            : toFiniteNumber(
                display.yAxisMax,
                leftRange.max
              ),
        ]
      : [leftRange.min, leftRange.max];

  const firstTimestamp =
    chartData[0]?.timestamp;
  const lastTimestamp =
    chartData[chartData.length - 1]
      ?.timestamp;

  const showLegend =
    display.showLegend &&
    !tiny &&
    lines.length > 1;

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
            title={label}
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
              No trend data available.
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 8,
                  right: tiny ? 4 : 10,
                  left: tiny ? -24 : -8,
                  bottom: tiny ? -6 : 0,
                }}
              >
                {display.showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 5"
                    stroke={TECH_GRID_STROKE}
                    opacity={0.16}
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
                      name,
                      tooltipItem
                    ) => {
                      const key =
                        tooltipItem?.dataKey ||
                        name;
                      const range =
                        getRangeForKey(key);
                      const number =
                        Number(value);
                      const formatted =
                        Number.isFinite(number)
                          ? number.toFixed(1)
                          : value;

                      return [
                        range.unit
                          ? `${formatted} ${range.unit}`
                          : formatted,
                        dataLabels?.[key] ||
                          key,
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
                    labelStyle={{
                      color: "#cbd5e1",
                    }}
                  />
                )}

                {showLegend && (
                  <Legend
                    wrapperStyle={{
                      fontSize: tiny
                        ? "9px"
                        : "10px",
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
                      <Line
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
                        dot={
                          display.showDots &&
                          !tiny
                            ? {
                                r: 2.5,
                                strokeWidth: 0,
                              }
                            : false
                        }
                        activeDot={{
                          r: tiny ? 3 : 4,
                          strokeWidth: 0,
                        }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    );
                  }
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

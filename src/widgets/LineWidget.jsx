import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { useMemo } from "react";

const DEFAULT_RANGE = {
  min: 0,
  max: 100,
  unit: "",
};

const normaliseTimestamp = (value) => {
  if (typeof value === "number") {
    return value;
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
};

const toFiniteNumber = (value, fallback) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
};

const formatXAxisTime = (
  timestamp,
  historyWindow
) => {
  const date = new Date(timestamp);

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
      [
        "90d",
        "6mo",
        "1y",
        "2y",
        "5y",
      ].includes(historyWindow)
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

  /*
   * Per-series custom ranges saved in TemplateDesigner.
   *
   * Example:
   * {
   *   steamPressure: {
   *     min: 0,
   *     max: 60,
   *     unit: "bar",
   *   },
   * }
   */
  rangeConfig = null,
  rangeConfigs = {},
  dataLabels = {},
}) {
  const chartData = useMemo(() => {
    return [...data]
      .map((item) => ({
        ...item,
        timestamp: normaliseTimestamp(
          item.timestamp
        ),
      }))
      .filter(
        (item) => item.timestamp > 0
      )
      .sort(
        (a, b) =>
          a.timestamp - b.timestamp
      );
  }, [data]);

  // Template Designer is the only source of runtime range values.
  // `rangeConfig` supports the current single-range template format.
  // `rangeConfigs[key]` is supported for future per-series settings.
  const getRangeForKey = (key) => {
    const mergedRange = {
      ...DEFAULT_RANGE,
      ...(rangeConfig || {}),
      ...(rangeConfigs?.[key] || {}),
    };

    const min = toFiniteNumber(
      mergedRange.min,
      0
    );

    const configuredMax = toFiniteNumber(
      mergedRange.max,
      100
    );

    const max =
      configuredMax > min
        ? configuredMax
        : min + 1;

    return {
      ...mergedRange,
      min,
      max,
      unit: String(
        mergedRange.unit || ""
      ).trim(),
    };
  };

  const leftLine = lines[0];
  const rightLines = lines.slice(1);

  const leftRange = leftLine
    ? getRangeForKey(leftLine.key)
    : DEFAULT_RANGE;

  const rightRanges = rightLines.map(
    (line) => getRangeForKey(line.key)
  );

  const rightMin = rightRanges.length
    ? Math.min(
        ...rightRanges.map(
          (range) => range.min
        )
      )
    : 0;

  const rightMax = rightRanges.length
    ? Math.max(
        ...rightRanges.map(
          (range) => range.max
        )
      )
    : 100;

  const firstTimestamp =
    chartData[0]?.timestamp;

  const lastTimestamp =
    chartData[
      chartData.length - 1
    ]?.timestamp;

  return (
    <div className="flex h-full w-full flex-col">
      {/* LABEL */}
      <div className="mb-2 px-1">
        <span
          className="
            text-xs text-gray-500
            dark:text-gray-300
          "
        >
          {label}
        </span>
      </div>

      {/* CHART */}
      <div className="min-h-[160px] w-full flex-1">
        {chartData.length === 0 ? (
          <div
            className="
              flex h-full items-center
              justify-center
              text-xs text-gray-400
            "
          >
            No data available for this time range.
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#6b7280"
                opacity={0.2}
              />

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
                tickFormatter={(value) =>
                  formatXAxisTime(
                    value,
                    historyWindow
                  )
                }
                tick={{
                  fontSize: 10,
                  fill: "#9ca3af",
                }}
                stroke="#9ca3af"
                minTickGap={30}
                interval="preserveStartEnd"
              />

              <YAxis
                yAxisId="left"
                orientation="left"
                width={48}
                tick={{
                  fontSize: 10,
                  fill: "#9ca3af",
                }}
                axisLine={false}
                tickLine={false}
                stroke={
                  leftLine?.color ||
                  "#3b82f6"
                }
                domain={[
                  leftRange.min,
                  leftRange.max,
                ]}
                allowDataOverflow
              />

              {rightLines.length > 0 && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={48}
                  tick={{
                    fontSize: 10,
                    fill: "#9ca3af",
                  }}
                  axisLine={false}
                  tickLine={false}
                  stroke={
                    rightLines[0]
                      ?.color ||
                    "#ef4444"
                  }
                  domain={[
                    rightMin,
                    rightMax,
                  ]}
                  allowDataOverflow
                />
              )}

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
                  const dataKey =
                    tooltipItem?.dataKey ||
                    name;

                  const range =
                    getRangeForKey(
                      dataKey
                    );

                  const numericValue =
                    Number(value);

                  const formattedValue =
                    Number.isFinite(
                      numericValue
                    )
                      ? numericValue.toFixed(
                          1
                        )
                      : value;

                  return [
                    range.unit
                      ? `${formattedValue} ${range.unit}`
                      : formattedValue,

                    dataLabels?.[dataKey] ||
                      dataKey,
                  ];
                }}
                contentStyle={{
                  backgroundColor:
                    "#1f2937",
                  border: "none",
                  color: "white",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{
                  color: "#d1d5db",
                }}
              />

              <Legend />

              {lines.map(
                (line, index) => {
                  const range =
                    getRangeForKey(
                      line.key
                    );

                  const displayName =
                    dataLabels?.[line.key] ||
                    line.label ||
                    line.key;

                  return (
                    <Line
                      key={line.key}
                      yAxisId={
                        index === 0
                          ? "left"
                          : "right"
                      }
                      type="monotone"
                      dataKey={line.key}
                      name={
                        range.unit
                          ? `${displayName} (${range.unit})`
                          : displayName
                      }
                      stroke={line.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={
                        false
                      }
                      connectNulls
                    />
                  );
                }
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
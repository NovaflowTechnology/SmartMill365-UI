import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { useMemo, useId } from "react";
import { dataRanges } from "../data/dataRanges";

const normaliseTimestamp = (value) => {
  if (typeof value === "number") return value;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatXAxisTime = (timestamp, historyWindow) => {
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

  // More than 24 hours: display dates instead of time.
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

  // 24 hours and below: display hours and minutes.
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
}) {
  const widgetId = useId().replace(/:/g, "");

  const chartData = useMemo(() => {
    return [...data]
      .map((item) => ({
        ...item,
        timestamp: normaliseTimestamp(item.timestamp),
      }))
      .filter((item) => item.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const mins = lines.map(
    (line) => dataRanges[line.key]?.min ?? 0
  );

  const maxs = lines.map(
    (line) => dataRanges[line.key]?.max ?? 100
  );

  const globalMin = mins.length
    ? Math.min(...mins)
    : 0;

  const globalMax = maxs.length
    ? Math.max(...maxs)
    : 100;

  const firstTimestamp = chartData[0]?.timestamp;
  const lastTimestamp =
    chartData[chartData.length - 1]?.timestamp;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-2 px-1">
        <span className="text-xs text-gray-500 dark:text-gray-300">
          {label}
        </span>
      </div>

      <div className="min-h-[160px] w-full flex-1">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No data available for this time range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                {lines.map((line) => (
                  <linearGradient
                    key={line.key}
                    id={`areaGradient-${widgetId}-${line.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={line.color}
                      stopOpacity={0.45}
                    />

                    <stop
                      offset="95%"
                      stopColor={line.color}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.2}
              />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={[
                  firstTimestamp || "dataMin",
                  lastTimestamp || "dataMax",
                ]}
                tickFormatter={(value) =>
                  formatXAxisTime(value, historyWindow)
                }
                tick={{ fontSize: 10 }}
                stroke="#9ca3af"
                minTickGap={30}
                interval="preserveStartEnd"
              />

              <YAxis
                width={45}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                stroke="#9ca3af"
                domain={[globalMin, globalMax]}
              />

              <Tooltip
                labelFormatter={(timestamp) =>
                  new Date(timestamp).toLocaleString()
                }
                formatter={(value, name) => {
                  const unit = dataRanges[name]?.unit || "";
                  const numericValue = Number(value);

                  return [
                    Number.isFinite(numericValue)
                      ? `${numericValue.toFixed(1)} ${unit}`
                      : value,
                    dataRanges[name]?.label || name,
                  ];
                }}
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  color: "white",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />

              <Legend />

              {lines.map((line) => (
                <Area
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={
                    dataRanges[line.key]?.label ||
                    line.key
                  }
                  stroke={line.color}
                  fill={`url(#areaGradient-${widgetId}-${line.key})`}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
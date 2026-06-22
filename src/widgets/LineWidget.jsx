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

  // Ranges above 24 hours use dates.
  if (dateBasedRanges.includes(historyWindow)) {
    // Long ranges use month and year.
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

    // 2d, 7d, 30d and calendar ranges use day and month.
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  // 24 hours and below use hour and minute.
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
}) {
  const chartData = useMemo(() => {
    return [...data]
      .map((item) => ({
        ...item,
        timestamp: normaliseTimestamp(item.timestamp),
      }))
      .filter((item) => item.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const leftLine = lines[0];
  const rightLines = lines.slice(1);

  const leftRange =
    dataRanges[leftLine?.key] || {
      min: 0,
      max: 100,
      unit: "",
    };

  const rightMins = rightLines.map(
    (line) => dataRanges[line.key]?.min ?? 0
  );

  const rightMaxs = rightLines.map(
    (line) => dataRanges[line.key]?.max ?? 100
  );

  const rightMin = rightMins.length
    ? Math.min(...rightMins)
    : 0;

  const rightMax = rightMaxs.length
    ? Math.max(...rightMaxs)
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
            <LineChart data={chartData}>
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
                yAxisId="left"
                orientation="left"
                width={45}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                stroke={leftLine?.color || "#3b82f6"}
                domain={[
                  leftRange.min ?? 0,
                  leftRange.max ?? 100,
                ]}
              />

              {rightLines.length > 0 && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={45}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  stroke={
                    rightLines[0]?.color || "#ef4444"
                  }
                  domain={[rightMin, rightMax]}
                />
              )}

              <Tooltip
                labelFormatter={(timestamp) =>
                  new Date(timestamp).toLocaleString()
                }
                formatter={(value, name) => {
                  const unit =
                    dataRanges[name]?.unit || "";

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

              {lines.map((line, index) => (
                <Line
                  key={line.key}
                  yAxisId={
                    index === 0 ? "left" : "right"
                  }
                  type="monotone"
                  dataKey={line.key}
                  name={dataRanges[line.key]?.label || line.key}
                  stroke={line.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
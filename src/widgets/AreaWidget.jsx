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

import { useMemo, useState } from "react";
import { dataRanges } from "../data/dataRanges";

export default function AreaWidget({
  data = [],
  lines = [],
  label = "Area Trend",
}) {
  const [range, setRange] = useState("15m");

  const filteredData = useMemo(() => {
    const now = Date.now();

    const ranges = {
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };

    return data.filter(
      (item) =>
        now - item.timestamp <= ranges[range]
    );
  }, [data, range]);

  const mins = lines.map(
    (l) => dataRanges[l.key]?.min ?? 0
  );

  const maxs = lines.map(
    (l) => dataRanges[l.key]?.max ?? 100
  );

  const globalMin = mins.length
    ? Math.min(...mins)
    : 0;

  const globalMax = maxs.length
    ? Math.max(...maxs)
    : 100;

  return (
    <div className="flex flex-col h-full w-full">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs text-gray-500 dark:text-gray-300">
          {label}
        </span>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="
            text-xs
            px-2 py-1
            rounded-lg
            border
            border-gray-300
            dark:border-gray-700
            bg-gray-100
            dark:bg-gray-800
            dark:text-white
          "
        >
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="1h">1h</option>
          <option value="6h">6h</option>
          <option value="24h">24h</option>
          <option value="7d">7d</option>
        </select>
      </div>

      {/* CHART */}
      <div className="flex-1 w-full min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <defs>
              {lines.map((line, index) => (
                <linearGradient
                  key={line.key}
                  id={`areaGradient-${line.key}`}
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
              dataKey={range === "7d" ? "date" : "time"}
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
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
              formatter={(value, name) => {
                const unit = dataRanges[name]?.unit || "";

                return [
                  `${Number(value).toFixed(1)} ${unit}`,
                  name,
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
                stroke={line.color}
                fill={`url(#areaGradient-${line.key})`}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
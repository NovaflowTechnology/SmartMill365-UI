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

import {
  useMemo,
  useState,
} from "react";

import { dataRanges } from "../data/dataRanges";

export default function LineWidget({
  data = [],
  lines = [],
  label = "Trend",
}) {
  // TIME RANGE
  const [range, setRange] =
    useState("15m");

  // FILTER DATA
  const filteredData =
    useMemo(() => {
      const now = Date.now();

      const ranges = {
        "5m":
          5 * 60 * 1000,

        "15m":
          15 * 60 * 1000,

        "1h":
          60 * 60 * 1000,

        "6h":
          6 * 60 * 60 * 1000,

        "24h":
          24 * 60 * 60 * 1000,

        "7d":
          7 *
          24 *
          60 *
          60 *
          1000,
      };

      return data.filter(
        (item) =>
          now -
            item.timestamp <=
          ranges[range]
      );
    }, [data, range]);

  // FIRST LINE = LEFT AXIS
  const leftLine =
    lines[0];

  // SECOND AND LATER LINES = RIGHT AXIS
  const rightLines =
    lines.slice(1);

  const leftRange =
    dataRanges[leftLine?.key] || {
      min: 0,
      max: 100,
      unit: "",
    };

  const rightMins =
    rightLines.map(
      (l) =>
        dataRanges[l.key]
          ?.min ?? 0
    );

  const rightMaxs =
    rightLines.map(
      (l) =>
        dataRanges[l.key]
          ?.max ?? 100
    );

  const rightMin =
    rightMins.length
      ? Math.min(...rightMins)
      : 0;

  const rightMax =
    rightMaxs.length
      ? Math.max(...rightMaxs)
      : 100;

  return (
    <div className="
      flex flex-col
      h-full w-full
    ">

      {/* HEADER */}
      <div className="
        flex justify-between
        items-center
        mb-2 px-1
      ">

        <span className="
          text-xs
          text-gray-500
          dark:text-gray-300
        ">
          {label}
        </span>

        {/* RANGE SELECTOR */}
        <select
          value={range}
          onChange={(e) =>
            setRange(
              e.target.value
            )
          }
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
          <option value="5m">
            5m
          </option>

          <option value="15m">
            15m
          </option>

          <option value="1h">
            1h
          </option>

          <option value="6h">
            6h
          </option>

          <option value="24h">
            24h
          </option>

          <option value="7d">
            7d
          </option>
        </select>

      </div>

      {/* CHART */}
      <div className="
        flex-1 w-full
        min-h-[160px]
      ">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <LineChart
            data={filteredData}
          >

            {/* GRID */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.2}
            />

            {/* X AXIS */}
            <XAxis
              dataKey={
                range === "7d"
                  ? "date"
                  : "time"
              }
              tick={{
                fontSize: 10,
              }}
              stroke="#9ca3af"
            />

            {/* LEFT Y AXIS */}
            <YAxis
              yAxisId="left"
              orientation="left"
              width={45}
              tick={{
                fontSize: 10,
              }}
              axisLine={false}
              tickLine={false}
              stroke={
                leftLine?.color ||
                "#3b82f6"
              }
              domain={[
                leftRange.min ?? 0,
                leftRange.max ?? 100,
              ]}
            />

            {/* RIGHT Y AXIS */}
            {rightLines.length > 0 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                width={45}
                tick={{
                  fontSize: 10,
                }}
                axisLine={false}
                tickLine={false}
                stroke={
                  rightLines[0]?.color ||
                  "#ef4444"
                }
                domain={[
                  rightMin,
                  rightMax,
                ]}
              />
            )}

            {/* TOOLTIP */}
            <Tooltip
              formatter={(
                value,
                name
              ) => {
                const unit =
                  dataRanges[name]
                    ?.unit || "";

                return [
                  `${Number(
                    value
                  ).toFixed(1)} ${unit}`,
                  name,
                ];
              }}
              labelFormatter={(
                label
              ) =>
                `${label}`
              }
              contentStyle={{
                backgroundColor:
                  "#1f2937",

                border: "none",

                color: "white",

                borderRadius: "8px",

                fontSize: "12px",
              }}
            />

            {/* LEGEND */}
            <Legend />

            {/* LINES */}
            {lines.map(
              (line, index) => (
                <Line
                  key={line.key}
                  yAxisId={
                    index === 0
                      ? "left"
                      : "right"
                  }
                  type="monotone"
                  dataKey={
                    line.key
                  }
                  stroke={
                    line.color
                  }
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={
                    true
                  }
                  connectNulls
                />
              )
            )}

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}
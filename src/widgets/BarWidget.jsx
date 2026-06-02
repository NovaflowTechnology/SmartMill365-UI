import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { dataRanges } from "../data/dataRanges";
import { dataOptions } from "../data/dataOptions";

export default function BarWidget({
  data = {},
  dataKeys = [],
  label = "Bar Chart",
  orientation = "vertical",
}) {
  const colors = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
  ];

  const selectedKeys =
    dataKeys.length > 0
      ? dataKeys
      : Object.keys(data).slice(0, 3);

  const chartData = selectedKeys.map((key, index) => {
    const option =
      dataOptions.find((d) => d.key === key);

    return {
      name: option?.label || key,
      key,
      value: Number(data[key] ?? 0),
      unit: dataRanges[key]?.unit || "",
      color: colors[index % colors.length],
    };
  });

  const isHorizontal =
    orientation === "horizontal";

  return (
    <div
      className="
        flex flex-col
        h-full w-full
      "
    >
      {/* HEADER */}
      <div
        className="
          flex justify-between
          items-center
          mb-2 px-1
        "
      >
        <span
          className="
            text-xs
            text-gray-500
            dark:text-gray-300
          "
        >
          {label}
        </span>

        <span
          className="
            text-[10px]
            uppercase
            text-gray-400
          "
        >
          {orientation}
        </span>
      </div>

      {/* CHART */}
      <div
        className="
          flex-1 w-full
          min-h-[150px]
        "
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={chartData}
            layout={
              isHorizontal
                ? "vertical"
                : "horizontal"
            }
            margin={{
              top: 8,
              right: isHorizontal ? 24 : 8,
              left: isHorizontal ? 20 : 0,
              bottom: 8,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.2}
            />

            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={{
                    fontSize: 10,
                  }}
                  stroke="#9ca3af"
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{
                    fontSize: 10,
                  }}
                  stroke="#9ca3af"
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                  }}
                  stroke="#9ca3af"
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                  }}
                  stroke="#9ca3af"
                />
              </>
            )}

            <Tooltip
              formatter={(value, name, props) => {
                const unit =
                  props?.payload?.unit || "";

                return [
                  `${Number(value).toFixed(1)} ${unit}`,
                  props?.payload?.name || "Value",
                ];
              }}
              labelFormatter={(label) => {
                return label;
              }}
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "none",
                color: "white",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />

            <Bar
              dataKey="value"
              radius={
                isHorizontal
                  ? [0, 8, 8, 0]
                  : [8, 8, 0, 0]
              }
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* CUSTOM LEGEND */}
      <div
        className="
          mt-2
          flex flex-wrap
          justify-center
          gap-2
        "
      >
        {chartData.map((item) => (
          <div
            key={item.key}
            className="
              flex items-center
              gap-1
              text-[10px]
              text-gray-500
              dark:text-gray-300
            "
          >
            <span
              className="
                w-2 h-2
                rounded-full
              "
              style={{
                backgroundColor: item.color,
              }}
            />

            <span>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
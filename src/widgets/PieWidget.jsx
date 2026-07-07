import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const PIE_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const DATA_LABELS = {
  steamPressure: "Steam Pressure",
  steamFlowrate: "Steam Flowrate",
  steamOutletTemp: "Steam Outlet Temperature",
  inletDraft: "Inlet Draft",
  outletDraft: "Outlet Draft",
  furnaceDraft: "Furnace Draft",
  waterInletTemp: "Water Inlet Temperature",
  waterFlowrate: "Water Flowrate",
  waterDrumLevel: "Water Drum Level",
  vgPressure: "VG Pressure",
  vgInletTemp: "VG Inlet Temperature",
  vgOutletTemp: "VG Outlet Temperature",
};

const DATA_UNITS = {
  steamPressure: "bar",
  steamFlowrate: "t/h",
  steamOutletTemp: "°C",
  inletDraft: "Pa",
  outletDraft: "Pa",
  furnaceDraft: "Pa",
  waterInletTemp: "°C",
  waterFlowrate: "m³/h",
  waterDrumLevel: "%",
  vgPressure: "bar",
  vgInletTemp: "°C",
  vgOutletTemp: "°C",
};

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
};

export default function PieWidget({
  data = {},
  item = {},
}) {
  const selectedKeys =
    Array.isArray(item.dataKeys) && item.dataKeys.length > 0
      ? item.dataKeys
      : item.dataKey
      ? [item.dataKey]
      : [];

  const chartData = selectedKeys
    .map((key, index) => {
      const rawValue = Number(data?.[key]);

      return {
        key,
        name: DATA_LABELS[key] || key,
        value:
          Number.isFinite(rawValue) && rawValue > 0
            ? rawValue
            : 0,
        color: PIE_COLORS[index % PIE_COLORS.length],
        unit: DATA_UNITS[key] || "",
      };
    })
    .filter((entry) => entry.value > 0);

  const total = chartData.reduce(
    (sum, entry) => sum + entry.value,
    0
  );

  if (selectedKeys.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
        Select at least one data source for this pie chart.
      </div>
    );
  }

  if (chartData.length === 0 || total <= 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
        No positive live values are available for the selected data sources.
      </div>
    );
  }

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const entry = payload[0]?.payload;

    if (!entry) {
      return null;
    }

    const percentage =
      total > 0
        ? ((entry.value / total) * 100).toFixed(1)
        : "0.0";

    return (
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold text-gray-800 dark:text-white">
          {entry.name}
        </p>

        <p className="mt-1 text-gray-500 dark:text-gray-300">
          {formatNumber(entry.value)}
          {entry.unit ? ` ${entry.unit}` : ""}{" "}
          <span className="font-semibold text-gray-800 dark:text-white">
            ({percentage}%)
          </span>
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="82%"
              paddingAngle={4}
              cornerRadius={7}
              stroke="none"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (!percent || percent < 0.06) {
                  return null;
                }

                const radius =
                  innerRadius + (outerRadius - innerRadius) * 0.5;
                const angle = (-midAngle * Math.PI) / 180;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#ffffff"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {`${Math.round(percent * 100)}%`}
                  </text>
                );
              }}
              labelLine={false}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.color}
                />
              ))}
            </Pie>

            <Tooltip
              content={renderTooltip}
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-white shadow-sm dark:bg-gray-800" />
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1.5 px-2 pb-1 pt-2 text-[10px]">
        {chartData.map((entry) => {
          const percentage = ((entry.value / total) * 100).toFixed(0);

          return (
            <div
              key={entry.key}
              className="flex min-w-0 items-center gap-1.5"
              title={`${entry.name}: ${formatNumber(
                entry.value
              )}${entry.unit ? ` ${entry.unit}` : ""} (${percentage}%)`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: entry.color,
                }}
              />

              <span className="truncate font-medium text-gray-500 dark:text-gray-300">
                {entry.name}
              </span>

              <span className="ml-auto shrink-0 font-semibold text-gray-400">
                {formatNumber(entry.value)}
                {entry.unit ? ` ${entry.unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

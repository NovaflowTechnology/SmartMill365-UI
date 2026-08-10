import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


const PIE_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const formatNumber = (
  value,
  maximumFractionDigits = 1
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

const getReadableLabel = (key) => {
  if (!key) {
    return "Unknown";
  }

  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

export default function PieWidget({
  data = {},
  item = {},
}) {
  const containerRef = useRef(null);

  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return undefined;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();

      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);

      return () => {
        window.removeEventListener("resize", updateSize);
      };
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const isCompact =
    containerSize.width > 0 &&
    (containerSize.width < 430 ||
      containerSize.height < 300);

  const isVeryCompact =
    containerSize.width > 0 &&
    (containerSize.width < 320 ||
      containerSize.height < 240);

  const chartHeightClass = isCompact
    ? "min-h-[120px]"
    : "min-h-[180px]";

  const selectedKeys =
    Array.isArray(item.dataKeys) &&
    item.dataKeys.length > 0
      ? item.dataKeys
      : item.dataKey
      ? [item.dataKey]
      : [];

  const rangeConfig =
    item.rangeConfig || null;

  const rangeConfigs =
    item.rangeConfigs || {};

  const customLabels =
    item.dataLabels || {};

  const getConfigForKey = (key) => ({
    min: 0,
    max: 100,
    unit: "",
    warning: 80,
    danger: 90,
    ...(rangeConfig || {}),
    ...(rangeConfigs?.[key] || {}),
  });

  const chartData = selectedKeys
    .map((key, index) => {
      const numericValue =
        Number(data?.[key]);

      const config =
        getConfigForKey(key);

      return {
        key,

        name:
          customLabels[key] ||
          config.label ||
          getReadableLabel(key),

        value:
          Number.isFinite(numericValue) &&
          numericValue > 0
            ? numericValue
            : 0,

        unit: String(
          config.unit || ""
        ).trim(),

        color:
          PIE_COLORS[
            index % PIE_COLORS.length
          ],
      };
    })
    .filter(
      (entry) => entry.value > 0
    );

  const total = chartData.reduce(
    (sum, entry) =>
      sum + entry.value,
    0
  );

  const pieDimensions = useMemo(() => {
    if (isVeryCompact) {
      return {
        innerRadius: "48%",
        outerRadius: "72%",
        centerSize: 60,
        totalLabelSize: 8,
        totalValueSize: 15,
      };
    }

    if (isCompact) {
      return {
        innerRadius: "52%",
        outerRadius: "78%",
        centerSize: 72,
        totalLabelSize: 9,
        totalValueSize: 17,
      };
    }

    return {
      innerRadius: "55%",
      outerRadius: "82%",
      centerSize: 96,
      totalLabelSize: 10,
      totalValueSize: 20,
    };
  }, [isCompact, isVeryCompact]);

  if (selectedKeys.length === 0) {
    return (
      <div
        className="
          flex h-full w-full
          flex-col items-center justify-center
          rounded-2xl
          border border-dashed
          border-gray-300
          bg-gray-50/70
          px-6 py-8
          text-center
          dark:border-slate-700
          dark:bg-slate-900/50
        "
      >
        <div
          className="
            mb-3 flex h-12 w-12
            items-center justify-center
            rounded-full
            bg-gray-100
            text-xl text-gray-500
            dark:bg-slate-800
            dark:text-slate-300
          "
        >
          ◔
        </div>

        <p
          className="
            text-sm font-semibold
            text-gray-700
            dark:text-slate-200
          "
        >
          No data source selected
        </p>

        <p
          className="
            mt-1 max-w-xs
            text-xs text-gray-500
            dark:text-slate-400
          "
        >
          Select at least one data source to display this pie chart.
        </p>
      </div>
    );
  }

  if (
    chartData.length === 0 ||
    total <= 0
  ) {
    return (
      <div
        className="
          flex h-full w-full
          flex-col items-center justify-center
          rounded-2xl
          border border-dashed
          border-gray-300
          bg-gray-50/70
          px-6 py-8
          text-center
          dark:border-slate-700
          dark:bg-slate-900/50
        "
      >
        <div
          className="
            mb-3 flex h-12 w-12
            items-center justify-center
            rounded-full
            bg-gray-100
            text-sm font-bold
            text-gray-500
            dark:bg-slate-800
            dark:text-slate-300
          "
        >
          0
        </div>

        <p
          className="
            text-sm font-semibold
            text-gray-700
            dark:text-slate-200
          "
        >
          No positive values available
        </p>

        <p
          className="
            mt-1 max-w-xs
            text-xs text-gray-500
            dark:text-slate-400
          "
        >
          The selected data sources currently contain zero or invalid values.
        </p>
      </div>
    );
  }

  const renderTooltip = ({
    active,
    payload,
  }) => {
    if (
      !active ||
      !payload?.length
    ) {
      return null;
    }

    const entry =
      payload[0]?.payload;

    if (!entry) {
      return null;
    }

    const percentage =
      total > 0
        ? (
            (entry.value / total) *
            100
          ).toFixed(1)
        : "0.0";

    return (
      <div
        style={{
          minWidth: 180,
          borderRadius: 14,
          border:
            "1px solid rgba(71, 85, 105, 0.85)",
          backgroundColor:
            "rgba(15, 23, 42, 0.98)",
          padding: "12px 14px",
          boxShadow:
            "0 18px 38px rgba(0,0,0,0.35)",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              flexShrink: 0,
              borderRadius: "9999px",
              backgroundColor:
                entry.color,
            }}
          />

          <p
            style={{
              margin: 0,
              overflow: "hidden",
              color: "#f8fafc",
              fontSize: 12,
              fontWeight: 700,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.name}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent:
              "space-between",
            gap: 16,
            marginTop: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {formatNumber(entry.value)}

            {entry.unit && (
              <span
                style={{
                  marginLeft: 5,
                  color: "#cbd5e1",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {entry.unit}
              </span>
            )}
          </p>

          <span
            style={{
              borderRadius: 9999,
              backgroundColor:
                "#1e293b",
              padding: "4px 9px",
              color: "#f8fafc",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`
        flex h-full min-h-0
        w-full flex-col
        overflow-hidden
        ${isCompact ? "px-2 py-2" : "px-3 py-3"}
      `}
    >
      {/* CHART */}
      <div
        className={`
          relative flex-1
          ${chartHeightClass}
        `}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={pieDimensions.innerRadius}
              outerRadius={pieDimensions.outerRadius}
              paddingAngle={
                chartData.length > 1
                  ? 3
                  : 0
              }
              cornerRadius={
                chartData.length > 1
                  ? 7
                  : 0
              }
              stroke="none"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
              labelLine={false}
              label={({
                cx,
                cy,
                midAngle,
                innerRadius,
                outerRadius,
                percent,
              }) => {
                if (
                  isVeryCompact ||
                  !percent ||
                  percent < (isCompact ? 0.12 : 0.07)
                ) {
                  return null;
                }

                const radius =
                  innerRadius +
                  (outerRadius -
                    innerRadius) *
                    0.53;

                const angle =
                  (-midAngle *
                    Math.PI) /
                  180;

                const x =
                  cx +
                  radius *
                    Math.cos(angle);

                const y =
                  cy +
                  radius *
                    Math.sin(angle);

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#ffffff"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isCompact ? 10 : 12}
                    fontWeight="900"
                    style={{
                      pointerEvents: "none",
                      filter:
                        "drop-shadow(0 1px 2px rgba(15,23,42,0.45))",
                    }}
                  >
                    {`${Math.round(
                      percent * 100
                    )}%`}
                  </text>
                );
              }}
            >
              {chartData.map(
                (entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.color}
                    stroke="none"
                    strokeWidth={0}
                  />
                )
              )}
            </Pie>

            <Tooltip
              content={renderTooltip}
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* CENTER CONTENT */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            flex items-center
            justify-center
          "
        >
          <div
            style={{
              display: "flex",
              width: pieDimensions.centerSize,
              height: pieDimensions.centerSize,
              maxWidth: pieDimensions.centerSize,
              maxHeight: pieDimensions.centerSize,
              minWidth: pieDimensions.centerSize,
              minHeight: pieDimensions.centerSize,
              flexDirection: "column",
              alignItems: "center",
              justifyContent:
                "center",
              borderRadius: "9999px",
              border:
                "1px solid rgba(148,163,184,0.32)",
              backgroundColor:
                "rgba(15,23,42,0.96)",
              boxShadow:
                "0 12px 30px rgba(15,23,42,0.34)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                color: "#cbd5e1",
                fontSize: pieDimensions.totalLabelSize,
                fontWeight: 800,
                letterSpacing:
                  "0.16em",
                textTransform:
                  "uppercase",
              }}
            >
              Total
            </span>

            <span
              style={{
                marginTop: 4,
                maxWidth: "100%",
                overflow: "hidden",
                padding: "0 8px",
                color: "#f8fafc",
                fontSize: pieDimensions.totalValueSize,
                fontWeight: 900,
                lineHeight: 1,
                textOverflow:
                  "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {formatNumber(total)}
            </span>
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div
        className={`
          shrink-0 px-1 pb-1
          ${
            isVeryCompact
              ? "mt-1 flex gap-2 overflow-x-auto"
              : isCompact
              ? "mt-1 grid grid-cols-1 gap-1.5"
              : "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
          }
        `}
      >
        {chartData.map(
          (entry) => {
            const percentage =
              total > 0
                ? (
                    (entry.value /
                      total) *
                    100
                  ).toFixed(0)
                : "0";

            return (
              <div
                key={entry.key}
                className={`
                  flex min-w-0 items-center
                  rounded-xl
                  border border-gray-200
                  bg-gray-50
                  dark:border-slate-700
                  dark:bg-slate-800/70
                  ${
                    isVeryCompact
                      ? "w-[150px] shrink-0 gap-1.5 px-2 py-1.5"
                      : isCompact
                      ? "gap-2 px-2 py-1.5"
                      : "gap-2 px-2.5 py-2"
                  }
                `}
                title={`${entry.name}: ${formatNumber(
                  entry.value
                )}${
                  entry.unit
                    ? ` ${entry.unit}`
                    : ""
                } (${percentage}%)`}
              >
                <span
                  className="
                    h-2.5 w-2.5
                    shrink-0 rounded-full
                  "
                  style={{
                    backgroundColor:
                      entry.color,
                  }}
                />

                <div
                  className="
                    min-w-0 flex-1
                  "
                >
                  <p
                    className={`
                      truncate
                      ${isVeryCompact ? "text-[10px]" : "text-xs"}
                      font-semibold
                      text-gray-700
                      dark:text-slate-100
                    `}
                  >
                    {entry.name}
                  </p>

                  <p
                    className={`
                      mt-0.5 truncate
                      ${isVeryCompact ? "text-[9px]" : "text-[11px]"}
                      text-gray-500
                      dark:text-slate-400
                    `}
                  >
                    {formatNumber(
                      entry.value
                    )}

                    {entry.unit
                      ? ` ${entry.unit}`
                      : ""}
                  </p>
                </div>

                <span
                  className={`
                    shrink-0
                    rounded-full
                    bg-gray-200
                    px-2 py-0.5
                    ${isVeryCompact ? "text-[9px]" : "text-[11px]"}
                    font-bold
                    text-gray-700
                    dark:bg-slate-950
                    dark:text-slate-100
                  `}
                >
                  {percentage}%
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
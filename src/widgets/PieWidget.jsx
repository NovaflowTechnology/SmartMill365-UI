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
import {
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SERIES,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  readableFieldLabel,
} from "./widgetTech";

const formatNumber = (
  value,
  maximumFractionDigits = 1
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }
  );
};

export default function PieWidget({
  data = {},
  item = {},
}) {
  const rootRef = useRef(null);

  const [
    containerSize,
    setContainerSize,
  ] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const update = () => {
      const rect =
        element.getBoundingClientRect();

      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    update();

    const observer =
      new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const tiny =
    containerSize.width > 0 &&
    (containerSize.width < 240 ||
      containerSize.height < 180);

  const compact =
    containerSize.width > 0 &&
    (containerSize.width < 390 ||
      containerSize.height < 280);

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
    unit: "",
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
          readableFieldLabel(key),
        value:
          Number.isFinite(numericValue) &&
          numericValue > 0
            ? numericValue
            : 0,
        unit: String(
          config.unit || ""
        ).trim(),
        color:
          TECH_SERIES[
            index % TECH_SERIES.length
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

  const dimensions = useMemo(() => {
    if (tiny) {
      return {
        innerRadius: "52%",
        outerRadius: "76%",
      };
    }

    if (compact) {
      return {
        innerRadius: "55%",
        outerRadius: "80%",
      };
    }

    return {
      innerRadius: "58%",
      outerRadius: "84%",
    };
  }, [tiny, compact]);

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-2.5" : "p-3.5"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={`${TECH_HEADER_CLASS} truncate px-1`}
        >
          {item?.label || "Distribution"}
        </div>

        {chartData.length === 0 ? (
          <div
            className={`flex min-h-0 flex-1 items-center justify-center text-xs ${TECH_MUTED_CLASS}`}
          >
            No positive values to display.
          </div>
        ) : (
          <>
            <div className="relative min-h-0 flex-1">
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
                    innerRadius={
                      dimensions.innerRadius
                    }
                    outerRadius={
                      dimensions.outerRadius
                    }
                    paddingAngle={2}
                    stroke="rgba(15,23,42,0.15)"
                    strokeWidth={1}
                  >
                    {chartData.map(
                      (entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          fillOpacity={0.9}
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(
                      value,
                      _name,
                      props
                    ) => {
                      const unit =
                        props?.payload?.unit ||
                        "";

                      return [
                        `${formatNumber(
                          value
                        )}${
                          unit
                            ? ` ${unit}`
                            : ""
                        }`,
                        props?.payload?.name,
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
                  />
                </PieChart>
              </ResponsiveContainer>

              <div
                className="
                  pointer-events-none absolute
                  inset-0 flex items-center
                  justify-center
                "
              >
                <div className="text-center">
                  <div
                    className={`text-[9px] uppercase tracking-[0.16em] ${TECH_MUTED_CLASS}`}
                  >
                    Total
                  </div>
                  <div
                    className={`
                      mt-1 font-semibold
                      tracking-[-0.03em]
                      text-slate-900
                      dark:text-white
                      ${
                        tiny
                          ? "text-lg"
                          : compact
                          ? "text-xl"
                          : "text-2xl"
                      }
                    `}
                  >
                    {formatNumber(total)}
                  </div>
                </div>
              </div>
            </div>

            {!tiny && (
              <div
                className="
                  mt-1 grid grid-cols-2
                  gap-x-3 gap-y-1
                "
              >
                {chartData
                  .slice(
                    0,
                    compact ? 4 : 6
                  )
                  .map((entry) => (
                    <div
                      key={entry.key}
                      className={`flex min-w-0 items-center gap-1.5 text-[10px] ${TECH_MUTED_CLASS}`}
                    >
                      <span
                        className="h-1.5 w-3 shrink-0 rounded-full"
                        style={{
                          background:
                            entry.color,
                        }}
                      />
                      <span className="truncate">
                        {entry.name}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

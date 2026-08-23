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
  botanicalTooltipStyle,
  formatCompactValue,
  readableFieldLabel,
} from "./widgetTech";

const formatNumber = (
  value,
  digits = 1
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }
  );
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const PieTooltipContent = ({
  active,
  payload,
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const entry =
    payload[0]?.payload || {};

  return (
    <div
      style={{
        ...botanicalTooltipStyle,
        minWidth: "170px",
        maxWidth: "280px",
        padding: "10px 12px",
        whiteSpace: "normal",
        overflowWrap: "anywhere",
      }}
    >
      <div
        style={{
          marginBottom: "5px",
          color: "#dbe5d7",
          fontSize: "10px",
          fontWeight: 700,
          lineHeight: 1.35,
        }}
      >
        {entry.name || "Value"}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "4px",
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: 800,
        }}
      >
        <span>
          {formatNumber(
            entry.value
          )}
        </span>

        {entry.unit ? (
          <span
            style={{
              color: "#a7b5a5",
              fontSize: "10px",
              fontWeight: 600,
            }}
          >
            {entry.unit}
          </span>
        ) : null}
      </div>
    </div>
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

    if (!element) {
      return undefined;
    }

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

  const width = containerSize.width;
  const height = containerSize.height;

  const tiny =
    width > 0 &&
    (width < 250 || height < 180);

  /*
   * IMPORTANT:
   * Do not switch between completely different pie layouts merely because
   * the sidebar opens/closes. That caused the visual jump seen previously.
   *
   * All normal 1x1 dashboard cards use the same side-by-side composition.
   * Only genuinely narrow cards stack.
   */
  const stacked =
    width > 0 && width < 310;

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

  const chartData = selectedKeys
    .map((key, index) => {
      const numericValue =
        Number(data?.[key]);

      const config = {
        unit: "",
        ...(rangeConfig || {}),
        ...(rangeConfigs?.[key] ||
          {}),
      };

      return {
        key,
        name:
          customLabels[key] ||
          readableFieldLabel(key),
        value:
          Number.isFinite(
            numericValue
          ) && numericValue > 0
            ? numericValue
            : 0,
        unit: String(
          config.unit || ""
        ).trim(),
        color:
          TECH_SERIES[
            index %
              TECH_SERIES.length
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

  const visibleEntries =
    chartData.slice(
      0,
      tiny ? 3 : 5
    );

  /*
   * Stable donut sizing:
   * - sidebar open: slightly smaller
   * - sidebar closed/fullscreen: naturally grows
   * - never becomes huge enough to clip
   */
  const donutSize = useMemo(() => {
    if (!width || !height) {
      return {
        outer: 86,
        inner: 51,
      };
    }

    const availableHeight =
      Math.max(130, height - 54);

    const chartColumnWidth =
      stacked
        ? width - 24
        : width * 0.61;

    const outer = clamp(
      Math.min(
        availableHeight * 0.40,
        chartColumnWidth * 0.43
      ),
      tiny ? 52 : 76,
      112
    );

    return {
      outer,
      inner: outer * 0.58,
    };
  }, [
    width,
    height,
    stacked,
    tiny,
  ]);

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny
          ? "p-2.5"
          : "p-3.5"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* TITLE */}
        <div className="flex items-center px-1 pr-14">
          <div
            className={`${TECH_HEADER_CLASS} truncate`}
          >
            {item?.label ||
              "Distribution"}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div
            className={`
              flex min-h-0 flex-1
              items-center justify-center
              text-xs
              ${TECH_MUTED_CLASS}
            `}
          >
            No positive values to
            display.
          </div>
        ) : (
          <div
            className={`
              mt-1 min-h-0 flex-1
              ${
                stacked
                  ? "grid grid-rows-[minmax(0,1fr)_auto] gap-1"
                  : "grid grid-cols-[minmax(0,1.6fr)_minmax(100px,.9fr)] gap-1.5"
              }
            `}
          >
            {/* DONUT */}
            <div className="relative min-h-0 min-w-0 overflow-visible">
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
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={
                      donutSize.inner
                    }
                    outerRadius={
                      donutSize.outer
                    }
                    paddingAngle={
                      chartData.length > 1
                        ? 2.2
                        : 0
                    }
                    cornerRadius={
                      chartData.length > 1
                        ? 7
                        : 0
                    }
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {chartData.map(
                      (entry) => (
                        <Cell
                          key={
                            entry.key
                          }
                          fill={
                            entry.color
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    content={
                      <PieTooltipContent />
                    }
                    allowEscapeViewBox={{
                      x: true,
                      y: true,
                    }}
                    wrapperStyle={{
                      zIndex: 160,
                      pointerEvents: "none",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* CENTER VALUE */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className={`
                      text-[7px] font-bold
                      uppercase
                      tracking-[0.14em]
                      ${TECH_MUTED_CLASS}
                    `}
                  >
                    Total
                  </div>

                  <div
                    className={`
                      mt-0.5 font-black
                      tracking-[-0.045em]
                      text-slate-950
                      dark:text-white
                      ${
                        tiny
                          ? "text-base"
                          : "text-xl"
                      }
                    `}
                  >
                    {formatCompactValue(
                      total
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COMPACT LEGEND */}
            {!tiny && (
              <div
                className={`
                  min-h-0 min-w-0
                  ${
                    stacked
                      ? "grid grid-cols-3 gap-x-2 gap-y-1 px-1 pb-1"
                      : "flex flex-col justify-center gap-2 pr-1"
                  }
                `}
              >
                {visibleEntries.map(
                  (entry) => {
                    const percentage =
                      total > 0
                        ? (entry.value /
                            total) *
                          100
                        : 0;

                    return (
                      <div
                        key={entry.key}
                        className="min-w-0"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-1.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="
                                h-1.5 w-1.5
                                shrink-0 rounded-sm
                              "
                              style={{
                                background:
                                  entry.color,
                              }}
                            />

                            <span
                              className="
                                truncate
                                text-[7.5px]
                                font-semibold
                                text-slate-500
                                dark:text-slate-300
                              "
                              title={
                                entry.name
                              }
                            >
                              {entry.name}
                            </span>
                          </div>

                          <span
                            className="
                              shrink-0
                              text-[7.5px]
                              font-bold
                              text-slate-900
                              dark:text-white
                            "
                          >
                            {percentage.toFixed(
                              0
                            )}
                            %
                          </span>
                        </div>

                        {!stacked && (
                          <div
                            className="
                              mt-1 h-[3px]
                              overflow-hidden
                              rounded-full
                              bg-slate-100
                              dark:bg-white/10
                            "
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(
                                  percentage,
                                  percentage > 0
                                    ? 2
                                    : 0
                                )}%`,
                                background:
                                  entry.color,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

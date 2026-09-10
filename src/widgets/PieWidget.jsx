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

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

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

export default function PieWidget({
  data = {},
  item = {},
  gridWidth = null,
  gridHeight = null,
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

    if (
      typeof ResizeObserver ===
      "undefined"
    ) {
      window.addEventListener(
        "resize",
        update
      );

      return () =>
        window.removeEventListener(
          "resize",
          update
        );
    }

    const observer =
      new ResizeObserver(update);

    observer.observe(element);

    return () =>
      observer.disconnect();
  }, []);

  const width = containerSize.width;
  const height = containerSize.height;

  const pieDisplay = {
    style: "donut",
    showLegend: true,
    showTotal: true,
    showTooltip: true,
    showSliceLabels: false,
    legendPosition: "auto",
    ...(item?.pieDisplay || {}),
  };

  const pieStyle =
    [
      "donut",
      "pie",
      "exploded",
      "thinRing",
    ].includes(pieDisplay.style)
      ? pieDisplay.style
      : "donut";

  const parsedGridWidth = Number(
    gridWidth ?? item?.w
  );

  const parsedGridHeight = Number(
    gridHeight ?? item?.h
  );

  const hasGridGeometry =
    Number.isFinite(
      parsedGridWidth
    ) &&
    Number.isFinite(
      parsedGridHeight
    ) &&
    parsedGridWidth > 0 &&
    parsedGridHeight > 0;

  /*
   * IMPORTANT:
   * Presentation follows the SAVED GRID SPAN first.
   *
   * This prevents a 1×1 Pie from switching between a side legend in
   * Dashboard and a stacked legend in Template Builder just because
   * their physical pixel sizes are slightly different.
   */
  const compactOneByOne =
    hasGridGeometry
      ? parsedGridWidth <= 1 &&
        parsedGridHeight <= 1
      : width > 0 &&
        width < 390 &&
        height < 260;

  const wideSingleRow =
    hasGridGeometry
      ? parsedGridWidth >= 2 &&
        parsedGridHeight <= 1
      : width >= 500 &&
        height < 280;

  const tallNarrow =
    hasGridGeometry
      ? parsedGridWidth <= 1 &&
        parsedGridHeight >= 2
      : width > 0 &&
        width < 320 &&
        height >= 260;

  const legendAtBottom =
    pieDisplay.legendPosition === "bottom" ||
    (pieDisplay.legendPosition === "auto" &&
      (compactOneByOne || tallNarrow));

  const legendAtSide =
    pieDisplay.showLegend && !legendAtBottom;

  const selectedKeys =
    Array.isArray(item?.dataKeys) &&
    item.dataKeys.length > 0
      ? item.dataKeys
      : item?.dataKey
      ? [item.dataKey]
      : [];

  const rangeConfig =
    item?.rangeConfig || null;

  const rangeConfigs =
    item?.rangeConfigs || {};

  const customLabels =
    item?.dataLabels || {};

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
          item?.chartDisplay
            ?.seriesColors?.[key] ||
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

  const visibleEntries = chartData;

  /*
   * Donut sizing deliberately leaves room for the legend in 1×1.
   * The previous implementation maximised the radius, which made the
   * donut dominate the card and pushed the legend into the bottom edge.
   */
  const donutSize = useMemo(() => {
    if (!width || !height) {
      return {
        outer: 58,
        inner: 35,
      };
    }

    let outer = 70;

    if (compactOneByOne) {
      outer = Math.min(
        width * 0.17,
        height * 0.31
      );
    } else if (wideSingleRow) {
      outer = Math.min(
        width * 0.14,
        height * 0.34
      );
    } else if (tallNarrow) {
      outer = Math.min(
        width * 0.28,
        height * 0.23
      );
    } else {
      outer = Math.min(
        width * 0.20,
        height * 0.30
      );
    }

    outer = clamp(
      outer,
      compactOneByOne
        ? 46
        : 58,
      compactOneByOne
        ? 68
        : 112
    );

    return {
      outer,
      inner:
        outer *
        (compactOneByOne
          ? 0.57
          : 0.59),
    };
  }, [
    width,
    height,
    compactOneByOne,
    wideSingleRow,
    tallNarrow,
  ]);

  const pieGeometry = (() => {
      let outer =
        donutSize.outer;

      if (
        pieStyle ===
        "exploded"
      ) {
        outer *= 0.9;
      }

      const inner =
        pieStyle === "pie" ||
        pieStyle ===
          "exploded"
          ? 0
          : pieStyle ===
            "thinRing"
          ? outer * 0.74
          : outer * 0.59;

      const paddingAngle =
        chartData.length <= 1
          ? 0
          : pieStyle ===
            "exploded"
          ? 6
          : pieStyle ===
            "pie"
          ? 1.2
          : 2.2;

      const cornerRadius =
        chartData.length <= 1
          ? 0
          : pieStyle ===
            "exploded"
          ? 4
          : pieStyle ===
            "pie"
          ? 2
          : 7;

      return {
        outer,
        inner,
        paddingAngle,
        cornerRadius,
      };
    })();

  const hasCenterHole =
    pieGeometry.inner > 0;

  const renderSliceLabel = ({ percent }) => {
    if (
      pieDisplay.showSliceLabels !==
        true ||
      !Number.isFinite(percent) ||
      percent < 0.055
    ) {
      return "";
    }

    return `${Math.round(
      percent * 100
    )}%`;
  };

  const renderLegendEntry = (
    entry,
    {
      compact = false,
      showBar = false,
    } = {}
  ) => {
    const percentage =
      total > 0
        ? (entry.value / total) *
          100
        : 0;

    return (
      <div
        key={entry.key}
        className="min-w-0"
      >
        <div
          className={`
            flex min-w-0
            items-center
            ${
              compact
                ? "gap-1.5"
                : "justify-between gap-2"
            }
          `}
        >
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
              className={`
                truncate font-semibold
                text-slate-500
                dark:text-slate-300
                ${
                  compact
                    ? "max-w-[72px] text-[7px]"
                    : "text-[8px]"
                }
              `}
              title={entry.name}
            >
              {entry.name}
            </span>
          </div>

          <span
            className={`
              shrink-0 font-bold
              text-slate-900
              dark:text-white
              ${
                compact
                  ? "text-[7px]"
                  : "text-[8px]"
              }
            `}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>

        {showBar && (
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
  };

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        compactOneByOne
          ? "p-2.5"
          : "p-3"
      }`}
    >
      <TechBackdrop />

      <div
        className="
          relative z-10
          flex h-full min-h-0
          flex-col
        "
      >
        <div
          className="
            flex min-w-0
            items-center px-1 pr-14
          "
        >
          <div
            className={`${TECH_HEADER_CLASS} min-w-0 truncate`}
            title={
              item?.label ||
              "Distribution"
            }
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
            No positive values to display.
          </div>
        ) : compactOneByOne ? (
          <div
            className={`
              mt-0.5 grid min-h-0
              flex-1 gap-2
              ${
                pieDisplay.showLegend
                  ? "grid-cols-[minmax(0,1fr)_minmax(118px,0.72fr)]"
                  : "grid-cols-1"
              }
            `}
          >
            <div className="relative min-h-0 min-w-0 overflow-hidden">
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
                      pieGeometry.inner
                    }
                    outerRadius={
                      pieGeometry.outer
                    }
                    paddingAngle={
                      pieGeometry.paddingAngle
                    }
                    cornerRadius={
                      pieGeometry.cornerRadius
                    }
                    stroke={
                      pieStyle ===
                      "exploded"
                        ? "#FFFFFF"
                        : "none"
                    }
                    strokeWidth={
                      pieStyle ===
                      "exploded"
                        ? 3
                        : 0
                    }
                    labelLine={false}
                    label={
                      pieDisplay.showSliceLabels
                        ? renderSliceLabel
                        : false
                    }
                    isAnimationActive={false}
                  >
                    {chartData.map(
                      (entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          style={{
                            filter:
                              pieStyle ===
                              "exploded"
                                ? "drop-shadow(0 3px 4px rgba(15,23,42,.16))"
                                : undefined,
                          }}
                        />
                      )
                    )}
                  </Pie>

                  {pieDisplay.showTooltip && (
                    <Tooltip
                      formatter={(
                        value,
                        _name,
                        props
                      ) => {
                        const unit =
                          props?.payload
                            ?.unit || "";

                        return [
                          `${formatNumber(
                            value
                          )}${
                            unit
                              ? ` ${unit}`
                              : ""
                          }`,
                          props?.payload
                            ?.name,
                        ];
                      }}
                      contentStyle={
                        botanicalTooltipStyle
                      }
                      itemStyle={{
                        color: "#f8fafc",
                      }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>

              {pieDisplay.showTotal &&
                hasCenterHole && (
                <div
                  className="
                    pointer-events-none
                    absolute inset-0
                    flex items-center
                    justify-center
                  "
                >
                  <div className="text-center">
                    <div
                      className={`
                        text-[6.5px] font-bold
                        uppercase
                        tracking-[0.14em]
                        ${TECH_MUTED_CLASS}
                      `}
                    >
                      Total
                    </div>

                    <div
                      className="
                        mt-0.5 text-lg
                        font-black
                        tracking-[-0.045em]
                        text-slate-950
                        dark:text-white
                      "
                    >
                      {formatCompactValue(
                        total
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {pieDisplay.showLegend && (
              <div
                className="
                  min-h-0 min-w-0
                  overflow-y-auto
                  border-l
                  border-slate-100
                  pl-2 pr-1
                  dark:border-white/10
                "
              >
                <div className="flex min-h-full flex-col justify-center gap-1.5">
                  {visibleEntries.map(
                    (entry) =>
                      renderLegendEntry(
                        entry,
                        {
                          compact: false,
                          showBar: false,
                        }
                      )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`
              mt-1 min-h-0 flex-1
              ${
                !pieDisplay.showLegend
                  ? "grid grid-cols-1"
                  : legendAtBottom
                  ? "grid grid-rows-[minmax(0,1fr)_auto] gap-1.5"
                  : wideSingleRow
                  ? "grid grid-cols-[minmax(0,1.12fr)_minmax(130px,.88fr)] gap-2"
                  : "grid grid-cols-[minmax(0,1.35fr)_minmax(120px,.8fr)] gap-2"
              }
            `}
          >
            <div className="relative min-h-0 min-w-0 overflow-hidden">
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
                      pieGeometry.inner
                    }
                    outerRadius={
                      pieGeometry.outer
                    }
                    paddingAngle={
                      pieGeometry.paddingAngle
                    }
                    cornerRadius={
                      pieGeometry.cornerRadius
                    }
                    stroke={
                      pieStyle ===
                      "exploded"
                        ? "#FFFFFF"
                        : "none"
                    }
                    strokeWidth={
                      pieStyle ===
                      "exploded"
                        ? 3
                        : 0
                    }
                    labelLine={false}
                    label={
                      pieDisplay.showSliceLabels
                        ? renderSliceLabel
                        : false
                    }
                    isAnimationActive={false}
                  >
                    {chartData.map(
                      (entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          style={{
                            filter:
                              pieStyle ===
                              "exploded"
                                ? "drop-shadow(0 3px 4px rgba(15,23,42,.16))"
                                : undefined,
                          }}
                        />
                      )
                    )}
                  </Pie>

                  {pieDisplay.showTooltip && (
                  <Tooltip
                    formatter={(
                      value,
                      _name,
                      props
                    ) => {
                      const unit =
                        props?.payload
                          ?.unit || "";

                      return [
                        `${formatNumber(
                          value
                        )}${
                          unit
                            ? ` ${unit}`
                            : ""
                        }`,
                        props?.payload
                          ?.name,
                      ];
                    }}
                    contentStyle={
                      botanicalTooltipStyle
                    }
                    itemStyle={{
                      color: "#f8fafc",
                    }}
                  />
                  )}
                </PieChart>
              </ResponsiveContainer>

              {pieDisplay.showTotal &&
                hasCenterHole && (
              <div
                className="
                  pointer-events-none
                  absolute inset-0
                  flex items-center
                  justify-center
                "
              >
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
                    className="
                      mt-0.5 text-xl
                      font-black
                      tracking-[-0.045em]
                      text-slate-950
                      dark:text-white
                    "
                  >
                    {formatCompactValue(
                      total
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>

            {pieDisplay.showLegend && (
              <div
                className={`
                  min-h-0 min-w-0
                  ${
                    legendAtBottom
                      ? "grid grid-cols-2 gap-x-2 gap-y-1 overflow-y-auto px-1"
                      : "flex flex-col justify-center gap-2 overflow-y-auto pr-1"
                  }
                `}
              >
                {visibleEntries.map(
                  (entry) =>
                    renderLegendEntry(
                      entry,
                      {
                        compact: legendAtBottom,
                        showBar: legendAtSide,
                      }
                    )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRef } from "react";
import {
  TECH_AXIS_STROKE,
  TECH_GRID_STROKE,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SERIES,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  readableFieldLabel,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_CHART_DISPLAY = {
  showGrid: true,
  showLegend: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: true,
  yAxisMode: "range",
  yAxisMin: "",
  yAxisMax: "",
  yAxisTickCount: 5,
};

export default function BarWidget({
  data = {},
  dataKeys = [],
  label = "Bar Chart",
  orientation = "vertical",
  rangeConfig = null,
  rangeConfigs = {},
  dataLabels = {},
  chartDisplay = {},
}) {
  const rootRef = useRef(null);
  const { tiny, compact } = useWidgetSize(rootRef);

  const display = {
    ...DEFAULT_CHART_DISPLAY,
    ...(chartDisplay || {}),
  };

  const selectedKeys =
    dataKeys.length > 0
      ? dataKeys
      : Object.keys(data).slice(0, 3);

  const getConfigForKey = (key) => ({
    min: 0,
    max: 100,
    unit: "",
    warning: 80,
    danger: 90,
    ...(rangeConfig || {}),
    ...(rangeConfigs?.[key] || {}),
  });

  const chartData = selectedKeys.map(
    (key, index) => {
      const config = getConfigForKey(key);

      return {
        key,
        name:
          dataLabels?.[key] ||
          readableFieldLabel(key),
        value: toFiniteNumber(
          data?.[key],
          0
        ),
        unit: String(
          config.unit || ""
        ).trim(),
        color:
          TECH_SERIES[
            index % TECH_SERIES.length
          ],
      };
    }
  );

  const rangeMins =
    selectedKeys.map((key) =>
      toFiniteNumber(
        getConfigForKey(key).min,
        0
      )
    );

  const rangeMaxs =
    selectedKeys.map((key) =>
      toFiniteNumber(
        getConfigForKey(key).max,
        100
      )
    );

  const rangeMin = rangeMins.length
    ? Math.min(...rangeMins)
    : 0;

  const rangeMax = rangeMaxs.length
    ? Math.max(...rangeMaxs)
    : 100;

  const numericDomain =
    display.yAxisMode === "auto"
      ? ["auto", "auto"]
      : display.yAxisMode === "custom"
      ? [
          display.yAxisMin === ""
            ? "auto"
            : toFiniteNumber(
                display.yAxisMin,
                rangeMin
              ),
          display.yAxisMax === ""
            ? "auto"
            : toFiniteNumber(
                display.yAxisMax,
                rangeMax
              ),
        ]
      : [rangeMin, rangeMax];

  const isHorizontal =
    orientation === "horizontal";

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-2.5" : "p-3.5"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div
            className={`${TECH_HEADER_CLASS} truncate`}
          >
            {label}
          </div>

          {!tiny && (
            <div
              className={`text-[10px] uppercase tracking-wider ${TECH_MUTED_CLASS}`}
            >
              {orientation}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1">
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
                right: tiny ? 4 : 10,
                left:
                  isHorizontal
                    ? tiny
                      ? 4
                      : 18
                    : tiny
                    ? -24
                    : -8,
                bottom: tiny ? -4 : 0,
              }}
            >
              {display.showGrid && (
                <CartesianGrid
                  strokeDasharray="3 5"
                  stroke={TECH_GRID_STROKE}
                  opacity={0.14}
                  horizontal={!compact}
                />
              )}

              {isHorizontal ? (
                <>
                  {display.showXAxis && (
                    <XAxis
                      type="number"
                      domain={numericDomain}
                      tick={{
                        fontSize: tiny
                          ? 8
                          : 10,
                        fill: TECH_AXIS_STROKE,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                  )}

                  {display.showYAxis && (
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={tiny ? 52 : 90}
                      tick={{
                        fontSize: tiny
                          ? 8
                          : 10,
                        fill: TECH_AXIS_STROKE,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                  )}
                </>
              ) : (
                <>
                  {display.showXAxis && (
                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: tiny
                          ? 8
                          : 10,
                        fill: TECH_AXIS_STROKE,
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval={
                        compact ? 0 : "preserveEnd"
                      }
                    />
                  )}

                  {display.showYAxis && (
                    <YAxis
                      domain={numericDomain}
                      width={tiny ? 30 : 44}
                      tick={{
                        fontSize: tiny
                          ? 8
                          : 10,
                        fill: TECH_AXIS_STROKE,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickCount={Math.max(
                        2,
                        Number(
                          display.yAxisTickCount
                        ) || 5
                      )}
                    />
                  )}
                </>
              )}

              {display.showTooltip && (
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
                      `${Number(
                        value
                      ).toFixed(1)}${
                        unit ? ` ${unit}` : ""
                      }`,
                      props?.payload?.name ||
                        "Value",
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
              )}

              <Bar
                dataKey="value"
                radius={
                  isHorizontal
                    ? [0, 7, 7, 0]
                    : [7, 7, 2, 2]
                }
                maxBarSize={
                  tiny ? 24 : compact ? 34 : 46
                }
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.color}
                    fillOpacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {display.showLegend &&
          !tiny &&
          chartData.length > 1 && (
            <div
              className="
                mt-2 flex flex-wrap
                justify-center gap-x-3 gap-y-1
              "
            >
              {chartData.map((entry) => (
                <div
                  key={entry.key}
                  className={`flex items-center gap-1.5 text-[10px] ${TECH_MUTED_CLASS}`}
                >
                  <span
                    className="h-1.5 w-3 rounded-full"
                    style={{
                      background: entry.color,
                    }}
                  />
                  <span className="max-w-[110px] truncate">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

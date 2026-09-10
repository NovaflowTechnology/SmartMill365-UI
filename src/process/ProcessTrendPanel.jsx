import { useMemo } from "react";

const SERIES_COLORS = [
  "#58D7FF",
  "#7D75E7",
  "#A86BDF",
  "#FF6F88",
  "#FFD66B",
  "#4D91C9",
];

const finite = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const niceStep = (span, targetTicks = 5) => {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const raw = span / Math.max(2, targetTicks - 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / power;

  if (normalized <= 1) return power;
  if (normalized <= 2) return 2 * power;
  if (normalized <= 2.5) return 2.5 * power;
  if (normalized <= 5) return 5 * power;
  return 10 * power;
};

const formatAxis = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  }
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toFixed(Math.abs(numeric) < 10 ? 1 : 0);
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ProcessTrendPanel({
  series = [],
  title = "Pressure Trend",
  subtitle = "Last 15 minutes",
  unit = "psi",
  dark = false,
}) {
  const model = useMemo(() => {
    const usable = (Array.isArray(series) ? series : [])
      .map((item, index) => ({
        ...item,
        color: item.color || SERIES_COLORS[index % SERIES_COLORS.length],
        points: (Array.isArray(item.points) ? item.points : [])
          .map((point) => ({
            timestamp: point?.timestamp,
            value: finite(point?.value),
          }))
          .filter((point) => point.value !== null),
      }))
      .filter((item) => item.points.length > 0);

    const values = usable.flatMap((item) =>
      item.points.map((point) => point.value)
    );

    if (values.length === 0) {
      return {
        series: usable,
        min: 0,
        max: 1,
        ticks: [0, 0.25, 0.5, 0.75, 1],
        start: null,
        end: null,
      };
    }

    let observedMin = Math.min(...values);
    let observedMax = Math.max(...values);

    if (observedMax === observedMin) {
      const pad = Math.max(Math.abs(observedMax) * 0.08, 1);
      observedMin -= pad;
      observedMax += pad;
    }

    const span = observedMax - observedMin;
    const includeZero = observedMin >= 0 && observedMin <= span * 0.45;
    const paddedMin = includeZero ? 0 : observedMin - span * 0.08;
    const paddedMax = observedMax + span * 0.1;
    const step = niceStep(paddedMax - paddedMin, 5);
    const niceMin = includeZero
      ? 0
      : Math.floor(paddedMin / step) * step;
    const niceMax = Math.ceil(paddedMax / step) * step;
    const ticks = [];

    for (
      let value = niceMin;
      value <= niceMax + step * 0.25 && ticks.length < 8;
      value += step
    ) {
      ticks.push(Number(value.toFixed(8)));
    }

    const timestamps = usable.flatMap((item) =>
      item.points
        .map((point) => new Date(point.timestamp).getTime())
        .filter(Number.isFinite)
    );

    return {
      series: usable,
      min: niceMin,
      max: niceMax > niceMin ? niceMax : niceMin + 1,
      ticks,
      start: timestamps.length ? Math.min(...timestamps) : null,
      end: timestamps.length ? Math.max(...timestamps) : null,
    };
  }, [series]);

  const width = 1000;
  const height = 210;
  const plot = {
    left: 58,
    right: 18,
    top: 22,
    bottom: 42,
  };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;

  const xFor = (timestamp, index, total) => {
    const time = new Date(timestamp).getTime();
    if (
      Number.isFinite(time) &&
      Number.isFinite(model.start) &&
      Number.isFinite(model.end) &&
      model.end > model.start
    ) {
      return (
        plot.left +
        ((time - model.start) / (model.end - model.start)) * plotWidth
      );
    }

    return (
      plot.left +
      (total <= 1 ? 0 : index / (total - 1)) * plotWidth
    );
  };

  const yFor = (value) =>
    plot.top +
    (1 - (value - model.min) / (model.max - model.min)) * plotHeight;

  const createPath = (points) =>
    points
      .map((point, index) => {
        const x = xFor(point.timestamp, index, points.length);
        const y = yFor(point.value);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

  const xTicks = useMemo(() => {
    if (!Number.isFinite(model.start) || !Number.isFinite(model.end)) {
      return [];
    }

    const count = 6;
    return Array.from({ length: count }, (_, index) => {
      const ratio = index / (count - 1);
      const value = model.start + (model.end - model.start) * ratio;
      return {
        x: plot.left + plotWidth * ratio,
        label: formatTime(value),
      };
    });
  }, [model.end, model.start, plot.left, plotWidth]);

  const theme = dark
    ? {
        panel: "#0B1429",
        plot: "#0A1226",
        border: "#263657",
        divider: "#20304F",
        grid: "#263657",
        title: "#58D7FF",
        primary: "#E8EDFF",
        secondary: "#C8D1EA",
        muted: "#93A2C7",
        faint: "#64748B",
      }
    : {
        panel: "#FFFFFF",
        plot: "#F8FAFC",
        border: "#D8E1EE",
        divider: "#E2E8F0",
        grid: "#DCE6F2",
        title: "#0891B2",
        primary: "#0F172A",
        secondary: "#334155",
        muted: "#64748B",
        faint: "#94A3B8",
      };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#263657] dark:bg-[#0B1429]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-[#20304F]">
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.08em] text-cyan-700 dark:text-[#58D7FF]">
            {title}
          </div>
          <div className="mt-0.5 text-[9px] text-slate-500 dark:text-[#93A2C7]">
            {subtitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {model.series.map((item) => (
            <div
              key={item.id || item.label}
              className="inline-flex items-center gap-1.5 text-[9px] text-slate-600 dark:text-[#C8D1EA]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
              {item.points.length > 0 && (
                <strong className="font-bold text-slate-900 dark:text-[#E8EDFF]">
                  {formatAxis(item.points.at(-1)?.value)}
                </strong>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-2 pb-2 pt-1">
        {model.series.length === 0 ? (
          <div className="flex h-[190px] items-center justify-center text-[10px] text-slate-400 dark:text-[#64748B]">
            No trend data is available for the selected process equipment.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-[210px] w-full"
            role="img"
            aria-label={`${title} chart`}
          >
            <rect
              x={plot.left}
              y={plot.top}
              width={plotWidth}
              height={plotHeight}
              fill={theme.plot}
              rx="8"
            />

            {model.ticks.map((tick) => {
              const y = yFor(tick);
              return (
                <g key={tick}>
                  <line
                    x1={plot.left}
                    x2={plot.left + plotWidth}
                    y1={y}
                    y2={y}
                    stroke={theme.grid}
                    strokeWidth="1"
                    strokeOpacity="0.65"
                  />
                  <text
                    x={plot.left - 10}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill={theme.muted}
                  >
                    {formatAxis(tick)}
                  </text>
                </g>
              );
            })}

            <text
              x="11"
              y={plot.top + 8}
              fontSize="8"
              fill={theme.muted}
            >
              {unit}
            </text>

            {xTicks.map((tick) => (
              <g key={`${tick.x}-${tick.label}`}>
                <line
                  x1={tick.x}
                  x2={tick.x}
                  y1={plot.top}
                  y2={plot.top + plotHeight}
                  stroke={theme.grid}
                  strokeWidth="1"
                  strokeOpacity="0.45"
                />
                <text
                  x={tick.x}
                  y={height - 16}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill={theme.muted}
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {model.series.map((item) => (
              <path
                key={item.id || item.label}
                d={createPath(item.points)}
                fill="none"
                stroke={item.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        )}
      </div>
    </section>
  );
}

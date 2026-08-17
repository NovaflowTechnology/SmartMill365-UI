import { useEffect, useId, useRef, useState } from "react";

const DEFAULT_RANGE_CONFIG = {
  min: 0,
  max: 100,
  unit: "",
  warning: 80,
  danger: 90,
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const toNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export default function GaugeWidget({
  value = 50,
  label = "",
  dataKey = "",
  rangeConfig,
}) {
  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(rangeConfig || {}),
  };

  const min = toNumber(config.min, 0);
  const configuredMax = toNumber(config.max, 100);
  const max = configuredMax > min ? configuredMax : min + 1;

  const warning = clamp(
    toNumber(config.warning, min + (max - min) * 0.8),
    min,
    max
  );

  const danger = clamp(
    toNumber(config.danger, min + (max - min) * 0.9),
    min,
    max
  );

  const unit = String(config.unit || "").trim();
  const numericValue = toNumber(value, min);
  const clampedValue = clamp(numericValue, min, max);

  const [displayValue, setDisplayValue] = useState(clampedValue);

  useEffect(() => {
    let raf;

    const animate = () => {
      setDisplayValue((previous) => {
        const diff = clampedValue - previous;

        if (Math.abs(diff) < 0.01) {
          return clampedValue;
        }

        return previous + diff * 0.16;
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [clampedValue]);

  const previousValue = useRef(numericValue);

  const trend =
    numericValue > previousValue.current
      ? "up"
      : numericValue < previousValue.current
      ? "down"
      : "stable";

  useEffect(() => {
    previousValue.current = numericValue;
  }, [numericValue]);

  const percent = clamp(
    (displayValue - min) / (max - min),
    0,
    1
  );

  const warningPercent = clamp(
    (warning - min) / (max - min),
    0,
    1
  );

  const dangerPercent = clamp(
    (danger - min) / (max - min),
    0,
    1
  );

  const status =
    numericValue >= danger
      ? "danger"
      : numericValue >= warning
      ? "warning"
      : "normal";

  const statusMeta = {
    normal: {
      label: "Normal",
      dot: "bg-cyan-400",
      text: "text-cyan-600 dark:text-cyan-300",
      needle: "#22d3ee",
    },
    warning: {
      label: "Warning",
      dot: "bg-amber-400",
      text: "text-amber-600 dark:text-amber-300",
      needle: "#f59e0b",
    },
    danger: {
      label: "Critical",
      dot: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-300",
      needle: "#f43f5e",
    },
  }[status];

  const trendSymbol =
    trend === "up" ? "↗" : trend === "down" ? "↘" : "→";

  const trendClass =
    trend === "up"
      ? "text-emerald-500 dark:text-emerald-300"
      : trend === "down"
      ? "text-rose-500 dark:text-rose-300"
      : "text-slate-400 dark:text-slate-500";

  const generatedId = useId().replace(/:/g, "");
  const activeGradientId = `gaugeActive-${generatedId}`;
  const glowId = `gaugeGlow-${generatedId}`;
  const hubGlowId = `hubGlow-${generatedId}`;

  const cx = 160;
  const cy = 126;
  const radius = 102;
  const arcLength = Math.PI * radius;

  const pointForPercent = (p, r = radius) => {
    const angle = Math.PI * (1 - p);
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  };

  const needleAngle = -90 + percent * 180;
  const activeDash = arcLength * percent;

  const warningPoint = pointForPercent(warningPercent);
  const dangerPoint = pointForPercent(dangerPercent);

  const formattedValue = Number.isFinite(displayValue)
    ? displayValue.toFixed(1)
    : "—";

  const ticks = Array.from({ length: 11 }, (_, index) => {
    const p = index / 10;
    const major = index % 5 === 0;
    const outer = pointForPercent(p, radius + 10);
    const inner = pointForPercent(p, radius + (major ? 0 : 4));

    return {
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      major,
    };
  });

  return (
    <div
      className="
        flex h-full w-full min-h-0 flex-col
        justify-center overflow-hidden
        px-2 py-1.5
      "
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg
          viewBox="0 0 320 190"
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full max-h-[280px] max-w-[500px]"
          role="img"
          aria-label={`${label || dataKey || "Gauge"}: ${formattedValue}${unit ? ` ${unit}` : ""}`}
        >
          <defs>
            <linearGradient
              id={activeGradientId}
              x1="58"
              y1="126"
              x2="262"
              y2="126"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="52%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <filter
              id={glowId}
              x="-45%"
              y="-45%"
              width="190%"
              height="190%"
            >
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={hubGlowId}
              x="-120%"
              y="-120%"
              width="340%"
              height="340%"
            >
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer technical ticks */}
          {ticks.map((tick, index) => (
            <line
              key={index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="currentColor"
              strokeWidth={tick.major ? 1.5 : 0.9}
              className="text-slate-300 dark:text-slate-600"
              opacity={tick.major ? 0.95 : 0.62}
            />
          ))}

          {/* Base arc */}
          <path
            d="M 58 126 A 102 102 0 0 1 262 126"
            fill="none"
            stroke="currentColor"
            strokeWidth="13"
            strokeLinecap="round"
            className="text-slate-200 dark:text-slate-700"
          />

          {/* Active arc */}
          <path
            d="M 58 126 A 102 102 0 0 1 262 126"
            fill="none"
            stroke={`url(#${activeGradientId})`}
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={`${activeDash} ${arcLength}`}
            filter={`url(#${glowId})`}
          />

          {/* Threshold markers */}
          <circle
            cx={warningPoint.x}
            cy={warningPoint.y}
            r="3.6"
            fill="#f59e0b"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.2"
          />
          <circle
            cx={dangerPoint.x}
            cy={dangerPoint.y}
            r="3.6"
            fill="#f43f5e"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.2"
          />

          {/* Needle */}
          <g
            transform={`rotate(${needleAngle} ${cx} ${cy})`}
            style={{
              transition:
                "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <line
              x1={cx}
              y1={cy - 9}
              x2={cx}
              y2="49"
              stroke={statusMeta.needle}
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          </g>

          {/* Pivot - no black fill */}
          <circle
            cx={cx}
            cy={cy}
            r="9"
            fill="#ecfeff"
            stroke={statusMeta.needle}
            strokeWidth="3"
            className="dark:fill-slate-900"
            filter={`url(#${hubGlowId})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r="3.2"
            fill={statusMeta.needle}
          />

          {/* Min / Max */}
          <text
            x="55"
            y="148"
            textAnchor="start"
            className="fill-slate-500 text-[9px] font-bold dark:fill-slate-300"
          >
            {min}
          </text>

          <text
            x="265"
            y="148"
            textAnchor="end"
            className="fill-slate-500 text-[9px] font-bold dark:fill-slate-300"
          >
            {max}
          </text>

          {/* Main value */}
          <text
            x={cx}
            y="168"
            textAnchor="middle"
            className="fill-slate-900 text-[28px] font-black tracking-[-0.035em] dark:fill-white"
          >
            {formattedValue}
          </text>

          {unit && (
            <text
              x={cx}
              y="182"
              textAnchor="middle"
              className="fill-slate-500 text-[9px] font-bold uppercase tracking-[0.14em] dark:fill-slate-300"
            >
              {unit}
            </text>
          )}
        </svg>
      </div>

      <div
        className="
          mt-0.5 flex items-center justify-between gap-2
          border-t border-slate-200/80 px-1 pt-1.5
          text-[9px] font-bold
          dark:border-slate-700/80
        "
      >
        <div className={`flex items-center gap-1.5 ${statusMeta.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
          <span className="uppercase tracking-[0.12em]">
            {statusMeta.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-500 dark:text-slate-300">
            {Math.round(percent * 100)}%
          </span>
          <span className={`${trendClass} text-xs leading-none`}>
            {trendSymbol}
          </span>
        </div>
      </div>
    </div>
  );
}

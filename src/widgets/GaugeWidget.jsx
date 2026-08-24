import { useEffect, useId, useRef, useState } from "react";
import {
  TECH_ACCENT,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  clamp,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_RANGE_CONFIG = {
  min: 0,
  max: 100,
  unit: "",
  warning: 80,
  danger: 90,
};

export default function GaugeWidget({
  value = 50,
  label = "",
  dataKey = "",
  rangeConfig,
}) {
  const rootRef = useRef(null);
  const { tiny, compact } = useWidgetSize(rootRef);
  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(rangeConfig || {}),
  };

  const min = toFiniteNumber(config.min, 0);
  const configuredMax = toFiniteNumber(config.max, 100);
  const max = configuredMax > min ? configuredMax : min + 1;
  const warning = clamp(
    toFiniteNumber(config.warning, min + (max - min) * 0.8),
    min,
    max
  );
  const danger = clamp(
    toFiniteNumber(config.danger, min + (max - min) * 0.9),
    min,
    max
  );
  const unit = String(config.unit || "").trim();
  const numericValue = toFiniteNumber(value, min);
  const clampedValue = clamp(numericValue, min, max);

  const [displayValue, setDisplayValue] = useState(clampedValue);

  useEffect(() => {
    let raf;
    const animate = () => {
      setDisplayValue((previous) => {
        const diff = clampedValue - previous;
        if (Math.abs(diff) < 0.01) return clampedValue;
        return previous + diff * 0.16;
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [clampedValue]);

  const percent = clamp((displayValue - min) / (max - min), 0, 1);
  const warningPercent = clamp((warning - min) / (max - min), 0, 1);
  const dangerPercent = clamp((danger - min) / (max - min), 0, 1);

  const status =
    numericValue >= danger
      ? "critical"
      : numericValue >= warning
      ? "warning"
      : "normal";

  const statusMeta = {
    normal: {
      label: "Normal",
      color: TECH_ACCENT.lime,
      text: "text-cyan-700 dark:text-[#58D7FF]",
      bg: "bg-[#58D7FF]/10",
    },
    warning: {
      label: "Warning",
      color: "#D69A2D",
      text: "text-amber-600 dark:text-amber-300",
      bg: "bg-amber-500/10",
    },
    critical: {
      label: "Critical",
      color: TECH_ACCENT.plum,
      text: "text-[#8c365f] dark:text-[#FF9AAE]",
      bg: "bg-[#FF6F88]/10",
    },
  }[status];

  const generatedId = useId().replace(/:/g, "");
  const activeGradientId = `botanicalGauge-${generatedId}`;

  const cx = 160;
  const cy = 128;
  const radius = 104;
  const arcLength = Math.PI * radius;

  const pointForPercent = (p, r = radius) => {
    const angle = Math.PI * (1 - p);
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  };

  const warningPoint = pointForPercent(warningPercent);
  const dangerPoint = pointForPercent(dangerPercent);
  const needleAngle = -90 + percent * 180;
  const needleLength = tiny ? 58 : 70;
  const formattedValue = Number.isFinite(displayValue)
    ? displayValue.toFixed(1)
    : "—";

  const ticks = Array.from({ length: 9 }, (_, index) => {
    const p = index / 8;
    const outer = pointForPercent(p, radius + 8);
    const inner = pointForPercent(p, radius + (index % 4 === 0 ? -1 : 3));
    return { ...outer, ix: inner.x, iy: inner.y, major: index % 4 === 0 };
  });

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} flex min-h-0 flex-col ${
        tiny ? "p-2.5" : "p-3"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 px-1 pr-14">
          <div className="min-w-0">
            <div className={`${TECH_HEADER_CLASS} truncate`} title={label || dataKey}>
              {label || dataKey || "Gauge"}
            </div>
            {!tiny && unit && (
              <div className={`mt-0.5 text-[10px] ${TECH_MUTED_CLASS}`}>
                Range {min}–{max} {unit}
              </div>
            )}
          </div>

          <div
            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${statusMeta.bg} ${statusMeta.text}`}
          >
            {statusMeta.label}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <svg
            viewBox="0 0 320 208"
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full max-h-[300px]"
            role="img"
            aria-label={`${label || dataKey || "Gauge"}: ${formattedValue}${
              unit ? ` ${unit}` : ""
            }`}
          >
            <defs>
              <linearGradient
                id={activeGradientId}
                x1="56"
                y1="126"
                x2="264"
                y2="126"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#58D7FF" />
                <stop offset="58%" stopColor="#7D75E7" />
                <stop offset="100%" stopColor="#A86BDF" />
              </linearGradient>
            </defs>

            {ticks.map((tick, index) => (
              <line
                key={index}
                x1={tick.ix}
                y1={tick.iy}
                x2={tick.x}
                y2={tick.y}
                stroke="#CBD5E1"
                className="dark:[stroke:#3A4A70]"
                strokeWidth={tick.major ? 1.6 : 1}
                opacity={tick.major ? 0.9 : 0.55}
              />
            ))}

            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${
                cx + radius
              } ${cy}`}
              fill="none"
              stroke="#E8EDF5"
              strokeWidth="16"
              strokeLinecap="round"
              className="dark:[stroke:#223253]"
            />

            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${
                cx + radius
              } ${cy}`}
              fill="none"
              stroke={`url(#${activeGradientId})`}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${arcLength * percent} ${arcLength}`}
            />

            <circle
              cx={warningPoint.x}
              cy={warningPoint.y}
              r="4.2"
              fill="#E3A937"
              stroke="#fff"
              strokeWidth="2"
            />
            <circle
              cx={dangerPoint.x}
              cy={dangerPoint.y}
              r="4.2"
              fill={TECH_ACCENT.plum}
              stroke="#fff"
              strokeWidth="2"
            />

            <g transform={`rotate(${needleAngle} ${cx} ${cy})`}>
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - needleLength}
                stroke={statusMeta.color}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="11" fill="#fff" stroke={statusMeta.color} strokeWidth="4" />
              <circle cx={cx} cy={cy} r="3.5" fill={TECH_ACCENT.ink} />
            </g>

            <text
              x={cx}
              y="174"
              textAnchor="middle"
              className="fill-slate-950 dark:fill-slate-100"
              style={{ fontSize: compact ? 29 : 34, fontWeight: 800, letterSpacing: "-0.04em" }}
            >
              {formattedValue}
            </text>

            {unit && (
              <text
                x={cx}
                y="194"
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500"
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                {unit}
              </text>
            )}

            <text x={cx - radius} y="151" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 9 }}>
              {min}
            </text>
            <text x={cx + radius} y="151" textAnchor="end" className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 9 }}>
              {max}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

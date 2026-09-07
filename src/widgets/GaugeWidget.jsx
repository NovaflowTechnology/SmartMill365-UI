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

const polarPoint = (cx, cy, radius, angle) => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const describeArc = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const sweep = endAngle - startAngle;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${
    Math.abs(sweep) > 180 ? 1 : 0
  } 1 ${end.x} ${end.y}`;
};

export default function GaugeWidget({
  value = 50,
  label = "",
  dataKey = "",
  rangeConfig,
  display,
}) {
  const rootRef = useRef(null);
  const { tiny, compact } = useWidgetSize(rootRef);
  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(rangeConfig || {}),
  };

  const style = ["circular", "segmented"].includes(
    display?.style
  )
    ? display.style
    : "circular";

  const min = toFiniteNumber(config.min, 0);
  const configuredMax = toFiniteNumber(config.max, 100);
  const max = configuredMax > min ? configuredMax : min + 1;

  const hasWarning =
    config.warning !== null &&
    config.warning !== undefined &&
    String(config.warning).trim() !== "";

  const hasDanger =
    config.danger !== null &&
    config.danger !== undefined &&
    String(config.danger).trim() !== "";

  const warning = hasWarning
    ? clamp(toFiniteNumber(config.warning, min), min, max)
    : null;

  const danger = hasDanger
    ? clamp(toFiniteNumber(config.danger, max), min, max)
    : null;

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
  const warningPercent =
    warning === null ? null : clamp((warning - min) / (max - min), 0, 1);
  const dangerPercent =
    danger === null ? null : clamp((danger - min) / (max - min), 0, 1);

  const status =
    danger !== null && numericValue >= danger
      ? "critical"
      : warning !== null && numericValue >= warning
      ? "warning"
      : "normal";

  const defaultStatusColors = {
    normal: "#3B82F6",
    warning: "#F59E0B",
    critical: "#F43F5E",
  };

  const resolveColor = (
    value,
    fallback
  ) =>
    /^#[0-9a-fA-F]{6}$/.test(
      String(value || "")
    )
      ? value
      : fallback;

  const customStatusColors = {
    normal: resolveColor(
      display?.normalColor ||
        display?.customColor,
      defaultStatusColors.normal
    ),
    warning: resolveColor(
      display?.warningColor,
      defaultStatusColors.warning
    ),
    critical: resolveColor(
      display?.dangerColor,
      defaultStatusColors.critical
    ),
  };

  const statusColor =
    display?.colorMode === "custom"
      ? customStatusColors[status]
      : defaultStatusColors[status];

  const activeColor = statusColor;

  const generatedId = useId().replace(/:/g, "");
  const activeGradientId = `gauge-active-${generatedId}`;
  const formattedValue = Number.isFinite(displayValue)
    ? displayValue.toFixed(1)
    : "—";

  const renderClassic = () => {
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

    const warningPoint =
      warningPercent === null ? null : pointForPercent(warningPercent);
    const dangerPoint =
      dangerPercent === null ? null : pointForPercent(dangerPercent);
    const needleAngle = -90 + percent * 180;
    const needleLength = tiny ? 58 : 70;
    const ticks = Array.from({ length: 9 }, (_, index) => {
      const p = index / 8;
      const outer = pointForPercent(p, radius + 8);
      const inner = pointForPercent(
        p,
        radius + (index % 4 === 0 ? -1 : 3)
      );

      return {
        ...outer,
        ix: inner.x,
        iy: inner.y,
        major: index % 4 === 0,
      };
    });

    return (
      <svg
        viewBox="0 0 320 208"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full max-h-[300px]"
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
            <stop offset="0%" stopColor={activeColor} />
            <stop offset="100%" stopColor={activeColor} />
          </linearGradient>
        </defs>

        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.ix}
            y1={tick.iy}
            x2={tick.x}
            y2={tick.y}
            stroke="#94A3B8"
            strokeWidth={tick.major ? 1.6 : 1}
            opacity={tick.major ? 0.72 : 0.38}
          />
        ))}

        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${
            cx + radius
          } ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="16"
          strokeLinecap="round"
          className="dark:[stroke:#273449]"
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

        {warningPoint && (
          <circle
            cx={warningPoint.x}
            cy={warningPoint.y}
            r="4.2"
            fill="#FBBF24"
            stroke="#fff"
            strokeWidth="2"
          />
        )}

        {dangerPoint && (
          <circle
            cx={dangerPoint.x}
            cy={dangerPoint.y}
            r="4.2"
            fill="#F43F5E"
            stroke="#fff"
            strokeWidth="2"
          />
        )}

        <g transform={`rotate(${needleAngle} ${cx} ${cy})`}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - needleLength}
            stroke={activeColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            cx={cx}
            cy={cy}
            r="11"
            fill="#fff"
            stroke={activeColor}
            strokeWidth="4"
          />
          <circle cx={cx} cy={cy} r="3.5" fill={TECH_ACCENT.ink} />
        </g>

        <text
          x={cx}
          y="174"
          textAnchor="middle"
          className="fill-slate-950 dark:fill-slate-100"
          style={{
            fontSize: compact ? 29 : 34,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
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

        <text
          x={cx - radius}
          y="151"
          className="fill-slate-400 dark:fill-slate-500"
          style={{ fontSize: 9 }}
        >
          {min}
        </text>
        <text
          x={cx + radius}
          y="151"
          textAnchor="end"
          className="fill-slate-400 dark:fill-slate-500"
          style={{ fontSize: 9 }}
        >
          {max}
        </text>
      </svg>
    );
  };

  const renderSegmented = () => {
    const cx = 160;
    const cy = 150;
    const radius = 124;
    const startAngle = 160;
    const endAngle = 380;
    const sweep = endAngle - startAngle;

    const fullPath = describeArc(
      cx,
      cy,
      radius,
      startAngle,
      endAngle
    );

    const activeEndAngle =
      startAngle + percent * sweep;

    const activePath = describeArc(
      cx,
      cy,
      radius,
      startAngle,
      activeEndAngle
    );

    const outerAccentRadius =
      radius + 15;

    const outerPath = describeArc(
      cx,
      cy,
      outerAccentRadius,
      startAngle,
      endAngle
    );

    return (
      <svg
        viewBox="0 0 320 220"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full max-h-[320px]"
      >
        <path
          d={fullPath}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="21"
          strokeLinecap="butt"
          className="dark:[stroke:#242932]"
        />

        {percent > 0.001 && (
          <path
            d={activePath}
            fill="none"
            stroke={activeColor}
            strokeWidth="21"
            strokeLinecap="butt"
          />
        )}

        <path
          d={outerPath}
          fill="none"
          stroke={activeColor}
          strokeWidth="3"
          strokeLinecap="butt"
          opacity="0.95"
        />

        <text
          x={cx}
          y="160"
          textAnchor="middle"
          className="fill-slate-950 dark:fill-slate-100"
          style={{
            fontSize: compact ? 45 : 54,
            fontWeight: 700,
            letterSpacing: "-0.05em",
          }}
        >
          {formattedValue}

          {unit && (
            <tspan
              dx="7"
              fill={activeColor}
              style={{
                fontSize: compact ? 19 : 23,
                fontWeight: 650,
                letterSpacing: "-0.025em",
              }}
            >
              {unit}
            </tspan>
          )}
        </text>

        <text
          x="28"
          y="213"
          className="fill-slate-400 dark:fill-slate-500"
          style={{
            fontSize: 8,
            fontWeight: 700,
          }}
        >
          {min}
        </text>

        <text
          x="292"
          y="213"
          textAnchor="end"
          className="fill-slate-400 dark:fill-slate-500"
          style={{
            fontSize: 8,
            fontWeight: 700,
          }}
        >
          {max}
        </text>
      </svg>
    );
  };


  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} flex min-h-0 flex-col ${
        tiny ? "p-2.5" : "p-3"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <div
              className={`${TECH_HEADER_CLASS} truncate`}
              title={label || dataKey}
            >
              {label || dataKey || "Gauge"}
            </div>

            {!tiny && unit && (
              <div className={`mt-0.5 text-[10px] ${TECH_MUTED_CLASS}`}>
                Range {min}–{max} {unit}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex min-h-0 flex-1 items-center justify-center"
          role="img"
          aria-label={`${label || dataKey || "Gauge"}: ${formattedValue}${
            unit ? ` ${unit}` : ""
          }`}
        >
          {style === "segmented"
            ? renderSegmented()
            : renderClassic()}
        </div>
      </div>
    </div>
  );
}

import { useRef } from "react";
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
  warning: 70,
  danger: 90,
};

export default function LinearGaugeWidget({
  value = 0,
  label = "Value",
  dataKey = "",
  rangeConfig,
}) {
  const rootRef = useRef(null);
  const { tiny, compact, wide } = useWidgetSize(rootRef);
  const config = { ...DEFAULT_RANGE_CONFIG, ...(rangeConfig || {}) };

  const min = toFiniteNumber(config.min, 0);
  const configuredMax = toFiniteNumber(config.max, 100);
  const max = configuredMax > min ? configuredMax : min + 1;
  const warning = toFiniteNumber(config.warning, min + (max - min) * 0.7);
  const danger = toFiniteNumber(config.danger, min + (max - min) * 0.9);
  const unit = String(config.unit || "").trim();
  const numericValue = toFiniteNumber(value, min);

  const percentage = clamp(((numericValue - min) / (max - min)) * 100, 0, 100);
  const warningPercent = clamp(((warning - min) / (max - min)) * 100, 0, 100);
  const dangerPercent = clamp(((danger - min) / (max - min)) * 100, 0, 100);

  const status =
    numericValue >= danger
      ? "critical"
      : numericValue >= warning
      ? "warning"
      : "normal";

  const statusMeta = {
    normal: { label: "Normal", color: TECH_ACCENT.lime, text: "text-cyan-700 dark:text-[#58D7FF]" },
    warning: { label: "Warning", color: "#D99D30", text: "text-amber-600 dark:text-amber-300" },
    critical: { label: "Critical", color: TECH_ACCENT.plum, text: "text-[#8c365f] dark:text-[#FF9AAE]" },
  }[status];

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${tiny ? "p-3" : "p-4"}`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-3 pr-14">
          <div className="min-w-0">
            <div className={`${TECH_HEADER_CLASS} truncate`} title={label}>
              {label}
            </div>
            {!tiny && dataKey && (
              <div className={`mt-0.5 truncate text-[10px] ${TECH_MUTED_CLASS}`}>
                {dataKey}
              </div>
            )}
          </div>

          <div className={`text-[9px] font-bold uppercase tracking-[0.14em] ${statusMeta.text}`}>
            {statusMeta.label}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="flex items-end gap-2">
              <span
                className={`font-extrabold tracking-[-0.055em] text-slate-950 dark:text-slate-100 ${
                  tiny
                    ? "text-3xl"
                    : compact
                    ? "text-4xl"
                    : wide
                    ? "text-6xl"
                    : "text-5xl"
                }`}
              >
                {numericValue.toFixed(1)}
              </span>
              {unit && <span className={`pb-1 text-xs ${TECH_MUTED_CLASS}`}>{unit}</span>}
            </div>

            {!tiny && (
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Load</div>
                <div className="mt-0.5 text-sm font-bold" style={{ color: statusMeta.color }}>
                  {percentage.toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {/* Unified cyan → indigo → violet progress treatment. */}
          <div className="relative pt-4">
            <div className="relative h-3 rounded-full bg-[#E8EDF5] dark:bg-[#223253]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${TECH_ACCENT.lime}, ${TECH_ACCENT.forest}, ${TECH_ACCENT.berry})`,
                }}
              />

              <div
                className="absolute -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#D99D30]"
                style={{ left: `${warningPercent}%` }}
                title={`Warning ${warning}`}
              />
              <div
                className="absolute -top-3 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#FF6F88]"
                style={{ left: `${dangerPercent}%` }}
                title={`Danger ${danger}`}
              />
            </div>

            {!tiny && (
              <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
                <span>{min}</span>
                <span>{warning}</span>
                <span>{danger}</span>
                <span>{max}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

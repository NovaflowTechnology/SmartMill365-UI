import { useRef } from "react";
import {
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
  warning: "",
  danger: "",
};

const hasThresholdValue = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "";

const formatValue = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return "—";

  if (Number.isInteger(numeric)) {
    return numeric.toLocaleString();
  }

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
};

export default function LinearGaugeWidget({
  value = 0,
  label = "Value",
  dataKey = "",
  rangeConfig,
  display = {},
}) {
  const rootRef = useRef(null);
  const { tiny, compact, wide } = useWidgetSize(rootRef);

  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(rangeConfig || {}),
  };

  const min = toFiniteNumber(config.min, 0);
  const configuredMax = toFiniteNumber(config.max, 100);
  const max = configuredMax > min ? configuredMax : min + 1;

  const numericValue = toFiniteNumber(value, min);
  const clampedValue = clamp(numericValue, min, max);
  const unit = String(config.unit || "").trim();

  const percentage = clamp(
    ((clampedValue - min) / (max - min)) * 100,
    0,
    100
  );

  const hasWarning = hasThresholdValue(config.warning);
  const hasDanger = hasThresholdValue(config.danger);

  const warning = hasWarning
    ? clamp(toFiniteNumber(config.warning, min), min, max)
    : null;

  const danger = hasDanger
    ? clamp(toFiniteNumber(config.danger, max), min, max)
    : null;

  const warningPercent =
    warning === null
      ? null
      : clamp(((warning - min) / (max - min)) * 100, 0, 100);

  const dangerPercent =
    danger === null
      ? null
      : clamp(((danger - min) / (max - min)) * 100, 0, 100);

  const status =
    danger !== null && numericValue >= danger
      ? "danger"
      : warning !== null && numericValue >= warning
      ? "warning"
      : "normal";

  const statusMeta = {
    normal: {
      marker: "#3B82F6",
      fillStart: "#2563EB",
      fillEnd: "#4F46E5",
      text: "text-blue-600 dark:text-blue-300",
    },
    warning: {
      marker: "#F59E0B",
      fillStart: "#D97706",
      fillEnd: "#F59E0B",
      text: "text-amber-600 dark:text-amber-300",
    },
    danger: {
      marker: "#F43F5E",
      fillStart: "#E11D48",
      fillEnd: "#F43F5E",
      text: "text-rose-600 dark:text-rose-300",
    },
  }[status];

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
      "#3B82F6"
    ),
    warning: resolveColor(
      display?.warningColor,
      "#F59E0B"
    ),
    danger: resolveColor(
      display?.dangerColor,
      "#F43F5E"
    ),
  };

  const selectedStatusColor =
    customStatusColors[status];

  const visualMeta =
    display?.colorMode === "custom"
      ? {
          ...statusMeta,
          marker:
            selectedStatusColor,
          fillStart:
            selectedStatusColor,
          fillEnd:
            selectedStatusColor,
        }
      : statusMeta;

  const markerVisualPercent = clamp(percentage, 2, 98);
  const currentLabelPercent = clamp(percentage, 10, 90);

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny
          ? "p-3 pb-2"
          : compact
          ? "p-4 pb-2.5"
          : "p-5 pb-3"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* Header */}
        <div className="shrink-0">
          <div className="min-w-0">
            <div
              className={`${TECH_HEADER_CLASS} truncate ${
                wide && !compact ? "text-base" : ""
              }`}
              title={label}
            >
              {label}
            </div>

            {!tiny && dataKey && !String(label || "").trim() && (
              <div
                className={`mt-0.5 truncate text-[10px] ${TECH_MUTED_CLASS}`}
                title={dataKey}
              >
                {dataKey}
              </div>
            )}
          </div>
        </div>

        {/* Gauge area */}
        <div className="flex min-h-0 flex-1 items-center">
          <div className="w-full">
            <div className="relative px-1 pb-9 pt-4">
              {/* Main neutral range track */}
              <div className="relative h-3 rounded-full bg-slate-100 shadow-inner dark:bg-slate-700/80">
                {/* Active range */}
                <div
                  className="absolute inset-y-0 left-0 rounded-l-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${percentage}%`,
                    minWidth: percentage > 0 ? "6px" : "0px",
                    background: `linear-gradient(90deg, ${visualMeta.fillStart}, ${visualMeta.fillEnd})`,
                    clipPath:
                      percentage > 3
                        ? "polygon(0 28%, 100% 0, 100% 100%, 0 72%)"
                        : undefined,
                  }}
                />

                {/* Minimum reference dot */}
                <div className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-sm dark:border-slate-900" />

                {/* Threshold markers */}
                {warningPercent !== null && (
                  <div
                    className="absolute -top-2 h-2.5 w-[2px] -translate-x-1/2 rounded-full bg-amber-400"
                    style={{ left: `${warningPercent}%` }}
                    title={`Warning ${formatValue(warning)}${
                      unit ? ` ${unit}` : ""
                    }`}
                  />
                )}

                {dangerPercent !== null && (
                  <div
                    className="absolute -top-2 h-2.5 w-[2px] -translate-x-1/2 rounded-full bg-rose-500"
                    style={{ left: `${dangerPercent}%` }}
                    title={`Danger ${formatValue(danger)}${
                      unit ? ` ${unit}` : ""
                    }`}
                  />
                )}

                {/* Current-value marker */}
                <div
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
                  style={{ left: `${markerVisualPercent}%` }}
                >
                  <div
                    className={`rounded-full border-[4px] border-white shadow-[0_2px_8px_rgba(15,23,42,0.22)] dark:border-slate-900 ${
                      tiny ? "h-5 w-5" : compact ? "h-6 w-6" : "h-7 w-7"
                    }`}
                    style={{ backgroundColor: visualMeta.marker }}
                  />
                </div>
              </div>

              {/* Scale labels directly under the gauge */}
              <div className="absolute inset-x-1 bottom-0 h-7 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                <span className="absolute left-0 top-1 whitespace-nowrap">
                  {formatValue(min)}
                  {unit && !tiny ? ` ${unit}` : ""}
                </span>

                <span
                  className={`absolute top-0 -translate-x-1/2 whitespace-nowrap font-extrabold ${statusMeta.text} ${
                    tiny ? "text-[10px]" : "text-xs"
                  }`}
                  style={{ left: `${currentLabelPercent}%` }}
                >
                  {formatValue(numericValue)}
                  {unit ? ` ${unit}` : ""}
                </span>

                <span className="absolute right-0 top-1 whitespace-nowrap">
                  {formatValue(max)}
                  {unit && !tiny ? ` ${unit}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Threshold legend pinned to the bottom */}
        {!tiny && (warning !== null || danger !== null) && (
          <div className="relative top-1 shrink-0 pt-2">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[9px] text-slate-400 dark:text-slate-500">
              {warning !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Warning {formatValue(warning)}
                  {unit ? ` ${unit}` : ""}
                </span>
              )}

              {danger !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Danger {formatValue(danger)}
                  {unit ? ` ${unit}` : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

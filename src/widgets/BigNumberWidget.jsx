import { useEffect, useMemo, useRef } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import {
  TECH_SURFACE_CLASS,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TechBackdrop,
  clamp,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_DISPLAY = {
  mode: "number",
  style: "tech",
  showLabel: true,
  showUnit: true,
  showTrend: true,
  showRawValue: false,
  showProgress: true,
  decimals: 1,
  unit: "",
  alignment: "left",
  valueSize: "large",
  valueColor: "default",
  trendThreshold: null,

  // Combined Stat + Machine Status
  statusDataKey: "",
  statusLabel: "Machine Status",
  statusSource: "mapping",

  mappings: [
    { value: 0, text: "OFF", color: "red" },
    { value: 1, text: "MANUAL", color: "amber" },
    { value: 2, text: "AUTO", color: "cyan" },
    { value: 3, text: "MANUAL INLET", color: "purple" },
  ],

  fallbackText: "",
  fallbackColor: "default",
};

const alignmentClasses = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const statusTone = {
  default: {
    text: "text-slate-700 dark:text-slate-200",
    badge:
      "border-slate-300/70 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/80",
    dot: "bg-slate-400",
  },
  cyan: {
    text: "text-cyan-700 dark:text-cyan-300",
    badge:
      "border-cyan-300/60 bg-cyan-100/70 dark:border-cyan-500/30 dark:bg-cyan-500/10",
    dot: "bg-cyan-400",
  },
  green: {
    text: "text-emerald-700 dark:text-emerald-300",
    badge:
      "border-emerald-300/60 bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
  blue: {
    text: "text-blue-700 dark:text-blue-300",
    badge:
      "border-blue-300/60 bg-blue-100/70 dark:border-blue-500/30 dark:bg-blue-500/10",
    dot: "bg-blue-400",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    badge:
      "border-amber-300/60 bg-amber-100/70 dark:border-amber-500/30 dark:bg-amber-500/10",
    dot: "bg-amber-400",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    badge:
      "border-orange-300/60 bg-orange-100/70 dark:border-orange-500/30 dark:bg-orange-500/10",
    dot: "bg-orange-400",
  },
  red: {
    text: "text-rose-700 dark:text-rose-300",
    badge:
      "border-rose-300/60 bg-rose-100/70 dark:border-rose-500/30 dark:bg-rose-500/10",
    dot: "bg-rose-400",
  },
  purple: {
    text: "text-violet-700 dark:text-violet-300",
    badge:
      "border-violet-300/60 bg-violet-100/70 dark:border-violet-500/30 dark:bg-violet-500/10",
    dot: "bg-violet-400",
  },
  gray: {
    text: "text-slate-600 dark:text-slate-300",
    badge:
      "border-slate-300/60 bg-slate-100/70 dark:border-slate-600 dark:bg-slate-800/80",
    dot: "bg-slate-400",
  },
};

const normaliseComparableValue = (value) => {
  if (value === null || value === undefined) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? numeric
    : String(value).trim();
};

const findMapping = (mappings, value) => {
  const current = normaliseComparableValue(value);
  return mappings.find(
    (mapping) =>
      String(normaliseComparableValue(mapping?.value)) ===
      String(current)
  );
};

export default function BigNumberWidget({
  value = 0,
  statusValue,
  label = "Value",
  dataKey = "",
  display = {},
  rangeConfig = null,
}) {
  const rootRef = useRef(null);
  const { tiny, compact, wide } = useWidgetSize(rootRef);

  const settings = {
    ...DEFAULT_DISPLAY,
    ...(display || {}),
    mappings: Array.isArray(display?.mappings)
      ? display.mappings
      : DEFAULT_DISPLAY.mappings,
  };

  const config = {
    min: 0,
    max: 100,
    unit: "",
    warning: 80,
    danger: 90,
    ...(rangeConfig || {}),
  };

  const numericValue = toFiniteNumber(value, 0);
  const previousValueRef = useRef(numericValue);
  const previousValue = previousValueRef.current;

  const min = toFiniteNumber(config.min, 0);
  const configuredMax = toFiniteNumber(config.max, 100);
  const max = configuredMax > min
    ? configuredMax
    : min + 1;

  const warning = toFiniteNumber(
    config.warning,
    min + (max - min) * 0.8
  );
  const danger = toFiniteNumber(
    config.danger,
    min + (max - min) * 0.9
  );

  const automaticThreshold =
    Math.abs(max - min) > 0
      ? Math.abs(max - min) * 0.02
      : 0.5;

  const trendThreshold =
    settings.trendThreshold === null ||
    settings.trendThreshold === undefined ||
    settings.trendThreshold === ""
      ? automaticThreshold
      : Math.max(
          0,
          toFiniteNumber(
            settings.trendThreshold,
            automaticThreshold
          )
        );

  const trend = useMemo(() => {
    const difference =
      numericValue - previousValue;

    if (Math.abs(difference) <= trendThreshold) {
      return "stable";
    }

    return difference > 0 ? "up" : "down";
  }, [
    numericValue,
    previousValue,
    trendThreshold,
  ]);

  useEffect(() => {
    previousValueRef.current = numericValue;
  }, [numericValue]);

  const decimals = Math.min(
    6,
    Math.max(
      0,
      Math.round(
        toFiniteNumber(settings.decimals, 1)
      )
    )
  );

  const formattedValue =
    numericValue.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const unit =
    settings.unit?.trim() ||
    String(config.unit || "").trim();

  const percentage =
    clamp(
      (numericValue - min) /
        (max - min),
      0,
      1
    ) * 100;

  const mappedSourceValue =
    settings.mode === "combined" &&
    statusValue !== undefined
      ? statusValue
      : value;

  const activeMapping = findMapping(
    settings.mappings,
    mappedSourceValue
  );

  let thresholdStatus = {
    text: "NORMAL",
    color: "cyan",
  };

  if (numericValue >= danger) {
    thresholdStatus = {
      text: "CRITICAL",
      color: "red",
    };
  } else if (numericValue >= warning) {
    thresholdStatus = {
      text: "WARNING",
      color: "amber",
    };
  }

  const mappedStatus = {
    text:
      activeMapping?.text?.trim() ||
      settings.fallbackText?.trim() ||
      String(mappedSourceValue ?? "—"),
    color:
      activeMapping?.color ||
      settings.fallbackColor ||
      "default",
  };

  const currentStatus =
    settings.statusSource === "threshold"
      ? thresholdStatus
      : mappedStatus;

  const statusClass =
    statusTone[currentStatus.color] ||
    statusTone.default;

  const alignmentClass =
    alignmentClasses[settings.alignment] ||
    alignmentClasses.left;

  const sizeClass = tiny
    ? "text-3xl"
    : compact
    ? "text-4xl"
    : wide
    ? "text-6xl xl:text-7xl"
    : "text-5xl";

  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
      ? ArrowDownRight
      : Minus;

  const trendLabel =
    trend === "up"
      ? "Rising"
      : trend === "down"
      ? "Falling"
      : "Stable";

  const renderStatus = () => (
    <div
      className={`
        inline-flex max-w-full items-center gap-2
        rounded-full border px-3 py-1.5
        ${statusClass.badge}
      `}
      title={currentStatus.text}
    >
      <span
        className={`
          h-2 w-2 shrink-0 rounded-full
          ${statusClass.dot}
          shadow-[0_0_10px_currentColor]
        `}
      />
      <span
        className={`
          truncate text-[11px] font-semibold
          uppercase tracking-[0.12em]
          ${statusClass.text}
        `}
      >
        {currentStatus.text}
      </span>
    </div>
  );

  if (settings.mode === "valueMapping") {
    return (
      <div
        ref={rootRef}
        className={`${TECH_SURFACE_CLASS} p-4`}
      >
        <TechBackdrop />

        <div
          className={`
            relative z-10 flex h-full flex-col
            justify-between gap-3
            ${alignmentClass}
          `}
        >
          {settings.showLabel && (
            <div className={TECH_HEADER_CLASS}>
              {label}
            </div>
          )}

          <div className="flex min-h-0 flex-1 items-center">
            <div
              className={`
                max-w-full break-words font-semibold
                tracking-tight
                ${
                  tiny
                    ? "text-xl"
                    : compact
                    ? "text-2xl"
                    : "text-3xl xl:text-4xl"
                }
                ${statusClass.text}
              `}
            >
              {currentStatus.text}
            </div>
          </div>

          {settings.showRawValue && (
            <div
              className={`text-xs ${TECH_MUTED_CLASS}`}
            >
              Raw value: {String(value ?? "—")}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-3" : "p-4"
      }`}
    >
      <TechBackdrop />

      <div
        className={`
          relative z-10 flex h-full flex-col
          ${alignmentClass}
        `}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <div className="min-w-0">
            {settings.showLabel && (
              <div
                className={`${TECH_HEADER_CLASS} truncate`}
                title={label}
              >
                {label}
              </div>
            )}

            {!tiny && (
              <div
                className={`
                  mt-1 text-[10px] font-medium
                  ${TECH_MUTED_CLASS}
                `}
              >
                {dataKey || "Live metric"}
              </div>
            )}
          </div>

          {settings.mode === "combined" &&
            renderStatus()}
        </div>

        <div className="flex min-h-0 flex-1 items-center">
          <div className="w-full">
            <div
              className={`
                flex max-w-full items-baseline gap-2
                bg-gradient-to-r
                from-cyan-600 via-blue-600 to-violet-600
                bg-clip-text font-semibold
                tracking-[-0.04em] text-transparent
                dark:from-cyan-300 dark:via-blue-300
                dark:to-violet-300
                ${sizeClass}
              `}
            >
              <span className="truncate">
                {formattedValue}
              </span>

              {settings.showUnit &&
                unit && (
                  <span
                    className="
                      shrink-0 text-sm font-medium
                      tracking-normal
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    {unit}
                  </span>
                )}
            </div>

            {settings.showTrend && !tiny && (
              <div
                className="
                  mt-2 inline-flex items-center gap-1.5
                  text-xs text-slate-500
                  dark:text-slate-400
                "
              >
                <TrendIcon
                  size={14}
                  className={
                    trend === "up"
                      ? "text-cyan-500"
                      : trend === "down"
                      ? "text-violet-500"
                      : "text-slate-400"
                  }
                />
                {trendLabel}
              </div>
            )}

            {settings.mode === "combined" &&
              !tiny && (
                <div className="mt-3 flex items-center gap-2">
                  <Activity
                    size={13}
                    className="text-cyan-500"
                  />
                  <span
                    className={`text-xs ${TECH_MUTED_CLASS}`}
                  >
                    {settings.statusLabel ||
                      "Machine Status"}
                  </span>
                </div>
              )}
          </div>
        </div>

        {settings.showProgress && !tiny && (
          <div className="w-full">
            <div
              className="
                mb-1.5 flex items-center
                justify-between text-[10px]
                text-slate-400
              "
            >
              <span>{min}</span>
              <span>{max}</span>
            </div>

            <div
              className="
                h-1.5 overflow-hidden rounded-full
                bg-slate-200/80 dark:bg-slate-700/70
              "
            >
              <div
                className="
                  h-full rounded-full
                  bg-gradient-to-r
                  from-cyan-400 via-blue-500 to-violet-500
                  transition-[width] duration-500
                "
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

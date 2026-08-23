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

const alignmentJustifyClasses = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const statusTone = {
  default: {
    text: "text-slate-700 dark:text-slate-200",
    badge:
      "border-slate-300/70 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/80",
    dot: "bg-slate-400",
  },
  cyan: {
    text: "text-[#638f2d] dark:text-[#A4C65A]",
    badge:
      "border-[#A4C65A]/40 bg-[#A4C65A]/10 dark:border-[#A4C65A]/30 dark:bg-[#A4C65A]/10",
    dot: "bg-[#7CB342]",
  },
  green: {
    text: "text-[#4f7c25] dark:text-[#A4C65A]",
    badge:
      "border-[#7CB342]/35 bg-[#7CB342]/10 dark:border-[#7CB342]/30 dark:bg-[#7CB342]/10",
    dot: "bg-[#7CB342]",
  },
  blue: {
    text: "text-[#2E7D32] dark:text-[#8FCB75]",
    badge:
      "border-[#2E7D32]/30 bg-[#2E7D32]/10 dark:border-[#2E7D32]/40 dark:bg-[#2E7D32]/10",
    dot: "bg-[#2E7D32]",
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
    text: "text-[#6D254D] dark:text-[#D989A7]",
    badge:
      "border-[#6D254D]/25 bg-[#6D254D]/10 dark:border-[#B65C7A]/30 dark:bg-[#6D254D]/10",
    dot: "bg-[#6D254D]",
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
    settings.mode === "combined"
      ? statusValue
      : value;

  const activeMapping = findMapping(
    settings.mappings,
    mappedSourceValue
  );

  let thresholdStatus = {
    text: "NORMAL",
    color: "green",
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
      (settings.mode === "combined" &&
      mappedSourceValue === undefined
        ? "NO STATUS DATA"
        : String(mappedSourceValue ?? "—")),
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

  const alignmentJustifyClass =
    alignmentJustifyClasses[
      settings.alignment
    ] ||
    alignmentJustifyClasses.left;

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
            <div className={`${TECH_HEADER_CLASS} pr-14`}>
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
        <div className="flex w-full items-start pr-14">
          <div className="min-w-0">
            {settings.showLabel && (
              <div
                className={`${TECH_HEADER_CLASS} truncate`}
                title={label}
              >
                {label}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center">
          <div
            className={`
              w-full px-0.5
              ${
                settings.alignment === "center"
                  ? "text-center"
                  : settings.alignment === "right"
                  ? "text-right"
                  : "text-left"
              }
            `}
          >
            <div
              className={`
                flex w-full max-w-full
                items-baseline gap-2
                ${alignmentJustifyClass}
                font-extrabold tracking-[-0.045em]
                text-slate-950 dark:text-slate-100
                ${sizeClass}
              `}
            >
              <span
                className="
                  min-w-0 whitespace-nowrap
                  px-1 tabular-nums
                  overflow-visible
                "
              >
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
                className={`
                  mt-2 flex w-full
                  items-center gap-1.5
                  ${alignmentJustifyClass}
                  text-xs text-slate-500
                  dark:text-slate-400
                `}
              >
                <TrendIcon
                  size={14}
                  className={
                    trend === "up"
                      ? "text-[#7CB342]"
                      : trend === "down"
                      ? "text-[#6D254D]"
                      : "text-slate-400"
                  }
                />
                {trendLabel}
              </div>
            )}

            {settings.mode === "combined" &&
              !tiny && (
                <div
                  className={`
                    mt-3 flex w-full min-w-0
                    items-center gap-2
                    ${alignmentJustifyClass}
                  `}
                  title={currentStatus.text}
                >
                  <Activity
                    size={13}
                    className={
                      statusClass.text
                    }
                  />

                  <span
                    className={`
                      min-w-0 truncate
                      text-xs font-semibold
                      ${statusClass.text}
                    `}
                  >
                    {currentStatus.text}
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
                  from-[#A4C65A] via-[#7CB342] to-[#2E7D32]
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

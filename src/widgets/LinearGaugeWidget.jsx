import { useRef } from "react";
import {
  Activity,
  AlertTriangle,
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
  const { tiny, compact, wide } =
    useWidgetSize(rootRef);

  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(rangeConfig || {}),
  };

  const min = toFiniteNumber(config.min, 0);
  const configuredMax =
    toFiniteNumber(config.max, 100);
  const max =
    configuredMax > min
      ? configuredMax
      : min + 1;

  const warning =
    toFiniteNumber(
      config.warning,
      min + (max - min) * 0.7
    );

  const danger =
    toFiniteNumber(
      config.danger,
      min + (max - min) * 0.9
    );

  const unit =
    String(config.unit || "").trim();

  const numericValue =
    toFiniteNumber(value, min);

  const percentage =
    clamp(
      ((numericValue - min) /
        (max - min)) *
        100,
      0,
      100
    );

  const warningPercent =
    clamp(
      ((warning - min) /
        (max - min)) *
        100,
      0,
      100
    );

  const dangerPercent =
    clamp(
      ((danger - min) /
        (max - min)) *
        100,
      0,
      100
    );

  const status =
    numericValue >= danger
      ? "critical"
      : numericValue >= warning
      ? "warning"
      : "normal";

  const statusText =
    status === "critical"
      ? "Critical"
      : status === "warning"
      ? "Warning"
      : "Normal";

  const valueClass =
    status === "critical"
      ? "text-rose-500 dark:text-rose-300"
      : status === "warning"
      ? "text-amber-500 dark:text-amber-300"
      : "text-cyan-600 dark:text-cyan-300";

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-3" : "p-4"
      }`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`${TECH_HEADER_CLASS} truncate`}
              title={label}
            >
              {label}
            </div>

            {!tiny && dataKey && (
              <div
                className={`mt-1 truncate text-[10px] ${TECH_MUTED_CLASS}`}
              >
                {dataKey}
              </div>
            )}
          </div>

          <div
            className={`
              flex items-center gap-1.5
              rounded-full border px-2.5 py-1
              text-[10px] font-semibold
              uppercase tracking-[0.12em]
              ${
                status === "critical"
                  ? "border-rose-300/60 bg-rose-100/60 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  : status === "warning"
                  ? "border-amber-300/60 bg-amber-100/60 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-cyan-300/60 bg-cyan-100/60 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
              }
            `}
          >
            {status === "normal" ? (
              <Activity size={12} />
            ) : (
              <AlertTriangle size={12} />
            )}
            {statusText}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="flex items-end justify-between gap-4">
            <div
              className={`
                font-semibold tracking-[-0.04em]
                ${valueClass}
                ${
                  tiny
                    ? "text-3xl"
                    : compact
                    ? "text-4xl"
                    : wide
                    ? "text-6xl"
                    : "text-5xl"
                }
              `}
            >
              {numericValue.toFixed(1)}
            </div>

            {unit && (
              <div
                className={`pb-1 text-xs ${TECH_MUTED_CLASS}`}
              >
                {unit}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div
              className="
                relative h-2.5 overflow-hidden
                rounded-full
                bg-slate-200/80
                dark:bg-slate-700/70
              "
            >
              <div
                className="
                  h-full rounded-full
                  bg-gradient-to-r
                  from-cyan-400 via-blue-500
                  to-violet-500
                  transition-[width] duration-500
                "
                style={{
                  width: `${percentage}%`,
                }}
              />

              <span
                className="
                  absolute inset-y-0 w-px
                  bg-amber-400/80
                "
                style={{
                  left: `${warningPercent}%`,
                }}
              />

              <span
                className="
                  absolute inset-y-0 w-px
                  bg-rose-400/90
                "
                style={{
                  left: `${dangerPercent}%`,
                }}
              />
            </div>

            {!tiny && (
              <div
                className="
                  mt-2 flex items-center
                  justify-between text-[10px]
                  text-slate-400
                "
              >
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

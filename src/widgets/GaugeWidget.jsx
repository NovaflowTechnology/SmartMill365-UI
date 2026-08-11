import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Gauge as GaugeIcon,
  TrendingDown,
  TrendingUp,
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

const DEFAULT_RANGE_CONFIG = {
  min: 0,
  max: 100,
  unit: "",
  warning: 80,
  danger: 90,
};

export default function GaugeWidget({
  value = 0,
  label = "",
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
      min + (max - min) * 0.8
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

  const clampedValue =
    clamp(numericValue, min, max);

  const [displayValue, setDisplayValue] =
    useState(clampedValue);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDisplayValue((previous) => {
        const next =
          previous +
          (clampedValue - previous) * 0.14;

        return Math.abs(clampedValue - next) <
          0.01
          ? clampedValue
          : next;
      });
    }, 20);

    return () =>
      window.clearInterval(interval);
  }, [clampedValue]);

  const previousValueRef =
    useRef(numericValue);

  const trend =
    numericValue >
    previousValueRef.current
      ? "up"
      : numericValue <
        previousValueRef.current
      ? "down"
      : "stable";

  useEffect(() => {
    previousValueRef.current = numericValue;
  }, [numericValue]);

  const percentage =
    clamp(
      (displayValue - min) /
        (max - min),
      0,
      1
    );

  const angle =
    percentage * 180 - 90;

  const generatedId =
    useId().replace(/:/g, "");

  const gradientId =
    `gauge-tech-${generatedId}`;

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

  const statusClass =
    status === "critical"
      ? "text-rose-500 dark:text-rose-300"
      : status === "warning"
      ? "text-amber-500 dark:text-amber-300"
      : "text-cyan-600 dark:text-cyan-300";

  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
      ? TrendingDown
      : Minus;

  const svgWidth = tiny
    ? 150
    : compact
    ? 180
    : wide
    ? 250
    : 215;

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-3" : "p-4"
      }`}
    >
      <TechBackdrop />

      <div
        className="
          relative z-10 flex h-full
          flex-col
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`${TECH_HEADER_CLASS} truncate`}
              title={label}
            >
              {label || "Gauge"}
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
            className="
              rounded-xl border
              border-cyan-200/80
              bg-cyan-100/60 p-2
              text-cyan-600
              dark:border-cyan-500/20
              dark:bg-cyan-500/10
              dark:text-cyan-300
            "
          >
            <GaugeIcon size={tiny ? 15 : 17} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="relative"
            style={{
              width: `${svgWidth}px`,
              maxWidth: "100%",
            }}
          >
            <svg
              viewBox="0 0 220 130"
              className="h-auto w-full overflow-visible"
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0%"
                  x2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor="#22d3ee"
                  />
                  <stop
                    offset="58%"
                    stopColor="#3b82f6"
                  />
                  <stop
                    offset="80%"
                    stopColor="#f59e0b"
                  />
                  <stop
                    offset="100%"
                    stopColor="#f43f5e"
                  />
                </linearGradient>
              </defs>

              <path
                d="M 25 110 A 85 85 0 0 1 195 110"
                fill="none"
                stroke="rgba(100,116,139,0.18)"
                strokeWidth="12"
                strokeLinecap="round"
              />

              <path
                d="M 25 110 A 85 85 0 0 1 195 110"
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="12"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${percentage * 100} 100`}
                className="transition-all duration-500"
              />

              <g
                transform={`rotate(${angle} 110 110)`}
                className="transition-transform duration-300"
              >
                <line
                  x1="110"
                  y1="110"
                  x2="110"
                  y2="43"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>

              <circle
                cx="110"
                cy="110"
                r="8"
                fill="#0f172a"
                stroke="#67e8f9"
                strokeWidth="3"
              />
            </svg>

            <div
              className="
                pointer-events-none absolute
                inset-x-0 bottom-0
                flex flex-col items-center
              "
            >
              <div
                className={`
                  font-semibold tracking-[-0.04em]
                  text-slate-900 dark:text-white
                  ${
                    tiny
                      ? "text-2xl"
                      : compact
                      ? "text-3xl"
                      : "text-4xl"
                  }
                `}
              >
                {displayValue.toFixed(1)}
              </div>

              {unit && (
                <div
                  className={`mt-1 text-xs ${TECH_MUTED_CLASS}`}
                >
                  {unit}
                </div>
              )}
            </div>
          </div>
        </div>

        {!tiny && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`
                  h-2 w-2 rounded-full
                  ${
                    status === "critical"
                      ? "bg-rose-400"
                      : status === "warning"
                      ? "bg-amber-400"
                      : "bg-cyan-400"
                  }
                `}
              />
              <span
                className={`text-xs font-medium ${statusClass}`}
              >
                {statusText}
              </span>
            </div>

            <div
              className={`flex items-center gap-1 text-xs ${TECH_MUTED_CLASS}`}
            >
              <TrendIcon size={13} />
              <span>
                {min}–{max}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

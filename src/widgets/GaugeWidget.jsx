import { useEffect, useState, useRef, useId } from "react";
import { dataRanges } from "../data/dataRanges";

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

  return Number.isFinite(number)
    ? number
    : fallback;
};

export default function GaugeWidget({
  value = 50,
  label = "",
  dataKey = "",
  rangeConfig,
}) {
  /*
   * CONFIGURATION PRIORITY:
   *
   * 1. Default range
   * 2. dataRanges.js preset
   * 3. Custom range saved in TemplateDesigner
   */
  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(dataRanges[dataKey] || {}),
    ...(rangeConfig || {}),
  };

  const min = toNumber(config.min, 0);

  const configuredMax = toNumber(
    config.max,
    100
  );

  // Prevent division by zero.
  const max =
    configuredMax > min
      ? configuredMax
      : min + 1;

  const unit =
    config.unit || "";

  const numericValue = toNumber(
    value,
    min
  );

  const clampedValue = clamp(
    numericValue,
    min,
    max
  );

  // SMOOTH ANIMATION
  const [displayValue, setDisplayValue] =
    useState(clampedValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue((previous) => {
        const next =
          previous +
          (clampedValue - previous) * 0.1;

        /*
         * Stop producing extremely small updates
         * when the displayed value is close enough.
         */
        if (
          Math.abs(clampedValue - next) <
          0.01
        ) {
          return clampedValue;
        }

        return next;
      });
    }, 20);

    return () => {
      clearInterval(interval);
    };
  }, [clampedValue]);

  // TREND
  const previousValue =
    useRef(numericValue);

  const trend =
    numericValue > previousValue.current
      ? "up"
      : numericValue <
        previousValue.current
      ? "down"
      : "stable";

  useEffect(() => {
    previousValue.current =
      numericValue;
  }, [numericValue]);

  // GAUGE POSITION
  const percent = clamp(
    (displayValue - min) /
      (max - min),
    0,
    1
  );

  const angle =
    percent * 180 - 90;

  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
      ? "text-red-500"
      : "text-gray-400";

  /*
   * Unique gradient ID prevents multiple gauges
   * from interfering with one another.
   */
  const generatedId = useId();

  const gradientId =
    `gaugeGradient-${generatedId.replace(
      /:/g,
      ""
    )}`;

  return (
    <div
      className="
        flex flex-col
        items-center justify-center
        h-full w-full
      "
    >
      {/* LABEL */}
      <div
        className="
          text-sm
          text-gray-500
          dark:text-gray-400
          mb-2
        "
      >
        {label}
      </div>

      {/* GAUGE */}
      <div
        className="
          relative
          w-56 h-32
        "
      >
        <svg
          viewBox="0 0 200 120"
          className="w-full h-full"
        >
          <defs>
            <linearGradient
              id={gradientId}
            >
              <stop
                offset="0%"
                stopColor="#22c55e"
              />

              <stop
                offset="50%"
                stopColor="#f59e0b"
              />

              <stop
                offset="100%"
                stopColor="#ef4444"
              />
            </linearGradient>
          </defs>

          {/* ARC */}
          <path
            d="
              M 20 100
              A 80 80 0 0 1 180 100
            "
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="12"
          />

          {/* NEEDLE */}
          <g
            transform={`
              rotate(${angle} 100 100)
            `}
            className="
              text-gray-900
              dark:text-white
            "
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* CENTER */}
          <circle
            cx="100"
            cy="100"
            r="5"
            fill="currentColor"
            className="
              text-gray-900
              dark:text-white
            "
          />
        </svg>
      </div>

      {/* VALUE */}
      <div
        className="
          flex items-center
          gap-2 mt-2
        "
      >
        <div
          className="
            text-2xl font-bold
            text-gray-900
            dark:text-white
          "
        >
          {displayValue.toFixed(1)}
        </div>

        {unit && (
          <div
            className="
              text-sm
              text-gray-500
              dark:text-gray-400
            "
          >
            {unit}
          </div>
        )}

        <div
          className={`
            text-lg
            ${trendColor}
          `}
        >
          {trend === "up" && "↑"}

          {trend === "down" && "↓"}
        </div>
      </div>

      {/* RANGE */}
      <div
        className="
          text-xs
          text-gray-400
          dark:text-gray-500
          mt-1
        "
      >
        {min}
        {" — "}
        {max}
      </div>
    </div>
  );
}
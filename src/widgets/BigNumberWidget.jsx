import { useEffect, useMemo, useRef } from "react";
import { dataRanges } from "../data/dataRanges";

const DEFAULT_DISPLAY = {
  style: "modern",
  showLabel: true,
  showUnit: true,
  showTrend: true,
  decimals: 1,
  unit: "",
  alignment: "center",
  valueSize: "large",
  valueColor: "default",
  trendThreshold: null,
};

const alignmentClasses = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const valueSizeClasses = {
  small: "text-3xl sm:text-4xl",
  medium: "text-4xl sm:text-5xl",
  large: "text-5xl sm:text-6xl xl:text-7xl",
  xlarge: "text-6xl sm:text-7xl xl:text-8xl",
};

const valueColorClasses = {
  default: "text-gray-900 dark:text-white",
  green: "text-emerald-500 dark:text-emerald-400",
  blue: "text-blue-500 dark:text-blue-400",
  amber: "text-amber-500 dark:text-amber-400",
  red: "text-red-500 dark:text-red-400",
};

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export default function BigNumberWidget({
  value = 0,
  label = "Value",
  dataKey = "",
  display = {},
  rangeConfig = null,
}) {
  const settings = {
    ...DEFAULT_DISPLAY,
    ...(display || {}),
  };

  const config = {
    ...(dataRanges[dataKey] || dataRanges[label] || {}),
    ...(rangeConfig || {}),
  };

  const numericValue = toFiniteNumber(value);
  const previousValueRef = useRef(numericValue);
  const previousValue = previousValueRef.current;
  const difference = Math.abs(numericValue - previousValue);

  const min = toFiniteNumber(config.min, 0);
  const max = toFiniteNumber(config.max, 100);
  const rangeSize = Math.abs(max - min);
  const automaticThreshold = rangeSize > 0 ? rangeSize * 0.02 : 0.5;

  const trendThreshold =
    settings.trendThreshold === null ||
    settings.trendThreshold === undefined ||
    settings.trendThreshold === ""
      ? automaticThreshold
      : Math.max(0, toFiniteNumber(settings.trendThreshold, automaticThreshold));

  const trend = useMemo(() => {
    if (difference <= trendThreshold) return "stable";
    return numericValue > previousValue ? "up" : "down";
  }, [difference, numericValue, previousValue, trendThreshold]);

  useEffect(() => {
    previousValueRef.current = numericValue;
  }, [numericValue]);

  const decimals = Math.min(
    6,
    Math.max(0, Math.round(toFiniteNumber(settings.decimals, 1)))
  );

  const formattedValue = numericValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const unit = settings.unit?.trim() || config.unit || "";
  const alignmentClass =
    alignmentClasses[settings.alignment] || alignmentClasses.center;
  const valueSizeClass =
    valueSizeClasses[settings.valueSize] || valueSizeClasses.large;
  const valueColorClass =
    valueColorClasses[settings.valueColor] || valueColorClasses.default;

  const trendDetails = {
    up: {
      label: "Rising",
      symbol: "▲",
      className: "text-red-500 dark:text-red-400",
    },
    down: {
      label: "Falling",
      symbol: "▼",
      className: "text-red-500 dark:text-red-400",
    },
    stable: {
      label: "Stable",
      symbol: "●",
      className: "text-emerald-500 dark:text-emerald-400",
    },
  };

  const currentTrend = trendDetails[trend] || trendDetails.stable;

  const Label = () =>
    settings.showLabel ? (
      <div
        className="mb-3 w-full truncate text-sm font-medium text-gray-500 dark:text-gray-400"
        title={label}
      >
        {label}
      </div>
    ) : null;

  const Value = ({ compact = false, light = false }) => (
    <div
      className={`flex max-w-full items-baseline gap-2 leading-none ${
        light ? "font-light" : compact ? "font-bold" : "font-black"
      } ${valueColorClass} ${valueSizeClass}`}
    >
      <span className="truncate">{formattedValue}</span>

      {settings.showUnit && unit && (
        <span
          className={`shrink-0 font-medium ${
            compact ? "text-[0.38em]" : "text-[0.4em]"
          }`}
        >
          {unit}
        </span>
      )}
    </div>
  );

  const Trend = ({ compact = false }) =>
    settings.showTrend ? (
      <div
        className={`flex items-center gap-2 font-semibold ${
          compact ? "mt-2 text-xs" : "mt-4 text-base"
        } ${currentTrend.className}`}
      >
        <span>{currentTrend.symbol}</span>
        <span>{currentTrend.label}</span>
      </div>
    ) : null;

  if (settings.style === "company") {
    return (
      <div
        className={`flex h-full w-full flex-col justify-center overflow-hidden px-4 py-3 ${alignmentClass}`}
      >
        <Label />
        <Value light />
        <Trend compact />
      </div>
    );
  }

  if (settings.style === "compact") {
    return (
      <div
        className={`flex h-full w-full flex-col justify-center overflow-hidden px-4 py-3 ${alignmentClass}`}
      >
        <Label />
        <Value compact />
        <Trend compact />
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-center overflow-hidden px-4 py-4 ${alignmentClass}`}
    >
      <Label />
      <Value />
      <Trend />
    </div>
  );
}

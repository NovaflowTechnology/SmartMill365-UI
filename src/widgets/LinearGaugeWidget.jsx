
const DEFAULT_RANGE_CONFIG = {
  min: 0,
  max: 100,
  unit: "",
  warning: 70,
  danger: 90,
};

const toNumber = (value, fallback) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

export default function LinearGaugeWidget({
  value = 0,
  label = "Value",
  dataKey = "",
  rangeConfig,
}) {
  // Runtime range/unit/threshold values come only from the
  // configuration saved with this widget in Template Designer.
  const config = {
    ...DEFAULT_RANGE_CONFIG,
    ...(rangeConfig || {}),
  };

  const min = toNumber(config.min, 0);

  const configuredMax = toNumber(
    config.max,
    100
  );

  const max =
    configuredMax > min
      ? configuredMax
      : min + 1;

  const warning = toNumber(
    config.warning,
    min + (max - min) * 0.7
  );

  const danger = toNumber(
    config.danger,
    min + (max - min) * 0.9
  );

  const unit = String(
    config.unit || ""
  ).trim();

  const numericValue = toNumber(
    value,
    min
  );

  const clampedValue = clamp(
    numericValue,
    min,
    max
  );

  const percentage =
    ((clampedValue - min) /
      (max - min)) *
    100;

  const status =
    numericValue >= danger
      ? "danger"
      : numericValue >= warning
      ? "warning"
      : "normal";

  const valueColor =
    status === "danger"
      ? "text-red-500 dark:text-red-400"
      : status === "warning"
      ? "text-amber-500 dark:text-amber-400"
      : "text-emerald-500 dark:text-emerald-400";

  const barColor =
    status === "danger"
      ? "bg-red-500"
      : status === "warning"
      ? "bg-amber-400"
      : "bg-emerald-500";

  return (
    <div
      className="
        flex h-full w-full
        flex-col justify-center
        overflow-hidden
        px-5 py-4
      "
    >
      {/* LABEL */}
      <div
        className="
          mb-3 truncate
          text-center text-sm
          font-medium
          text-gray-500
          dark:text-gray-400
        "
      >
        {label}
      </div>

      {/* VALUE */}
      <div className="mb-4 text-center">
        <div
          className={`
            text-4xl font-light
            leading-none
            ${valueColor}
          `}
        >
          {numericValue.toFixed(1)}
        </div>

        {unit && (
          <div
            className="
              mt-2 text-xs
              text-gray-500
              dark:text-gray-400
            "
          >
            {unit}
          </div>
        )}
      </div>

      {/* BAR */}
      <div
        className="
          mx-auto mb-3
          h-3 w-[75%]
          max-w-[260px]
          overflow-hidden
          rounded-full
          bg-gray-200
          dark:bg-gray-700
        "
      >
        <div
          className={`
            h-full rounded-full
            transition-all duration-500
            ${barColor}
          `}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {/* RANGE */}
      <div
        className="
          text-center text-xs
          text-gray-500
          dark:text-gray-400
        "
      >
        {min} — {max}
      </div>
    </div>
  );
}
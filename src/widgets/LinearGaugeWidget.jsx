import { dataRanges } from "../data/dataRanges";

export default function LinearGaugeWidget({
  value = 0,
  label = "Value",
  dataKey,
}) {
  const config =
    dataRanges[dataKey] || {
      min: 0,
      max: 100,
      unit: "",
      warning: 70,
      danger: 90,
    };

  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const unit = config.unit || "";

  const warning = config.warning ?? max * 0.8;
  const danger = config.danger ?? max * 0.9;

  const numericValue = Number(value) || 0;

  const percentage = Math.min(
    100,
    Math.max(
      0,
      ((numericValue - min) / (max - min)) * 100
    )
  );

  const status =
    numericValue >= danger
      ? "danger"
      : numericValue >= warning
      ? "warning"
      : "normal";

  const valueColor =
    status === "danger"
      ? "text-red-500"
      : status === "warning"
      ? "text-yellow-500"
      : "text-green-500";

  const barColor =
    status === "danger"
      ? "bg-red-500"
      : status === "warning"
      ? "bg-yellow-400"
      : "bg-green-500";

  return (
    <div
      className="
        w-full h-full
        flex flex-col
        justify-center
        rounded-2xl
        bg-white dark:bg-gray-800
        p-5
      "
    >
      {/* LABEL */}
      <div className="
        text-sm text-gray-500
        mb-2
        text-center mb-4
      ">
        {label}
      </div>

      {/* VALUE */}
      <div className="text-center mb-4">
        <div
          className={`
            text-4xl font-light
            ${valueColor}
          `}
        >
          {numericValue.toFixed(1)}
        </div>

        <div
          className="
            text-xs
            text-gray-500 dark:text-gray-400
            mt-2
          "
        >
          {unit}
        </div>
      </div>

      {/* BAR */}
        <div
        className="
            w-[75%]
            max-w-[260px]
            h-3
            mx-auto
            rounded-full
            bg-gray-200 dark:bg-gray-700
            overflow-hidden
            mb-3
        "
        >
        <div
          className={`
            h-full
            rounded-full
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
          text-center
          text-xs
          text-gray-500 dark:text-gray-400
        "
      >
        {min} — {max}
      </div>
    </div>
  );
}
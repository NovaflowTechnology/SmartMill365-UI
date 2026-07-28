import boilerImg from "../assets/Boiler.png";
import { dataOptions } from "../data/dataOptions";
import { dataRanges } from "../data/dataRanges";

export default function ImageWidget({
  valueMap = {},
  pins = [],
  image = null,
  customDataOptions = [],
}) {
  const safePins = Array.isArray(pins) ? pins : [];

  const allDataOptions = [
    ...dataOptions,
    ...(Array.isArray(customDataOptions) ? customDataOptions : []),
  ];

  const imageSrc =
    image?.croppedSrc ||
    image?.originalSrc ||
    boilerImg;

  const getStatus = (value, config) => {
    const warning = Number(config?.warning);
    const danger = Number(config?.danger);

    const hasWarning = Number.isFinite(warning);
    const hasDanger = Number.isFinite(danger);

    if (hasDanger && value >= danger) {
      return "critical";
    }

    if (hasWarning && value >= warning) {
      return "warning";
    }

    return "normal";
  };

  const statusStyles = {
    normal: {
      pin: "bg-emerald-500",
      text: "text-emerald-400",
      label: "NORMAL",
    },
    warning: {
      pin: "bg-yellow-400",
      text: "text-yellow-300",
      label: "WARNING",
    },
    critical: {
      pin: "bg-red-500",
      text: "text-red-400",
      label: "CRITICAL",
    },
  };

  return (
    <div
      className="
        relative h-full w-full overflow-hidden rounded-2xl
        bg-gray-100 dark:bg-gray-900
      "
    >
      <img
        src={imageSrc}
        alt="System process diagram"
        draggable={false}
        className="
          absolute inset-0 h-full w-full select-none object-contain
        "
      />

      <div
        className="
          absolute inset-0 z-0 pointer-events-none
          bg-black/10
        "
      />

      {safePins.map((pin, index) => {
        if (!pin?.dataKey) return null;

        const rawValue = valueMap?.[pin.dataKey];
        const numericValue = Number(rawValue);

        const value = Number.isFinite(numericValue)
          ? numericValue
          : 0;

        const dataOption = allDataOptions.find(
          (option) => option.key === pin.dataKey
        );

        const config = {
          ...(dataRanges?.[pin.dataKey] || {}),
          unit:
            dataOption?.unit ||
            dataRanges?.[pin.dataKey]?.unit ||
            "",
        };

        const status = getStatus(value, config);
        const style = statusStyles[status];

        const label = dataOption?.label || pin.dataKey;

        const x = Math.min(
          100,
          Math.max(0, Number(pin.x) || 0)
        );

        const y = Math.min(
          100,
          Math.max(0, Number(pin.y) || 0)
        );

        const formattedValue = Number.isFinite(value)
          ? value.toFixed(Number.isInteger(value) ? 0 : 1)
          : "0";

        return (
          <div
            key={pin.id || `${pin.dataKey}-${index}`}
            className="
              absolute z-20 flex flex-col items-center
              transition-all duration-300 group
            "
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {status === "critical" && (
              <div
                className={`
                  absolute h-8 w-8 rounded-full opacity-30
                  animate-ping ${style.pin}
                `}
              />
            )}

            <div
              className={`
                relative h-5 w-5 rounded-full
                border-2 border-white shadow-xl
                ${style.pin}
                ${status === "critical" ? "animate-pulse" : ""}
              `}
            />

            <div
              className="
                mt-2 min-w-[110px] max-w-[170px]
                break-words rounded-xl
                border border-white/10
                bg-black/80 px-3 py-2
                text-center text-white shadow-2xl
                backdrop-blur-md
                transition-all duration-300
                group-hover:scale-105
                pointer-events-none
              "
            >
              <div
                className="
                  mb-1 truncate text-[10px]
                  uppercase tracking-wide opacity-70
                "
              >
                {label}
              </div>

              <div className="text-sm font-bold">
                {formattedValue} {config.unit}
              </div>

              <div
                className={`
                  mt-1 text-[9px] font-semibold
                  uppercase tracking-wider ${style.text}
                `}
              >
                {style.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
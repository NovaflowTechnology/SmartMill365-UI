import boilerImg from "../assets/Boiler.png";

import { dataOptions }
  from "../data/dataOptions";

import { dataRanges }
  from "../data/dataRanges";

export default function ImageWidget({
  valueMap = {},
  pins = [],
}) {

  return (

    <div className="
      relative
      w-full h-full

      overflow-hidden

      rounded-2xl

      bg-gray-100
      dark:bg-gray-900
    ">

      {/* IMAGE */}
      <img
        src={boilerImg}
        alt="system"

        className="
          absolute inset-0

          w-full h-full

          object-cover

          select-none
        "
      />

      {/* OVERLAY */}
      <div className="
        absolute inset-0

        bg-gradient-to-t
        from-black/20
        to-transparent

        pointer-events-none

        z-0
      " />

      {/* GRID OVERLAY */}
      <div className="
        absolute inset-0

        bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]

        bg-[size:40px_40px]

        pointer-events-none

        z-0
      " />

      {/* PINS */}
      {pins.map((pin, i) => {

        //SAFE VALUE
        const value =
          Number(
            valueMap[pin.dataKey]
          ) || 0;

        const config =
          dataRanges[
            pin.dataKey
          ] || {};

        const warning =
          config.warning ?? 70;

        const danger =
          config.danger ?? 90;

        //STATUS
        const status = value >= danger? "critical": value >= warning? "warning": "normal";

        const color = status === "critical"? "bg-red-500": status === "warning"? "bg-yellow-400": "bg-green-500";

        const statusText = status === "critical"? "CRITICAL": status === "warning"? "WARNING": "NORMAL";

        const statusColor =

          status === "critical"? "text-red-400": status === "warning"? "text-yellow-300": "text-green-400";

        //CRITICAL
        const isCritical =
          status === "critical";

        //LABEL
        const label =
          dataOptions.find(
            (d) =>
              d.key ===
              pin.dataKey
          )?.label || pin.dataKey;

        return (

          <div
            key={i}

            className="
              absolute
              z-20

              flex flex-col
              items-center

              transition-all
              duration-300

              group
            "

            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              transform:
                "translate(-50%, -50%)",
            }}
          >

            {/* PULSE */}
            <div className={`
              absolute

              w-8 h-8

              rounded-full

              opacity-20

              animate-ping

              ${color}
            `} />

            {/* PIN */}
            <div
              className={`
                relative

                w-5 h-5

                rounded-full

                shadow-xl

                border-2 border-white

                ${color}

                ${isCritical
                  ? "animate-pulse"
                  : ""}
              `}
            />

            {/* TOOLTIP */}
            {pin.dataKey && (

              <div className="
                mt-2

                min-w-[100px]
                max-w-[160px]

                break-words

                text-white

                bg-black/80

                backdrop-blur-md

                px-3 py-2

                rounded-xl

                text-center

                shadow-2xl

                border border-white/10

                transition-all
                duration-300

                group-hover:scale-105

                pointer-events-none
              ">

                {/* LABEL */}
                <div className="
                  text-[10px]

                  opacity-70

                  mb-1

                  uppercase

                  tracking-wide

                  truncate
                ">

                  {label}

                </div>

                {/* VALUE */}
                <div className="
                  text-sm
                  font-bold
                ">

                  {value}

                  {" "}

                  {config.unit || ""}

                </div>

                {/* STATUS */}
                <div className={`
                  mt-1

                  text-[9px]

                  font-semibold

                  uppercase

                  tracking-wider

                  ${statusColor}
                `}>

                  {statusText}

                </div>

              </div>

            )}

          </div>

        );
      })}

    </div>
  );
}
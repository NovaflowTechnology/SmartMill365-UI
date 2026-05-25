import { useEffect, useRef } from "react";
import { dataRanges } from "../data/dataRanges";

export default function BigNumberWidget({
  value = 0,
  label = "Value",
}) {

  //RANGE CONFIG
  const config =
    dataRanges[label] || {
      unit: "",
    };

  //PREVIOUS VALUE
  const prev = useRef(value);

  //DIFFERENCE
  const diff = Math.abs(value - prev.current);

  //STABLE THRESHOLD
  const stableThreshold =config.max? config.max * 0.2: 5;

  //TREND DETECTION
  const trend =diff <= stableThreshold? "stable": value > prev.current? "up": "down";

  //UPDATE PREVIOUS VALUE
  useEffect(() => {

    prev.current = value;

  }, [value]);

  const trendColor = trend === "up"? "text-red-500": trend === "down"? "text-red-500": "text-green-400";

  return (

    <div className="
      w-full h-full
      flex flex-col
      items-center justify-center
      text-center
      relative
      overflow-hidden
    ">

      {/* LABEL */}
      <div className="
        text-sm tracking-widest
        text-gray-500 dark:text-gray-400
        mb-3 z-10
      ">
        {label}
      </div>

      {/* VALUE */}
      <div className="
        text-6xl xl:text-7xl
        font-black
        dark:text-white
        leading-none
        z-10
        flex items-end gap-2
      ">

        {Number(value).toLocaleString()}

        <span className="
          text-2xl
          text-gray-400
          mb-2
        ">
          {config.unit}
        </span>

      </div>

      {/* TREND */}
      <div className={`
        mt-4
        text-lg font-semibold
        flex items-center gap-2
        ${trendColor}
      `}>

        {trend === "up" && "▲ Rising"}

        {trend === "down" && "▼ Falling"}

        {trend === "stable" && "● Stable"}

      </div>

    </div>
  );
}
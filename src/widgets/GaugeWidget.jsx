import { useEffect, useState, useRef } from "react";
import { dataRanges } from "../data/dataRanges";

export default function GaugeWidget({
  value = 50,
  label = "",
  dataKey,
}) {

  //RANGE CONFIG
  const config =
    dataRanges[dataKey] || {
      min: 0,
      max: 100,
      unit: "",
    };

  //SMOOTH ANIMATION
  const [displayValue, setDisplayValue] =
    useState(value);

  const prevValue =
    useRef(value);

  useEffect(() => {

    const interval = setInterval(() => {

      setDisplayValue(prev =>
        prev + (value - prev) * 0.1
      );

    }, 20);

    return () =>
      clearInterval(interval);

  }, [value]);

  //TREND
  const trend =

    value > prevValue.current

      ? "up"

      : value < prevValue.current

      ? "down"

      : "stable";

  useEffect(() => {

    prevValue.current = value;

  }, [value]);


  const percent = (displayValue - config.min) / (config.max - config.min);

  const angle = percent * 180 - 90;

  const trendColor = trend === "up"? "text-green-500": trend === "down" ? "text-red-500": "text-gray-400";

  return (

    <div className="
      flex flex-col
      items-center justify-center
      h-full w-full
    ">

      {/* LABEL */}
      <div className="
        text-sm text-gray-500
        mb-2
      ">
        {label}
      </div>

      {/* GAUGE */}
      <div className="
        relative
        w-56 h-32
      ">

        <svg
          viewBox="0 0 200 120"
          className="w-full h-full"
        >

          <defs>

            <linearGradient
              id="gaugeGradient"
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
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
          />

          {/* NEEDLE */}
          <g
            transform={`
              rotate(${angle} 100 100)
            `}
          >

            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="#111"
              strokeWidth="3"
            />

          </g>

          {/* CENTER */}
          <circle
            cx="100"
            cy="100"
            r="5"
            fill="#111"
          />

        </svg>

      </div>

      {/* VALUE */}
      <div className="
        flex items-center
        gap-2 mt-2
      ">

        <div className="
          text-2xl font-bold
          dark:text-white
        ">

          {displayValue.toFixed(1)}

        </div>

        <div className="
          text-sm text-gray-500
        ">
          {config.unit}
        </div>

        <div className={`
          text-lg
          ${trendColor}
        `}>

          {trend === "up" && "↑"}

          {trend === "down" && "↓"}

        </div>

      </div>

      {/* RANGE */}
      <div className="
        text-xs text-gray-400
        mt-1
      ">

        {config.min}
        {" — "}
        {config.max}

      </div>

    </div>
  );
}
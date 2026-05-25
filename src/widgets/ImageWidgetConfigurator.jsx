import { useState } from "react";

import boilerImg from "../assets/Boiler.png";

import { dataOptions }
  from "../data/dataOptions";

export default function
ImageWidgetConfigurator({

  pins = [],

  setPins = () => {},

}) {

  // =====================================
  // DRAGGING
  // =====================================
  const [dragIndex,
    setDragIndex] =
    useState(null);

  // =====================================
  // ADD PIN
  // =====================================
  const handleClick = (e) => {

    // prevent add while dragging
    if (dragIndex !== null)
      return;

    const rect =
      e.currentTarget
        .getBoundingClientRect();

    const x =
      (
        (e.clientX - rect.left)
        / rect.width
      ) * 100;

    const y =
      (
        (e.clientY - rect.top)
        / rect.height
      ) * 100;

    setPins([
      ...pins,
      {
        x,
        y,
        dataKey: "",
        locked: false,
      },
    ]);
  };

  // =====================================
  // DRAG PIN
  // =====================================
  const handleMouseMove =
    (e) => {

    if (dragIndex === null)
      return;

    if (
      pins[dragIndex]?.locked
    ) return;

    const rect =
      e.currentTarget
        .getBoundingClientRect();

    const x =
      (
        (e.clientX - rect.left)
        / rect.width
      ) * 100;

    const y =
      (
        (e.clientY - rect.top)
        / rect.height
      ) * 100;

    const updated =
      [...pins];

    updated[dragIndex] = {
      ...updated[dragIndex],
      x,
      y,
    };

    setPins(updated);
  };

  // =====================================
  // REMOVE PIN
  // =====================================
  const removePin =
    (index) => {

    const updated =
      pins.filter(
        (_, i) => i !== index
      );

    setPins(updated);
  };

  return (

    <div
      className="
        relative
        w-full h-full

        bg-gray-100
        dark:bg-gray-900

        rounded-2xl
        overflow-hidden
      "
    >

      {/* =====================================
          IMAGE LAYER
      ===================================== */}
      <div
        className="
          absolute inset-0
          z-0
        "

        onClick={handleClick}

        onMouseMove={
          handleMouseMove
        }

        onMouseUp={() =>
          setDragIndex(null)
        }

        onMouseLeave={() =>
          setDragIndex(null)
        }
      >

        {/* IMAGE */}
        <img
          src={boilerImg}
          alt="system"

          className="
            w-full h-full
            object-cover
            select-none
          "
        />

        {/* OVERLAY */}
        <div className="
          absolute inset-0
          bg-gradient-to-t
          from-black/10
          to-transparent
          pointer-events-none
        " />

        {/* GRID */}
        <div className="
          absolute inset-0

          bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]

          bg-[size:40px_40px]

          pointer-events-none
        " />

      </div>

      {/* =====================================
          INFO
      ===================================== */}
      <div className="
        absolute top-4 left-4
        z-30

        bg-black/70
        backdrop-blur-md

        text-white

        px-4 py-2

        rounded-xl

        text-xs

        shadow-lg

        border border-white/10
      ">

        Click image to add pins

      </div>

      {/* =====================================
          PINS
      ===================================== */}
      {pins.map((pin, i) => (

        <div
          key={i}

          className="
            absolute
            flex flex-col
            items-center
            z-20

            transition-all
            duration-300
          "

          style={{
            left: `${pin.x}%`,
            top: `${pin.y}%`,
            transform:
              "translate(-50%, -50%)",
          }}

          onMouseDown={(e) => {

            e.stopPropagation();

            setDragIndex(i);

          }}
        >

          {/* PULSE */}
          <div className="
            absolute
            w-8 h-8
            rounded-full
            bg-red-500
            opacity-20
            animate-ping
          " />

          {/* PIN */}
          <div className="
            relative

            w-5 h-5

            bg-red-500

            rounded-full

            shadow-xl

            border-2 border-white

            cursor-move
          " />

          {/* =====================================
              CONFIG PANEL
          ===================================== */}
          <div className="
            mt-3

            bg-white/95
            dark:bg-gray-800/95

            backdrop-blur-xl

            rounded-2xl

            shadow-2xl

            border
            border-gray-200
            dark:border-gray-700

            p-3

            flex flex-col
            gap-2

            min-w-[160px]
          ">

            {/* TITLE */}
            <div className="
              text-xs
              font-bold

              text-gray-700
              dark:text-white
            ">

              Pin #{i + 1}

            </div>

            {/* DATA SELECT */}
            <select

              className="
                text-xs

                border
                border-gray-300
                dark:border-gray-600

                rounded-lg

                px-2 py-2

                bg-white
                dark:bg-gray-900

                dark:text-white
              "

              value={pin.dataKey}

              onClick={(e) =>
                e.stopPropagation()
              }

              onChange={(e) => {

                const updated =
                  [...pins];

                updated[i].dataKey =
                  e.target.value;

                setPins(updated);

              }}
            >

              <option value="">
                Select Data
              </option>

              {dataOptions.map((d) => (

                <option
                  key={d.key}
                  value={d.key}
                >

                  {d.label}

                </option>

              ))}

            </select>

            {/* POSITION */}
            <div className="
              text-[10px]
              text-gray-500
              dark:text-gray-400
            ">

              X:
              {" "}
              {pin.x.toFixed(1)}
              %

              {" • "}

              Y:
              {" "}
              {pin.y.toFixed(1)}
              %

            </div>

            {/* LOCK */}
            <button

              className={`
                text-xs

                rounded-lg

                py-2

                transition

                ${

                  pin.locked

                    ? `
                      bg-green-500
                      hover:bg-green-600
                      text-white
                    `

                    : `
                      bg-gray-100
                      dark:bg-gray-700

                      hover:bg-gray-200
                      dark:hover:bg-gray-600

                      dark:text-white
                    `
                }
              `}

              onClick={(e) => {

                e.stopPropagation();

                const updated =
                  [...pins];

                updated[i].locked =
                  !updated[i].locked;

                setPins(updated);

              }}
            >

              {pin.locked

                ? "🔒 Locked"

                : "🔓 Unlock"}

            </button>

            {/* DELETE */}
            <button

              className="
                text-xs

                bg-red-500
                hover:bg-red-600

                text-white

                rounded-lg

                py-2

                transition
              "

              onClick={(e) => {

                e.stopPropagation();

                removePin(i);

              }}
            >

              Delete

            </button>

          </div>

        </div>

      ))}

    </div>
  );
}
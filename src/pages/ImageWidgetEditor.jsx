import { useState } from "react";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";

import boilerImg from "../assets/Boiler.png";

import { dataOptions }
  from "../data/dataOptions";

export default function
ImageWidgetEditor({

  widget,

  setWidget,

  setPage,

}) {

  
  // STATES
  
  const [dragIndex,
    setDragIndex] =
    useState(null);

  const pins =
    widget?.pins || [];

  
  // ADD PIN
  
  const handleClick = (e) => {

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

    const updatedPins = [
      ...pins,
      {
        x,
        y,
        dataKey: "",
        locked: false,
      },
    ];

    setWidget({
      ...widget,
      pins: updatedPins,
    });
  };

  
  // DRAGGING
  
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

    const updatedPins =
      [...pins];

    updatedPins[dragIndex] = {
      ...updatedPins[dragIndex],
      x,
      y,
    };

    setWidget({
      ...widget,
      pins: updatedPins,
    });
  };

  
  // UPDATE PIN
  
  const updatePin =
    (index, changes) => {

    const updatedPins =
      [...pins];

    updatedPins[index] = {
      ...updatedPins[index],
      ...changes,
    };

    setWidget({
      ...widget,
      pins: updatedPins,
    });
  };

  
  // REMOVE PIN
  
  const removePin =
    (index) => {

    const updatedPins =
      pins.filter(
        (_, i) => i !== index
      );

    setWidget({
      ...widget,
      pins: updatedPins,
    });
  };

  
  // SAVE
  
  const handleSave = () => {

    console.log(
      "SAVED IMAGE WIDGET:",
      widget
    );

    setPage("builder");
  };

  return (

    <div className="
      h-screen
      w-full

      flex

      bg-gray-100
      dark:bg-gray-950
    ">

      {/* =====================================
          LEFT PANEL
      ===================================== */}
      <div className="
        flex-1
        relative
        overflow-hidden
      ">

        {/* TOP BAR */}
        <div className="
          absolute
          top-0 left-0 right-0
          z-30

          flex
          items-center
          justify-between

          p-4

          bg-black/50
          backdrop-blur-md
        ">

          {/* LEFT */}
          <div className="
            flex items-center gap-3
          ">

            <button
              onClick={() =>
                setPage("builder")
              }

              className="
                p-2
                rounded-xl

                bg-white/10
                hover:bg-white/20

                text-white
              "
            >

              <ArrowLeft size={18} />

            </button>

            <div>

              <h1 className="
                text-lg
                font-bold
                text-white
              ">

                Image Widget Editor

              </h1>

              <p className="
                text-xs
                text-gray-300
              ">

                Configure industrial mimic diagram

              </p>

            </div>

          </div>

          {/* RIGHT */}
          <button
            onClick={handleSave}

            className="
              flex items-center gap-2

              bg-blue-600
              hover:bg-blue-700

              text-white

              px-4 py-2

              rounded-xl
            "
          >

            <Save size={16} />

            Save

          </button>

        </div>

        {/* =====================================
            IMAGE LAYER
        ===================================== */}
        <div
          className="
            absolute inset-0
          "

          onClick={handleClick}

          onMouseMove={
            handleMouseMove
          }

          onMouseUp={() =>
            setDragIndex(null)
          }
        >

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
            bg-black/10
            pointer-events-none
          " />

        </div>

        {/* =====================================
            PINS
        ===================================== */}
        {pins.map((pin, i) => (

          <div
            key={i}

            className="
              absolute
              z-20
              flex flex-col
              items-center
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
              rounded-full
              bg-red-500
              border-2 border-white
              shadow-xl
            " />

          </div>

        ))}

      </div>

      {/* =====================================
          RIGHT PANEL
      ===================================== */}
      <div className="
        w-[340px]

        bg-white
        dark:bg-gray-900

        border-l
        border-gray-200
        dark:border-gray-800

        overflow-y-auto
      ">

        {/* HEADER */}
        <div className="
          p-5
          border-b
          border-gray-200
          dark:border-gray-800
        ">

          <h2 className="
            text-lg
            font-bold

            dark:text-white
          ">

            Pin Management

          </h2>

          <p className="
            text-sm
            text-gray-500
            dark:text-gray-400
            mt-1
          ">

            Configure live sensor mappings

          </p>

        </div>

        {/* PIN LIST */}
        <div className="
          p-4
          space-y-4
        ">

          {pins.length === 0 && (

            <div className="
              text-sm
              text-gray-400
              text-center
              py-10
            ">

              No pins added yet

            </div>

          )}

          {pins.map((pin, i) => (

            <div
              key={i}

              className="
                bg-gray-50
                dark:bg-gray-800

                rounded-2xl

                border
                border-gray-200
                dark:border-gray-700

                p-4

                space-y-3
              "
            >

              {/* TITLE */}
              <div className="
                flex items-center
                justify-between
              ">

                <div className="
                  font-semibold
                  text-sm
                  dark:text-white
                ">

                  Pin #{i + 1}

                </div>

                <button

                  onClick={() =>
                    removePin(i)
                  }

                  className="
                    text-red-500
                    hover:text-red-600
                  "
                >

                  <Trash2 size={16} />

                </button>

              </div>

              {/* SELECT */}
              <select

                value={pin.dataKey}

                onChange={(e) =>
                  updatePin(i, {
                    dataKey:
                      e.target.value,
                  })
                }

                className="
                  w-full

                  px-3 py-2

                  rounded-xl

                  border
                  border-gray-300
                  dark:border-gray-700

                  bg-white
                  dark:bg-gray-900

                  dark:text-white

                  text-sm
                "
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
                text-xs
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

                onClick={() =>
                  updatePin(i, {
                    locked:
                      !pin.locked,
                  })
                }

                className={`
                  w-full

                  flex items-center
                  justify-center
                  gap-2

                  py-2

                  rounded-xl

                  text-sm

                  transition

                  ${

                    pin.locked

                      ? `
                        bg-green-100
                        text-green-700
                      `

                      : `
                        bg-gray-100
                        text-gray-700
                      `
                  }
                `}
              >

                {pin.locked

                  ? <Lock size={14} />

                  : <Unlock size={14} />
                }

                {pin.locked

                  ? "Locked"

                  : "Unlocked"
                }

              </button>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}
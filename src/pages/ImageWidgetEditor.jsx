import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Save,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";

import boilerImg from "../assets/Boiler.png";

import { dataOptions } from "../data/dataOptions";

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

export default function ImageWidgetEditor({
  widget,
  setWidget,
  setPage,
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const [dragIndex, setDragIndex] = useState(null);
  const [imageBox, setImageBox] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const pins = Array.isArray(widget?.pins)
    ? widget.pins
    : [];

  const customDataOptions = Array.isArray(widget?.customDataOptions)
    ? widget.customDataOptions
    : [];

  const allDataOptions = [
    ...dataOptions,
    ...customDataOptions,
  ];

  const imageSrc =
    widget?.image?.croppedSrc ||
    widget?.image?.originalSrc ||
    boilerImg;

  const updateImageBox = () => {
    const canvas = canvasRef.current;
    const imageElement = imageRef.current;

    if (!canvas || !imageElement) return;

    const rect = canvas.getBoundingClientRect();
    const naturalWidth = imageElement.naturalWidth || 1;
    const naturalHeight = imageElement.naturalHeight || 1;

    const scale = Math.min(
      rect.width / naturalWidth,
      rect.height / naturalHeight
    );

    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    setImageBox({
      left: (rect.width - width) / 2,
      top: (rect.height - height) / 2,
      width,
      height,
    });
  };

  useEffect(() => {
    updateImageBox();

    window.addEventListener("resize", updateImageBox);

    return () => {
      window.removeEventListener("resize", updateImageBox);
    };
  }, [imageSrc]);

  const getPositionFromPointer = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (
      !rect?.width ||
      !rect?.height ||
      !imageBox.width ||
      !imageBox.height
    ) {
      return { x: 0, y: 0 };
    }

    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    return {
      x: clamp(
        ((pointerX - imageBox.left) / imageBox.width) * 100,
        0,
        100
      ),
      y: clamp(
        ((pointerY - imageBox.top) / imageBox.height) * 100,
        0,
        100
      ),
    };
  };

  const updateWidgetPins = (updatedPins) => {
    setWidget((currentWidget) => ({
      ...currentWidget,
      image: currentWidget?.image || widget?.image || null,
      customDataOptions:
        currentWidget?.customDataOptions ||
        widget?.customDataOptions ||
        [],
      pins: updatedPins,
    }));
  };

  const updatePin = (index, changes) => {
    const updatedPins = pins.map((pin, currentIndex) =>
      currentIndex === index
        ? { ...pin, ...changes }
        : pin
    );

    updateWidgetPins(updatedPins);
  };

  const handleClick = (event) => {
    if (event.target.closest("[data-pin-control='true']")) {
      return;
    }

    const { x, y } = getPositionFromPointer(event);

    const updatedPins = [
      ...pins,
      {
        id: `pin-${Date.now()}-${pins.length}`,
        x,
        y,
        dataKey: "",
        locked: false,
      },
    ];

    updateWidgetPins(updatedPins);
  };

  const handlePointerDown = (event, index) => {
    event.preventDefault();
    event.stopPropagation();

    if (pins[index]?.locked) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragIndex(index);
  };

  const handlePointerMove = (event) => {
    if (dragIndex === null || pins[dragIndex]?.locked) {
      return;
    }

    const { x, y } = getPositionFromPointer(event);

    updatePin(dragIndex, { x, y });
  };

  const stopDragging = () => {
    setDragIndex(null);
  };

  const removePin = (index) => {
    const updatedPins = pins.filter(
      (_, currentIndex) => currentIndex !== index
    );

    updateWidgetPins(updatedPins);
  };

  const getPinLabel = (pin, index) =>
    allDataOptions.find(
      (item) => item.key === pin?.dataKey
    )?.label || `Pin #${index + 1}`;

  // RETURN TO THE WIDGET SETTINGS WIZARD
  // Keep uploaded image and custom data options while returning.
  const returnToWidgetSettings = () => {
    setWidget((currentWidget) => ({
      ...currentWidget,
      image: currentWidget?.image || widget?.image || null,
      customDataOptions:
        currentWidget?.customDataOptions ||
        widget?.customDataOptions ||
        [],
      pins: Array.isArray(currentWidget?.pins)
        ? currentWidget.pins
        : [],
      resumeWidgetSettings: true,
    }));

    setPage(widget?.returnPage || "builder");
  };

  const handleSave = () => {
    returnToWidgetSettings();
  };

  return (
    <div
      className="
        h-screen w-full
        flex
        bg-gray-100 dark:bg-gray-950
      "
    >
      {/* LEFT PANEL */}
      <div
        ref={canvasRef}
        className="
          flex-1
          relative
          overflow-hidden
        "
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
      >
        {/* TOP BAR */}
        <div
          className="
            absolute top-0 left-0 right-0 z-30
            flex items-center justify-between
            p-4
            bg-black/50 backdrop-blur-md
          "
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={returnToWidgetSettings}
              className="
                p-2 rounded-xl
                bg-white/10 hover:bg-white/20
                text-white
              "
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-lg font-bold text-white">
                Image Widget Editor
              </h1>

              <p className="text-xs text-gray-300">
                Configure industrial mimic diagram
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="
              flex items-center gap-2
              bg-blue-600 hover:bg-blue-700
              text-white
              px-4 py-2
              rounded-xl
            "
          >
            <Save size={16} />
            Save
          </button>
        </div>

        {/* IMAGE LAYER */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt={widget?.label || "System process diagram"}
          draggable={false}
          onLoad={updateImageBox}
          className="
            absolute inset-0
            h-full w-full
            object-contain
            select-none
            bg-gray-200 dark:bg-gray-950
            pointer-events-none
          "
        />

        <div
          className="
            absolute inset-0
            bg-black/10
            pointer-events-none
          "
        />

        {!widget?.image?.originalSrc && !widget?.image?.croppedSrc && (
          <div
            className="
              absolute left-4 bottom-4 z-30
              rounded-xl border border-yellow-300/30
              bg-yellow-500/90 px-4 py-2
              text-xs font-semibold text-white shadow-lg
            "
          >
            No uploaded image found. Showing default boiler diagram.
          </div>
        )}

        {/* PINS */}
        <div
          className="absolute z-20"
          style={{
            left: imageBox.left,
            top: imageBox.top,
            width: imageBox.width,
            height: imageBox.height,
          }}
        >
          {pins.map((pin, index) => {
            const x = clamp(Number(pin?.x) || 0, 0, 100);
            const y = clamp(Number(pin?.y) || 0, 0, 100);
            const pinLabel = getPinLabel(pin, index);

            return (
              <div
                key={pin.id || `${pin.dataKey || "pin"}-${index}`}
                className="absolute z-20"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {!pin.locked && (
                  <div
                    className="
                      absolute -inset-1
                      h-9 w-9
                      rounded-full
                      bg-red-500
                      opacity-20
                      animate-ping
                      pointer-events-none
                    "
                  />
                )}

                <button
                  type="button"
                  data-pin-control="true"
                  onPointerDown={(event) =>
                    handlePointerDown(event, index)
                  }
                  onClick={(event) => event.stopPropagation()}
                  title={
                    pin.locked
                      ? `Pin #${index + 1} is locked`
                      : `Drag Pin #${index + 1} to reposition`
                  }
                  className={`
                    relative z-10
                    h-7 w-7
                    rounded-full
                    border-2 border-white
                    shadow-xl
                    flex items-center justify-center
                    text-[11px] font-black text-white
                    transition-transform
                    ${
                      pin.locked
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-red-500 cursor-move hover:scale-110"
                    }
                    ${
                      dragIndex === index
                        ? "scale-125 ring-4 ring-red-300/40"
                        : ""
                    }
                  `}
                >
                  {index + 1}
                </button>

                <div
                  data-pin-control="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className="
                    absolute left-9 top-1/2
                    -translate-y-1/2
                    min-w-[116px] max-w-[190px]
                    rounded-lg
                    border border-white/15
                    bg-black/80
                    px-2 py-1.5
                    shadow-lg
                    backdrop-blur-md
                    cursor-default
                  "
                >
                  <p className="text-[8px] font-bold uppercase leading-none text-red-300">
                    Pin #{index + 1}
                  </p>

                  <p
                    title={pinLabel}
                    className="
                      mt-1 truncate
                      text-[10px] font-semibold
                      leading-none text-white
                    "
                  >
                    {pinLabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className="
          w-[340px]
          bg-white dark:bg-gray-900
          border-l border-gray-200 dark:border-gray-800
          overflow-y-auto
        "
      >
        <div
          className="
            p-5
            border-b border-gray-200 dark:border-gray-800
          "
        >
          <h2 className="text-lg font-bold dark:text-white">
            Pin Management
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure live sensor mappings
          </p>
        </div>

        <div className="p-4 space-y-4">
          {pins.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">
              No pins added yet
            </div>
          )}

          {pins.map((pin, index) => (
            <div
              key={pin.id || index}
              className="
                bg-gray-50 dark:bg-gray-800
                rounded-2xl
                border border-gray-200 dark:border-gray-700
                p-4
                space-y-3
              "
            >
              <div className="flex items-center justify-between">
                <div
                  className="
                    flex items-center gap-2
                    font-semibold text-sm dark:text-white
                  "
                >
                  <span
                    className="
                      h-5 w-5
                      rounded-full
                      bg-red-500
                      text-[10px] font-black text-white
                      flex items-center justify-center
                    "
                  >
                    {index + 1}
                  </span>

                  Pin #{index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removePin(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <select
                value={pin.dataKey || ""}
                onChange={(event) =>
                  updatePin(index, {
                    dataKey: event.target.value,
                  })
                }
                className="
                  w-full
                  px-3 py-2
                  rounded-xl
                  border border-gray-300 dark:border-gray-700
                  bg-white dark:bg-gray-900
                  dark:text-white
                  text-sm
                "
              >
                <option value="">Select Data</option>

                {allDataOptions.map((dataOption) => (
                  <option
                    key={dataOption.key}
                    value={dataOption.key}
                  >
                    {dataOption.label}
                  </option>
                ))}
              </select>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                X: {Number(pin.x || 0).toFixed(1)}% • Y:{" "}
                {Number(pin.y || 0).toFixed(1)}%
              </div>

              <button
                type="button"
                onClick={() =>
                  updatePin(index, {
                    locked: !pin.locked,
                  })
                }
                className={`
                  w-full
                  flex items-center justify-center gap-2
                  py-2
                  rounded-xl
                  text-sm
                  transition
                  ${
                    pin.locked
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }
                `}
              >
                {pin.locked ? (
                  <Lock size={14} />
                ) : (
                  <Unlock size={14} />
                )}

                {pin.locked ? "Locked" : "Unlocked"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

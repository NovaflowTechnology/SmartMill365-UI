import { useEffect, useRef, useState } from "react";

import boilerImg from "../assets/Boiler.png";

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

export default function ImageWidgetConfigurator({
  pins = [],
  setPins = () => {},
  image = null,
  customDataOptions = [],
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const [dragIndex, setDragIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedPinIndex, setExpandedPinIndex] = useState(null);
  const [imageBox, setImageBox] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const safePins = Array.isArray(pins) ? pins : [];

  // Field choices come from Template Designer / Influx metadata.
  const allDataOptions =
    Array.isArray(customDataOptions)
      ? customDataOptions
      : [];

  const imageSrc =
    image?.croppedSrc ||
    image?.originalSrc ||
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

    if (!rect?.width || !rect?.height || !imageBox.width || !imageBox.height) {
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

  const updatePin = (index, changes) => {
    setPins(
      safePins.map((pin, currentIndex) =>
        currentIndex === index
          ? { ...pin, ...changes }
          : pin
      )
    );
  };

  const handleCanvasClick = (event) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (event.target.closest("[data-pin-control='true']")) {
      return;
    }

    const { x, y } = getPositionFromPointer(event);
    const newIndex = safePins.length;

    setPins([
      ...safePins,
      {
        id: `pin-${Date.now()}-${newIndex}`,
        x,
        y,
        dataKey: "",
        locked: false,
      },
    ]);

    setExpandedPinIndex(newIndex);
  };

  const handlePointerDown = (event, index) => {
    event.preventDefault();
    event.stopPropagation();

    if (safePins[index]?.locked) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    setDragIndex(index);
    setIsDragging(false);
    setExpandedPinIndex(index);
  };

  const handlePointerMove = (event) => {
    if (dragIndex === null || safePins[dragIndex]?.locked) {
      return;
    }

    const { x, y } = getPositionFromPointer(event);

    updatePin(dragIndex, { x, y });
    setIsDragging(true);
  };

  const stopDragging = () => {
    setDragIndex(null);
  };

  const removePin = (index) => {
    setPins(
      safePins.filter((_, currentIndex) => currentIndex !== index)
    );

    setExpandedPinIndex((currentIndex) => {
      if (currentIndex === index) return null;

      if (currentIndex !== null && currentIndex > index) {
        return currentIndex - 1;
      }

      return currentIndex;
    });
  };

  return (
    <div
      ref={canvasRef}
      className="
        relative h-full w-full overflow-hidden rounded-2xl
        bg-gray-100 dark:bg-gray-900
        touch-none select-none
      "
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
    >
      <img
        ref={imageRef}
        src={imageSrc}
        alt="System process diagram"
        draggable={false}
        onLoad={updateImageBox}
        className="
          absolute inset-0 h-full w-full
          object-contain
          bg-gray-200 dark:bg-gray-950
          pointer-events-none
        "
      />

      <div
        className="
          absolute inset-0 pointer-events-none
          bg-gradient-to-t from-black/10 to-transparent
        "
      />

      <div
        className="
          absolute left-4 top-4 z-30
          rounded-xl border border-white/10
          bg-black/70 px-4 py-2
          text-xs text-white shadow-lg backdrop-blur-md
          pointer-events-none
        "
      >
        Click image to add pins · Drag a pin to reposition
      </div>

      <div
        className="absolute z-20"
        style={{
          left: imageBox.left,
          top: imageBox.top,
          width: imageBox.width,
          height: imageBox.height,
        }}
      >
        {safePins.map((pin, index) => {
          const x = clamp(Number(pin?.x) || 0, 0, 100);
          const y = clamp(Number(pin?.y) || 0, 0, 100);

          const isOpen = expandedPinIndex === index;
          const isLocked = Boolean(pin?.locked);

          const pinLabel =
            allDataOptions.find(
              (option) => option.key === pin?.dataKey
            )?.label || `Pin #${index + 1}`;

          return (
            <div
              key={pin?.id || `${pin?.dataKey || "pin"}-${index}`}
              className="
                absolute z-20
                flex items-center gap-2
              "
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <button
                type="button"
                data-pin-control="true"
                onPointerDown={(event) =>
                  handlePointerDown(event, index)
                }
                onClick={(event) => {
                  event.stopPropagation();

                  setExpandedPinIndex((currentIndex) =>
                    currentIndex === index ? null : index
                  );
                }}
                title={
                  isLocked
                    ? "Pin is locked"
                    : "Drag to move pin"
                }
                className={`
                  relative z-10 h-5 w-5 shrink-0 rounded-full
                  border-2 border-white shadow-xl
                  transition-transform
                  ${
                    isLocked
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-red-500 cursor-grab active:cursor-grabbing"
                  }
                  ${
                    dragIndex === index
                      ? "scale-125 ring-4 ring-red-300/40"
                      : "hover:scale-110"
                  }
                `}
              >
                {!isLocked && (
                  <span
                    className="
                      absolute inset-[-7px] rounded-full
                      bg-red-500/20 animate-ping
                    "
                  />
                )}
              </button>

              <div
                data-pin-control="true"
                className="
                  min-w-[100px] max-w-[165px]
                  rounded-lg border border-white/15
                  bg-black/75 px-2 py-1.5
                  shadow-lg backdrop-blur-sm
                  pointer-events-none
                "
              >
                <p
                  title={pinLabel}
                  className="
                    truncate text-[9px] font-semibold
                    uppercase leading-none text-white
                  "
                >
                  {pinLabel}
                </p>

                <p className="mt-1 text-[8px] leading-none text-white/60">
                  {isLocked ? "Locked" : "Drag to reposition"}
                </p>
              </div>

              {isOpen && (
                <div
                  data-pin-control="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className="
                    absolute left-0 top-8 z-30
                    min-w-[190px]
                    rounded-2xl border border-gray-200 dark:border-gray-700
                    bg-white/95 dark:bg-gray-800/95
                    p-3 shadow-2xl backdrop-blur-xl
                  "
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-gray-700 dark:text-white">
                      Pin #{index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedPinIndex(null)}
                      className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  <select
                    value={pin?.dataKey || ""}
                    onChange={(event) => {
                      const dataKey = event.target.value;
                      const selectedOption =
                        allDataOptions.find(
                          (option) => option.key === dataKey
                        );

                      updatePin(index, {
                        dataKey,
                        label:
                          selectedOption?.label ||
                          dataKey,
                        rangeConfig:
                          selectedOption?.rangeConfig ||
                          pin?.rangeConfig ||
                          undefined,
                      });
                    }}
                    className="
                      mt-3 w-full rounded-lg
                      border border-gray-300 dark:border-gray-600
                      bg-white dark:bg-gray-900
                      px-2 py-2 text-xs
                      dark:text-white outline-none
                      focus:ring-2 focus:ring-cyan-500
                    "
                  >
                    <option value="">Select Data</option>

                    {allDataOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                    X: {x.toFixed(1)}% · Y: {y.toFixed(1)}%
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      updatePin(index, {
                        locked: !isLocked,
                      })
                    }
                    className={`
                      mt-3 w-full rounded-lg py-2 text-xs transition
                      ${
                        isLocked
                          ? "bg-cyan-600 text-white hover:bg-cyan-700"
                          : "bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                      }
                    `}
                  >
                    {isLocked
                      ? "Unlock Position"
                      : "Lock Position"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removePin(index)}
                    className="
                      mt-2 w-full rounded-lg
                      bg-red-500 py-2 text-xs text-white
                      transition hover:bg-red-600
                    "
                  >
                    Delete Pin
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

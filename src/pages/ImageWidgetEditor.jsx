import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Save,
  Trash2,
  Lock,
  Unlock,
  Image as ImageIcon,
  MapPin,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
} from "lucide-react";

import boilerImg from "../assets/Boiler.png";

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const readDarkMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const html = document.documentElement;
  const body = document.body;

  return (
    html.classList.contains("dark") ||
    body.classList.contains("dark") ||
    html.dataset.theme === "dark" ||
    body.dataset.theme === "dark" ||
    localStorage.getItem("theme") === "dark"
  );
};

export default function ImageWidgetEditor({
  widget,
  setWidget,
  setPage,
  darkMode,
  toggleTheme,
}) {
  const [detectedDarkMode, setDetectedDarkMode] =
    useState(() => readDarkMode());

  const isDarkMode =
    typeof darkMode === "boolean"
      ? darkMode
      : detectedDarkMode;

  useEffect(() => {
    if (typeof darkMode === "boolean") {
      return undefined;
    }

    const updateTheme = () => {
      setDetectedDarkMode(readDarkMode());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    window.addEventListener("storage", updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateTheme);
    };
  }, [darkMode]);
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

  /*
   * Data Mapping is completed at Template Designer level first.
   * Image pins inherit that mapped device and only select from the
   * fields available for that device.
   */
  const templateMapping =
    widget?.designerSnapshot?.influxConfig || {};

  const mappedSource = {
    bucket: String(templateMapping.bucket || ""),
    measurement: String(templateMapping.measurement || ""),
    tagKey: String(templateMapping.tagKey || "id"),
    tagValue: String(
      templateMapping.tagValue ||
        templateMapping.id ||
        ""
    ),
  };

  const mappingReady = Boolean(
    mappedSource.bucket &&
      mappedSource.measurement &&
      mappedSource.tagValue
  );

  const [availableFields, setAvailableFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState("");

  const formatFieldLabel = (field = "") =>
    String(field)
      .replace(/_/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );

  const allDataOptions = availableFields.map((field) => ({
    key: field,
    label: formatFieldLabel(field),
    channel: field,
    source: {
      ...mappedSource,
      field,
    },
  }));

  const fetchMappedFields = async () => {
    if (!mappingReady) {
      setAvailableFields([]);
      setFieldsError(
        "Template Data Mapping is incomplete. Return to Template Designer and complete Data Mapping first."
      );
      return;
    }

    const token = localStorage.getItem("token");

    const query = new URLSearchParams({
      bucket: mappedSource.bucket,
      measurement: mappedSource.measurement,
      tagKey: mappedSource.tagKey || "id",
      tagValue: mappedSource.tagValue,
    });

    setFieldsLoading(true);
    setFieldsError("");

    try {
      const response = await fetch(
        `http://localhost:5000/influx/channels?${query.toString()}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to load fields for the mapped device."
        );
      }

      const fields = [
        ...new Set(
          [
            ...(Array.isArray(result?.channels)
              ? result.channels
              : []),
            ...(Array.isArray(result?.fields)
              ? result.fields
              : []),
          ]
            .filter(Boolean)
            .map(String)
        ),
      ].sort();

      setAvailableFields(fields);
    } catch (error) {
      console.error(
        "❌ Image editor mapped field error:",
        error
      );

      setAvailableFields([]);
      setFieldsError(
        error.message ||
          "Failed to load fields for the mapped device."
      );
    } finally {
      setFieldsLoading(false);
    }
  };

  useEffect(() => {
    fetchMappedFields();
    // Load fields once when the editor opens with the inherited mapping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      image:
        currentWidget?.image ||
        widget?.image ||
        null,
      designerSnapshot:
        currentWidget?.designerSnapshot ||
        widget?.designerSnapshot,
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

    if (!mappingReady) {
      setFieldsError(
        "Complete Template Data Mapping before adding sensor pins."
      );
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
        source: null,
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
    )?.label ||
    (pin?.dataKey
      ? formatFieldLabel(pin.dataKey)
      : `Pin #${index + 1}`);

  // RETURN TO THE WIDGET SETTINGS WIZARD
  // Preserve the Template Designer snapshot so its grid and mappings survive.
  const returnToWidgetSettings = () => {
    setWidget((currentWidget) => ({
      ...currentWidget,
      image:
        currentWidget?.image ||
        widget?.image ||
        null,
      designerSnapshot:
        currentWidget?.designerSnapshot ||
        widget?.designerSnapshot,
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
      data-theme={isDarkMode ? "dark" : "light"}
      className={
        isDarkMode
          ? "image-widget-editor-theme dark h-screen w-full"
          : "image-widget-editor-theme h-screen w-full"
      }
    >
      <style>{`
        .image-widget-editor-theme[data-theme="dark"] {
          background: #081022;
          color: #c8d1ea;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-shell {
          background-color: #081022 !important;
          color: #e2e8f0 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-workspace {
          background-color: #081022 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-canvas {
          background-color: #081022 !important;
          border-color: #2C3C61 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-sidebar {
          background-color: #0B1328 !important;
          border-color: #2C3C61 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-card {
          background-color: #111B34 !important;
          border-color: #2C3C61 !important;
          color: #e8edff !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-empty {
          background-color: #111B34 !important;
          border-color: #2C3C61 !important;
          color: #e2e8f0 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-help {
          background-color: rgba(15, 23, 42, 0.94) !important;
          border-color: #2C3C61 !important;
          color: #e8edff !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-muted {
          color: #94a3b8 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-primary {
          color: #e8edff !important;
        }

        .image-widget-editor-theme[data-theme="dark"] input,
        .image-widget-editor-theme[data-theme="dark"] select,
        .image-widget-editor-theme[data-theme="dark"] textarea {
          background-color: #081022 !important;
          border-color: #2C3C61 !important;
          color: #e8edff !important;
        }

        .image-widget-editor-theme[data-theme="dark"] input::placeholder,
        .image-widget-editor-theme[data-theme="dark"] textarea::placeholder {
          color: #64748b !important;
        }

        .image-widget-editor-theme[data-theme="dark"] option {
          background-color: #081022;
          color: #e8edff;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-unlocked {
          background-color: #1B2948 !important;
          border-color: #2C3C61 !important;
          color: #e2e8f0 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-locked {
          background-color: rgba(16, 185, 129, 0.12) !important;
          border-color: rgba(16, 185, 129, 0.45) !important;
          color: #6ee7b7 !important;
        }
      `}</style>

      <div className="image-editor-shell flex h-full w-full bg-slate-50 text-slate-900 dark:bg-[#081022] dark:text-slate-100">
        {/* IMAGE WORKSPACE */}
        <div className="image-editor-workspace relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white p-3 dark:bg-[#081022]">
          {/* TOOLBAR */}
          <div
            className="
              z-30 flex shrink-0
              items-center justify-between
              gap-3 rounded-xl
              border px-3 py-2.5
              shadow-lg backdrop-blur-xl
            "
            style={{
              backgroundColor: isDarkMode
                ? "rgba(15, 23, 42, 0.96)"
                : "rgba(255, 255, 255, 0.96)",
              borderColor: isDarkMode
                ? "rgba(71, 85, 105, 0.75)"
                : "#e2e8f0",
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={returnToWidgetSettings}
                className="
                  inline-flex h-8 w-8
                  shrink-0 items-center justify-center
                  rounded-xl border
                  transition
                "
                style={{
                  backgroundColor: isDarkMode
                    ? "#1B2948"
                    : "#f1f5f9",
                  borderColor: isDarkMode
                    ? "#2C3C61"
                    : "#cbd5e1",
                  color: isDarkMode
                    ? "#e8edff"
                    : "#2C3C61",
                }}
                aria-label="Back to widget settings"
                title="Back to widget settings"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ImageIcon
                    size={17}
                    className="shrink-0"
                    style={{
                      color: isDarkMode
                        ? "#58d7ff"
                        : "#059669",
                    }}
                  />

                  <h1
                    className="truncate text-base font-black"
                    style={{
                      color: isDarkMode
                        ? "#e8edff"
                        : "#111B34",
                    }}
                  >
                    Image Widget Editor
                  </h1>
                </div>

                <p
                  className="mt-0.5 truncate text-xs"
                  style={{
                    color: isDarkMode
                      ? "#c8d1ea"
                      : "#64748b",
                  }}
                >
                  Place sensor pins and map them to fields from the template's configured device.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className="hidden rounded-xl border px-3 py-2 text-right sm:block"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(17, 27, 52, 0.94)"
                    : "#f8fafc",
                  borderColor: isDarkMode
                    ? "#2C3C61"
                    : "#cbd5e1",
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{
                    color: isDarkMode
                      ? "#70e1c2"
                      : "#059669",
                  }}
                >
                  Sensor pins
                </p>

                <p
                  className="mt-0.5 text-xs font-extrabold"
                  style={{
                    color: isDarkMode
                      ? "#e8edff"
                      : "#111B34",
                  }}
                >
                  {pins.length} pin{pins.length === 1 ? "" : "s"}
                </p>
              </div>

              {typeof toggleTheme === "function" && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="
                    inline-flex h-8 w-8
                    items-center justify-center
                    rounded-xl border border-slate-200
                    bg-slate-100 text-slate-700
                    transition hover:bg-slate-200
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-100
                    dark:hover:bg-slate-700
                  "
                  aria-label={
                    isDarkMode
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  title={
                    isDarkMode
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                >
                  {isDarkMode ? (
                    <Sun size={17} />
                  ) : (
                    <Moon size={17} />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!mappingReady}
                className="
                  inline-flex h-8
                  items-center gap-2 rounded-xl
                  bg-emerald-600 px-3
                  text-sm font-black text-white
                  shadow-lg shadow-emerald-600/20
                  transition hover:bg-emerald-700
                  disabled:cursor-not-allowed disabled:opacity-45
                "
              >
                <Save size={15} />
                Save
              </button>
            </div>
          </div>

          {/* CANVAS */}
          <div
            ref={canvasRef}
            className="
              image-editor-canvas
              relative mt-3 min-h-0 flex-1
              overflow-hidden rounded-xl
              border border-slate-200
              bg-slate-100
              shadow-inner
              dark:border-slate-700
              dark:bg-slate-950
            "
            onClick={handleClick}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onPointerLeave={stopDragging}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt={widget?.label || "System process diagram"}
              draggable={false}
              onLoad={updateImageBox}
              className="
                absolute inset-0
                h-full w-full
                select-none object-contain
                pointer-events-none
              "
            />

            <div className="pointer-events-none absolute inset-0 bg-slate-950/[0.03] dark:bg-black/10" />

            {!widget?.image?.originalSrc &&
              !widget?.image?.croppedSrc && (
                <div
                  className="
                    absolute bottom-4 left-4 z-30
                    rounded-xl border
                    border-amber-300
                    bg-amber-50 px-3 py-2
                    text-xs font-semibold
                    text-amber-800 shadow-lg
                    dark:border-amber-900/60
                    dark:bg-amber-500/10
                    dark:text-amber-200
                  "
                >
                  No uploaded image found. Showing the default boiler diagram.
                </div>
              )}

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
                          pointer-events-none
                          absolute -inset-1
                          h-9 w-9 animate-ping
                          rounded-full
                          bg-emerald-500 opacity-20
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
                        flex h-7 w-7
                        items-center justify-center
                        rounded-full border-2
                        border-white text-[11px]
                        font-black text-white shadow-xl
                        transition-transform
                        ${
                          pin.locked
                            ? "cursor-not-allowed bg-slate-500"
                            : "cursor-move bg-emerald-500 hover:scale-110"
                        }
                        ${
                          dragIndex === index
                            ? "scale-125 ring-4 ring-emerald-300/40"
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
                        min-w-[116px] max-w-[165px]
                        -translate-y-1/2 cursor-default
                        rounded-xl border
                        border-slate-700
                        bg-slate-950/90
                        px-2.5 py-2 shadow-xl
                        backdrop-blur-md
                      "
                    >
                      <p className="text-[8px] font-black uppercase leading-none tracking-wider text-emerald-300">
                        Pin #{index + 1}
                      </p>

                      <p
                        title={pinLabel}
                        className="mt-1 truncate text-[10px] font-semibold leading-none text-white"
                      >
                        {pinLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {pins.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
                <div
                  className="
                    image-editor-help
                    rounded-xl border
                    border-slate-200
                    bg-white/90 px-3 py-2.5
                    text-center shadow-lg
                    backdrop-blur
                    dark:border-slate-700
                    dark:bg-slate-900/90
                  "
                >
                  <p className="image-editor-primary text-xs font-bold text-slate-700 dark:text-slate-200">
                    Click anywhere on the diagram to add a sensor pin.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PIN SETTINGS */}
        <div className="image-editor-sidebar w-[380px] overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0B1328]">
          <div
            className="sticky top-0 z-10 border-b p-3 backdrop-blur-xl"
            style={{
              backgroundColor: isDarkMode
                ? "rgba(15, 23, 42, 0.98)"
                : "rgba(255, 255, 255, 0.98)",
              borderColor: isDarkMode
                ? "#2C3C61"
                : "#e2e8f0",
              boxShadow: isDarkMode
                ? "0 10px 24px rgba(0,0,0,0.18)"
                : "0 8px 20px rgba(15,23,42,0.06)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-xl border
                  border-emerald-200
                  bg-emerald-50
                  text-emerald-600
                  dark:border-emerald-900/60
                  dark:bg-emerald-500/10
                  dark:text-emerald-300
                "
              >
                <MapPin size={19} />
              </div>

              <div className="min-w-0">
                <h2
                  className="text-base font-black"
                  style={{
                    color: isDarkMode
                      ? "#e8edff"
                      : "#111B34",
                  }}
                >
                  Pin Settings
                </h2>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color: isDarkMode
                      ? "#c8d1ea"
                      : "#64748b",
                  }}
                >
                  Map each pin to a field from the template's selected device and lock its position.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div
              className={`
                rounded-xl border p-3
                ${
                  mappingReady
                    ? "ui-success-surface border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "ui-warning-surface border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Database
                      size={15}
                      className={
                        mappingReady
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                    />
                    <h3 className="text-sm font-black">
                      Template Data Mapping
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Image pins use fields from this mapped device.
                  </p>
                </div>

                {mappingReady ? (
                  <CheckCircle2
                    size={17}
                    className="text-emerald-500"
                  />
                ) : (
                  <AlertCircle
                    size={17}
                    className="text-amber-500"
                  />
                )}
              </div>

              {mappingReady ? (
                <div className="mt-3 space-y-2 text-[11px]">
                  <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-950/60">
                    <span className="font-black uppercase tracking-wider text-slate-400">
                      Source
                    </span>
                    <p className="mt-1 truncate font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {mappedSource.bucket} / {mappedSource.measurement}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-950/60">
                    <span className="font-black uppercase tracking-wider text-slate-400">
                      Device
                    </span>
                    <p className="mt-1 truncate font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {mappedSource.tagKey}={mappedSource.tagValue}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs font-semibold text-amber-700 dark:bg-slate-950/50 dark:text-amber-300">
                  Mapping is incomplete. Return to Template Designer and complete Data Mapping first.
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {fieldsLoading
                    ? "Loading fields..."
                    : `${availableFields.length} field(s) available`}
                </span>

                <button
                  type="button"
                  onClick={fetchMappedFields}
                  disabled={fieldsLoading || !mappingReady}
                  className="
                    inline-flex items-center gap-1.5 rounded-lg
                    bg-slate-800 px-3 py-2
                    text-[11px] font-black text-white
                    transition hover:bg-slate-700
                    disabled:cursor-not-allowed disabled:opacity-45
                    dark:bg-slate-700 dark:hover:bg-slate-600
                  "
                >
                  <RefreshCw
                    size={12}
                    className={
                      fieldsLoading
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Refresh
                </button>
              </div>

              {fieldsError && (
                <p className="mt-2 text-xs font-semibold text-red-500">
                  {fieldsError}
                </p>
              )}
            </div>

            {pins.length === 0 && (
              <div
                className="
                  image-editor-empty
                  rounded-xl border
                  border-dashed border-slate-300
                  bg-white px-4 py-10
                  text-center
                  dark:border-slate-700
                  dark:bg-slate-900
                "
              >
                <MapPin
                  size={24}
                  className="mx-auto text-slate-400"
                />

                <p className="image-editor-primary mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  No pins added
                </p>

                <p className="image-editor-muted mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Click the process image to create the first sensor pin.
                </p>
              </div>
            )}

            {pins.map((pin, index) => (
              <div
                key={pin.id || index}
                className="
                  image-editor-card
                  rounded-xl border
                  border-slate-200 bg-white
                  p-3 shadow-sm
                  dark:border-slate-700
                  dark:bg-[#111B34]
                "
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="
                        flex h-6 w-6
                        items-center justify-center
                        rounded-full bg-emerald-500
                        text-[10px] font-black text-white
                      "
                    >
                      {index + 1}
                    </span>

                    <div>
                      <p className="image-editor-primary text-sm font-black text-slate-900 dark:text-white">
                        Pin {index + 1}
                      </p>

                      <p className="image-editor-muted text-[10px] text-slate-400">
                        X {Number(pin.x || 0).toFixed(1)}% · Y{" "}
                        {Number(pin.y || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removePin(index)}
                    className="
                      inline-flex h-9 w-9
                      items-center justify-center
                      rounded-xl text-red-500
                      transition hover:bg-red-50
                      dark:hover:bg-red-500/10
                    "
                    aria-label={`Delete pin ${index + 1}`}
                    title={`Delete pin ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Process field
                </label>

                <select
                  value={pin.dataKey || ""}
                  onChange={(event) => {
                    const selectedField =
                      event.target.value;

                    const selectedOption =
                      allDataOptions.find(
                        (item) =>
                          item.key === selectedField
                      );

                    updatePin(index, {
                      dataKey: selectedField,
                      source:
                        selectedOption?.source || null,
                    });
                  }}
                  disabled={!mappingReady || fieldsLoading}
                  className="
                    mt-2 w-full rounded-xl
                    border border-slate-300
                    bg-white px-3 py-2.5
                    text-sm text-slate-900
                    outline-none transition
                    focus:border-emerald-500
                    focus:ring-2
                    focus:ring-emerald-500/20
                    dark:border-slate-600
                    dark:bg-slate-950
                    dark:text-white
                  "
                >
                  <option value="">
                    {fieldsLoading
                      ? "Loading fields..."
                      : allDataOptions.length
                      ? "Select process field"
                      : "No fields available"}
                  </option>

                  {pin.dataKey &&
                    !allDataOptions.some(
                      (option) =>
                        option.key === pin.dataKey
                    ) && (
                      <option value={pin.dataKey}>
                        {formatFieldLabel(pin.dataKey)}
                      </option>
                    )}

                  {allDataOptions.map((dataOption) => (
                    <option
                      key={dataOption.key}
                      value={dataOption.key}
                    >
                      {dataOption.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    updatePin(index, {
                      locked: !pin.locked,
                    })
                  }
                  className={`
                    mt-3 flex w-full
                    items-center justify-center
                    gap-2 rounded-xl
                    border px-3 py-2.5
                    text-sm font-bold transition
                    ${
                      pin.locked
                        ? "image-editor-locked border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "image-editor-unlocked border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }
                  `}
                >
                  {pin.locked ? (
                    <Lock size={14} />
                  ) : (
                    <Unlock size={14} />
                  )}

                  {pin.locked
                    ? "Position locked"
                    : "Position unlocked"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

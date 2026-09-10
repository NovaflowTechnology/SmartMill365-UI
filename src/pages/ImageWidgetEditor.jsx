import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Save,
  Copy,
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

import ImageOverlayCanvas from "../widgets/ImageOverlayCanvas";

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const IMAGE_OVERLAY_TYPES = [
  {
    value: "pin",
    label: "Sensor Pin",
    description: "Marker + value + status",
  },
  {
    value: "value",
    label: "Live Value",
    description: "Compact numeric card",
  },
  {
    value: "status",
    label: "Status Badge",
    description: "Normal / Warning / Critical",
  },
  {
    value: "gauge",
    label: "Mini Gauge",
    description: "Circular percentage gauge",
  },
  {
    value: "level",
    label: "Level Indicator",
    description: "Vertical tank-style level",
  },
  {
    value: "bar",
    label: "Linear Bar",
    description: "Horizontal range bar",
  },
  {
    value: "sparkline",
    label: "Sparkline",
    description: "Compact historical trend",
  },
];

const defaultOverlayDisplay = {
  label: "",
  decimals: 1,
  scale: "medium",
  showLabel: true,
  showStatus: true,
};

const defaultOverlayRange = {
  min: 0,
  max: 100,
  unit: "",
  warning: 80,
  danger: 90,
};



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

const normalizeSource = (source = {}) => ({
  bucket: String(source.bucket || source.bucket_name || "").trim(),
  measurement: String(source.measurement || source.measurement_name || "").trim(),
  tagKey: String(source.tagKey || source.tag_key || "id").trim() || "id",
  tagValue: String(
    source.tagValue ||
      source.tag_value ||
      source.id ||
      ""
  ).trim(),
});

const getSourceIdentity = (source = {}) => {
  const normalized = normalizeSource(source);

  return [
    normalized.bucket,
    normalized.measurement,
    normalized.tagKey,
    normalized.tagValue,
  ].join("::");
};

const getMeasurementIdentity = (source = {}) => {
  const normalized = normalizeSource(source);

  return [
    normalized.bucket,
    normalized.measurement,
  ].join("::");
};

const createSafeDataKey = (value = "") => {
  const cleaned = String(value)
    .trim()
    .replace(
      /[^a-zA-Z0-9_$]+(.)?/g,
      (_, next) => (next ? next.toUpperCase() : "")
    )
    .replace(/^[^a-zA-Z_$]+/, "");

  return cleaned || `imageSource${Date.now()}`;
};

const createImagePinDataKey = (source, field) => {
  const normalized = normalizeSource(source);

  return createSafeDataKey(
    [
      "img",
      normalized.measurement,
      normalized.tagValue,
      field,
    ]
      .filter(Boolean)
      .join("_")
  );
};

const deduplicateDataOptions = (options = []) => {
  const map = new Map();

  (Array.isArray(options) ? options : []).forEach(
    (option) => {
      if (!option?.key) return;

      map.set(String(option.key), {
        ...option,
        key: String(option.key),
      });
    }
  );

  return [...map.values()];
};

const deduplicateMappings = (mappings = []) => {
  const map = new Map();

  (Array.isArray(mappings) ? mappings : []).forEach(
    (mapping) => {
      const normalized = normalizeSource(mapping);

      if (
        !normalized.bucket ||
        !normalized.measurement ||
        !normalized.tagValue
      ) {
        return;
      }

      const identity = getSourceIdentity(normalized);

      if (!map.has(identity)) {
        map.set(identity, {
          ...normalized,
          deviceName: String(
            mapping.deviceName ||
              mapping.device_name ||
              ""
          ).trim(),
          orgName: String(
            mapping.orgName ||
              mapping.org_name ||
              ""
          ).trim(),
        });
      }
    }
  );

  return [...map.values()];
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
  const [dragIndex, setDragIndex] = useState(null);
  const [selectedOverlayIndex, setSelectedOverlayIndex] = useState(null);

  const pins = Array.isArray(widget?.pins)
    ? widget.pins
    : [];

  /*
   * Image Editor data mapping
   * -------------------------
   * Template Designer mapping is only the initial/default mapping.
   * Users may select another Measurement + Device in this editor.
   *
   * Each pin stores its own full source, so a single process image can
   * contain pins from different measurements and devices.
   */
  const templateMapping =
    widget?.designerSnapshot?.influxConfig || {};

  const inheritedMapping = normalizeSource(
    widget?.imageDataMapping || templateMapping
  );

  const [selectedMapping, setSelectedMapping] =
    useState(inheritedMapping);

  const [
    allowedDeviceMappings,
    setAllowedDeviceMappings,
  ] = useState([]);

  const [mappingsLoading, setMappingsLoading] =
    useState(false);

  const [mappingsError, setMappingsError] =
    useState("");

  const [imageDataOptions, setImageDataOptions] =
    useState(() =>
      deduplicateDataOptions([
        ...(Array.isArray(
          widget?.designerSnapshot?.customDataOptions
        )
          ? widget.designerSnapshot.customDataOptions
          : []),
        ...(Array.isArray(widget?.customDataOptions)
          ? widget.customDataOptions
          : []),
      ])
    );

  const knownSourceMappings = useMemo(() => {
    const fromOptions = imageDataOptions.map(
      (option) => {
        const source =
          normalizeSource(
            option?.source || {}
          );

        return {
          ...source,
          deviceName:
            option?.source?.deviceName ||
            option?.source?.device_name ||
            source.tagValue ||
            option?.label ||
            "",
        };
      }
    );

    const inherited =
      inheritedMapping.bucket &&
      inheritedMapping.measurement &&
      inheritedMapping.tagValue
        ? [
            {
              ...inheritedMapping,
              deviceName: "Template mapping",
            },
          ]
        : [];

    return deduplicateMappings([
      ...allowedDeviceMappings,
      ...fromOptions,
      ...inherited,
    ]);
  }, [
    allowedDeviceMappings,
    imageDataOptions,
    inheritedMapping.bucket,
    inheritedMapping.measurement,
    inheritedMapping.tagKey,
    inheritedMapping.tagValue,
  ]);

  const measurementOptions = useMemo(() => {
    const map = new Map();

    knownSourceMappings.forEach((mapping) => {
      const key = getMeasurementIdentity(mapping);

      if (!map.has(key)) {
        map.set(key, {
          key,
          bucket: mapping.bucket,
          measurement: mapping.measurement,
        });
      }
    });

    return [...map.values()].sort((a, b) =>
      `${a.bucket}/${a.measurement}`.localeCompare(
        `${b.bucket}/${b.measurement}`,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      )
    );
  }, [knownSourceMappings]);

  const selectedMeasurementKey =
    getMeasurementIdentity(selectedMapping);

  const deviceOptions = useMemo(
    () =>
      knownSourceMappings
        .filter(
          (mapping) =>
            getMeasurementIdentity(mapping) ===
            selectedMeasurementKey
        )
        .sort((a, b) =>
          String(a.deviceName || a.tagValue).localeCompare(
            String(b.deviceName || b.tagValue),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        ),
    [knownSourceMappings, selectedMeasurementKey]
  );

  const selectedDeviceKey =
    getSourceIdentity(selectedMapping);

  const mappingReady = Boolean(
    selectedMapping.bucket &&
      selectedMapping.measurement &&
      selectedMapping.tagValue
  );

  const [availableFields, setAvailableFields] =
    useState([]);

  const [fieldsLoading, setFieldsLoading] =
    useState(false);

  const [fieldsError, setFieldsError] =
    useState("");

  const formatFieldLabel = (field = "") =>
    String(field)
      .replace(/_/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );

  const allDataOptions = useMemo(
    () =>
      availableFields.map((field) => {
        const key = createImagePinDataKey(
          selectedMapping,
          field
        );

        return {
          key,
          label: formatFieldLabel(field),
          channel: field,
          source: {
            ...normalizeSource(selectedMapping),
            id: selectedMapping.tagValue,
            field,
            channel: field,
          },
        };
      }),
    [
      availableFields,
      selectedMapping.bucket,
      selectedMapping.measurement,
      selectedMapping.tagKey,
      selectedMapping.tagValue,
    ]
  );

  const getAllKnownDataOptions = () =>
    deduplicateDataOptions([
      ...imageDataOptions,
      ...allDataOptions,
    ]);

  const updateSelectedMapping = (nextMapping) => {
    const normalized = normalizeSource(nextMapping);

    setSelectedMapping(normalized);
    setAvailableFields([]);
    setFieldsError("");

    setWidget((currentWidget) => ({
      ...currentWidget,
      imageDataMapping: normalized,
    }));
  };

  const fetchAllowedMappings = async () => {
    const token = localStorage.getItem("token");

    if (!token) return;

    setMappingsLoading(true);
    setMappingsError("");

    try {
      const response = await fetch(
        "http://localhost:5000/influx/allowed-devices",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Editor/Viewer may not have discovery permission.
        // Existing template sources remain selectable.
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          setAllowedDeviceMappings([]);
          return;
        }

        throw new Error(
          result?.error ||
            "Failed to load assigned devices."
        );
      }

      const rows = Array.isArray(result)
        ? result
        : [];

      setAllowedDeviceMappings(
        deduplicateMappings(
          rows.map((device) => ({
            bucket: device.bucket_name,
            measurement: device.measurement_name,
            tagKey: device.tag_key || "id",
            tagValue: device.tag_value,
            deviceName:
              device.device_name ||
              device.tag_value,
            orgName: device.org_name || "",
          }))
        )
      );
    } catch (error) {
      console.error(
        "❌ Image editor device discovery error:",
        error
      );

      setAllowedDeviceMappings([]);
      setMappingsError(
        error.message ||
          "Failed to load assigned devices."
      );
    } finally {
      setMappingsLoading(false);
    }
  };

  const fetchMappedFields = async (
    mapping = selectedMapping
  ) => {
    const source = normalizeSource(mapping);

    if (
      !source.bucket ||
      !source.measurement ||
      !source.tagValue
    ) {
      setAvailableFields([]);
      setFieldsError(
        "Select a measurement and device before loading fields."
      );
      return;
    }

    const token = localStorage.getItem("token");

    const query = new URLSearchParams({
      bucket: source.bucket,
      measurement: source.measurement,
      tagKey: source.tagKey || "id",
      tagValue: source.tagValue,
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
            "Failed to load fields for the selected device."
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
        "❌ Image editor field error:",
        error
      );

      setAvailableFields([]);
      setFieldsError(
        error.message ||
          "Failed to load fields for the selected device."
      );
    } finally {
      setFieldsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllowedMappings();

  }, []);

  useEffect(() => {
    if (!mappingReady) {
      setAvailableFields([]);
      return;
    }

    fetchMappedFields(selectedMapping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMapping.bucket,
    selectedMapping.measurement,
    selectedMapping.tagKey,
    selectedMapping.tagValue,
  ]);



  const updateWidgetPins = (
    updatedPins,
    nextDataOptions = imageDataOptions
  ) => {
    const dedupedOptions =
      deduplicateDataOptions(nextDataOptions);

    setWidget((currentWidget) => ({
      ...currentWidget,
      image:
        currentWidget?.image ||
        widget?.image ||
        null,
      designerSnapshot:
        currentWidget?.designerSnapshot ||
        widget?.designerSnapshot,
      imageDataMapping: {
        ...normalizeSource(selectedMapping),
      },
      customDataOptions: dedupedOptions,
      pins: updatedPins,
    }));
  };

  const updatePin = (
    index,
    changes,
    nextDataOptions = imageDataOptions
  ) => {
    const updatedPins = pins.map(
      (pin, currentIndex) =>
        currentIndex === index
          ? {
              ...pin,
              ...changes,
            }
          : pin
    );

    updateWidgetPins(
      updatedPins,
      nextDataOptions
    );
  };

  const handleCanvasClick = ({ x, y }) => {
    if (!mappingReady) {
      setFieldsError(
        "Select a measurement and device before adding live data overlays."
      );
      return;
    }

    const updatedPins = [
      ...pins,
      {
        id: `pin-${Date.now()}-${pins.length}`,
        x,
        y,
        dataKey: "",
        source: null,
        locked: false,
        visualType: "pin",
        display: {
          ...defaultOverlayDisplay,
        },
        rangeConfig: {
          ...defaultOverlayRange,
        },
      },
    ];

    updateWidgetPins(updatedPins);
  };

  const handlePointerDown = (event, index) => {
    event.preventDefault();
    event.stopPropagation();

    if (pins[index]?.locked) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedOverlayIndex(index);
    setDragIndex(index);
  };

  const handleCanvasPointerMove = ({ x, y }) => {
    if (dragIndex === null || pins[dragIndex]?.locked) {
      return;
    }

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

  const duplicatePin = (index) => {
    const sourcePin = pins[index];
    if (!sourcePin) return;

    const duplicate = {
      ...sourcePin,
      id: `pin-${Date.now()}-${pins.length}`,
      x: clamp(
        Number(sourcePin.x || 0) + 4,
        0,
        100
      ),
      y: clamp(
        Number(sourcePin.y || 0) + 4,
        0,
        100
      ),
      locked: false,
      display: {
        ...defaultOverlayDisplay,
        ...(sourcePin.display || {}),
      },
      rangeConfig: {
        ...defaultOverlayRange,
        ...(sourcePin.rangeConfig || {}),
      },
    };

    updateWidgetPins([
      ...pins,
      duplicate,
    ]);
  };

  const getPinLabel = (pin, index) =>
    getAllKnownDataOptions().find(
      (item) =>
        item.key === pin?.dataKey
    )?.label ||
    (pin?.source?.field ||
    pin?.source?.channel
      ? formatFieldLabel(
          pin.source.field ||
            pin.source.channel
        )
      : pin?.dataKey
      ? formatFieldLabel(pin.dataKey)
      : `Overlay #${index + 1}`);


  // The editor uses the SAME overlay renderer as the dashboard.
  // When live dashboard values are not available in this full-screen editor,
  // generate deterministic preview values only for the number itself; the
  // overlay shape, scale, status styling, position and image sizing are shared.
  const editorPreviewValues = useMemo(() => {
    const values = {
      ...(widget?.previewValues || {}),
    };

    const knownOptions =
      getAllKnownDataOptions();

    pins.forEach((pin, index) => {
      if (!pin?.dataKey || values[pin.dataKey] !== undefined) {
        return;
      }

      const option = knownOptions.find(
        (item) => item.key === pin.dataKey
      );

      const range = {
        min: 0,
        max: 100,
        ...(option?.rangeConfig || {}),
        ...(pin?.rangeConfig || {}),
      };

      const min = Number(range.min);
      const max = Number(range.max);
      const safeMin = Number.isFinite(min) ? min : 0;
      const safeMax =
        Number.isFinite(max) && max > safeMin
          ? max
          : safeMin + 100;

      const ratio = 0.62 + (index % 4) * 0.055;
      values[pin.dataKey] =
        safeMin + (safeMax - safeMin) * ratio;
    });

    return values;
  }, [
    pins,
    imageDataOptions,
    allDataOptions,
    widget?.previewValues,
  ]);

  const editorPreviewHistory = useMemo(() => {
    if (Array.isArray(widget?.previewHistory) && widget.previewHistory.length) {
      return widget.previewHistory;
    }

    return Array.from({ length: 24 }, (_, pointIndex) => {
      const row = { timestamp: pointIndex };

      pins.forEach((pin, pinIndex) => {
        if (!pin?.dataKey) return;

        const base = Number(editorPreviewValues[pin.dataKey]);
        if (!Number.isFinite(base)) return;

        row[pin.dataKey] =
          base + Math.sin((pointIndex + pinIndex) / 2.6) * Math.max(1, Math.abs(base) * 0.045);
      });

      return row;
    });
  }, [pins, editorPreviewValues, widget?.previewHistory]);

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
      imageDataMapping: {
        ...normalizeSource(selectedMapping),
      },
      customDataOptions:
        deduplicateDataOptions(
          imageDataOptions
        ),
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
          background: #020617;
          color: #e2e8f0;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-shell {
          background-color: #020617 !important;
          color: #e2e8f0 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-workspace {
          background-color: #07101f !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-canvas {
          background-color: #020617 !important;
          border-color: #334155 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-sidebar {
          background-color: #0b1220 !important;
          border-color: #334155 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-card {
          background-color: #111827 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-empty {
          background-color: #0f172a !important;
          border-color: #475569 !important;
          color: #e2e8f0 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-help {
          background-color: rgba(15, 23, 42, 0.94) !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-muted {
          color: #94a3b8 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-primary {
          color: #f8fafc !important;
        }

        .image-widget-editor-theme[data-theme="dark"] input,
        .image-widget-editor-theme[data-theme="dark"] select,
        .image-widget-editor-theme[data-theme="dark"] textarea {
          background-color: #020617 !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }

        .image-widget-editor-theme[data-theme="dark"] input::placeholder,
        .image-widget-editor-theme[data-theme="dark"] textarea::placeholder {
          color: #64748b !important;
        }

        .image-widget-editor-theme[data-theme="dark"] option {
          background-color: #020617;
          color: #f8fafc;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-unlocked {
          background-color: #1e293b !important;
          border-color: #475569 !important;
          color: #e2e8f0 !important;
        }

        .image-widget-editor-theme[data-theme="dark"] .image-editor-locked {
          background-color: rgba(16, 185, 129, 0.12) !important;
          border-color: rgba(16, 185, 129, 0.45) !important;
          color: #6ee7b7 !important;
        }
      `}</style>

      <div className="image-editor-shell flex h-full w-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
        {/* IMAGE WORKSPACE */}
        <div className="image-editor-workspace relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white p-5 dark:bg-[#07101f]">
          {/* TOOLBAR */}
          <div
            className="
              z-30 flex shrink-0
              items-center justify-between
              gap-4 rounded-2xl
              border px-4 py-3
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
                  inline-flex h-10 w-10
                  shrink-0 items-center justify-center
                  rounded-xl border
                  transition
                "
                style={{
                  backgroundColor: isDarkMode
                    ? "#1e293b"
                    : "#f1f5f9",
                  borderColor: isDarkMode
                    ? "#475569"
                    : "#cbd5e1",
                  color: isDarkMode
                    ? "#f8fafc"
                    : "#334155",
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
                        ? "#34d399"
                        : "#059669",
                    }}
                  />

                  <h1
                    className="truncate text-base font-black"
                    style={{
                      color: isDarkMode
                        ? "#f8fafc"
                        : "#0f172a",
                    }}
                  >
                    Interactive Process Image Editor
                  </h1>
                </div>

                <p
                  className="mt-0.5 truncate text-xs"
                  style={{
                    color: isDarkMode
                      ? "#cbd5e1"
                      : "#64748b",
                  }}
                >
                  Choose a measurement and device, then place live data overlays and map each overlay to a field.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className="hidden rounded-xl border px-3 py-2 text-right sm:block"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(15, 23, 42, 0.9)"
                    : "#f8fafc",
                  borderColor: isDarkMode
                    ? "#475569"
                    : "#cbd5e1",
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{
                    color: isDarkMode
                      ? "#6ee7b7"
                      : "#059669",
                  }}
                >
                  Data overlays
                </p>

                <p
                  className="mt-0.5 text-xs font-extrabold"
                  style={{
                    color: isDarkMode
                      ? "#f8fafc"
                      : "#0f172a",
                  }}
                >
                  {pins.length} overlay{pins.length === 1 ? "" : "s"}
                </p>
              </div>

              {typeof toggleTheme === "function" && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="
                    inline-flex h-10 w-10
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
                disabled={
                  !mappingReady &&
                  !pins.some(
                    (pin) =>
                      pin?.source?.measurement &&
                      (
                        pin?.source?.tagValue ||
                        pin?.source?.id
                      )
                  )
                }
                className="
                  inline-flex h-10
                  items-center gap-2 rounded-xl
                  bg-emerald-600 px-4
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

          {/* CANVAS / TRUE RUNTIME PREVIEW */}
          <div
            className="
              image-editor-canvas
              relative mt-4 min-h-0 flex-1
              overflow-hidden rounded-2xl
              border border-slate-200
              bg-white
              shadow-inner
              dark:border-slate-700
              dark:bg-slate-950
            "
          >
            <ImageOverlayCanvas
              image={widget?.image}
              pins={pins}
              valueMap={editorPreviewValues}
              history={editorPreviewHistory}
              customDataOptions={getAllKnownDataOptions()}
              renderUnmapped
              editorMode
              draggingIndex={dragIndex}
              selectedIndex={selectedOverlayIndex}
              onCanvasClick={handleCanvasClick}
              onCanvasPointerMove={handleCanvasPointerMove}
              onOverlayPointerDown={handlePointerDown}
              onOverlayClick={(_, index) =>
                setSelectedOverlayIndex(index)
              }
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onPointerLeave={stopDragging}
              imageAlt={widget?.label || "System process diagram"}
            />

            {!widget?.image?.originalSrc &&
              !widget?.image?.croppedSrc && (
                <div
                  className="
                    absolute bottom-4 left-4 z-30
                    rounded-xl border
                    border-amber-300
                    bg-amber-50 px-4 py-2
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

            {pins.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-6">
                <div
                  className="
                    image-editor-help
                    rounded-2xl border
                    border-slate-200
                    bg-white/90 px-4 py-3
                    text-center shadow-lg
                    backdrop-blur
                    dark:border-slate-700
                    dark:bg-slate-900/90
                  "
                >
                  <p className="image-editor-primary text-xs font-bold text-slate-700 dark:text-slate-200">
                    Click anywhere on the diagram to add a live data overlay.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PIN SETTINGS */}
        <div className="image-editor-sidebar w-[380px] overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0b1220]">
          <div
            className="sticky top-0 z-10 border-b p-5 backdrop-blur-xl"
            style={{
              backgroundColor: isDarkMode
                ? "rgba(15, 23, 42, 0.98)"
                : "rgba(255, 255, 255, 0.98)",
              borderColor: isDarkMode
                ? "#334155"
                : "#e2e8f0",
              boxShadow: isDarkMode
                ? "0 10px 24px rgba(0,0,0,0.18)"
                : "0 8px 20px rgba(15,23,42,0.06)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex h-10 w-10 shrink-0
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
                      ? "#f8fafc"
                      : "#0f172a",
                  }}
                >
                  Overlay Settings
                </h2>

                <p
                  className="mt-1 text-xs leading-5"
                  style={{
                    color: isDarkMode
                      ? "#cbd5e1"
                      : "#64748b",
                  }}
                >
                  Choose the active measurement/device, map overlays to its fields, and switch devices whenever needed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div
              className={`
                rounded-2xl border p-4
                ${
                  mappingReady
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
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
                      Image Data Mapping
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Choose which measurement and device supplies fields for the overlays you are configuring.
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

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Measurement
                  </span>

                  <select
                    value={
                      measurementOptions.some(
                        (option) =>
                          option.key ===
                          selectedMeasurementKey
                      )
                        ? selectedMeasurementKey
                        : ""
                    }
                    onChange={(event) => {
                      const key =
                        event.target.value;

                      const measurement =
                        measurementOptions.find(
                          (option) =>
                            option.key === key
                        );

                      updateSelectedMapping(
                        measurement
                          ? {
                              bucket:
                                measurement.bucket,
                              measurement:
                                measurement.measurement,
                              tagKey: "id",
                              tagValue: "",
                            }
                          : {
                              bucket: "",
                              measurement: "",
                              tagKey: "id",
                              tagValue: "",
                            }
                      );
                    }}
                    disabled={
                      mappingsLoading &&
                      !measurementOptions.length
                    }
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
                      {mappingsLoading
                        ? "Loading measurements..."
                        : "Select measurement"}
                    </option>

                    {measurementOptions.map(
                      (option) => (
                        <option
                          key={option.key}
                          value={option.key}
                        >
                          {option.bucket} / {option.measurement}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Device
                  </span>

                  <select
                    value={
                      deviceOptions.some(
                        (option) =>
                          getSourceIdentity(
                            option
                          ) ===
                          selectedDeviceKey
                      )
                        ? selectedDeviceKey
                        : ""
                    }
                    onChange={(event) => {
                      const identity =
                        event.target.value;

                      const next =
                        deviceOptions.find(
                          (option) =>
                            getSourceIdentity(
                              option
                            ) === identity
                        );

                      if (next) {
                        updateSelectedMapping(next);
                      }
                    }}
                    disabled={
                      !selectedMeasurementKey ||
                      !deviceOptions.length
                    }
                    className="
                      mt-2 w-full rounded-xl
                      border border-slate-300
                      bg-white px-3 py-2.5
                      text-sm text-slate-900
                      outline-none transition
                      focus:border-emerald-500
                      focus:ring-2
                      focus:ring-emerald-500/20
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      dark:border-slate-600
                      dark:bg-slate-950
                      dark:text-white
                    "
                  >
                    <option value="">
                      {selectedMeasurementKey
                        ? deviceOptions.length
                          ? "Select device"
                          : "No device available"
                        : "Select measurement first"}
                    </option>

                    {deviceOptions.map(
                      (option) => (
                        <option
                          key={
                            getSourceIdentity(
                              option
                            )
                          }
                          value={
                            getSourceIdentity(
                              option
                            )
                          }
                        >
                          {option.deviceName ||
                            option.tagValue}
                          {" · "}
                          {option.tagKey}={option.tagValue}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {mappingReady && (
                  <div className="grid grid-cols-1 gap-2 text-[11px]">
                    <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-950/60">
                      <span className="font-black uppercase tracking-wider text-slate-400">
                        Active Source
                      </span>
                      <p className="mt-1 truncate font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {selectedMapping.bucket} / {selectedMapping.measurement}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-950/60">
                      <span className="font-black uppercase tracking-wider text-slate-400">
                        Active Device
                      </span>
                      <p className="mt-1 truncate font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {selectedMapping.tagKey}={selectedMapping.tagValue}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {mappingsError && (
                <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs font-semibold text-amber-700 dark:bg-slate-950/50 dark:text-amber-300">
                  {mappingsError}
                </p>
              )}

              {!mappingReady &&
                !mappingsLoading &&
                !mappingsError && (
                  <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs font-semibold text-amber-700 dark:bg-slate-950/50 dark:text-amber-300">
                    Select a measurement and device. Existing Template Designer mappings remain available as a starting option.
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
                  onClick={() =>
                    fetchMappedFields(
                      selectedMapping
                    )
                  }
                  disabled={
                    fieldsLoading ||
                    !mappingReady
                  }
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
                  rounded-2xl border
                  border-dashed border-slate-300
                  bg-white px-5 py-10
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
                  No overlays added
                </p>

                <p className="image-editor-muted mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Click the process image to create the first live data overlay.
                </p>
              </div>
            )}

            {pins.map((pin, index) => (
              <div
                key={pin.id || index}
                className="
                  image-editor-card
                  rounded-2xl border
                  border-slate-200 bg-white
                  p-4 shadow-sm
                  dark:border-slate-700
                  dark:bg-[#111827]
                "
              >
                <div className="mb-4 flex items-center justify-between">
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
                        Overlay {index + 1}
                      </p>

                      <p className="image-editor-muted text-[10px] text-slate-400">
                        X {Number(pin.x || 0).toFixed(1)}% · Y{" "}
                        {Number(pin.y || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicatePin(index)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sky-500 transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                      aria-label={`Duplicate overlay ${index + 1}`}
                      title={`Duplicate overlay ${index + 1}`}
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removePin(index)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                      aria-label={`Delete overlay ${index + 1}`}
                      title={`Delete overlay ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Process field
                </label>

                <select
                  value={pin.dataKey || ""}
                  onChange={(event) => {
                    const selectedKey =
                      event.target.value;

                    const selectedOption =
                      allDataOptions.find(
                        (item) =>
                          item.key ===
                          selectedKey
                      );

                    if (!selectedKey) {
                      updatePin(index, {
                        dataKey: "",
                        source: null,
                      });
                      return;
                    }

                    if (!selectedOption) {
                      return;
                    }

                    const nextOptions =
                      deduplicateDataOptions([
                        ...imageDataOptions,
                        selectedOption,
                      ]);

                    setImageDataOptions(
                      nextOptions
                    );

                    updatePin(
                      index,
                      {
                        dataKey:
                          selectedOption.key,
                        source: {
                          ...selectedOption.source,
                        },
                        display: {
                          ...defaultOverlayDisplay,
                          ...(pin.display || {}),
                        },
                        rangeConfig: {
                          ...defaultOverlayRange,
                          ...(selectedOption.rangeConfig || {}),
                          ...(pin.rangeConfig || {}),
                          unit:
                            pin.rangeConfig?.unit ||
                            selectedOption.rangeConfig?.unit ||
                            selectedOption.unit ||
                            "",
                        },
                      },
                      nextOptions
                    );
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
                        {getPinLabel(
                          pin,
                          index
                        )}
                        {" · saved mapping"}
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

                {pin?.source && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[9px] dark:border-slate-700 dark:bg-slate-950/60">
                    <p className="font-black uppercase tracking-wider text-slate-400">
                      Saved Overlay Source
                    </p>
                    <p className="mt-1 truncate font-mono text-slate-600 dark:text-slate-300">
                      {pin.source.bucket || "—"} / {pin.source.measurement || "—"}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-slate-500 dark:text-slate-400">
                      {pin.source.tagKey || "id"}={pin.source.tagValue || pin.source.id || "—"}
                      {" · "}
                      {pin.source.field || pin.source.channel || "—"}
                    </p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Visualization
                    </span>
                    <select
                      value={pin.visualType || "pin"}
                      onChange={(event) =>
                        updatePin(index, {
                          visualType: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    >
                      {IMAGE_OVERLAY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} · {type.description}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Display Label
                    </span>
                    <input
                      type="text"
                      value={pin.display?.label || ""}
                      onChange={(event) =>
                        updatePin(index, {
                          display: {
                            ...defaultOverlayDisplay,
                            ...(pin.display || {}),
                            label: event.target.value,
                          },
                        })
                      }
                      placeholder={getPinLabel(pin, index)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Size
                      </span>
                      <select
                        value={pin.display?.scale || "medium"}
                        onChange={(event) =>
                          updatePin(index, {
                            display: {
                              ...defaultOverlayDisplay,
                              ...(pin.display || {}),
                              scale: event.target.value,
                            },
                          })
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </label>

                    <label>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Decimals
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={pin.display?.decimals ?? 1}
                        onChange={(event) =>
                          updatePin(index, {
                            display: {
                              ...defaultOverlayDisplay,
                              ...(pin.display || {}),
                              decimals: Math.min(
                                4,
                                Math.max(0, Number(event.target.value) || 0)
                              ),
                            },
                          })
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Value Range & Status
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        ["min", "Minimum"],
                        ["max", "Maximum"],
                        ["warning", "Warning"],
                        ["danger", "Critical"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                            {label}
                          </span>
                          <input
                            type="number"
                            value={pin.rangeConfig?.[key] ?? defaultOverlayRange[key]}
                            onChange={(event) =>
                              updatePin(index, {
                                rangeConfig: {
                                  ...defaultOverlayRange,
                                  ...(pin.rangeConfig || {}),
                                  [key]: Number(event.target.value),
                                },
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          />
                        </label>
                      ))}
                    </div>

                    <label className="mt-2 block">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                        Unit
                      </span>
                      <input
                        type="text"
                        value={pin.rangeConfig?.unit || ""}
                        onChange={(event) =>
                          updatePin(index, {
                            rangeConfig: {
                              ...defaultOverlayRange,
                              ...(pin.rangeConfig || {}),
                              unit: event.target.value,
                            },
                          })
                        }
                        placeholder="bar, °C, %, t/h"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["showLabel", "Show Label"],
                      ["showStatus", "Show Status"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
                      >
                        {label}
                        <input
                          type="checkbox"
                          checked={
                            pin.display?.[key] !== false
                          }
                          onChange={(event) =>
                            updatePin(index, {
                              display: {
                                ...defaultOverlayDisplay,
                                ...(pin.display || {}),
                                [key]: event.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 accent-emerald-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updatePin(index, {
                      locked: !pin.locked,
                    })
                  }
                  className={`
                    mt-4 flex w-full
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

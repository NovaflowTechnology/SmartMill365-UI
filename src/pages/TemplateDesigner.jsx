import { useState, useEffect, useRef } from "react";
import { widgetLibrary } from "../data/widgetLibrary";
import WidgetRenderer from "../components/WidgetRenderer";
import { defaultSankeyConfig } from "../widgets/SankeyWidget";
import {
  filterMeasurementsByGroup,
  formatMeasurementLabel,
  getMeasurementGroup,
  getMeasurementGroupOptions,
  groupMeasurements,
} from "../utils/measurementGroups";
import {
  COMPOSITE_PRESETS,
  DEFAULT_COMPOSITE_CONFIG,
  getCompositePreset,
  getCompatibleCompositePresets,
} from "../data/compositeWidgets";

import {
  AlertCircle,
  CheckCircle2,
  Save,
  LayoutGrid,
  Plus,
  Trash2,
  Pencil,
  X,
  Move,
  Database,
  RefreshCw,
  ChevronRight,
  Check,
  ScrollText,
} from "lucide-react";

const GRID_MIN_ROWS = 1;
const GRID_MIN_COLS = 1;
const GRID_MAX_ROWS = 12;
const GRID_MAX_COLS = 12;

const sizeOptions = [
  { label: "1×1", w: 1, h: 1 },
  { label: "2×1", w: 2, h: 1 },
  { label: "1×2", w: 1, h: 2 },
  { label: "2×2", w: 2, h: 2 },
  { label: "3×1", w: 3, h: 1 },
  { label: "1×3", w: 1, h: 3 },
  { label: "3×2", w: 3, h: 2 },
  { label: "4×1", w: 4, h: 1 },
  { label: "4×2", w: 4, h: 2 },
];

// Image diagrams are easier to read in landscape cards.
const imageSizeOptions = [
  { label: "2×1", w: 2, h: 1 },
  { label: "3×1", w: 3, h: 1 },
  { label: "2×2", w: 2, h: 2 },
  { label: "4×2", w: 4, h: 2 },
  { label: "4×3", w: 4, h: 3 },
];

const commonUnitOptions = [
  "",
  "bar",
  "kPa",
  "Pa",
  "°C",
  "%",
  "kg/h",
  "t/h",
  "m³/h",
  "L/min",
  "rpm",
  "A",
  "V",
];

const defaultImageDraft = {
  originalSrc: "",
  croppedSrc: "",
  crop: null,
  fileName: "",
  fileType: "",
};

const defaultBigNumberDisplay = {
  mode: "number",

  style: "modern",
  showLabel: true,
  showUnit: true,
  showTrend: true,
  showRawValue: false,

  decimals: 1,
  unit: "",
  alignment: "center",
  valueSize: "large",
  valueColor: "default",
  trendThreshold: 0.5,

  mappings: [
    {
      value: 0,
      text: "OFF",
      color: "red",
    },
    {
      value: 1,
      text: "MANUAL",
      color: "amber",
    },
    {
      value: 2,
      text: "AUTO",
      color: "green",
    },
    {
      value: 3,
      text: "MANUAL INLET",
      color: "orange",
    },
  ],

  fallbackText: "",
  fallbackColor: "default",

  // Combined Stat + Machine Status mode.
  statusDataKey: "",
  statusLabel: "Machine Status",
  statusSource: "mapping",
  showProgress: true,
};

const defaultRangeConfig = {
  min: 0,
  max: 100,
  unit: "",
  warning: 80,
  danger: 90,
};

const defaultLogDisplay = {
  showTimestamp: true,
  showSource: true,
  showLevel: true,
  showSearch: true,
  compact: false,
  maxEntries: 50,
  sortOrder: "newest",
  levelFilter: [
    "info",
    "success",
    "warning",
    "error",
  ],
};

const defaultChartDisplay = {
  showGrid: true,
  showLegend: true,
  showTooltip: true,
  showXAxis: true,
  showYAxis: true,
  showDots: false,
  xAxisFormat: "auto",
  xAxisTickGap: 30,
  yAxisMode: "range",
  yAxisMin: "",
  yAxisMax: "",
  yAxisTickCount: 5,
  strokeWidth: 2.5,
  lineWeight: "normal",
  linePattern: "solid",
  curveType: "linear",

  // LineWidget now owns both visual styles.
  // The widget type remains "line".
  chartStyle: "line", // "line" | "area"
  areaOpacity: 0.34,
  areaEndOpacity: 0.025,
};

const defaultHistoryWindow = "15m";

const previewLogs = [
  {
    id: "preview-log-1",
    timestamp: new Date(
      Date.now() - 30 * 1000
    ).toISOString(),
    level: "warning",
    source: "Sterilizer 2",
    message:
      "Steam pressure exceeded the configured warning threshold.",
  },
  {
    id: "preview-log-2",
    timestamp: new Date(
      Date.now() - 95 * 1000
    ).toISOString(),
    level: "success",
    source: "Device 01",
    message:
      "Influx device connection restored successfully.",
  },
  {
    id: "preview-log-3",
    timestamp: new Date(
      Date.now() - 4 * 60 * 1000
    ).toISOString(),
    level: "info",
    source: "Template",
    message:
      "Dashboard configuration was updated.",
  },
  {
    id: "preview-log-4",
    timestamp: new Date(
      Date.now() - 7 * 60 * 1000
    ).toISOString(),
    level: "error",
    source: "InfluxDB",
    message:
      "Failed to retrieve the latest channel value.",
  },
];

const supportsRangeConfiguration = (
  type,
  displayMode = "number"
) => {
  if (
    ["image", "status", "sankey", "logs"].includes(type)
  ) {
    return false;
  }

  if (
    type === "bignumber" &&
    displayMode === "valueMapping"
  ) {
    return false;
  }

  return true;
};

const defaultInfluxConfig = {
  bucket: "",
  measurement: "",
  tagKey: "id",
  id: "",
  tagValue: "",
};

const defaultChannelMap = {};

// SAMPLE DATA FOR BUILDER PREVIEW
const previewData = {
  steamPressure: 31.2,
  steamFlowrate: 44.1,
  steamOutletTemp: 0,
  inletDraft: 36.6,
  outletDraft: 999.9,
  furnaceDraft: 4.3,
  waterInletTemp: 102,
  waterFlowrate: 33,
  waterDrumLevel: 51,
  vgPressure: 999.9,
  vgInletTemp: 0,
  vgOutletTemp: 0,

  // Channel-style preview values for Sankey and custom channel previews.
  ch1: 31.2,
  ch2: 44.1,
  ch3: 120,
  ch4: 36.6,
  ch5: 999.9,
  ch6: 4.3,
  ch8: 102,
  ch9: 33,
  ch10: 51,
  ch11: 999.9,
  ch12: 90,
  ch13: 80,
};

// SAMPLE HISTORY FOR LINE WIDGET PREVIEW (Line / Area styles)
const previewHistory = Array.from(
  { length: 20 },
  (_, i) => ({
    timestamp:
      Date.now() - (20 - i) * 2000,

    time: new Date(
      Date.now() - (20 - i) * 2000
    ).toLocaleTimeString(),

    date: new Date().toLocaleDateString(),

    steamPressure: 28 + Math.random() * 6,
    steamFlowrate: 40 + Math.random() * 8,
    steamOutletTemp: Math.random() * 5,
    inletDraft: 20 + Math.random() * 4,
    outletDraft: 960 + Math.random() * 40,
    furnaceDraft: 20 + Math.random() * 4,
    waterInletTemp: 98 + Math.random() * 8,
    waterFlowrate: 30 + Math.random() * 6,
    waterDrumLevel: 48 + Math.random() * 6,
    vgPressure: 960 + Math.random() * 40,
    vgInletTemp: Math.random() * 5,
    vgOutletTemp: Math.random() * 5,
  })
);

const createSafeDataKey = (value) => {
  const words = String(value || "customData")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const camelCase = words
    .map((word, index) => {
      const lower = word.toLowerCase();

      if (index === 0) {
        return lower;
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  const safeKey = camelCase || "customData";

  return /^[A-Za-z_]/.test(safeKey)
    ? safeKey
    : `custom${safeKey}`;
};

const getUniqueDataKey = (baseKey, options) => {
  let uniqueKey = baseKey;
  let counter = 2;

  while (options.some((option) => option.key === uniqueKey)) {
    uniqueKey = `${baseKey}${counter}`;
    counter += 1;
  }

  return uniqueKey;
};

const formatInfluxFieldLabel = (field = "") =>
  String(field)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

const deduplicateDataOptions = (options = []) => {
  const seen = new Set();

  return options.filter((option) => {
    const key = String(option?.key || "").trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const InfluxMetadataList = ({
  title,
  values = [],
  activeValue = "",
  emptyText,
  onSelect,
  groupedMeasurements = false,
}) => (
  <div
    className="
      min-w-0 rounded-2xl border
      border-slate-200 bg-slate-50 p-3
      dark:border-slate-700
      dark:bg-slate-950/70
    "
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <p
        className="
          text-[10px] font-black
          uppercase tracking-wider
          text-slate-500 dark:text-slate-300
        "
      >
        {title}
      </p>

      <span
        className="
          rounded-full bg-white
          px-2 py-0.5
          text-[10px] font-bold
          text-slate-600
          dark:bg-slate-800
          dark:text-slate-200
        "
      >
        {values.length}
      </span>
    </div>

    <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
      {values.length === 0 ? (
        <p
          className="
            rounded-xl px-2 py-3
            text-center text-[11px]
            text-slate-400 dark:text-slate-500
          "
        >
          {emptyText}
        </p>
      ) : groupedMeasurements ? (
        groupMeasurements(values).map((group) => (
          <div key={group.key} className="space-y-1">
            <div
              className="
                sticky top-0 z-[1]
                flex items-center justify-between
                rounded-lg bg-slate-100
                px-2 py-1.5
                text-[9px] font-black
                uppercase tracking-[0.08em]
                text-slate-500
                dark:bg-slate-800
                dark:text-slate-400
              "
            >
              <span>{group.label}</span>
              <span>{group.measurements.length}</span>
            </div>

            {group.measurements.map((value) => {
              const selected =
                String(value) === String(activeValue);

              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => onSelect?.(value)}
                  className={`
                    flex w-full items-center
                    justify-between gap-2
                    rounded-xl px-2.5 py-2
                    text-left text-[11px]
                    font-semibold transition
                    ${
                      selected
                        ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40"
                        : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                    }
                  `}
                  title={value}
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {formatMeasurementLabel(value)}
                    </span>
                    <span
                      className="
                        block truncate font-mono
                        text-[9px] font-normal
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      {value}
                    </span>
                  </span>

                  {onSelect && (
                    <ChevronRight
                      size={13}
                      className="shrink-0 opacity-60"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))
      ) : (
        values.map((value) => {
          const selected =
            String(value) === String(activeValue);

          return (
            <button
              key={String(value)}
              type="button"
              onClick={() => onSelect?.(value)}
              className={`
                flex w-full items-center
                justify-between gap-2
                rounded-xl px-2.5 py-2
                text-left text-[11px]
                font-semibold transition
                ${
                  selected
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40"
                    : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                }
              `}
            >
              <span className="truncate font-mono">
                {value}
              </span>

              {onSelect && (
                <ChevronRight
                  size={13}
                  className="shrink-0 opacity-60"
                />
              )}
            </button>
          );
        })
      )}
    </div>
  </div>
);

export default function TemplateDesigner({
  mode = "create",
  setPage,
  selectedTemplate,
  editingImageWidget,
  setEditingImageWidget,
  editingSankeyWidget,
  setEditingSankeyWidget,
}) {
  const gridRef = useRef(null);

  const isEditingTemplate = mode === "edit";
  const designerPage = isEditingTemplate ? "editor" : "builder";

  // GRID SIZE
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);

  // Available viewport space below the builder controls.
  // Small grids stretch to fill the page; large grids grow and scroll.
  const [
    gridViewportHeight,
    setGridViewportHeight,
  ] = useState(520);

  // STATES
  const [items, setItems] = useState([]);

  const [templateName, setTemplateName] =
    useState("");

  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const [activeCell, setActiveCell] =
    useState(null);

  const [activeItemId, setActiveItemId] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  // RESIZABLE WIDGET STUDIO
  // Vertical split = preview/source workspace vs widget settings.
  // Horizontal split = live preview vs data-source configuration.
  const studioBodyRef = useRef(null);
  const studioLeftRef = useRef(null);

  const [studioSplit, setStudioSplit] =
    useState(72);

  const [previewSplit, setPreviewSplit] =
    useState(58);

  const [
    studioResizeMode,
    setStudioResizeMode,
  ] = useState(null);

  // WIDGET SETUP WIZARD
  const [widgetStep, setWidgetStep] =
    useState(1);

  const [newType, setNewType] = useState(
    widgetLibrary[0].type
  );

  const [newDataKey, setNewDataKey] =
    useState("");

  const [newDataKeys, setNewDataKeys] =
    useState([]);

  // The widget wizard now starts with Data Source.
  // "Dedicated" is used for widgets such as Logs, Data Status,
  // Image and Sankey that do not select a normal single Influx field.
  const [
    useDedicatedWidgetSource,
    setUseDedicatedWidgetSource,
  ] = useState(false);

  const [newLabel, setNewLabel] =
    useState("");

  const [
    newOrientation,
    setNewOrientation,
  ] = useState("vertical");

  const [newW, setNewW] = useState(1);
  const [newH, setNewH] = useState(1);

  const [
    newBigNumberDisplay,
    setNewBigNumberDisplay,
  ] = useState({
    ...defaultBigNumberDisplay,
  });

  const [newRangeConfig, setNewRangeConfig] = useState({
    ...defaultRangeConfig,
  });

  const [
    newLogDisplay,
    setNewLogDisplay,
  ] = useState({
    ...defaultLogDisplay,
  });

  const [
    newChartDisplay,
    setNewChartDisplay,
  ] = useState({
    ...defaultChartDisplay,
  });

  const [
    newHistoryWindow,
    setNewHistoryWindow,
  ] = useState(defaultHistoryWindow);

  const [
    newCompositeConfig,
    setNewCompositeConfig,
  ] = useState({
    ...DEFAULT_COMPOSITE_CONFIG,
  });

  const [customDataOptions, setCustomDataOptions] = useState([]);

  const [customDataDraft, setCustomDataDraft] = useState({
    label: "",
    key: "",
    channel: "",
    unit: "",
  });

  const [showCustomDataModal, setShowCustomDataModal] = useState(false);

  const [customWidgetTypes, setCustomWidgetTypes] = useState([]);

  const [customWidgetDraft, setCustomWidgetDraft] = useState({
    label: "",
    baseType: widgetLibrary[0]?.type || "bignumber",
    description: "",
  });

  const [showCustomWidgetModal, setShowCustomWidgetModal] = useState(false);

  const [newWidgetTypeId, setNewWidgetTypeId] = useState("");

  // Pins are kept locally while the image widget is still being configured.
  // This prevents a new image draft from being added to the grid too early.
  const [imageDraftPins, setImageDraftPins] = useState([]);

  // Uploaded image is kept locally while the image widget is still being configured.
  // The croppedSrc currently uses the original image. Cropping can be added later.
  const [imageDraft, setImageDraft] = useState(defaultImageDraft);

  // =====================================
  // WIDGET-LEVEL INFLUX SOURCE CONFIGURATION
  // =====================================
  const role = localStorage.getItem("role");

  const isSuperadmin =
    role === "superadmin";

  const isOrganizationAdmin =
    role === "admin";

  const canConfigureInflux =
    isSuperadmin || isOrganizationAdmin;

  const [influxConfig, setInfluxConfig] =
    useState(defaultInfluxConfig);

  const [channelMap, setChannelMap] =
    useState(defaultChannelMap);

  // Superadmins can browse all Influx metadata. Organization admins can only
  // select a device explicitly assigned to their own organization.
  const [availableDevices, setAvailableDevices] =
    useState([]);

  const [
    selectedDeviceId,
    setSelectedDeviceId,
  ] = useState("");

  // UI-only device type selection derived from measurement groups.
  // The raw Influx measurement remains the actual saved/query value.
  const [
    selectedMeasurementGroup,
    setSelectedMeasurementGroup,
  ] = useState("");

  const [influxBuckets, setInfluxBuckets] =
    useState([]);

  const [influxIds, setInfluxIds] =
    useState([]);

  // Superadmin only:
  // maps each available ID to the measurements inside the selected
  // Device Type that actually contain that ID.
  const [influxIdMeasurementMap, setInfluxIdMeasurementMap] =
    useState({});

  const [influxChannels, setInfluxChannels] =
    useState([]);

  const [influxMeasurements, setInfluxMeasurements] =
    useState([]);

  const [influxLoading, setInfluxLoading] =
    useState(false);

  const [influxError, setInfluxError] =
    useState("");

  const measurementGroupOptions =
    getMeasurementGroupOptions(influxMeasurements);

  const filteredInfluxMeasurements =
    filterMeasurementsByGroup(
      influxMeasurements,
      selectedMeasurementGroup
    );

  const measurementsForSelectedInfluxId =
    influxConfig.tagValue || influxConfig.id
      ? filteredInfluxMeasurements.filter(
          (measurement) =>
            (
              influxIdMeasurementMap[
                String(
                  influxConfig.tagValue ||
                    influxConfig.id
                )
              ] || []
            ).includes(measurement)
        )
      : [];

  // Organization permissions remain one row per
  // measurement + device ID. For Widget Studio, group those rows
  // into one logical assigned device so Admin does not see duplicates.
  const logicalAssignedDevices = (() => {
    const map = new Map();

    availableDevices.forEach(
      (device) => {
        const measurementGroup =
          getMeasurementGroup(
            device.measurement_name
          );

        const key = [
          measurementGroup.key,
          device.bucket_name || "",
          device.tag_key || "id",
          device.tag_value || "",
        ].join("::");

        if (!map.has(key)) {
          map.set(key, {
            id: key,
            key,
            bucket_name:
              device.bucket_name ||
              "",
            tag_key:
              device.tag_key ||
              "id",
            tag_value:
              device.tag_value ||
              "",
            device_name:
              device.device_name ||
              `${measurementGroup.label} · ${device.tag_value}`,
            device_type:
              measurementGroup.key,
            device_type_label:
              measurementGroup.label,
            measurements: [],
            permissionRows: [],
          });
        }

        const logical =
          map.get(key);

        if (
          device.measurement_name &&
          !logical.measurements.includes(
            device.measurement_name
          )
        ) {
          logical.measurements.push(
            device.measurement_name
          );
        }

        logical.permissionRows.push(
          device
        );
      }
    );

    return [
      ...map.values(),
    ]
      .map((logical) => ({
        ...logical,
        measurements:
          [...logical.measurements].sort(),
      }))
      .sort((a, b) => {
        const typeCompare =
          a.device_type_label.localeCompare(
            b.device_type_label
          );

        if (typeCompare) {
          return typeCompare;
        }

        return a.tag_value.localeCompare(
          b.tag_value,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  })();

  const assignedDeviceTypeOptions = [
    ...new Map(
      logicalAssignedDevices.map(
        (device) => [
          device.device_type,
          {
            key:
              device.device_type,
            label:
              device.device_type_label,
          },
        ]
      )
    ).values(),
  ];

  const filteredAssignedDevices =
    selectedMeasurementGroup
      ? logicalAssignedDevices.filter(
          (device) =>
            device.device_type ===
            selectedMeasurementGroup
        )
      : [];

  // DRAG & DROP
  const [
    draggingItemId,
    setDraggingItemId,
  ] = useState(null);

  const [
    dragOverCell,
    setDragOverCell,
  ] = useState(null);

  const [
    dragOverTrash,
    setDragOverTrash,
  ] = useState(false);

  const [
    didDrag,
    setDidDrag,
  ] = useState(false);

  // Smart drag preview. It highlights the closest valid grid position
  // for the complete widget footprint, not only the single cell under the cursor.
  const [dragPreview, setDragPreview] =
    useState(null);

  // DRAG RESIZE
  const [
    resizingItemId,
    setResizingItemId,
  ] = useState(null);

  const resizeStartRef = useRef(null);

  useEffect(() => {
    if (!studioResizeMode) return undefined;

    const previousUserSelect =
      document.body.style.userSelect;

    const previousCursor =
      document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor =
      studioResizeMode === "columns"
        ? "col-resize"
        : "row-resize";

    const handlePointerMove = (event) => {
      if (studioResizeMode === "columns") {
        const element =
          studioBodyRef.current;

        if (!element) return;

        const rect =
          element.getBoundingClientRect();

        const dividerSize = 8;
        const availableWidth =
          Math.max(
            1,
            rect.width - dividerSize
          );

        const pointerX =
          event.clientX - rect.left;

        const rawPercent =
          (pointerX / availableWidth) * 100;

        // Keep both panels usable.
        const minimumLeftPx = 520;
        const minimumRightPx = 300;

        const minimumPercent =
          Math.max(
            45,
            (minimumLeftPx /
              availableWidth) *
              100
          );

        const maximumPercent =
          Math.min(
            84,
            ((availableWidth -
              minimumRightPx) /
              availableWidth) *
              100
          );

        const safeMaximum =
          Math.max(
            minimumPercent,
            maximumPercent
          );

        setStudioSplit(
          Math.min(
            safeMaximum,
            Math.max(
              minimumPercent,
              rawPercent
            )
          )
        );

        return;
      }

      const element =
        studioLeftRef.current;

      if (!element) return;

      const rect =
        element.getBoundingClientRect();

      const dividerSize = 8;
      const availableHeight =
        Math.max(
          1,
          rect.height - dividerSize
        );

      const pointerY =
        event.clientY - rect.top;

      const rawPercent =
        (pointerY / availableHeight) *
        100;

      setPreviewSplit(
        Math.min(
          76,
          Math.max(30, rawPercent)
        )
      );
    };

    const stopResize = () => {
      setStudioResizeMode(null);
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerup",
      stopResize
    );

    window.addEventListener(
      "pointercancel",
      stopResize
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        stopResize
      );

      window.removeEventListener(
        "pointercancel",
        stopResize
      );

      document.body.style.userSelect =
        previousUserSelect;

      document.body.style.cursor =
        previousCursor;
    };
  }, [studioResizeMode]);

  // CURRENT SELECTED ITEM
  const selectedItem = items.find(
    (i) => i.id === activeItemId
  );

  const isEdit = !!selectedItem;

  // Preserve the unsaved Template Designer state while temporarily navigating
  // to a full-screen widget editor (Image / Sankey). Those pages replace this
  // component, so local React state would otherwise be recreated from defaults
  // when the user returns.
  const getDesignerSnapshot = () => ({
    rows,
    cols,
    items,
    templateName,
    influxConfig,
    channelMap,
    customDataOptions,
    customWidgetTypes,
    selectedDeviceId,
    selectedMeasurementGroup,
  });

  const restoreDesignerSnapshot = (snapshot, nextItems) => {
    if (!snapshot) return;

    setRows(Number(snapshot.rows) || 3);
    setCols(Number(snapshot.cols) || 4);
    setTemplateName(snapshot.templateName || "");
    setItems(
      Array.isArray(nextItems)
        ? nextItems
        : Array.isArray(snapshot.items)
        ? snapshot.items
        : []
    );
    setInfluxConfig({
      ...defaultInfluxConfig,
      ...(snapshot.influxConfig || {}),
    });
    setChannelMap({
      ...defaultChannelMap,
      ...(snapshot.channelMap || {}),
    });
    setCustomDataOptions(
      Array.isArray(snapshot.customDataOptions)
        ? snapshot.customDataOptions
        : []
    );
    setCustomWidgetTypes(
      Array.isArray(snapshot.customWidgetTypes)
        ? snapshot.customWidgetTypes
        : []
    );
    setSelectedDeviceId(String(snapshot.selectedDeviceId || ""));
    setSelectedMeasurementGroup(
      snapshot.selectedMeasurementGroup ||
        (snapshot.influxConfig?.measurement
          ? getMeasurementGroup(
              snapshot.influxConfig.measurement
            ).key
          : "")
    );
  };

  useEffect(() => {
    if (!isEditingTemplate || !selectedTemplate) return;

    try {
      const layout =
        typeof selectedTemplate.layout === "string"
          ? JSON.parse(selectedTemplate.layout)
          : selectedTemplate.layout || {};

      setTemplateName(selectedTemplate.name || "");
      setRows(layout?.rows || 3);
      setCols(layout?.cols || 4);
      setItems(Array.isArray(layout?.items) ? layout.items : []);

      const savedInflux = {
        ...defaultInfluxConfig,
        ...(layout?.influx || {}),
      };

      setInfluxConfig(savedInflux);
      setSelectedDeviceId(String(savedInflux.deviceId || ""));
      setSelectedMeasurementGroup(
        savedInflux.measurement
          ? getMeasurementGroup(
              savedInflux.measurement
            ).key
          : ""
      );

      const savedChannelMap = {
        ...defaultChannelMap,
        ...(layout?.channelMap || {}),
      };

      setChannelMap(savedChannelMap);

      const savedDataSources =
        layout?.dataSources &&
        typeof layout.dataSources === "object" &&
        !Array.isArray(layout.dataSources)
          ? layout.dataSources
          : {};

      const savedCustomOptions =
        Array.isArray(layout?.customDataOptions)
          ? layout.customDataOptions
          : [];

      const migratedOptions = [
        ...savedCustomOptions.map((option) => {
          if (option?.source?.field) {
            return option;
          }

          const sourceFromNewLayout =
            savedDataSources?.[option?.key];

          if (sourceFromNewLayout?.field) {
            return {
              ...option,
              source: {
                ...sourceFromNewLayout,
                channel:
                  sourceFromNewLayout.channel ||
                  sourceFromNewLayout.field,
              },
            };
          }

          const legacyField =
            savedChannelMap?.[option?.key];

          if (
            legacyField &&
            savedInflux.bucket &&
            savedInflux.measurement &&
            (
              savedInflux.tagValue ||
              savedInflux.id
            )
          ) {
            return {
              ...option,
              source: {
                bucket: savedInflux.bucket,
                measurement:
                  savedInflux.measurement,
                tagKey:
                  savedInflux.tagKey || "id",
                tagValue:
                  savedInflux.tagValue ||
                  savedInflux.id,
                id:
                  savedInflux.tagValue ||
                  savedInflux.id,
                field: legacyField,
                channel: legacyField,
              },
            };
          }

          return option;
        }),

        ...Object.entries(savedDataSources)
          .filter(
            ([key]) =>
              !savedCustomOptions.some(
                (option) => option?.key === key
              )
          )
          .map(([key, source]) => ({
            key,
            label:
              formatInfluxFieldLabel(key) ||
              key,
            unit: "",
            isCustom: true,
            source: {
              ...source,
              channel:
                source?.channel ||
                source?.field ||
                "",
            },
          })),
      ];

      setCustomDataOptions(
        deduplicateDataOptions(
          migratedOptions
        )
      );

      setCustomWidgetTypes(
        Array.isArray(layout?.customWidgetTypes)
          ? layout.customWidgetTypes
          : []
      );

      setActiveCell(null);
      setActiveItemId(null);
      setSankeyConfig(defaultSankeyConfig);
      setShowModal(false);
    } catch (err) {
      console.error("❌ Template load error:", err);
      showToast("error", "Failed to load template layout.");
    }
  }, [isEditingTemplate, selectedTemplate?.id]);

  // Sources shown in Widget Studio are created explicitly through
  // "Add Data Source". Each option owns its complete Influx source.
  const allDataOptions =
    deduplicateDataOptions(
      customDataOptions
    );

  const allWidgetOptions = [
    ...widgetLibrary.map((widget) => ({
      ...widget,
      optionId: widget.type,
      baseType: widget.type,
      isCustomWidgetType: false,
    })),
    ...customWidgetTypes.map((widget) => ({
      ...widget,
      type: widget.baseType,
      optionId: widget.id,
      icon: LayoutGrid,
      isCustomWidgetType: true,
    })),
  ];

  const dedicatedWidgetTypes = [
    "image",
    "sankey",
    "logs",
    "status",
  ];

  // Data-bound widgets are shown after selecting one or more process fields.
  // Dedicated widgets are shown after choosing the "System / Dedicated Widget"
  // option in Step 1, so Logs and Data Status never ask for a direct field.
  const wizardWidgetOptions = allWidgetOptions.filter((widget) =>
    useDedicatedWidgetSource
      ? dedicatedWidgetTypes.includes(widget.type)
      : !dedicatedWidgetTypes.includes(widget.type)
  );

  const previewValues = allDataOptions.reduce(
    (values, option, index) => ({
      ...values,
      [option.key]:
        values[option.key] !== undefined
          ? values[option.key]
          : 10 + index * 5,
    }),
    { ...previewData }
  );

  const getAvailableDataOptionsForType = (type) => {
    // These widgets do not ask the user to select a direct field:
    // - Data Status derives connection / field-health information from the mapped device.
    // - Logs uses its own log configuration.
    // - Image and Sankey use their dedicated editors.
    if (["image", "sankey", "logs", "status"].includes(type)) {
      return [];
    }

    return allDataOptions;
  };

  const availableDataOptions = getAvailableDataOptionsForType(newType);

  const getDataSourceLabel = (key) =>
    allDataOptions.find(
      (option) => option.key === key
    )?.label ||
    formatInfluxFieldLabel(key) ||
    key;

  const getFallbackWidgetLabel = (type, dataKey) => {
    if (dataKey) {
      return getDataSourceLabel(dataKey);
    }

    return getDefaultWidgetLabel(type);
  };

  const [sankeyConfig, setSankeyConfig] = useState(defaultSankeyConfig);

  const getSankeyOutputs = (config = sankeyConfig) => {
    if (Array.isArray(config?.outputs)) {
      return config.outputs;
    }

    // Backward compatibility for the old nodes + links Sankey format.
    if (Array.isArray(config?.links)) {
      const nodeMap = new Map(
        (Array.isArray(config?.nodes) ? config.nodes : []).map((node) => [
          node.id,
          node,
        ])
      );

      return config.links.map((link, index) => {
        const targetNode = nodeMap.get(link.target);

        return {
          id: link.id || `output-${index + 1}`,
          name:
            targetNode?.name ||
            link.label ||
            `Sterilizer ${index + 1}`,
          dataKey: link.dataKey || "",
          dataSource: {
            bucket: influxConfig.bucket || "",
            measurement: influxConfig.measurement || "",
            tagKey: influxConfig.tagKey || "id",
            tagValue: influxConfig.tagValue || influxConfig.id || "",
            id: influxConfig.id || "",
            channel: link.channel || channelMap?.[link.dataKey] || "",
          },
        };
      });
    }

    return [];
  };

  const getSankeyDataKeys = (config = sankeyConfig) => [
    ...new Set(
      getSankeyOutputs(config)
        .map((output) => output.dataKey)
        .filter(Boolean)
    ),
  ];

  const getConfiguredSankeyOutputs = (config = sankeyConfig) =>
    getSankeyOutputs(config).filter(
      (output) =>
        output.name &&
        (output.dataKey ||
          output.dataSource?.channel)
    );

  const getSankeyOutputSummary = (config = sankeyConfig) => {
    const configuredOutputs = getConfiguredSankeyOutputs(config);

    if (!configuredOutputs.length) {
      return "No Sankey output configured";
    }

    return configuredOutputs
      .map((output) => {
        const source =
          output.dataKey ||
          output.dataSource?.channel ||
          "not configured";

        return `${output.name || "Output"} (${source})`;
      })
      .join(", " );
  };

  const getPreparedSankeyConfig = () => {
    const safeOutputs = getSankeyOutputs(sankeyConfig);

    return {
      sourceName:
        sankeyConfig?.sourceName?.trim() || "Boiler A",

      unit:
        sankeyConfig?.unit?.trim() || "t/h",

      outputs: safeOutputs.map((output, index) => ({
        id: output.id || `output-${index + 1}`,

        name:
          output.name?.trim() ||
          `Sterilizer ${index + 1}`,


        dataKey:
          output.dataKey || "",

        dataSource: {
          bucket:
            output.dataSource?.bucket ||
            influxConfig.bucket ||
            "Mill",

          measurement:
            output.dataSource?.measurement ||
            influxConfig.measurement ||
            "PBLR",

          tagKey:
            output.dataSource?.tagKey ||
            influxConfig.tagKey ||
            "id",

          tagValue:
            output.dataSource?.tagValue ||
            output.dataSource?.id ||
            influxConfig.tagValue ||
            influxConfig.id ||
            "",

          id:
            output.dataSource?.id ||
            output.dataSource?.tagValue ||
            influxConfig.id ||
            "",

          channel:
            output.dataSource?.channel ||
            channelMap?.[output.dataKey] ||
            "",
        },
      })),
    };
  };

  const getMinimumGridSizeForItems = () => {
    const minimumRows = Math.max(
      GRID_MIN_ROWS,
      ...items.map((item) => item.y + item.h)
    );

    const minimumCols = Math.max(
      GRID_MIN_COLS,
      ...items.map((item) => item.x + item.w)
    );

    return {
      minimumRows,
      minimumCols,
    };
  };

  const clampGridSize = (value, min, max) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return min;
    }

    return Math.min(
      max,
      Math.max(min, Math.round(numericValue))
    );
  };

  const updateGridRows = (value) => {
    const { minimumRows } = getMinimumGridSizeForItems();

    const nextRows = clampGridSize(
      value,
      GRID_MIN_ROWS,
      GRID_MAX_ROWS
    );

    if (nextRows < minimumRows) {
      showToast(
        "error",
        `Grid must have at least ${minimumRows} row(s) because existing widgets are using that space.`
      );

      return;
    }

    setRows(nextRows);
  };

  const updateGridCols = (value) => {
    const { minimumCols } = getMinimumGridSizeForItems();

    const nextCols = clampGridSize(
      value,
      GRID_MIN_COLS,
      GRID_MAX_COLS
    );

    if (nextCols < minimumCols) {
      showToast(
        "error",
        `Grid must have at least ${minimumCols} column(s) because existing widgets are using that space.`
      );

      return;
    }

    setCols(nextCols);
  };

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setToast(null),
      toast.type === "error" ? 5500 : 3200
    );

    return () => window.clearTimeout(timer);
  }, [toast]);

  const isBigNumberCombined =
    newType === "bignumber" &&
    newBigNumberDisplay.mode === "combined";

  const isMultiDataWidget =
    newType === "line" ||
    newType === "bar" ||
    newType === "pie" ||
    newType === "composite" ||
    isBigNumberCombined;

  // DEFAULT LABEL
  const getDefaultWidgetLabel = (type) =>
    `${
      type.charAt(0).toUpperCase() +
      type.slice(1)
    } Widget`;

  const handleCompositePresetChange = (
    preset
  ) => {
    if (!preset) return;

    setNewCompositeConfig({
      preset: preset.id,
      layout: preset.defaultLayout,
      ratio: preset.defaultRatio,
    });
  };

  // Keep image widgets in landscape dimensions so the diagram is readable
  // in both the canvas and the widget settings preview.
  const handleWidgetTypeChange = (type, customWidgetTypeId = "") => {
    // Backward compatibility:
    // old/custom "area" widgets are now Line widgets rendered in Area style.
    const requestedAreaStyle =
      type === "area";

    type = requestedAreaStyle
      ? "line"
      : type;

    setNewType(type);
    setNewWidgetTypeId(customWidgetTypeId);

    const typeUsesDedicatedSource =
      dedicatedWidgetTypes.includes(type);

    setUseDedicatedWidgetSource(typeUsesDedicatedSource);

    if (typeUsesDedicatedSource) {
      setNewDataKey("");
      setNewDataKeys([]);
    } else if (
      ["line", "bar", "pie", "composite"].includes(type)
    ) {
      setNewDataKeys((current) => {
        if (current.length) {
          setNewDataKey(current[0]);
          return current;
        }

        return newDataKey ? [newDataKey] : [];
      });
    } else if (type === "bignumber") {
      setNewDataKeys((current) => {
        const selected = current.length
          ? current
          : newDataKey
          ? [newDataKey]
          : [];

        // Stat can use one source in Number / Value Mapping mode,
        // or two sources in Stat + Status mode.
        const limited = selected.slice(0, 2);

        setNewDataKey(limited[0] || "");

        setNewBigNumberDisplay(
          (previous) => ({
            ...previous,
            statusDataKey:
              limited[1] ||
              previous.statusDataKey ||
              "",
          })
        );

        return limited;
      });
    } else {
      const primaryKey =
        newDataKeys[0] || newDataKey || "";

      setNewDataKey(primaryKey);
      setNewDataKeys([]);
    }

    const customWidget = customWidgetTypes.find(
      (widget) => widget.id === customWidgetTypeId
    );

    if (customWidget && !isEdit) {
      setNewLabel(customWidget.label);
    }

    if (type === "image" && !isEdit) {
      setNewW(2);
      setNewH(1);
    }

    if (type === "sankey" && !isEdit) {
      setNewW(3);
      setNewH(2);
      setSankeyConfig(defaultSankeyConfig);
    }

    if (type === "composite" && !isEdit) {
      const compatible =
        getCompatibleCompositePresets(
          Math.max(
            1,
            newDataKeys.length ||
              (newDataKey ? 1 : 0)
          )
        );

      const firstPreset =
        compatible[0] ||
        COMPOSITE_PRESETS[0];

      setNewCompositeConfig({
        preset: firstPreset.id,
        layout: firstPreset.defaultLayout,
        ratio: firstPreset.defaultRatio,
      });

      setNewW(2);
      setNewH(1);
    }

    if (type === "bignumber" && !isEdit) {
      const selectedSources = (
        newDataKeys.length
          ? newDataKeys
          : newDataKey
          ? [newDataKey]
          : []
      ).slice(0, 2);

      setNewBigNumberDisplay({
        ...defaultBigNumberDisplay,
        statusDataKey: selectedSources[1] || "",
        mappings:
          defaultBigNumberDisplay.mappings.map(
            (mapping) => ({ ...mapping })
          ),
      });
    }

    if (type === "logs" && !isEdit) {
      setNewW(2);
      setNewH(2);
      setNewLabel("System Logs");
      setNewLogDisplay({
        ...defaultLogDisplay,
        levelFilter: [
          ...defaultLogDisplay.levelFilter,
        ],
      });
    }

    if (
      ["line", "bar"].includes(type) &&
      !isEdit
    ) {
      setNewChartDisplay({
        ...defaultChartDisplay,
        chartStyle:
          requestedAreaStyle
            ? "area"
            : "line",
      });
      setNewHistoryWindow(
        defaultHistoryWindow
      );
    }

    if (supportsRangeConfiguration(type) && !isEdit) {
      setNewRangeConfig({
        ...defaultRangeConfig,
      });
    }
  };

  // =====================================
  // LOAD INFLUX METADATA
  // =====================================
  const fetchAllowedDevices = async (token) => {
    const res = await fetch(
      "http://localhost:5000/influx/allowed-devices",
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result?.error ||
          "Failed to load assigned Influx devices"
      );
    }

    return Array.isArray(result) ? result : [];
  };

  const fetchInfluxBuckets = async (token) => {
    const res = await fetch(
      "http://localhost:5000/influx/buckets",
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result?.error ||
          "Failed to load available Influx buckets"
      );
    }

    return Array.isArray(result?.buckets)
      ? result.buckets
      : [];
  };

  const fetchInfluxMeasurements = async (
    selectedBucket,
    token
  ) => {
    const res = await fetch(
      `http://localhost:5000/influx/measurements?bucket=${encodeURIComponent(
        selectedBucket
      )}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result?.error ||
          "Failed to load Influx measurements"
      );
    }

    return result?.measurements || [];
  };

  const fetchInfluxChannels = async (
    selectedBucket,
    selectedMeasurement,
    selectedTagKey,
    selectedTagValue,
    token
  ) => {
    const query = new URLSearchParams({
      bucket: selectedBucket,
      measurement: selectedMeasurement,
      tagKey: selectedTagKey || "id",
    });

    if (selectedTagValue) {
      query.set("tagValue", selectedTagValue);
    }

    const res = await fetch(
      `http://localhost:5000/influx/channels?${query.toString()}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result?.error ||
          "Failed to load available Influx channels"
      );
    }

    return result?.channels || [];
  };

  const fetchInfluxIdsForMeasurement = async (
    selectedBucket,
    selectedMeasurement,
    selectedTagKey,
    token
  ) => {
    const query = new URLSearchParams({
      bucket: selectedBucket,
      measurement: selectedMeasurement,
      tagKey: selectedTagKey || "id",
    });

    const res = await fetch(
      `http://localhost:5000/influx/ids?${query.toString()}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result?.error ||
          `Failed to load IDs for ${selectedMeasurement}`
      );
    }

    return Array.isArray(result?.ids)
      ? result.ids
      : [];
  };

  const fetchInfluxIdsAndChannels = async (
    selectedBucket,
    selectedMeasurement,
    token
  ) => {
    const query = new URLSearchParams({
      bucket: selectedBucket,
      measurement: selectedMeasurement,
    });

    const [idsRes, channelsRes] =
      await Promise.all([
        fetch(
          `http://localhost:5000/influx/ids?${query.toString()}`,
          {
            headers: {
              Authorization: token,
            },
          }
        ),

        fetch(
          `http://localhost:5000/influx/channels?${query.toString()}`,
          {
            headers: {
              Authorization: token,
            },
          }
        ),
      ]);

    const idsData = await idsRes.json();
    const channelsData =
      await channelsRes.json();

    if (!idsRes.ok) {
      throw new Error(
        idsData?.error ||
          "Failed to load available Influx IDs"
      );
    }

    if (!channelsRes.ok) {
      throw new Error(
        channelsData?.error ||
          "Failed to load available Influx channels"
      );
    }

    return {
      ids: idsData?.ids || [],
      channels: channelsData?.channels || [],
    };
  };

  const applySelectedDevice = (
    logicalDeviceId
  ) => {
    const selectedDevice =
      logicalAssignedDevices.find(
        (device) =>
          String(device.id) ===
          String(
            logicalDeviceId
          )
      );

    if (!selectedDevice) {
      setSelectedDeviceId(
        ""
      );

      setInfluxConfig(
        defaultInfluxConfig
      );

      setInfluxIds([]);

      setInfluxMeasurements(
        []
      );

      setInfluxChannels(
        []
      );

      return;
    }

    const tagValue =
      selectedDevice.tag_value ||
      "";

    setSelectedDeviceId(
      selectedDevice.id
    );

    setSelectedMeasurementGroup(
      selectedDevice.device_type
    );

    setInfluxConfig({
      bucket:
        selectedDevice.bucket_name ||
        "",
      measurement: "",
      tagKey:
        selectedDevice.tag_key ||
        "id",
      id: tagValue,
      tagValue,
    });

    setInfluxIds(
      [tagValue].filter(
        Boolean
      )
    );

    // Only measurements explicitly assigned to this organization
    // are exposed here.
    setInfluxMeasurements(
      selectedDevice.measurements
    );

    setInfluxChannels(
      []
    );

    setCustomDataDraft(
      (current) => ({
        ...current,
        channel: "",
      })
    );
  };

  const handleMeasurementGroupChange = (
    groupKey
  ) => {
    setSelectedMeasurementGroup(groupKey);

    if (isOrganizationAdmin) {
      const currentDevice =
        logicalAssignedDevices.find(
          (device) =>
            String(device.id) ===
            String(
              selectedDeviceId
            )
        );

      const currentGroupKey =
        currentDevice
          ?.device_type || "";

      if (
        currentGroupKey !==
        groupKey
      ) {
        setSelectedDeviceId(
          ""
        );

        setInfluxConfig(
          defaultInfluxConfig
        );

        setInfluxMeasurements(
          []
        );

        setInfluxIds([]);

        setInfluxChannels(
          []
        );
      }

      return;
    }

    setInfluxConfig((current) => ({
      ...current,
      measurement: "",
      id: "",
      tagValue: "",
    }));

    setInfluxIds([]);
    setInfluxIdMeasurementMap({});
    setInfluxChannels([]);
  };

  const refreshInfluxMetadata = async () => {
    if (!canConfigureInflux) return;

    const token =
      localStorage.getItem("token");

    setInfluxLoading(true);
    setInfluxError("");

    try {
      if (isOrganizationAdmin) {
        const devices =
          await fetchAllowedDevices(
            token
          );

        setAvailableDevices(
          devices
        );

        setInfluxBuckets(
          [
            ...new Set(
              devices
                .map(
                  (device) =>
                    device.bucket_name
                )
                .filter(Boolean)
            ),
          ].sort()
        );

        if (!devices.length) {
          setSelectedDeviceId(
            ""
          );

          setSelectedMeasurementGroup(
            ""
          );

          setInfluxConfig(
            defaultInfluxConfig
          );

          setInfluxIds([]);

          setInfluxMeasurements(
            []
          );

          setInfluxChannels(
            []
          );

          setInfluxError(
            "No Influx device has been assigned to your organization."
          );
        }

        // Do not automatically preselect a source.
        // Admin explicitly chooses:
        // Device Type -> Assigned Device -> Measurement -> Channel.
        return;
      }

      const buckets =
        await fetchInfluxBuckets(token);

      setInfluxBuckets(buckets);

      const selectedBucket =
        influxConfig.bucket.trim() ||
        buckets[0] ||
        "";

      const selectedMeasurement =
        influxConfig.measurement.trim();

      if (!selectedBucket) {
        setInfluxMeasurements([]);
        setInfluxIds([]);
        setInfluxChannels([]);
        setInfluxError(
          "No Influx buckets are available."
        );
        return;
      }

      if (!influxConfig.bucket.trim()) {
        setInfluxConfig((current) => ({
          ...current,
          bucket: selectedBucket,
        }));
      }

      const measurements =
        await fetchInfluxMeasurements(
          selectedBucket,
          token
        );

      setInfluxMeasurements(measurements);

      if (!selectedMeasurement) {
        setSelectedMeasurementGroup("");
        setInfluxIds([]);
        setInfluxIdMeasurementMap({});
        setInfluxChannels([]);
        return;
      }

      setSelectedMeasurementGroup(
        getMeasurementGroup(
          selectedMeasurement
        ).key
      );

      const ids =
        await fetchInfluxIdsForMeasurement(
          selectedBucket,
          selectedMeasurement,
          influxConfig.tagKey || "id",
          token
        );

      const sortedIds = [...ids].sort(
        (a, b) =>
          String(a).localeCompare(
            String(b),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
      );

      const nextMap = {};
      sortedIds.forEach((id) => {
        nextMap[String(id)] = [
          selectedMeasurement,
        ];
      });

      setInfluxIds(sortedIds);
      setInfluxIdMeasurementMap(nextMap);

      const selectedId = String(
        influxConfig.tagValue ||
          influxConfig.id ||
          ""
      ).trim();

      if (selectedId) {
        const channels =
          await fetchInfluxChannels(
            selectedBucket,
            selectedMeasurement,
            influxConfig.tagKey || "id",
            selectedId,
            token
          );

        setInfluxChannels(channels);
      } else {
        setInfluxChannels([]);
      }
    } catch (err) {
      console.error(
        "❌ Influx metadata error:",
        err
      );

      setInfluxIds([]);
      setInfluxChannels([]);
      setInfluxError(
        err.message ||
          "Failed to load Influx metadata."
      );
    } finally {
      setInfluxLoading(false);
    }
  };

  // Organization admins receive measurement-level permission rows
  // already filtered by their organization. Widget Studio groups these
  // rows into logical assigned devices for easier selection.
  useEffect(() => {
    if (!isOrganizationAdmin) {
      return;
    }

    const loadAssignedDevices =
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        setInfluxLoading(
          true
        );

        setInfluxError("");

        try {
          const devices =
            await fetchAllowedDevices(
              token
            );

          setAvailableDevices(
            devices
          );

          setInfluxBuckets(
            [
              ...new Set(
                devices
                  .map(
                    (device) =>
                      device.bucket_name
                  )
                  .filter(
                    Boolean
                  )
              ),
            ].sort()
          );

          if (!devices.length) {
            setInfluxError(
              "No Influx device has been assigned to your organization."
            );
          }
        } catch (err) {
          console.error(
            "❌ Assigned Influx device error:",
            err
          );

          setAvailableDevices(
            []
          );

          setInfluxError(
            err.message ||
              "Failed to load assigned Influx devices."
          );
        } finally {
          setInfluxLoading(
            false
          );
        }
      };

    loadAssignedDevices();
  }, [isOrganizationAdmin]);

  // Organization admins may map fields only after choosing a permitted device.
  useEffect(() => {
    if (
      !isOrganizationAdmin ||
      !influxConfig.bucket ||
      !influxConfig.measurement ||
      !influxConfig.id
    ) {
      return;
    }

    const loadOrganizationChannels = async () => {
      const token =
        localStorage.getItem("token");

      setInfluxLoading(true);
      setInfluxError("");

      try {
        const channels = await fetchInfluxChannels(
          influxConfig.bucket,
          influxConfig.measurement,
          influxConfig.tagKey || "id",
          influxConfig.tagValue || influxConfig.id,
          token
        );

        setInfluxChannels(channels);
      } catch (err) {
        console.error(
          "❌ Organization Influx channel error:",
          err
        );

        setInfluxChannels([]);
        setInfluxError(
          err.message ||
            "Failed to load channels for this device."
        );
      } finally {
        setInfluxLoading(false);
      }
    };

    loadOrganizationChannels();
  }, [
    isOrganizationAdmin,
    influxConfig.bucket,
    influxConfig.measurement,
    influxConfig.tagKey,
    influxConfig.tagValue,
    influxConfig.id,
  ]);

  // Superadmins can browse all measurements in a chosen bucket.
  useEffect(() => {
    if (!isSuperadmin) return;

    const selectedBucket =
      influxConfig.bucket.trim();

    if (!selectedBucket) {
      setInfluxMeasurements([]);
      return;
    }

    const loadMeasurements = async () => {
      const token =
        localStorage.getItem("token");

      setInfluxLoading(true);
      setInfluxError("");

      try {
        const measurements =
          await fetchInfluxMeasurements(
            selectedBucket,
            token
          );

        setInfluxMeasurements(measurements);
      } catch (err) {
        console.error(
          "❌ Influx measurement error:",
          err
        );

        setInfluxMeasurements([]);
        setInfluxError(
          err.message ||
            "Failed to load Influx measurements."
        );
      } finally {
        setInfluxLoading(false);
      }
    };

    loadMeasurements();
  }, [isSuperadmin, influxConfig.bucket]);

  // Superadmin: Measurement -> Device Type -> Available IDs.
  // Device Type is inferred automatically from the selected measurement.
  useEffect(() => {
    if (!isSuperadmin) return;

    const selectedBucket =
      influxConfig.bucket.trim();

    const selectedMeasurement =
      influxConfig.measurement.trim();

    if (
      !selectedBucket ||
      !selectedMeasurement
    ) {
      setInfluxIds([]);
      setInfluxIdMeasurementMap({});
      return;
    }

    let cancelled = false;

    const loadMeasurementIds = async () => {
      const token =
        localStorage.getItem("token");

      setInfluxLoading(true);
      setInfluxError("");

      try {
        const ids =
          await fetchInfluxIdsForMeasurement(
            selectedBucket,
            selectedMeasurement,
            influxConfig.tagKey || "id",
            token
          );

        if (cancelled) return;

        const sortedIds = [...ids].sort(
          (a, b) =>
            String(a).localeCompare(
              String(b),
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              }
            )
        );

        const nextMap = {};

        sortedIds.forEach((id) => {
          nextMap[String(id)] = [
            selectedMeasurement,
          ];
        });

        setInfluxIdMeasurementMap(nextMap);
        setInfluxIds(sortedIds);

        const selectedId =
          String(
            influxConfig.tagValue ||
              influxConfig.id ||
              ""
          );

        if (
          selectedId &&
          !sortedIds.some(
            (id) =>
              String(id) === selectedId
          )
        ) {
          setInfluxConfig((current) => ({
            ...current,
            id: "",
            tagValue: "",
          }));
          setInfluxChannels([]);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "❌ Influx measurement ID error:",
          err
        );

        setInfluxIds([]);
        setInfluxIdMeasurementMap({});
        setInfluxError(
          err.message ||
            "Failed to load IDs for the selected measurement."
        );
      } finally {
        if (!cancelled) {
          setInfluxLoading(false);
        }
      }
    };

    loadMeasurementIds();

    return () => {
      cancelled = true;
    };
  }, [
    isSuperadmin,
    influxConfig.bucket,
    influxConfig.measurement,
    influxConfig.tagKey,
  ]);

  // Superadmin: ID -> Measurement -> Fields.
  useEffect(() => {
    if (!isSuperadmin) return;

    const selectedBucket =
      influxConfig.bucket.trim();

    const selectedMeasurement =
      influxConfig.measurement.trim();

    const selectedId =
      String(
        influxConfig.tagValue ||
          influxConfig.id ||
          ""
      ).trim();

    if (
      !selectedBucket ||
      !selectedMeasurement ||
      !selectedId
    ) {
      setInfluxChannels([]);
      return;
    }

    let cancelled = false;

    const loadChannels = async () => {
      const token =
        localStorage.getItem("token");

      setInfluxLoading(true);
      setInfluxError("");

      try {
        const channels =
          await fetchInfluxChannels(
            selectedBucket,
            selectedMeasurement,
            influxConfig.tagKey || "id",
            selectedId,
            token
          );

        if (!cancelled) {
          setInfluxChannels(channels);
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "❌ Influx channel error:",
          err
        );

        setInfluxChannels([]);
        setInfluxError(
          err.message ||
            "Failed to load fields for the selected device."
        );
      } finally {
        if (!cancelled) {
          setInfluxLoading(false);
        }
      }
    };

    loadChannels();

    return () => {
      cancelled = true;
    };
  }, [
    isSuperadmin,
    influxConfig.bucket,
    influxConfig.measurement,
    influxConfig.tagKey,
    influxConfig.tagValue,
    influxConfig.id,
  ]);

  useEffect(() => {
    if (!showCustomDataModal || !canConfigureInflux) {
      return;
    }

    refreshInfluxMetadata();
    // Refresh once whenever the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustomDataModal]);

  // UPDATE ONE DATA KEY → CHANNEL MAPPING
  const updateChannelMapping = (
    dataKey,
    channel
  ) => {
    setChannelMap((prev) => ({
      ...prev,
      [dataKey]: channel,
    }));
  };

  // Direct Influx fields map to themselves automatically.
  useEffect(() => {
    if (!newDataKey) {
      return;
    }

    const selectedOption = allDataOptions.find(
      (option) => option.key === newDataKey
    );

    if (
      selectedOption?.isInfluxField &&
      selectedOption.channel
    ) {
      setChannelMap((previous) => ({
        ...previous,
        [newDataKey]: selectedOption.channel,
      }));
    }
  }, [
    newDataKey,
    influxConfig.bucket,
    influxConfig.measurement,
    influxConfig.id,
    influxConfig.tagValue,
    JSON.stringify(influxChannels),
  ]);

  // Keep the Step 1 data selection when the display type changes.
  // Only reset Bar orientation when leaving the Bar widget.
  useEffect(() => {
    if (newType !== "bar") {
      setNewOrientation("vertical");
    }
  }, [newType]);

  useEffect(() => {
    if (!isMultiDataWidget || !newDataKeys.length) {
      return;
    }

    setChannelMap((previous) => {
      const next = { ...previous };

      newDataKeys.forEach((key) => {
        const option = allDataOptions.find(
          (candidate) => candidate.key === key
        );

        if (option?.isInfluxField && option.channel) {
          next[key] = option.channel;
        }
      });

      return next;
    });
  }, [
    JSON.stringify(newDataKeys),
    JSON.stringify(influxChannels),
  ]);

  // Keep the Combined Stat secondary field in sync with the two
  // data sources selected in Step 1.
  useEffect(() => {
    if (
      newType !== "bignumber" ||
      newBigNumberDisplay.mode !== "combined"
    ) {
      return;
    }

    const primaryDataKey =
      newDataKeys[0] || newDataKey || "";

    const secondaryDataKey =
      newDataKeys.find(
        (key) => key && key !== primaryDataKey
      ) || "";

    setNewBigNumberDisplay((previous) => {
      const currentStatusDataKey =
        previous.statusDataKey || "";

      const currentIsValid =
        currentStatusDataKey &&
        currentStatusDataKey !== primaryDataKey &&
        newDataKeys.includes(currentStatusDataKey);

      if (currentIsValid) {
        return previous;
      }

      return {
        ...previous,
        statusSource: "mapping",
        statusDataKey: secondaryDataKey,
      };
    });
  }, [
    newType,
    newBigNumberDisplay.mode,
    newDataKey,
    JSON.stringify(newDataKeys),
  ]);

  // LOAD A RANGE PRESET WHEN THE USER CHANGES THE DATA SOURCE.
  useEffect(() => {
    if (!newDataKey || !supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    )) return;

    // The selected-widget effect loads the saved range. Do not overwrite it
    // unless the user changes to a different data source.
    if (selectedItem && selectedItem.dataKey === newDataKey) return;

    setNewRangeConfig({
      ...defaultRangeConfig,
    });

    setNewCompositeConfig({
      ...DEFAULT_COMPOSITE_CONFIG,
    });
  }, [newDataKey, newType, selectedItem]);

  // RETURN FROM IMAGE EDITOR
  useEffect(() => {
    if (!editingImageWidget?.resumeWidgetSettings) return;

    const {
      resumeWidgetSettings,
      returnPage,
      designerSnapshot,
      ...returnedWidget
    } = editingImageWidget;

    const returnedPins = Array.isArray(returnedWidget.pins)
      ? returnedWidget.pins
      : [];

    // TemplateDesigner is mounted again after returning from the full-screen
    // editor. Use the snapshot's items instead of the freshly initialized [] so
    // the existing grid and all other widgets are preserved.
    const baseItems = Array.isArray(designerSnapshot?.items)
      ? designerSnapshot.items
      : items;

    const alreadyExists = baseItems.some(
      (item) => item.id === returnedWidget.id
    );

    const nextItems = alreadyExists
      ? baseItems.map((item) =>
          item.id === returnedWidget.id
            ? {
                ...item,
                ...returnedWidget,
                pins: returnedPins,
              }
            : item
        )
      : baseItems;

    if (designerSnapshot) {
      restoreDesignerSnapshot(designerSnapshot, nextItems);
    } else if (alreadyExists) {
      // Backward compatibility with editor payloads created before snapshots.
      setItems(nextItems);
    }

    setImageDraftPins(returnedPins);
    setImageDraft(returnedWidget.image || defaultImageDraft);
    setNewType("image");
    setNewLabel(returnedWidget.label || "System Diagram");
    setNewDataKey(returnedWidget.dataKey || "");
    setNewDataKeys([]);
    setNewW(returnedWidget.w || 2);
    setNewH(returnedWidget.h || 1);

    if (alreadyExists) {
      setActiveItemId(returnedWidget.id);
      setActiveCell(null);
    } else {
      setActiveItemId(null);
      setActiveCell({
        row: returnedWidget.y ?? 0,
        col: returnedWidget.x ?? 0,
      });
    }

    setWidgetStep(3);
    setShowModal(true);

    if (typeof setEditingImageWidget === "function") {
      setEditingImageWidget(null);
    }
  }, [editingImageWidget, setEditingImageWidget]);


  // RETURN FROM SANKEY FLOW EDITOR
  useEffect(() => {
    if (!editingSankeyWidget?.resumeWidgetSettings) return;

    const {
      resumeWidgetSettings,
      returnPage,
      designerSnapshot,
      ...returnedWidget
    } = editingSankeyWidget;

    const baseItems = Array.isArray(designerSnapshot?.items)
      ? designerSnapshot.items
      : items;

    const alreadyExists = baseItems.some(
      (item) => item.id === returnedWidget.id
    );

    const nextItems = alreadyExists
      ? baseItems.map((item) =>
          item.id === returnedWidget.id
            ? {
                ...item,
                ...returnedWidget,
              }
            : item
        )
      : baseItems;

    if (designerSnapshot) {
      restoreDesignerSnapshot(designerSnapshot, nextItems);
    } else if (alreadyExists) {
      setItems(nextItems);
    }

    const returnedConfig =
      returnedWidget.sankeyConfig || defaultSankeyConfig;

    const returnedDataKeys = [
      ...new Set(
        (Array.isArray(returnedConfig.outputs)
          ? returnedConfig.outputs
          : []
        )
          .map((output) => output.dataKey)
          .filter(Boolean)
      ),
    ];

    setSankeyConfig(returnedConfig);
    setNewType("sankey");
    setNewLabel(returnedWidget.label || "Sankey Flow");
    setNewDataKey(returnedDataKeys[0] || returnedWidget.dataKey || "");
    setNewDataKeys(returnedDataKeys);
    setNewW(returnedWidget.w || 3);
    setNewH(returnedWidget.h || 2);

    if (alreadyExists) {
      setActiveItemId(returnedWidget.id);
      setActiveCell(null);
    } else {
      setActiveItemId(null);
      setActiveCell({
        row: returnedWidget.y ?? 0,
        col: returnedWidget.x ?? 0,
      });
    }

    setWidgetStep(3);
    setShowModal(true);

    if (typeof setEditingSankeyWidget === "function") {
      setEditingSankeyWidget(null);
    }
  }, [editingSankeyWidget, setEditingSankeyWidget]);

  // LOAD SELECTED ITEM SETTINGS
  useEffect(() => {
    if (!selectedItem) return;

    const resolvedSelectedType =
      selectedItem.type === "area"
        ? "line"
        : selectedItem.type;

    setNewType(resolvedSelectedType);
    setNewWidgetTypeId(selectedItem.customWidgetTypeId || "");
    setUseDedicatedWidgetSource(
      dedicatedWidgetTypes.includes(resolvedSelectedType)
    );

    setNewLabel(selectedItem.label || "");

    setNewDataKey(
      selectedItem.dataKey || ""
    );

    setNewDataKeys(
      resolvedSelectedType === "line" ||
        resolvedSelectedType === "bar" ||
        resolvedSelectedType === "pie" ||
        resolvedSelectedType === "composite"
        ? selectedItem.dataKeys?.length
          ? selectedItem.dataKeys
          : selectedItem.dataKey
          ? [selectedItem.dataKey]
          : []
        : selectedItem.type === "bignumber" &&
          selectedItem.bigNumberDisplay?.mode === "combined"
        ? [
            selectedItem.dataKey,
            selectedItem.bigNumberDisplay?.statusDataKey ||
              selectedItem.dataKeys?.[1],
          ].filter(Boolean)
        : []
    );

    setNewOrientation(
      selectedItem.orientation || "vertical"
    );

    setNewW(selectedItem.w);
    setNewH(selectedItem.h);

    setNewBigNumberDisplay({
      ...defaultBigNumberDisplay,
      ...(selectedItem.bigNumberDisplay || {}),

      mappings: Array.isArray(
        selectedItem.bigNumberDisplay?.mappings
      )
        ? selectedItem.bigNumberDisplay.mappings.map(
            (mapping) => ({ ...mapping })
          )
        : defaultBigNumberDisplay.mappings.map(
            (mapping) => ({ ...mapping })
          ),
    });

    setNewRangeConfig({
      ...defaultRangeConfig,
      ...(selectedItem.rangeConfig || {}),
    });

    setNewLogDisplay({
      ...defaultLogDisplay,
      ...(selectedItem.logDisplay || {}),

      levelFilter: Array.isArray(
        selectedItem.logDisplay?.levelFilter
      )
        ? [
            ...selectedItem.logDisplay
              .levelFilter,
          ]
        : [
            ...defaultLogDisplay.levelFilter,
          ],
    });

    setNewChartDisplay({
      ...defaultChartDisplay,
      ...(selectedItem.chartDisplay || {}),

      // Migrate old standalone Area widgets into LineWidget Area mode.
      chartStyle:
        selectedItem.type === "area"
          ? "area"
          : selectedItem.chartDisplay?.chartStyle ||
            "line",
    });

    setNewHistoryWindow(
      selectedItem.historyWindow ||
        defaultHistoryWindow
    );

    setNewCompositeConfig({
      ...DEFAULT_COMPOSITE_CONFIG,
      ...(selectedItem.compositeConfig || {}),
    });

    setImageDraftPins(
      selectedItem.type === "image" && Array.isArray(selectedItem.pins)
        ? selectedItem.pins
        : []
    );

    setImageDraft(
      selectedItem.type === "image" && selectedItem.image
        ? selectedItem.image
        : defaultImageDraft
    );

    setSankeyConfig(
      selectedItem.type === "sankey" && selectedItem.sankeyConfig
        ? selectedItem.sankeyConfig
        : defaultSankeyConfig
    );
  }, [activeItemId, selectedItem]);

  // CHECK CELL OCCUPIED
  const isCellOccupied = (row, col) =>
    items.some(
      (item) =>
        col >= item.x &&
        col < item.x + item.w &&
        row >= item.y &&
        row < item.y + item.h
    );

  // CHECK COLLISION FOR NEW WIDGET
  const hasCollision = (newItem) => {
    for (
      let r = newItem.y;
      r < newItem.y + newItem.h;
      r++
    ) {
      for (
        let c = newItem.x;
        c < newItem.x + newItem.w;
        c++
      ) {
        if (isCellOccupied(r, c)) {
          return true;
        }
      }
    }

    return false;
  };

  // CHECK COLLISION WHEN MOVING WIDGET
  const hasMoveCollision = (movingItem) => {
    return items.some((item) => {
      if (item.id === movingItem.id) {
        return false;
      }

      const overlapX =
        movingItem.x < item.x + item.w &&
        movingItem.x + movingItem.w > item.x;

      const overlapY =
        movingItem.y < item.y + item.h &&
        movingItem.y + movingItem.h > item.y;

      return overlapX && overlapY;
    });
  };

  // Every widget may be resized down to one grid cell.
  // The 1×1 floor is still required so width and height never become zero.
  const getMinimumWidgetSize = () => ({
    w: 1,
    h: 1,
  });

  const isResizeAvailable = (candidate) => {
    if (
      candidate.x < 0 ||
      candidate.y < 0 ||
      candidate.x + candidate.w > cols ||
      candidate.y + candidate.h > rows
    ) {
      return false;
    }

    return !items.some((item) => {
      if (item.id === candidate.id) {
        return false;
      }

      const overlapX =
        candidate.x < item.x + item.w &&
        candidate.x + candidate.w > item.x;

      const overlapY =
        candidate.y < item.y + item.h &&
        candidate.y + candidate.h > item.y;

      return overlapX && overlapY;
    });
  };

  const getDraftSizeBounds = () => {
    const minimumSize = getMinimumWidgetSize(newType);
    const originX = selectedItem?.x ?? activeCell?.col ?? 0;
    const originY = selectedItem?.y ?? activeCell?.row ?? 0;

    const maxW = Math.max(1, cols - originX);
    const maxH = Math.max(1, rows - originY);

    return {
      minW: Math.min(minimumSize.w, maxW),
      minH: Math.min(minimumSize.h, maxH),
      maxW,
      maxH,
    };
  };

  const applyDraftWidgetSize = (width, height) => {
    const { minW, minH, maxW, maxH } = getDraftSizeBounds();

    const safeW = Math.min(
      maxW,
      Math.max(minW, Math.round(Number(width) || minW))
    );

    const safeH = Math.min(
      maxH,
      Math.max(minH, Math.round(Number(height) || minH))
    );

    setNewW(safeW);
    setNewH(safeH);
  };

  const startResizeWidget = (event, item) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = gridRef.current?.getBoundingClientRect();

    if (!rect?.width || !rect?.height) {
      return;
    }

    resizeStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      item: { ...item },
      cellWidth: rect.width / cols,
      cellHeight: rect.height / rows,
    };

    setResizingItemId(item.id);
    setDraggingItemId(null);
    setDragPreview(null);
    setDragOverCell(null);
    setDragOverTrash(false);
    setDidDrag(true);
  };

  useEffect(() => {
    const handleMouseMove = (event) => {
      const resizeStart = resizeStartRef.current;

      if (!resizeStart) {
        return;
      }

      event.preventDefault();

      const {
        startX,
        startY,
        item,
        cellWidth,
        cellHeight,
      } = resizeStart;

      const deltaCols =
        cellWidth > 0
          ? Math.round((event.clientX - startX) / cellWidth)
          : 0;

      const deltaRows =
        cellHeight > 0
          ? Math.round((event.clientY - startY) / cellHeight)
          : 0;

      const minimumSize = getMinimumWidgetSize(item.type);

      const nextW = Math.min(
        cols - item.x,
        Math.max(minimumSize.w, item.w + deltaCols)
      );

      const nextH = Math.min(
        rows - item.y,
        Math.max(minimumSize.h, item.h + deltaRows)
      );

      const candidate = {
        ...item,
        w: nextW,
        h: nextH,
      };

      if (!isResizeAvailable(candidate)) {
        return;
      }

      setItems((previousItems) =>
        previousItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                w: candidate.w,
                h: candidate.h,
              }
            : currentItem
        )
      );
    };

    const handleMouseUp = () => {
      if (!resizeStartRef.current) {
        return;
      }

      resizeStartRef.current = null;
      setResizingItemId(null);

      setTimeout(() => {
        setDidDrag(false);
      }, 80);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [cols, rows, items]);

  // =====================================
  // SMART DRAG & DROP
  // =====================================
  const isPlacementInsideGrid = (item, row, col) =>
    row >= 0 &&
    col >= 0 &&
    row + item.h <= rows &&
    col + item.w <= cols;

  const isPlacementAvailable = (item, row, col) => {
    if (!isPlacementInsideGrid(item, row, col)) {
      return false;
    }

    return !items.some((otherItem) => {
      if (otherItem.id === item.id) {
        return false;
      }

      const overlapX =
        col < otherItem.x + otherItem.w &&
        col + item.w > otherItem.x;

      const overlapY =
        row < otherItem.y + otherItem.h &&
        row + item.h > otherItem.y;

      return overlapX && overlapY;
    });
  };

  // Finds the closest free area when the pointer is over an occupied cell
  // or near a grid boundary. This makes a large widget snap to a valid slot.
  const findClosestValidPlacement = (
    item,
    desiredRow,
    desiredCol
  ) => {
    if (!item) return null;

    const maxRow = rows - item.h;
    const maxCol = cols - item.w;

    if (maxRow < 0 || maxCol < 0) {
      return null;
    }

    const startRow = Math.min(
      Math.max(desiredRow, 0),
      maxRow
    );

    const startCol = Math.min(
      Math.max(desiredCol, 0),
      maxCol
    );

    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        if (!isPlacementAvailable(item, row, col)) {
          continue;
        }

        const distance =
          Math.abs(row - startRow) +
          Math.abs(col - startCol);

        if (distance < closestDistance) {
          closest = { row, col };
          closestDistance = distance;
        }
      }
    }

    return closest;
  };

  const getGridCellFromPointer = (event) => {
    const rect = gridRef.current?.getBoundingClientRect();

    if (!rect?.width || !rect?.height) {
      return null;
    }

    const col = Math.min(
      cols - 1,
      Math.max(
        0,
        Math.floor(
          ((event.clientX - rect.left) / rect.width) *
            cols
        )
      )
    );

    const row = Math.min(
      rows - 1,
      Math.max(
        0,
        Math.floor(
          ((event.clientY - rect.top) / rect.height) *
            rows
        )
      )
    );

    return { row, col };
  };

  const updateSmartDragPreview = (event) => {
    event.preventDefault();

    if (!draggingItemId || dragOverTrash) {
      return;
    }

    const movingItem = items.find(
      (item) => item.id === draggingItemId
    );

    const targetCell = getGridCellFromPointer(event);

    if (!movingItem || !targetCell) {
      setDragPreview(null);
      setDragOverCell(null);
      return;
    }

    const placement = findClosestValidPlacement(
      movingItem,
      targetCell.row,
      targetCell.col
    );

    if (!placement) {
      setDragPreview({
        valid: false,
        row: targetCell.row,
        col: targetCell.col,
        w: movingItem.w,
        h: movingItem.h,
      });
      setDragOverCell(null);
      return;
    }

    const preview = {
      valid: true,
      ...placement,
      w: movingItem.w,
      h: movingItem.h,
    };

    setDragPreview(preview);
    setDragOverCell(placement);
  };

  const completeSmartDrop = (event) => {
    event.preventDefault();

    const itemId =
      draggingItemId ||
      Number(
        event.dataTransfer.getData("text/plain")
      );

    const movingItem = items.find(
      (item) => item.id === itemId
    );

    if (!movingItem) {
      return;
    }

    const targetCell = getGridCellFromPointer(event);

    const placement =
      dragPreview?.valid
        ? dragPreview
        : targetCell
        ? findClosestValidPlacement(
            movingItem,
            targetCell.row,
            targetCell.col
          )
        : null;

    if (placement?.valid !== false && placement) {
      setItems((previousItems) =>
        previousItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                x: placement.col,
                y: placement.row,
              }
            : item
        )
      );
    }

    setDraggingItemId(null);
    setDragPreview(null);
    setDragOverCell(null);
    setDragOverTrash(false);
    setDidDrag(false);
  };

  // MOVE WIDGET TO NEW CELL
  const moveWidget = (
    itemId,
    targetRow,
    targetCol
  ) => {
    const movingItem = items.find(
      (item) => item.id === itemId
    );

    if (!movingItem) return;

    const placement = findClosestValidPlacement(
      movingItem,
      targetRow,
      targetCol
    );

    if (!placement) {
      showToast("error", "No available space for this widget.");
      return;
    }

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              x: placement.col,
              y: placement.row,
            }
          : item
      )
    );
  };

  // STEP 1 DATA SOURCE SELECTION
  // The source is selected before the widget type, so Step 1 always supports
  // multiple selections. Single-value widgets use the first selected field.
  const toggleWizardDataSource = (key) => {
    setUseDedicatedWidgetSource(false);

    if (dedicatedWidgetTypes.includes(newType)) {
      setNewType(widgetLibrary[0]?.type || "gauge");
      setNewWidgetTypeId("");
    }

    setNewDataKeys((previous) => {
      const next = previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key];

      setNewDataKey(next[0] || "");
      return next;
    });
  };

  const chooseDedicatedWidgetSource = () => {
    setUseDedicatedWidgetSource(true);
    setNewDataKey("");
    setNewDataKeys([]);
    setNewWidgetTypeId("");

    if (!dedicatedWidgetTypes.includes(newType)) {
      const firstDedicatedWidget =
        widgetLibrary.find((widget) =>
          dedicatedWidgetTypes.includes(widget.type)
        );

      if (firstDedicatedWidget) {
        setNewType(firstDedicatedWidget.type);
      }
    }
  };

  // TOGGLE DATA FOR LINE / AREA / BAR / PIE CHART
  const toggleMultiDataKey = (key) => {
    setNewDataKeys((prev) => {
      if (prev.includes(key)) {
        const updated = prev.filter(
          (k) => k !== key
        );

        setNewDataKey(updated[0] || "");

        return updated;
      }

      const updated = [...prev, key];

      setNewDataKey(updated[0] || key);

      return updated;
    });
  };

  const openAddDataSourceModal = () => {
    setCustomDataDraft({
      label: "",
      key: "",
      channel: "",
      unit: "",
    });

    setInfluxError("");
    setInfluxChannels([]);

    if (isSuperadmin) {
      setInfluxConfig(defaultInfluxConfig);
      setSelectedDeviceId("");
      setSelectedMeasurementGroup("");
      setInfluxIds([]);
      setInfluxIdMeasurementMap({});
      setInfluxMeasurements([]);
    }

    if (isOrganizationAdmin) {
      setSelectedDeviceId("");
      setSelectedMeasurementGroup("");
      setInfluxConfig(defaultInfluxConfig);
      setInfluxChannels([]);
    }

    setShowCustomDataModal(true);
  };

  useEffect(() => {
    if (
      !showCustomDataModal ||
      !isSuperadmin
    ) {
      return;
    }

    if (influxBuckets.length === 0) {
      refreshInfluxMetadata();
    }
  }, [
    showCustomDataModal,
    isSuperadmin,
  ]);

  const addCustomDataSource = () => {
    const label =
      customDataDraft.label.trim();

    const channel =
      customDataDraft.channel.trim();

    const unit =
      customDataDraft.unit.trim();

    const bucketName =
      influxConfig.bucket.trim();

    const measurementName =
      influxConfig.measurement.trim();

    const tagKey =
      (influxConfig.tagKey || "id").trim();

    const tagValue =
      String(
        influxConfig.tagValue ||
          influxConfig.id ||
          ""
      ).trim();

    if (!bucketName) {
      showToast(
        "error",
        "Select an Influx bucket."
      );
      return;
    }

    if (!tagValue) {
      showToast(
        "error",
        "Select a device ID."
      );
      return;
    }

    if (!measurementName) {
      showToast(
        "error",
        "Select a measurement."
      );
      return;
    }

    if (!channel) {
      showToast(
        "error",
        "Select an Influx channel."
      );
      return;
    }

    const resolvedLabel =
      label ||
      formatInfluxFieldLabel(channel);

    const baseKey =
      createSafeDataKey(
        customDataDraft.key ||
          resolvedLabel ||
          channel
      );

    const key =
      getUniqueDataKey(
        baseKey,
        allDataOptions
      );

    const source = {
      bucket: bucketName,
      measurement: measurementName,
      tagKey: tagKey || "id",
      tagValue,
      id: tagValue,
      field: channel,
      channel,
    };

    const newOption = {
      key,
      label: resolvedLabel,
      unit,
      isCustom: true,
      source,
    };

    setCustomDataOptions(
      (previousOptions) => [
        ...previousOptions,
        newOption,
      ]
    );

    setChannelMap((previousMap) => ({
      ...previousMap,
      [key]: channel,
    }));

    if (isMultiDataWidget) {
      setNewDataKeys((previousKeys) => [
        ...new Set([
          ...previousKeys,
          key,
        ]),
      ]);
    } else {
      setNewDataKey(key);
    }

    if (!newLabel.trim()) {
      setNewLabel(resolvedLabel);
    }

    setCustomDataDraft({
      label: "",
      key: "",
      channel: "",
      unit: "",
    });

    setShowCustomDataModal(false);

    showToast(
      "success",
      "Data source added and selected."
    );
  };

  const deleteCustomDataSource = (key) => {
    const isUsed = items.some(
      (item) =>
        item.dataKey === key ||
        (Array.isArray(item.dataKeys) && item.dataKeys.includes(key))
    );

    if (isUsed) {
      showToast(
        "error",
        "This data source is being used by a widget. Remove it from the widget before deleting."
      );
      return;
    }

    setCustomDataOptions((previousOptions) =>
      previousOptions.filter((option) => option.key !== key)
    );

    setChannelMap((previousMap) => {
      const updatedMap = { ...previousMap };
      delete updatedMap[key];
      return updatedMap;
    });

    setNewDataKeys((previousKeys) =>
      previousKeys.filter((existingKey) => existingKey !== key)
    );

    if (newDataKey === key) {
      setNewDataKey("");
    }

    showToast("success", "Custom data source deleted.");
  };

  const addCustomWidgetType = () => {
    const label = customWidgetDraft.label.trim();
    const baseType = customWidgetDraft.baseType || widgetLibrary[0]?.type;
    const description = customWidgetDraft.description.trim();

    if (!label) {
      showToast("error", "Enter a name for the custom widget type.");
      return;
    }

    if (!baseType) {
      showToast("error", "Select the base widget display type.");
      return;
    }

    const id = `customWidget-${Date.now()}`;

    const newWidgetType = {
      id,
      label,
      baseType,
      description,
      isCustomWidgetType: true,
    };

    setCustomWidgetTypes((previousTypes) => [
      ...previousTypes,
      newWidgetType,
    ]);

    setCustomWidgetDraft({
      label: "",
      baseType: widgetLibrary[0]?.type || "bignumber",
      description: "",
    });

    setShowCustomWidgetModal(false);
    handleWidgetTypeChange(baseType, id);
    showToast("success", "Custom widget type added.");
  };

  const deleteCustomWidgetType = (id) => {
    const isUsed = items.some((item) => item.customWidgetTypeId === id);

    if (isUsed) {
      showToast(
        "error",
        "This custom widget type is being used by a widget. Delete or change that widget first."
      );
      return;
    }

    setCustomWidgetTypes((previousTypes) =>
      previousTypes.filter((widget) => widget.id !== id)
    );

    if (newWidgetTypeId === id) {
      setNewWidgetTypeId("");
    }

    showToast("success", "Custom widget type deleted.");
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please upload a valid image file.");
      return;
    }

    const maxSizeMb = 5;

    if (file.size > maxSizeMb * 1024 * 1024) {
      showToast("error", `Image size must be less than ${maxSizeMb}MB.`);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImageDraft({
        originalSrc: reader.result,
        croppedSrc: reader.result,
        crop: null,
        fileName: file.name,
        fileType: file.type,
      });

      showToast("success", "Image uploaded successfully.");
    };

    reader.onerror = () => {
      showToast("error", "Failed to read the uploaded image.");
    };

    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setImageDraft(defaultImageDraft);
    showToast("success", "Uploaded image removed.");
  };

  const validateRangeConfig = () => {
    if (!supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    )) return true;

    const min = Number(newRangeConfig.min);
    const max = Number(newRangeConfig.max);
    const warning = Number(newRangeConfig.warning);
    const danger = Number(newRangeConfig.danger);

    if (![min, max, warning, danger].every(Number.isFinite)) {
      showToast("error", "Range values must all be valid numbers.");
      return false;
    }

    if (max <= min) {
      showToast("error", "Maximum value must be greater than minimum value.");
      return false;
    }

    if (warning < min || warning > max) {
      showToast("error", "Warning value must be within the configured range.");
      return false;
    }

    if (danger < min || danger > max) {
      showToast("error", "Danger value must be within the configured range.");
      return false;
    }

    return true;
  };

  const validateBigNumberDataSources = () => {
    if (
      newType !== "bignumber" ||
      newBigNumberDisplay.mode !== "combined"
    ) {
      return true;
    }

    const primaryDataKey =
      newDataKeys[0] || newDataKey || "";

    const configuredStatusDataKey =
      newBigNumberDisplay.statusDataKey || "";

    const statusDataKey =
      configuredStatusDataKey &&
      configuredStatusDataKey !== primaryDataKey &&
      newDataKeys.includes(configuredStatusDataKey)
        ? configuredStatusDataKey
        : newDataKeys.find(
            (key) => key && key !== primaryDataKey
          ) || "";

    if (!primaryDataKey) {
      showToast(
        "error",
        "Select a numeric data source for the Stat value."
      );
      return false;
    }

    if (!statusDataKey) {
      showToast(
        "error",
        "Stat + Status requires a second data source for the machine status. Go back to Data Source and select two fields."
      );
      return false;
    }

    if (primaryDataKey === statusDataKey) {
      showToast(
        "error",
        "The numeric Stat and machine Status must use two different data sources."
      );
      return false;
    }

    return true;
  };

  const getPreparedBigNumberDisplay = () => {
    if (newType !== "bignumber") {
      return undefined;
    }

    if (newBigNumberDisplay.mode !== "combined") {
      return {
        ...newBigNumberDisplay,
        statusDataKey: "",
      };
    }

    const primaryDataKey =
      newDataKeys[0] || newDataKey || "";

    const configuredStatusDataKey =
      newBigNumberDisplay.statusDataKey || "";

    const statusDataKey =
      configuredStatusDataKey &&
      configuredStatusDataKey !== primaryDataKey &&
      newDataKeys.includes(configuredStatusDataKey)
        ? configuredStatusDataKey
        : newDataKeys.find(
            (key) => key && key !== primaryDataKey
          ) || "";

    return {
      ...newBigNumberDisplay,
      statusSource: "mapping",
      statusDataKey,
    };
  };

  // ADD WIDGET
  const addWidget = () => {
    if (!activeCell) return;

    if (!validateRangeConfig()) return;
    if (!validateBigNumberDataSources()) return;

    if (
      isMultiDataWidget &&
      newType !== "sankey" &&
      newDataKeys.length === 0
    ) {
      showToast(
        "error",
        "Please select at least one data source."
      );

      return;
    }

    const preparedSankeyConfig = getPreparedSankeyConfig();
    const hasValidSankeyOutput =
      newType !== "sankey" ||
      preparedSankeyConfig.outputs.some(
        (output) =>
          output.name &&
          (
            output.dataKey ||
            output.dataSource?.channel
          )
      );

    if (!hasValidSankeyOutput) {
      showToast(
        "error",
        "Please configure at least one Sankey output with a channel or existing data key."
      );

      return;
    }

    const sankeyDataKeys = getSankeyDataKeys(preparedSankeyConfig);

    const newItem = {
      id: Date.now(),

      type: newType,

      customWidgetTypeId: newWidgetTypeId || undefined,

      customWidgetTypeLabel:
        customWidgetTypes.find((widget) => widget.id === newWidgetTypeId)
          ?.label || undefined,

      label:
        newLabel.trim() ||
        (newType === "sankey"
          ? "Sankey Flow"
          : getFallbackWidgetLabel(
              newType,
              isMultiDataWidget
                ? newDataKeys[0] || newDataKey
                : newDataKey
            )),

      dataKey:
        newType === "sankey"
          ? sankeyDataKeys[0] || newDataKey
          : isMultiDataWidget
          ? newDataKeys[0] || newDataKey
          : newDataKey,

      dataKeys:
        newType === "sankey"
          ? sankeyDataKeys
          : isBigNumberCombined
          ? [
              newDataKeys[0] || newDataKey,
              getPreparedBigNumberDisplay()?.statusDataKey,
            ].filter(Boolean)
          : isMultiDataWidget
          ? newDataKeys
          : undefined,

      orientation:
        newType === "bar"
          ? newOrientation
          : undefined,

      chartDisplay:
        ["line", "bar", "composite"].includes(
          newType
        )
          ? { ...newChartDisplay }
          : undefined,

      historyWindow:
        ["line", "composite"].includes(newType)
          ? newHistoryWindow
          : undefined,

      compositeConfig:
        newType === "composite"
          ? { ...newCompositeConfig }
          : undefined,

      x: activeCell.col,
      y: activeCell.row,

      w: newW,
      h: newH,

      bigNumberDisplay:
        newType === "bignumber"
          ? getPreparedBigNumberDisplay()
          : undefined,

      logDisplay:
        newType === "logs"
          ? {
              ...newLogDisplay,
              levelFilter: [
                ...(newLogDisplay.levelFilter ||
                  []),
              ],
            }
          : undefined,

      logs: undefined,

      rangeConfig: supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    )
        ? { ...newRangeConfig }
        : undefined,

      image:
        newType === "image"
          ? imageDraft
          : undefined,

      pins:
        newType === "image"
          ? imageDraftPins
          : undefined,

      sankeyConfig:
        newType === "sankey"
          ? preparedSankeyConfig
          : undefined,
    };

    if (
      newItem.x + newItem.w > cols ||
      newItem.y + newItem.h > rows
    ) {
      showToast("error", "This widget exceeds the dashboard grid.");
      return;
    }

    if (hasCollision(newItem)) {
      showToast("error", "That dashboard space is already occupied.");
      return;
    }

    setItems((prev) => [...prev, newItem]);

    setShowModal(false);
    setActiveCell(null);
    setNewLabel("");
    setImageDraftPins([]);
    setImageDraft(defaultImageDraft);
    setSankeyConfig(defaultSankeyConfig);
    setNewBigNumberDisplay({
      ...defaultBigNumberDisplay,
      mappings:
        defaultBigNumberDisplay.mappings.map(
          (mapping) => ({ ...mapping })
        ),
    });
    setNewRangeConfig({
      ...defaultRangeConfig,
    });

    setNewCompositeConfig({
      ...DEFAULT_COMPOSITE_CONFIG,
    });

    setNewLogDisplay({
      ...defaultLogDisplay,
      levelFilter: [
        ...defaultLogDisplay.levelFilter,
      ],
    });
  };

  // UPDATE WIDGET
  const updateWidget = () => {
    if (!selectedItem) return;

    if (!validateRangeConfig()) return;
    if (!validateBigNumberDataSources()) return;

    if (
      isMultiDataWidget &&
      newDataKeys.length === 0
    ) {
      showToast(
        "error",
        "Please select at least one data source."
      );

      return;
    }

    const preparedSankeyConfig = getPreparedSankeyConfig();
    const hasValidSankeyOutput =
      newType !== "sankey" ||
      preparedSankeyConfig.outputs.some(
        (output) =>
          output.name &&
          (
            output.dataKey ||
            output.dataSource?.channel
          )
      );

    if (!hasValidSankeyOutput) {
      showToast(
        "error",
        "Please configure at least one Sankey output with a channel or existing data key."
      );

      return;
    }

    const sankeyDataKeys = getSankeyDataKeys(preparedSankeyConfig);

    const resizedCandidate = {
      ...selectedItem,
      type: newType,
      w: newW,
      h: newH,
    };

    if (!isResizeAvailable(resizedCandidate)) {
      showToast(
        "error",
        "This widget size exceeds the grid or overlaps another widget."
      );

      return;
    }

    const updatedItems = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,

            type: newType,

            customWidgetTypeId: newWidgetTypeId || undefined,

            customWidgetTypeLabel:
              customWidgetTypes.find((widget) => widget.id === newWidgetTypeId)
                ?.label || undefined,

            label:
              newLabel.trim() ||
              (newType === "sankey"
                ? "Sankey Flow"
                : getFallbackWidgetLabel(
                    newType,
                    isMultiDataWidget
                      ? newDataKeys[0] || newDataKey
                      : newDataKey
                  )),

            dataKey:
              newType === "sankey"
                ? sankeyDataKeys[0] || ""
                : isMultiDataWidget
                ? newDataKeys[0] || newDataKey
                : newDataKey,

            dataKeys:
              newType === "sankey"
                ? sankeyDataKeys
                : isBigNumberCombined
                ? [
                    newDataKeys[0] || newDataKey,
                    getPreparedBigNumberDisplay()?.statusDataKey,
                  ].filter(Boolean)
                : isMultiDataWidget
                ? newDataKeys
                : undefined,

            orientation:
              newType === "bar"
                ? newOrientation
                : undefined,

            chartDisplay:
              ["line", "bar", "composite"].includes(
                newType
              )
                ? { ...newChartDisplay }
                : undefined,

            historyWindow:
              ["line", "composite"].includes(
                newType
              )
                ? newHistoryWindow
                : undefined,

            compositeConfig:
              newType === "composite"
                ? { ...newCompositeConfig }
                : undefined,

            w: newW,
            h: newH,

            bigNumberDisplay:
              newType === "bignumber"
                ? getPreparedBigNumberDisplay()
                : undefined,

            logDisplay:
              newType === "logs"
                ? {
                    ...newLogDisplay,
                    levelFilter: [
                      ...(newLogDisplay.levelFilter ||
                        []),
                    ],
                  }
                : undefined,

            logs:
              newType === "logs"
                ? selectedItem.logs
                : selectedItem.logs,

            rangeConfig: supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    )
              ? { ...newRangeConfig }
              : undefined,

            image:
              newType === "image"
                ? imageDraft
                : selectedItem.image,

            pins:
              newType === "image"
                ? imageDraftPins
                : selectedItem.pins || [],

            sankeyConfig:
              newType === "sankey"
                ? preparedSankeyConfig
                : selectedItem.sankeyConfig,
          }
        : item
    );

    setItems(updatedItems);

    setShowModal(false);
    setActiveItemId(null);
    setNewLabel("");
    setImageDraftPins([]);
    setImageDraft(defaultImageDraft);
    setSankeyConfig(defaultSankeyConfig);
    setNewBigNumberDisplay({
      ...defaultBigNumberDisplay,
      mappings:
        defaultBigNumberDisplay.mappings.map(
          (mapping) => ({ ...mapping })
        ),
    });
    setNewRangeConfig({
      ...defaultRangeConfig,
    });

    setNewCompositeConfig({
      ...DEFAULT_COMPOSITE_CONFIG,
    });

    setNewLogDisplay({
      ...defaultLogDisplay,
      levelFilter: [
        ...defaultLogDisplay.levelFilter,
      ],
    });
  };

  // REMOVE WIDGET
  const removeWidget = (id) => {
    setItems((prev) =>
      prev.filter((i) => i.id !== id)
    );

    setShowModal(false);
    setActiveItemId(null);
    setNewLabel("");
    setImageDraftPins([]);
    setImageDraft(defaultImageDraft);
    setSankeyConfig(defaultSankeyConfig);
    setNewBigNumberDisplay({
      ...defaultBigNumberDisplay,
      mappings:
        defaultBigNumberDisplay.mappings.map(
          (mapping) => ({ ...mapping })
        ),
    });
    setNewRangeConfig({
      ...defaultRangeConfig,
    });

    setNewLogDisplay({
      ...defaultLogDisplay,
      levelFilter: [
        ...defaultLogDisplay.levelFilter,
      ],
    });
  };

  // CREATE OR UPDATE TEMPLATE
  const saveTemplate = async () => {
    const token =
      localStorage.getItem("token");

    const dataSources =
      customDataOptions.reduce(
        (result, option) => {
          const source = option?.source;

          if (
            option?.key &&
            source?.bucket &&
            source?.measurement &&
            (
              source?.tagValue ||
              source?.id
            ) &&
            (
              source?.field ||
              source?.channel
            )
          ) {
            result[option.key] = {
              bucket: source.bucket,
              measurement:
                source.measurement,
              tagKey:
                source.tagKey || "id",
              tagValue:
                source.tagValue ||
                source.id,
              id:
                source.tagValue ||
                source.id,
              field:
                source.field ||
                source.channel,
            };
          }

          return result;
        },
        {}
      );

    try {
      const endpoint = isEditingTemplate
        ? `http://localhost:5000/templates/${selectedTemplate.id}`
        : "http://localhost:5000/templates";

      const res = await fetch(endpoint, {
          method: isEditingTemplate ? "PUT" : "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            name:
              templateName ||
              `Template ${Date.now()}`,

            layout: {
              rows,
              cols,

              // Preferred architecture:
              // every dashboard data key owns a complete source.
              dataSources,

              // Compatibility fallback for older runtime code.
              influx:
                Object.values(dataSources)[0]
                  ? {
                      ...Object.values(
                        dataSources
                      )[0],
                    }
                  : undefined,

              channelMap,
              customDataOptions,
              customWidgetTypes,

              items,
            },
          }),
        }
      );

      const text = await res.text();

      console.log(
        isEditingTemplate ? "✅ UPDATE RESPONSE:" : "✅ CREATE RESPONSE:",
        text
      );

      if (!res.ok) {
        throw new Error(text);
      }

      setToast({
        type: "success",
        message: isEditingTemplate
          ? "Template updated successfully."
          : "Template created successfully.",
      });

      setTimeout(() => {
        setPage("templates");
      }, 900);
    } catch (err) {
      console.error(
        isEditingTemplate ? "❌ UPDATE ERROR:" : "❌ CREATE ERROR:",
        err
      );

      showToast(
        "error",
        `Failed to ${isEditingTemplate ? "update" : "create"} the template. Please try again.`
      );
    }
  };

  // BASE PREVIEW
  const base = isEdit
    ? selectedItem
    : activeCell
    ? {
        type: newType,

        customWidgetTypeId: newWidgetTypeId || undefined,

        customWidgetTypeLabel:
          customWidgetTypes.find((widget) => widget.id === newWidgetTypeId)
            ?.label || undefined,

        label:
          newLabel.trim() ||
          getDefaultWidgetLabel(newType),

        dataKey:
          newType === "sankey"
            ? getSankeyDataKeys(getPreparedSankeyConfig())[0] || ""
            : isMultiDataWidget
            ? newDataKeys[0] || newDataKey
            : newDataKey,

        dataKeys:
          newType === "sankey"
            ? getSankeyDataKeys(getPreparedSankeyConfig())
            : isBigNumberCombined
            ? [
                newDataKeys[0] || newDataKey,
                getPreparedBigNumberDisplay()?.statusDataKey,
              ].filter(Boolean)
            : isMultiDataWidget
            ? newDataKeys
            : undefined,

        orientation:
          newType === "bar"
            ? newOrientation
            : undefined,

        chartDisplay:
          ["line", "bar"].includes(
            newType
          )
            ? { ...newChartDisplay }
            : undefined,

        historyWindow:
          newType === "line"
            ? newHistoryWindow
            : undefined,

        w: newW,
        h: newH,

        bigNumberDisplay:
          newType === "bignumber"
            ? getPreparedBigNumberDisplay()
            : undefined,

        logDisplay:
          newType === "logs"
            ? {
                ...newLogDisplay,
                levelFilter: [
                  ...(newLogDisplay.levelFilter ||
                    []),
                ],
              }
            : undefined,

        logs: undefined,

        rangeConfig: supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    )
          ? { ...newRangeConfig }
          : undefined,

        sankeyConfig:
          newType === "sankey"
            ? getPreparedSankeyConfig()
            : undefined,
      }
    : null;

  const isDataSourceRequired =
    !["image", "sankey", "logs", "status"].includes(newType);

  // Data Status and Logs are fully configured after Appearance.
  // They do not require a direct field selection in Step 1.
  const skipsWidgetDataSourceStep =
    ["status", "logs"].includes(newType);

  const hasSelectedDataSource =
    newType === "sankey"
      ? getConfiguredSankeyOutputs().length > 0
      : isMultiDataWidget
      ? newDataKeys.length > 0
      : Boolean(newDataKey);

  const selectedSourceCount =
    newType === "sankey"
      ? getConfiguredSankeyOutputs().length
      : isMultiDataWidget
      ? newDataKeys.filter(Boolean).length
      : newDataKey
      ? 1
      : 0;

  const selectedWidgetTypeLabel =
    allWidgetOptions.find((option) =>
      option.isCustomWidgetType
        ? option.optionId === newWidgetTypeId
        : !newWidgetTypeId &&
          option.type === newType
    )?.label ||
    getDefaultWidgetLabel(newType).replace(
      / Widget$/,
      ""
    );

  const widgetSummarySourceText =
    newType === "image"
      ? "Image / pin configuration"
      : newType === "status"
      ? "Dedicated status source"
      : newType === "logs"
      ? "Dedicated log source"
      : newType === "sankey"
      ? `${selectedSourceCount} configured output${
          selectedSourceCount === 1 ? "" : "s"
        }`
      : `${selectedSourceCount} source${
          selectedSourceCount === 1 ? "" : "s"
        }`;

  const selectedPreviewKeys = isMultiDataWidget
    ? newDataKeys
    : newDataKey
    ? [newDataKey]
    : [];

  const hasPositivePreviewValue = selectedPreviewKeys.some((key) => {
    const numericValue = Number(previewValues[key]);
    return Number.isFinite(numericValue) && numericValue > 0;
  });

  const showEmptyLivePreview =
    isDataSourceRequired &&
    !hasSelectedDataSource &&
    newType !== "sankey";

  const showNoValuesLivePreview =
    newType === "pie" &&
    hasSelectedDataSource &&
    !hasPositivePreviewValue;

  const goToNextWidgetStep = () => {
    if (
      widgetStep === 1 &&
      !useDedicatedWidgetSource &&
      newDataKeys.length === 0 &&
      !newDataKey
    ) {
      showToast(
        "error",
        "Select at least one data source before choosing a widget type."
      );
      return;
    }

    setWidgetStep((step) => Math.min(step + 1, 3));
  };

  useEffect(() => {
    let frameId = null;

    const updateGridViewportHeight = () => {
      frameId = window.requestAnimationFrame(
        () => {
          const rect =
            gridRef.current?.getBoundingClientRect();

          if (!rect) return;

          const bottomGap = 12;

          setGridViewportHeight(
            Math.max(
              280,
              Math.floor(
                window.innerHeight -
                  rect.top -
                  bottomGap
              )
            )
          );
        }
      );
    };

    updateGridViewportHeight();

    window.addEventListener(
      "resize",
      updateGridViewportHeight
    );

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(
            updateGridViewportHeight
          )
        : null;

    const parent =
      gridRef.current?.parentElement;

    if (parent && resizeObserver) {
      resizeObserver.observe(parent);
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener(
        "resize",
        updateGridViewportHeight
      );

      resizeObserver?.disconnect();
    };
  }, [rows, cols]);

  const gridGapPx = 12;

  // Keep widget rows visually consistent when the template grows.
  //
  // The 3-row layout is treated as the normal dashboard baseline.
  // Rows 4, 5, 6... keep the SAME row height instead of shrinking
  // to squeeze everything into one viewport.
  //
  // The grid simply becomes taller and the builder scrolls naturally.
  const baselineVisibleRows = 3;
  const minimumGridRowHeight = 150;

  const baselineRowHeight =
    Math.max(
      minimumGridRowHeight,
      Math.floor(
        (
          gridViewportHeight -
          Math.max(
            0,
            baselineVisibleRows - 1
          ) *
            gridGapPx
        ) /
          baselineVisibleRows
      )
    );

  // For 1-3 rows, continue using the available page height nicely.
  // For >3 rows, lock each row to the normal 3-row height.
  const fittedGridRowHeight =
    rows <= baselineVisibleRows
      ? Math.max(
          baselineRowHeight,
          Math.floor(
            (
              gridViewportHeight -
              Math.max(0, rows - 1) *
                gridGapPx
            ) /
              rows
          )
        )
      : baselineRowHeight;

  const fittedGridHeight =
    rows * fittedGridRowHeight +
    Math.max(0, rows - 1) *
      gridGapPx;

  if (isEditingTemplate && !selectedTemplate) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-xl">
        No template selected
      </div>
    );
  }

  return (
    <div className="template-builder relative h-full overflow-auto bg-transparent p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <style>{`
        .dark .template-builder {
          color: #e2e8f0;
        }

        .dark .template-builder .bg-white {
          background-color: #0f172a !important;
        }

        .dark .template-builder .bg-gray-50 {
          background-color: #0b1220 !important;
        }

        .dark .template-builder .bg-gray-100 {
          background-color: #0b1220 !important;
        }

        .dark .template-builder .bg-gray-200 {
          background-color: #1e293b !important;
        }

        .dark .template-builder .bg-gray-800,
        .dark .template-builder .bg-slate-800 {
          background-color: #1e293b !important;
        }

        .dark .template-builder .bg-gray-900,
        .dark .template-builder .bg-slate-900 {
          background-color: #0f172a !important;
        }

        .dark .template-builder .bg-gray-950,
        .dark .template-builder .bg-slate-950 {
          background-color: #020617 !important;
        }

        .dark .template-builder .border-gray-200,
        .dark .template-builder .border-gray-300,
        .dark .template-builder .border-gray-700,
        .dark .template-builder .border-slate-700,
        .dark .template-builder .border-slate-600 {
          border-color: #334155 !important;
        }

        .dark .template-builder .text-gray-900,
        .dark .template-builder .text-gray-800,
        .dark .template-builder .text-gray-700,
        .dark .template-builder .text-slate-600 {
          color: #f8fafc !important;
        }

        .dark .template-builder .text-gray-600,
        .dark .template-builder .text-gray-500,
        .dark .template-builder .text-slate-300 {
          color: #cbd5e1 !important;
        }

        .dark .template-builder .text-gray-400,
        .dark .template-builder .text-gray-300,
        .dark .template-builder .text-slate-400 {
          color: #94a3b8 !important;
        }

        .dark .template-builder input,
        .dark .template-builder select,
        .dark .template-builder textarea {
          color: #f8fafc !important;
          background-color: #020617 !important;
          border-color: #475569 !important;
        }

        .dark .template-builder input::placeholder,
        .dark .template-builder textarea::placeholder {
          color: #64748b !important;
        }

        .dark .template-builder option {
          color: #f8fafc !important;
          background-color: #020617 !important;
        }

        .dark .template-builder .hover\:bg-gray-100:hover,
        .dark .template-builder .hover\:bg-gray-50:hover {
          background-color: #1e293b !important;
        }

        .dark .template-builder .dark\:hover\:bg-gray-800:hover,
        .dark .template-builder .dark\:hover\:bg-slate-800:hover {
          background-color: #1e293b !important;
        }

        .template-builder .data-mapping-toggle {
          background-color: transparent;
        }

        .template-builder .data-mapping-toggle:hover {
          background-color: rgba(16, 185, 129, 0.07);
        }

        .dark .template-builder .data-mapping-toggle {
          background-color: rgba(2, 6, 23, 0.28);
        }

        .dark .template-builder .data-mapping-toggle:hover {
          background-color: rgba(16, 185, 129, 0.1) !important;
        }

        .template-builder .data-mapping-toggle:focus-visible {
          outline: 2px solid rgba(16, 185, 129, 0.65);
          outline-offset: -2px;
        }

        .template-builder .resize-handle {
          touch-action: none;
        }

        .template-builder .resizing-widget {
          outline: 2px solid rgba(16, 185, 129, 0.9);
          outline-offset: 2px;
        }
      `}</style>
      {/* GRID BACKGROUND */}
      <div
        className="
          absolute inset-0
          bg-[linear-gradient(to_right,#d1d5db_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db_1px,transparent_1px)]
          bg-[size:40px_40px]
          opacity-10 dark:opacity-[0.035]
          pointer-events-none
        "
      />

      {/* COMPACT BUILDER HEADER */}
      <div
        className="
          sticky top-0 z-20
          mb-2 rounded-2xl
          border border-slate-200
          bg-white p-3
          shadow-[0_3px_12px_rgba(15,23,42,0.05)]
          dark:border-slate-800
          dark:bg-slate-900
          dark:shadow-none
        "
      >
        {/* TITLE / MAIN ACTION */}
        <div
          className="
            flex items-center
            justify-between gap-3
          "
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="
                flex h-8 w-8 shrink-0
                items-center justify-center
                rounded-lg bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/10
                dark:text-emerald-300
              "
            >
              <LayoutGrid size={16} />
            </div>

            <div className="min-w-0">
              <h1
                className="
                  truncate text-xl
                  font-bold tracking-tight
                  text-slate-950
                  dark:text-white
                "
              >
                {isEditingTemplate
                  ? "Template Editor"
                  : "Template Builder"}
              </h1>

              <p
                className="
                  hidden text-[11px]
                  text-slate-500
                  dark:text-slate-400
                  md:block
                "
              >
                {isEditingTemplate
                  ? "Edit dashboard layout and widgets."
                  : "Design dashboard layout and widgets."}
              </p>
            </div>
          </div>

          <button
            onClick={saveTemplate}
            className="
              inline-flex h-8 shrink-0
              items-center justify-center
              gap-1.5 rounded-lg
              bg-emerald-600 px-3
              text-xs font-semibold
              text-white shadow-sm
              transition-colors
              hover:bg-emerald-700
            "
          >
            <Save size={14} />

            <span className="hidden sm:inline">
              {isEditingTemplate
                ? "Update Template"
                : "Create Template"}
            </span>

            <span className="sm:hidden">
              {isEditingTemplate
                ? "Update"
                : "Create"}
            </span>
          </button>
        </div>

        {/* NAME + COMPACT GRID CONTROLS */}
        <div
          className="
            mt-2 grid
            grid-cols-1 gap-2
            xl:grid-cols-[minmax(260px,1fr)_auto]
            xl:items-end
          "
        >
          {/* TEMPLATE NAME */}
          <div>
            <label
              className="
                mb-1 block
                text-[10px] font-semibold
                uppercase tracking-[0.08em]
                text-slate-400
              "
            >
              Template Name
            </label>

            <input
              type="text"
              placeholder="Template Name..."
              value={templateName}
              onChange={(e) =>
                setTemplateName(e.target.value)
              }
              className="
                h-8 w-full rounded-lg
                border border-slate-300
                bg-white px-3
                text-sm text-slate-900
                outline-none transition
                focus:border-emerald-500
                focus:ring-2
                focus:ring-emerald-500/15
                dark:border-slate-700
                dark:bg-slate-950
                dark:text-white
              "
            />
          </div>

          {/* GRID SIZE */}
          <div>
            <div
              className="
                mb-1 flex items-center
                justify-between gap-3
              "
            >
              <label
                className="
                  text-[10px] font-semibold
                  uppercase tracking-[0.08em]
                  text-slate-400
                "
              >
                Grid Size
              </label>

              <span
                className="
                  text-[10px]
                  text-slate-400
                  dark:text-slate-500
                "
              >
                {rows} × {cols}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* ROWS */}
              <div
                className="
                  flex h-8 items-center
                  overflow-hidden rounded-lg
                  border border-slate-300
                  bg-white
                  dark:border-slate-700
                  dark:bg-slate-950
                "
                title={`Rows · allowed ${GRID_MIN_ROWS}–${GRID_MAX_ROWS}`}
              >
                <span
                  className="
                    border-r border-slate-200
                    px-2 text-[10px]
                    font-semibold text-slate-400
                    dark:border-slate-700
                  "
                >
                  R
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateGridRows(rows - 1)
                  }
                  className="
                    h-full w-7
                    text-sm font-bold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    dark:text-slate-300
                    dark:hover:bg-slate-800
                  "
                >
                  −
                </button>

                <input
                  type="number"
                  min={GRID_MIN_ROWS}
                  max={GRID_MAX_ROWS}
                  value={rows}
                  onChange={(event) =>
                    updateGridRows(
                      event.target.value
                    )
                  }
                  className="
                    h-full w-9 border-0
                    bg-transparent px-0
                    text-center text-xs
                    font-bold outline-none
                    focus:ring-0
                    dark:text-white
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    updateGridRows(rows + 1)
                  }
                  className="
                    h-full w-7
                    text-sm font-bold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    dark:text-slate-300
                    dark:hover:bg-slate-800
                  "
                >
                  +
                </button>
              </div>

              {/* COLUMNS */}
              <div
                className="
                  flex h-8 items-center
                  overflow-hidden rounded-lg
                  border border-slate-300
                  bg-white
                  dark:border-slate-700
                  dark:bg-slate-950
                "
                title={`Columns · allowed ${GRID_MIN_COLS}–${GRID_MAX_COLS}`}
              >
                <span
                  className="
                    border-r border-slate-200
                    px-2 text-[10px]
                    font-semibold text-slate-400
                    dark:border-slate-700
                  "
                >
                  C
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateGridCols(cols - 1)
                  }
                  className="
                    h-full w-7
                    text-sm font-bold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    dark:text-slate-300
                    dark:hover:bg-slate-800
                  "
                >
                  −
                </button>

                <input
                  type="number"
                  min={GRID_MIN_COLS}
                  max={GRID_MAX_COLS}
                  value={cols}
                  onChange={(event) =>
                    updateGridCols(
                      event.target.value
                    )
                  }
                  className="
                    h-full w-9 border-0
                    bg-transparent px-0
                    text-center text-xs
                    font-bold outline-none
                    focus:ring-0
                    dark:text-white
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    updateGridCols(cols + 1)
                  }
                  className="
                    h-full w-7
                    text-sm font-bold
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    dark:text-slate-300
                    dark:hover:bg-slate-800
                  "
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE DROP ZONE */}
      {draggingItemId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverTrash(true);
            setDragPreview(null);
            setDragOverCell(null);
          }}
          onDragLeave={(e) => {
            if (
              !e.currentTarget.contains(
                e.relatedTarget
              )
            ) {
              setDragOverTrash(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();

            const droppedItemId =
              draggingItemId ||
              Number(
                e.dataTransfer.getData(
                  "text/plain"
                )
              );

            if (droppedItemId) {
              removeWidget(droppedItemId);
            }

            setDraggingItemId(null);
            setDragPreview(null);
            setDragOverCell(null);
            setDragOverTrash(false);
            setDidDrag(false);
          }}
          className={`
            fixed bottom-5 left-1/2 -translate-x-1/2
            z-40
            w-[min(920px,calc(100%-3rem))]
            h-16
            rounded-2xl
            border
            px-5
            flex items-center justify-center gap-3
            text-sm font-medium
            backdrop-blur-xl
            shadow-lg
            transition-all duration-200
            ${
              dragOverTrash
                ? `
                    border-red-400
                    bg-red-500/95
                    text-white
                    scale-[1.02]
                    shadow-red-500/25
                  `
                : `
                    border-gray-200 dark:border-slate-700/80 dark:border-gray-700/80
                    bg-white dark:bg-slate-900/80
                    text-gray-500 dark:text-slate-300
                  `
            }
          `}
        >
          <Trash2 size={20} />
          {dragOverTrash
            ? "Release to delete widget"
            : "Drag widget here to delete"}
        </div>
      )}

      {/* GRID */}
      <div
        ref={gridRef}
        onDragOver={updateSmartDragPreview}
        onDrop={completeSmartDrop}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragPreview(null);
            setDragOverCell(null);
          }
        }}
        className="grid gap-3 relative z-10"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, ${fittedGridRowHeight}px)`,
          height: `${fittedGridHeight}px`,
          minWidth: 0,
        }}
      >
        {dragPreview && (
          <div
            aria-hidden="true"
            className={`
              pointer-events-none z-30
              flex items-center justify-center
              rounded-3xl border-2 border-dashed
              transition-all duration-150
              ${
                dragPreview.valid
                  ? "border-emerald-500 bg-emerald-500/15"
                  : "border-red-500 bg-red-500/15"
              }
            `}
            style={{
              gridColumn: `${dragPreview.col + 1} / span ${dragPreview.w}`,
              gridRow: `${dragPreview.row + 1} / span ${dragPreview.h}`,
            }}
          >
            <span
              className={`
                rounded-xl px-3 py-2 text-xs font-semibold shadow-sm
                ${
                  dragPreview.valid
                    ? "bg-emerald-600 text-white"
                    : "bg-red-500 text-white"
                }
              `}
            >
              {dragPreview.valid
                ? `Drop ${dragPreview.w}×${dragPreview.h} widget here`
                : "No available space"}
            </span>
          </div>
        )}

        {/* EMPTY CELLS */}
        {Array.from({
          length: rows * cols,
        }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;

          if (isCellOccupied(r, c)) return null;

          const isDragOver =
            dragOverCell?.row === r &&
            dragOverCell?.col === c;

          return (
            <div
              key={i}
              style={{
                gridColumn: `${c + 1}`,
                gridRow: `${r + 1}`,
              }}
              onClick={() => {
                setActiveCell({
                  row: r,
                  col: c,
                });

                setActiveItemId(null);

                setNewType(widgetLibrary[0].type);
                setNewLabel("");
                setNewW(1);
                setNewH(1);
                setImageDraftPins([]);
                setImageDraft(defaultImageDraft);

                setWidgetStep(1);
                setShowModal(true);
              }}
              className={`
                rounded-2xl
                border-2 border-dashed
                bg-white dark:bg-slate-900/40 dark:bg-gray-800/30
                backdrop-blur-sm
                transition-all duration-200
                flex items-center justify-center
                cursor-pointer

                ${
                  isDragOver
                    ? `
                      border-emerald-500
                      bg-emerald-50
                      dark:bg-emerald-900/20
                      scale-[1.02]
                    `
                    : `
                      border-gray-300 dark:border-slate-600
                      hover:border-emerald-500
                      hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                    `
                }
              `}
            >
              <div className="text-center">
                {draggingItemId ? (
                  <>
                    <Move className="mx-auto mb-2 text-emerald-500" />

                    <p className="text-sm text-emerald-500">
                      Drop Here
                    </p>
                  </>
                ) : (
                  <>
                    <>
                      <Plus className="mx-auto mb-2 text-gray-400 dark:text-slate-400" />

                      <p className="text-sm text-gray-400 dark:text-slate-400">
                        Add Widget
                      </p>
                    </>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* WIDGETS */}
        {items.map((item) => (
          <div
            key={item.id}
            draggable={!resizingItemId}
            onDragStart={(e) => {
              if (resizingItemId) {
                e.preventDefault();
                return;
              }

              e.stopPropagation();

              setDraggingItemId(item.id);
              setDragPreview({
                valid: true,
                row: item.y,
                col: item.x,
                w: item.w,
                h: item.h,
              });
              setDidDrag(true);

              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData(
                "text/plain",
                String(item.id)
              );
            }}
            onDragEnd={() => {
              setDraggingItemId(null);
              setDragPreview(null);
              setDragOverCell(null);
              setDragOverTrash(false);

              setTimeout(() => {
                setDidDrag(false);
              }, 80);
            }}
            onClick={(e) => {
              e.stopPropagation();

              if (didDrag) return;

              setActiveItemId(item.id);
              setActiveCell(null);
              setWidgetStep(1);
              setShowModal(true);
            }}
            className={`
              group
              relative
              min-h-0 min-w-0
              bg-white dark:bg-slate-900
              border border-gray-200 dark:border-slate-700
              rounded-3xl
              shadow-lg
              hover:shadow-2xl
              hover:-translate-y-1
              transition-all duration-300
              overflow-hidden
              p-4
              cursor-move

              ${
                draggingItemId === item.id
                  ? "opacity-50 scale-95"
                  : ""
              }

              ${
                resizingItemId === item.id
                  ? "resizing-widget"
                  : ""
              }
            `}
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
          >
            {/* DRAG BADGE */}
            <div
              className="
                absolute top-3 right-3
                z-20
                w-8 h-8
                rounded-xl
                bg-white dark:bg-slate-900/90
                border border-gray-200 dark:border-slate-700
                shadow-sm
                flex items-center justify-center
                text-gray-400 dark:text-slate-400
                group-hover:text-emerald-500
              "
              title="Drag to move"
            >
              <Move size={15} />
            </div>

            {/* ACTUAL WIDGET PREVIEW */}
            <div className="absolute inset-0 p-4 pointer-events-none">
              {item.type === "image" ? (
                <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#050a1e]">
                  <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">
                    <WidgetRenderer
                      type={item.type}
                      value={previewValues[item.dataKey]}
                      data={{
                        ...previewValues,
                        logs:
                          item.type === "logs"
                            ? Array.isArray(item.logs) &&
                              item.logs.length > 0
                              ? item.logs
                              : previewLogs
                            : undefined,
                      }}
                      history={previewHistory}
                      dataKey={item.dataKey}
                      item={{
                        ...item,
                        logs:
                          item.type === "logs"
                            ? Array.isArray(item.logs) &&
                              item.logs.length > 0
                              ? item.logs
                              : previewLogs
                            : item.logs,
                        previewMode: item.type === "sankey",
                        sankeyConfig:
                          item.type === "sankey"
                            ? item.sankeyConfig || defaultSankeyConfig
                            : item.sankeyConfig,
                      }}
                      updateItem={() => {}}
                      editMode={false}
                    />
                  </div>
                </div>
              ) : (
                <WidgetRenderer
                  type={item.type}
                  value={previewValues[item.dataKey]}
                  data={{
                    ...previewValues,
                    logs:
                      item.type === "logs"
                        ? Array.isArray(item.logs) &&
                          item.logs.length > 0
                          ? item.logs
                          : previewLogs
                        : undefined,
                  }}
                  history={previewHistory}
                  dataKey={item.dataKey}
                  item={{
                    ...item,
                    logs:
                      item.type === "logs"
                        ? Array.isArray(item.logs) &&
                          item.logs.length > 0
                          ? item.logs
                          : previewLogs
                        : item.logs,
                    previewMode: item.type === "sankey",
                    sankeyConfig:
                      item.type === "sankey"
                        ? item.sankeyConfig || defaultSankeyConfig
                        : item.sankeyConfig,
                  }}
                  updateItem={() => {}}
                  editMode={false}
                />
              )}
            </div>

            {/* RESIZE HANDLE */}
            <button
              type="button"
              onMouseDown={(event) => startResizeWidget(event, item)}
              onClick={(event) => event.stopPropagation()}
              className="
                resize-handle
                absolute bottom-3 right-3
                z-20
                w-9 h-9
                rounded-2xl
                border border-emerald-300 dark:border-emerald-700
                bg-white/95 dark:bg-slate-900/95
                shadow-lg
                flex items-center justify-center
                text-emerald-600 dark:text-emerald-300
                opacity-80 group-hover:opacity-100
                cursor-se-resize
                transition
                hover:scale-110
              "
              title="Drag to resize"
            >
              ↘
            </button>

            {/* EDIT ICON */}
            <div
              className="
                absolute bottom-14 right-3
                w-8 h-8
                rounded-full
                bg-white dark:bg-slate-900/90
                border border-gray-200 dark:border-slate-700
                shadow
                flex items-center justify-center
                opacity-70 group-hover:opacity-100
              "
            >
              <Pencil className="w-4 h-4 text-gray-500 dark:text-slate-300 group-hover:text-emerald-500" />
            </div>

            {/* SIZE BADGE */}
            <div
              className="
                absolute bottom-3 left-3
                text-xs
                text-gray-400 dark:text-slate-400
                bg-white dark:bg-slate-900/80
                px-2 py-1
                rounded-lg
              "
            >
              {item.w}×{item.h}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div
          className={`
            fixed right-5 top-5 z-[100]
            flex w-[min(420px,calc(100vw-2.5rem))]
            items-start gap-3 rounded-2xl border p-4 shadow-2xl
            backdrop-blur-xl
            ${
              toast.type === "error"
                ? "border-red-200 bg-white dark:bg-slate-900/95 text-red-800 dark:border-red-900 dark:bg-gray-900/95 dark:text-red-200"
                : "border-emerald-200 bg-white dark:bg-slate-900/95 text-emerald-800 dark:border-emerald-900 dark:bg-gray-900/95 dark:text-emerald-200"
            }
          `}
          role="status"
        >
          <div
            className={`
              flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
              ${
                toast.type === "error"
                  ? "bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300"
              }
            `}
          >
            {toast.type === "error" ? (
              <AlertCircle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold">
              {toast.type === "error" ? "Action required" : "Template created"}
            </p>
            <p className="mt-1 text-sm leading-relaxed opacity-90">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="
              rounded-xl p-1.5 text-gray-400 dark:text-slate-400 transition
              hover:bg-gray-100 dark:bg-[#050a1e] hover:text-gray-700 dark:text-slate-200
              dark:hover:bg-gray-800 dark:hover:text-white
            "
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* MODAL */}
      {showModal && base && (
        <div
          className="
            fixed inset-0 z-50
            bg-slate-100
            dark:bg-slate-950
          "
        >
          <div
            className="
              h-screen w-screen
              overflow-hidden
              bg-white dark:bg-slate-900
              flex flex-col
            "
          >
            {/* HEADER */}
            <div
              className="
                flex shrink-0 items-center
                justify-between gap-3
                border-b border-gray-200 dark:border-slate-700
                px-4 py-2.5 sm:px-5 sm:py-3
                bg-white dark:bg-slate-900
              "
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="
                      flex h-9 w-9 items-center justify-center
                      rounded-xl bg-emerald-50 text-emerald-600
                      dark:bg-emerald-500/10 dark:text-emerald-300
                    "
                  >
                    <LayoutGrid size={18} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold dark:text-white sm:text-lg">
                      {isEdit
                        ? "Edit Widget"
                        : "Add Widget"}
                    </h2>

                    <p className="mt-0.5 hidden truncate text-xs text-gray-500 dark:text-slate-400 md:block">
                      Preview the widget, configure its source, and adjust display settings in one workspace.
                    </p>
                  </div>
                </div>


              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <span
                  className="
                    mr-1 hidden rounded-full
                    border border-slate-200
                    bg-slate-50 px-2.5 py-1
                    text-[10px] text-slate-400
                    dark:border-slate-700
                    dark:bg-slate-800
                    xl:inline-flex
                  "
                >
                  Drag dividers to resize
                </span>

                {isEdit && selectedItem && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this widget from the template?"
                        )
                      ) {
                        removeWidget(
                          selectedItem.id
                        );
                      }
                    }}
                    className="
                      inline-flex h-9
                      items-center justify-center
                      gap-1.5 rounded-lg
                      border border-red-200
                      bg-red-50 px-3
                      text-xs font-semibold
                      text-red-600
                      transition-colors
                      hover:bg-red-100
                      focus:outline-none
                      focus:ring-2
                      focus:ring-red-400/30
                      dark:border-red-500/30
                      dark:bg-red-500/10
                      dark:text-red-300
                      dark:hover:bg-red-500/20
                    "
                  >
                    <Trash2 size={14} />

                    <span className="hidden sm:inline">
                      Delete
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    isEdit
                      ? updateWidget
                      : addWidget
                  }
                  className="
                    inline-flex h-9
                    min-w-[106px]
                    items-center justify-center
                    gap-1.5 rounded-lg
                    bg-emerald-600 px-3
                    text-xs font-semibold
                    text-white shadow-sm
                    transition-colors
                    hover:bg-emerald-700
                    focus:outline-none
                    focus:ring-2
                    focus:ring-emerald-500/30
                  "
                >
                  <Save size={14} />

                  <span>
                    {isEdit
                      ? "Save Changes"
                      : "Add Widget"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="
                    flex h-9 w-9
                    items-center justify-center
                    rounded-lg
                    border border-slate-200
                    bg-white text-slate-500
                    transition-colors
                    hover:bg-slate-100
                    hover:text-slate-800
                    focus:outline-none
                    focus:ring-2
                    focus:ring-slate-300/50
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:text-slate-300
                    dark:hover:bg-slate-800
                    dark:hover:text-white
                  "
                  aria-label="Close Widget Studio"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div
              ref={studioBodyRef}
              className="
                grid min-h-0 flex-1
                overflow-hidden
              "
              style={{
                gridTemplateColumns:
                  `minmax(0, ${studioSplit}fr) 8px minmax(300px, ${100 - studioSplit}fr)`,
              }}
            >
              {/* LEFT PREVIEW */}
              <div
                ref={studioLeftRef}
                className="
                  grid min-h-0
                  overflow-hidden
                  bg-slate-100
                  dark:bg-[#050a1e]
                "
                style={{
                  gridTemplateRows:
                    `minmax(220px, ${previewSplit}fr) 8px minmax(190px, ${100 - previewSplit}fr)`,
                }}
              >
                <div
                  className="
                    min-h-0 overflow-hidden
                    px-4 pb-3 pt-3
                    pointer-events-none
                    flex flex-col
                  "
                >
                  <div className="mb-4">
                    <p
                      className="
                        text-xs uppercase tracking-widest
                        text-gray-400 dark:text-slate-400
                      "
                    >
                      Live Preview
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <h3
                        className="
                          text-sm font-semibold
                          dark:text-white
                          capitalize
                        "
                      >
                        {newLabel.trim() ||
                          getDefaultWidgetLabel(
                            newType
                          )}
                      </h3>

                      {isMultiDataWidget &&
                      newDataKeys.length > 0 ? (
                        <span
                          className="
                            text-xs
                            text-emerald-500
                            bg-emerald-50 dark:bg-emerald-900/30
                            px-2 py-1
                            rounded-lg
                          "
                        >
                          {newDataKeys.length} selected
                        </span>
                      ) : (
                        newDataKey && (
                          <span
                            className="
                              text-xs
                              text-emerald-500
                              bg-emerald-50 dark:bg-emerald-900/30
                              px-2 py-1
                              rounded-lg
                            "
                          >
                            {newDataKey}
                          </span>
                        )
                      )}



                      {newType === "bar" && (
                        <span
                          className="
                            text-xs
                            text-purple-500
                            bg-purple-50 dark:bg-purple-900/30
                            px-2 py-1
                            rounded-lg
                          "
                        >
                          {newOrientation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="
                      min-h-0 flex-1
                      flex items-center justify-center
                      overflow-hidden
                    "
                  >
                    <div
                      className={
                        newType === "image"
                          ? "aspect-video h-full w-full max-w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-950"
                          : "h-full w-full"
                      }
                    >
                      {showEmptyLivePreview || showNoValuesLivePreview ? (
                        <button
                          type="button"
                          onClick={() => {}}
                          className="
                            group flex h-full w-full
                            flex-col items-center justify-center
                            overflow-hidden rounded-xl
                            bg-slate-50/70 dark:bg-slate-950
                            px-8 py-10
                            text-center
                            transition-colors duration-150
                            hover:border-emerald-400
                            hover:bg-emerald-50/60
                            dark:hover:border-emerald-500
                            dark:hover:bg-emerald-500/5
                          "
                        >
                          <div
                            className="
                              flex h-14 w-14
                              items-center justify-center
                              rounded-2xl
                              border border-emerald-200
                              bg-emerald-100
                              text-emerald-700
                              shadow-sm
                              transition-transform duration-200
                              group-hover:scale-105
                              dark:border-emerald-800
                              dark:bg-emerald-500/15
                              dark:text-emerald-300
                            "
                          >
                            <Database size={24} />
                          </div>

                          <p
                            className="
                              mt-4 text-base font-bold
                              text-gray-900 dark:text-white
                            "
                          >
                            {showNoValuesLivePreview
                              ? "No positive preview values"
                              : "Select a data source"}
                          </p>

                          <p
                            className="
                              mt-2 max-w-md
                              text-sm leading-6
                              text-gray-600 dark:text-slate-300
                            "
                          >
                            {showNoValuesLivePreview
                              ? "The selected pie-chart sources currently contain zero or invalid preview values. Choose another source or wait for positive live data."
                              : `Choose one or more data sources below to display the live ${
                                  newType === "pie"
                                    ? "pie chart"
                                    : newType === "line"
                                    ? "line chart"
                                    : newType === "bar"
                                    ? "bar chart"
                                    : "widget"
                                } preview.`}
                          </p>

                          <span
                            className="
                              mt-6 inline-flex items-center gap-2
                              rounded-2xl
                              bg-emerald-600
                              px-5 py-3
                              text-sm font-bold
                              text-white
                              shadow-lg shadow-emerald-600/20
                              transition
                              group-hover:bg-emerald-700
                              dark:bg-emerald-500
                              dark:text-slate-950
                              dark:shadow-emerald-500/20
                              dark:group-hover:bg-emerald-400
                            "
                          >
                            <Database size={16} />
                            {showNoValuesLivePreview
                              ? "Change Data Source"
                              : "Choose Data Source"}
                          </span>
                        </button>
                      ) : (
                        <WidgetRenderer
                          type={newType}
                          value={previewValues[newDataKey]}
                          data={{
                            ...previewValues,
                            logs:
                              newType === "logs"
                                ? Array.isArray(
                                    selectedItem?.logs
                                  ) &&
                                  selectedItem.logs.length > 0
                                  ? selectedItem.logs
                                  : previewLogs
                                : undefined,
                          }}
                          history={previewHistory}
                          dataKey={
                            isMultiDataWidget
                              ? newDataKeys[0] ||
                                newDataKey
                              : newDataKey
                          }
                          item={{
                            previewMode: newType === "sankey",
                            id: selectedItem?.id || 999,

                            type: newType,

                            label:
                              newLabel.trim() ||
                              getDefaultWidgetLabel(
                                newType
                              ),

                            dataKey: isMultiDataWidget
                              ? newDataKeys[0] ||
                                newDataKey
                              : newDataKey,

                            dataKeys: isBigNumberCombined
                              ? [
                                  newDataKeys[0] || newDataKey,
                                  getPreparedBigNumberDisplay()?.statusDataKey,
                                ].filter(Boolean)
                              : isMultiDataWidget
                              ? newDataKeys
                              : undefined,

                            orientation:
                              newType === "bar"
                                ? newOrientation
                                : undefined,

                            chartDisplay:
                              ["line", "bar", "composite"].includes(
                                newType
                              )
                                ? { ...newChartDisplay }
                                : undefined,

                            historyWindow:
                              ["line", "composite"].includes(
                                newType
                              )
                                ? newHistoryWindow
                                : undefined,

                            compositeConfig:
                              newType === "composite"
                                ? {
                                    ...newCompositeConfig,
                                  }
                                : undefined,

                            w: newW,
                            h: newH,

                            bigNumberDisplay:
                              newType === "bignumber"
                                ? getPreparedBigNumberDisplay()
                                : undefined,

                            logDisplay:
                              newType === "logs"
                                ? {
                                    ...newLogDisplay,
                                    levelFilter: [
                                      ...(newLogDisplay.levelFilter ||
                                        []),
                                    ],
                                  }
                                : undefined,

                            logs:
                              newType === "logs"
                                ? Array.isArray(
                                    selectedItem?.logs
                                  ) &&
                                  selectedItem.logs.length > 0
                                  ? selectedItem.logs
                                  : previewLogs
                                : undefined,

                            rangeConfig: supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    )
                              ? { ...newRangeConfig }
                              : undefined,

                            image:
                              newType === "image"
                                ? imageDraft
                                : selectedItem?.image ||
                                  base?.image,

                            pins:
                              newType === "image"
                                ? imageDraftPins
                                : selectedItem?.pins ||
                                  base?.pins ||
                                  [],

                            sankeyConfig:
                              newType === "sankey"
                                ? getPreparedSankeyConfig()
                                : undefined,
                          }}
                          updateItem={() => {}}
                          editMode={false}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Resize live preview and data source panels"
                  title="Drag to resize preview and data source"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setStudioResizeMode("rows");
                  }}
                  className="
                    group relative z-20
                    flex h-2 w-full
                    cursor-row-resize
                    items-center justify-center
                    border-y border-slate-200
                    bg-slate-100
                    transition-colors
                    hover:bg-emerald-50
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:hover:bg-emerald-500/10
                  "
                >
                  <span
                    className="
                      h-1 w-12 rounded-full
                      bg-slate-300
                      transition-colors
                      group-hover:bg-emerald-400
                      dark:bg-slate-600
                      dark:group-hover:bg-emerald-500
                    "
                  />
                </button>

                <div
                  className="
                    min-h-0 overflow-y-auto
                    bg-white p-4
                    dark:bg-slate-900
                  "
                >
                  <div
                    className="
                      mb-3 flex items-center
                      justify-between gap-3
                    "
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Data Source
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {useDedicatedWidgetSource
                          ? "This widget uses its own dedicated configuration."
                          : allDataOptions.length
                          ? "Choose the source this widget should read, or connect another source."
                          : "Connect the process data this widget should read."}
                      </p>
                    </div>

                    <span
                      className="
                        rounded-full
                        bg-emerald-50 px-2.5 py-1
                        text-[10px] font-bold
                        text-emerald-700
                        dark:bg-emerald-500/10
                        dark:text-emerald-300
                      "
                    >
                      {useDedicatedWidgetSource
                        ? "Dedicated"
                        : `${allDataOptions.length} Source${
                            allDataOptions.length === 1
                              ? ""
                              : "s"
                          }`}
                    </span>
                  </div>

                {/* STEP 1: DATA SOURCE */}
                {true && (
                  <>
                    <div className="space-y-3">
                      {useDedicatedWidgetSource ? (
                        <div
                          className="
                            rounded-2xl border
                            border-slate-200 bg-white
                            p-4
                            dark:border-slate-700
                            dark:bg-slate-900
                          "
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="
                                flex h-10 w-10 shrink-0
                                items-center justify-center
                                rounded-xl bg-emerald-50
                                text-emerald-600
                                dark:bg-emerald-500/10
                                dark:text-emerald-300
                              "
                            >
                              <CheckCircle2 size={18} />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                No process source required
                              </h4>

                              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {newType === "logs"
                                  ? "Logs reads event and activity data through its own log configuration."
                                  : newType === "status"
                                  ? "Data Status derives connection health and data freshness through its dedicated status configuration."
                                  : newType === "image"
                                  ? "Image widgets configure live sensor pins inside the image editor."
                                  : newType === "sankey"
                                  ? "Sankey widgets configure their input and output flows inside the Sankey editor."
                                  : "This widget manages its data through a dedicated configuration."}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : allDataOptions.length === 0 &&
                        !showCustomDataModal ? (
                        <div
                          className="
                            rounded-2xl border
                            border-slate-200 bg-white
                            p-5
                            shadow-[0_4px_18px_rgba(15,23,42,0.04)]
                            dark:border-slate-700
                            dark:bg-slate-900
                            dark:shadow-none
                          "
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div
                                  className="
                                    flex h-11 w-11 shrink-0
                                    items-center justify-center
                                    rounded-2xl bg-emerald-50
                                    text-emerald-600
                                    dark:bg-emerald-500/10
                                    dark:text-emerald-300
                                  "
                                >
                                  <Database size={20} />
                                </div>

                                <div>
                                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                    Connect your first data source
                                  </h4>

                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Nothing is preconfigured. Choose the exact Influx data this widget should use.
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                                {[
                                  "Bucket",
                                  "Measurement",
                                  "Device Type",
                                  "Device ID",
                                  "Channel",
                                ].map((step, index, steps) => (
                                  <div
                                    key={step}
                                    className="flex items-center gap-1.5"
                                  >
                                    <span
                                      className="
                                        rounded-lg bg-slate-100
                                        px-2 py-1
                                        text-[10px] font-semibold
                                        text-slate-600
                                        dark:bg-slate-800
                                        dark:text-slate-300
                                      "
                                    >
                                      {step}
                                    </span>

                                    {index <
                                      steps.length - 1 && (
                                      <ChevronRight
                                        size={12}
                                        className="text-slate-300 dark:text-slate-600"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={openAddDataSourceModal}
                              className="
                                inline-flex shrink-0
                                items-center justify-center
                                gap-2 rounded-xl
                                bg-emerald-600
                                px-5 py-3
                                text-sm font-semibold
                                text-white
                                shadow-sm
                                transition-colors
                                hover:bg-emerald-700
                              "
                            >
                              <Plus size={16} />
                              Connect Data Source
                            </button>
                          </div>
                        </div>
                      ) : allDataOptions.length > 0 ? (
                        <div
                          className="
                            rounded-2xl border
                            border-slate-200 bg-white
                            p-4
                            dark:border-slate-700
                            dark:bg-slate-900
                          "
                        >
                          <div
                            className="
                              mb-3 flex flex-col gap-3
                              sm:flex-row sm:items-center
                              sm:justify-between
                            "
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                  Connected Sources
                                </h4>

                                <span
                                  className="
                                    rounded-full bg-slate-100
                                    px-2 py-0.5
                                    text-[10px] font-bold
                                    text-slate-500
                                    dark:bg-slate-800
                                    dark:text-slate-300
                                  "
                                >
                                  {allDataOptions.length}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {isMultiDataWidget
                                  ? "Select one or more sources for this widget."
                                  : "Select the source this widget should display."}
                              </p>
                            </div>

                            {!showCustomDataModal && (
                              <button
                                type="button"
                                onClick={openAddDataSourceModal}
                                className="
                                  inline-flex shrink-0
                                  items-center justify-center
                                  gap-2 rounded-xl
                                  border border-emerald-200
                                  bg-emerald-50
                                  px-3 py-2
                                  text-xs font-semibold
                                  text-emerald-700
                                  transition-colors
                                  hover:bg-emerald-100
                                  dark:border-emerald-500/20
                                  dark:bg-emerald-500/10
                                  dark:text-emerald-300
                                  dark:hover:bg-emerald-500/15
                                "
                              >
                                <Plus size={14} />
                                Add Source
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                            {allDataOptions.map((dataOption) => {
                              const selected =
                                newDataKeys.includes(
                                  dataOption.key
                                ) ||
                                (!newDataKeys.length &&
                                  newDataKey ===
                                    dataOption.key);

                              return (
                                <button
                                  key={dataOption.key}
                                  type="button"
                                  onClick={() =>
                                    toggleWizardDataSource(
                                      dataOption.key
                                    )
                                  }
                                  className={`
                                    group/source relative
                                    flex min-w-0 w-full
                                    items-start gap-3
                                    rounded-xl border
                                    p-3 text-left
                                    transition-colors
                                    ${
                                      selected
                                        ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                                        : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-emerald-500/40"
                                    }
                                  `}
                                >
                                  <span
                                    className={`
                                      mt-0.5 flex h-5 w-5
                                      shrink-0 items-center
                                      justify-center rounded-full
                                      border
                                      ${
                                        selected
                                          ? "border-emerald-500 bg-emerald-600 text-white"
                                          : "border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900"
                                      }
                                    `}
                                  >
                                    <Check size={11} />
                                  </span>

                                  <span className="min-w-0 flex-1 pr-6">
                                    <span className="block truncate text-sm font-bold text-slate-800 dark:text-white">
                                      {dataOption.label}
                                    </span>

                                    {dataOption.source ? (
                                      <span className="mt-1 grid grid-cols-1 gap-0.5">
                                        <span className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                          {getMeasurementGroup(
                                            dataOption.source
                                              .measurement
                                          ).label}
                                          {" · "}
                                          {dataOption.source
                                            .tagValue ||
                                            dataOption.source.id ||
                                            "No ID"}
                                        </span>

                                        <span className="truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                          {
                                            dataOption.source
                                              .measurement
                                          }
                                          {" · "}
                                          {dataOption.source
                                            .field ||
                                            dataOption.source
                                              .channel}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="mt-1 block text-[10px] text-slate-400">
                                        Legacy source
                                      </span>
                                    )}
                                  </span>

                                  {dataOption.isCustom && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        deleteCustomDataSource(
                                          dataOption.key
                                        );
                                      }}
                                      onKeyDown={(event) => {
                                        if (
                                          event.key ===
                                          "Enter"
                                        ) {
                                          event.stopPropagation();
                                          deleteCustomDataSource(
                                            dataOption.key
                                          );
                                        }
                                      }}
                                      className="
                                        absolute right-2 top-2
                                        rounded-lg p-1
                                        text-slate-400
                                        transition-colors
                                        hover:bg-red-50
                                        hover:text-red-500
                                        dark:hover:bg-red-950/40
                                      "
                                      title="Delete data source"
                                    >
                                      <X size={13} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {(newDataKeys.length > 0 ||
                            newDataKey) && (
                            <div
                              className="
                                mt-3 flex items-center
                                gap-2 rounded-xl
                                bg-emerald-50
                                px-3 py-2
                                text-[11px]
                                text-emerald-700
                                dark:bg-emerald-500/10
                                dark:text-emerald-300
                              "
                            >
                              <CheckCircle2
                                size={14}
                                className="shrink-0"
                              />

                              <span className="min-w-0 truncate font-semibold">
                                Selected:{" "}
                                {(newDataKeys.length
                                  ? newDataKeys
                                  : [newDataKey]
                                )
                                  .filter(Boolean)
                                  .map(
                                    getDataSourceLabel
                                  )
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}

      {showCustomDataModal &&
        !useDedicatedWidgetSource && (
        <div
          className="
            mt-4
            rounded-2xl
            bg-slate-50/80
            p-2
            dark:bg-slate-950/80
          "
        >
          <div
            className="
              w-full overflow-hidden
              rounded-2xl border
              border-slate-200 bg-white
              shadow-[0_4px_16px_rgba(15,23,42,0.05)]
              dark:border-slate-700
              dark:bg-slate-900
              dark:shadow-none
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}
            <div
              className="
                flex shrink-0
                items-center justify-between
                border-b border-slate-200
                px-3 py-2.5
                dark:border-slate-700
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex h-9 w-9
                    shrink-0 items-center
                    justify-center rounded-2xl
                    bg-emerald-100 text-emerald-600
                    dark:bg-emerald-500/15
                    dark:text-emerald-300
                  "
                >
                  <Database size={17} />
                </div>

                <div>
                  <h3
                    className="
                      text-base font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Add Data Source
                  </h3>

                  <p
                    className="
                      mt-1 text-sm
                      text-slate-500
                      dark:text-slate-300
                    "
                  >
                    Configure the Influx source directly for this widget, then give it a dashboard name.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCustomDataModal(false)
                }
                className="
                  rounded-xl p-2
                  text-slate-400 transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  dark:hover:bg-slate-800
                  dark:hover:text-white
                "
                aria-label="Close custom data source form"
              >
                <X size={20} />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="p-4">
              <div className="space-y-4">
                {/* SOURCE FORM */}
                <div
                  className="
                    p-4
                  "
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4
                        className="
                          text-sm font-black
                          text-slate-900
                          dark:text-white
                        "
                      >
                        Source Path
                      </h4>

                      <p
                        className="
                          mt-1 text-xs
                          text-slate-500
                          dark:text-slate-400
                        "
                      >
                        Follow the source path from InfluxDB to the exact field this widget should read.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={refreshInfluxMetadata}
                      disabled={influxLoading}
                      className="
                        inline-flex items-center
                        justify-center gap-2
                        rounded-xl bg-slate-800
                        px-4 py-2.5
                        text-xs font-black
                        text-white transition
                        hover:bg-slate-700
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        dark:bg-slate-700
                        dark:hover:bg-slate-600
                      "
                    >
                      <RefreshCw
                        size={14}
                        className={
                          influxLoading
                            ? "animate-spin"
                            : ""
                        }
                      />
                      Refresh
                    </button>
                  </div>

                  {isOrganizationAdmin ? (
                    <div className="space-y-3">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            Organization Source Path
                          </p>

                          <p className="text-[10px] text-slate-400">
                            Only assigned measurement permissions are available
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          {/* DEVICE TYPE */}
                          <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                1
                              </span>

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Device Type
                              </span>
                            </div>

                            <select
                              value={selectedMeasurementGroup}
                              onChange={(event) =>
                                handleMeasurementGroupChange(
                                  event.target.value
                                )
                              }
                              disabled={
                                influxLoading ||
                                assignedDeviceTypeOptions.length ===
                                  0
                              }
                              className="
                                w-full rounded-lg
                                border border-slate-300
                                bg-white px-2.5 py-2
                                text-xs text-slate-900
                                outline-none
                                focus:ring-2
                                focus:ring-emerald-500/20
                                disabled:opacity-60
                                dark:border-slate-600
                                dark:bg-slate-950
                                dark:text-white
                              "
                            >
                              <option value="">
                                Select device type
                              </option>

                              {assignedDeviceTypeOptions.map(
                                (option) => (
                                  <option
                                    key={option.key}
                                    value={option.key}
                                  >
                                    {option.label}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          {/* ASSIGNED LOGICAL DEVICE */}
                          <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                2
                              </span>

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Assigned Device
                              </span>
                            </div>

                            <select
                              value={selectedDeviceId}
                              onChange={(event) =>
                                applySelectedDevice(
                                  event.target.value
                                )
                              }
                              disabled={
                                influxLoading ||
                                !selectedMeasurementGroup
                              }
                              className="
                                w-full rounded-lg
                                border border-slate-300
                                bg-white px-2.5 py-2
                                text-xs text-slate-900
                                outline-none
                                focus:ring-2
                                focus:ring-emerald-500/20
                                disabled:opacity-60
                                dark:border-slate-600
                                dark:bg-slate-950
                                dark:text-white
                              "
                            >
                              <option value="">
                                Select assigned device
                              </option>

                              {filteredAssignedDevices.map(
                                (device) => (
                                  <option
                                    key={device.id}
                                    value={device.id}
                                  >
                                    {device.device_name ||
                                      device.tag_value}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          {/* ASSIGNED MEASUREMENT */}
                          <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                3
                              </span>

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Measurement
                              </span>
                            </div>

                            <select
                              value={influxConfig.measurement}
                              onChange={(event) => {
                                const measurement =
                                  event.target.value;

                                setInfluxConfig(
                                  (current) => ({
                                    ...current,
                                    measurement,
                                  })
                                );

                                setInfluxChannels(
                                  []
                                );

                                setCustomDataDraft(
                                  (current) => ({
                                    ...current,
                                    channel: "",
                                  })
                                );
                              }}
                              disabled={
                                influxLoading ||
                                !selectedDeviceId
                              }
                              className="
                                w-full rounded-lg
                                border border-slate-300
                                bg-white px-2.5 py-2
                                font-mono text-xs
                                text-slate-900
                                outline-none
                                focus:ring-2
                                focus:ring-emerald-500/20
                                disabled:opacity-60
                                dark:border-slate-600
                                dark:bg-slate-950
                                dark:text-white
                              "
                            >
                              <option value="">
                                Select measurement
                              </option>

                              {influxMeasurements.map(
                                (measurement) => (
                                  <option
                                    key={measurement}
                                    value={measurement}
                                  >
                                    {measurement}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          {/* CHANNEL */}
                          <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                4
                              </span>

                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Channel
                              </span>
                            </div>

                            <select
                              value={customDataDraft.channel}
                              onChange={(event) =>
                                setCustomDataDraft(
                                  (current) => ({
                                    ...current,
                                    channel:
                                      event.target.value,
                                  })
                                )
                              }
                              disabled={
                                influxLoading ||
                                !influxConfig.measurement
                              }
                              className="
                                w-full rounded-lg
                                border border-slate-300
                                bg-white px-2.5 py-2
                                font-mono text-xs
                                text-slate-900
                                outline-none
                                focus:ring-2
                                focus:ring-emerald-500/20
                                disabled:opacity-60
                                dark:border-slate-600
                                dark:bg-slate-950
                                dark:text-white
                              "
                            >
                              <option value="">
                                Select channel
                              </option>

                              {influxChannels.map(
                                (channel) => (
                                  <option
                                    key={channel}
                                    value={channel}
                                  >
                                    {channel}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        </div>
                      </div>

                      {selectedDeviceId && (
                        <div
                          className="
                            flex flex-wrap
                            items-center
                            gap-x-4 gap-y-1
                            rounded-xl
                            bg-slate-50
                            px-3 py-2
                            text-[10px]
                            text-slate-500
                            dark:bg-slate-950
                            dark:text-slate-400
                          "
                        >
                          <span>
                            Bucket:{" "}
                            <strong className="font-mono text-slate-700 dark:text-slate-200">
                              {influxConfig.bucket}
                            </strong>
                          </span>

                          <span>
                            Device ID:{" "}
                            <strong className="font-mono text-slate-700 dark:text-slate-200">
                              {influxConfig.tagValue ||
                                influxConfig.id}
                            </strong>
                          </span>

                          <span>
                            {influxMeasurements.length} assigned measurement(s)
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          Source Path
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Follow the source from database to field
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                        <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              1
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Bucket
                            </span>
                          </div>

                          <select
                            value={influxConfig.bucket}
                            disabled={influxLoading}
                            onChange={(event) => {
                              setSelectedMeasurementGroup("");

                              setInfluxConfig((current) => ({
                                ...current,
                                bucket: event.target.value,
                                measurement: "",
                                id: "",
                                tagValue: "",
                              }));

                              setInfluxIds([]);
                              setInfluxIdMeasurementMap({});
                              setInfluxChannels([]);
                              setCustomDataDraft(
                                (current) => ({
                                  ...current,
                                  channel: "",
                                })
                              );
                            }}
                            className="
                              w-full rounded-lg border
                              border-slate-300 bg-white
                              px-2.5 py-2
                              font-mono text-xs
                              text-slate-900 outline-none
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
                              Select bucket
                            </option>

                            {influxBuckets.map(
                              (bucketName) => (
                                <option
                                  key={bucketName}
                                  value={bucketName}
                                >
                                  {bucketName}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              2
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Measurement
                            </span>
                          </div>

                          <select
                            value={influxConfig.measurement}
                            disabled={
                              influxLoading ||
                              !influxConfig.bucket
                            }
                            onChange={(event) => {
                              const measurement =
                                event.target.value;

                              setSelectedMeasurementGroup(
                                measurement
                                  ? getMeasurementGroup(
                                      measurement
                                    ).key
                                  : ""
                              );

                              setInfluxConfig(
                                (current) => ({
                                  ...current,
                                  measurement,
                                  id: "",
                                  tagValue: "",
                                })
                              );

                              setInfluxIds([]);
                              setInfluxIdMeasurementMap({});
                              setInfluxChannels([]);
                              setCustomDataDraft(
                                (current) => ({
                                  ...current,
                                  channel: "",
                                })
                              );
                            }}
                            className="
                              w-full rounded-lg border
                              border-slate-300 bg-white
                              px-2.5 py-2
                              font-mono text-xs
                              text-slate-900 outline-none
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
                              {influxConfig.bucket
                                ? "Select measurement"
                                : "Select bucket first"}
                            </option>

                            {influxMeasurements.map(
                              (measurement) => (
                                <option
                                  key={measurement}
                                  value={measurement}
                                >
                                  {measurement}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              3
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Device Type
                            </span>
                          </div>

                          <div
                            className={`
                              flex min-h-[34px] items-center
                              rounded-lg px-2.5 py-2
                              text-xs font-semibold
                              ${
                                influxConfig.measurement
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                              }
                            `}
                          >
                            {influxConfig.measurement
                              ? getMeasurementGroup(
                                  influxConfig.measurement
                                ).label
                              : "Detected after measurement"}
                          </div>
                        </div>

                        <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              4
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Device ID
                            </span>
                          </div>

                          <select
                            value={
                              influxConfig.tagValue ||
                              influxConfig.id
                            }
                            disabled={
                              influxLoading ||
                              !influxConfig.measurement
                            }
                            onChange={(event) => {
                              const deviceId =
                                event.target.value;

                              setInfluxConfig(
                                (current) => ({
                                  ...current,
                                  id: deviceId,
                                  tagValue: deviceId,
                                })
                              );

                              setInfluxChannels([]);
                              setCustomDataDraft(
                                (current) => ({
                                  ...current,
                                  channel: "",
                                })
                              );
                            }}
                            className="
                              w-full rounded-lg border
                              border-slate-300 bg-white
                              px-2.5 py-2
                              font-mono text-xs
                              text-slate-900 outline-none
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
                              {influxConfig.measurement
                                ? "Select device ID"
                                : "Select measurement first"}
                            </option>

                            {influxIds.map((id) => (
                              <option
                                key={id}
                                value={id}
                              >
                                {id}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              5
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Channel
                            </span>
                          </div>

                          <select
                            value={customDataDraft.channel}
                            disabled={
                              influxLoading ||
                              !influxConfig.measurement ||
                              !(
                                influxConfig.tagValue ||
                                influxConfig.id
                              )
                            }
                            onChange={(event) =>
                              setCustomDataDraft(
                                (current) => ({
                                  ...current,
                                  channel:
                                    event.target.value,
                                })
                              )
                            }
                            className="
                              w-full rounded-lg border
                              border-slate-300 bg-white
                              px-2.5 py-2
                              font-mono text-xs
                              text-slate-900 outline-none
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
                              {influxConfig.tagValue ||
                              influxConfig.id
                                ? "Select channel"
                                : "Select device ID first"}
                            </option>

                            {influxChannels.map(
                              (channel) => (
                                <option
                                  key={channel}
                                  value={channel}
                                >
                                  {channel}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      </div>
                    </div>
                  )}

                  <div
                    className="
                      mt-3 rounded-xl
                      bg-slate-50 px-3 py-2
                      text-[10px] text-slate-500
                      dark:bg-slate-950
                      dark:text-slate-400
                    "
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {influxLoading
                          ? "Loading available Influx metadata..."
                          : `${influxBuckets.length} bucket(s) · ${influxMeasurements.length} measurement(s) · ${influxIds.length} device ID(s) · ${influxChannels.length} channel(s)`}
                      </span>

                      {influxError && (
                        <span className="font-semibold text-red-500 dark:text-red-300">
                          {influxError}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* DASHBOARD SETTINGS */}
                <div
                  className="
                    border-t border-slate-200
                    p-4
                    dark:border-slate-700
                  "
                >
                  <div className="mb-4">
                    <h4
                      className="
                        text-sm font-black
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Source Details
                    </h4>

                    <p
                      className="
                        mt-1 text-xs
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Give this source a readable name and optional unit.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          uppercase tracking-wider
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Dashboard display name
                      </span>

                      <input
                        type="text"
                        value={customDataDraft.label}
                        onChange={(event) =>
                          setCustomDataDraft(
                            (current) => ({
                              ...current,
                              label:
                                event.target.value,
                            })
                          )
                        }
                        placeholder="e.g. Sterilizer Door Pressure"
                        className="
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-3 py-2.5
                          text-sm text-slate-900
                          outline-none
                          focus:ring-2
                          focus:ring-emerald-500
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      />
                    </label>

                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          uppercase tracking-wider
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Dashboard key
                      </span>

                      <input
                        type="text"
                        value={customDataDraft.key}
                        list="dashboard-key-options"
                        onChange={(event) =>
                          setCustomDataDraft(
                            (current) => ({
                              ...current,
                              key: event.target.value,
                            })
                          )
                        }
                        placeholder="Auto generated if empty"
                        className="
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-3 py-2.5
                          text-sm text-slate-900
                          outline-none
                          focus:ring-2
                          focus:ring-emerald-500
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      />

                      <p className="mt-1 text-[11px] text-slate-400">
                        Example: doorPressure, sterilizerTemp, oilFlowrate.
                      </p>
                    </label>

                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          uppercase tracking-wider
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Unit
                      </span>

                      <input
                        type="text"
                        value={customDataDraft.unit}
                        list="unit-options"
                        onChange={(event) =>
                          setCustomDataDraft(
                            (current) => ({
                              ...current,
                              unit:
                                event.target.value,
                            })
                          )
                        }
                        placeholder="Optional, e.g. bar / °C / %"
                        className="
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-3 py-2.5
                          text-sm text-slate-900
                          outline-none
                          focus:ring-2
                          focus:ring-emerald-500
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      />
                    </label>

                    <div
                      className="
                        rounded-2xl border
                        border-emerald-100
                        bg-emerald-50 p-4
                        text-sm text-emerald-800
                        dark:border-emerald-900/60
                        dark:bg-emerald-950/30
                        dark:text-emerald-200
                      "
                    >
                      After adding, this source becomes available to the current widget.
                    </div>
                  </div>
                </div>

                <datalist id="dashboard-key-options">
                  {allDataOptions.map((option) => (
                    <option
                      key={option.key}
                      value={option.key}
                    >
                      {option.label}
                    </option>
                  ))}
                </datalist>

                <datalist id="unit-options">
                  {commonUnitOptions.map((unit) => (
                    <option
                      key={unit || "none"}
                      value={unit}
                    />
                  ))}
                </datalist>
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="
                flex shrink-0
                items-center justify-end gap-3
                border-t border-slate-200
                bg-slate-50/70 px-3 py-2.5
                dark:border-slate-700
                dark:bg-slate-950/40
              "
            >
              <button
                type="button"
                onClick={() =>
                  setShowCustomDataModal(false)
                }
                className="
                  rounded-2xl border
                  border-slate-300 bg-white
                  px-5 py-3 text-sm
                  font-semibold text-slate-700
                  transition hover:bg-slate-100
                  dark:border-slate-600
                  dark:bg-slate-800
                  dark:text-white
                  dark:hover:bg-slate-700
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addCustomDataSource}
                className="
                  inline-flex items-center gap-2
                  rounded-2xl bg-emerald-600
                  px-5 py-3 text-sm
                  font-semibold text-white
                  shadow-lg shadow-emerald-600/20
                  transition hover:bg-emerald-700
                "
              >
                <Plus size={17} />
                Connect & Select
              </button>
            </div>
          </div>
        </div>
      )}


                    </div>

                  </>
                )}


                </div>
              </div>

              <button
                type="button"
                aria-label="Resize workspace and widget settings panels"
                title="Drag to resize workspace and widget settings"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setStudioResizeMode("columns");
                }}
                className="
                  group relative z-30
                  flex h-full w-2
                  cursor-col-resize
                  items-center justify-center
                  border-x border-slate-200
                  bg-slate-100
                  transition-colors
                  hover:bg-emerald-50
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:hover:bg-emerald-500/10
                "
              >
                <span
                  className="
                    h-12 w-1 rounded-full
                    bg-slate-300
                    transition-colors
                    group-hover:bg-emerald-400
                    dark:bg-slate-600
                    dark:group-hover:bg-emerald-500
                  "
                />
              </button>

              {/* RIGHT SETTINGS / WIDGET CONFIGURATION */}
              <div
                className="
                  relative min-h-0
                  overflow-y-auto overflow-x-hidden
                  overscroll-contain
                  bg-slate-50/70
                  px-3.5 pt-3.5 pb-0
                  dark:bg-slate-950/60
                  flex flex-col
                "
              >
                <div className="mb-3 px-1">
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    Widget Settings
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Choose the visualization, configure its display, then review the size before saving.
                  </p>
                </div>

                {/* WIDGET TYPE */}
                {true && (
                  <>
                    <div
                      className="
                        bg-gray-50 dark:bg-slate-950
                        border border-gray-200 dark:border-slate-700
                        rounded-2xl
                        p-4
                      "
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold dark:text-white">
                            Widget Type
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-300">
                            Pick the visualization first. Only settings that apply to it will appear below.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCustomWidgetModal(true)}
                          className="
                            inline-flex shrink-0
                            items-center justify-center
                            gap-1.5 rounded-xl
                            border border-slate-200
                            bg-white px-2.5 py-2
                            text-[11px] font-semibold
                            text-slate-600 transition
                            hover:border-emerald-300
                            hover:text-emerald-700
                            dark:border-slate-700
                            dark:bg-slate-900
                            dark:text-slate-300
                          "
                          title="Add custom widget type"
                        >
                          <Plus size={14} />
                          <span className="hidden xl:inline">
                            Custom
                          </span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {allWidgetOptions.map((w) => {
                          const Icon = w.icon || LayoutGrid;
                          const selected = w.isCustomWidgetType
                            ? newWidgetTypeId === w.optionId
                            : !newWidgetTypeId && newType === w.type;

                          return (
                            <button
                              key={w.optionId}
                              type="button"
                              onClick={() =>
                                handleWidgetTypeChange(
                                  w.type,
                                  w.isCustomWidgetType ? w.optionId : ""
                                )
                              }
                              className={`
                                relative
                                min-h-[60px]
                                p-2.5 rounded-xl border transition-colors text-center

                                ${
                                  selected
                                    ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-500/20"
                                    : "bg-white dark:bg-slate-900 hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800 border-gray-200 dark:border-slate-700 dark:text-white"
                                }
                              `}
                            >
                              {w.isCustomWidgetType && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteCustomWidgetType(w.optionId);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.stopPropagation();
                                      deleteCustomWidgetType(w.optionId);
                                    }
                                  }}
                                  className={`absolute right-2 top-2 rounded-lg p-1 transition ${
                                    selected
                                      ? "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                                      : "text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                                  }`}
                                  title="Delete custom widget type"
                                >
                                  <X size={14} />
                                </span>
                              )}

                              <Icon className="mx-auto mb-1.5 w-5 h-5" />

                              <div className="text-xs font-semibold">
                                {w.label}
                              </div>

                              <div
                                className={`
                                  hidden
                                  ${
                                    selected
                                      ? "text-emerald-50"
                                      : "text-gray-400 dark:text-slate-400"
                                  }
                                `}
                              >
                                {w.isCustomWidgetType
                                  ? w.description || `Based on ${w.baseType}`
                                  : w.type === "gauge"
                                  ? "Semi-circle meter"
                                  : w.type === "linearGauge"
                                  ? "Progress meter"
                                  : w.type === "line"
                                  ? "Trend over time"
                                  : w.type === "image"
                                  ? "Mimic diagram"
                                  : w.type === "bar"
                                  ? "Bar comparison"
                                  : w.type === "bignumber"
                                  ? "KPI number"
                                  : w.type === "composite"
                                  ? "Two compatible views in one card"
                                  : w.type === "alarm"
                                  ? "Status warning"
                                  : w.type === "pie"
                                  ? "Ratio chart"
                                  : w.type === "sankey"
                                  ? "Flow split diagram"
                                  : "Widget"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {newType === "composite" && (
                      <div
                        className="
                          mt-4 rounded-2xl border
                          border-gray-200 bg-gray-50
                          p-4
                          dark:border-slate-700
                          dark:bg-slate-950
                        "
                      >
                        <div className="mb-4">
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            Composite Layout
                          </h3>

                          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                            Choose the two views to combine. The live preview updates immediately when you select a preset.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {getCompatibleCompositePresets(
                            Math.max(
                              1,
                              newDataKeys.length ||
                                (newDataKey ? 1 : 0)
                            )
                          ).map((preset) => {
                            const selected =
                              newCompositeConfig.preset ===
                              preset.id;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                  handleCompositePresetChange(
                                    preset
                                  )
                                }
                                className={`
                                  rounded-2xl border p-4
                                  text-left transition-all
                                  ${
                                    selected
                                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-500/10 dark:ring-emerald-500/30"
                                      : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                                  }
                                `}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {preset.label}
                                    </div>

                                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                                      {preset.description}
                                    </p>
                                  </div>

                                  {selected && (
                                    <CheckCircle2
                                      size={17}
                                      className="shrink-0 text-emerald-600 dark:text-emerald-300"
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                              Arrangement
                            </label>

                            <select
                              value={newCompositeConfig.layout}
                              onChange={(event) =>
                                setNewCompositeConfig(
                                  (previous) => ({
                                    ...previous,
                                    layout:
                                      event.target.value,
                                  })
                                )
                              }
                              className="
                                w-full rounded-2xl
                                border border-gray-300
                                bg-white px-4 py-2.5
                                text-gray-900 outline-none
                                focus:ring-2 focus:ring-emerald-500
                                dark:border-slate-600
                                dark:bg-slate-900
                                dark:text-white
                              "
                            >
                              <option value="horizontal">
                                Side by Side
                              </option>
                              <option value="vertical">
                                KPI / Chart Stacked
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-white">
                              <span>Primary Size</span>
                              <span className="text-xs text-gray-400">
                                {newCompositeConfig.ratio}%
                              </span>
                            </label>

                            <input
                              type="range"
                              min="25"
                              max="70"
                              step="1"
                              value={newCompositeConfig.ratio}
                              onChange={(event) =>
                                setNewCompositeConfig(
                                  (previous) => ({
                                    ...previous,
                                    ratio: Number(
                                      event.target.value
                                    ),
                                  })
                                )
                              }
                              className="w-full accent-emerald-600"
                            />
                          </div>
                        </div>

                        <div
                          className="
                            mt-4 overflow-hidden
                            rounded-2xl border
                            border-gray-200 bg-white
                            dark:border-slate-700
                            dark:bg-slate-900
                          "
                        >
                          <div
                            className={
                              newCompositeConfig.layout ===
                              "horizontal"
                                ? "flex h-28"
                                : "flex h-36 flex-col"
                            }
                          >
                            <div
                              className="
                                flex items-center justify-center
                                border-gray-200
                                bg-blue-50 text-xs
                                font-bold text-blue-700
                                dark:bg-blue-500/10
                                dark:text-blue-300
                              "
                              style={{
                                ...(newCompositeConfig.layout ===
                                "horizontal"
                                  ? {
                                      width: `${newCompositeConfig.ratio}%`,
                                      borderRightWidth: 1,
                                    }
                                  : {
                                      height: `${newCompositeConfig.ratio}%`,
                                      borderBottomWidth: 1,
                                    }),
                              }}
                            >
                              {
                                getCompositePreset(
                                  newCompositeConfig.preset
                                ).label.split(" + ")[0]
                              }
                            </div>

                            <div
                              className="
                                flex flex-1 items-center
                                justify-center text-xs
                                font-bold text-slate-500
                                dark:text-slate-300
                              "
                            >
                              {
                                getCompositePreset(
                                  newCompositeConfig.preset
                                ).label.split(" + ")[1]
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="hidden">
                      <button
                        type="button"
                        onClick={() => setWidgetStep(1)}
                        className="
                          rounded-2xl border
                          border-gray-300 bg-white
                          px-5 py-3 font-semibold
                          text-gray-700 transition
                          hover:bg-gray-100
                          dark:border-slate-600
                          dark:bg-slate-900
                          dark:text-white
                          dark:hover:bg-slate-800
                        "
                      >
                        Back
                      </button>

                      <button
                        type="button"
                        onClick={goToNextWidgetStep}
                        className="
                          rounded-2xl
                          bg-emerald-600 hover:bg-emerald-700
                          text-white
                          px-6 py-3
                          font-semibold
                          transition
                        "
                      >
                        Next: Appearance
                      </button>
                    </div>
                  </>
                )}


                {/* WIDGET DETAILS / SIZE */}
                {true && (
                  <>
                    <div className="space-y-4">
                      <div
                        className="
                          bg-gray-50 dark:bg-slate-950
                          border border-gray-200 dark:border-slate-700
                          rounded-2xl
                          p-4
                        "
                      >
                        <div className="mb-4">
                          <h3 className="font-bold dark:text-white">
                            Widget Details
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            Give the widget a clear label for the dashboard.
                          </p>
                        </div>

                        <label className="block text-sm font-semibold dark:text-white mb-2">
                          Widget Label
                        </label>

                        <input
                          type="text"
                          placeholder="Example: Main Steam Pressure"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          className="
                            w-full
                            rounded-2xl
                            border border-gray-300 dark:border-slate-600
                            bg-white dark:bg-slate-900
                            dark:text-white
                            px-4 py-3
                            outline-none
                            focus:ring-2 focus:ring-emerald-500
                          "
                        />

                        <p className="text-xs text-gray-400 dark:text-slate-400 mt-3">
                          Leave empty to use the default widget label.
                        </p>
                      </div>

                      {newType === "logs" && (
                        <div
                          className="
                            rounded-2xl border
                            border-gray-200 bg-gray-50
                            p-4
                            dark:border-slate-700
                            dark:bg-slate-950
                          "
                        >
                          <div className="mb-4 flex items-start gap-3">
                            <div
                              className="
                                flex h-10 w-10
                                shrink-0 items-center
                                justify-center rounded-2xl
                                bg-blue-100 text-blue-600
                                dark:bg-blue-500/15
                                dark:text-blue-300
                              "
                            >
                              <ScrollText size={19} />
                            </div>

                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                Logs Display
                              </h3>

                              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Configure how alarms, device events, and system activity are displayed.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                Sort Order
                              </label>

                              <select
                                value={
                                  newLogDisplay.sortOrder
                                }
                                onChange={(event) =>
                                  setNewLogDisplay(
                                    (previous) => ({
                                      ...previous,
                                      sortOrder:
                                        event.target.value,
                                    })
                                  )
                                }
                                className="
                                  w-full rounded-2xl
                                  border border-gray-300
                                  bg-white px-4 py-3
                                  text-gray-900 outline-none
                                  focus:ring-2
                                  focus:ring-blue-500
                                  dark:border-slate-600
                                  dark:bg-slate-900
                                  dark:text-white
                                "
                              >
                                <option value="newest">
                                  Newest First
                                </option>

                                <option value="oldest">
                                  Oldest First
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                Maximum Entries
                              </label>

                              <input
                                type="number"
                                min="1"
                                max="500"
                                value={
                                  newLogDisplay.maxEntries
                                }
                                onChange={(event) =>
                                  setNewLogDisplay(
                                    (previous) => ({
                                      ...previous,
                                      maxEntries:
                                        Math.min(
                                          500,
                                          Math.max(
                                            1,
                                            Number(
                                              event.target
                                                .value
                                            ) || 1
                                          )
                                        ),
                                    })
                                  )
                                }
                                className="
                                  w-full rounded-2xl
                                  border border-gray-300
                                  bg-white px-4 py-3
                                  text-gray-900 outline-none
                                  focus:ring-2
                                  focus:ring-blue-500
                                  dark:border-slate-600
                                  dark:bg-slate-900
                                  dark:text-white
                                "
                              />
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                              {
                                key: "showTimestamp",
                                label: "Show Timestamp",
                              },
                              {
                                key: "showSource",
                                label: "Show Source",
                              },
                              {
                                key: "showLevel",
                                label: "Show Level",
                              },
                              {
                                key: "showSearch",
                                label: "Show Search",
                              },
                              {
                                key: "compact",
                                label: "Compact Rows",
                              },
                            ].map((option) => (
                              <label
                                key={option.key}
                                className="
                                  flex items-center
                                  justify-between gap-3
                                  rounded-2xl border
                                  border-gray-200 bg-white
                                  p-4
                                  dark:border-slate-700
                                  dark:bg-slate-900
                                "
                              >
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                  {option.label}
                                </span>

                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    newLogDisplay[
                                      option.key
                                    ]
                                  )}
                                  onChange={(event) =>
                                    setNewLogDisplay(
                                      (previous) => ({
                                        ...previous,
                                        [option.key]:
                                          event.target
                                            .checked,
                                      })
                                    )
                                  }
                                  className="h-5 w-5 accent-blue-600"
                                />
                              </label>
                            ))}
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                              Visible Log Levels
                            </label>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {[
                                "info",
                                "success",
                                "warning",
                                "error",
                              ].map((level) => {
                                const selected =
                                  (
                                    newLogDisplay.levelFilter ||
                                    []
                                  ).includes(level);

                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() =>
                                      setNewLogDisplay(
                                        (previous) => {
                                          const levels =
                                            previous.levelFilter ||
                                            [];

                                          return {
                                            ...previous,
                                            levelFilter:
                                              levels.includes(
                                                level
                                              )
                                                ? levels.filter(
                                                    (
                                                      item
                                                    ) =>
                                                      item !==
                                                      level
                                                  )
                                                : [
                                                    ...levels,
                                                    level,
                                                  ],
                                          };
                                        }
                                      )
                                    }
                                    className={`
                                      rounded-2xl border
                                      px-3 py-3
                                      text-sm font-bold
                                      capitalize transition

                                      ${
                                        selected
                                          ? "border-blue-600 bg-blue-600 text-white"
                                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                      }
                                    `}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div
                            className="
                              mt-4 rounded-2xl
                              border border-blue-100
                              bg-blue-50 p-4
                              text-xs leading-relaxed
                              text-blue-700
                              dark:border-blue-900/60
                              dark:bg-blue-950/30
                              dark:text-blue-200
                            "
                          >
                            Sample events are shown in the preview so you can test the layout and filters. On the dashboard, these entries are replaced by logs returned from your backend or live data feed.
                          </div>
                        </div>
                      )}


                      {newType === "bignumber" && (
                        <div
                          className="
                            rounded-2xl border
                            border-gray-200 bg-gray-50
                            p-4
                            dark:border-slate-700
                            dark:bg-slate-950
                          "
                        >
                          <div className="mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              Stat Display
                            </h3>

                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              Display a numeric KPI or convert incoming values into readable status text.
                            </p>
                          </div>

                          {/* DISPLAY MODE */}
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                              Display Mode
                            </label>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {[
                                {
                                  value: "number",
                                  label: "Number",
                                  description:
                                    "Show a numeric value, unit, and optional trend.",
                                },
                                {
                                  value: "valueMapping",
                                  label: "Value Mapping",
                                  description:
                                    "Convert raw values such as 0, 1, and 2 into status text.",
                                },
                                {
                                  value: "combined",
                                  label: "Stat + Status",
                                  description:
                                    "Show a live numeric KPI together with machine operating status.",
                                },
                              ].map((option) => {
                                const selected =
                                  newBigNumberDisplay.mode ===
                                  option.value;

                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          mode: option.value,

                                          ...(option.value ===
                                          "valueMapping"
                                            ? {
                                                showTrend: false,
                                                showUnit: false,
                                                statusDataKey: "",
                                              }
                                            : {}),

                                          ...(option.value ===
                                          "combined"
                                            ? {
                                                statusSource: "mapping",
                                                statusDataKey:
                                                  previous.statusDataKey ||
                                                  newDataKeys.find(
                                                    (key) =>
                                                      key &&
                                                      key !==
                                                        (newDataKeys[0] ||
                                                          newDataKey)
                                                  ) ||
                                                  "",
                                              }
                                            : {}),
                                        })
                                      )
                                    }
                                    className={`
                                      rounded-2xl border
                                      p-4 text-left
                                      transition-all
                                      ${
                                        selected
                                          ? "border-emerald-600 bg-emerald-600 text-white shadow"
                                          : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                      }
                                    `}
                                  >
                                    <div className="text-sm font-bold">
                                      {option.label}
                                    </div>

                                    <div
                                      className={`
                                        mt-1 text-[11px]
                                        ${
                                          selected
                                            ? "text-emerald-50"
                                            : "text-gray-400 dark:text-slate-400"
                                        }
                                      `}
                                    >
                                      {option.description}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* COMMON STAT SETTINGS */}
                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                Alignment
                              </label>

                              <select
                                value={
                                  newBigNumberDisplay.alignment
                                }
                                onChange={(event) =>
                                  setNewBigNumberDisplay(
                                    (previous) => ({
                                      ...previous,
                                      alignment:
                                        event.target.value,
                                    })
                                  )
                                }
                                className="
                                  w-full rounded-2xl
                                  border border-gray-300
                                  bg-white px-4 py-3
                                  text-gray-900 outline-none
                                  focus:ring-2
                                  focus:ring-emerald-500
                                  dark:border-slate-600
                                  dark:bg-slate-900
                                  dark:text-white
                                "
                              >
                                <option value="left">
                                  Left
                                </option>
                                <option value="center">
                                  Center
                                </option>
                                <option value="right">
                                  Right
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                Value Size
                              </label>

                              <select
                                value={
                                  newBigNumberDisplay.valueSize
                                }
                                onChange={(event) =>
                                  setNewBigNumberDisplay(
                                    (previous) => ({
                                      ...previous,
                                      valueSize:
                                        event.target.value,
                                    })
                                  )
                                }
                                className="
                                  w-full rounded-2xl
                                  border border-gray-300
                                  bg-white px-4 py-3
                                  text-gray-900 outline-none
                                  focus:ring-2
                                  focus:ring-emerald-500
                                  dark:border-slate-600
                                  dark:bg-slate-900
                                  dark:text-white
                                "
                              >
                                <option value="small">
                                  Small
                                </option>
                                <option value="medium">
                                  Medium
                                </option>
                                <option value="large">
                                  Large
                                </option>
                                <option value="xlarge">
                                  Extra Large
                                </option>
                              </select>
                            </div>
                          </div>

                          <label
                            className="
                              mt-4 flex items-center
                              justify-between gap-3
                              rounded-2xl border
                              border-gray-200 bg-white
                              p-4
                              dark:border-slate-700
                              dark:bg-slate-900
                            "
                          >
                            <span className="text-sm font-medium text-gray-800 dark:text-white">
                              Show Label
                            </span>

                            <input
                              type="checkbox"
                              checked={Boolean(
                                newBigNumberDisplay.showLabel
                              )}
                              onChange={(event) =>
                                setNewBigNumberDisplay(
                                  (previous) => ({
                                    ...previous,
                                    showLabel:
                                      event.target.checked,
                                  })
                                )
                              }
                              className="h-5 w-5 accent-emerald-600"
                            />
                          </label>

                          {/* NUMBER MODE */}
                          {newBigNumberDisplay.mode ===
                            "number" && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                  Display Style
                                </label>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  {[
                                    {
                                      value: "modern",
                                      label: "Modern",
                                      description:
                                        "Large KPI with optional trend",
                                    },
                                    {
                                      value: "compact",
                                      label: "Compact",
                                      description:
                                        "Smaller layout for 1×1 cards",
                                    },
                                    {
                                      value: "company",
                                      label: "Simple",
                                      description:
                                        "Clean value and unit display",
                                    },
                                  ].map((option) => {
                                    const selected =
                                      newBigNumberDisplay.style ===
                                      option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,
                                              style:
                                                option.value,
                                            })
                                          )
                                        }
                                        className={`
                                          rounded-2xl border
                                          p-4 text-left
                                          transition-all
                                          ${
                                            selected
                                              ? "border-emerald-600 bg-emerald-600 text-white shadow"
                                              : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                          }
                                        `}
                                      >
                                        <div className="text-sm font-bold">
                                          {option.label}
                                        </div>

                                        <div
                                          className={`
                                            mt-1 text-[11px]
                                            ${
                                              selected
                                                ? "text-emerald-50"
                                                : "text-gray-400 dark:text-slate-400"
                                            }
                                          `}
                                        >
                                          {option.description}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {[
                                  {
                                    key: "showUnit",
                                    label: "Show Unit",
                                  },
                                  {
                                    key: "showTrend",
                                    label: "Show Trend",
                                  },
                                ].map((option) => (
                                  <label
                                    key={option.key}
                                    className="
                                      flex items-center
                                      justify-between gap-3
                                      rounded-2xl border
                                      border-gray-200 bg-white
                                      p-4
                                      dark:border-slate-700
                                      dark:bg-slate-900
                                    "
                                  >
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                                      {option.label}
                                    </span>

                                    <input
                                      type="checkbox"
                                      checked={Boolean(
                                        newBigNumberDisplay[
                                          option.key
                                        ]
                                      )}
                                      onChange={(event) =>
                                        setNewBigNumberDisplay(
                                          (previous) => ({
                                            ...previous,
                                            [option.key]:
                                              event.target
                                                .checked,
                                          })
                                        )
                                      }
                                      className="h-5 w-5 accent-emerald-600"
                                    />
                                  </label>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Decimal Places
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={
                                      newBigNumberDisplay.decimals
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          decimals: Math.min(
                                            6,
                                            Math.max(
                                              0,
                                              Number(
                                                event.target
                                                  .value
                                              ) || 0
                                            )
                                          ),
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Unit Override
                                  </label>

                                  <input
                                    type="text"
                                    placeholder="Example: psi"
                                    value={
                                      newBigNumberDisplay.unit
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          unit: event.target
                                            .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Number Color
                                  </label>

                                  <select
                                    value={
                                      newBigNumberDisplay.valueColor
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          valueColor:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="default">
                                      Default
                                    </option>
                                    <option value="green">
                                      Green
                                    </option>
                                    <option value="blue">
                                      Blue
                                    </option>
                                    <option value="amber">
                                      Amber
                                    </option>
                                    <option value="orange">
                                      Orange
                                    </option>
                                    <option value="red">
                                      Red
                                    </option>
                                    <option value="purple">
                                      Purple
                                    </option>
                                    <option value="gray">
                                      Gray
                                    </option>
                                  </select>
                                </div>

                                {newBigNumberDisplay.showTrend && (
                                  <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                      Stable Threshold
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={
                                        newBigNumberDisplay.trendThreshold
                                      }
                                      onChange={(event) =>
                                        setNewBigNumberDisplay(
                                          (previous) => ({
                                            ...previous,
                                            trendThreshold:
                                              Math.max(
                                                0,
                                                Number(
                                                  event.target
                                                    .value
                                                ) || 0
                                              ),
                                          })
                                        )
                                      }
                                      className="
                                        w-full rounded-2xl
                                        border border-gray-300
                                        bg-white px-4 py-3
                                        text-gray-900 outline-none
                                        focus:ring-2
                                        focus:ring-emerald-500
                                        dark:border-slate-600
                                        dark:bg-slate-900
                                        dark:text-white
                                      "
                                    />

                                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-400">
                                      Changes smaller than this value are considered stable.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {newBigNumberDisplay.mode ===
                            "combined" && (
                            <div
                              className="
                                mt-4 rounded-2xl border
                                border-emerald-200 bg-emerald-50/60
                                p-4
                                dark:border-emerald-500/25
                                dark:bg-emerald-500/[0.05]
                              "
                            >
                              <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Stat + Status Data
                                </h4>

                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                  This display uses two different data sources: one numeric field for the Stat value and one field for the machine status.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Numeric Stat Data
                                  </label>

                                  <div
                                    className="
                                      min-h-[48px] rounded-2xl border
                                      border-gray-200 bg-white
                                      px-4 py-3 text-sm font-semibold
                                      text-gray-800
                                      dark:border-slate-700
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    {newDataKeys[0] || newDataKey
                                      ? getDataSourceLabel(
                                          newDataKeys[0] ||
                                            newDataKey
                                        )
                                      : "No numeric source selected"}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Status Data
                                  </label>

                                  <select
                                    value={
                                      newBigNumberDisplay.statusDataKey ||
                                      ""
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          statusSource: "mapping",
                                          statusDataKey:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 text-gray-900
                                      outline-none focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="">
                                      Select second data source
                                    </option>

                                    {newDataKeys
                                      .filter(
                                        (key) =>
                                          key &&
                                          key !==
                                            (newDataKeys[0] ||
                                              newDataKey)
                                      )
                                      .map((key) => (
                                        <option
                                          key={key}
                                          value={key}
                                        >
                                          {getDataSourceLabel(
                                            key
                                          )}
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Status Label
                                  </label>

                                  <input
                                    type="text"
                                    value={
                                      newBigNumberDisplay.statusLabel ||
                                      ""
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          statusLabel:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    placeholder="Machine Status"
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 text-gray-900
                                      outline-none focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>
                              </div>

                              {newDataKeys.length < 2 && (
                                <div
                                  className="
                                    mt-4 rounded-xl border
                                    border-amber-200 bg-amber-50
                                    px-3 py-2 text-xs
                                    text-amber-700
                                    dark:border-amber-500/25
                                    dark:bg-amber-500/10
                                    dark:text-amber-300
                                  "
                                >
                                  Select two data sources in Step 1 to use Stat + Status.
                                </div>
                              )}
                            </div>
                          )}

                          {["valueMapping", "combined"].includes(
                            newBigNumberDisplay.mode
                          ) && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Value Mappings
                                </h4>

                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                  Convert incoming values into readable operating states.
                                </p>
                              </div>

                              <div className="space-y-3">
                                {(
                                  newBigNumberDisplay.mappings ||
                                  []
                                ).map(
                                  (mapping, index) => (
                                    <div
                                      key={`${index}-${mapping.value}`}
                                      className="
                                        grid min-w-0
                                        grid-cols-[minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(90px,1fr)_36px]
                                        gap-1.5 rounded-2xl
                                        border border-gray-200
                                        bg-white p-2.5
                                        dark:border-slate-700
                                        dark:bg-slate-900
                                      "
                                    >
                                      <input
                                        type="text"
                                        value={
                                          mapping.value ??
                                          ""
                                        }
                                        placeholder="Value"
                                        onChange={(
                                          event
                                        ) =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).map(
                                                (
                                                  item,
                                                  currentIndex
                                                ) =>
                                                  currentIndex ===
                                                  index
                                                    ? {
                                                        ...item,
                                                        value:
                                                          event
                                                            .target
                                                            .value,
                                                      }
                                                    : item
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          min-w-0 rounded-xl border
                                          border-gray-300
                                          bg-white px-3 py-2
                                          text-sm text-gray-900
                                          outline-none
                                          focus:ring-2
                                          focus:ring-emerald-500
                                          dark:border-slate-600
                                          dark:bg-slate-950
                                          dark:text-white
                                        "
                                      />

                                      <input
                                        type="text"
                                        value={
                                          mapping.text ||
                                          ""
                                        }
                                        placeholder="Display text"
                                        onChange={(
                                          event
                                        ) =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).map(
                                                (
                                                  item,
                                                  currentIndex
                                                ) =>
                                                  currentIndex ===
                                                  index
                                                    ? {
                                                        ...item,
                                                        text: event
                                                          .target
                                                          .value,
                                                      }
                                                    : item
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          min-w-0 rounded-xl border
                                          border-gray-300
                                          bg-white px-3 py-2
                                          text-sm text-gray-900
                                          outline-none
                                          focus:ring-2
                                          focus:ring-emerald-500
                                          dark:border-slate-600
                                          dark:bg-slate-950
                                          dark:text-white
                                        "
                                      />

                                      <select
                                        value={
                                          mapping.color ||
                                          "default"
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).map(
                                                (
                                                  item,
                                                  currentIndex
                                                ) =>
                                                  currentIndex ===
                                                  index
                                                    ? {
                                                        ...item,
                                                        color:
                                                          event
                                                            .target
                                                            .value,
                                                      }
                                                    : item
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          min-w-0 rounded-xl border
                                          border-gray-300
                                          bg-white px-3 py-2
                                          text-sm text-gray-900
                                          outline-none
                                          focus:ring-2
                                          focus:ring-emerald-500
                                          dark:border-slate-600
                                          dark:bg-slate-950
                                          dark:text-white
                                        "
                                      >
                                        <option value="default">
                                          Default
                                        </option>
                                        <option value="green">
                                          Green
                                        </option>
                                        <option value="blue">
                                          Blue
                                        </option>
                                        <option value="amber">
                                          Amber
                                        </option>
                                        <option value="orange">
                                          Orange
                                        </option>
                                        <option value="red">
                                          Red
                                        </option>
                                        <option value="purple">
                                          Purple
                                        </option>
                                        <option value="gray">
                                          Gray
                                        </option>
                                      </select>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).filter(
                                                (
                                                  _,
                                                  currentIndex
                                                ) =>
                                                  currentIndex !==
                                                  index
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          flex h-10 w-9 shrink-0
                                          items-center justify-center
                                          self-center justify-self-end
                                          rounded-xl text-red-500
                                          transition
                                          hover:bg-red-50
                                          dark:hover:bg-red-500/10
                                        "
                                        aria-label={`Remove mapping ${
                                          index + 1
                                        }`}
                                      >
                                        <Trash2
                                          size={16}
                                        />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setNewBigNumberDisplay(
                                    (previous) => ({
                                      ...previous,

                                      mappings: [
                                        ...(previous.mappings ||
                                          []),

                                        {
                                          value: "",
                                          text: "",
                                          color:
                                            "default",
                                        },
                                      ],
                                    })
                                  )
                                }
                                className="
                                  inline-flex items-center
                                  gap-2 rounded-xl
                                  border border-emerald-300
                                  px-4 py-2.5
                                  text-sm font-bold
                                  text-emerald-700
                                  transition
                                  hover:bg-emerald-50
                                  dark:border-emerald-800
                                  dark:text-emerald-300
                                  dark:hover:bg-emerald-500/10
                                "
                              >
                                <Plus size={15} />
                                Add Mapping
                              </button>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Fallback Text
                                  </label>

                                  <input
                                    type="text"
                                    value={
                                      newBigNumberDisplay.fallbackText ||
                                      ""
                                    }
                                    placeholder="Use raw value when empty"
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          fallbackText:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Fallback Color
                                  </label>

                                  <select
                                    value={
                                      newBigNumberDisplay.fallbackColor ||
                                      "default"
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          fallbackColor:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="default">
                                      Default
                                    </option>
                                    <option value="green">
                                      Green
                                    </option>
                                    <option value="blue">
                                      Blue
                                    </option>
                                    <option value="amber">
                                      Amber
                                    </option>
                                    <option value="orange">
                                      Orange
                                    </option>
                                    <option value="red">
                                      Red
                                    </option>
                                    <option value="purple">
                                      Purple
                                    </option>
                                    <option value="gray">
                                      Gray
                                    </option>
                                  </select>
                                </div>
                              </div>

                              <label
                                className="
                                  flex items-center
                                  justify-between gap-3
                                  rounded-2xl border
                                  border-gray-200 bg-white
                                  p-4
                                  dark:border-slate-700
                                  dark:bg-slate-900
                                "
                              >
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                  Show Raw Value
                                </span>

                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    newBigNumberDisplay.showRawValue
                                  )}
                                  onChange={(event) =>
                                    setNewBigNumberDisplay(
                                      (previous) => ({
                                        ...previous,
                                        showRawValue:
                                          event.target
                                            .checked,
                                      })
                                    )
                                  }
                                  className="h-5 w-5 accent-emerald-600"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}


                      {newType === "bar" && (
                        <div
                          className="
                            bg-gray-50 dark:bg-slate-950
                            border border-gray-200 dark:border-slate-700
                            rounded-2xl
                            p-4
                          "
                        >
                          <h3 className="font-bold mb-4 dark:text-white">
                            Bar Direction
                          </h3>

                          <div className="grid grid-cols-2 gap-3">
                            {["vertical", "horizontal"].map((direction) => (
                              <button
                                key={direction}
                                type="button"
                                onClick={() => setNewOrientation(direction)}
                                className={`
                                  py-4 rounded-2xl border transition-all font-medium capitalize
                                  ${
                                    newOrientation === direction
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                      : "bg-white dark:bg-slate-900 hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800 border-gray-200 dark:border-slate-700 dark:text-white"
                                  }
                                `}
                              >
                                {direction}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="
                          bg-gray-50 dark:bg-slate-950
                          border border-gray-200 dark:border-slate-700
                          rounded-2xl
                          p-4
                        "
                      >
                        <div className="mb-4 flex flex-col gap-1">
                          <h3 className="font-bold dark:text-white">
                            Size & Layout
                          </h3>

                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            Choose a dashboard grid size. You can still drag-resize the widget later on the canvas.
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {(newType === "image" ? imageSizeOptions : sizeOptions).map((s, i) => {
                            const bounds = getDraftSizeBounds();
                            const exceedsGrid = s.w > bounds.maxW || s.h > bounds.maxH;

                            return (
                              <button
                                key={i}
                                type="button"
                                disabled={exceedsGrid}
                                onClick={() => {
                                  if (exceedsGrid) return;

                                  applyDraftWidgetSize(s.w, s.h);
                                }}
                                className={`
                                  py-4 rounded-2xl border transition-all font-medium
                                  ${
                                    newW === s.w && newH === s.h
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                      : exceedsGrid
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-slate-950 dark:border-slate-700 dark:text-slate-600"
                                      : "bg-white dark:bg-slate-900 hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800 border-gray-200 dark:border-slate-700 dark:text-white"
                                  }
                                `}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>

                        <div
                          className="
                            mt-4
                            rounded-2xl
                            border border-gray-200 dark:border-slate-700
                            bg-white dark:bg-slate-900
                            p-4
                          "
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-white">
                                Manual Size
                              </p>

                              <p className="text-xs text-gray-400 dark:text-slate-400">
                                Grid units, not pixels.
                              </p>
                            </div>

                            <span
                              className="
                                rounded-full
                                bg-emerald-100 dark:bg-emerald-900/30
                                px-3 py-1
                                text-xs font-bold
                                text-emerald-700 dark:text-emerald-300
                              "
                            >
                              {newW} × {newH}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                                Width
                              </label>

                              <input
                                type="number"
                                min={getDraftSizeBounds().minW}
                                max={getDraftSizeBounds().maxW}
                                value={newW}
                                onChange={(event) =>
                                  applyDraftWidgetSize(event.target.value, newH)
                                }
                                className="
                                  mt-2 w-full
                                  rounded-2xl
                                  border border-gray-300 dark:border-slate-600
                                  bg-white dark:bg-slate-950
                                  px-4 py-3
                                  text-center
                                  font-bold
                                  outline-none
                                  focus:ring-2 focus:ring-emerald-500
                                  dark:text-white
                                "
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                                Height
                              </label>

                              <input
                                type="number"
                                min={getDraftSizeBounds().minH}
                                max={getDraftSizeBounds().maxH}
                                value={newH}
                                onChange={(event) =>
                                  applyDraftWidgetSize(newW, event.target.value)
                                }
                                className="
                                  mt-2 w-full
                                  rounded-2xl
                                  border border-gray-300 dark:border-slate-600
                                  bg-white dark:bg-slate-950
                                  px-4 py-3
                                  text-center
                                  font-bold
                                  outline-none
                                  focus:ring-2 focus:ring-emerald-500
                                  dark:text-white
                                "
                              />
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-gray-400 dark:text-slate-400">
                            Allowed range: width {getDraftSizeBounds().minW}–{getDraftSizeBounds().maxW}, height {getDraftSizeBounds().minH}–{getDraftSizeBounds().maxH}.
                          </p>
                        </div>
                      </div>

                    </div>

                    {skipsWidgetDataSourceStep && (
                    <div
                      className="
                        mt-3 rounded-xl border
                        border-slate-200 bg-white
                        px-3 py-3
                        dark:border-slate-700
                        dark:bg-slate-900
                      "
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="
                            mt-0.5 flex h-7 w-7
                            shrink-0 items-center
                            justify-center rounded-lg
                            bg-emerald-50
                            text-emerald-600
                            dark:bg-emerald-500/10
                            dark:text-emerald-300
                          "
                        >
                          <CheckCircle2 size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            Widget Summary
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="max-w-full truncate text-sm font-bold text-slate-800 dark:text-white">
                              {newLabel.trim() ||
                                getFallbackWidgetLabel(
                                  newType,
                                  isMultiDataWidget
                                    ? newDataKeys[0] ||
                                      newDataKey
                                    : newDataKey
                                )}
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {selectedWidgetTypeLabel}
                            </span>

                            <span className="text-[10px] text-slate-300 dark:text-slate-600">
                              •
                            </span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {newW} × {newH}
                            </span>

                            <span className="text-[10px] text-slate-300 dark:text-slate-600">
                              •
                            </span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {widgetSummarySourceText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    )}

                  </>
                )}
                {/* TYPE-SPECIFIC DISPLAY / DATA SETTINGS */}
                {!skipsWidgetDataSourceStep && (
                  <>
                    {newType === "image" ? (
                      <div
                        className="
                          rounded-2xl border p-4
                          border-purple-200 bg-purple-50
                          dark:border-purple-500/40
                          dark:bg-slate-900
                        "
                      >
                        <h3
                          className="
                            mb-2 font-bold
                            text-slate-900 dark:text-white
                          "
                        >
                          Image Configuration
                        </h3>

                        <p
                          className="mb-4 text-sm leading-5"
                          style={{
                            color: document.documentElement.classList.contains("dark")
                              ? "#334155"
                              : "#475569",
                          }}
                        >
                          Upload a process diagram first, then open the image editor to place pins and connect live data.
                        </p>

                        <div
                          className="
                            mb-4 rounded-2xl border
                            border-dashed border-purple-300
                            bg-white p-4
                            dark:border-purple-400/50
                            dark:bg-slate-950
                          "
                        >
                          <label
                            className="
                              block text-xs font-black
                              uppercase tracking-wider
                              text-purple-700
                              dark:text-purple-300
                            "
                          >
                            Upload Diagram Image
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="
                              mt-3
                              block w-full
                              rounded-xl
                              border border-gray-300
                              bg-white px-3 py-2
                              text-sm text-slate-900
                              dark:border-slate-600
                              dark:bg-slate-900
                              dark:text-slate-100
                              file:mr-4
                              file:rounded-lg
                              file:border-0
                              file:bg-purple-600
                              file:px-3
                              file:py-2
                              file:text-sm
                              file:font-semibold
                              file:text-white
                              hover:file:bg-purple-700
                              dark:file:bg-purple-500
                              dark:hover:file:bg-purple-400
                            "
                          />

                          {imageDraft.croppedSrc ? (
                            <div className="mt-4">
                              <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gray-100 dark:border-purple-800 dark:bg-slate-950">
                                <img
                                  src={imageDraft.croppedSrc}
                                  alt="Uploaded diagram preview"
                                  className="max-h-64 w-full object-contain"
                                />
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-gray-500 dark:text-slate-300">
                                  {imageDraft.fileName || "Uploaded image"}
                                </span>

                                <button
                                  type="button"
                                  onClick={removeUploadedImage}
                                  className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                                >
                                  Remove Image
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className="mt-3 text-xs"
                              style={{
                                color: document.documentElement.classList.contains("dark")
                                  ? "#94a3b8"
                                  : "#64748b",
                              }}
                            >
                              Supported: PNG, JPG, JPEG, GIF, WebP. Maximum 5MB.
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof setEditingImageWidget !== "function") {
                              showToast(
                                "error",
                                "Image editor is not connected in App.jsx."
                              );
                              return;
                            }

                            const target = isEdit
                              ? selectedItem
                              : {
                                  id: Date.now(),
                                  type: "image",
                                  label: newLabel.trim() || "System Diagram",
                                  dataKey: newDataKey,
                                  x: activeCell?.col || 0,
                                  y: activeCell?.row || 0,
                                  w: newW,
                                  h: newH,
                                  image: imageDraft,
                                  pins: [],
                                };

                            setEditingImageWidget({
                              ...target,
                              image: imageDraft,
                              pins: imageDraftPins,
                              returnPage: designerPage,
                              resumeWidgetSettings: true,
                              designerSnapshot: getDesignerSnapshot(),
                              label:
                                newLabel.trim() ||
                                target.label ||
                                "System Diagram",
                              dataKey: newDataKey,
                            });

                            setShowModal(false);
                            setPage("image-editor");
                          }}
                          className="
                            w-full
                            rounded-2xl
                            bg-purple-600 py-4
                            font-bold text-white
                            shadow-lg
                            shadow-purple-600/20
                            transition-all
                            hover:bg-purple-700
                            dark:bg-purple-500
                            dark:text-white
                            dark:hover:bg-purple-400
                          "
                        >
                          Open Image Editor
                        </button>
                      </div>
                    ) : (
                      <div
                        className="
                          bg-gray-50 dark:bg-slate-950
                          border border-gray-200 dark:border-slate-700
                          rounded-2xl
                          p-4
                        "
                      >
                        <div className="mb-4">
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            Display & Data Settings
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                            Fine-tune the options that apply to this widget type.
                          </p>

                        </div>

                        {["line", "bar"].includes(
                          newType
                        ) && (
                          <div
                            className="
                              mt-4 rounded-2xl border
                              border-cyan-200/80
                              bg-gradient-to-br
                              from-cyan-50/70 via-white
                              to-blue-50/60 p-4
                              dark:border-cyan-500/20
                              dark:from-cyan-950/20
                              dark:via-slate-950
                              dark:to-blue-950/20
                            "
                          >
                            <div className="mb-4">
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                Chart Display
                              </h3>
                              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Configure axes, grid, time labels and chart density. The chart automatically simplifies itself when the widget becomes small.
                              </p>
                            </div>

                            {newType === "line" && (
                              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Chart Style
                                  </label>

                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      {
                                        value: "line",
                                        label: "Line",
                                      },
                                      {
                                        value: "area",
                                        label: "Area",
                                      },
                                    ].map((option) => {
                                      const selected =
                                        (newChartDisplay.chartStyle ||
                                          "line") === option.value;

                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() =>
                                            setNewChartDisplay(
                                              (previous) => ({
                                                ...previous,
                                                chartStyle:
                                                  option.value,
                                                curveType:
                                                  previous.curveType ||
                                                  "linear",
                                                lineWeight:
                                                  previous.lineWeight ||
                                                  "normal",
                                                linePattern:
                                                  previous.linePattern ||
                                                  "solid",
                                                strokeWidth:
                                                  previous.strokeWidth ||
                                                  2.5,
                                              })
                                            )
                                          }
                                          className={`
                                            rounded-xl border
                                            px-3 py-2.5
                                            text-sm font-semibold
                                            transition-colors
                                            ${
                                              selected
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                                                : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                            }
                                          `}
                                        >
                                          {option.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Time Window
                                  </label>
                                  <select
                                    value={
                                      newHistoryWindow
                                    }
                                    onChange={(event) =>
                                      setNewHistoryWindow(
                                        event.target.value
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 dark:text-white
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                    "
                                  >
                                    <option value="5m">5 minutes</option>
                                    <option value="15m">15 minutes</option>
                                    <option value="1h">1 hour</option>
                                    <option value="6h">6 hours</option>
                                    <option value="24h">24 hours</option>
                                    <option value="2d">2 days</option>
                                    <option value="7d">7 days</option>
                                    <option value="30d">30 days</option>
                                    <option value="90d">90 days</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    X-axis Time Format
                                  </label>
                                  <select
                                    value={
                                      newChartDisplay.xAxisFormat
                                    }
                                    onChange={(event) =>
                                      setNewChartDisplay(
                                        (previous) => ({
                                          ...previous,
                                          xAxisFormat:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 dark:text-white
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                    "
                                  >
                                    <option value="auto">Auto</option>
                                    <option value="time">Time only</option>
                                    <option value="date">Date only</option>
                                    <option value="datetime">Date + time</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {[
                                ["showGrid", "Grid"],
                                ["showLegend", "Legend"],
                                ["showTooltip", "Tooltip"],
                                ["showXAxis", "X-axis"],
                                ["showYAxis", "Y-axis"],
                                ...(newType !== "bar"
                                  ? [["showDots", "Data points"]]
                                  : []),
                              ].map(
                                ([key, label]) => (
                                  <label
                                    key={key}
                                    className="
                                      flex items-center gap-2
                                      rounded-2xl border
                                      border-gray-200 bg-white
                                      px-3 py-2.5
                                      dark:border-slate-700
                                      dark:bg-slate-900
                                    "
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        newChartDisplay[
                                          key
                                        ] !== false
                                      }
                                      onChange={(event) =>
                                        setNewChartDisplay(
                                          (previous) => ({
                                            ...previous,
                                            [key]:
                                              event.target.checked,
                                          })
                                        )
                                      }
                                    />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-white">
                                      {label}
                                    </span>
                                  </label>
                                )
                              )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                  Y-axis Range
                                </label>
                                <select
                                  value={
                                    newChartDisplay.yAxisMode
                                  }
                                  onChange={(event) =>
                                    setNewChartDisplay(
                                      (previous) => ({
                                        ...previous,
                                        yAxisMode:
                                          event.target.value,
                                      })
                                    )
                                  }
                                  className="
                                    w-full rounded-2xl border
                                    border-gray-300 bg-white
                                    px-4 py-3 dark:text-white
                                    dark:border-slate-600
                                    dark:bg-slate-900
                                  "
                                >
                                  <option value="auto">
                                    Automatic · visible data
                                  </option>
                                  <option value="range">
                                    Data Range · widget min/max
                                  </option>
                                  <option value="custom">
                                    Custom · axis min/max
                                  </option>
                                </select>

                                <div
                                  className={`
                                    mt-2 rounded-xl px-3 py-2
                                    text-[10px] leading-4
                                    ${
                                      newChartDisplay.yAxisMode ===
                                      "auto"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                        : newChartDisplay.yAxisMode ===
                                          "range"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                    }
                                  `}
                                >
                                  {newChartDisplay.yAxisMode ===
                                  "auto"
                                    ? "Uses only the visible chart data. Data Range minimum and maximum do not control the Y-axis while data is available."
                                    : newChartDisplay.yAxisMode ===
                                      "range"
                                    ? "Uses the widget Data Range minimum and maximum below."
                                    : "Uses the Axis Minimum and Axis Maximum entered here."}
                                </div>
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                  Y-axis Tick Count
                                </label>
                                <input
                                  type="number"
                                  min="2"
                                  max="12"
                                  value={
                                    newChartDisplay.yAxisTickCount
                                  }
                                  onChange={(event) =>
                                    setNewChartDisplay(
                                      (previous) => ({
                                        ...previous,
                                        yAxisTickCount:
                                          event.target.value,
                                      })
                                    )
                                  }
                                  className="
                                    w-full rounded-2xl border
                                    border-gray-300 bg-white
                                    px-4 py-3 dark:text-white
                                    dark:border-slate-600
                                    dark:bg-slate-900
                                  "
                                />
                              </div>
                            </div>

                            {newChartDisplay.yAxisMode ===
                              "custom" && (
                              <div className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Axis Minimum
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={
                                      newChartDisplay.yAxisMin
                                    }
                                    onChange={(event) =>
                                      setNewChartDisplay(
                                        (previous) => ({
                                          ...previous,
                                          yAxisMin:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 dark:text-white
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                    "
                                  />
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Axis Maximum
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={
                                      newChartDisplay.yAxisMax
                                    }
                                    onChange={(event) =>
                                      setNewChartDisplay(
                                        (previous) => ({
                                          ...previous,
                                          yAxisMax:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 dark:text-white
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                    "
                                  />
                                </div>
                              </div>
                            )}

                            {newType === "line" && (
                              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    {newChartDisplay.chartStyle ===
                                    "area"
                                      ? "Edge Type"
                                      : "Line Type"}
                                  </label>

                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      {
                                        value: "linear",
                                        label: "Normal",
                                        description:
                                          "Straight",
                                        preview:
                                          "M2 15 L12 8 L22 12 L34 3",
                                      },
                                      {
                                        value: "monotone",
                                        label: "Smooth",
                                        description:
                                          "Curved",
                                        preview:
                                          "M2 15 C8 15 8 8 14 8 C21 8 23 12 28 10 C32 8 32 3 34 3",
                                      },
                                      {
                                        value: "step",
                                        label: "Step",
                                        description:
                                          "Stepped",
                                        preview:
                                          "M2 15 H12 V8 H23 V12 H29 V3 H34",
                                      },
                                    ].map((option) => {
                                      const selected =
                                        (newChartDisplay.curveType ||
                                          "linear") === option.value;

                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() =>
                                            setNewChartDisplay(
                                              (previous) => ({
                                                ...previous,
                                                curveType:
                                                  option.value,
                                              })
                                            )
                                          }
                                          className={`
                                            rounded-xl border p-2.5
                                            text-left transition-colors
                                            ${
                                              selected
                                                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                                                : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                                            }
                                          `}
                                        >
                                          <svg
                                            viewBox="0 0 36 18"
                                            className="mb-1.5 h-5 w-full"
                                            aria-hidden="true"
                                          >
                                            <path
                                              d={option.preview}
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className={
                                                selected
                                                  ? "text-emerald-600 dark:text-emerald-300"
                                                  : "text-slate-400"
                                              }
                                            />
                                          </svg>

                                          <div
                                            className={`text-xs font-bold ${
                                              selected
                                                ? "text-emerald-700 dark:text-emerald-300"
                                                : "text-slate-700 dark:text-slate-200"
                                            }`}
                                          >
                                            {option.label}
                                          </div>

                                          <div className="mt-0.5 text-[10px] text-slate-400">
                                            {option.description}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    {newChartDisplay.chartStyle ===
                                    "area"
                                      ? "Edge Weight"
                                      : "Line Weight"}
                                  </label>

                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      {
                                        value: "thin",
                                        label: "Thin",
                                        width: 1.5,
                                      },
                                      {
                                        value: "normal",
                                        label: "Normal",
                                        width: 2.5,
                                      },
                                      {
                                        value: "bold",
                                        label: "Bold",
                                        width: 4,
                                      },
                                    ].map((option) => {
                                      const selected =
                                        (newChartDisplay.lineWeight ||
                                          "normal") === option.value;

                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() =>
                                            setNewChartDisplay(
                                              (previous) => ({
                                                ...previous,
                                                lineWeight:
                                                  option.value,
                                                strokeWidth:
                                                  option.width,
                                              })
                                            )
                                          }
                                          className={`
                                            rounded-xl border
                                            px-3 py-2.5
                                            transition-colors
                                            ${
                                              selected
                                                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                                                : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                                            }
                                          `}
                                        >
                                          <div className="mb-2 flex h-4 items-center">
                                            <span
                                              className={`block w-full rounded-full ${
                                                selected
                                                  ? "bg-emerald-600 dark:bg-emerald-400"
                                                  : "bg-slate-400 dark:bg-slate-500"
                                              }`}
                                              style={{
                                                height:
                                                  `${option.width}px`,
                                              }}
                                            />
                                          </div>

                                          <div
                                            className={`text-xs font-bold ${
                                              selected
                                                ? "text-emerald-700 dark:text-emerald-300"
                                                : "text-slate-700 dark:text-slate-200"
                                            }`}
                                          >
                                            {option.label}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <p className="mt-2 text-[10px] text-slate-400">
                                    Normal is the default.
                                  </p>
                                </div>

                                {newChartDisplay.chartStyle !==
                                  "area" && (
                                  <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                      Line Pattern
                                    </label>

                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        {
                                          value: "solid",
                                          label: "Solid",
                                          dash: "",
                                        },
                                        {
                                          value: "dashed",
                                          label: "Dashed",
                                          dash: "8 5",
                                        },
                                        {
                                          value: "dotted",
                                          label: "Dotted",
                                          dash: "2 5",
                                        },
                                      ].map((option) => {
                                        const selected =
                                          (newChartDisplay.linePattern ||
                                            "solid") ===
                                          option.value;

                                        return (
                                          <button
                                            key={option.value}
                                            type="button"
                                            onClick={() =>
                                              setNewChartDisplay(
                                                (previous) => ({
                                                  ...previous,
                                                  linePattern:
                                                    option.value,
                                                })
                                              )
                                            }
                                            className={`
                                              rounded-xl border
                                              px-3 py-2.5
                                              transition-colors
                                              ${
                                                selected
                                                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                                                  : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                                              }
                                            `}
                                          >
                                            <svg
                                              viewBox="0 0 64 12"
                                              className="mb-2 h-3 w-full"
                                              aria-hidden="true"
                                            >
                                              <line
                                                x1="2"
                                                y1="6"
                                                x2="62"
                                                y2="6"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeDasharray={
                                                  option.dash ||
                                                  undefined
                                                }
                                                className={
                                                  selected
                                                    ? "text-emerald-600 dark:text-emerald-300"
                                                    : "text-slate-400"
                                                }
                                              />
                                            </svg>

                                            <div
                                              className={`text-xs font-bold ${
                                                selected
                                                  ? "text-emerald-700 dark:text-emerald-300"
                                                  : "text-slate-700 dark:text-slate-200"
                                              }`}
                                            >
                                              {option.label}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <p className="mt-2 text-[10px] text-slate-400">
                                      Solid is the default.
                                    </p>
                                  </div>
                                )}

                                {newChartDisplay.chartStyle ===
                                  "area" && (
                                  <>
                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                        Area Opacity
                                      </label>

                                      <div className="flex items-center gap-3">
                                        <input
                                          type="range"
                                          min="0.05"
                                          max="0.9"
                                          step="0.05"
                                          value={
                                            Number(
                                              newChartDisplay.areaOpacity
                                            ) || 0.34
                                          }
                                          onChange={(event) =>
                                            setNewChartDisplay(
                                              (previous) => ({
                                                ...previous,
                                                areaOpacity:
                                                  Number(
                                                    event.target.value
                                                  ),
                                              })
                                            )
                                          }
                                          className="min-w-0 flex-1 accent-emerald-600"
                                        />

                                        <span className="w-12 text-right text-xs font-semibold text-gray-500 dark:text-slate-400">
                                          {Math.round(
                                            (Number(
                                              newChartDisplay.areaOpacity
                                            ) || 0.34) * 100
                                          )}
                                          %
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                        Fade End
                                      </label>

                                      <div className="flex items-center gap-3">
                                        <input
                                          type="range"
                                          min="0"
                                          max="0.4"
                                          step="0.025"
                                          value={
                                            Number(
                                              newChartDisplay.areaEndOpacity
                                            ) || 0.025
                                          }
                                          onChange={(event) =>
                                            setNewChartDisplay(
                                              (previous) => ({
                                                ...previous,
                                                areaEndOpacity:
                                                  Number(
                                                    event.target.value
                                                  ),
                                              })
                                            )
                                          }
                                          className="min-w-0 flex-1 accent-emerald-600"
                                        />

                                        <span className="w-12 text-right text-xs font-semibold text-gray-500 dark:text-slate-400">
                                          {Math.round(
                                            (Number(
                                              newChartDisplay.areaEndOpacity
                                            ) || 0.025) * 100
                                          )}
                                          %
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    ) &&
                          hasSelectedDataSource && (
                            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h3 className="font-bold dark:text-white">
                                    Data Range and Thresholds
                                  </h3>

                                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Configure the unit, expected operating range, and thresholds for this widget.
                                  </p>

                                  {newType === "line" &&
                                    newChartDisplay.yAxisMode ===
                                      "auto" && (
                                      <p className="mt-2 text-[10px] font-medium leading-4 text-blue-600 dark:text-blue-300">
                                        Automatic Y-axis is active: Minimum and Maximum remain saved as the widget's expected range, but they do not control the chart Y-axis while live/history data is available.
                                      </p>
                                    )}
                                </div>


                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {[
                                  { key: "min", label: "Minimum" },
                                  { key: "max", label: "Maximum" },
                                  { key: "warning", label: "Warning Value" },
                                  { key: "danger", label: "Danger Value" },
                                ].map((field) => (
                                  <div key={field.key}>
                                    <label className="mb-2 block text-sm font-semibold dark:text-white">
                                      {field.label}
                                    </label>

                                    <input
                                      type="number"
                                      step="any"
                                      value={newRangeConfig[field.key]}
                                      onChange={(event) =>
                                        setNewRangeConfig((previous) => ({
                                          ...previous,
                                          [field.key]: event.target.value,
                                        }))
                                      }
                                      className="
                                        w-full rounded-2xl
                                        border border-gray-300 dark:border-slate-600
                                        bg-white dark:bg-slate-900
                                        px-4 py-3
                                        dark:text-white
                                        outline-none
                                        focus:ring-2 focus:ring-emerald-500
                                      "
                                    />
                                  </div>
                                ))}

                                <div className="sm:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold dark:text-white">
                                    Unit
                                  </label>

                                  <input
                                    type="text"
                                    placeholder="Example: bar, psi, °C"
                                    value={newRangeConfig.unit}
                                    onChange={(event) =>
                                      setNewRangeConfig((previous) => ({
                                        ...previous,
                                        unit: event.target.value,
                                      }))
                                    }
                                    className="
                                      w-full rounded-2xl
                                      border border-gray-300 dark:border-slate-600
                                      bg-white dark:bg-slate-900
                                      px-4 py-3
                                      dark:text-white
                                      outline-none
                                      focus:ring-2 focus:ring-emerald-500
                                    "
                                  />
                                </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                                These settings are saved directly with this widget and are used by the dashboard at runtime.
                              </div>
                            </div>
                          )}

                        {newType === "sankey" && (
                          <div
                            className="
                              mt-4 rounded-2xl border p-4
                              border-emerald-200 bg-emerald-50
                              dark:border-emerald-500/40
                              dark:bg-slate-900
                            "
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                  Sankey Flow Configuration
                                </h3>

                                <p
                                  className="mt-1 text-sm leading-5"
                                  style={{
                                    color: document.documentElement.classList.contains("dark")
                                      ? "#334155"
                                      : "#475569",
                                  }}
                                >
                                  Open the full-screen editor to configure the source name and output data sources.
                                </p>

                                <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                  Current setup: {getSankeyOutputs().length} output(s)
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const preparedConfig = getPreparedSankeyConfig();

                                  const target =
                                    selectedItem ||
                                    base || {
                                      id: Date.now(),
                                      type: "sankey",
                                      x: activeCell?.col ?? 0,
                                      y: activeCell?.row ?? 0,
                                      w: newW || 3,
                                      h: newH || 2,
                                    };

                                  const targetDataKeys = [
                                    ...new Set(
                                      (preparedConfig.outputs || [])
                                        .map((output) => output.dataKey)
                                        .filter(Boolean)
                                    ),
                                  ];

                                  setEditingSankeyWidget({
                                    ...target,
                                    type: "sankey",
                                    label:
                                      newLabel.trim() ||
                                      target.label ||
                                      "Sankey Flow",
                                    dataKey:
                                      targetDataKeys[0] ||
                                      target.dataKey ||
                                      "",
                                    dataKeys: targetDataKeys,
                                    sankeyConfig: preparedConfig,
                                    customDataOptions,
                                    returnPage: designerPage,
                                    resumeWidgetSettings: true,
                                    designerSnapshot: getDesignerSnapshot(),
                                  });

                                  setShowModal(false);
                                  setPage("sankey-editor");
                                }}
                                className="
                                  inline-flex items-center justify-center
                                  rounded-2xl bg-emerald-600
                                  px-5 py-3 text-sm font-bold
                                  text-white shadow-lg
                                  shadow-emerald-600/20
                                  transition hover:bg-emerald-700
                                  dark:bg-emerald-500
                                  dark:text-slate-950
                                  dark:hover:bg-emerald-400
                                "
                              >
                                Open Sankey Flow Editor
                              </button>
                            </div>
                          </div>
                        )}


                      </div>
                    )}

                    <div
                      className="
                        mt-3 rounded-xl border
                        border-slate-200 bg-white
                        px-3 py-3
                        dark:border-slate-700
                        dark:bg-slate-900
                      "
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="
                            mt-0.5 flex h-7 w-7
                            shrink-0 items-center
                            justify-center rounded-lg
                            bg-emerald-50
                            text-emerald-600
                            dark:bg-emerald-500/10
                            dark:text-emerald-300
                          "
                        >
                          <CheckCircle2 size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            Widget Summary
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="max-w-full truncate text-sm font-bold text-slate-800 dark:text-white">
                              {newLabel.trim() ||
                                getFallbackWidgetLabel(
                                  newType,
                                  isMultiDataWidget
                                    ? newDataKeys[0] ||
                                      newDataKey
                                    : newDataKey
                                )}
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {selectedWidgetTypeLabel}
                            </span>

                            <span className="text-[10px] text-slate-300 dark:text-slate-600">
                              •
                            </span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {newW} × {newH}
                            </span>

                            <span className="text-[10px] text-slate-300 dark:text-slate-600">
                              •
                            </span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {widgetSummarySourceText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomWidgetModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setShowCustomWidgetModal(false)}
        >
          <div
            className="w-[min(620px,94vw)] max-h-[90vh] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add Custom Widget Type
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                  Create a reusable widget preset using one of the existing display renderers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomWidgetModal(false)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close custom widget type form"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">
                  Widget type name
                </label>
                <input
                  type="text"
                  value={customWidgetDraft.label}
                  onChange={(event) =>
                    setCustomWidgetDraft((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="e.g. Boiler Status, Steam KPI, Sterilizer Trend"
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">
                  Based on widget renderer
                </label>
                <select
                  value={customWidgetDraft.baseType}
                  onChange={(event) =>
                    setCustomWidgetDraft((current) => ({
                      ...current,
                      baseType: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                >
                  {widgetLibrary.map((widget) => (
                    <option key={widget.type} value={widget.type}>
                      {widget.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-400">
                  This controls how the widget is rendered. The custom name is saved as a preset in this template.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={customWidgetDraft.description}
                  onChange={(event) =>
                    setCustomWidgetDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional description shown under the custom widget type."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                Custom widget types are saved with the template as reusable display presets.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-5 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowCustomWidgetModal(false)}
                className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addCustomWidgetType}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Add and Select Widget Type
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
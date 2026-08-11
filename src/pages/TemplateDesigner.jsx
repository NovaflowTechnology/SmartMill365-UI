import { useState, useEffect, useRef } from "react";
import { widgetLibrary } from "../data/widgetLibrary";
import WidgetRenderer from "../components/WidgetRenderer";
import { defaultSankeyConfig } from "../widgets/SankeyWidget";

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
  ChevronDown,
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
  curveType: "monotone",
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

// SAMPLE HISTORY FOR LINE / AREA CHART PREVIEW
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
                    ? "bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40"
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
  // INFLUX TEMPLATE DATA MAPPING
  // =====================================
  const role = localStorage.getItem("role");

  const isSuperadmin =
    role === "superadmin";

  const isOrganizationAdmin =
    role === "admin";

  const canConfigureInflux =
    isSuperadmin || isOrganizationAdmin;

  const [
    showInfluxMapping,
    setShowInfluxMapping,
  ] = useState(false);

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

  const [influxBuckets, setInfluxBuckets] =
    useState([]);

  const [influxIds, setInfluxIds] =
    useState([]);

  const [influxChannels, setInfluxChannels] =
    useState([]);

  const [influxMeasurements, setInfluxMeasurements] =
    useState([]);

  const [influxLoading, setInfluxLoading] =
    useState(false);

  const [influxError, setInfluxError] =
    useState("");

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

  // CURRENT SELECTED ITEM
  const selectedItem = items.find(
    (i) => i.id === activeItemId
  );

  const isEdit = !!selectedItem;

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

      setChannelMap({
        ...defaultChannelMap,
        ...(layout?.channelMap || {}),
      });

      setCustomDataOptions(
        Array.isArray(layout?.customDataOptions)
          ? layout.customDataOptions
          : []
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

  const influxFieldOptions = influxChannels.map(
    (field) => ({
      key: field,
      label: formatInfluxFieldLabel(field),
      channel: field,
      unit: "",
      isInfluxField: true,
      source: {
        bucket: influxConfig.bucket,
        measurement: influxConfig.measurement,
        tagKey: influxConfig.tagKey || "id",
        tagValue:
          influxConfig.tagValue ||
          influxConfig.id ||
          "",
        field,
      },
    })
  );

  // Influx metadata is now the source of truth.
  // Custom data sources remain available as optional aliases.
  const allDataOptions = deduplicateDataOptions([
    ...customDataOptions,
    ...influxFieldOptions,
  ]);

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
    if (
      ["image", "status", "sankey", "logs"].includes(type)
    ) {
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

  const isMultiDataWidget =
    newType === "line" ||
    newType === "area" ||
    newType === "bar" ||
    newType === "pie";

  // DEFAULT LABEL
  const getDefaultWidgetLabel = (type) =>
    `${
      type.charAt(0).toUpperCase() +
      type.slice(1)
    } Widget`;

  // Keep image widgets in landscape dimensions so the diagram is readable
  // in both the canvas and the widget settings preview.
  const handleWidgetTypeChange = (type, customWidgetTypeId = "") => {
    setNewType(type);
    setNewWidgetTypeId(customWidgetTypeId);

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

    if (type === "bignumber" && !isEdit) {
      setNewBigNumberDisplay({
        ...defaultBigNumberDisplay,
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
      ["line", "area", "bar"].includes(type) &&
      !isEdit
    ) {
      setNewChartDisplay({
        ...defaultChartDisplay,
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

  const applySelectedDevice = (deviceId, devices = availableDevices) => {
    const selectedDevice = devices.find(
      (device) =>
        String(device.id) === String(deviceId)
    );

    if (!selectedDevice) {
      return;
    }

    const tagValue = selectedDevice.tag_value || "";

    setSelectedDeviceId(String(selectedDevice.id));

    setInfluxConfig({
      bucket: selectedDevice.bucket_name || "",
      measurement:
        selectedDevice.measurement_name || "",
      tagKey: selectedDevice.tag_key || "id",
      id: tagValue,
      tagValue,
    });

    setInfluxIds([tagValue].filter(Boolean));
    setInfluxMeasurements(
      [selectedDevice.measurement_name].filter(Boolean)
    );
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
        const devices = await fetchAllowedDevices(token);

        setAvailableDevices(devices);

        setInfluxBuckets(
          [
            ...new Set(
              devices
                .map((device) => device.bucket_name)
                .filter(Boolean)
            ),
          ].sort()
        );

        const selectedStillExists = devices.some(
          (device) =>
            String(device.id) === String(selectedDeviceId)
        );

        const deviceToUse = selectedStillExists
          ? selectedDeviceId
          : devices[0]?.id;

        if (!deviceToUse) {
          setInfluxConfig(defaultInfluxConfig);
          setInfluxIds([]);
          setInfluxMeasurements([]);
          setInfluxChannels([]);
          setInfluxError(
            "No Influx device has been assigned to your organization."
          );
          return;
        }

        applySelectedDevice(deviceToUse, devices);
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
        setInfluxIds([]);
        setInfluxChannels([]);
        return;
      }

      const { ids, channels } =
        await fetchInfluxIdsAndChannels(
          selectedBucket,
          selectedMeasurement,
          token
        );

      setInfluxIds(ids);
      setInfluxChannels(channels);
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

  // Organization admins receive a device list already filtered by their org.
  useEffect(() => {
    if (!isOrganizationAdmin) return;

    const loadAssignedDevices = async () => {
      const token =
        localStorage.getItem("token");

      setInfluxLoading(true);
      setInfluxError("");

      try {
        const devices = await fetchAllowedDevices(token);

        setAvailableDevices(devices);

        if (!devices.length) {
          setInfluxError(
            "No Influx device has been assigned to your organization."
          );
          return;
        }

        const selectedStillExists = devices.some(
          (device) =>
            String(device.id) === String(selectedDeviceId)
        );

        applySelectedDevice(
          selectedStillExists
            ? selectedDeviceId
            : devices[0].id,
          devices
        );
      } catch (err) {
        console.error(
          "❌ Assigned Influx device error:",
          err
        );

        setAvailableDevices([]);
        setInfluxError(
          err.message ||
            "Failed to load assigned Influx devices."
        );
      } finally {
        setInfluxLoading(false);
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

  // Superadmins can browse all IDs and fields for a chosen measurement.
  useEffect(() => {
    if (!isSuperadmin) return;

    const selectedBucket =
      influxConfig.bucket.trim();

    const selectedMeasurement =
      influxConfig.measurement.trim();

    if (!selectedBucket || !selectedMeasurement) {
      setInfluxIds([]);
      setInfluxChannels([]);
      return;
    }

    const loadIdsAndChannels = async () => {
      const token =
        localStorage.getItem("token");

      setInfluxLoading(true);
      setInfluxError("");

      try {
        const { ids, channels } =
          await fetchInfluxIdsAndChannels(
            selectedBucket,
            selectedMeasurement,
            token
          );

        setInfluxIds(ids);
        setInfluxChannels(channels);
      } catch (err) {
        console.error(
          "❌ Influx ID/channel error:",
          err
        );

        setInfluxIds([]);
        setInfluxChannels([]);
        setInfluxError(
          err.message ||
            "Failed to load Influx IDs and channels."
        );
      } finally {
        setInfluxLoading(false);
      }
    };

    loadIdsAndChannels();
  }, [
    isSuperadmin,
    influxConfig.bucket,
    influxConfig.measurement,
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

  // LOAD DEFAULT DATAKEY WHEN TYPE CHANGES
  useEffect(() => {
    const availableOptions = getAvailableDataOptionsForType(newType);
    const firstKey = availableOptions[0]?.key || "";

    if (
      newType === "line" ||
      newType === "area" ||
      newType === "bar" ||
      newType === "pie"
    ) {
      setNewDataKeys(firstKey ? [firstKey] : []);
      setNewDataKey(firstKey);
    } else {
      setNewDataKey(firstKey);
      setNewDataKeys([]);
    }

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
  }, [newDataKey, newType, selectedItem]);

  // RETURN FROM IMAGE EDITOR
  useEffect(() => {
    if (!editingImageWidget?.resumeWidgetSettings) return;

    const {
      resumeWidgetSettings,
      returnPage,
      ...returnedWidget
    } = editingImageWidget;

    const returnedPins = Array.isArray(returnedWidget.pins)
      ? returnedWidget.pins
      : [];

    const alreadyExists = items.some(
      (item) => item.id === returnedWidget.id
    );

    // For an existing image widget, write the latest pins into the grid item
    // immediately. This prevents the selected-item effect from restoring old pins.
    if (alreadyExists) {
      setItems((previousItems) =>
        previousItems.map((item) =>
          item.id === returnedWidget.id
            ? {
                ...item,
                ...returnedWidget,
                pins: returnedPins,
              }
            : item
        )
      );
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

    setWidgetStep(2);
    setShowModal(true);

    if (typeof setEditingImageWidget === "function") {
      setEditingImageWidget(null);
    }
  }, [editingImageWidget, items, setEditingImageWidget]);


  // RETURN FROM SANKEY FLOW EDITOR
  useEffect(() => {
    if (!editingSankeyWidget?.resumeWidgetSettings) return;

    const {
      resumeWidgetSettings,
      returnPage,
      ...returnedWidget
    } = editingSankeyWidget;

    const alreadyExists = items.some(
      (item) => item.id === returnedWidget.id
    );

    if (alreadyExists) {
      setItems((previousItems) =>
        previousItems.map((item) =>
          item.id === returnedWidget.id
            ? {
                ...item,
                ...returnedWidget,
              }
            : item
        )
      );
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

    setWidgetStep(2);
    setShowModal(true);

    if (typeof setEditingSankeyWidget === "function") {
      setEditingSankeyWidget(null);
    }
  }, [editingSankeyWidget, items, setEditingSankeyWidget]);

  // LOAD SELECTED ITEM SETTINGS
  useEffect(() => {
    if (!selectedItem) return;

    setNewType(selectedItem.type);
    setNewWidgetTypeId(selectedItem.customWidgetTypeId || "");

    setNewLabel(selectedItem.label || "");

    setNewDataKey(
      selectedItem.dataKey || ""
    );

    setNewDataKeys(
      selectedItem.type === "line" ||
        selectedItem.type === "area" ||
        selectedItem.type === "bar" ||
        selectedItem.type === "pie"
        ? selectedItem.dataKeys?.length
          ? selectedItem.dataKeys
          : selectedItem.dataKey
          ? [selectedItem.dataKey]
          : []
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
    });

    setNewHistoryWindow(
      selectedItem.historyWindow ||
        defaultHistoryWindow
    );

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

  const addCustomDataSource = () => {
    const label = customDataDraft.label.trim();
    const channel = customDataDraft.channel.trim();
    const unit = customDataDraft.unit.trim();

    if (!label) {
      showToast("error", "Enter a display name for the new data source.");
      return;
    }

    if (!channel) {
      showToast("error", "Enter or select the Influx channel for the new data source.");
      return;
    }

    const baseKey = createSafeDataKey(
      customDataDraft.key || label
    );

    const key = getUniqueDataKey(baseKey, allDataOptions);

    const newOption = {
      key,
      label,
      unit,
      isCustom: true,
    };

    setCustomDataOptions((previousOptions) => [
      ...previousOptions,
      newOption,
    ]);

    setChannelMap((previousMap) => ({
      ...previousMap,
      [key]: channel,
    }));

    if (isMultiDataWidget) {
      setNewDataKeys((previousKeys) => [
        ...new Set([...previousKeys, key]),
      ]);
    } else {
      setNewDataKey(key);
    }

    if (!newLabel.trim()) {
      setNewLabel(label);
    }

    setCustomDataDraft({
      label: "",
      key: "",
      channel: "",
      unit: "",
    });

    setShowCustomDataModal(false);
    showToast("success", "Custom data source added.");
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

  // ADD WIDGET
  const addWidget = () => {
    if (!activeCell) return;

    if (!validateRangeConfig()) return;

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
          : isMultiDataWidget
          ? newDataKeys
          : undefined,

      orientation:
        newType === "bar"
          ? newOrientation
          : undefined,

      chartDisplay:
        ["line", "area", "bar"].includes(
          newType
        )
          ? { ...newChartDisplay }
          : undefined,

      historyWindow:
        ["line", "area"].includes(newType)
          ? newHistoryWindow
          : undefined,

      x: activeCell.col,
      y: activeCell.row,

      w: newW,
      h: newH,

      bigNumberDisplay:
        newType === "bignumber"
          ? { ...newBigNumberDisplay }
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
                : isMultiDataWidget
                ? newDataKeys
                : undefined,

            orientation:
              newType === "bar"
                ? newOrientation
                : undefined,

            chartDisplay:
              ["line", "area", "bar"].includes(
                newType
              )
                ? { ...newChartDisplay }
                : undefined,

            historyWindow:
              ["line", "area"].includes(
                newType
              )
                ? newHistoryWindow
                : undefined,

            w: newW,
            h: newH,

            bigNumberDisplay:
              newType === "bignumber"
                ? { ...newBigNumberDisplay }
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

    if (
      canConfigureInflux &&
      (!influxConfig.bucket.trim() ||
        !influxConfig.measurement.trim() ||
        !(influxConfig.tagValue || influxConfig.id))
    ) {
      setShowInfluxMapping(true);

      showToast(
        "error",
        `Configure the Influx bucket, measurement, and device ID before ${
          isEditingTemplate ? "updating" : "creating"
        } this template.`
      );

      return;
    }

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

              influx: {
                bucket: influxConfig.bucket.trim(),
                measurement:
                  influxConfig.measurement.trim(),
                tagKey: influxConfig.tagKey || "id",
                tagValue:
                  influxConfig.tagValue ||
                  influxConfig.id,
                id: influxConfig.tagValue || influxConfig.id,
                deviceId: selectedDeviceId || undefined,
              },

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
            : isMultiDataWidget
            ? newDataKeys
            : undefined,

        orientation:
          newType === "bar"
            ? newOrientation
            : undefined,

        chartDisplay:
          ["line", "area", "bar"].includes(
            newType
          )
            ? { ...newChartDisplay }
            : undefined,

        historyWindow:
          ["line", "area"].includes(newType)
            ? newHistoryWindow
            : undefined,

        w: newW,
        h: newH,

        bigNumberDisplay:
          newType === "bignumber"
            ? { ...newBigNumberDisplay }
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
    newType !== "image" &&
    availableDataOptions.length > 0;

  const hasSelectedDataSource =
    newType === "sankey"
      ? getConfiguredSankeyOutputs().length > 0
      : isMultiDataWidget
      ? newDataKeys.length > 0
      : Boolean(newDataKey);

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
      widgetStep === 3 &&
      isDataSourceRequired &&
      !hasSelectedDataSource
    ) {
      showToast("error", "Please select a data source before continuing.");
      return;
    }

    setWidgetStep((step) => Math.min(step + 1, 3));
  };

  if (isEditingTemplate && !selectedTemplate) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-xl">
        No template selected
      </div>
    );
  }

  return (
    <div className="template-builder relative h-full overflow-auto bg-transparent p-6 text-gray-900 dark:bg-[#050a1e] dark:text-slate-100">
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

      {/* HEADER */}
      <div
        className="
          sticky top-0 z-20
          bg-white dark:bg-slate-900/80
          backdrop-blur-xl
          rounded-3xl
          border border-gray-200 dark:border-slate-700
          p-6 mb-6
          shadow-lg
        "
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold dark:text-white flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-emerald-500" />
              {isEditingTemplate ? "Template Editor" : "Template Builder"}
            </h1>

            <p className="text-gray-500 dark:text-slate-300 mt-1">
              {isEditingTemplate
                ? "Edit industrial dashboard layouts. Drag widgets to reposition them."
                : "Design industrial dashboard layouts. Drag widgets to reposition them."}
            </p>
          </div>

          <button
            onClick={saveTemplate}
            className="
              flex items-center gap-2
              bg-emerald-600 hover:bg-emerald-700
              text-white
              px-5 py-3
              rounded-2xl
              shadow-lg
              transition-all duration-200
              hover:-translate-y-1
            "
          >
            <Save size={18} />
            {isEditingTemplate ? "Update Template" : "Create Template"}
          </button>
        </div>

        {/* TEMPLATE NAME */}
        <div className="mt-5">
          <input
            type="text"
            placeholder="Template Name..."
            value={templateName}
            onChange={(e) =>
              setTemplateName(e.target.value)
            }
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
        </div>

        {/* GRID SIZE SETTINGS */}
        <div
          className="
            mt-5
            rounded-3xl
            border border-gray-200 dark:border-slate-700
            bg-gray-50 dark:bg-slate-950/80
            p-5
          "
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold dark:text-white flex items-center gap-2">
                <LayoutGrid size={18} className="text-emerald-500" />
                Dashboard Grid Size
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-300">
                Increase the number of rows or columns when this template needs more widget space.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                  Rows
                </label>

                <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => updateGridRows(rows - 1)}
                    className="px-4 py-3 text-lg font-bold text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-800"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min={GRID_MIN_ROWS}
                    max={GRID_MAX_ROWS}
                    value={rows}
                    onChange={(event) => updateGridRows(event.target.value)}
                    className="w-20 border-0 bg-transparent px-3 py-3 text-center font-bold outline-none focus:ring-0 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() => updateGridRows(rows + 1)}
                    className="px-4 py-3 text-lg font-bold text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-800"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                  Columns
                </label>

                <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => updateGridCols(cols - 1)}
                    className="px-4 py-3 text-lg font-bold text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-800"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min={GRID_MIN_COLS}
                    max={GRID_MAX_COLS}
                    value={cols}
                    onChange={(event) => updateGridCols(event.target.value)}
                    className="w-20 border-0 bg-transparent px-3 py-3 text-center font-bold outline-none focus:ring-0 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() => updateGridCols(cols + 1)}
                    className="px-4 py-3 text-lg font-bold text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-gray-800"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400 dark:text-slate-400">
            Current layout: {rows} × {cols}. Maximum supported layout: {GRID_MAX_ROWS} × {GRID_MAX_COLS}.
          </p>
        </div>

        {/* INFLUX DATA MAPPING */}
        {canConfigureInflux && (
          <div
            className="
              mt-5 overflow-hidden
              rounded-3xl border
              border-gray-200 bg-gray-50
              dark:border-slate-700
              dark:bg-slate-950/80
            "
          >
            <button
              type="button"
              onClick={() =>
                setShowInfluxMapping(
                  !showInfluxMapping
                )
              }
              className="
                data-mapping-toggle
                flex w-full items-center
                justify-between gap-4
                p-5 text-left
                transition-colors duration-200
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    w-10 h-10
                    rounded-2xl
                    bg-emerald-100 dark:bg-emerald-900/30
                    text-emerald-600 dark:text-emerald-300
                    flex items-center justify-center
                  "
                >
                  <Database size={19} />
                </div>

                <div>
                  <h2 className="font-bold dark:text-white">
                    Data Mapping
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                    Choose the Influx device. Available fields are loaded directly from the selected measurement.
                  </p>
                </div>
              </div>

              <ChevronDown
                size={20}
                className={`
                  text-gray-400 dark:text-slate-400
                  transition-transform

                  ${
                    showInfluxMapping
                      ? "rotate-180"
                      : ""
                  }
                `}
              />
            </button>

            {showInfluxMapping && (
              <div
                className="
                  border-t border-gray-200 dark:border-slate-700
                  p-5
                "
              >
                {isOrganizationAdmin ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                        Assigned Sterilizer / Device
                      </label>

                      <select
                        value={selectedDeviceId}
                        onChange={(e) =>
                          applySelectedDevice(
                            e.target.value
                          )
                        }
                        disabled={
                          influxLoading ||
                          availableDevices.length === 0
                        }
                        className="
                          mt-2 w-full
                          rounded-2xl
                          border border-gray-300 dark:border-slate-600
                          bg-white dark:bg-slate-900
                          dark:text-white
                          px-4 py-3
                          outline-none
                          focus:ring-2 focus:ring-emerald-500
                          disabled:opacity-60
                          disabled:cursor-not-allowed
                        "
                      >
                        <option value="">
                          Select assigned device
                        </option>

                        {availableDevices.map((device) => (
                          <option
                            key={device.id}
                            value={device.id}
                          >
                            {device.device_name ||
                              device.tag_value}{" "}
                            — {device.measurement_name} (
                            {device.tag_key}={device.tag_value})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                          Bucket
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-800 dark:text-slate-100 break-all">
                          {influxConfig.bucket || "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                          Measurement
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-800 dark:text-slate-100 break-all">
                          {influxConfig.measurement || "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                          Device Tag
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-800 dark:text-slate-100 break-all">
                          {influxConfig.tagKey || "id"}=
                          {influxConfig.tagValue ||
                            influxConfig.id ||
                            "—"}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-slate-300">
                      Only devices assigned to your organization are available for mapping.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                        Bucket
                      </label>

                      <input
                        type="text"
                        value={influxConfig.bucket}
                        onChange={(e) => {
                          const bucket = e.target.value;

                          setInfluxConfig((prev) => ({
                            ...prev,
                            bucket,
                            measurement: "",
                            tagKey: "id",
                            id: "",
                            tagValue: "",
                          }));

                          setInfluxMeasurements([]);
                          setInfluxIds([]);
                          setInfluxChannels([]);
                        }}
                        placeholder="Mill"
                        className="
                          mt-2 w-full
                          rounded-2xl
                          border border-gray-300 dark:border-slate-600
                          bg-white dark:bg-slate-900
                          dark:text-white
                          px-4 py-3
                          outline-none
                          focus:ring-2 focus:ring-emerald-500
                        "
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                        Measurement
                      </label>

                      <select
                        value={influxConfig.measurement}
                        onChange={(e) => {
                          const measurement = e.target.value;

                          setInfluxConfig((prev) => ({
                            ...prev,
                            measurement,
                            tagKey: "id",
                            id: "",
                            tagValue: "",
                          }));

                          setInfluxIds([]);
                          setInfluxChannels([]);
                        }}
                        disabled={
                          influxLoading ||
                          !influxConfig.bucket.trim()
                        }
                        className="
                          mt-2 w-full
                          rounded-2xl
                          border border-gray-300 dark:border-slate-600
                          bg-white dark:bg-slate-900
                          dark:text-white
                          px-4 py-3
                          outline-none
                          focus:ring-2 focus:ring-emerald-500
                          disabled:opacity-60
                          disabled:cursor-not-allowed
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
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-slate-300">
                        Device ID
                      </label>

                      <select
                        value={influxConfig.id}
                        onChange={(e) =>
                          setInfluxConfig((prev) => ({
                            ...prev,
                            id: e.target.value,
                            tagValue: e.target.value,
                          }))
                        }
                        disabled={
                          influxLoading ||
                          !influxConfig.measurement
                        }
                        className="
                          mt-2 w-full
                          rounded-2xl
                          border border-gray-300 dark:border-slate-600
                          bg-white dark:bg-slate-900
                          dark:text-white
                          px-4 py-3
                          outline-none
                          focus:ring-2 focus:ring-emerald-500
                          disabled:opacity-60
                          disabled:cursor-not-allowed
                        "
                      >
                        <option value="">
                          Select available ID
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
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={refreshInfluxMetadata}
                    disabled={influxLoading}
                    className="
                      inline-flex items-center gap-2
                      rounded-2xl
                      bg-slate-800 hover:bg-slate-700
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      text-white
                      px-4 py-2.5
                      text-sm font-semibold
                      transition
                    "
                  >
                    <RefreshCw
                      size={16}
                      className={
                        influxLoading
                          ? "animate-spin"
                          : ""
                      }
                    />

                    {influxLoading
                      ? "Loading..."
                      : "Reload Measurements, IDs & Channels"}
                  </button>

                  <span className="text-xs text-gray-500 dark:text-slate-300">
                    {influxMeasurements.length} measurement(s) ·{" "}
                    {influxIds.length} device ID(s) ·{" "}
                    {influxChannels.length} channel(s) found
                  </span>

                  {influxError && (
                    <span className="text-xs text-red-500">
                      {influxError}
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  <div className="mb-3">
                    <h3 className="font-bold dark:text-white">
                      Channel Mapping
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                      Select the Influx channel that supplies each dashboard data key.
                    </p>
                  </div>

                  <datalist id="influx-channel-options">
                    {influxChannels.map((channel) => (
                      <option
                        key={channel}
                        value={channel}
                      />
                    ))}
                  </datalist>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {allDataOptions.map((option) => (
                      <div
                        key={option.key}
                        className="
                          rounded-2xl
                          border border-gray-200 dark:border-slate-700
                          bg-white dark:bg-slate-900
                          p-3
                        "
                      >
                        <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 truncate">
                          {option.label}
                        </label>

                        <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1 truncate">
                          Dashboard key: {option.key}
                        </p>

                        <input
                          type="text"
                          list="influx-channel-options"
                          value={
                            channelMap[option.key] ||
                            ""
                          }
                          onChange={(e) =>
                            updateChannelMapping(
                              option.key,
                              e.target.value
                            )
                          }
                          placeholder="Select or type channel"
                          className="
                            mt-3 w-full
                            rounded-xl
                            border border-gray-300 dark:border-slate-600
                            bg-gray-50 dark:bg-slate-950 dark:bg-gray-800
                            dark:text-white
                            px-3 py-2.5
                            text-sm
                            outline-none
                            focus:ring-2 focus:ring-emerald-500
                          "
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, minmax(180px, 1fr))`,
          minHeight: "75vh",
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
                rounded-3xl
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
                    <Plus className="mx-auto mb-2 text-gray-400 dark:text-slate-400" />

                    <p className="text-sm text-gray-400 dark:text-slate-400">
                      Add Widget
                    </p>
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
            {/* WIDGET LABEL BADGE */}
            <div
              className="
                absolute top-3 left-3
                z-10
                max-w-[70%]
                text-xs
                font-semibold
                text-gray-700 dark:text-slate-200
                dark:text-white
                bg-white dark:bg-slate-900/90
                dark:bg-gray-900/90
                border border-gray-200 dark:border-slate-700
                dark:border-gray-700
                px-3 py-1
                rounded-xl
                shadow-sm
                truncate
              "
            >
              {item.label || item.type}
            </div>

            {/* DRAG BADGE */}
            <div
              className="
                absolute top-3 right-3
                z-10
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
            fixed inset-0
            bg-black/60
            backdrop-blur-sm
            flex items-center justify-center
            z-50
            p-6
          "
          onClick={() => setShowModal(false)}
        >
          <div
            className="
              bg-white dark:bg-slate-900
              w-[1450px]
              max-w-[96vw]
              max-h-[92vh]
              rounded-3xl
              shadow-2xl
              overflow-hidden
              border border-gray-200 dark:border-slate-700
              flex flex-col
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* HEADER */}
            <div
              className="
                flex justify-between items-center
                border-b border-gray-200 dark:border-slate-700
                px-8 py-6
                bg-white dark:bg-slate-900
              "
            >
              <div>
                <h2 className="text-2xl font-bold dark:text-white">
                  {isEdit
                    ? "Edit Widget"
                    : "Widget Settings"}
                </h2>

                <p className="text-gray-500 dark:text-slate-300 mt-1">
                  Configure widget type, appearance, size and data source
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="
                  w-10 h-10
                  rounded-xl
                  hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800
                  flex items-center justify-center
                  dark:text-white
                "
              >
                <X />
              </button>
            </div>

            {/* BODY */}
            <div className="grid grid-cols-[1fr_520px] flex-1 overflow-hidden">
              {/* LEFT PREVIEW */}
              <div
                className="
                  bg-gray-100 dark:bg-[#050a1e]
                  p-8
                  border-r border-gray-200 dark:border-slate-700
                  overflow-hidden
                "
              >
                <div
                  className="
                    h-full
                    rounded-3xl
                    border border-dashed
                    border-gray-300 dark:border-slate-600
                    bg-white dark:bg-slate-900
                    overflow-hidden
                    p-6
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
                      flex-1
                      flex items-center justify-center
                      rounded-2xl
                      bg-gray-50 dark:bg-slate-950
                      overflow-hidden
                    "
                  >
                    <div
                      className={
                        newType === "image"
                          ? "aspect-video w-full max-w-full overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-950"
                          : "h-full w-full"
                      }
                    >
                      {showEmptyLivePreview || showNoValuesLivePreview ? (
                        <button
                          type="button"
                          onClick={() => setWidgetStep(3)}
                          className="
                            group flex h-full w-full
                            flex-col items-center justify-center
                            overflow-hidden rounded-2xl
                            border border-dashed
                            border-gray-300 dark:border-slate-600
                            bg-gray-50 dark:bg-slate-950
                            px-8 py-10
                            text-center
                            transition-all duration-200
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
                              mt-5 text-base font-bold
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
                              : `Choose one or more data sources in Step 3 to display the live ${
                                  newType === "pie"
                                    ? "pie chart"
                                    : newType === "line"
                                    ? "line chart"
                                    : newType === "area"
                                    ? "area chart"
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

                            dataKeys: isMultiDataWidget
                              ? newDataKeys
                              : undefined,

                            orientation:
                              newType === "bar"
                                ? newOrientation
                                : undefined,

                            chartDisplay:
                              ["line", "area", "bar"].includes(
                                newType
                              )
                                ? { ...newChartDisplay }
                                : undefined,

                            historyWindow:
                              ["line", "area"].includes(
                                newType
                              )
                                ? newHistoryWindow
                                : undefined,

                            w: newW,
                            h: newH,

                            bigNumberDisplay:
                              newType === "bignumber"
                                ? { ...newBigNumberDisplay }
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
              </div>

              {/* RIGHT SETTINGS / SETUP WIZARD */}
              <div
                className="
                  p-8
                  overflow-y-auto
                  bg-white dark:bg-slate-900
                  flex flex-col
                "
              >
                {/* NUMBERED STEP INDICATOR */}
                <div className="mb-7">
                  <div className="flex items-center justify-between gap-2">
                    {[
                      { number: 1, label: "Widget Type" },
                      { number: 2, label: "Appearance" },
                      { number: 3, label: "Data Source" },
                    ].map((step, index) => {
                      const isCurrent = widgetStep === step.number;
                      const isComplete = widgetStep > step.number;
                      const canReturn = step.number < widgetStep;

                      return (
                        <div
                          key={step.number}
                          className="flex min-w-0 flex-1 items-center"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (canReturn) setWidgetStep(step.number);
                            }}
                            disabled={!canReturn && !isCurrent}
                            className={`
                              flex min-w-0 items-center gap-2 text-left transition
                              ${
                                canReturn || isCurrent
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed"
                              }
                            `}
                          >
                            <span
                              className={`
                                flex h-7 w-7 shrink-0 items-center justify-center
                                rounded-full text-xs font-bold transition
                                ${
                                  isCurrent
                                    ? "bg-emerald-600 text-white shadow"
                                    : isComplete
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : "bg-gray-200 text-gray-500 dark:text-slate-300 dark:bg-gray-800 dark:text-gray-400 dark:text-slate-400"
                                }
                              `}
                            >
                              {isComplete ? (
                                <Check size={15} strokeWidth={3} />
                              ) : (
                                step.number
                              )}
                            </span>

                            <span
                              className={`
                                hidden text-[11px] font-semibold sm:block whitespace-nowrap
                                ${
                                  isCurrent
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : isComplete
                                    ? "text-slate-600 dark:text-slate-300"
                                    : "text-gray-400 dark:text-slate-400"
                                }
                              `}
                            >
                              {step.label}
                            </span>
                          </button>

                          {index < 2 && (
                            <div
                              className={`
                                mx-2 h-px flex-1 transition
                                ${
                                  widgetStep > step.number
                                    ? "bg-emerald-400"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }
                              `}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 1: WIDGET TYPE */}
                {widgetStep === 1 && (
                  <>
                    <div
                      className="
                        bg-gray-50 dark:bg-slate-950
                        border border-gray-200 dark:border-slate-700
                        rounded-3xl
                        p-5
                      "
                    >
                      <div className="mb-5">
                        <h3 className="font-bold dark:text-white">
                          1. Choose Widget Type
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">
                          Select how this data should be displayed.
                        </p>
                      </div>

                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-500 dark:text-slate-300">
                          Built-in widgets and your custom widget presets are shown below.
                        </p>

                        <button
                          type="button"
                          onClick={() => setShowCustomWidgetModal(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          <Plus size={15} />
                          Add Widget Type
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
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
                                min-h-28
                                p-4 rounded-2xl border transition-all text-center

                                ${
                                  selected
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]"
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
                                      ? "text-white hover:bg-white/15"
                                      : "text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                                  }`}
                                  title="Delete custom widget type"
                                >
                                  <X size={14} />
                                </span>
                              )}

                              <Icon className="mx-auto mb-2 w-6 h-6" />

                              <div className="text-sm font-semibold">
                                {w.label}
                              </div>

                              <div
                                className={`
                                  text-[10px] mt-1 leading-tight
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
                                  : w.type === "area"
                                  ? "Filled trend chart"
                                  : w.type === "image"
                                  ? "Mimic diagram"
                                  : w.type === "bar"
                                  ? "Bar comparison"
                                  : w.type === "bignumber"
                                  ? "KPI number"
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

                    <div className="mt-auto pt-6 flex justify-end">
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

                {/* STEP 2: APPEARANCE AND SIZE */}
                {widgetStep === 2 && (
                  <>
                    <div className="space-y-5">
                      <div
                        className="
                          bg-gray-50 dark:bg-slate-950
                          border border-gray-200 dark:border-slate-700
                          rounded-3xl
                          p-5
                        "
                      >
                        <h3 className="font-bold mb-4 dark:text-white">
                          2. Configure Appearance
                        </h3>

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
                            rounded-3xl border
                            border-gray-200 bg-gray-50
                            p-5
                            dark:border-slate-700
                            dark:bg-slate-950
                          "
                        >
                          <div className="mb-5 flex items-start gap-3">
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

                          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                          <div className="mt-5">
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
                              mt-5 rounded-2xl
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
                            rounded-3xl border
                            border-gray-200 bg-gray-50
                            p-5
                            dark:border-slate-700
                            dark:bg-slate-950
                          "
                        >
                          <div className="mb-5">
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
                          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                              mt-5 flex items-center
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
                            <div className="mt-5 space-y-5">
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
                                mt-5 rounded-2xl border
                                border-cyan-200 bg-cyan-50/60
                                p-4
                                dark:border-cyan-500/25
                                dark:bg-cyan-500/[0.05]
                              "
                            >
                              <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Machine Status
                                </h4>
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                  Combine the primary numeric stat with a status field or derive status from warning/danger thresholds.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Status Source
                                  </label>
                                  <select
                                    value={
                                      newBigNumberDisplay.statusSource ||
                                      "mapping"
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          statusSource:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 text-gray-900
                                      outline-none focus:ring-2
                                      focus:ring-cyan-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="mapping">
                                      Value Mapping
                                    </option>
                                    <option value="threshold">
                                      Warning / Danger Threshold
                                    </option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Status Data Field
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
                                          statusDataKey:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    disabled={
                                      newBigNumberDisplay.statusSource ===
                                      "threshold"
                                    }
                                    className="
                                      w-full rounded-2xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 text-gray-900
                                      outline-none focus:ring-2
                                      focus:ring-cyan-500
                                      disabled:cursor-not-allowed
                                      disabled:opacity-50
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="">
                                      Use primary value
                                    </option>
                                    {allDataOptions.map(
                                      (option) => (
                                        <option
                                          key={
                                            option.key
                                          }
                                          value={
                                            option.key
                                          }
                                        >
                                          {
                                            option.label
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>

                                <div>
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
                                      focus:ring-cyan-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <label
                                  className="
                                    flex items-center gap-3
                                    rounded-2xl border
                                    border-gray-200 bg-white
                                    px-4 py-3
                                    dark:border-slate-700
                                    dark:bg-slate-900
                                  "
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      newBigNumberDisplay.showProgress !==
                                      false
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          showProgress:
                                            event.target.checked,
                                        })
                                      )
                                    }
                                  />
                                  <span className="text-sm font-semibold text-gray-700 dark:text-white">
                                    Show range progress
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* VALUE MAPPING MODE */}
                          {["valueMapping", "combined"].includes(
                            newBigNumberDisplay.mode
                          ) && (
                            <div className="mt-5 space-y-4">
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
                            rounded-3xl
                            p-5
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
                          rounded-3xl
                          p-5
                        "
                      >
                        <div className="mb-4 flex flex-col gap-1">
                          <h3 className="font-bold dark:text-white">
                            Widget Size
                          </h3>

                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            Choose a preset size or enter custom grid dimensions. Drag-resize on the canvas updates the same width and height values.
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
                            mt-5
                            rounded-3xl
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

                      <div
                        className="
                          rounded-3xl
                          border border-emerald-200 dark:border-emerald-900
                          bg-emerald-50 dark:bg-emerald-900/15
                          p-4
                        "
                      >
                        <p className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                          Ready to {isEdit ? "update" : "add"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-white">
                          {newLabel.trim() || getFallbackWidgetLabel(newType, isMultiDataWidget ? newDataKeys[0] || newDataKey : newDataKey)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {newW}×{newH} · {newType === "sankey" ? `${getConfiguredSankeyOutputs().length} configured output(s)` : isMultiDataWidget ? `${newDataKeys.length} data source(s)` : newDataKey || "No data source"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setWidgetStep(1)}
                          className="
                            rounded-2xl
                            border border-gray-300 dark:border-slate-600
                            bg-white dark:bg-slate-900
                            dark:text-white
                            px-5 py-3
                            font-semibold
                            hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-700
                            transition
                          "
                        >
                          Back
                        </button>

                        <button
                          type="button"
                          onClick={goToNextWidgetStep}
                          className="
                            flex-1
                            bg-emerald-600 hover:bg-emerald-700
                            text-white
                            py-3
                            rounded-2xl
                            font-semibold
                            shadow-lg
                            transition-all
                          "
                        >
                          Next: Data Source
                        </button>
                      </div>

                    </div>
                  </>
                )}
                {/* STEP 3: DATA / IMAGE CONFIG */}
                {widgetStep === 3 && (
                  <>
                    {newType === "image" ? (
                      <div
                        className="
                          rounded-3xl border p-5
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
                          3. Configure Image Widget
                        </h3>

                        <p
                          className="mb-5 text-sm leading-5"
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
                            mb-5 rounded-2xl border
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
                          rounded-3xl
                          p-5
                        "
                      >
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <div>
                            <h3 className="font-bold dark:text-white">
                              3. Choose Data Source
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">
                              Choose the dashboard value this widget should display.
                            </p>
                          </div>

                          {isMultiDataWidget && (
                            <span className="text-xs text-gray-400 dark:text-slate-400 whitespace-nowrap">
                              Select multiple
                            </span>
                          )}
                        </div>

                        {isDataSourceRequired ? (
                          <div className="flex flex-wrap gap-3">
                            {availableDataOptions
                              .map((d) => {
                                const selected = isMultiDataWidget
                                  ? newDataKeys.includes(d.key)
                                  : newDataKey === d.key;

                                return (
                                  <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => {
                                      if (isMultiDataWidget) {
                                        toggleMultiDataKey(d.key);
                                      } else {
                                        setNewDataKey(d.key);
                                      }
                                    }}
                                    className={`
                                      group/source relative
                                      px-4 py-3 rounded-2xl text-sm font-medium transition-all border
                                      ${
                                        selected
                                          ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                          : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-emerald-400 dark:text-white"
                                      }
                                    `}
                                  >
                                    <span className={d.isCustom ? "pr-5 inline-block" : ""}>
                                      {d.label}
                                    </span>

                                    {d.isCustom && (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          deleteCustomDataSource(d.key);
                                        }}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.stopPropagation();
                                            deleteCustomDataSource(d.key);
                                          }
                                        }}
                                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 transition ${
                                          selected
                                            ? "text-white hover:bg-white/15"
                                            : "text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                                        }`}
                                        title="Delete custom data source"
                                      >
                                        <X size={14} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 p-5 text-sm text-gray-500 dark:text-slate-300">
                            This widget does not require a direct data source.
                          </div>
                        )}

                        <div className="mt-5 rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                                Need another data source?
                              </h4>
                              <p className="mt-1 text-xs text-gray-500 dark:text-slate-300">
                                Create an optional friendly dashboard alias for an available Influx field.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowCustomDataModal(true)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <Plus size={16} />
                              Add Data Source
                            </button>
                          </div>
                        </div>

                        {["line", "area", "bar"].includes(
                          newType
                        ) && (
                          <div
                            className="
                              mt-5 rounded-3xl border
                              border-cyan-200/80
                              bg-gradient-to-br
                              from-cyan-50/70 via-white
                              to-blue-50/60 p-5
                              dark:border-cyan-500/20
                              dark:from-cyan-950/20
                              dark:via-slate-950
                              dark:to-blue-950/20
                            "
                          >
                            <div className="mb-5">
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                Chart Display
                              </h3>
                              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                Configure axes, grid, time labels and chart density. The chart automatically simplifies itself when the widget becomes small.
                              </p>
                            </div>

                            {["line", "area"].includes(
                              newType
                            ) && (
                              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                  <option value="range">
                                    Use widget range
                                  </option>
                                  <option value="auto">
                                    Auto fit data
                                  </option>
                                  <option value="custom">
                                    Custom axis
                                  </option>
                                </select>
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

                            {["line", "area"].includes(
                              newType
                            ) && (
                              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Curve
                                  </label>
                                  <select
                                    value={
                                      newChartDisplay.curveType
                                    }
                                    onChange={(event) =>
                                      setNewChartDisplay(
                                        (previous) => ({
                                          ...previous,
                                          curveType:
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
                                    <option value="monotone">Smooth</option>
                                    <option value="linear">Linear</option>
                                    <option value="stepAfter">Step</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Line Thickness
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="6"
                                    step="0.5"
                                    value={
                                      newChartDisplay.strokeWidth
                                    }
                                    onChange={(event) =>
                                      setNewChartDisplay(
                                        (previous) => ({
                                          ...previous,
                                          strokeWidth:
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
                          </div>
                        )}

                        {supportsRangeConfiguration(
      newType,
      newBigNumberDisplay.mode
    ) &&
                          hasSelectedDataSource && (
                            <div className="mt-5 rounded-3xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h3 className="font-bold dark:text-white">
                                    Data Range and Thresholds
                                  </h3>

                                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Configure the unit, range, and thresholds for this widget. These values are stored in the template.
                                  </p>
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
                              mt-5 rounded-3xl border p-5
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


                        {(isMultiDataWidget || newType === "sankey") && (
                          <p className="text-xs text-gray-400 dark:text-slate-400 mt-4">
                            Selected: {newType === "sankey"
                              ? getSankeyOutputSummary()
                              : newDataKeys.length
                              ? newDataKeys.map(getDataSourceLabel).join(", ")
                              : "None"}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-6 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setWidgetStep(2)}
                            className="
                              inline-flex items-center justify-center
                              rounded-2xl
                              border border-gray-300 dark:border-slate-600
                              bg-white dark:bg-slate-900
                              px-5 py-3
                              text-sm font-semibold text-gray-700 dark:text-slate-100
                              transition-all duration-200
                              hover:-translate-y-0.5 hover:bg-gray-50 dark:hover:bg-slate-800
                            "
                          >
                            Back
                          </button>

                          {isEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Delete this widget from the template?")) {
                                  removeWidget(selectedItem.id);
                                }
                              }}
                              className="
                                inline-flex items-center justify-center gap-2
                                rounded-2xl
                                border border-red-200 dark:border-red-500/30
                                bg-red-50 dark:bg-red-500/10
                                px-4 py-3
                                text-sm font-semibold text-red-600 dark:text-red-300
                                transition-all duration-200
                                hover:-translate-y-0.5 hover:bg-red-100 dark:hover:bg-red-500/20
                              "
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={isEdit ? updateWidget : addWidget}
                          className="
                            inline-flex min-w-[180px] items-center justify-center gap-2
                            rounded-2xl
                            bg-emerald-600 px-6 py-3.5
                            text-sm font-semibold text-white
                            shadow-lg shadow-emerald-600/20
                            transition-all duration-200
                            hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30
                            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
                          "
                        >
                          <Save size={16} />
                          {isEdit ? "Save Changes" : "Add Widget"}
                        </button>
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
            className="w-[min(680px,96vw)] max-h-[90vh] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
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

      {showCustomDataModal && (
        <div
          className="
            fixed inset-0 z-[70]
            flex items-center justify-center
            bg-black/65 p-6
            backdrop-blur-sm
          "
          onClick={() =>
            setShowCustomDataModal(false)
          }
        >
          <div
            className="
              flex max-h-[92vh]
              w-[min(980px,96vw)]
              flex-col overflow-hidden
              rounded-3xl border
              border-slate-200 bg-white
              shadow-2xl
              dark:border-slate-700
              dark:bg-slate-900
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
                px-7 py-6
                dark:border-slate-700
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex h-11 w-11
                    shrink-0 items-center
                    justify-center rounded-2xl
                    bg-blue-100 text-blue-600
                    dark:bg-blue-500/15
                    dark:text-blue-300
                  "
                >
                  <Database size={21} />
                </div>

                <div>
                  <h3
                    className="
                      text-xl font-bold
                      text-slate-900
                      dark:text-white
                    "
                  >
                    Add Custom Data Source
                  </h3>

                  <p
                    className="
                      mt-1 text-sm
                      text-slate-500
                      dark:text-slate-300
                    "
                  >
                    Choose a real Influx source, then define how it should appear in the dashboard.
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
            <div className="min-h-0 flex-1 overflow-y-auto p-7">
              <div className="space-y-5">
                {/* SOURCE FORM */}
                <div
                  className="
                    rounded-3xl border
                    border-slate-200 bg-white
                    p-5 shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-900
                  "
                >
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4
                        className="
                          text-sm font-black
                          text-slate-900
                          dark:text-white
                        "
                      >
                        Influx Source
                      </h4>

                      <p
                        className="
                          mt-1 text-xs
                          text-slate-500
                          dark:text-slate-400
                        "
                      >
                        Select a bucket, measurement, device ID, and channel.
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
                      Refresh metadata
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Bucket
                      </span>

                      <select
                        value={influxConfig.bucket}
                        disabled={
                          isOrganizationAdmin ||
                          influxLoading
                        }
                        onChange={(event) =>
                          setInfluxConfig((current) => ({
                            ...current,
                            bucket: event.target.value,
                            measurement: "",
                            id: "",
                            tagValue: "",
                          }))
                        }
                        className="
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-4 py-3
                          font-mono text-sm
                          text-slate-900 outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          disabled:cursor-not-allowed
                          disabled:opacity-70
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      >
                        <option value="">
                          Select available bucket
                        </option>

                        {influxBuckets.map((bucket) => (
                          <option
                            key={bucket}
                            value={bucket}
                          >
                            {bucket}
                          </option>
                        ))}

                        {influxConfig.bucket &&
                          !influxBuckets.includes(
                            influxConfig.bucket
                          ) && (
                            <option
                              value={influxConfig.bucket}
                            >
                              {influxConfig.bucket}
                            </option>
                          )}
                      </select>
                    </label>

                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Measurement
                      </span>

                      <select
                        value={influxConfig.measurement}
                        disabled={
                          isOrganizationAdmin ||
                          influxLoading ||
                          !influxConfig.bucket
                        }
                        onChange={(event) =>
                          setInfluxConfig((current) => ({
                            ...current,
                            measurement:
                              event.target.value,
                            id: "",
                            tagValue: "",
                          }))
                        }
                        className="
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-4 py-3
                          font-mono text-sm
                          text-slate-900 outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          disabled:cursor-not-allowed
                          disabled:opacity-70
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      >
                        <option value="">
                          Select available measurement
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

                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Device ID
                      </span>

                      <select
                        value={
                          influxConfig.tagValue ||
                          influxConfig.id
                        }
                        disabled={
                          isOrganizationAdmin ||
                          influxLoading ||
                          !influxConfig.measurement
                        }
                        onChange={(event) =>
                          setInfluxConfig((current) => ({
                            ...current,
                            id: event.target.value,
                            tagValue:
                              event.target.value,
                          }))
                        }
                        className="
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-4 py-3
                          font-mono text-sm
                          text-slate-900 outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          disabled:cursor-not-allowed
                          disabled:opacity-70
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      >
                        <option value="">
                          Select available device ID
                        </option>

                        {influxIds.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span
                        className="
                          text-xs font-semibold
                          text-slate-500
                          dark:text-slate-300
                        "
                      >
                        Influx Channel
                      </span>

                      <select
                        value={customDataDraft.channel}
                        disabled={
                          influxLoading ||
                          !influxConfig.measurement
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
                          mt-2 w-full rounded-2xl
                          border border-slate-300
                          bg-white px-4 py-3
                          font-mono text-sm
                          text-slate-900 outline-none
                          focus:ring-2
                          focus:ring-blue-500
                          disabled:cursor-not-allowed
                          disabled:opacity-70
                          dark:border-slate-600
                          dark:bg-slate-950
                          dark:text-white
                        "
                      >
                        <option value="">
                          Select available channel
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

                  <div
                    className="
                      mt-5 rounded-2xl
                      border border-blue-100
                      bg-blue-50 px-4 py-3
                      text-xs text-blue-700
                      dark:border-blue-900/70
                      dark:bg-blue-950/35
                      dark:text-blue-200
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

                {/* METADATA BROWSER */}
                <div
                  className="
                    rounded-3xl border
                    border-slate-200 bg-white
                    p-5 shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-900
                  "
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h4
                        className="
                          text-sm font-black
                          text-slate-900
                          dark:text-white
                        "
                      >
                        Available Influx Sources
                      </h4>

                      <p
                        className="
                          mt-1 text-xs
                          text-slate-500
                          dark:text-slate-400
                        "
                      >
                        Browse the metadata detected in InfluxDB. Selecting an item updates the source fields above.
                      </p>
                    </div>

                    <Database
                      size={18}
                      className="shrink-0 text-blue-500"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfluxMetadataList
                      title="Buckets"
                      values={influxBuckets}
                      activeValue={
                        influxConfig.bucket
                      }
                      emptyText="No buckets found"
                      onSelect={(value) =>
                        setInfluxConfig(
                          (current) => ({
                            ...current,
                            bucket: value,
                            measurement: "",
                            id: "",
                            tagValue: "",
                          })
                        )
                      }
                    />

                    <InfluxMetadataList
                      title="Measurements"
                      values={influxMeasurements}
                      activeValue={
                        influxConfig.measurement
                      }
                      emptyText={
                        influxConfig.bucket
                          ? "No measurements found"
                          : "Select a bucket first"
                      }
                      onSelect={(value) =>
                        setInfluxConfig(
                          (current) => ({
                            ...current,
                            measurement: value,
                            id: "",
                            tagValue: "",
                          })
                        )
                      }
                    />

                    <InfluxMetadataList
                      title="Device IDs"
                      values={influxIds}
                      activeValue={
                        influxConfig.tagValue ||
                        influxConfig.id
                      }
                      emptyText={
                        influxConfig.measurement
                          ? "No device IDs found"
                          : "Select a measurement first"
                      }
                      onSelect={(value) =>
                        setInfluxConfig(
                          (current) => ({
                            ...current,
                            id: value,
                            tagValue: value,
                          })
                        )
                      }
                    />

                    <InfluxMetadataList
                      title="Channels"
                      values={influxChannels}
                      activeValue={
                        customDataDraft.channel
                      }
                      emptyText={
                        influxConfig.measurement
                          ? "No channels found"
                          : "Select a measurement first"
                      }
                      onSelect={(value) =>
                        setCustomDataDraft(
                          (current) => ({
                            ...current,
                            channel: value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                {/* DASHBOARD SETTINGS */}
                <div
                  className="
                    rounded-3xl border
                    border-slate-200 bg-white
                    p-5 shadow-sm
                    dark:border-slate-700
                    dark:bg-slate-900
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
                      Dashboard Data Source
                    </h4>

                    <p
                      className="
                        mt-1 text-xs
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Give the selected Influx channel a readable dashboard name and optional unit.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                          bg-white px-4 py-3
                          text-sm text-slate-900
                          outline-none
                          focus:ring-2
                          focus:ring-blue-500
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
                          bg-white px-4 py-3
                          text-sm text-slate-900
                          outline-none
                          focus:ring-2
                          focus:ring-blue-500
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
                          bg-white px-4 py-3
                          text-sm text-slate-900
                          outline-none
                          focus:ring-2
                          focus:ring-blue-500
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
                      After saving, this source appears in widget selection and template channel mapping.
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
                bg-slate-50/70 px-7 py-5
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
                  rounded-2xl bg-blue-600
                  px-5 py-3 text-sm
                  font-semibold text-white
                  shadow-lg shadow-blue-600/20
                  transition hover:bg-blue-700
                "
              >
                <Plus size={17} />
                Add and Select Data Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
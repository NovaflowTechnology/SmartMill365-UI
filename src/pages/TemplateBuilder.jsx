import { useState, useEffect, useRef } from "react";
import { widgetLibrary } from "../data/widgetLibrary";
import { dataOptions } from "../data/dataOptions";
import WidgetRenderer from "../components/WidgetRenderer";

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
  Check,
} from "lucide-react";

const sizeOptions = [
  { label: "1×1", w: 1, h: 1 },
  { label: "2×1", w: 2, h: 1 },
  { label: "1×2", w: 1, h: 2 },
  { label: "2×2", w: 2, h: 2 },
  { label: "3×1", w: 3, h: 1 },
];

// Image diagrams are easier to read in landscape cards.
const imageSizeOptions = [
  { label: "2×1", w: 2, h: 1 },
  { label: "3×1", w: 3, h: 1 },
  { label: "2×2", w: 2, h: 2 },
];

const defaultInfluxConfig = {
  bucket: "Mill",
  measurement: "PBLR",
  tagKey: "id",
  id: "",
  tagValue: "",
};

const defaultChannelMap = {
  steamPressure: "ch1",
  steamFlowrate: "ch2",
  steamOutletTemp: "ch3",
  inletDraft: "ch4",
  outletDraft: "ch5",
  furnaceDraft: "ch6",
  waterInletTemp: "ch8",
  waterFlowrate: "ch9",
  waterDrumLevel: "ch10",
  vgPressure: "ch11",
  vgInletTemp: "ch12",
  vgOutletTemp: "ch13",
};

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

export default function TemplateBuilder({
  setPage,
  editingImageWidget,
  setEditingImageWidget,
}) {
  const gridRef = useRef(null);

  // GRID SIZE
  const [rows] = useState(3);
  const [cols] = useState(4);

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

  // Pins are kept locally while the image widget is still being configured.
  // This prevents a new image draft from being added to the grid too early.
  const [imageDraftPins, setImageDraftPins] = useState([]);

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

  // CURRENT SELECTED ITEM
  const selectedItem = items.find(
    (i) => i.id === activeItemId
  );

  const isEdit = !!selectedItem;

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
  const handleWidgetTypeChange = (type) => {
    setNewType(type);

    if (type === "image" && !isEdit) {
      setNewW(2);
      setNewH(1);
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

      const selectedBucket =
        influxConfig.bucket.trim();

      const selectedMeasurement =
        influxConfig.measurement.trim();

      if (!selectedBucket) {
        setInfluxError("Bucket is required.");
        return;
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

  // LOAD DEFAULT DATAKEY WHEN TYPE CHANGES
  useEffect(() => {
    const widget = widgetLibrary.find(
      (w) => w.type === newType
    );

    const firstKey =
      widget?.supportedData?.[0] || "";

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

  // LOAD SELECTED ITEM SETTINGS
  useEffect(() => {
    if (!selectedItem) return;

    setNewType(selectedItem.type);

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

    setImageDraftPins(
      selectedItem.type === "image" && Array.isArray(selectedItem.pins)
        ? selectedItem.pins
        : []
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

  // ADD WIDGET
  const addWidget = () => {
    if (!activeCell) return;

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

    const newItem = {
      id: Date.now(),

      type: newType,

      label:
        newLabel.trim() ||
        getDefaultWidgetLabel(newType),

      dataKey: isMultiDataWidget
        ? newDataKeys[0] || newDataKey
        : newDataKey,

      dataKeys: isMultiDataWidget
        ? newDataKeys
        : undefined,

      orientation:
        newType === "bar"
          ? newOrientation
          : undefined,

      x: activeCell.col,
      y: activeCell.row,

      w: newW,
      h: newH,

      pins:
        newType === "image"
          ? imageDraftPins
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
  };

  // UPDATE WIDGET
  const updateWidget = () => {
    if (!selectedItem) return;

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

    const updatedItems = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,

            type: newType,

            label:
              newLabel.trim() ||
              getDefaultWidgetLabel(newType),

            dataKey: isMultiDataWidget
              ? newDataKeys[0] || newDataKey
              : newDataKey,

            dataKeys: isMultiDataWidget
              ? newDataKeys
              : undefined,

            orientation:
              newType === "bar"
                ? newOrientation
                : undefined,

            w: newW,
            h: newH,

            pins:
              newType === "image"
                ? imageDraftPins
                : selectedItem.pins || [],
          }
        : item
    );

    setItems(updatedItems);

    setShowModal(false);
    setActiveItemId(null);
    setNewLabel("");
    setImageDraftPins([]);
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
  };

  // CREATE TEMPLATE
  const saveTemplate = async () => {
    const token =
      localStorage.getItem("token");

    if (
      canConfigureInflux &&
      (!influxConfig.bucket.trim() ||
        !influxConfig.measurement.trim() ||
        !influxConfig.id)
    ) {
      setShowInfluxMapping(true);

      showToast(
        "error",
        "Configure the Influx bucket, measurement, and device ID before creating this template."
      );

      return;
    }

    try {
      const res = await fetch(
        "http://localhost:5000/templates",
        {
          method: "POST",

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
                id: influxConfig.id,
              },

              channelMap,

              items,
            },
          }),
        }
      );

      const text = await res.text();

      console.log(
        "✅ SERVER RESPONSE:",
        text
      );

      if (!res.ok) {
        throw new Error(text);
      }

      setToast({
        type: "success",
        message: "Template created successfully.",
      });

      setTimeout(() => {
        setPage("templates");
      }, 900);
    } catch (err) {
      console.error("❌ SAVE ERROR:", err);

      showToast("error", "Failed to create the template. Please try again.");
    }
  };

  // BASE PREVIEW
  const base = isEdit
    ? selectedItem
    : activeCell
    ? {
        type: newType,

        label:
          newLabel.trim() ||
          getDefaultWidgetLabel(newType),

        dataKey: isMultiDataWidget
          ? newDataKeys[0] || newDataKey
          : newDataKey,

        dataKeys: isMultiDataWidget
          ? newDataKeys
          : undefined,

        orientation:
          newType === "bar"
            ? newOrientation
            : undefined,

        w: newW,
        h: newH,
      }
    : null;

  const currentWidget = widgetLibrary.find(
    (w) => w.type === base?.type
  );

  const isDataSourceRequired =
    newType !== "image" &&
    (currentWidget?.supportedData?.length || 0) > 0;

  const hasSelectedDataSource = isMultiDataWidget
    ? newDataKeys.length > 0
    : Boolean(newDataKey);

  const goToNextWidgetStep = () => {
    if (
      widgetStep === 2 &&
      isDataSourceRequired &&
      !hasSelectedDataSource
    ) {
      showToast("error", "Please select a data source before continuing.");
      return;
    }

    setWidgetStep((step) => Math.min(step + 1, 3));
  };

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
              Template Builder
            </h1>

            <p className="text-gray-500 dark:text-slate-300 mt-1">
              Design industrial dashboard layouts. Drag widgets to reposition them.
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
            Create Template
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

        {/* INFLUX DATA MAPPING */}
        {canConfigureInflux && (
          <div
            className="
              mt-5
              rounded-3xl
              border border-gray-200 dark:border-slate-700
              bg-gray-50 dark:bg-slate-950/80 dark:bg-gray-800/60
              overflow-hidden
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
                w-full
                flex items-center
                justify-between
                gap-4
                p-5
                text-left
                hover:bg-gray-100 dark:bg-[#050a1e]/70
                dark:hover:bg-gray-800
                transition
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
                    Configure the device ID and map dashboard values to Influx channels.
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
                    {dataOptions.map((option) => (
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
            draggable
            onDragStart={(e) => {
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
                      value={previewData[item.dataKey]}
                      data={previewData}
                      history={previewHistory}
                      dataKey={item.dataKey}
                      item={item}
                      updateItem={() => {}}
                      editMode={false}
                    />
                  </div>
                </div>
              ) : (
                <WidgetRenderer
                  type={item.type}
                  value={previewData[item.dataKey]}
                  data={previewData}
                  history={previewHistory}
                  dataKey={item.dataKey}
                  item={item}
                  updateItem={() => {}}
                  editMode={false}
                />
              )}
            </div>

            {/* EDIT ICON */}
            <div
              className="
                absolute bottom-3 right-3
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
                  Configure widget type, data source, size and appearance
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
                      <WidgetRenderer
                        type={newType}
                        value={previewData[newDataKey]}
                        data={previewData}
                        history={previewHistory}
                        dataKey={
                          isMultiDataWidget
                            ? newDataKeys[0] ||
                              newDataKey
                            : newDataKey
                        }
                        item={{
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

                          w: newW,
                          h: newH,

                          pins:
                            newType === "image"
                              ? imageDraftPins
                              : selectedItem?.pins ||
                                base?.pins ||
                                [],
                        }}
                        updateItem={() => {}}
                        editMode={false}
                      />
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
                      { number: 2, label: "Data Source" },
                      { number: 3, label: "Appearance" },
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

                      <div className="grid grid-cols-3 gap-3">
                        {widgetLibrary.map((w) => {
                          const Icon = w.icon;

                          return (
                            <button
                              key={w.type}
                              type="button"
                              onClick={() => handleWidgetTypeChange(w.type)}
                              className={`
                                min-h-28
                                p-4 rounded-2xl border transition-all text-center

                                ${
                                  newType === w.type
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]"
                                    : "bg-white dark:bg-slate-900 hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800 border-gray-200 dark:border-slate-700 dark:text-white"
                                }
                              `}
                            >
                              <Icon className="mx-auto mb-2 w-6 h-6" />

                              <div className="text-sm font-semibold">
                                {w.label}
                              </div>

                              <div
                                className={`
                                  text-[10px] mt-1 leading-tight
                                  ${
                                    newType === w.type
                                      ? "text-emerald-50"
                                      : "text-gray-400 dark:text-slate-400"
                                  }
                                `}
                              >
                                {w.type === "gauge" && "Semi-circle meter"}
                                {w.type === "linearGauge" && "Progress meter"}
                                {w.type === "line" && "Trend over time"}
                                {w.type === "area" && "Filled trend chart"}
                                {w.type === "image" && "Mimic diagram"}
                                {w.type === "bar" && "Bar comparison"}
                                {w.type === "bignumber" && "KPI number"}
                                {w.type === "alarm" && "Status warning"}
                                {w.type === "pie" && "Ratio chart"}
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
                        Next: Data Source
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 2: DATA / IMAGE CONFIG */}
                {widgetStep === 2 && (
                  <>
                    {newType === "image" ? (
                      <div
                        className="
                          bg-purple-50 dark:bg-purple-900/20
                          border border-purple-200 dark:border-purple-800
                          rounded-3xl
                          p-5
                        "
                      >
                        <h3 className="font-bold mb-2 dark:text-white">
                          2. Configure Image Widget
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-slate-300 mb-5">
                          Open the image editor to place pins and connect live data.
                        </p>

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
                                  pins: [],
                                };

                            setEditingImageWidget({
                              ...target,
                              pins: imageDraftPins,
                              returnPage: "builder",
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
                            bg-purple-600 hover:bg-purple-700
                            text-white
                            py-4
                            rounded-2xl
                            font-semibold
                            transition-all
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
                              2. Choose Data Source
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
                            {dataOptions
                              .filter((d) =>
                                currentWidget.supportedData.includes(d.key)
                              )
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
                                      px-4 py-3 rounded-2xl text-sm font-medium transition-all border
                                      ${
                                        selected
                                          ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                          : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-emerald-400 dark:text-white"
                                      }
                                    `}
                                  >
                                    {d.label}
                                  </button>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 p-5 text-sm text-gray-500 dark:text-slate-300">
                            This widget does not require a direct data source.
                          </div>
                        )}

                        {isMultiDataWidget && (
                          <p className="text-xs text-gray-400 dark:text-slate-400 mt-4">
                            Selected: {newDataKeys.length ? newDataKeys.join(", ") : "None"}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-6 flex items-center justify-between gap-3">
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
                          rounded-2xl
                          bg-emerald-600 hover:bg-emerald-700
                          text-white
                          px-6 py-3
                          font-semibold
                          transition
                        "
                      >
                        Next: Configure
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 3: LABEL, APPEARANCE AND SAVE */}
                {widgetStep === 3 && (
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
                          3. Configure Appearance
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
                        <h3 className="font-bold mb-4 dark:text-white">
                          Widget Size
                        </h3>

                        <div className="grid grid-cols-3 gap-3">
                          {(newType === "image" ? imageSizeOptions : sizeOptions).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setNewW(s.w);
                                setNewH(s.h);
                              }}
                              className={`
                                py-4 rounded-2xl border transition-all font-medium
                                ${
                                  newW === s.w && newH === s.h
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                    : "bg-white dark:bg-slate-900 hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800 border-gray-200 dark:border-slate-700 dark:text-white"
                                }
                              `}
                            >
                              {s.label}
                            </button>
                          ))}
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
                          {newLabel.trim() || getDefaultWidgetLabel(newType)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {newW}×{newH} · {isMultiDataWidget ? `${newDataKeys.length} data source(s)` : newDataKey || "No data source"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setWidgetStep(2)}
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
                          onClick={isEdit ? updateWidget : addWidget}
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
                          {isEdit ? "Update Widget" : "Add Widget"}
                        </button>
                      </div>

                      {isEdit && (
                        <button
                          type="button"
                          onClick={() => removeWidget(selectedItem.id)}
                          className="
                            w-full
                            bg-red-500 hover:bg-red-600
                            text-white
                            py-3
                            rounded-2xl
                            font-semibold
                            flex items-center justify-center gap-2
                            transition-all
                          "
                        >
                          <Trash2 size={18} />
                          Delete Widget
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
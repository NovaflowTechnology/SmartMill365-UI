import { useState, useEffect } from "react";
import { widgetLibrary } from "../data/widgetLibrary";
import { dataOptions } from "../data/dataOptions";
import WidgetRenderer from "../components/WidgetRenderer";

import {
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
} from "lucide-react";

const sizeOptions = [
  { label: "1×1", w: 1, h: 1 },
  { label: "2×1", w: 2, h: 1 },
  { label: "1×2", w: 1, h: 2 },
  { label: "2×2", w: 2, h: 2 },
  { label: "3×1", w: 3, h: 1 },
];

// Keep image widgets in a consistent landscape shape everywhere.
const imageSizeOptions = [
  { label: "2×1", w: 2, h: 1 },
  { label: "3×1", w: 3, h: 1 },
  { label: "2×2", w: 2, h: 2 },
];

const imageWidgetViewportClass =
  "relative h-full w-full min-h-0 min-w-0 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-950";


const defaultInfluxConfig = {
  bucket: "",
  measurement: "",
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

// SAMPLE DATA FOR EDITOR PREVIEW
const previewData = {
  steamPressure: 31.2,
  steamFlowrate: 44.1,
  steamOutletTemp: 0,
  inletDraft: -36.6,
  outletDraft: 999.9,
  furnaceDraft: -4.3,
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
    inletDraft: -38 + Math.random() * 4,
    outletDraft: 960 + Math.random() * 40,
    furnaceDraft: -6 + Math.random() * 4,
    waterInletTemp: 98 + Math.random() * 8,
    waterFlowrate: 30 + Math.random() * 6,
    waterDrumLevel: 48 + Math.random() * 6,
    vgPressure: 960 + Math.random() * 40,
    vgInletTemp: Math.random() * 5,
    vgOutletTemp: Math.random() * 5,
  })
);

export default function TemplateEditor({
  setPage,
  selectedTemplate,
  editingImageWidget,
  setEditingImageWidget,
}) {
  // GRID SIZE
  const [rows] = useState(3);
  const [cols] = useState(4);

  // STATES
  const [items, setItems] = useState([]);
  const [templateName, setTemplateName] =
    useState("");

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

  const [newLabel, setNewLabel] =
    useState("");

  const [newDataKey, setNewDataKey] =
    useState("");

  const [newDataKeys, setNewDataKeys] =
    useState([]);

  const [
    newOrientation,
    setNewOrientation,
  ] = useState("vertical");

  const [newW, setNewW] = useState(1);
  const [newH, setNewH] = useState(1);


  // =====================================
  // INFLUX TEMPLATE DATA MAPPING
  // =====================================
  const role = localStorage.getItem("role");
  const isSuperadmin = role === "superadmin";
  const isOrganizationAdmin = role === "admin";
  const canConfigureInflux =
    isSuperadmin || isOrganizationAdmin;

  const [showInfluxMapping, setShowInfluxMapping] =
    useState(false);

  const [influxConfig, setInfluxConfig] =
    useState(defaultInfluxConfig);

  const [channelMap, setChannelMap] =
    useState(defaultChannelMap);

  // Organization admins can select only devices assigned by a superadmin.
  const [availableDevices, setAvailableDevices] =
    useState([]);

  const [selectedDeviceId, setSelectedDeviceId] =
    useState("");

  const [influxMeasurements, setInfluxMeasurements] =
    useState([]);

  const [influxIds, setInfluxIds] = useState([]);
  const [influxChannels, setInfluxChannels] =
    useState([]);

  const [influxLoading, setInfluxLoading] =
    useState(false);

  const [influxError, setInfluxError] = useState("");

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
    didDrag,
    setDidDrag,
  ] = useState(false);

  const [dragOverTrash, setDragOverTrash] =
    useState(false);

  // CURRENT ITEM
  const selectedItem = items.find(
    (i) => i.id === activeItemId
  );

  const isEdit = !!selectedItem;

  // MULTI-DATA WIDGETS
  const isMultiDataWidget =
    newType === "line" ||
    newType === "area" ||
    newType === "bar" ||
    newType === "pie";

  const displaySizeOptions =
    newType === "image"
      ? imageSizeOptions
      : sizeOptions;

  const getDefaultWidgetLabel = (type) =>
    `${
      type.charAt(0).toUpperCase() +
      type.slice(1)
    } Widget`;

  const getAuthHeaders = () => ({
    Authorization: localStorage.getItem("token"),
  });

  const fetchAllowedDevices = async () => {
    const res = await fetch(
      "http://localhost:5000/influx/allowed-devices",
      { headers: getAuthHeaders() }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "Failed to load assigned devices"
      );
    }

    return Array.isArray(data) ? data : [];
  };

  const fetchMeasurements = async (selectedBucket) => {
    const bucketName = String(selectedBucket || "").trim();

    if (!bucketName) {
      setInfluxMeasurements([]);
      return;
    }

    const res = await fetch(
      `http://localhost:5000/influx/measurements?bucket=${encodeURIComponent(
        bucketName
      )}`,
      { headers: getAuthHeaders() }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "Failed to load measurements"
      );
    }

    setInfluxMeasurements(data?.measurements || []);
  };

  const fetchChannelsForDevice = async (
    selectedBucket,
    selectedMeasurement,
    tagKey = "id",
    tagValue = ""
  ) => {
    const query = new URLSearchParams({
      bucket: String(selectedBucket || "").trim(),
      measurement: String(selectedMeasurement || "").trim(),
      tagKey: tagKey || "id",
    });

    if (tagValue) {
      query.set("tagValue", tagValue);
    }

    const res = await fetch(
      `http://localhost:5000/influx/channels?${query.toString()}`,
      { headers: getAuthHeaders() }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "Failed to load channels"
      );
    }

    return data?.channels || [];
  };

  const fetchIdsAndChannels = async (
    selectedBucket,
    selectedMeasurement
  ) => {
    const bucketName = String(selectedBucket || "").trim();
    const measurementName = String(
      selectedMeasurement || ""
    ).trim();

    if (!bucketName || !measurementName) {
      setInfluxIds([]);
      setInfluxChannels([]);
      return;
    }

    const query = new URLSearchParams({
      bucket: bucketName,
      measurement: measurementName,
    });

    const [idsRes, channelsRes] = await Promise.all([
      fetch(
        `http://localhost:5000/influx/ids?${query.toString()}`,
        { headers: getAuthHeaders() }
      ),
      fetch(
        `http://localhost:5000/influx/channels?${query.toString()}`,
        { headers: getAuthHeaders() }
      ),
    ]);

    const idsData = await idsRes.json();
    const channelsData = await channelsRes.json();

    if (!idsRes.ok) {
      throw new Error(
        idsData?.error || "Failed to load device IDs"
      );
    }

    if (!channelsRes.ok) {
      throw new Error(
        channelsData?.error || "Failed to load channels"
      );
    }

    setInfluxIds(idsData?.ids || []);
    setInfluxChannels(channelsData?.channels || []);
  };

  const applySelectedDevice = (
    deviceId,
    devices = availableDevices
  ) => {
    const device = devices.find(
      (entry) => String(entry.id) === String(deviceId)
    );

    if (!device) return;

    const tagValue = device.tag_value || "";

    setSelectedDeviceId(String(device.id));
    setInfluxConfig({
      bucket: device.bucket_name || "",
      measurement: device.measurement_name || "",
      tagKey: device.tag_key || "id",
      id: tagValue,
      tagValue,
    });
    setInfluxMeasurements(
      [device.measurement_name].filter(Boolean)
    );
    setInfluxIds([tagValue].filter(Boolean));
    setInfluxChannels([]);
  };

  const refreshInfluxMetadata = async () => {
    if (!canConfigureInflux) return;

    setInfluxLoading(true);
    setInfluxError("");

    try {
      if (isOrganizationAdmin) {
        const devices = await fetchAllowedDevices();

        setAvailableDevices(devices);

        if (!devices.length) {
          setInfluxConfig(defaultInfluxConfig);
          setInfluxMeasurements([]);
          setInfluxIds([]);
          setInfluxChannels([]);
          setInfluxError(
            "No Influx device has been assigned to your organization."
          );
          return;
        }

        const stillSelected = devices.some(
          (device) =>
            String(device.id) === String(selectedDeviceId)
        );

        applySelectedDevice(
          stillSelected ? selectedDeviceId : devices[0].id,
          devices
        );
        return;
      }

      const selectedBucket = influxConfig.bucket.trim();
      const selectedMeasurement =
        influxConfig.measurement.trim();

      await fetchMeasurements(selectedBucket);

      if (selectedMeasurement) {
        await fetchIdsAndChannels(
          selectedBucket,
          selectedMeasurement
        );
      } else {
        setInfluxIds([]);
        setInfluxChannels([]);
      }
    } catch (err) {
      console.error("❌ Influx metadata error:", err);
      setInfluxError(
        err.message || "Failed to load Influx metadata."
      );
    } finally {
      setInfluxLoading(false);
    }
  };

  const updateChannelMapping = (dataKey, channel) => {
    setChannelMap((prev) => ({
      ...prev,
      [dataKey]: channel,
    }));
  };

  // LOAD TEMPLATE
  useEffect(() => {
    if (!selectedTemplate) return;

    try {
      const layout =
        typeof selectedTemplate.layout ===
        "string"
          ? JSON.parse(selectedTemplate.layout)
          : selectedTemplate.layout;

      console.log("📦 EDIT TEMPLATE:", layout);

      setItems(layout?.items || []);
      setTemplateName(
        selectedTemplate.name || ""
      );

      const savedInflux = {
        ...defaultInfluxConfig,
        ...(layout?.influx || {}),
      };

      setInfluxConfig(savedInflux);
      setSelectedDeviceId(
        String(savedInflux.deviceId || "")
      );

      setChannelMap({
        ...defaultChannelMap,
        ...(layout?.channelMap || {}),
      });
    } catch (err) {
      console.error("❌ LOAD ERROR:", err);
    }
  }, [selectedTemplate]);

  // Organization admins receive a server-filtered list of their assigned devices.
  useEffect(() => {
    if (!isOrganizationAdmin) return;

    const loadAssignedDevices = async () => {
      setInfluxLoading(true);
      setInfluxError("");

      try {
        const devices = await fetchAllowedDevices();
        setAvailableDevices(devices);

        if (!devices.length) {
          setInfluxError(
            "No Influx device has been assigned to your organization."
          );
          return;
        }

        let savedInflux = {};

        try {
          const savedLayout =
            typeof selectedTemplate?.layout === "string"
              ? JSON.parse(selectedTemplate.layout)
              : selectedTemplate?.layout || {};

          savedInflux = savedLayout?.influx || {};
        } catch {
          savedInflux = {};
        }

        const savedDevice = devices.find(
          (device) =>
            String(device.id) === String(savedInflux.deviceId || selectedDeviceId) ||
            (
              device.bucket_name === savedInflux.bucket &&
              device.measurement_name === savedInflux.measurement &&
              device.tag_key === (savedInflux.tagKey || "id") &&
              device.tag_value === (
                savedInflux.tagValue || savedInflux.id
              )
            )
        );

        applySelectedDevice(
          savedDevice?.id || devices[0].id,
          devices
        );
      } catch (err) {
        console.error("❌ Assigned device error:", err);
        setAvailableDevices([]);
        setInfluxError(
          err.message || "Failed to load assigned devices."
        );
      } finally {
        setInfluxLoading(false);
      }
    };

    loadAssignedDevices();
  }, [isOrganizationAdmin, selectedTemplate?.id]);

  // Organization admins can load channels only for their selected allowed device.
  useEffect(() => {
    if (
      !isOrganizationAdmin ||
      !influxConfig.bucket ||
      !influxConfig.measurement ||
      !(influxConfig.tagValue || influxConfig.id)
    ) {
      return;
    }

    const loadChannels = async () => {
      setInfluxLoading(true);
      setInfluxError("");

      try {
        const channels = await fetchChannelsForDevice(
          influxConfig.bucket,
          influxConfig.measurement,
          influxConfig.tagKey || "id",
          influxConfig.tagValue || influxConfig.id
        );

        setInfluxChannels(channels);
      } catch (err) {
        console.error("❌ Assigned device channel error:", err);
        setInfluxChannels([]);
        setInfluxError(
          err.message || "Failed to load channels."
        );
      } finally {
        setInfluxLoading(false);
      }
    };

    loadChannels();
  }, [
    isOrganizationAdmin,
    influxConfig.bucket,
    influxConfig.measurement,
    influxConfig.tagKey,
    influxConfig.tagValue,
    influxConfig.id,
  ]);

  // Superadmin can browse all metadata.
  useEffect(() => {
    if (
      !isSuperadmin ||
      !influxConfig.bucket ||
      !influxConfig.measurement
    ) {
      return;
    }

    refreshInfluxMetadata();
  }, [
    isSuperadmin,
    influxConfig.bucket,
    influxConfig.measurement,
  ]);

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
      setNewDataKey(firstKey);
      setNewDataKeys(firstKey ? [firstKey] : []);
    } else {
      setNewDataKey(firstKey);
      setNewDataKeys([]);
    }

    if (newType !== "bar") {
      setNewOrientation("vertical");
    }
  }, [newType]);

  // SYNC IMAGE EDITOR BACK INTO EDITOR
  useEffect(() => {
    if (!editingImageWidget) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === editingImageWidget.id
          ? editingImageWidget
          : it
      )
    );
  }, [editingImageWidget]);

  // LOAD ITEM SETTINGS
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
  }, [activeItemId, selectedItem]);

  // CHECK OCCUPIED
  const isCellOccupied = (row, col) =>
    items.some(
      (item) =>
        col >= item.x &&
        col < item.x + item.w &&
        row >= item.y &&
        row < item.y + item.h
    );

  // CHECK COLLISION
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

    const movedItem = {
      ...movingItem,
      x: targetCol,
      y: targetRow,
    };

    if (
      movedItem.x + movedItem.w > cols ||
      movedItem.y + movedItem.h > rows
    ) {
      alert("❌ Widget exceeds grid");
      return;
    }

    if (hasMoveCollision(movedItem)) {
      alert("❌ Space occupied");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? movedItem : item
      )
    );
  };

  // SMART DRAG & DROP
  // Finds the nearest valid top-left position for the full widget footprint.
  const findClosestValidDrop = (
    movingItem,
    preferredRow,
    preferredCol
  ) => {
    if (!movingItem) return null;

    let bestPosition = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let row = 0; row <= rows - movingItem.h; row++) {
      for (let col = 0; col <= cols - movingItem.w; col++) {
        const candidate = {
          ...movingItem,
          x: col,
          y: row,
        };

        if (hasMoveCollision(candidate)) {
          continue;
        }

        const distance =
          Math.abs(row - preferredRow) +
          Math.abs(col - preferredCol);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestPosition = {
            row,
            col,
          };
        }
      }
    }

    return bestPosition;
  };

  const getSmartDropPosition = (row, col) => {
    const movingItem = items.find(
      (item) => item.id === draggingItemId
    );

    return findClosestValidDrop(
      movingItem,
      row,
      col
    );
  };

  const handleSmartDragOver = (event, row, col) => {
    event.preventDefault();
    event.stopPropagation();

    event.dataTransfer.dropEffect = "move";

    const target = getSmartDropPosition(row, col);

    setDragOverCell(target);
  };

  const handleSmartDrop = (event, row, col) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedItemId =
      draggingItemId ||
      Number(event.dataTransfer.getData("text/plain"));

    const movingItem = items.find(
      (item) => item.id === droppedItemId
    );

    const target = findClosestValidDrop(
      movingItem,
      row,
      col
    );

    if (droppedItemId && target) {
      moveWidget(
        droppedItemId,
        target.row,
        target.col
      );
    }

    setDraggingItemId(null);
    setDragOverCell(null);
    setDragOverTrash(false);
    setDidDrag(false);
  };

  // TOGGLE MULTIPLE DATA FOR LINE / AREA / BAR / PIE CHART
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
      alert(
        "❌ Please select at least one data source"
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
          ? editingImageWidget?.pins || []
          : undefined,
    };

    if (
      newItem.x + newItem.w > cols ||
      newItem.y + newItem.h > rows
    ) {
      alert("❌ Widget exceeds grid");
      return;
    }

    if (hasCollision(newItem)) {
      alert("❌ Space occupied");
      return;
    }

    setItems((prev) => [...prev, newItem]);

    setShowModal(false);
    setActiveCell(null);
    setNewLabel("");
  };

  // UPDATE WIDGET
  const updateWidget = () => {
    if (!selectedItem) return;

    if (
      isMultiDataWidget &&
      newDataKeys.length === 0
    ) {
      alert(
        "❌ Please select at least one data source"
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

            pins: selectedItem.pins || [],
          }
        : item
    );

    setItems(updatedItems);

    setShowModal(false);
    setActiveItemId(null);
    setNewLabel("");
  };

  // REMOVE WIDGET
  const removeWidget = (id) => {
    setItems((prev) =>
      prev.filter((i) => i.id !== id)
    );

    setShowModal(false);
    setActiveItemId(null);
    setNewLabel("");
  };

  // UPDATE TEMPLATE
  const updateTemplate = async () => {
    const token = localStorage.getItem("token");

    if (
      canConfigureInflux &&
      (!influxConfig.bucket.trim() ||
        !influxConfig.measurement.trim() ||
        !(influxConfig.tagValue || influxConfig.id))
    ) {
      setShowInfluxMapping(true);

      alert(
        "Please configure bucket, measurement, and device ID before updating."
      );

      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/templates/${selectedTemplate.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
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
                  influxConfig.tagValue || influxConfig.id,
                id: influxConfig.tagValue || influxConfig.id,
                deviceId: selectedDeviceId || undefined,
              },
              channelMap,
              items,
            },
          }),
        }
      );

      const text = await res.text();

      console.log("✅ UPDATE RESPONSE:", text);

      if (!res.ok) {
        throw new Error(text);
      }

      alert("✅ Template Updated");
      setPage("templates");
    } catch (err) {
      console.error("❌ UPDATE ERROR:", err);
      alert("❌ Failed to update");
    }
  };

  // BASE
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

  const stepLabels = [
    "Widget Type",
    "Data Source",
    "Appearance",
  ];

  const canContinueFromData =
    newType === "image" ||
    !currentWidget?.supportedData?.length ||
    (isMultiDataWidget
      ? newDataKeys.length > 0
      : Boolean(newDataKey));

  const goToNextWidgetStep = () => {
    if (widgetStep === 2 && !canContinueFromData) {
      alert("Please choose at least one data source.");
      return;
    }

    setWidgetStep((step) => Math.min(3, step + 1));
  };

  if (!selectedTemplate) {
    return (
      <div
        className="
          h-full flex items-center justify-center
          text-gray-400 text-xl
        "
      >
        No template selected
      </div>
    );
  }

  return (
    <div
      className="
        relative h-full overflow-auto
        bg-gray-100 dark:bg-gray-900
        p-6
      "
    >
      {/* GRID BG */}
      <div
        className="
          absolute inset-0
          bg-[linear-gradient(to_right,#d1d5db_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db_1px,transparent_1px)]
          bg-[size:40px_40px]
          opacity-10
          pointer-events-none
        "
      />

      {/* HEADER */}
      <div
        className="
          sticky top-0 z-20
          bg-white/80 dark:bg-gray-900/80
          backdrop-blur-xl
          rounded-3xl
          border border-gray-200 dark:border-gray-700
          p-6 mb-6
          shadow-lg
        "
      >
        <div className="flex justify-between items-center">
          <div>
            <h1
              className="
                text-3xl font-bold
                dark:text-white
                flex items-center gap-3
              "
            >
              <LayoutGrid className="w-8 h-8 text-yellow-500" />
              Template Editor
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Edit dashboard layouts. Drag widgets to reposition them.
            </p>
          </div>

          <button
            onClick={updateTemplate}
            className="
              flex items-center gap-2
              bg-yellow-500 hover:bg-yellow-600
              text-white
              px-5 py-3
              rounded-2xl
              shadow-lg
              transition-all duration-200
            "
          >
            <Save size={18} />
            Update Template
          </button>
        </div>

        {/* NAME */}
        <div className="mt-5">
          <input
            type="text"
            value={templateName}
            onChange={(e) =>
              setTemplateName(e.target.value)
            }
            className="
              w-full rounded-2xl
              border border-gray-300
              dark:border-gray-700
              bg-white dark:bg-gray-800
              dark:text-white
              px-4 py-3
              outline-none
            "
          />
        </div>

        {/* INFLUX DATA MAPPING */}
        {canConfigureInflux && (
          <div
            className="
              mt-5 rounded-3xl
              border border-gray-200 dark:border-gray-700
              bg-gray-50/80 dark:bg-gray-800/60
              overflow-hidden
            "
          >
            <button
              type="button"
              onClick={() =>
                setShowInfluxMapping((prev) => !prev)
              }
              className="
                w-full flex items-center justify-between
                gap-4 p-5 text-left transition
                hover:bg-gray-100/70 dark:hover:bg-gray-800
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    w-10 h-10 rounded-2xl
                    bg-yellow-100 dark:bg-yellow-900/30
                    text-yellow-600 dark:text-yellow-300
                    flex items-center justify-center
                  "
                >
                  <Database size={19} />
                </div>

                <div>
                  <h2 className="font-bold dark:text-white">
                    Data Mapping
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {isSuperadmin
                      ? "Choose a measurement, device ID, and dashboard channel mapping."
                      : "Select an assigned device and map its available Influx channels."}
                  </p>
                </div>
              </div>

              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform ${
                  showInfluxMapping ? "rotate-180" : ""
                }`}
              />
            </button>

            {showInfluxMapping && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-5">
                {isOrganizationAdmin ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Assigned Device
                      </label>

                      <select
                        value={selectedDeviceId}
                        onChange={(e) =>
                          applySelectedDevice(e.target.value)
                        }
                        disabled={influxLoading || !availableDevices.length}
                        className="
                          mt-2 w-full rounded-2xl
                          border border-gray-300 dark:border-gray-700
                          bg-white dark:bg-gray-900 dark:text-white
                          px-4 py-3 outline-none
                          focus:ring-2 focus:ring-yellow-500
                          disabled:opacity-50 disabled:cursor-not-allowed
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
                              device.tag_value ||
                              `Device ${device.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      className="
                        mt-2 rounded-2xl
                        border border-yellow-200 dark:border-yellow-900
                        bg-yellow-50 dark:bg-yellow-900/15
                        px-4 py-3 text-xs
                        text-yellow-800 dark:text-yellow-200
                      "
                    >
                      <p>
                        <span className="font-semibold">Bucket:</span>{" "}
                        {influxConfig.bucket || "Not selected"}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold">Measurement:</span>{" "}
                        {influxConfig.measurement || "Not selected"}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold">Device ID:</span>{" "}
                        {influxConfig.tagValue ||
                          influxConfig.id ||
                          "Not selected"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
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
                            id: "",
                            tagValue: "",
                          }));

                          setInfluxMeasurements([]);
                          setInfluxIds([]);
                          setInfluxChannels([]);
                        }}
                        placeholder="Mill"
                        className="
                          mt-2 w-full rounded-2xl
                          border border-gray-300 dark:border-gray-700
                          bg-white dark:bg-gray-900 dark:text-white
                          px-4 py-3 outline-none
                          focus:ring-2 focus:ring-yellow-500
                        "
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Measurement
                      </label>
                      <select
                        value={influxConfig.measurement}
                        onChange={async (e) => {
                          const measurement = e.target.value;

                          setInfluxConfig((prev) => ({
                            ...prev,
                            measurement,
                            id: "",
                            tagValue: "",
                          }));

                          setInfluxIds([]);
                          setInfluxChannels([]);
                          setInfluxError("");

                          if (!measurement) return;

                          try {
                            setInfluxLoading(true);
                            await fetchIdsAndChannels(
                              influxConfig.bucket,
                              measurement
                            );
                          } catch (err) {
                            setInfluxError(
                              err.message ||
                                "Failed to load metadata."
                            );
                          } finally {
                            setInfluxLoading(false);
                          }
                        }}
                        disabled={!influxConfig.bucket || influxLoading}
                        className="
                          mt-2 w-full rounded-2xl
                          border border-gray-300 dark:border-gray-700
                          bg-white dark:bg-gray-900 dark:text-white
                          px-4 py-3 outline-none
                          focus:ring-2 focus:ring-yellow-500
                          disabled:opacity-50
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
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Device ID
                      </label>
                      <select
                        value={influxConfig.id}
                        onChange={(e) =>
                          setInfluxConfig((prev) => ({
                            ...prev,
                            tagKey: "id",
                            id: e.target.value,
                            tagValue: e.target.value,
                          }))
                        }
                        disabled={!influxConfig.measurement}
                        className="
                          mt-2 w-full rounded-2xl
                          border border-gray-300 dark:border-gray-700
                          bg-white dark:bg-gray-900 dark:text-white
                          px-4 py-3 outline-none
                          focus:ring-2 focus:ring-yellow-500
                          disabled:opacity-50
                        "
                      >
                        <option value="">
                          Select available ID
                        </option>
                        {influxIds.map((id) => (
                          <option key={id} value={id}>
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
                      rounded-2xl bg-slate-800 hover:bg-slate-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-white px-4 py-2.5 text-sm font-semibold
                    "
                  >
                    <RefreshCw
                      size={16}
                      className={influxLoading ? "animate-spin" : ""}
                    />
                    {influxLoading
                      ? "Loading..."
                      : isOrganizationAdmin
                      ? "Reload Assigned Devices"
                      : "Reload Influx Metadata"}
                  </button>

                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isOrganizationAdmin
                      ? `${availableDevices.length} assigned device(s) · `
                      : `${influxMeasurements.length} measurement(s) · ${influxIds.length} device ID(s) · `}
                    {influxChannels.length} channel(s)
                  </span>

                  {influxError && (
                    <span className="text-xs text-red-500">
                      {influxError}
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="font-bold dark:text-white">
                    Channel Mapping
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Map each dashboard data key to an Influx field such as ch1 or ch5.
                  </p>

                  <datalist id="influx-channel-options">
                    {influxChannels.map((channel) => (
                      <option key={channel} value={channel} />
                    ))}
                  </datalist>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                    {dataOptions.map((option) => (
                      <div
                        key={option.key}
                        className="
                          rounded-2xl
                          border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-900 p-3
                        "
                      >
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
                          {option.label}
                        </label>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                          Dashboard key: {option.key}
                        </p>
                        <input
                          type="text"
                          list="influx-channel-options"
                          value={channelMap[option.key] || ""}
                          onChange={(e) =>
                            updateChannelMapping(
                              option.key,
                              e.target.value
                            )
                          }
                          placeholder="Select or type channel"
                          disabled={
                            isOrganizationAdmin &&
                            !selectedDeviceId
                          }
                          className="
                            mt-3 w-full rounded-xl
                            border border-gray-300 dark:border-gray-700
                            bg-gray-50 dark:bg-gray-800 dark:text-white
                            px-3 py-2.5 text-sm outline-none
                            focus:ring-2 focus:ring-yellow-500
                            disabled:opacity-50 disabled:cursor-not-allowed
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

      {/* GRID */}
      <div
        className="grid gap-3 relative z-10"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, minmax(180px, 1fr))`,
          minHeight: "75vh",
        }}
      >
        {/* EMPTY */}
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
              onDragOver={(event) =>
                handleSmartDragOver(event, r, c)
              }
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setDragOverCell(null);
                }
              }}
              onDrop={(event) =>
                handleSmartDrop(event, r, c)
              }
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
                setWidgetStep(1);

                setShowModal(true);
              }}
              className={`
                rounded-3xl
                border-2 border-dashed
                bg-white/40 dark:bg-gray-800/30
                flex items-center justify-center
                cursor-pointer
                transition-all

                ${
                  isDragOver
                    ? `
                      border-yellow-500
                      bg-yellow-50
                      dark:bg-yellow-900/20
                      scale-[1.02]
                    `
                    : `
                      border-gray-300 dark:border-gray-700
                      hover:border-yellow-500
                      hover:bg-yellow-50 dark:hover:bg-yellow-900/20
                    `
                }
              `}
            >
              <div className="text-center">
                {draggingItemId ? (
                  <>
                    <Move className="mx-auto mb-2 text-yellow-500" />

                    <p className="text-sm text-yellow-500">
                      Drop Here
                    </p>
                  </>
                ) : (
                  <>
                    <Plus className="mx-auto mb-2 text-gray-400" />

                    <p className="text-sm text-gray-400">
                      Add Widget
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* SMART DROP FOOTPRINT */}
        {draggingItemId && dragOverCell && (() => {
          const movingItem = items.find(
            (item) => item.id === draggingItemId
          );

          if (!movingItem) return null;

          return (
            <div
              className="
                pointer-events-none z-30
                rounded-3xl border-2 border-dashed
                border-yellow-500 bg-yellow-400/20
                flex items-center justify-center
                text-xs font-bold text-yellow-700
                dark:text-yellow-200
              "
              style={{
                gridColumn: `${dragOverCell.col + 1} / span ${movingItem.w}`,
                gridRow: `${dragOverCell.row + 1} / span ${movingItem.h}`,
              }}
            >
              Drop {movingItem.w}×{movingItem.h} here
            </div>
          );
        })()}

        {/* WIDGETS */}
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();

              setDraggingItemId(item.id);
              setDidDrag(true);

              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData(
                "text/plain",
                String(item.id)
              );
            }}
            onDragEnd={() => {
              setDraggingItemId(null);
              setDragOverCell(null);
              setDragOverTrash(false);

              setTimeout(() => {
                setDidDrag(false);
              }, 80);
            }}
            onDragOver={(event) =>
              handleSmartDragOver(event, item.y, item.x)
            }
            onDrop={(event) =>
              handleSmartDrop(event, item.y, item.x)
            }
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
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-3xl
              shadow-lg
              hover:shadow-2xl
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
                text-gray-700
                dark:text-white
                bg-white/90
                dark:bg-gray-900/90
                border border-gray-200
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
                bg-white/90 dark:bg-gray-900/90
                border border-gray-200 dark:border-gray-700
                shadow-sm
                flex items-center justify-center
                text-gray-400
                group-hover:text-yellow-500
              "
              title="Drag to move"
            >
              <Move size={15} />
            </div>

            {/* ACTUAL WIDGET PREVIEW */}
            <div
              className={`
                absolute inset-0 min-h-0 min-w-0 p-4 pointer-events-none
                ${
                  item.type === "image"
                    ? "flex items-center justify-center"
                    : ""
                }
              `}
            >
              {item.type === "image" ? (
                <div className={imageWidgetViewportClass}>
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
                bg-white/90 dark:bg-gray-900/90
                border border-gray-200 dark:border-gray-700
                shadow
                flex items-center justify-center
                opacity-70 group-hover:opacity-100
              "
            >
              <Pencil className="w-4 h-4 text-gray-500 group-hover:text-yellow-500" />
            </div>

            {/* SIZE BADGE */}
            <div
              className="
                absolute bottom-3 left-3
                text-xs
                text-gray-400
                bg-white/80 dark:bg-gray-900/80
                px-2 py-1
                rounded-lg
              "
            >
              {item.w}×{item.h}
            </div>
          </div>
        ))}
      </div>

      {/* DELETE DROP ZONE */}
      {draggingItemId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverTrash(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setDragOverTrash(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();

            const droppedItemId =
              draggingItemId ||
              Number(e.dataTransfer.getData("text/plain"));

            if (droppedItemId) {
              setItems((prev) =>
                prev.filter(
                  (item) => Number(item.id) !== Number(droppedItemId)
                )
              );

              if (Number(activeItemId) === Number(droppedItemId)) {
                setActiveItemId(null);
                setShowModal(false);
              }
            }

            setDraggingItemId(null);
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
                    border-gray-200/80 dark:border-gray-700/80
                    bg-white/80 dark:bg-gray-900/85
                    text-gray-500 dark:text-gray-300
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
              bg-white dark:bg-gray-900
              w-[1450px]
              max-w-[96vw]
              max-h-[92vh]
              rounded-3xl
              shadow-2xl
              overflow-hidden
              border border-gray-200 dark:border-gray-700
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
                border-b border-gray-200 dark:border-gray-700
                px-8 py-6
                bg-white dark:bg-gray-900
              "
            >
              <div>
                <h2 className="text-2xl font-bold dark:text-white">
                  {isEdit
                    ? "Widget Settings"
                    : "Widget Settings"}
                </h2>

                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Configure widget type, data source, size and appearance
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="
                  w-10 h-10
                  rounded-xl
                  hover:bg-gray-100 dark:hover:bg-gray-800
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
                  bg-gray-100 dark:bg-gray-950
                  p-8
                  border-r border-gray-200 dark:border-gray-700
                  overflow-hidden
                "
              >
                <div
                  className="
                    h-full
                    rounded-3xl
                    border border-dashed
                    border-gray-300 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    overflow-hidden
                    p-6
                    pointer-events-none
                    flex flex-col
                  "
                >
                  {/* PREVIEW HEADER */}
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400">
                      Live Preview
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <h3 className="text-sm font-semibold dark:text-white capitalize">
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
                            text-yellow-600
                            bg-yellow-50 dark:bg-yellow-900/30
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
                              text-yellow-600
                              bg-yellow-50 dark:bg-yellow-900/30
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

                  {/* PREVIEW BODY */}
                  <div
                    className="
                      flex-1
                      flex items-center justify-center
                      rounded-2xl
                      bg-gray-50 dark:bg-gray-950
                      overflow-hidden
                    "
                  >
                    {newType === "image" ? (
                      <div className={imageWidgetViewportClass}>
                        <WidgetRenderer
                          type={newType}
                          value={previewData[newDataKey]}
                          data={previewData}
                          history={previewHistory}
                          dataKey={
                            isMultiDataWidget
                              ? newDataKeys[0] || newDataKey
                              : newDataKey
                          }
                          item={{
                            id: selectedItem?.id || 999,
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
                              selectedItem?.pins ||
                              base?.pins ||
                              [],
                          }}
                          updateItem={() => {}}
                          editMode={false}
                        />
                      </div>
                    ) : (
                      <WidgetRenderer
                        type={newType}
                        value={previewData[newDataKey]}
                        data={previewData}
                        history={previewHistory}
                        dataKey={
                          isMultiDataWidget
                            ? newDataKeys[0] || newDataKey
                            : newDataKey
                        }
                        item={{
                          id: selectedItem?.id || 999,
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
                            selectedItem?.pins ||
                            base?.pins ||
                            [],
                        }}
                        updateItem={() => {}}
                        editMode={false}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SETTINGS — GUIDED WIZARD */}
              <div
                className="
                  p-8
                  overflow-y-auto
                  bg-white dark:bg-gray-900
                "
              >
                {/* STEP INDICATOR */}
                <div className="mb-7">
                  <div className="flex items-center gap-2">
                    {stepLabels.map((label, index) => {
                      const step = index + 1;
                      const isCurrent = widgetStep === step;
                      const isDone = widgetStep > step;

                      return (
                        <div
                          key={label}
                          className="flex items-center flex-1 min-w-0"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (step < widgetStep) {
                                setWidgetStep(step);
                              }
                            }}
                            className={`
                              flex items-center gap-2
                              min-w-0
                              ${
                                step <= widgetStep
                                  ? "cursor-pointer"
                                  : "cursor-default"
                              }
                            `}
                          >
                            <span
                              className={`
                                w-8 h-8 shrink-0
                                rounded-full
                                flex items-center justify-center
                                text-xs font-bold
                                transition
                                ${
                                  isCurrent
                                    ? "bg-yellow-500 text-white shadow"
                                    : isDone
                                    ? "bg-yellow-500 text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                                }
                              `}
                            >
                              {isDone ? "✓" : step}
                            </span>

                            <span
                              className={`
                                hidden xl:block
                                text-xs font-semibold truncate
                                ${
                                  isCurrent
                                    ? "text-yellow-600 dark:text-yellow-300"
                                    : "text-gray-400"
                                }
                              `}
                            >
                              {label}
                            </span>
                          </button>

                          {step < 3 && (
                            <div
                              className={`
                                h-px flex-1 mx-2
                                ${
                                  isDone
                                    ? "bg-yellow-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }
                              `}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <h3 className="font-bold dark:text-white">
                      Step {widgetStep}: {stepLabels[widgetStep - 1]}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {widgetStep === 1 &&
                        "Choose the type of visual you want to add."}
                      {widgetStep === 2 &&
                        (newType === "image"
                          ? "Configure your image widget before continuing."
                          : "Choose the live dashboard value this widget should display.")}
                      {widgetStep === 3 &&
                        "Set the label, size, and optional display settings."}
                    </p>
                  </div>
                </div>

                {/* STEP 1 — WIDGET TYPE */}
                {widgetStep === 1 && (
                  <div
                    className="
                      bg-gray-50 dark:bg-gray-800/70
                      border border-gray-200 dark:border-gray-700
                      rounded-3xl
                      p-5
                    "
                  >
                    <h3 className="font-bold mb-4 dark:text-white">
                      Choose Widget Type
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                      {widgetLibrary.map((w) => {
                        const TypeIcon = w.icon;

                        return (
                          <button
                            key={w.type}
                            type="button"
                            onClick={() => {
                              setNewType(w.type);

                              // New image widgets start with a landscape size.
                              if (!isEdit && w.type === "image") {
                                setNewW(2);
                                setNewH(1);
                              }
                            }}
                            className={`
                              p-5 rounded-2xl border transition-all text-center
                              ${
                                newType === w.type
                                  ? "bg-yellow-500 text-white border-yellow-500 scale-105 shadow-xl"
                                  : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                              }
                            `}
                          >
                            <TypeIcon className="mx-auto mb-2 w-6 h-6" />

                            <div className="text-sm font-semibold">
                              {w.label}
                            </div>

                            <div
                              className={`
                                text-[11px] mt-1
                                ${
                                  newType === w.type
                                    ? "text-yellow-100"
                                    : "text-gray-400"
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
                )}

                {/* STEP 2 — DATA OR IMAGE CONFIGURATION */}
                {widgetStep === 2 && (
                  <>
                    {currentWidget?.supportedData?.length > 0 &&
                      newType !== "image" && (
                        <div
                          className="
                            bg-gray-50 dark:bg-gray-800/70
                            border border-gray-200 dark:border-gray-700
                            rounded-3xl
                            p-5
                          "
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold dark:text-white">
                              Choose Data Source
                            </h3>

                            {isMultiDataWidget && (
                              <span className="text-xs text-gray-400">
                                Select multiple
                              </span>
                            )}
                          </div>

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
                                      px-4 py-2 rounded-xl text-xs font-medium transition-all border
                                      ${
                                        selected
                                          ? "bg-yellow-500 text-white border-yellow-500 shadow"
                                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-yellow-400 dark:text-white"
                                      }
                                    `}
                                  >
                                    {d.label}
                                  </button>
                                );
                              })}
                          </div>

                          {isMultiDataWidget && (
                            <p className="text-xs text-gray-400 mt-3">
                              Selected:{" "}
                              {newDataKeys.length
                                ? newDataKeys.join(", ")
                                : "None"}
                            </p>
                          )}
                        </div>
                      )}

                    {newType === "image" && (
                      <div
                        className="
                          bg-purple-50 dark:bg-purple-900/20
                          border border-purple-200 dark:border-purple-800
                          rounded-3xl
                          p-5
                        "
                      >
                        <h3 className="font-bold mb-2 dark:text-white">
                          Configure Image Widget
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Open the image editor to place pins and connect live data.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof setEditingImageWidget !== "function") {
                              alert(
                                "❌ setEditingImageWidget is not connected in App.jsx"
                              );
                              return;
                            }

                            const target = isEdit
                              ? selectedItem
                              : {
                                  id: Date.now(),
                                  type: "image",
                                  label:
                                    newLabel.trim() || "System Diagram",
                                  dataKey: newDataKey,
                                  x: activeCell?.col || 0,
                                  y: activeCell?.row || 0,
                                  w: newW,
                                  h: newH,
                                  pins: editingImageWidget?.pins || [],
                                };

                            setEditingImageWidget({
                              ...target,
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
                          Configure Image Widget
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* STEP 3 — APPEARANCE */}
                {widgetStep === 3 && (
                  <div className="space-y-6">
                    <div
                      className="
                        bg-gray-50 dark:bg-gray-800/70
                        border border-gray-200 dark:border-gray-700
                        rounded-3xl
                        p-5
                      "
                    >
                      <h3 className="font-bold mb-4 dark:text-white">
                        Widget Label
                      </h3>

                      <input
                        type="text"
                        placeholder="Example: Main Steam Pressure"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="
                          w-full
                          rounded-2xl
                          border border-gray-300
                          dark:border-gray-700
                          bg-white dark:bg-gray-900
                          dark:text-white
                          px-4 py-3
                          outline-none
                          focus:ring-2 focus:ring-yellow-500
                        "
                      />

                      <p className="text-xs text-gray-400 mt-3">
                        This name will be shown as the widget title on the dashboard.
                      </p>
                    </div>

                    {newType === "bar" && (
                      <div
                        className="
                          bg-gray-50 dark:bg-gray-800/70
                          border border-gray-200 dark:border-gray-700
                          rounded-3xl
                          p-5
                        "
                      >
                        <h3 className="font-bold mb-4 dark:text-white">
                          Bar Direction
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setNewOrientation("vertical")}
                            className={`
                              py-4 rounded-2xl border transition-all font-medium
                              ${
                                newOrientation === "vertical"
                                  ? "bg-yellow-500 text-white border-yellow-500 shadow"
                                  : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                              }
                            `}
                          >
                            Vertical
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewOrientation("horizontal")}
                            className={`
                              py-4 rounded-2xl border transition-all font-medium
                              ${
                                newOrientation === "horizontal"
                                  ? "bg-yellow-500 text-white border-yellow-500 shadow"
                                  : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                              }
                            `}
                          >
                            Horizontal
                          </button>
                        </div>
                      </div>
                    )}

                    <div
                      className="
                        bg-gray-50 dark:bg-gray-800/70
                        border border-gray-200 dark:border-gray-700
                        rounded-3xl
                        p-5
                      "
                    >
                      <h3 className="font-bold mb-4 dark:text-white">
                        Widget Size
                      </h3>

                      <div className="grid grid-cols-3 gap-3">
                        {displaySizeOptions.map((s, i) => (
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
                                  ? "bg-yellow-500 text-white border-yellow-500 shadow"
                                  : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                              }
                            `}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* WIZARD ACTIONS */}
                <div
                  className="
                    sticky bottom-0
                    mt-6 pt-5
                    bg-white dark:bg-gray-900
                    border-t border-gray-200 dark:border-gray-700
                    flex gap-3
                  "
                >
                  {widgetStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWidgetStep((step) => step - 1)}
                      className="
                        flex-1
                        bg-gray-200 hover:bg-gray-300
                        dark:bg-gray-800 dark:hover:bg-gray-700
                        dark:text-white
                        py-4
                        rounded-2xl
                        font-semibold
                        transition-all
                      "
                    >
                      Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="
                        flex-1
                        bg-gray-200 hover:bg-gray-300
                        dark:bg-gray-800 dark:hover:bg-gray-700
                        dark:text-white
                        py-4
                        rounded-2xl
                        font-semibold
                        transition-all
                      "
                    >
                      Cancel
                    </button>
                  )}

                  {widgetStep < 3 ? (
                    <button
                      type="button"
                      onClick={goToNextWidgetStep}
                      className="
                        flex-1
                        bg-yellow-500 hover:bg-yellow-600
                        text-white
                        py-4
                        rounded-2xl
                        font-semibold
                        shadow-lg
                        transition-all
                      "
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={isEdit ? updateWidget : addWidget}
                      className="
                        flex-1
                        bg-yellow-500 hover:bg-yellow-600
                        text-white
                        py-4
                        rounded-2xl
                        font-semibold
                        shadow-lg
                        transition-all
                      "
                    >
                      {isEdit ? "Save Widget Changes" : "Add Widget"}
                    </button>
                  )}
                </div>

                {isEdit && (
                  <button
                    type="button"
                    onClick={() => removeWidget(selectedItem.id)}
                    className="
                      mt-4
                      w-full
                      bg-red-500
                      hover:bg-red-600
                      text-white
                      py-4
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Pencil,
  Factory,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import IndustrialEquipmentIcon from "../process/IndustrialEquipmentIcon";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import ProcessPipeline from "../process/ProcessPipeline";
import ProcessMonitoringView from "../process/ProcessMonitoringView";
import "../process/processVisualization.css";
import {
  EQUIPMENT_BY_TYPE,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_LIBRARY,
  PROCESS_MEDIA,
  makeEquipmentNode,
} from "../process/equipmentLibrary";
import { confirmAction, notify } from "../utils/feedback";

const DEFAULT_NODE_WIDTH = 196;
const DEFAULT_NODE_HEIGHT = 126;

const MIN_NODE_WIDTH = 150;
const MIN_NODE_HEIGHT = 105;
const MAX_NODE_WIDTH = 420;
const MAX_NODE_HEIGHT = 300;

const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 2400;

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseLayout = (template) => {
  if (!template?.layout) return {};

  if (typeof template.layout === "string") {
    try {
      return JSON.parse(template.layout);
    } catch {
      return {};
    }
  }

  return template.layout || {};
};

const getMappedSources = (layout) => {
  if (
    layout?.dataSources &&
    typeof layout.dataSources === "object" &&
    !Array.isArray(layout.dataSources)
  ) {
    return layout.dataSources;
  }

  return (layout?.customDataOptions || []).reduce((result, option) => {
    if (option?.key && option?.source) {
      result[option.key] = option.source;
    }

    return result;
  }, {});
};

const hashText = (text) => {
  let hash = 2166136261;
  const value = String(text || "");

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
};

const fakeMetricValue = (nodeId, metric, clock) => {
  const seed = hashText(`${nodeId}:${metric.id}`);

  if (metric.kind === "status") {
    return Math.sin(clock / 11000 + seed) > -0.72 ? 1 : 0;
  }

  const minimum = Number(metric.min ?? 0);
  const maximum = Number(metric.max ?? minimum + 100);
  const span = Math.max(0.0001, maximum - minimum);
  const midpoint = minimum + span * 0.52;
  const amplitude = span * 0.18;
  const slowWave = Math.sin(clock / 5200 + seed * 0.0017);
  const fastWave = Math.sin(clock / 1700 + seed * 0.0031) * 0.25;
  const value = clamp(midpoint + amplitude * (slowWave + fastWave), minimum, maximum);

  return metric.kind === "integer" ? Math.round(value) : Number(value.toFixed(1));
};

const formatMetricValue = (value, metric) => {
  if (value === null || value === undefined || value === "") return "—";

  if (metric?.kind === "status") {
    return Number(value) === 1 ? "ON" : "OFF";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);

  return Number.isInteger(numeric) ? numeric.toLocaleString() : numeric.toFixed(1);
};

const getNodeWidth = (node) =>
  clamp(
    Number(node?.width) || DEFAULT_NODE_WIDTH,
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH
  );

const getNodeHeight = (node) =>
  clamp(
    Number(node?.height) || DEFAULT_NODE_HEIGHT,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT
  );

const normalizeNodeSize = (node) => ({
  ...node,
  width: getNodeWidth(node),
  height: getNodeHeight(node),
});

const getEdgePath = (sourceNode, targetNode) => {
  const sourceWidth = getNodeWidth(sourceNode);
  const sourceHeight = getNodeHeight(sourceNode);
  const targetHeight = getNodeHeight(targetNode);

  const sourceX = sourceNode.x + sourceWidth;
  const sourceY = sourceNode.y + sourceHeight / 2;
  const targetX = targetNode.x;
  const targetY = targetNode.y + targetHeight / 2;
  const distance = Math.max(70, Math.abs(targetX - sourceX) * 0.48);

  return `M ${sourceX} ${sourceY} C ${sourceX + distance} ${sourceY}, ${targetX - distance} ${targetY}, ${targetX} ${targetY}`;
};

const makeConnection = (source, target) => ({
  id: `pipe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  source,
  target,
  medium: "steam",
  label: "",
  dataKey: "",
});

const getStoredTopologyKey = (templateId) =>
  `palm-oil-process-simulator:${String(templateId || "standalone")}`;

const getInitialDemo = () => {
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;

  return {
    nodes: [
      {
        ...makeEquipmentNode(
          "boiler",
          centerX - 650,
          centerY - 70,
          1
        ),
        id: "demo-boiler",
        label: "Boiler A",
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      },
      {
        ...makeEquipmentNode(
          "junction",
          centerX - 300,
          centerY - 70,
          1
        ),
        id: "demo-header",
        label: "Steam Header",
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      },
      {
        ...makeEquipmentNode(
          "sterilizer",
          centerX + 80,
          centerY - 210,
          1
        ),
        id: "demo-sterilizer-1",
        label: "Sterilizer 1",
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      },
      {
        ...makeEquipmentNode(
          "sterilizer",
          centerX + 80,
          centerY + 90,
          2
        ),
        id: "demo-sterilizer-2",
        label: "Sterilizer 2",
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      },
    ],
    connections: [
      {
        ...makeConnection("demo-boiler", "demo-header"),
        id: "demo-pipe-1",
        medium: "steam",
        label: "Main Steam",
      },
      {
        ...makeConnection("demo-header", "demo-sterilizer-1"),
        id: "demo-pipe-2",
        medium: "steam",
      },
      {
        ...makeConnection("demo-header", "demo-sterilizer-2"),
        id: "demo-pipe-3",
        medium: "steam",
      },
    ],
  };
};

export default function ProcessSimulator({
  template,
  dark = false,
}) {
  const role = localStorage.getItem("role");
  const readOnly = role === "viewer";
  const layout = useMemo(() => parseLayout(template), [template]);
  const dataSources = useMemo(() => getMappedSources(layout), [layout]);

  const availableDataOptions = useMemo(() => {
    const customOptions = Array.isArray(layout?.customDataOptions)
      ? layout.customDataOptions
      : [];

    const labelMap = Object.fromEntries(
      customOptions
        .filter((option) => option?.key)
        .map((option) => [option.key, option.label || option.key])
    );

    return Object.keys(dataSources)
      .sort((a, b) => String(labelMap[a] || a).localeCompare(String(labelMap[b] || b)))
      .map((key) => {
        const source = dataSources[key] || {};
        const customOption = customOptions.find((option) => option?.key === key);
        const customSource = customOption?.source || {};
        const deviceId = String(
          source.tagValue ||
            source.id ||
            customSource.tagValue ||
            customSource.id ||
            ""
        );
        const deviceName =
          customSource.deviceName ||
          customSource.device_name ||
          customSource.name ||
          deviceId ||
          "Mapped device";

        return {
          key,
          label: labelMap[key] || key,
          deviceId,
          deviceName,
          measurement: source.measurement || customSource.measurement || "",
        };
      });
  }, [dataSources, layout?.customDataOptions]);

  const mappedDevices = useMemo(() => {
    const byId = new Map();

    availableDataOptions.forEach((option) => {
      if (!option.deviceId) return;

      if (!byId.has(option.deviceId)) {
        byId.set(option.deviceId, {
          id: option.deviceId,
          name: option.deviceName || option.deviceId,
          fields: 0,
          measurements: new Set(),
        });
      }

      const device = byId.get(option.deviceId);
      device.fields += 1;
      if (option.measurement) device.measurements.add(option.measurement);
    });

    return [...byId.values()]
      .map((device) => ({
        ...device,
        measurements: [...device.measurements],
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [availableDataOptions]);

  const stored = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(getStoredTopologyKey(template?.id)) || "null");
    } catch {
      return null;
    }
  }, [template?.id]);

  const demo = useMemo(() => getInitialDemo(), []);
  const [nodes, setNodes] = useState(
    (stored?.nodes || demo.nodes).map(normalizeNodeSize)
  );
  const [connections, setConnections] = useState(stored?.connections || demo.connections);
  const [mode, setMode] = useState(stored?.mode || "hybrid");
  const [viewMode, setViewMode] = useState("monitor");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [category, setCategory] = useState("All");
  const [zoom, setZoom] = useState(1);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [liveData, setLiveData] = useState({});
  const [history, setHistory] = useState([]);
  const [liveState, setLiveState] = useState("idle");
  const [lastLiveAt, setLastLiveAt] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const canvasRef = useRef(null);
  const initialCenterFrameRef = useRef(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedConnection =
    connections.find((connection) => connection.id === selectedConnectionId) || null;


  const getViewportCenter = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
      };
    }

    return {
      x:
        canvas.scrollLeft / zoom +
        canvas.clientWidth / (2 * zoom),
      y:
        canvas.scrollTop / zoom +
        canvas.clientHeight / (2 * zoom),
    };
  };

  const centerCanvas = (behavior = "smooth") => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.scrollTo({
      left: Math.max(
        0,
        (CANVAS_WIDTH * zoom - canvas.clientWidth) / 2
      ),
      top: Math.max(
        0,
        (CANVAS_HEIGHT * zoom - canvas.clientHeight) / 2
      ),
      behavior,
    });
  };

  const fitPlantToView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (nodes.length === 0) {
      centerCanvas();
      return;
    }

    const minX = Math.min(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));

    const maxX = Math.max(
      ...nodes.map(
        (node) =>
          node.x + getNodeWidth(node)
      )
    );

    const maxY = Math.max(
      ...nodes.map(
        (node) =>
          node.y + getNodeHeight(node)
      )
    );

    const padding = 90;
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);

    const nextZoom = clamp(
      Math.min(
        (canvas.clientWidth - padding * 2) / contentWidth,
        (canvas.clientHeight - padding * 2) / contentHeight
      ),
      MIN_ZOOM,
      MAX_ZOOM
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(nextZoom);

    window.requestAnimationFrame(() => {
      canvas.scrollTo({
        left: Math.max(
          0,
          centerX * nextZoom -
            canvas.clientWidth / 2
        ),
        top: Math.max(
          0,
          centerY * nextZoom -
            canvas.clientHeight / 2
        ),
        behavior: "smooth",
      });
    });
  };

  const getDeviceDataOptions = (deviceId, currentBinding = "") => {
    const filtered = deviceId
      ? availableDataOptions.filter((option) => option.deviceId === deviceId)
      : availableDataOptions;

    if (
      currentBinding &&
      !filtered.some((option) => option.key === currentBinding)
    ) {
      const current = availableDataOptions.find((option) => option.key === currentBinding);
      return current ? [current, ...filtered] : filtered;
    }

    return filtered;
  };

  const getDeviceLabel = (deviceId) => {
    if (!deviceId) return "Any mapped device";
    const device = mappedDevices.find((item) => item.id === deviceId);
    if (!device) return deviceId;
    return device.name === device.id ? device.id : `${device.name} · ${device.id}`;
  };

  const filteredLibrary = useMemo(() => {
    const keyword = librarySearch.trim().toLowerCase();

    return EQUIPMENT_LIBRARY.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!keyword) return true;

      return [item.label, item.category, item.description, item.type].some((value) =>
        String(value).toLowerCase().includes(keyword)
      );
    });
  }, [category, librarySearch]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectFrom(null);

    try {
      const nextStored = JSON.parse(
        localStorage.getItem(getStoredTopologyKey(template?.id)) || "null"
      );

      if (nextStored?.nodes && nextStored?.connections) {
        setNodes(nextStored.nodes.map(normalizeNodeSize));
        setConnections(nextStored.connections);
        setMode(nextStored.mode || "hybrid");
      } else {
        const nextDemo = getInitialDemo();
        setNodes(nextDemo.nodes.map(normalizeNodeSize));
        setConnections(nextDemo.connections);
      }
    } catch {
      const nextDemo = getInitialDemo();
      setNodes(nextDemo.nodes.map(normalizeNodeSize));
      setConnections(nextDemo.connections);
    }
  }, [template?.id]);

  useEffect(() => {
    if (initialCenterFrameRef.current) {
      window.cancelAnimationFrame(
        initialCenterFrameRef.current
      );
    }

    initialCenterFrameRef.current =
      window.requestAnimationFrame(() => {
        centerCanvas("auto");
      });

    return () => {
      if (initialCenterFrameRef.current) {
        window.cancelAnimationFrame(
          initialCenterFrameRef.current
        );
      }
    };
  }, [template?.id]);

  useEffect(() => {
    if (mode === "fake") {
      setLiveState("fake");
      return undefined;
    }

    if (!template || Object.keys(dataSources).length === 0) {
      setLiveState("unmapped");
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const fetchLive = async () => {
      const token = localStorage.getItem("token");
      if (!token || cancelled) return;

      try {
        setLiveState((current) => (current === "connected" ? current : "connecting"));

        const response = await fetch("http://localhost:5000/template-live-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            dataSources,
            influx: layout?.influx || null,
            channelMap: layout?.channelMap || {},
            historyWindow: "-15m",
            items: layout?.items || [],
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Unable to retrieve process data");
        }

        if (cancelled) return;

        if (result?.data && typeof result.data === "object") {
          setLiveData((previous) => ({ ...previous, ...result.data }));
        }

        if (Array.isArray(result?.history) && result.history.length > 0) {
          setHistory(result.history);
        }

        setLiveState("connected");
        setLastLiveAt(new Date().toISOString());
      } catch (error) {
        if (!cancelled) {
          console.warn("Process simulator live-data request failed", error);
          setLiveState("stale");
        }
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(fetchLive, 5000);
        }
      }
    };

    fetchLive();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [dataSources, layout, mode, template]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMove = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left + canvas.scrollLeft) / zoom - dragging.offsetX;
      const y = (event.clientY - rect.top + canvas.scrollTop) / zoom - dragging.offsetY;

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== dragging.id) {
            return node;
          }

          const width = getNodeWidth(node);
          const height = getNodeHeight(node);

          return {
            ...node,
            x: clamp(
              x,
              8,
              CANVAS_WIDTH - width - 8
            ),
            y: clamp(
              y,
              8,
              CANVAS_HEIGHT - height - 8
            ),
          };
        })
      );
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, zoom]);

  useEffect(() => {
    if (!resizing) return undefined;

    const handleResizeMove = (event) => {
      const deltaX =
        (event.clientX - resizing.startClientX) /
        zoom;

      const deltaY =
        (event.clientY - resizing.startClientY) /
        zoom;

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== resizing.id) {
            return node;
          }

          const maximumWidth = Math.min(
            MAX_NODE_WIDTH,
            CANVAS_WIDTH - node.x - 8
          );

          const maximumHeight = Math.min(
            MAX_NODE_HEIGHT,
            CANVAS_HEIGHT - node.y - 8
          );

          return {
            ...node,
            width: clamp(
              resizing.startWidth + deltaX,
              MIN_NODE_WIDTH,
              maximumWidth
            ),
            height: clamp(
              resizing.startHeight + deltaY,
              MIN_NODE_HEIGHT,
              maximumHeight
            ),
          };
        })
      );
    };

    const handleResizeEnd = () => {
      setResizing(null);
    };

    window.addEventListener(
      "pointermove",
      handleResizeMove
    );
    window.addEventListener(
      "pointerup",
      handleResizeEnd
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handleResizeMove
      );
      window.removeEventListener(
        "pointerup",
        handleResizeEnd
      );
    };
  }, [resizing, zoom]);

  const resolveMetric = (node, metric) => {
    const dataKey = node.bindings?.[metric.id] || "";
    const hasLive = dataKey && liveData[dataKey] !== undefined && liveData[dataKey] !== null;

    if (mode === "live") {
      return {
        value: hasLive ? liveData[dataKey] : null,
        source: hasLive ? "live" : "missing",
      };
    }

    if (mode === "hybrid" && hasLive) {
      return { value: liveData[dataKey], source: "live" };
    }

    return {
      value: fakeMetricValue(node.id, metric, clock),
      source: "fake",
    };
  };

  const resolveConnectionValue = (connection) => {
    if (connection.dataKey && liveData[connection.dataKey] !== undefined && mode !== "fake") {
      return Number(liveData[connection.dataKey]);
    }

    const seed = hashText(connection.id);
    return 20 + Math.abs(Math.sin(clock / 4200 + seed * 0.001)) * 60;
  };

  const startNodeDrag = (event, node) => {
    if (readOnly || event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left + canvas.scrollLeft) / zoom;
    const pointerY = (event.clientY - rect.top + canvas.scrollTop) / zoom;

    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setDragging({
      id: node.id,
      offsetX: pointerX - node.x,
      offsetY: pointerY - node.y,
    });
  };

  const startNodeResize = (event, node) => {
    if (readOnly || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setDragging(null);

    setResizing({
      id: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: getNodeWidth(node),
      startHeight: getNodeHeight(node),
    });
  };

  const addNodeAt = (
    type,
    requestedX = null,
    requestedY = null
  ) => {
    if (readOnly) return;

    const count =
      nodes.filter((node) => node.type === type)
        .length + 1;

    const center = getViewportCenter();

    const x = Number.isFinite(requestedX)
      ? requestedX
      : center.x -
        DEFAULT_NODE_WIDTH / 2 +
        (Math.random() - 0.5) * 40;

    const y = Number.isFinite(requestedY)
      ? requestedY
      : center.y -
        DEFAULT_NODE_HEIGHT / 2 +
        (Math.random() - 0.5) * 40;

    const node = normalizeNodeSize(
      makeEquipmentNode(
        type,
        clamp(
          x,
          8,
          CANVAS_WIDTH -
            DEFAULT_NODE_WIDTH -
            8
        ),
        clamp(
          y,
          8,
          CANVAS_HEIGHT -
            DEFAULT_NODE_HEIGHT -
            8
        ),
        count
      )
    );

    setNodes((current) => [
      ...current,
      node,
    ]);

    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (readOnly) return;

    const type = event.dataTransfer.getData("application/x-process-equipment");
    const canvas = canvasRef.current;
    if (!type || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      (event.clientX -
        rect.left +
        canvas.scrollLeft) /
        zoom -
      DEFAULT_NODE_WIDTH / 2;

    const y =
      (event.clientY -
        rect.top +
        canvas.scrollTop) /
        zoom -
      DEFAULT_NODE_HEIGHT / 2;

    addNodeAt(
      type,
      clamp(
        x,
        8,
        CANVAS_WIDTH -
          DEFAULT_NODE_WIDTH -
          8
      ),
      clamp(
        y,
        8,
        CANVAS_HEIGHT -
          DEFAULT_NODE_HEIGHT -
          8
      )
    );
  };

  const completeConnection = (targetId) => {
    if (readOnly) return;

    if (!connectFrom) {
      notify("Choose an output handle first.", "info");
      return;
    }

    if (connectFrom === targetId) {
      notify("A pipeline cannot connect an equipment item to itself.", "warning");
      return;
    }

    const duplicate = connections.some(
      (connection) => connection.source === connectFrom && connection.target === targetId
    );

    if (duplicate) {
      notify("This pipeline already exists.", "warning");
      setConnectFrom(null);
      return;
    }

    const connection = makeConnection(connectFrom, targetId);
    setConnections((current) => [...current, connection]);
    setSelectedConnectionId(connection.id);
    setSelectedNodeId(null);
    setConnectFrom(null);
  };

  const updateSelectedNode = (patch) => {
    if (!selectedNode) return;
    setNodes((current) =>
      current.map((node) => (node.id === selectedNode.id ? { ...node, ...patch } : node))
    );
  };

  const updateSelectedConnection = (patch) => {
    if (!selectedConnection) return;
    setConnections((current) =>
      current.map((connection) =>
        connection.id === selectedConnection.id ? { ...connection, ...patch } : connection
      )
    );
  };

  const deleteSelectedNode = async () => {
    if (!selectedNode || readOnly) return;

    const confirmed = await confirmAction({
      title: "Delete equipment?",
      message: `Remove ${selectedNode.label} and all pipelines connected to it?`,
      confirmLabel: "Delete",
      tone: "danger",
    });

    if (!confirmed) return;

    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setConnections((current) =>
      current.filter(
        (connection) =>
          connection.source !== selectedNode.id && connection.target !== selectedNode.id
      )
    );
    setSelectedNodeId(null);
  };

  const deleteSelectedConnection = () => {
    if (!selectedConnection || readOnly) return;
    setConnections((current) =>
      current.filter((connection) => connection.id !== selectedConnection.id)
    );
    setSelectedConnectionId(null);
  };

  const saveTopology = () => {
    localStorage.setItem(
      getStoredTopologyKey(template?.id),
      JSON.stringify({ nodes, connections, mode })
    );
    notify("Plant simulation layout saved.", "success");
  };

  const resetTopology = async () => {
    if (readOnly) return;

    const confirmed = await confirmAction({
      title: "Reset plant layout?",
      message: "This replaces the current canvas with the starter steam topology.",
      confirmLabel: "Reset",
      tone: "danger",
    });

    if (!confirmed) return;

    const nextDemo = getInitialDemo();
    setNodes(nextDemo.nodes.map(normalizeNodeSize));
    setConnections(nextDemo.connections);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectFrom(null);
    notify("Plant layout reset.", "success");

    window.requestAnimationFrame(() => {
      centerCanvas("smooth");
    });
  };

  const renderConnection = (connection) => {
    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode) return null;

    const path = getEdgePath(sourceNode, targetNode);
    const media = PROCESS_MEDIA[connection.medium] || PROCESS_MEDIA.steam;
    const selected = connection.id === selectedConnectionId;
    const value = resolveConnectionValue(connection);
    const sourceWidth = getNodeWidth(sourceNode);
    const sourceHeight = getNodeHeight(sourceNode);
    const targetHeight = getNodeHeight(targetNode);

    const midX =
      (sourceNode.x +
        sourceWidth +
        targetNode.x) /
      2;

    const midY =
      (sourceNode.y +
        sourceHeight / 2 +
        targetNode.y +
        targetHeight / 2) /
      2;

    return (
      <g key={connection.id}>
        <ProcessPipeline
          id={connection.id}
          path={path}
          medium={connection.medium}
          value={value}
          label={connection.label || media.label}
          selected={selected}
          dark={dark}
          onSelect={(event) => {
            event.stopPropagation();
            setSelectedConnectionId(connection.id);
            setSelectedNodeId(null);
          }}
        />

        {(connection.label || connection.dataKey) && (
          <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
            <rect
              x="-48"
              y="-12"
              width="96"
              height="24"
              rx="8"
              fill={dark ? "#0B1328" : "#ffffff"}
              stroke={media.color}
              strokeOpacity="0.36"
            />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill={dark ? "#E8EDFF" : "#334155"}
            >
              {connection.label || media.label} {Number.isFinite(value) ? value.toFixed(1) : ""}
            </text>
          </g>
        )}
      </g>
    );
  };

  if (viewMode === "monitor") {
    return (
      <div className="process-simulator-page min-h-full bg-slate-100 text-slate-900 dark:bg-[#071124] dark:text-slate-100">
        <div className="mb-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#263657] dark:bg-[#0B1429] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 text-white">
              <Factory size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-slate-900 dark:text-[#E8EDFF]">
                Palm Oil Process Monitoring
              </h1>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-[#93A2C7]">
                SCADA-style process visualization using the same mapped live, historical, or simulated data as the dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-[#2C3C61] dark:bg-[#081022]">
              {["live", "hybrid", "fake"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-md px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide transition ${
                    mode === item
                      ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white"
                      : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-[#93A2C7] dark:hover:bg-[#15213D] dark:hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-semibold ${
                liveState === "connected"
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                  : liveState === "fake"
                  ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
                  : liveState === "stale"
                  ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-slate-300"
              }`}
            >
              <Database size={12} />
              {liveState === "connected"
                ? "Live connected"
                : liveState === "connecting"
                ? "Connecting"
                : liveState === "stale"
                ? "Last-known live data"
                : liveState === "unmapped"
                ? "No mapped live data"
                : "Fake data"}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => setViewMode("design")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-[#3A4A70] dark:bg-[#15213D] dark:text-[#E8EDFF] dark:hover:border-cyan-400/40 dark:hover:bg-[#1B2948]"
              >
                <Pencil size={12} /> Edit Process View
              </button>
            )}
          </div>
        </div>

        <ProcessMonitoringView
          nodes={nodes}
          connections={connections}
          history={history}
          liveState={liveState}
          lastLiveAt={lastLiveAt}
          mode={mode}
          clock={clock}
          resolveMetric={resolveMetric}
          resolveConnectionValue={resolveConnectionValue}
          dark={dark}
        />
      </div>
    );
  }

  return (
    <div className="process-simulator-page min-h-full text-slate-900 dark:text-slate-100">
      <div className="mb-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#2C3C61] dark:bg-[#0E172D] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
            <Factory size={19} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black text-slate-900 dark:text-[#E8EDFF]">
              Edit Plant Process View
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#93A2C7]">
              Design the process topology, bind equipment to mapped devices and fields, configure alarms, then switch to Monitor mode.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("monitor")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50 px-3 text-[10px] font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/15"
          >
            <Eye size={13} /> Monitor
          </button>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-[#2C3C61] dark:bg-[#081022]">
            {["live", "hybrid", "fake"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                  mode === item
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold ${
            liveState === "connected"
              ? "border-cyan-300/50 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"
              : liveState === "fake"
              ? "border-violet-300/50 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-slate-300"
          }`}>
            <Database size={12} />
            {liveState === "connected"
              ? "Live connected"
              : liveState === "connecting"
              ? "Connecting"
              : liveState === "stale"
              ? "Last-known live data"
              : liveState === "unmapped"
              ? "No mapped live data"
              : "Fake data"}
          </div>

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={saveTopology}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[11px] font-semibold text-white transition hover:bg-cyan-500"
              >
                <Save size={13} /> Save Layout
              </button>
              <button
                type="button"
                onClick={resetTopology}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-slate-200 dark:hover:bg-[#1B2948]"
              >
                <RefreshCw size={13} /> Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={`grid min-h-[720px] grid-cols-1 gap-2 ${
          libraryCollapsed && inspectorCollapsed
            ? "xl:grid-cols-[46px_minmax(0,1fr)_46px]"
            : libraryCollapsed
            ? "xl:grid-cols-[46px_minmax(0,1fr)_310px]"
            : inspectorCollapsed
            ? "xl:grid-cols-[250px_minmax(0,1fr)_46px]"
            : "xl:grid-cols-[250px_minmax(0,1fr)_310px]"
        }`}
      >
        <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-[width] dark:border-[#2C3C61] dark:bg-[#0E172D]">
          {libraryCollapsed ? (
            <div className="flex min-h-[46px] flex-row items-center justify-center gap-3 p-2 xl:min-h-[720px] xl:flex-col xl:justify-start xl:py-3">
              <button
                type="button"
                onClick={() => setLibraryCollapsed(false)}
                title="Expand equipment library"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-cyan-600 transition hover:bg-cyan-50 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-cyan-300 dark:hover:bg-[#1B2948]"
              >
                <ChevronRight size={15} />
              </button>
              <Layers size={16} className="text-cyan-500" />
              <span className="hidden [writing-mode:vertical-rl] rotate-180 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 xl:block">
                Equipment
              </span>
            </div>
          ) : (
            <>
          <div className="border-b border-slate-200 p-3 dark:border-[#263657]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold">Equipment Library</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Drag an item onto the plant canvas.</p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryCollapsed(true)}
                title="Minimize equipment library"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-[#2C3C61] dark:text-slate-300 dark:hover:bg-[#15213D] dark:hover:text-cyan-200"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Search equipment..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
              />
            </div>

            <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
              {EQUIPMENT_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`whitespace-nowrap rounded-md px-2 py-1 text-[9px] font-semibold ${
                    category === item
                      ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                      : "bg-slate-100 text-slate-500 dark:bg-[#15213D] dark:text-slate-400"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[650px] space-y-1.5 overflow-y-auto p-2">
            {filteredLibrary.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable={!readOnly}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-process-equipment", item.type);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onDoubleClick={() =>
                  addNodeAt(item.type)
                }
                className="group flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-[#2C3C61] dark:bg-[#111B34] dark:hover:border-cyan-400/30 dark:hover:bg-[#15213D]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                  <IndustrialEquipmentIcon type={item.type} className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">{item.label}</div>
                  <div className="truncate text-[9px] text-slate-400">{item.category}</div>
                </div>
              </button>
            ))}
          </div>
            </>
          )}
        </aside>

        <section className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-[#eef2f7] dark:border-[#2C3C61] dark:bg-[#081022]">
          <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur dark:border-[#2C3C61] dark:bg-[#0E172D]/95">
            <Workflow size={13} className="text-cyan-500" />
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {connectFrom ? "Choose the target input handle" : "Drag equipment or connect output → input"}
            </span>
            {connectFrom && (
              <button type="button" onClick={() => setConnectFrom(null)} className="text-slate-400 hover:text-rose-400">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="absolute right-3 top-3 z-30 inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-[#2C3C61] dark:bg-[#0E172D]/95">
            <button
              type="button"
              onClick={() =>
                setZoom((value) =>
                  clamp(
                    value - 0.1,
                    MIN_ZOOM,
                    MAX_ZOOM
                  )
                )
              }
              className="h-7 w-7 rounded-md text-sm font-bold hover:bg-slate-100 dark:hover:bg-[#15213D]"
              title="Zoom out"
            >
              −
            </button>

            <span className="w-12 text-center text-[9px] font-semibold text-slate-500 dark:text-slate-400">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() =>
                setZoom((value) =>
                  clamp(
                    value + 0.1,
                    MIN_ZOOM,
                    MAX_ZOOM
                  )
                )
              }
              className="h-7 w-7 rounded-md text-sm font-bold hover:bg-slate-100 dark:hover:bg-[#15213D]"
              title="Zoom in"
            >
              +
            </button>

            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-[#2C3C61]" />

            <button
              type="button"
              onClick={() =>
                centerCanvas("smooth")
              }
              className="h-7 rounded-md px-2 text-[9px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#15213D]"
              title="Center workspace"
            >
              Center
            </button>

            <button
              type="button"
              onClick={fitPlantToView}
              className="h-7 rounded-md px-2 text-[9px] font-bold text-cyan-700 hover:bg-cyan-50 dark:text-cyan-200 dark:hover:bg-[#15213D]"
              title="Fit all equipment into the viewport"
            >
              Fit
            </button>
          </div>

          <div
            ref={canvasRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              setSelectedNodeId(null);
              setSelectedConnectionId(null);
            }}
            className="h-[720px] overflow-auto"
          >
            <div style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom, position: "relative" }}>
              <div
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${zoom})`,
                  transformOrigin: "0 0",
                  position: "absolute",
                  inset: 0,
                  backgroundImage: dark
                    ? "radial-gradient(circle, rgba(88,215,255,.12) 1px, transparent 1px)"
                    : "radial-gradient(circle, rgba(71,85,105,.16) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              >
                <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 overflow-visible">
                  <defs>
                    {Object.entries(PROCESS_MEDIA).map(([key, media]) => (
                      <marker
                        key={key}
                        id={`arrow-${key}`}
                        markerWidth="8"
                        markerHeight="8"
                        refX="7"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 8 3.5, 0 7" fill={media.color} />
                      </marker>
                    ))}
                  </defs>
                  {connections.map(renderConnection)}
                </svg>

                {nodes.map((node) => {
                  const definition = EQUIPMENT_BY_TYPE[node.type] || EQUIPMENT_LIBRARY[0];
                  const selected = node.id === selectedNodeId;
                  const allMetrics = definition.metrics.map((metric) => ({
                    metric,
                    ...resolveMetric(node, metric),
                  }));
                  const nodeWidth = getNodeWidth(node);
                  const nodeHeight = getNodeHeight(node);

                  const metricLimit =
                    nodeHeight >= 220
                      ? 4
                      : nodeHeight >= 165
                      ? 3
                      : 2;

                  const metrics =
                    allMetrics.slice(
                      0,
                      metricLimit
                    );

                  const visualValues = Object.fromEntries(
                    allMetrics.map(
                      ({ metric, value }) => [
                        metric.id,
                        value,
                      ]
                    )
                  );

                  const visualColumnWidth = clamp(
                    nodeWidth * 0.42,
                    68,
                    118
                  );

                  return (
                    <div
                      key={node.id}
                      onPointerDown={(event) => startNodeDrag(event, node)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedNodeId(node.id);
                        setSelectedConnectionId(null);
                      }}
                      className={`absolute select-none rounded-2xl border shadow-lg transition-shadow ${
                        selected
                          ? "border-cyan-400 ring-2 ring-cyan-400/20"
                          : "border-slate-300 dark:border-[#34476F]"
                      } bg-white dark:bg-[#0E172D]`}
                      style={{
                        width: nodeWidth,
                        height: nodeHeight,
                        left: node.x,
                        top: node.y,
                      }}
                    >
                      <button
                        type="button"
                        title="Input - click after choosing a source output"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          completeConnection(node.id);
                        }}
                        className={`absolute -left-2.5 top-1/2 z-20 h-5 w-5 -translate-y-1/2 rounded-full border-2 shadow-sm transition ${
                          connectFrom
                            ? "border-cyan-300 bg-cyan-500"
                            : "border-slate-300 bg-white dark:border-[#4A5B81] dark:bg-[#15213D]"
                        }`}
                      />

                      <button
                        type="button"
                        title="Output - start pipeline connection"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (readOnly) return;
                          setConnectFrom(node.id);
                          setSelectedNodeId(node.id);
                        }}
                        className={`absolute -right-2.5 top-1/2 z-20 h-5 w-5 -translate-y-1/2 rounded-full border-2 shadow-sm transition ${
                          connectFrom === node.id
                            ? "border-violet-200 bg-violet-500 ring-4 ring-violet-500/20"
                            : "border-cyan-300 bg-cyan-500"
                        }`}
                      />

                      <div className="flex h-full flex-col p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div
                              className="truncate text-[11px] font-black text-slate-900 dark:text-[#E8EDFF]"
                              title={node.label}
                            >
                              {node.label}
                            </div>
                            <div className="mt-0.5 truncate text-[8px] uppercase tracking-wide text-slate-400">
                              {definition.label}
                            </div>
                            {node.deviceId && (
                              <div
                                className="mt-0.5 max-w-[122px] truncate text-[7px] font-semibold text-cyan-600 dark:text-cyan-300"
                                title={getDeviceLabel(node.deviceId)}
                              >
                                {getDeviceLabel(node.deviceId)}
                              </div>
                            )}
                          </div>
                          <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                            {mode}
                          </span>
                        </div>

                        <div
                          className="mt-1 grid min-h-0 flex-1 gap-2"
                          style={{
                            gridTemplateColumns: `${visualColumnWidth}px minmax(0, 1fr)`,
                          }}
                        >
                          <div className="min-h-0 rounded-xl bg-slate-100/70 p-1 text-cyan-600 dark:bg-[#111B34] dark:text-cyan-300">
                            <ProcessEquipmentVisual
                              type={node.type}
                              values={visualValues}
                            />
                          </div>

                          <div className="flex min-w-0 flex-col justify-center gap-1">
                            {metrics.length === 0 ? (
                              <div className="rounded-lg bg-slate-100 px-2 py-1.5 text-center text-[9px] text-slate-400 dark:bg-[#15213D]">
                                Flow junction
                              </div>
                            ) : (
                              metrics.map(({ metric, value, source }) => (
                                <div
                                  key={metric.id}
                                  className="min-w-0 rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-[#15213D]"
                                >
                                  <div className="truncate text-[8px] text-slate-400">
                                    {metric.label}
                                  </div>
                                  <div className="mt-0.5 flex items-baseline gap-1">
                                    <span className="truncate text-[10px] font-black text-slate-800 dark:text-slate-100">
                                      {formatMetricValue(value, metric)}
                                    </span>
                                    <span className="text-[7px] text-slate-400">
                                      {metric.unit}
                                    </span>
                                    <span
                                      title={source === "live" ? "Live data" : source === "fake" ? "Simulated data" : "No data"}
                                      className={`ml-auto h-1.5 w-1.5 rounded-full ${
                                        source === "live"
                                          ? "bg-cyan-400"
                                          : source === "fake"
                                          ? "bg-violet-400"
                                          : "bg-slate-500"
                                      }`}
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {!readOnly && selected && (
                        <button
                          type="button"
                          title="Drag to resize equipment"
                          onPointerDown={(event) =>
                            startNodeResize(
                              event,
                              node
                            )
                          }
                          className="
                            absolute
                            -bottom-1.5 -right-1.5
                            z-30
                            flex h-5 w-5
                            cursor-se-resize
                            items-center justify-center
                            rounded-md
                            border border-cyan-300
                            bg-white
                            text-[11px] font-black
                            leading-none text-cyan-600
                            shadow-sm
                            transition
                            hover:bg-cyan-50
                            dark:border-cyan-400/40
                            dark:bg-[#15213D]
                            dark:text-cyan-200
                            dark:hover:bg-[#1B2948]
                          "
                          style={{
                            touchAction: "none",
                          }}
                        >
                          ↘
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-[width] dark:border-[#2C3C61] dark:bg-[#0E172D]">
          {inspectorCollapsed ? (
            <div className="flex min-h-[46px] flex-row items-center justify-center gap-3 p-2 xl:min-h-[720px] xl:flex-col xl:justify-start xl:py-3">
              <button
                type="button"
                onClick={() => setInspectorCollapsed(false)}
                title="Expand inspector"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-violet-600 transition hover:bg-violet-50 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-violet-300 dark:hover:bg-[#1B2948]"
              >
                <ChevronLeft size={15} />
              </button>
              <Settings size={16} className="text-violet-400" />
              <span className="hidden [writing-mode:vertical-rl] text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 xl:block">
                Inspector
              </span>
            </div>
          ) : (
            <>
          <div className="border-b border-slate-200 p-3 dark:border-[#263657]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Settings size={15} className="shrink-0 text-violet-400" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Inspector</h2>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">Configure equipment, devices, and pipelines.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectorCollapsed(true)}
                title="Minimize inspector"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-[#2C3C61] dark:text-slate-300 dark:hover:bg-[#15213D] dark:hover:text-violet-200"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[665px] overflow-y-auto p-3">
            {!selectedNode && !selectedConnection ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center dark:border-[#34476F]">
                <Factory size={26} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-300">Select equipment or a pipeline</p>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Equipment can bind to any data source already mapped in the current dashboard template.</p>
              </div>
            ) : selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-[#111B34]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                    <IndustrialEquipmentIcon type={selectedNode.type} className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold">{EQUIPMENT_BY_TYPE[selectedNode.type]?.label}</div>
                    <div className="text-[9px] text-slate-400">Node ID: {selectedNode.id.slice(-8)}</div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Display Name</span>
                  <input
                    value={selectedNode.label}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedNode({ label: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                  />
                </label>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Equipment Size
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedNode({
                            width:
                              DEFAULT_NODE_WIDTH,
                            height:
                              DEFAULT_NODE_HEIGHT,
                          })
                        }
                        className="text-[8px] font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300"
                      >
                        Reset size
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[8px] text-slate-400">
                        Width
                      </span>
                      <input
                        type="number"
                        min={MIN_NODE_WIDTH}
                        max={MAX_NODE_WIDTH}
                        value={Math.round(
                          getNodeWidth(
                            selectedNode
                          )
                        )}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateSelectedNode({
                            width: clamp(
                              Number(
                                event.target.value
                              ) ||
                                DEFAULT_NODE_WIDTH,
                              MIN_NODE_WIDTH,
                              Math.min(
                                MAX_NODE_WIDTH,
                                CANVAS_WIDTH -
                                  selectedNode.x -
                                  8
                              )
                            ),
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[8px] text-slate-400">
                        Height
                      </span>
                      <input
                        type="number"
                        min={MIN_NODE_HEIGHT}
                        max={MAX_NODE_HEIGHT}
                        value={Math.round(
                          getNodeHeight(
                            selectedNode
                          )
                        )}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateSelectedNode({
                            height: clamp(
                              Number(
                                event.target.value
                              ) ||
                                DEFAULT_NODE_HEIGHT,
                              MIN_NODE_HEIGHT,
                              Math.min(
                                MAX_NODE_HEIGHT,
                                CANVAS_HEIGHT -
                                  selectedNode.y -
                                  8
                              )
                            ),
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                      />
                    </label>
                  </div>

                  <p className="mt-1 text-[8px] leading-relaxed text-slate-400">
                    Select the equipment and drag the ↘ handle on its bottom-right corner, or enter an exact size here.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Device</span>
                  <select
                    value={selectedNode.deviceId || ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateSelectedNode({ deviceId: event.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="">Any mapped device</option>
                    {mappedDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name === device.id
                          ? `${device.id} · ${device.fields} fields`
                          : `${device.name} · ${device.id} · ${device.fields} fields`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[8px] leading-relaxed text-slate-400">
                    Selecting a device filters the field choices below. Each equipment item can use a different device.
                  </p>
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Data Bindings</span>
                    <span className="text-[8px] text-slate-400">
                      {getDeviceDataOptions(selectedNode.deviceId).length} available fields
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(EQUIPMENT_BY_TYPE[selectedNode.type]?.metrics || []).map((metric) => {
                      const resolved = resolveMetric(selectedNode, metric);
                      const currentBinding = selectedNode.bindings?.[metric.id] || "";
                      const bindingOptions = getDeviceDataOptions(
                        selectedNode.deviceId,
                        currentBinding
                      );

                      return (
                        <div key={metric.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2C3C61] dark:bg-[#111B34]">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-bold">{metric.label}</div>
                              <div className="text-[8px] text-slate-400">{formatMetricValue(resolved.value, metric)} {metric.unit} · {resolved.source}</div>
                            </div>
                          </div>
                          <select
                            value={currentBinding}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateSelectedNode({
                                bindings: {
                                  ...(selectedNode.bindings || {}),
                                  [metric.id]: event.target.value,
                                },
                              })
                            }
                            className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                          >
                            <option value="">Fake / unbound</option>
                            {bindingOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label} ({option.key})
                              </option>
                            ))}
                          </select>

                          {metric.kind !== "status" && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="mb-1 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
                                  Warning
                                </span>
                                <input
                                  type="number"
                                  value={
                                    selectedNode.thresholds?.[metric.id]?.warning ?? ""
                                  }
                                  disabled={readOnly}
                                  placeholder="Optional"
                                  onChange={(event) =>
                                    updateSelectedNode({
                                      thresholds: {
                                        ...(selectedNode.thresholds || {}),
                                        [metric.id]: {
                                          ...(selectedNode.thresholds?.[metric.id] || {}),
                                          warning: event.target.value,
                                        },
                                      },
                                    })
                                  }
                                  className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[9px] outline-none focus:border-amber-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
                                  Danger
                                </span>
                                <input
                                  type="number"
                                  value={
                                    selectedNode.thresholds?.[metric.id]?.danger ?? ""
                                  }
                                  disabled={readOnly}
                                  placeholder="Optional"
                                  onChange={(event) =>
                                    updateSelectedNode({
                                      thresholds: {
                                        ...(selectedNode.thresholds || {}),
                                        [metric.id]: {
                                          ...(selectedNode.thresholds?.[metric.id] || {}),
                                          danger: event.target.value,
                                        },
                                      },
                                    })
                                  }
                                  className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[9px] outline-none focus:border-rose-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={deleteSelectedNode}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-400/15 dark:text-rose-300"
                  >
                    <Trash2 size={13} /> Delete Equipment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#111B34]">
                  <div className="flex items-center gap-2">
                    <Workflow size={15} className="text-cyan-500" />
                    <div>
                      <div className="text-[11px] font-bold">Pipeline</div>
                      <div className="text-[9px] text-slate-400">{selectedConnection.source} → {selectedConnection.target}</div>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Label</span>
                  <input
                    value={selectedConnection.label || ""}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedConnection({ label: event.target.value })}
                    placeholder="e.g. Main Steam Header"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Medium</span>
                  <select
                    value={selectedConnection.medium}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedConnection({ medium: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    {Object.entries(PROCESS_MEDIA).map(([key, media]) => (
                      <option key={key} value={key}>{media.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Device</span>
                  <select
                    value={selectedConnection.deviceId || ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateSelectedConnection({ deviceId: event.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="">Any mapped device</option>
                    {mappedDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name === device.id
                          ? `${device.id} · ${device.fields} fields`
                          : `${device.name} · ${device.id} · ${device.fields} fields`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Flow Data</span>
                  <select
                    value={selectedConnection.dataKey || ""}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedConnection({ dataKey: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="">Simulated flow</option>
                    {getDeviceDataOptions(
                      selectedConnection.deviceId,
                      selectedConnection.dataKey
                    ).map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label} ({option.key})
                      </option>
                    ))}
                  </select>
                </label>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={deleteSelectedConnection}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-400/15 dark:text-rose-300"
                  >
                    <Trash2 size={13} /> Delete Pipeline
                  </button>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </aside>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] text-slate-500 dark:border-[#2C3C61] dark:bg-[#0E172D] dark:text-slate-400">
        <span>
          {nodes.length} equipment · {connections.length} pipelines · {mappedDevices.length} mapped devices · {availableDataOptions.length} mapped live fields
        </span>
        <span>
          {readOnly
            ? "Viewer mode - topology editing disabled"
            : "Tip: double-click adds equipment at the current viewport center · select a node and drag ↘ to resize · configure warning/danger limits for Monitor mode"}
          {lastLiveAt ? ` · Live ${new Date(lastLiveAt).toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  );
}

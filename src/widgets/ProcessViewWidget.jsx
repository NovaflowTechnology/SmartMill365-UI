import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Cable,
  Cpu,
  Database,
  Factory,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import ProcessPipeline from "../process/ProcessPipeline";
import {
  EQUIPMENT_BY_TYPE,
  PROCESS_MEDIA,
} from "../process/equipmentLibrary";
import "../process/processVisualization.css";

const DEFAULT_NODE_WIDTH = 196;
const DEFAULT_NODE_HEIGHT = 126;

export const DEFAULT_PROCESS_VIEW_CONFIG = {
  templateId: null,
  mode: "inherit",
  showLabels: true,
  showMetrics: true,
  showFlowLabels: true,
  showInspector: true,
};

export const normalizeProcessViewConfig = (config = {}) => ({
  ...DEFAULT_PROCESS_VIEW_CONFIG,
  ...(config || {}),
  mode: ["inherit", "live", "hybrid", "fake"].includes(config?.mode)
    ? config.mode
    : "inherit",
  showLabels: config?.showLabels !== false,
  showMetrics: config?.showMetrics !== false,
  showFlowLabels: config?.showFlowLabels !== false,
  showInspector: config?.showInspector !== false,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getNodeWidth = (node) =>
  clamp(Number(node?.width) || DEFAULT_NODE_WIDTH, 120, 480);

const getNodeHeight = (node) =>
  clamp(Number(node?.height) || DEFAULT_NODE_HEIGHT, 90, 340);

const getStoredTopologyKey = (templateId) =>
  `palm-oil-process-simulator:${String(templateId || "standalone")}`;

const LATEST_TOPOLOGY_KEY = "palm-oil-process-simulator:last-saved";

const readStoredTopology = (storageKey) => {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");

    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.connections)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const readFirstStoredTopology = (storageKeys = []) => {
  for (const key of storageKeys) {
    const topology = readStoredTopology(key);

    if (topology && Array.isArray(topology.nodes) && topology.nodes.length > 0) {
      return { topology, storageKey: key };
    }
  }

  return {
    topology: null,
    storageKey: storageKeys[0] || "",
  };
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
  const seed = hashText(`${nodeId}:${metric?.id || "metric"}`);

  if (metric?.kind === "status") {
    return Math.sin(clock / 11000 + seed) > -0.72 ? 1 : 0;
  }

  const minimum = Number(metric?.min ?? 0);
  const maximum = Number(metric?.max ?? minimum + 100);
  const span = Math.max(0.0001, maximum - minimum);
  const midpoint = minimum + span * 0.52;
  const amplitude = span * 0.15;

  return Number(
    clamp(
      midpoint + Math.sin(clock / 5200 + seed * 0.0017) * amplitude,
      minimum,
      maximum
    ).toFixed(1)
  );
};

const formatMetricValue = (value, metric) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (metric?.kind === "status") {
    return Number(value) === 1 ? "ON" : "OFF";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const getEdgeGeometry = (sourceNode, targetNode, minX, minY) => {
  const sourceX = Number(sourceNode.x || 0) - minX + getNodeWidth(sourceNode);
  const sourceY =
    Number(sourceNode.y || 0) - minY + getNodeHeight(sourceNode) / 2;

  const targetX = Number(targetNode.x || 0) - minX;
  const targetY =
    Number(targetNode.y || 0) - minY + getNodeHeight(targetNode) / 2;

  const distance = Math.max(70, Math.abs(targetX - sourceX) * 0.48);

  return {
    sourceX,
    sourceY,
    targetX,
    targetY,
    midX: (sourceX + targetX) / 2,
    midY: (sourceY + targetY) / 2,
    path: `M ${sourceX} ${sourceY} C ${sourceX + distance} ${sourceY}, ${
      targetX - distance
    } ${targetY}, ${targetX} ${targetY}`,
  };
};

const useDarkMode = () => {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const update = () =>
      setDark(document.documentElement.classList.contains("dark"));

    update();

    const observer = new MutationObserver(update);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return dark;
};

export default function ProcessViewWidget({ data = {}, item = {} }) {
  const rootRef = useRef(null);
  const lastTopologyTextRef = useRef("");

  const config = useMemo(
    () => normalizeProcessViewConfig(item?.processViewConfig || {}),
    [item?.processViewConfig]
  );

  const candidateStorageKeys = useMemo(
    () =>
      Array.from(
        new Set(
          [
            config.templateId ? getStoredTopologyKey(config.templateId) : null,
            LATEST_TOPOLOGY_KEY,
            getStoredTopologyKey(null),
          ].filter(Boolean)
        )
      ),
    [config.templateId]
  );

  const initialStoredTopology = useMemo(
    () => readFirstStoredTopology(candidateStorageKeys),
    [candidateStorageKeys]
  );

  const [topology, setTopology] = useState(() => initialStoredTopology.topology);
  const [activeStorageKey, setActiveStorageKey] = useState(
    () => initialStoredTopology.storageKey
  );
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [clock, setClock] = useState(Date.now());
  const dark = useDarkMode();

  const refreshTopology = () => {
    if (typeof window === "undefined") return;

    const fingerprint = candidateStorageKeys
      .map((key) => `${key}:${window.localStorage.getItem(key) || ""}`)
      .join("\n");

    if (fingerprint === lastTopologyTextRef.current) {
      return;
    }

    lastTopologyTextRef.current = fingerprint;

    const next = readFirstStoredTopology(candidateStorageKeys);
    setTopology(next.topology);
    setActiveStorageKey(next.storageKey || "");
  };

  useEffect(() => {
    lastTopologyTextRef.current = "";
    refreshTopology();

    const timer = window.setInterval(refreshTopology, 900);

    const handleStorage = (event) => {
      if (candidateStorageKeys.includes(event.key)) {
        refreshTopology();
      }
    };

    const handleProcessSaved = () => {
      lastTopologyTextRef.current = "";
      refreshTopology();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("palm-oil-process-topology-saved", handleProcessSaved);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "palm-oil-process-topology-saved",
        handleProcessSaved
      );
    };
  }, [candidateStorageKeys]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(260, rect.width),
        height: Math.max(160, rect.height),
      });
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const resolvedMode = config.mode === "inherit" ? topology?.mode || "hybrid" : config.mode;

  useEffect(() => {
    if (resolvedMode !== "fake" && resolvedMode !== "hybrid") {
      return undefined;
    }

    const timer = window.setInterval(() => setClock(Date.now()), 1500);
    return () => window.clearInterval(timer);
  }, [resolvedMode]);

  const nodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
  const connections = Array.isArray(topology?.connections) ? topology.connections : [];

  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ||
    nodes.find((node) => node.id === nodes[0]?.id) ||
    null;

  const inspectorVisible = config.showInspector && size.width >= 760 && size.height >= 250;
  const inspectorWidth = inspectorVisible ? (size.width >= 1120 ? 270 : 236) : 0;
  const diagramWidth = Math.max(260, size.width - inspectorWidth);

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const bounds = useMemo(() => {
    if (!nodes.length) {
      return { minX: 0, minY: 0, width: 1000, height: 600 };
    }

    const minX = Math.min(...nodes.map((node) => Number(node?.x || 0)));
    const minY = Math.min(...nodes.map((node) => Number(node?.y || 0)));
    const maxX = Math.max(...nodes.map((node) => Number(node?.x || 0) + getNodeWidth(node)));
    const maxY = Math.max(...nodes.map((node) => Number(node?.y || 0) + getNodeHeight(node)));

    return {
      minX,
      minY,
      width: Math.max(240, maxX - minX),
      height: Math.max(160, maxY - minY),
    };
  }, [nodes]);

  const fit = useMemo(() => {
    const paddingX = inspectorVisible ? 10 : 14;
    const paddingY = 10;
    const availableWidth = Math.max(80, diagramWidth - paddingX * 2);
    const availableHeight = Math.max(80, size.height - paddingY * 2);
    const widthScale = availableWidth / bounds.width;
    const heightScale = availableHeight / bounds.height;
    const maxScale = inspectorVisible ? 1.55 : 1.8;
    const scale = Math.min(widthScale, heightScale, maxScale);

    return {
      scale,
      x: (diagramWidth - bounds.width * scale) / 2,
      y: (size.height - bounds.height * scale) / 2,
    };
  }, [bounds, diagramWidth, size.height, inspectorVisible]);

  const resolveMetric = (node, metric) => {
    const dataKey = node?.bindings?.[metric.id] || "";

    const liveValue =
      dataKey && data?.[dataKey] !== undefined && data?.[dataKey] !== null
        ? data[dataKey]
        : null;

    if (resolvedMode === "live") {
      return liveValue;
    }

    if (resolvedMode === "hybrid" && liveValue !== null) {
      return liveValue;
    }

    return fakeMetricValue(node.id, metric, clock);
  };

  const resolveConnectionValue = (connection) => {
    if (
      connection?.dataKey &&
      data?.[connection.dataKey] !== undefined &&
      data?.[connection.dataKey] !== null &&
      resolvedMode !== "fake"
    ) {
      return Number(data[connection.dataKey]);
    }

    if (resolvedMode === "live") {
      return null;
    }

    const seed = hashText(connection?.id || "flow");

    return Number((20 + Math.abs(Math.sin(clock / 4200 + seed * 0.001)) * 60).toFixed(1));
  };

  const selectedDefinition = selectedNode ? EQUIPMENT_BY_TYPE?.[selectedNode.type] || {} : null;

  const getNodeMetricRows = (node) => {
    const definition = EQUIPMENT_BY_TYPE?.[node.type] || {};
    const metrics = Array.isArray(definition?.metrics) ? definition.metrics : [];
    return metrics.map((metric) => ({
      metric,
      value: resolveMetric(node, metric),
      dataKey: node?.bindings?.[metric.id] || "",
    }));
  };

  const selectedMetricRows = selectedNode ? getNodeMetricRows(selectedNode) : [];

  const equipmentDataCards = nodes.map((node) => {
    const definition = EQUIPMENT_BY_TYPE?.[node.type] || {};
    const rows = getNodeMetricRows(node).filter(
      ({ value }) => value !== null && value !== undefined
    );

    return {
      node,
      definition,
      rows,
      compactRows: rows.slice(0, 2),
    };
  });

  const mappedEquipmentCount = nodes.filter((node) => Boolean(node?.deviceId)).length;

  const topologySourceLabel =
    activeStorageKey === LATEST_TOPOLOGY_KEY
      ? "Latest saved layout"
      : activeStorageKey === getStoredTopologyKey(null)
      ? "Standalone layout"
      : config.templateId
      ? `Template ${config.templateId}`
      : "Saved layout";

  const lastSavedLabel = topology?.savedAt
    ? new Date(topology.savedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  if (!nodes.length) {
    return (
      <div
        ref={rootRef}
        className="dashboard-widget-surface relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-white p-4 text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:bg-[#111C34] dark:text-slate-100"
      >
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300">
            <Factory size={20} />
          </div>

          <div className="mt-3 text-sm font-bold">No saved process layout</div>

          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Open Plant Simulator, arrange the equipment and pipelines, then press
            Save. This dashboard widget will load it automatically.
          </p>

          <button
            type="button"
            onClick={refreshTopology}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onClick={() => setSelectedNodeId(null)}
      className="dashboard-widget-surface relative h-full w-full overflow-hidden rounded-[11px] bg-[#F7FAFD] shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:bg-[#0B1429] dark:shadow-[0_4px_14px_rgba(0,0,0,0.24)]"
    >
      <div className="pointer-events-none absolute left-3 top-2.5 z-30 rounded-lg bg-white/85 px-2 py-1 backdrop-blur dark:bg-[#0B1429]/85">
        <div className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
          {item?.label || "Process View"}
        </div>
        <div className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-400">
          {resolvedMode}
        </div>
      </div>

      <div
        className="absolute left-0 top-0"
        style={{
          width: bounds.width,
          height: bounds.height,
          transformOrigin: "top left",
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            {Object.entries(PROCESS_MEDIA).map(([key, medium]) => (
              <marker
                key={key}
                id={`monitor-arrow-${key}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={medium.color} />
              </marker>
            ))}
          </defs>

          {connections.map((connection) => {
            const source = nodes.find((node) => node.id === connection.source);
            const target = nodes.find((node) => node.id === connection.target);
            if (!source || !target) return null;

            const geometry = getEdgeGeometry(source, target, bounds.minX, bounds.minY);
            const flowValue = resolveConnectionValue(connection);

            return (
              <g key={connection.id}>
                <ProcessPipeline
                  id={connection.id}
                  path={geometry.path}
                  medium={connection.medium || "steam"}
                  value={flowValue}
                  label={connection.label}
                  variant="monitor"
                  dark={dark}
                  connectionStyle={connection.connectionStyle || "pipe-icons"}
                />

                {config.showFlowLabels && (connection.label || Number.isFinite(Number(flowValue))) && (
                  <g>
                    <rect
                      x={geometry.midX - 45}
                      y={geometry.midY - 12}
                      width="90"
                      height="24"
                      rx="12"
                      fill={dark ? "#111C34" : "#FFFFFF"}
                      stroke={dark ? "#334155" : "#D8E2EF"}
                    />

                    <text
                      x={geometry.midX}
                      y={geometry.midY + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill={dark ? "#E2E8F0" : "#334155"}
                    >
                      {connection.label ||
                        (Number.isFinite(Number(flowValue))
                          ? Number(flowValue).toFixed(1)
                          : "Flow")}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const definition = EQUIPMENT_BY_TYPE?.[node.type] || {};
          const metrics = Array.isArray(definition.metrics) ? definition.metrics : [];
          const resolvedMetrics = metrics
            .map((metric) => ({ metric, value: resolveMetric(node, metric) }))
            .filter(({ value }) => value !== null && value !== undefined);

          const visualValues = Object.fromEntries(
            resolvedMetrics.map(({ metric, value }) => [metric.id, value])
          );
          const shownMetrics = resolvedMetrics.slice(0, 2);

          return (
            <div
              key={node.id}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedNodeId(node.id);
              }}
              className={`absolute cursor-pointer overflow-hidden rounded-xl border bg-white/95 shadow-[0_5px_16px_rgba(15,23,42,0.10)] transition dark:bg-[#111C34]/95 dark:shadow-[0_8px_20px_rgba(0,0,0,0.26)] ${
                selectedNodeId === node.id
                  ? "border-cyan-400 ring-2 ring-cyan-300/50 dark:border-cyan-400 dark:ring-cyan-400/30"
                  : "border-slate-200 hover:border-cyan-300 dark:border-[#2B3B60] dark:hover:border-cyan-500"
              }`}
              style={{
                left: Number(node.x || 0) - bounds.minX,
                top: Number(node.y || 0) - bounds.minY,
                width: getNodeWidth(node),
                height: getNodeHeight(node),
              }}
            >
              {config.showLabels && (
                <div className="flex h-[28px] items-center justify-between gap-2 border-b border-slate-100 px-2.5 dark:border-[#263657]">
                  <span className="min-w-0 truncate text-[10px] font-black text-slate-800 dark:text-slate-100">
                    {node.label || definition.label || node.type}
                  </span>

                  {node.deviceId && (
                    <span className="max-w-[92px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[7px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                      {node.deviceId}
                    </span>
                  )}
                </div>
              )}

              <div
                className="relative"
                style={{
                  height:
                    getNodeHeight(node) -
                    (config.showLabels ? 28 : 0) -
                    (config.showMetrics && shownMetrics.length ? 28 : 0),
                }}
              >
                <ProcessEquipmentVisual type={node.type} values={visualValues} monitoring dark={dark} />
              </div>

              {config.showMetrics && shownMetrics.length > 0 && (
                <div className="flex h-[28px] items-center gap-1 border-t border-slate-100 px-2 dark:border-[#263657]">
                  {shownMetrics.map(({ metric, value }) => (
                    <div
                      key={metric.id}
                      className="min-w-0 flex-1 truncate rounded-md bg-slate-50 px-1.5 py-1 text-center dark:bg-[#0B1429]"
                      title={metric.label}
                    >
                      <span className="text-[7px] font-semibold text-slate-400">{metric.label}</span>{" "}
                      <span className="text-[8px] font-black text-slate-700 dark:text-slate-200">
                        {formatMetricValue(value, metric)}
                        {metric.unit ? ` ${metric.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {inspectorVisible && (
        <aside
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 top-0 z-40 flex h-full flex-col border-l border-slate-200 bg-white/95 shadow-[-10px_0_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#2B3B60] dark:bg-[#0E172D]/97 dark:shadow-[-12px_0_32px_rgba(0,0,0,0.20)]"
          style={{ width: inspectorWidth }}
        >
          <div className="shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-[#263657]">
            <div className="truncate text-[11px] font-black text-slate-900 dark:text-slate-100">
              System Summary
            </div>
            <div className="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Process overview
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Cpu size={13} className="text-cyan-500" />
                  <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-white">
                    {nodes.length}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Equipment
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Database size={13} className="text-violet-500" />
                  <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-white">
                    {mappedEquipmentCount}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Mapped
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Cable size={13} className="text-amber-500" />
                  <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-white">
                    {connections.length}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Flow Links
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Activity size={13} className="text-emerald-500" />
                  <div className="mt-2 truncate text-[11px] font-black uppercase text-slate-900 dark:text-white">
                    {resolvedMode}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Data Mode
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                <div className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Layout Source
                </div>
                <div className="mt-1 text-[9px] font-bold text-slate-700 dark:text-slate-200">
                  {topologySourceLabel}
                </div>
                <div className="mt-1 text-[8px] text-slate-400">Saved: {lastSavedLabel}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      Device Data Details
                    </div>
                    <div className="mt-1 text-[9px] font-bold text-slate-700 dark:text-slate-200">
                      {selectedNode
                        ? selectedNode.label || selectedDefinition?.label || selectedNode.type
                        : "Select equipment"}
                    </div>
                  </div>
                  {selectedNode && (
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(null)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[8px] font-bold text-slate-500 hover:bg-slate-50 dark:border-[#2B3B60] dark:text-slate-300 dark:hover:bg-[#0B1429]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedNode ? (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 p-2 dark:border-cyan-400/15 dark:bg-cyan-400/[0.06]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-600 shadow-sm dark:bg-[#111C34] dark:text-cyan-300">
                          <Factory size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[9px] font-black text-slate-800 dark:text-slate-100">
                            {selectedNode.label || selectedDefinition?.label || selectedNode.type}
                          </div>
                          <div className="mt-0.5 truncate text-[8px] text-slate-400">
                            {selectedNode.deviceId || "No device assigned"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {selectedMetricRows.length ? (
                        selectedMetricRows.map(({ metric, value, dataKey }) => (
                          <div
                            key={metric.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-[#2B3B60] dark:bg-[#0B1429]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-[8px] font-semibold text-slate-500 dark:text-slate-400">
                                  {metric.label}
                                </div>
                                <div className="mt-0.5 truncate font-mono text-[7px] text-slate-400 dark:text-slate-500">
                                  {dataKey || (resolvedMode === "fake" ? "Simulated" : "No mapped field")}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="text-[12px] font-black text-slate-800 dark:text-white">
                                  {formatMetricValue(value, metric)}
                                </span>
                                {metric.unit && (
                                  <span className="ml-1 text-[7px] font-semibold text-slate-400">
                                    {metric.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[8px] text-slate-400 dark:border-slate-700">
                          No measurements are defined for this equipment type.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-cyan-200 bg-cyan-50/50 px-3 py-3 text-[8px] leading-4 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/[0.05] dark:text-cyan-200">
                    Click any equipment in the process flow to inspect its device ID, mapped fields, and current values.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Equipment Quick Data
                </div>
                <div className="space-y-1.5">
                  {equipmentDataCards.map(({ node, compactRows }) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-full rounded-xl border px-2.5 py-2 text-left transition ${
                        selectedNodeId === node.id
                          ? "border-cyan-300 bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-400/[0.06]"
                          : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-[#2B3B60] dark:bg-[#111C34] dark:hover:border-cyan-500/30 dark:hover:bg-[#15213B]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[9px] font-black text-slate-800 dark:text-slate-100">
                            {node.label || node.type}
                          </div>
                          <div className="mt-0.5 truncate text-[7px] text-slate-400">
                            {node.deviceId || "No device assigned"}
                          </div>
                        </div>
                        <ChevronRight size={12} className="mt-0.5 shrink-0 text-slate-300" />
                      </div>

                      {compactRows.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {compactRows.map(({ metric, value }) => (
                            <div
                              key={metric.id}
                              className="rounded-md bg-white px-1.5 py-1 dark:bg-[#0B1429]"
                            >
                              <div className="truncate text-[7px] font-semibold text-slate-400">
                                {metric.label}
                              </div>
                              <div className="truncate text-[8px] font-black text-slate-700 dark:text-slate-200">
                                {formatMetricValue(value, metric)}
                                {metric.unit ? ` ${metric.unit}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

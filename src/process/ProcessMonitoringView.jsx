import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Thermometer,
  Waves,
  X,
} from "lucide-react";
import ProcessEquipmentVisual from "./ProcessEquipmentVisual";
import ProcessPipeline from "./ProcessPipeline";
import ProcessTrendPanel from "./ProcessTrendPanel";
import { EQUIPMENT_BY_TYPE, PROCESS_MEDIA } from "./equipmentLibrary";

const SERIES_COLORS = [
  "#58D7FF",
  "#7D75E7",
  "#A86BDF",
  "#FF6F88",
  "#FFD66B",
  "#4D91C9",
];

const finite = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const nodeWidth = (node) =>
  clamp(Number(node?.width) || 196, 150, 420);

const nodeHeight = (node) =>
  clamp(Number(node?.height) || 126, 105, 300);

const edgePath = (sourceNode, targetNode) => {
  const sourceX = sourceNode.x + nodeWidth(sourceNode);
  const sourceY = sourceNode.y + nodeHeight(sourceNode) / 2;
  const targetX = targetNode.x;
  const targetY = targetNode.y + nodeHeight(targetNode) / 2;
  const distance = Math.max(
    70,
    Math.abs(targetX - sourceX) * 0.48
  );

  return `M ${sourceX} ${sourceY} C ${sourceX + distance} ${sourceY}, ${targetX - distance} ${targetY}, ${targetX} ${targetY}`;
};

const formatValue = (value, metric) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (metric?.kind === "status") {
    return Number(value) === 1 ? "ON" : "OFF";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(1);
};

const getMetric = (node, id) =>
  (EQUIPMENT_BY_TYPE[node?.type]?.metrics || []).find(
    (metric) => metric.id === id
  );

const getThreshold = (node, metricId, type) => {
  const value = node?.thresholds?.[metricId]?.[type];
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getMetricAlarm = (node, metric, value) => {
  const numeric = finite(value);

  if (metric?.kind === "status") {
    if (metric.id === "trip" && Number(value) === 1) {
      return "danger";
    }
    return "normal";
  }

  if (numeric === null) return "unknown";

  const danger = getThreshold(node, metric.id, "danger");
  const warning = getThreshold(node, metric.id, "warning");

  if (danger !== null && numeric >= danger) return "danger";
  if (warning !== null && numeric >= warning) return "warning";
  return "normal";
};

const severityRank = {
  unknown: 0,
  normal: 1,
  warning: 2,
  danger: 3,
};

const worseSeverity = (left, right) =>
  severityRank[right] > severityRank[left] ? right : left;

const nodeCode = (node) => {
  const digits = String(node?.label || "")
    .match(/\d+/g)
    ?.at(-1);

  if (node?.type === "sterilizer") {
    return digits ? `S${digits}` : "STER";
  }

  if (node?.type === "boiler") return "BLR";
  if (node?.type === "junction") return "HDR";
  if (node?.type === "pump") return "PMP";
  if (node?.type === "valve") return "VLV";
  return String(node?.label || node?.type || "EQ")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 5)
    .toUpperCase();
};

const getHistoryTimestamp = (row) =>
  row?.timestamp || row?._time || row?.time || null;

const buildSyntheticSeries = ({
  id,
  label,
  currentValue,
  clock,
  index,
}) => {
  const base = finite(currentValue);
  if (base === null) return null;

  const points = Array.from({ length: 36 }, (_, pointIndex) => {
    const backwards = 35 - pointIndex;
    const timestamp = clock - backwards * 25000;
    const wave =
      Math.sin(pointIndex * 0.52 + index * 1.7) *
      Math.max(Math.abs(base) * 0.035, 0.2);
    const secondary =
      Math.sin(pointIndex * 0.19 + index) *
      Math.max(Math.abs(base) * 0.015, 0.08);

    return {
      timestamp,
      value: Math.max(0, base + wave + secondary),
    };
  });

  return {
    id,
    label,
    points,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  };
};

export default function ProcessMonitoringView({
  nodes = [],
  connections = [],
  history = [],
  liveState = "idle",
  lastLiveAt = null,
  mode = "hybrid",
  clock = Date.now(),
  resolveMetric,
  resolveConnectionValue,
  dark = false,
}) {
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({
    width: 960,
    height: 560,
  });
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return undefined;

    const update = () => {
      setStageSize({
        width: Math.max(320, element.clientWidth),
        height: Math.max(360, element.clientHeight),
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

  const resolvedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const metrics = (EQUIPMENT_BY_TYPE[node.type]?.metrics || []).map(
          (metric) => {
            const resolved = resolveMetric(node, metric);
            return {
              metric,
              ...resolved,
              alarm: getMetricAlarm(node, metric, resolved.value),
            };
          }
        );

        const alarm = metrics.reduce(
          (current, item) => worseSeverity(current, item.alarm),
          "normal"
        );

        return {
          node,
          metrics,
          alarm,
          values: Object.fromEntries(
            metrics.map((item) => [item.metric.id, item.value])
          ),
        };
      }),
    [nodes, resolveMetric, clock, mode]
  );

  const selected =
    resolvedNodes.find((item) => item.node.id === selectedNodeId) || null;

  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 1000,
        maxY: 600,
        width: 1000,
        height: 600,
      };
    }

    const minX = Math.min(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));
    const maxX = Math.max(
      ...nodes.map((node) => node.x + nodeWidth(node))
    );
    const maxY = Math.max(
      ...nodes.map((node) => node.y + nodeHeight(node))
    );

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [nodes]);

  const viewport = useMemo(() => {
    const paddingX = 54;
    const paddingY = 58;
    const scale = clamp(
      Math.min(
        (stageSize.width - paddingX * 2) / bounds.width,
        (stageSize.height - paddingY * 2) / bounds.height
      ),
      0.28,
      1.42
    );

    const contentWidth = bounds.width * scale;
    const contentHeight = bounds.height * scale;

    return {
      scale,
      offsetX:
        (stageSize.width - contentWidth) / 2 - bounds.minX * scale,
      offsetY:
        (stageSize.height - contentHeight) / 2 - bounds.minY * scale,
    };
  }, [bounds, stageSize]);

  const sterilizers = resolvedNodes.filter(
    (item) => item.node.type === "sterilizer"
  );
  const boilers = resolvedNodes.filter(
    (item) => item.node.type === "boiler"
  );

  const totalSteamFlow = useMemo(() => {
    const boilerFlow = boilers
      .map((item) => finite(item.values.steamFlow))
      .filter((value) => value !== null);

    if (boilerFlow.length > 0) {
      return boilerFlow.reduce((sum, value) => sum + value, 0);
    }

    const connectionFlow = connections
      .filter((connection) => connection.medium === "steam")
      .map((connection) => finite(resolveConnectionValue(connection)))
      .filter((value) => value !== null);

    return connectionFlow.length
      ? Math.max(...connectionFlow)
      : null;
  }, [boilers, connections, resolveConnectionValue, clock, mode]);

  const sterilizerPressures = sterilizers
    .map((item) => finite(item.values.pressure))
    .filter((value) => value !== null);

  const averagePressure = sterilizerPressures.length
    ? sterilizerPressures.reduce((sum, value) => sum + value, 0) /
      sterilizerPressures.length
    : null;

  const activeSterilizers = sterilizers.filter((item) => {
    const pressure = finite(item.values.pressure);
    const inlet = finite(item.values.inletValve);
    const auto = finite(item.values.auto);
    return (
      (pressure !== null && pressure > 0.05) ||
      inlet === 1 ||
      auto === 1
    );
  }).length;

  const alarmCounts = useMemo(() => {
    const counts = {
      high: 0,
      medium: 0,
      info: 0,
    };

    resolvedNodes.forEach((item) => {
      item.metrics.forEach((metric) => {
        if (metric.alarm === "danger") counts.high += 1;
        else if (metric.alarm === "warning") counts.medium += 1;
        else if (metric.alarm === "unknown") counts.info += 1;
      });
    });

    return counts;
  }, [resolvedNodes]);

  const systemStatus =
    alarmCounts.high > 0
      ? "CRITICAL"
      : alarmCounts.medium > 0
      ? "WARNING"
      : liveState === "stale"
      ? "DELAYED"
      : "NORMAL";

  const trendSeries = useMemo(() => {
    return sterilizers.slice(0, 6).map((item, index) => {
      const pressureMetric = getMetric(item.node, "pressure");
      const dataKey = item.node.bindings?.pressure || "";

      if (dataKey && Array.isArray(history) && history.length > 1) {
        const points = history
          .map((row) => ({
            timestamp: getHistoryTimestamp(row),
            value: finite(row?.[dataKey]),
          }))
          .filter(
            (point) => point.timestamp && point.value !== null
          )
          .slice(-90);

        if (points.length > 1) {
          return {
            id: item.node.id,
            label: item.node.label,
            color: SERIES_COLORS[index % SERIES_COLORS.length],
            points,
          };
        }
      }

      return buildSyntheticSeries({
        id: item.node.id,
        label: item.node.label,
        currentValue: item.values.pressure,
        clock,
        index,
        metric: pressureMetric,
      });
    }).filter(Boolean);
  }, [sterilizers, history, clock, mode]);

  const systemSummary = [
    {
      label: "Total Steam Flow",
      value:
        totalSteamFlow === null ? "—" : totalSteamFlow.toFixed(1),
      unit: "t/h",
      icon: Waves,
    },
    {
      label: "Average Sterilizer Pressure",
      value:
        averagePressure === null ? "—" : averagePressure.toFixed(2),
      unit:
        getMetric(sterilizers[0]?.node, "pressure")?.unit || "psi",
      icon: Gauge,
    },
    {
      label: "Active Sterilizers",
      value: `${activeSterilizers} / ${sterilizers.length}`,
      unit: "",
      icon: Activity,
    },
  ];

  return (
    <div className="process-monitoring-view space-y-2 text-slate-900 dark:text-slate-100">
      <div className="grid min-h-[570px] gap-2 xl:grid-cols-[minmax(0,1fr)_270px]">
        <section
          ref={stageRef}
          className="process-monitor-stage relative min-h-[570px] overflow-hidden rounded-xl border border-slate-200 bg-[#F5F8FC] dark:border-[#263657] dark:bg-[#071124]"
        >
          <div className="pointer-events-none absolute left-4 top-3 z-20">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-[#58D7FF]">
              Live Process Overview
            </div>
            <div className="mt-1 text-[9px] text-slate-500 dark:text-[#93A2C7]">
              Equipment topology and process state from the current mapped template
            </div>
          </div>

          {nodes.length === 0 ? (
            <div className="flex h-full min-h-[570px] items-center justify-center text-[11px] text-slate-400 dark:text-[#64748B]">
              No equipment has been placed in the Process View yet.
            </div>
          ) : (
            <div
              className="absolute left-0 top-0"
              style={{
                width: 4000,
                height: 2400,
                transformOrigin: "0 0",
                transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
              }}
            >
              <svg
                width="4000"
                height="2400"
                className="pointer-events-none absolute left-0 top-0 overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  {Object.entries(PROCESS_MEDIA).map(([key, media]) => (
                    <marker
                      key={key}
                      id={`monitor-arrow-${key}`}
                      markerWidth="7"
                      markerHeight="7"
                      refX="6"
                      refY="3.5"
                      orient="auto"
                    >
                      <path d="M0,0 L7,3.5 L0,7 Z" fill={media.color} />
                    </marker>
                  ))}
                </defs>

                {connections.map((connection) => {
                  const source = nodes.find(
                    (node) => node.id === connection.source
                  );
                  const target = nodes.find(
                    (node) => node.id === connection.target
                  );
                  if (!source || !target) return null;

                  const path = edgePath(source, target);
                  const media =
                    PROCESS_MEDIA[connection.medium] || PROCESS_MEDIA.steam;
                  const value = resolveConnectionValue(connection);
                  const sourceX = source.x + nodeWidth(source);
                  const sourceY = source.y + nodeHeight(source) / 2;
                  const targetX = target.x;
                  const targetY = target.y + nodeHeight(target) / 2;
                  const midX = (sourceX + targetX) / 2;
                  const midY = (sourceY + targetY) / 2;

                  return (
                    <g key={connection.id}>
                      <ProcessPipeline
                        id={`monitor-${connection.id}`}
                        path={path}
                        medium={connection.medium}
                        value={value}
                        label={connection.label || media.label}
                        selected={false}
                        dark={dark}
                        variant="monitor"
                      />

                      {(connection.label || Number.isFinite(value)) && (
                        <g
                          transform={`translate(${midX}, ${midY})`}
                          className="pointer-events-none"
                        >
                          <rect
                            x="-58"
                            y="-13"
                            width="116"
                            height="26"
                            rx="8"
                            fill={dark ? "#081226" : "#FFFFFF"}
                            stroke={media.color}
                            strokeOpacity="0.46"
                          />
                          <text
                            x="0"
                            y="1"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="9"
                            fontWeight="700"
                            fill={dark ? "#E8EDFF" : "#334155"}
                          >
                            {connection.label || media.label}
                            {Number.isFinite(value)
                              ? `  ${Number(value).toFixed(1)}`
                              : ""}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {resolvedNodes.map((item) => {
                const { node, metrics, values, alarm } = item;
                const pressure = metrics.find(
                  (metric) => metric.metric.id === "pressure"
                );
                const primaryMetrics = metrics
                  .filter((metric) => metric.metric.id !== "step")
                  .slice(0, 3);

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`process-monitor-node absolute text-left ${
                      selectedNodeId === node.id ? "is-selected" : ""
                    } ${
                      alarm === "danger"
                        ? "is-danger"
                        : alarm === "warning"
                        ? "is-warning"
                        : "is-normal"
                    }`}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: nodeWidth(node),
                      height: nodeHeight(node),
                    }}
                  >
                    {pressure && (
                      <div className="process-sensor-badge">
                        <span>PT-{nodeCode(node)}</span>
                        <strong>
                          {formatValue(pressure.value, pressure.metric)}
                          {pressure.metric.unit
                            ? ` ${pressure.metric.unit}`
                            : ""}
                        </strong>
                      </div>
                    )}

                    <div className="flex h-full min-h-0 flex-col">
                      <div className="flex items-start justify-between gap-2 px-3 pt-2">
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-black uppercase tracking-wide text-slate-900 dark:text-[#E8EDFF]">
                            {node.label}
                          </div>
                          <div className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-slate-400 dark:text-[#6E82AB]">
                            {EQUIPMENT_BY_TYPE[node.type]?.label || node.type}
                          </div>
                        </div>

                        <span
                          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                            alarm === "danger"
                              ? "bg-[#FF6F88]"
                              : alarm === "warning"
                              ? "bg-[#FFD66B]"
                              : "bg-[#58D7FF]"
                          }`}
                        />
                      </div>

                      <div className="grid min-h-0 flex-1 grid-cols-[46%_1fr] gap-1.5 px-2 pb-2 pt-1">
                        <div className="min-h-0 rounded-lg bg-slate-50/90 p-1 text-cyan-600 dark:bg-[#081226]/75 dark:text-[#58D7FF]">
                          <ProcessEquipmentVisual
                            type={node.type}
                            values={values}
                            alarmState={alarm}
                            monitoring
                            dark={dark}
                          />
                        </div>

                        <div className="flex min-h-0 flex-col justify-center gap-1">
                          {primaryMetrics.map((metric) => (
                            <div
                              key={metric.metric.id}
                              className="rounded-md border border-slate-200 bg-white/90 px-1.5 py-1 dark:border-[#20304F] dark:bg-[#0A1429]/90"
                            >
                              <div className="truncate text-[6.5px] text-slate-500 dark:text-[#7E91B5]">
                                {metric.metric.label}
                              </div>
                              <div className="mt-0.5 truncate text-[9px] font-black text-slate-900 dark:text-[#E8EDFF]">
                                {formatValue(metric.value, metric.metric)}
                                {metric.metric.unit && (
                                  <span className="ml-0.5 text-[6px] font-semibold text-slate-500 dark:text-[#93A2C7]">
                                    {metric.metric.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263657] dark:bg-[#0B1429]">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-cyan-700 dark:text-[#58D7FF]">
              System Summary
            </div>

            <div className="space-y-1">
              {systemSummary.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-[#1E2D4A]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon size={13} className="shrink-0 text-indigo-500 dark:text-[#7D75E7]" />
                      <span className="text-[9px] text-slate-600 dark:text-[#C8D1EA]">
                        {item.label}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <strong className="text-[13px] font-black text-cyan-700 dark:text-[#58D7FF]">
                        {item.value}
                      </strong>
                      {item.unit && (
                        <span className="ml-1 text-[8px] text-slate-500 dark:text-[#93A2C7]">
                          {item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 dark:border-[#1E2D4A]">
                <span className="text-[9px] text-slate-600 dark:text-[#C8D1EA]">System Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-black ${
                    systemStatus === "CRITICAL"
                      ? "text-[#FF6F88]"
                      : systemStatus === "WARNING"
                      ? "text-[#FFD66B]"
                      : systemStatus === "DELAYED"
                      ? "text-[#A86BDF]"
                      : "text-[#58D7FF]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {systemStatus}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-[9px] text-slate-600 dark:text-[#C8D1EA]">Last Update</span>
                <span className="inline-flex items-center gap-1 text-[9px] text-slate-800 dark:text-[#E8EDFF]">
                  <Clock3 size={11} className="text-indigo-500 dark:text-[#7D75E7]" />
                  {lastLiveAt
                    ? new Date(lastLiveAt).toLocaleTimeString()
                    : mode === "fake"
                    ? "Simulated"
                    : "—"}
                </span>
              </div>
            </div>
          </section>

          <section className="min-h-[250px] rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263657] dark:bg-[#0B1429]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[11px] font-black uppercase tracking-[0.08em] text-indigo-600 dark:text-[#7D75E7]">
                Equipment Detail
              </div>
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-[#93A2C7] dark:hover:bg-[#15213D] dark:hover:text-white"
                  aria-label="Close equipment detail"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {!selected ? (
              <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                <Activity size={24} className="text-slate-300 dark:text-[#344566]" />
                <div className="mt-2 text-[10px] font-bold text-slate-700 dark:text-[#C8D1EA]">
                  Select process equipment
                </div>
                <div className="mt-1 max-w-[190px] text-[8px] leading-relaxed text-slate-400 dark:text-[#64748B]">
                  Click any equipment in the process diagram to inspect its current mapped values and alarm limits.
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-[#081226]">
                  <div className="h-14 w-16 shrink-0 text-cyan-600 dark:text-[#58D7FF]">
                    <ProcessEquipmentVisual
                      type={selected.node.type}
                      values={selected.values}
                      alarmState={selected.alarm}
                      monitoring
                      dark={dark}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-black text-slate-900 dark:text-[#E8EDFF]">
                      {selected.node.label}
                    </div>
                    <div className="mt-0.5 truncate text-[8px] text-slate-500 dark:text-[#7E91B5]">
                      {selected.node.deviceId || "No device selected"}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {selected.metrics.map((item) => (
                    <div
                      key={item.metric.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-[#1F2E4C] dark:bg-[#0A1429]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[8px] text-slate-500 dark:text-[#93A2C7]">
                          {item.metric.label}
                        </div>
                        <div className="mt-0.5 truncate text-[7px] uppercase tracking-wide text-slate-400 dark:text-[#526687]">
                          {item.source}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-right text-[11px] font-black ${
                          item.alarm === "danger"
                            ? "text-[#FF6F88]"
                            : item.alarm === "warning"
                            ? "text-[#FFD66B]"
                            : "text-slate-900 dark:text-[#E8EDFF]"
                        }`}
                      >
                        {formatValue(item.value, item.metric)}
                        {item.metric.unit && (
                          <span className="ml-1 text-[7px] font-medium text-slate-500 dark:text-[#93A2C7]">
                            {item.metric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ProcessTrendPanel
          series={trendSeries}
          title="Pressure Trend"
          subtitle="Mapped historical data when available; simulated trace is used as a fallback"
          unit={getMetric(sterilizers[0]?.node, "pressure")?.unit || "psi"}
          dark={dark}
        />

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#263657] dark:bg-[#0B1429]">
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.08em] text-cyan-700 dark:text-[#58D7FF]">
            Alarm Summary
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#FF6F88]/20 bg-[#FF6F88]/[0.06] p-3 text-center">
              <AlertTriangle size={20} className="mx-auto text-[#FF6F88]" />
              <div className="mt-2 text-xl font-black text-[#FF6F88]">
                {alarmCounts.high}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#93A2C7]">
                High
              </div>
            </div>

            <div className="rounded-xl border border-[#FFD66B]/20 bg-[#FFD66B]/[0.05] p-3 text-center">
              <AlertTriangle size={20} className="mx-auto text-[#FFD66B]" />
              <div className="mt-2 text-xl font-black text-[#FFD66B]">
                {alarmCounts.medium}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#93A2C7]">
                Medium
              </div>
            </div>

            <div className="rounded-xl border border-[#58D7FF]/20 bg-[#58D7FF]/[0.05] p-3 text-center">
              {alarmCounts.info > 0 ? (
                <Database size={20} className="mx-auto text-[#58D7FF]" />
              ) : (
                <CheckCircle2 size={20} className="mx-auto text-[#58D7FF]" />
              )}
              <div className="mt-2 text-xl font-black text-[#58D7FF]">
                {alarmCounts.info}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#93A2C7]">
                Data
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-[#1F2E4C] dark:bg-[#081226]">
            <div className="flex items-center gap-2 text-[9px] text-slate-600 dark:text-[#C8D1EA]">
              {systemStatus === "NORMAL" ? (
                <CheckCircle2 size={14} className="text-[#58D7FF]" />
              ) : (
                <AlertTriangle
                  size={14}
                  className={
                    systemStatus === "CRITICAL"
                      ? "text-[#FF6F88]"
                      : "text-[#FFD66B]"
                  }
                />
              )}
              <span>
                {systemStatus === "NORMAL"
                  ? "No configured warning or danger threshold is active."
                  : systemStatus === "DELAYED"
                  ? "The live connection is delayed; last-known values remain displayed."
                  : "One or more configured process thresholds require attention."}
              </span>
            </div>
          </div>
        </section>
      </div>

      <footer className="grid gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[8px] uppercase tracking-[0.1em] text-slate-400 dark:border-[#263657] dark:bg-[#081226] dark:text-[#64748B] sm:grid-cols-2 lg:grid-cols-4">
        <span>Plant: {nodes.length ? "Configured Process" : "—"}</span>
        <span>Equipment: {nodes.length}</span>
        <span>Pipelines: {connections.length}</span>
        <span className="inline-flex items-center gap-1.5">
          Communication
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              liveState === "connected"
                ? "bg-[#58D7FF]"
                : liveState === "stale"
                ? "bg-[#FFD66B]"
                : mode === "fake"
                ? "bg-[#A86BDF]"
                : "bg-[#64748B]"
            }`}
          />
        </span>
      </footer>
    </div>
  );
}

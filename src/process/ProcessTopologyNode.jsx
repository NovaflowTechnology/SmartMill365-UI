import { Maximize2 } from "lucide-react";
import ProcessEquipmentVisual from "./ProcessEquipmentVisual";

export const PROCESS_NODE_DEFAULT_WIDTH = 196;
export const PROCESS_NODE_DEFAULT_HEIGHT = 164;
export const PROCESS_NODE_MIN_WIDTH = 128;
export const PROCESS_NODE_MIN_HEIGHT = 118;
export const PROCESS_NODE_MAX_WIDTH = 420;
export const PROCESS_NODE_MAX_HEIGHT = 340;

export const clampProcessNodeValue = (value, min, max) =>
  Math.max(min, Math.min(max, value));

export const getProcessNodeWidth = (node) =>
  clampProcessNodeValue(
    Number(node?.width) || PROCESS_NODE_DEFAULT_WIDTH,
    PROCESS_NODE_MIN_WIDTH,
    PROCESS_NODE_MAX_WIDTH
  );

export const getProcessNodeHeight = (node) =>
  clampProcessNodeValue(
    Number(node?.height) || PROCESS_NODE_DEFAULT_HEIGHT,
    PROCESS_NODE_MIN_HEIGHT,
    PROCESS_NODE_MAX_HEIGHT
  );

// Ports sit around the equipment graphic instead of the total node height.
// This makes the topology feel closer to Packet Tracer: the line connects to
// the machine itself, while the label and data box live underneath it.
export const getProcessNodePortOffsetY = (node) => {
  const height = getProcessNodeHeight(node);
  return clampProcessNodeValue(height * 0.35, 40, height * 0.48);
};

const formatMetricValue = (value, metric) => {
  if (value === null || value === undefined || value === "") return "—";

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

const getResponsiveLayout = (width, height, metricCount) => {
  const tiny = width < 150 || height < 135;
  const compact = width < 205 || height < 175;
  const roomy = width >= 260 && height >= 215;

  let visibleMetrics = 0;

  if (metricCount > 0) {
    if (tiny) visibleMetrics = 1;
    else if (compact) visibleMetrics = Math.min(2, metricCount);
    else if (roomy) visibleMetrics = Math.min(4, metricCount);
    else visibleMetrics = Math.min(3, metricCount);
  }

  const metricColumns =
    visibleMetrics <= 1
      ? 1
      : width >= 220
      ? 2
      : 1;

  return {
    tiny,
    compact,
    roomy,
    visibleMetrics,
    metricColumns,
    labelSize: clampProcessNodeValue(width / 17.5, 9, 13),
    subLabelSize: clampProcessNodeValue(width / 27, 6.5, 8.5),
    metricLabelSize: clampProcessNodeValue(width / 31, 6, 8),
    metricValueSize: clampProcessNodeValue(width / 22, 8, 11),
  };
};

export default function ProcessTopologyNode({
  node,
  definition = {},
  metrics = [],
  visualValues = {},
  selected = false,
  mode = "hybrid",
  dark = false,
  editable = false,
  connecting = false,
  showMetrics = true,
  showDeviceId = true,
  showMode = true,
  onSelect,
  onPointerDown,
  onInput,
  onOutput,
  onResizeStart,
}) {
  const width = getProcessNodeWidth(node);
  const height = getProcessNodeHeight(node);
  const responsive = getResponsiveLayout(
    width,
    height,
    metrics.length
  );

  const shownMetrics = showMetrics
    ? metrics.slice(0, responsive.visibleMetrics)
    : [];

  const portTop = getProcessNodePortOffsetY(node);

  return (
    <div
      className="absolute select-none"
      style={{
        width,
        height,
        left: node.x,
        top: node.y,
      }}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(event);
      }}
    >
      {/* Packet-Tracer-like machine block: the equipment is the visual focus. */}
      <div
        className={`relative mx-auto flex h-full w-full flex-col items-center rounded-[14px] transition ${
          selected
            ? "bg-cyan-50/50 ring-2 ring-cyan-400/70 dark:bg-cyan-400/[0.05] dark:ring-cyan-400/60"
            : "hover:bg-white/45 dark:hover:bg-white/[0.025]"
        }`}
      >
        {editable && (
          <>
            <button
              type="button"
              title="Input - click after choosing a source output"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onInput?.(event);
              }}
              className={`absolute -left-2.5 z-30 h-5 w-5 -translate-y-1/2 rounded-full border-2 shadow-sm transition ${
                connecting
                  ? "border-cyan-300 bg-cyan-500"
                  : "border-slate-300 bg-white dark:border-[#4A5B81] dark:bg-[#15213D]"
              }`}
              style={{ top: portTop }}
            />

            <button
              type="button"
              title="Output - start pipeline connection"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOutput?.(event);
              }}
              className={`absolute -right-2.5 z-30 h-5 w-5 -translate-y-1/2 rounded-full border-2 shadow-sm transition ${
                connecting
                  ? "border-violet-300 bg-violet-500"
                  : "border-slate-300 bg-white dark:border-[#4A5B81] dark:bg-[#15213D]"
              }`}
              style={{ top: portTop }}
            />
          </>
        )}

        {/* Equipment graphic */}
        <div
          className={`relative mt-1 min-h-0 w-full flex-1 overflow-hidden rounded-xl border bg-white/88 shadow-[0_3px_10px_rgba(15,23,42,0.07)] dark:border-[#2B3B60] dark:bg-[#0E172D]/92 ${
            selected
              ? "border-cyan-300 dark:border-cyan-500"
              : "border-slate-200"
          }`}
          style={{
            minHeight: responsive.tiny ? 54 : 62,
          }}
        >
          {showMode && !responsive.tiny && (
            <span className="absolute right-1.5 top-1.5 z-20 rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              {mode}
            </span>
          )}

          <div className="absolute inset-1.5 text-cyan-600 dark:text-cyan-300">
            <ProcessEquipmentVisual
              type={node.type}
              values={visualValues}
              monitoring
              dark={dark}
            />
          </div>
        </div>

        {/* Label beneath the equipment, like Packet Tracer. */}
        <div className="w-full shrink-0 px-1 pt-1 text-center">
          <div
            className="truncate font-black leading-tight text-slate-900 dark:text-[#E8EDFF]"
            title={node.label}
            style={{ fontSize: responsive.labelSize }}
          >
            {node.label || definition.label || node.type}
          </div>

          {!responsive.tiny && (
            <div
              className="mt-0.5 truncate uppercase tracking-[0.08em] text-slate-400 dark:text-[#7182A6]"
              style={{ fontSize: responsive.subLabelSize }}
            >
              {showDeviceId && node.deviceId
                ? node.deviceId
                : definition.label || node.type}
            </div>
          )}
        </div>

        {/* Data box grows/reflows with the resized equipment node. */}
        {shownMetrics.length > 0 && (
          <div
            className={`mt-1 grid w-full shrink-0 gap-1 rounded-xl border border-slate-200 bg-white/92 p-1 shadow-sm dark:border-[#253654] dark:bg-[#091329]/94 ${
              responsive.metricColumns === 2
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {shownMetrics.map(({ metric, value, source }) => (
              <div
                key={metric.id}
                className="min-w-0 rounded-lg bg-slate-50 px-1.5 py-1 dark:bg-[#111C34]"
                title={metric.label}
              >
                {!responsive.tiny && (
                  <div
                    className="truncate text-slate-400 dark:text-[#7E91B5]"
                    style={{ fontSize: responsive.metricLabelSize }}
                  >
                    {metric.label}
                  </div>
                )}

                <div className="mt-0.5 flex min-w-0 items-baseline gap-1">
                  <span
                    className="min-w-0 flex-1 truncate font-black text-slate-800 dark:text-[#E8EDFF]"
                    style={{ fontSize: responsive.metricValueSize }}
                  >
                    {formatMetricValue(value, metric)}
                  </span>

                  {metric.unit && !responsive.tiny && (
                    <span
                      className="shrink-0 text-slate-400"
                      style={{ fontSize: responsive.metricLabelSize }}
                    >
                      {metric.unit}
                    </span>
                  )}

                  {source && (
                    <span
                      title={
                        source === "live"
                          ? "Live data"
                          : source === "fake"
                          ? "Simulated data"
                          : "No data"
                      }
                      className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                        source === "live"
                          ? "bg-cyan-400"
                          : source === "fake"
                          ? "bg-violet-400"
                          : "bg-slate-400"
                      }`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editable && onResizeStart && (
        <button
          type="button"
          title="Resize equipment"
          onPointerDown={(event) => {
            event.stopPropagation();
            onResizeStart(event);
          }}
          className="absolute -bottom-1.5 -right-1.5 z-40 flex h-6 w-6 cursor-se-resize items-center justify-center rounded-lg border border-cyan-300 bg-white text-cyan-600 shadow-sm transition hover:bg-cyan-50 dark:border-cyan-400/30 dark:bg-[#0E172D] dark:text-cyan-300 dark:hover:bg-[#15213D]"
        >
          <Maximize2 size={11} />
        </button>
      )}
    </div>
  );
}

import {
  BarChart3,
  Gauge,
  Hash,
  LayoutGrid,
  PieChart,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Factory,
} from "lucide-react";
import {
  CUSTOM_LAYOUT_CHILD_LABELS,
  CUSTOM_LAYOUT_CHILD_TYPES,
  createCustomLayoutPart,
  normalizeCustomLayoutConfig,
} from "./CustomLayoutWidget";
import {
  DEFAULT_PROCESS_EQUIPMENT_CONFIG,
  normalizeProcessEquipmentConfig,
} from "./ProcessEquipmentWidget";
import { EQUIPMENT_BY_TYPE, EQUIPMENT_LIBRARY } from "../process/equipmentLibrary";

const ICONS = {
  bignumber: Hash,
  gauge: Gauge,
  linearGauge: SlidersHorizontal,
  line: TrendingUp,
  bar: BarChart3,
  pie: PieChart,
  processEquipment: Factory,
};

const MULTI_SOURCE_TYPES = new Set(["line", "bar", "pie", "processEquipment"]);

const labelForMetric = (metric) =>
  metric?.label ||
  String(metric?.id || "Metric")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export default function CustomLayoutSettings({
  config,
  onChange = () => {},
  availableDataKeys = [],
  dataOptions = [],
}) {
  const normalized = normalizeCustomLayoutConfig(config);
  const options = availableDataKeys
    .map((key) => dataOptions.find((option) => option.key === key) || { key, label: key })
    .filter(Boolean);

  const patch = (next) =>
    onChange(normalizeCustomLayoutConfig({ ...normalized, ...next }));

  const updatePart = (partId, partPatch) => {
    patch({
      parts: normalized.parts.map((part) =>
        part.id === partId ? { ...part, ...partPatch } : part
      ),
    });
  };

  const changePartType = (part, type) => {
    updatePart(part.id, {
      type,
      dataKey: part.dataKey || options[0]?.key || "",
      dataKeys: part.dataKeys?.length
        ? part.dataKeys
        : options[0]?.key
        ? [options[0].key]
        : [],
      processEquipmentConfig:
        type === "processEquipment"
          ? normalizeProcessEquipmentConfig(part.processEquipmentConfig || DEFAULT_PROCESS_EQUIPMENT_CONFIG)
          : part.processEquipmentConfig,
    });
  };

  const togglePartDataKey = (part, key) => {
    const current = Array.isArray(part.dataKeys) ? part.dataKeys : [];
    const next = current.includes(key)
      ? current.filter((candidate) => candidate !== key)
      : [...current, key];

    updatePart(part.id, {
      dataKeys: next,
      dataKey: next[0] || "",
    });
  };

  const setSinglePartDataKey = (part, key) => {
    updatePart(part.id, {
      dataKey: key,
      dataKeys: key ? [key] : [],
    });
  };

  const updateProcessEquipment = (part, equipmentType) => {
    const definition = EQUIPMENT_BY_TYPE?.[equipmentType] || {};
    const metrics = Array.isArray(definition.metrics) ? definition.metrics : [];
    const dataKeys = Array.isArray(part.dataKeys) ? part.dataKeys : [];
    const metricBindings = {};

    metrics.slice(0, dataKeys.length).forEach((metric, index) => {
      metricBindings[metric.id] = dataKeys[index];
    });

    updatePart(part.id, {
      processEquipmentConfig: normalizeProcessEquipmentConfig({
        ...(part.processEquipmentConfig || DEFAULT_PROCESS_EQUIPMENT_CONFIG),
        equipmentType,
        metricBindings,
        primaryMetricId: metrics[0]?.id || "",
      }),
    });
  };

  const updateProcessMetricBinding = (part, metricId, dataKey) => {
    const current = normalizeProcessEquipmentConfig(
      part.processEquipmentConfig || DEFAULT_PROCESS_EQUIPMENT_CONFIG
    );
    const metricBindings = { ...(current.metricBindings || {}) };
    if (dataKey) metricBindings[metricId] = dataKey;
    else delete metricBindings[metricId];

    updatePart(part.id, {
      processEquipmentConfig: normalizeProcessEquipmentConfig({
        ...current,
        metricBindings,
        primaryMetricId: current.primaryMetricId || metricId,
      }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Columns</label>
          <select
            value={normalized.columns}
            onChange={(event) => patch({ columns: Number(event.target.value) })}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value={1}>1 column</option>
            <option value={2}>2 columns</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Gap</label>
          <select
            value={normalized.gap}
            onChange={(event) => patch({ gap: Number(event.target.value) })}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value={4}>Tight</option>
            <option value={8}>Normal</option>
            <option value={12}>Comfortable</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            disabled={normalized.parts.length >= 4}
            onClick={() =>
              patch({
                parts: [
                  ...normalized.parts,
                  createCustomLayoutPart({
                    dataKey: options[0]?.key || "",
                    dataKeys: options[0]?.key ? [options[0].key] : [],
                  }),
                ],
              })
            }
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-3 text-[10px] font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={13} /> Add Section
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {normalized.parts.map((part, index) => {
          const Icon = ICONS[part.type] || LayoutGrid;
          const processConfig = normalizeProcessEquipmentConfig(
            part.processEquipmentConfig || DEFAULT_PROCESS_EQUIPMENT_CONFIG
          );
          const processDefinition = EQUIPMENT_BY_TYPE?.[processConfig.equipmentType] || {};
          const processMetrics = Array.isArray(processDefinition.metrics)
            ? processDefinition.metrics
            : [];

          return (
            <div
              key={part.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/75 p-3 dark:border-[#263657] dark:bg-[#0B1328]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-slate-900 dark:text-white">Section {index + 1}</div>
                    <div className="truncate text-[8px] text-slate-400">{CUSTOM_LAYOUT_CHILD_LABELS[part.type]}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={normalized.parts.length <= 1}
                  onClick={() => patch({ parts: normalized.parts.filter((candidate) => candidate.id !== part.id) })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">Widget</label>
                  <select
                    value={part.type}
                    onChange={(event) => changePartType(part, event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {CUSTOM_LAYOUT_CHILD_TYPES.map((type) => (
                      <option key={type} value={type}>{CUSTOM_LAYOUT_CHILD_LABELS[type]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">Section label</label>
                  <input
                    value={part.label || ""}
                    onChange={(event) => updatePart(part.id, { label: event.target.value })}
                    placeholder="Optional"
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-[9px] font-semibold text-slate-500 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(part.fullWidth)}
                  disabled={normalized.columns === 1}
                  onChange={(event) => updatePart(part.id, { fullWidth: event.target.checked })}
                  className="h-3.5 w-3.5 accent-cyan-500"
                />
                Span full width
              </label>

              <div className="mt-3">
                <div className="mb-1 text-[9px] font-bold text-slate-500 dark:text-slate-300">
                  {MULTI_SOURCE_TYPES.has(part.type) ? "Data Sources" : "Data Source"}
                </div>

                {options.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[9px] text-slate-400 dark:border-slate-700">
                    Select data sources in Step 1 first.
                  </div>
                ) : MULTI_SOURCE_TYPES.has(part.type) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((option) => {
                      const checked = part.dataKeys?.includes(option.key);
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => togglePartDataKey(part, option.key)}
                          className={`rounded-full border px-2 py-1 text-[8px] font-bold transition ${
                            checked
                              ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200"
                              : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                          }`}
                        >
                          {option.label || option.key}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    value={part.dataKey || ""}
                    onChange={(event) => setSinglePartDataKey(part, event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">No source</option>
                    {options.map((option) => (
                      <option key={option.key} value={option.key}>{option.label || option.key}</option>
                    ))}
                  </select>
                )}
              </div>

              {part.type === "processEquipment" && (
                <div className="mt-3 rounded-xl border border-cyan-200/70 bg-cyan-50/60 p-3 dark:border-cyan-400/15 dark:bg-cyan-400/[0.04]">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">Equipment</label>
                      <select
                        value={processConfig.equipmentType}
                        onChange={(event) => updateProcessEquipment(part, event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        {EQUIPMENT_LIBRARY.map((equipment) => (
                          <option key={equipment.type} value={equipment.type}>{equipment.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">Display</label>
                      <select
                        value={processConfig.displayMode}
                        onChange={(event) =>
                          updatePart(part.id, {
                            processEquipmentConfig: normalizeProcessEquipmentConfig({
                              ...processConfig,
                              displayMode: event.target.value,
                            }),
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="compact">Compact</option>
                        <option value="detailed">Detailed</option>
                        <option value="visual">Visual only</option>
                      </select>
                    </div>
                  </div>

                  {processMetrics.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {processMetrics.slice(0, 6).map((metric) => (
                        <div key={metric.id} className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
                          <span className="truncate text-[8px] font-bold text-slate-500 dark:text-slate-300">{labelForMetric(metric)}</span>
                          <select
                            value={processConfig.metricBindings?.[metric.id] || ""}
                            onChange={(event) => updateProcessMetricBinding(part, metric.id, event.target.value)}
                            className="h-8 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-[8px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          >
                            <option value="">Not mapped</option>
                            {options.map((option) => (
                              <option key={option.key} value={option.key}>{option.label || option.key}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

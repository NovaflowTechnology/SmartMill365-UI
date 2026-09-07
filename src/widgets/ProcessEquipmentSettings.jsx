import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Upload, Wand2, X } from "lucide-react";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import {
  EQUIPMENT_BY_TYPE,
  EQUIPMENT_LIBRARY,
} from "../process/equipmentLibrary";
import {
  DEFAULT_PROCESS_EQUIPMENT_CONFIG,
  normalizeProcessEquipmentConfig,
} from "./ProcessEquipmentWidget";

const textOf = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenize = (value) =>
  new Set(
    textOf(value)
      .split(/\s+/)
      .filter((token) => token.length > 1)
  );

const scoreOptionForMetric = (metric, option) => {
  const metricText = `${metric?.id || ""} ${
    metric?.label || ""
  } ${metric?.unit || ""}`;
  const optionText = `${option?.key || ""} ${
    option?.label || ""
  } ${option?.unit || ""} ${option?.channel || ""}`;

  const metricTokens = tokenize(metricText);
  const optionTokens = tokenize(optionText);

  let score = 0;
  metricTokens.forEach((token) => {
    if (optionTokens.has(token)) {
      score += token.length >= 5 ? 4 : 2;
    }
  });

  const metricId = textOf(metric?.id).replace(/\s+/g, "");
  const optionKey = textOf(option?.key).replace(/\s+/g, "");
  if (metricId && optionKey.includes(metricId)) {
    score += 10;
  }

  const label = textOf(metric?.label);
  const optionLabel = textOf(option?.label);
  if (label && optionLabel.includes(label)) {
    score += 6;
  }

  if (
    metric?.unit &&
    option?.unit &&
    String(metric.unit) === String(option.unit)
  ) {
    score += 2;
  }

  return score;
};

const metricLabel = (metric) =>
  metric?.label ||
  String(metric?.id || "Metric")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

const MAX_EQUIPMENT_IMAGE_SIZE = 4 * 1024 * 1024;

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });

export default function ProcessEquipmentSettings({
  config = DEFAULT_PROCESS_EQUIPMENT_CONFIG,
  onChange = () => {},
  selectedDataKeys = [],
  dataOptions = [],
}) {
  const normalized = useMemo(
    () => normalizeProcessEquipmentConfig(config),
    [config]
  );

  const [equipmentCategory, setEquipmentCategory] =
    useState("all");

  const equipmentPickerRef = useRef(null);
  const [equipmentPickerWidth, setEquipmentPickerWidth] = useState(0);

  useEffect(() => {
    const element = equipmentPickerRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      setEquipmentPickerWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const equipmentPickerMode =
    equipmentPickerWidth > 0 && equipmentPickerWidth < 300
      ? "icons"
      : equipmentPickerWidth >= 440
      ? "wide"
      : "normal";

  const equipmentGridColumns =
    equipmentPickerMode === "icons"
      ? equipmentPickerWidth > 0 && equipmentPickerWidth < 220
        ? 3
        : 4
      : equipmentPickerMode === "wide"
      ? 3
      : 2;

  const equipmentCategories = useMemo(() => {
    const categories = Array.from(
      new Set(
        EQUIPMENT_LIBRARY.map((equipment) =>
          String(equipment?.category || "Other").trim()
        ).filter(Boolean)
      )
    );

    return categories.sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const visibleEquipment = useMemo(() => {
    if (equipmentCategory === "all") {
      return EQUIPMENT_LIBRARY;
    }

    return EQUIPMENT_LIBRARY.filter(
      (equipment) =>
        String(equipment?.category || "Other") ===
        equipmentCategory
    );
  }, [equipmentCategory]);

  const definition =
    EQUIPMENT_BY_TYPE?.[normalized.equipmentType] ||
    EQUIPMENT_LIBRARY?.[0] ||
    {};
  const metrics = Array.isArray(definition.metrics)
    ? definition.metrics
    : [];
  const numericMetrics = metrics.filter(
    (metric) => metric.kind !== "status"
  );
  const statusMetrics = metrics.filter(
    (metric) => metric.kind === "status"
  );

  const selectedOptions = selectedDataKeys
    .map((key) =>
      dataOptions.find((option) => option.key === key)
    )
    .filter(Boolean);

  const patch = (nextPatch) => {
    onChange(
      normalizeProcessEquipmentConfig({
        ...normalized,
        ...nextPatch,
      })
    );
  };

  const changeEquipment = (equipmentType) => {
    const nextDefinition =
      EQUIPMENT_BY_TYPE?.[equipmentType] || {};
    const nextMetrics = Array.isArray(nextDefinition.metrics)
      ? nextDefinition.metrics
      : [];
    const validIds = new Set(
      nextMetrics.map((metric) => metric.id)
    );
    const nextStatus = nextMetrics.filter(
      (metric) => metric.kind === "status"
    );

    // Keep the user's custom primary measurement untouched when changing the
    // equipment visual. Only legacy/internal semantic bindings are filtered.
    const metricBindings = Object.fromEntries(
      Object.entries(normalized.metricBindings || {}).filter(
        ([metricId]) => validIds.has(metricId)
      )
    );

    patch({
      equipmentType,
      metricBindings,
      customImageSrc: "",
      customImageName: "",
      primaryMetricId: validIds.has(
        normalized.primaryMetricId
      )
        ? normalized.primaryMetricId
        : "",
      statusMetricId: nextStatus.some(
        (metric) => metric.id === normalized.statusMetricId
      )
        ? normalized.statusMetricId
        : "",
    });
  };

  const updateBinding = (metricId, dataKey) => {
    if (!metricId) return;

    const metricBindings = {
      ...(normalized.metricBindings || {}),
    };

    if (dataKey) {
      metricBindings[metricId] = dataKey;
    } else {
      delete metricBindings[metricId];
    }

    patch({ metricBindings });
  };

  const updatePrimaryMeasurement = (nextPatch) => {
    patch({
      primaryMeasurement: {
        ...(normalized.primaryMeasurement || {}),
        ...(nextPatch || {}),
      },
    });
  };

  const inferSemanticPrimaryMetric = (measurement, option) => {
    if (numericMetrics.length === 0) return "";

    const syntheticOption = {
      ...(option || {}),
      label:
        measurement?.label ||
        option?.label ||
        option?.key ||
        "",
      unit: measurement?.unit || option?.unit || "",
    };

    const ranked = numericMetrics
      .map((metric) => ({
        metric,
        score: scoreOptionForMetric(metric, syntheticOption),
      }))
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.score > 0
      ? ranked[0].metric.id
      : "";
  };

  const changePrimaryDataSource = (dataKey) => {
    const option = selectedOptions.find(
      (candidate) => candidate.key === dataKey
    );
    const nextMeasurement = {
      ...(normalized.primaryMeasurement || {}),
      dataKey,
    };

    patch({
      primaryMeasurement: nextMeasurement,
      // This semantic id is internal only. It lets a matching known value
      // animate the equipment visual, but the displayed label/unit stay fully
      // user-defined.
      primaryMetricId: inferSemanticPrimaryMetric(
        nextMeasurement,
        option
      ),
    });
  };

  const useSelectedSourceDetails = () => {
    const currentKey =
      normalized.primaryMeasurement?.dataKey ||
      selectedOptions[0]?.key ||
      "";
    const option = selectedOptions.find(
      (candidate) => candidate.key === currentKey
    );

    if (!option) return;

    const nextMeasurement = {
      label: String(option.label || option.key || ""),
      unit: String(option.unit || ""),
      dataKey: option.key,
    };

    patch({
      primaryMeasurement: nextMeasurement,
      primaryMetricId: inferSemanticPrimaryMetric(
        nextMeasurement,
        option
      ),
    });
  };

  const changeStatusMetric = (metricId) => {
    const previousStatusId = normalized.statusMetricId;
    const metricBindings = {
      ...(normalized.metricBindings || {}),
    };

    if (
      previousStatusId &&
      previousStatusId !== metricId &&
      statusMetrics.some(
        (metric) => metric.id === previousStatusId
      )
    ) {
      delete metricBindings[previousStatusId];
    }

    patch({
      statusMetricId: metricId,
      metricBindings,
    });
  };

  const handleEquipmentImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      return;
    }

    if (file.size > MAX_EQUIPMENT_IMAGE_SIZE) {
      return;
    }

    try {
      const customImageSrc = await readImageFile(file);
      patch({
        customImageSrc,
        customImageName: file.name,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clearEquipmentImage = () => {
    patch({
      customImageSrc: "",
      customImageName: "",
    });
  };

  const primaryMeasurement =
    normalized.primaryMeasurement || {
      label: "",
      unit: "",
      dataKey: "",
    };
  const primaryDataKey = primaryMeasurement.dataKey || "";
  const statusMetric = statusMetrics.find(
    (metric) => metric.id === normalized.statusMetricId
  );
  const statusDataKey = statusMetric
    ? normalized.metricBindings?.[statusMetric.id] || ""
    : "";

  return (
    <div className="space-y-4">
      <div ref={equipmentPickerRef}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
              Equipment
            </div>
            {equipmentPickerMode === "icons" && (
              <div className="mt-0.5 truncate text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                {definition.label || "Process Equipment"}
              </div>
            )}
          </div>
          <div className="shrink-0 text-[9px] font-semibold text-slate-400">
            {visibleEquipment.length} shown
          </div>
        </div>

        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {[
            { value: "all", label: "All" },
            ...equipmentCategories.map((category) => ({
              value: category,
              label: category,
            })),
          ].map((category) => {
            const selected =
              equipmentCategory === category.value;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() =>
                  setEquipmentCategory(category.value)
                }
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-bold transition ${
                  selected
                    ? "border-cyan-500 bg-cyan-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/60 dark:hover:text-cyan-200"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div
          className={`grid ${equipmentPickerMode === "icons" ? "gap-1.5" : "gap-2"}`}
          style={{
            gridTemplateColumns: `repeat(${equipmentGridColumns}, minmax(0, 1fr))`,
          }}
        >
          {visibleEquipment.map((equipment) => {
            const selected =
              equipment.type === normalized.equipmentType;

            return (
              <button
                key={equipment.type}
                type="button"
                title={`${equipment.label} · ${
                  equipment.category || "Other"
                }`}
                onClick={() =>
                  changeEquipment(equipment.type)
                }
                className={`relative rounded-xl border transition ${
                  equipmentPickerMode === "icons"
                    ? "flex aspect-square min-h-[52px] items-center justify-center p-1.5 text-center"
                    : "flex min-h-[78px] items-center gap-2.5 p-2.5 text-left"
                } ${
                  selected
                    ? "border-cyan-500 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-400/15"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-400/[0.04]"
                }`}
                aria-label={equipment.label}
              >
                <div
                  className={`shrink-0 overflow-hidden rounded-lg bg-cyan-500/[0.06] text-cyan-600 dark:bg-cyan-400/[0.05] dark:text-cyan-300 ${
                    equipmentPickerMode === "icons"
                      ? "h-10 w-11 p-0.5"
                      : "h-12 w-14 p-1"
                  }`}
                >
                  <ProcessEquipmentVisual
                    type={equipment.type}
                    values={{}}
                    monitoring={false}
                    dark={
                      typeof document !== "undefined" &&
                      document.documentElement.classList.contains(
                        "dark"
                      )
                    }
                  />
                </div>

                {equipmentPickerMode !== "icons" && (
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-normal text-[10px] font-black leading-[1.25]">
                      {equipment.label}
                    </div>
                    <div className="mt-1 whitespace-normal text-[8px] leading-[1.2] text-slate-400">
                      {equipment.category || "Other"}
                    </div>
                  </div>
                )}

                {equipmentPickerMode === "icons" && selected && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-[#0B1328]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 dark:text-white">
              Equipment Skin
            </h4>
            <p className="mt-0.5 text-[9px] leading-4 text-slate-400">
              Upload a skin for the selected built-in equipment, or choose Custom Image Equipment above to create a fully custom visual.
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
            <ImageIcon size={16} />
          </div>
        </div>

        {normalized.customImageSrc ? (
          <div className="mb-3 flex min-h-[108px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <img
              src={normalized.customImageSrc}
              alt={normalized.customImageName || definition.label || "Equipment skin"}
              className="max-h-28 w-full object-contain"
              draggable={false}
            />
          </div>
        ) : (
          <div className="mb-3 flex min-h-[108px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="h-24 w-32">
              <ProcessEquipmentVisual
                type={normalized.equipmentType}
                values={{}}
                monitoring={false}
                dark={
                  typeof document !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                }
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[9px] font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
            <Upload size={12} />
            {normalized.customImageSrc ? "Replace skin" : "Upload skin"}
            <input
              type="file"
              accept="image/*"
              onChange={handleEquipmentImageUpload}
              className="hidden"
            />
          </label>

          {normalized.customImageSrc ? (
            <button
              type="button"
              onClick={clearEquipmentImage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <X size={12} />
              Use built-in visual
            </button>
          ) : null}

          <span className="text-[8px] text-slate-400">PNG / JPG / WEBP · max 4 MB</span>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <div>
          <label className="mb-1.5 block whitespace-nowrap text-[10px] font-bold text-slate-500 dark:text-slate-300">
            Display Mode
          </label>
          <select
            value={normalized.displayMode}
            onChange={(event) =>
              patch({ displayMode: event.target.value })
            }
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="detailed">
              Focused · Equipment + Measurement
            </option>
            <option value="compact">Compact</option>
            <option value="visual">Equipment only</option>
          </select>
        </div>

        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2.5 text-[9px] leading-4 text-cyan-800 dark:border-cyan-400/15 dark:bg-cyan-400/[0.06] dark:text-cyan-200">
          Best for one important process value. For example: map
          <span className="font-black"> Pressure </span>
          to the sterilizer pressure source. Status is optional.
        </div>
      </div>

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {[
          ["showEquipmentLabel", "Equipment label"],
          ["showStatus", "Status badge"],
          ["showRangeIndicator", "Range indicator"],
          ["showTrend", "Mini trend"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <input
              type="checkbox"
              checked={Boolean(normalized[key])}
              onChange={(event) =>
                patch({ [key]: event.target.checked })
              }
              className="h-3.5 w-3.5 accent-cyan-500"
            />
            <span className="min-w-0 whitespace-nowrap">{label}</span>
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-[#0B1328]">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">
              Primary Measurement
            </h4>
            <p className="mt-0.5 text-[9px] leading-4 text-slate-400">
              Give the value any label and unit you need. It is not limited by the selected equipment type.
            </p>
          </div>

          <button
            type="button"
            onClick={useSelectedSourceDetails}
            disabled={selectedOptions.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 text-[9px] font-bold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-40 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"
            title="Copy the selected source name and unit into the editable measurement fields"
          >
            <Wand2 size={12} /> Use source details
          </button>
        </div>

        {selectedOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-[9px] text-slate-400 dark:border-slate-700">
            Select at least one Connected Source above, then configure the measurement name, unit, and source here.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              <div>
                <label className="mb-1.5 block whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-slate-300">
                  Measurement Label
                </label>
                <input
                  type="text"
                  value={primaryMeasurement.label || ""}
                  onChange={(event) =>
                    updatePrimaryMeasurement({
                      label: event.target.value,
                    })
                  }
                  placeholder="e.g. Steam Pressure, Press 2, Temperature"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-slate-300">
                  Unit
                </label>
                <input
                  type="text"
                  value={primaryMeasurement.unit || ""}
                  onChange={(event) =>
                    updatePrimaryMeasurement({
                      unit: event.target.value,
                    })
                  }
                  placeholder="bar"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-slate-300">
                Data Source
              </label>
              <select
                value={primaryDataKey}
                onChange={(event) =>
                  changePrimaryDataSource(event.target.value)
                }
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Not mapped</option>
                {selectedOptions.map((option) => (
                  <option
                    key={option.key}
                    value={option.key}
                  >
                    {option.label || option.key}
                    {option.unit ? ` (${option.unit})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-cyan-100 bg-white/70 px-3 py-2 text-[9px] leading-4 text-slate-500 dark:border-cyan-400/10 dark:bg-slate-900/70 dark:text-slate-400">
              The equipment icon is only the visual context. Your measurement can be Pressure, Temperature, Flow, Current, pH, Vibration, or any other connected value.
            </div>
          </div>
        )}
      </div>

      {statusMetrics.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white">
              Status Source
              <span className="ml-1.5 font-semibold text-slate-400">
                optional
              </span>
            </h4>
            <p className="mt-0.5 text-[9px] leading-4 text-slate-400">
              Leave this empty if you only have pressure. The widget can still use Warning / Danger thresholds from Data Range.
            </p>
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            <div>
              <label className="mb-1.5 block whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-slate-300">
                Equipment Status
              </label>
              <select
                value={normalized.statusMetricId}
                onChange={(event) =>
                  changeStatusMetric(event.target.value)
                }
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">No status source</option>
                {statusMetrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metricLabel(metric)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-slate-300">
                Data Source
              </label>
              <select
                value={statusDataKey}
                disabled={!statusMetric}
                onChange={(event) =>
                  updateBinding(
                    statusMetric?.id,
                    event.target.value
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">Not mapped</option>
                {selectedOptions.map((option) => (
                  <option
                    key={option.key}
                    value={option.key}
                  >
                    {option.label || option.key}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

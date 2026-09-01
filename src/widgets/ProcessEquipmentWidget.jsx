import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import {
  EQUIPMENT_BY_TYPE,
  EQUIPMENT_LIBRARY,
} from "../process/equipmentLibrary";
import "../process/processVisualization.css";

export const DEFAULT_PROCESS_EQUIPMENT_CONFIG = {
  equipmentType: "sterilizer",
  displayMode: "detailed", // detailed (focused) | compact | visual
  metricBindings: {},

  // Primary measurement is intentionally independent from the equipment
  // library. Users can name any process value and unit they actually have.
  primaryMeasurement: {
    label: "",
    unit: "",
    dataKey: "",
  },

  // Legacy/internal semantic ids are retained for old templates and for
  // optionally feeding a known equipment animation. They are not required.
  primaryMetricId: "",
  statusMetricId: "",
  showStatus: true,
  showEquipmentLabel: true,
  showRangeIndicator: true,
  showTrend: true,
  trendPoints: 28,

  // Legacy fields are retained so older saved templates remain compatible.
  // The focused design no longer renders a secondary-metric list.
  showMetrics: false,
  maxMetrics: 3,
};

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const finiteOrNull = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const normalizeProcessEquipmentConfig = (config = {}) => {
  const requestedType =
    config?.equipmentType || "sterilizer";
  const equipmentType = EQUIPMENT_BY_TYPE?.[requestedType]
    ? requestedType
    : EQUIPMENT_LIBRARY?.[0]?.type || "sterilizer";

  const definition =
    EQUIPMENT_BY_TYPE?.[equipmentType] ||
    EQUIPMENT_LIBRARY?.[0] ||
    {};
  const metrics = Array.isArray(definition.metrics)
    ? definition.metrics
    : [];
  const validMetricIds = new Set(
    metrics.map((metric) => metric.id)
  );
  const numericMetrics = metrics.filter(
    (metric) => metric.kind !== "status"
  );
  const statusMetrics = metrics.filter(
    (metric) => metric.kind === "status"
  );

  const metricBindings = Object.fromEntries(
    Object.entries(config?.metricBindings || {}).filter(
      ([metricId, dataKey]) =>
        validMetricIds.has(metricId) && Boolean(dataKey)
    )
  );

  const configuredPrimary = String(
    config?.primaryMetricId || ""
  );
  const configuredPrimaryMetric = numericMetrics.find(
    (metric) => metric.id === configuredPrimary
  );
  const firstBoundNumericMetric = numericMetrics.find(
    (metric) => metricBindings[metric.id]
  );

  // If a template predates the custom primaryMeasurement object, migrate its
  // old semantic measurement + binding into the new user-editable format.
  const hasExplicitPrimaryMeasurement =
    config?.primaryMeasurement &&
    typeof config.primaryMeasurement === "object";

  const legacyPrimaryMetric =
    configuredPrimaryMetric ||
    firstBoundNumericMetric ||
    numericMetrics[0] ||
    null;

  const legacyPrimaryDataKey = legacyPrimaryMetric
    ? metricBindings[legacyPrimaryMetric.id] || ""
    : "";

  const primaryMeasurement = hasExplicitPrimaryMeasurement
    ? {
        label: String(config.primaryMeasurement?.label || ""),
        unit: String(config.primaryMeasurement?.unit || ""),
        dataKey: String(config.primaryMeasurement?.dataKey || ""),
      }
    : {
        label: String(legacyPrimaryMetric?.label || ""),
        unit: String(legacyPrimaryMetric?.unit || ""),
        dataKey: String(legacyPrimaryDataKey || ""),
      };

  const configuredStatus = String(
    config?.statusMetricId || ""
  );
  const firstBoundStatus = statusMetrics.find(
    (metric) => metricBindings[metric.id]
  )?.id;

  const displayMode = [
    "detailed",
    "compact",
    "visual",
  ].includes(config?.displayMode)
    ? config.displayMode
    : "detailed";

  return {
    ...DEFAULT_PROCESS_EQUIPMENT_CONFIG,
    ...config,
    equipmentType,
    displayMode,
    metricBindings,
    primaryMeasurement,
    primaryMetricId: hasExplicitPrimaryMeasurement
      ? configuredPrimaryMetric?.id || ""
      : legacyPrimaryMetric?.id || "",
    statusMetricId: statusMetrics.some(
      (metric) => metric.id === configuredStatus
    )
      ? configuredStatus
      : firstBoundStatus || "",
    showStatus: config?.showStatus !== false,
    showEquipmentLabel:
      config?.showEquipmentLabel !== false,
    showRangeIndicator:
      config?.showRangeIndicator !== false,
    showTrend: config?.showTrend !== false,
    trendPoints: clamp(
      Number(config?.trendPoints) || 28,
      8,
      60
    ),
    maxMetrics: clamp(
      Number(config?.maxMetrics) || 3,
      1,
      6
    ),
  };
};

const useDarkMode = () => {
  const getDark = () =>
    typeof document !== "undefined" &&
    (document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark"));

  const [dark, setDark] = useState(getDark);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const update = () => setDark(getDark());
    const observer = new MutationObserver(update);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return dark;
};

const formatNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(1);
};

const formatValue = (value, metric) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (metric?.kind === "status") {
    return Number(value) === 1 ? "ON" : "OFF";
  }

  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? formatNumber(numeric)
    : String(value);
};

const metricLabel = (metric) =>
  metric?.label ||
  String(metric?.id || "Metric")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

const resolvePrimaryRange = (
  rangeConfig = {},
  metric = {}
) => {
  const metricMin = finiteOrNull(metric?.min) ?? 0;
  const metricMax = finiteOrNull(metric?.max) ?? 100;

  const configuredMin = finiteOrNull(rangeConfig?.min);
  const configuredMax = finiteOrNull(rangeConfig?.max);
  const configuredWarning = finiteOrNull(
    rangeConfig?.warning
  );
  const configuredDanger = finiteOrNull(
    rangeConfig?.danger
  );

  // New widgets historically received the generic 0..100 / 80 / 90
  // defaults before the equipment metric was known. When that untouched
  // generic range is still present, prefer the equipment's semantic range
  // (e.g. Sterilizer Pressure 0..10 bar) instead of showing a misleading
  // 0..100 scale.
  const looksLikeUntouchedGenericRange =
    configuredMin === 0 &&
    configuredMax === 100 &&
    configuredWarning === 80 &&
    configuredDanger === 90 &&
    !String(rangeConfig?.unit || "").trim() &&
    (metricMin !== 0 || metricMax !== 100);

  let min = looksLikeUntouchedGenericRange
    ? metricMin
    : configuredMin ?? metricMin;
  let max = looksLikeUntouchedGenericRange
    ? metricMax
    : configuredMax ?? metricMax;

  if (!(max > min)) {
    max = min + 1;
  }

  return {
    min,
    max,
    unit:
      String(rangeConfig?.unit || "").trim() ||
      metric?.unit ||
      "",
    warning: looksLikeUntouchedGenericRange
      ? null
      : configuredWarning,
    danger: looksLikeUntouchedGenericRange
      ? null
      : configuredDanger,
  };
};

const resolveStatusState = (
  boundMetrics,
  primary,
  range
) => {
  const statusMetrics = boundMetrics.filter(
    ({ metric, value }) =>
      metric?.kind === "status" &&
      value !== null &&
      value !== undefined &&
      value !== ""
  );

  const tripped = statusMetrics.some(
    ({ metric, value }) =>
      /trip|alarm|fault|error/i.test(
        `${metric?.id} ${metric?.label}`
      ) && Number(value) === 1
  );
  if (tripped) return "danger";

  const stopped = statusMetrics.some(
    ({ metric, value }) =>
      /run|running|status/i.test(
        `${metric?.id} ${metric?.label}`
      ) && Number(value) === 0
  );
  if (stopped) return "warning";

  const primaryValue = finiteOrNull(primary?.value);
  if (primaryValue !== null) {
    if (
      range?.danger !== null &&
      primaryValue >= range.danger
    ) {
      return "danger";
    }

    if (
      range?.warning !== null &&
      primaryValue >= range.warning
    ) {
      return "warning";
    }
  }

  return "normal";
};

const getHistoryValue = (row, dataKey) => {
  if (!row || !dataKey) return null;

  const direct = finiteOrNull(row?.[dataKey]);
  if (direct !== null) return direct;

  const nested = finiteOrNull(row?.values?.[dataKey]);
  return nested;
};

const getTrendSeries = (
  history,
  dataKey,
  pointLimit
) => {
  if (!Array.isArray(history) || !dataKey) return [];

  return history
    .map((row, index) => ({
      value: getHistoryValue(row, dataKey),
      timestamp:
        row?.timestamp || row?._time || row?.time || index,
    }))
    .filter((point) => point.value !== null)
    .slice(-pointLimit);
};

const buildSparklinePoints = (series) => {
  if (!Array.isArray(series) || series.length < 2) {
    return "";
  }

  const values = series.map((point) => point.value);
  const observedMin = Math.min(...values);
  const observedMax = Math.max(...values);
  const span = Math.max(0.000001, observedMax - observedMin);

  return series
    .map((point, index) => {
      const x =
        (index / Math.max(1, series.length - 1)) * 120;
      const normalized =
        span <= 0.000001
          ? 0.5
          : (point.value - observedMin) / span;
      const y = 29 - normalized * 24;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const statusMeta = (state) => {
  if (state === "danger") {
    return {
      text: "ALARM",
      badge:
        "bg-rose-500/10 text-rose-600 dark:text-rose-300",
      fill: "bg-rose-500",
      stroke: "#f43f5e",
    };
  }

  if (state === "warning") {
    return {
      text: "ATTENTION",
      badge:
        "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      fill: "bg-amber-500",
      stroke: "#f59e0b",
    };
  }

  return {
    text: "NORMAL",
    badge:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    fill: "bg-cyan-500",
    stroke: "#06b6d4",
  };
};

const StatusBadge = ({ state }) => {
  const meta = statusMeta(state);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[8px] font-black ${meta.badge}`}
    >
      {state === "danger" ? (
        <AlertTriangle size={10} />
      ) : state === "normal" ? (
        <CheckCircle2 size={10} />
      ) : (
        <Activity size={10} />
      )}
      {meta.text}
    </span>
  );
};

const RangeIndicator = ({
  value,
  range,
  state,
  compact = false,
}) => {
  const numeric = finiteOrNull(value);
  const span = Math.max(0.000001, range.max - range.min);
  const percent =
    numeric === null
      ? 0
      : clamp(
          ((numeric - range.min) / span) * 100,
          0,
          100
        );
  const warningPercent =
    range.warning === null
      ? null
      : clamp(
          ((range.warning - range.min) / span) * 100,
          0,
          100
        );
  const dangerPercent =
    range.danger === null
      ? null
      : clamp(
          ((range.danger - range.min) / span) * 100,
          0,
          100
        );
  const meta = statusMeta(state);

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <div className="relative h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${meta.fill}`}
          style={{ width: `${percent}%` }}
        />

        {warningPercent !== null && (
          <span
            className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-amber-500/80"
            style={{ left: `${warningPercent}%` }}
            title={`Warning ${formatNumber(range.warning)}`}
          />
        )}

        {dangerPercent !== null && (
          <span
            className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-rose-500/80"
            style={{ left: `${dangerPercent}%` }}
            title={`Danger ${formatNumber(range.danger)}`}
          />
        )}

        {numeric !== null && (
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-cyan-500 shadow-sm dark:border-slate-900"
            style={{ left: `${percent}%` }}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold text-slate-400">
        <span>
          {formatNumber(range.min)}
          {range.unit ? ` ${range.unit}` : ""}
        </span>
        <span>
          {formatNumber(range.max)}
          {range.unit ? ` ${range.unit}` : ""}
        </span>
      </div>
    </div>
  );
};

const MiniTrend = ({ series, state, grow = false }) => {
  const points = buildSparklinePoints(series);
  const meta = statusMeta(state);

  if (!points) {
    return (
      <div
        className={`${
          grow ? "mt-3 flex min-h-[72px] flex-1" : "mt-3 h-11"
        } items-center justify-center rounded-xl border border-dashed border-slate-200 text-[8px] font-semibold text-slate-400 dark:border-slate-700`}
      >
        Waiting for history
      </div>
    );
  }

  const latest = series[series.length - 1]?.value;
  const first = series[0]?.value;
  const delta =
    Number.isFinite(latest) && Number.isFinite(first)
      ? latest - first
      : null;

  return (
    <div
      className={`${
        grow ? "mt-3 flex min-h-[78px] flex-1 flex-col" : "mt-3"
      } rounded-xl bg-slate-50/80 px-2.5 py-2 dark:bg-[#0B1328]`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-400">
          Recent trend
        </span>
        {delta !== null && (
          <span className="text-[8px] font-bold text-slate-400">
            {delta > 0 ? "+" : ""}
            {formatNumber(delta)}
          </span>
        )}
      </div>

      <svg
        viewBox="0 0 120 32"
        preserveAspectRatio="none"
        className={
          grow
            ? "min-h-[48px] w-full flex-1 overflow-visible"
            : "h-8 w-full overflow-visible"
        }
        aria-label="Recent measurement trend"
      >
        <line
          x1="0"
          x2="120"
          y1="29"
          y2="29"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-700"
          strokeWidth="0.8"
        />
        <polyline
          points={points}
          fill="none"
          stroke={meta.stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

export default function ProcessEquipmentWidget({
  data = {},
  history = [],
  item = {},
}) {
  const dark = useDarkMode();
  const config = useMemo(
    () =>
      normalizeProcessEquipmentConfig(
        item?.processEquipmentConfig
      ),
    [item?.processEquipmentConfig]
  );

  const definition =
    EQUIPMENT_BY_TYPE?.[config.equipmentType] ||
    EQUIPMENT_LIBRARY?.[0] ||
    {};
  const metrics = Array.isArray(definition.metrics)
    ? definition.metrics
    : [];

  const boundMetrics = metrics
    .map((metric) => {
      const dataKey =
        config.metricBindings?.[metric.id] || "";

      return {
        metric,
        dataKey,
        value: dataKey ? data?.[dataKey] : undefined,
      };
    })
    .filter(({ dataKey }) => Boolean(dataKey));

  const visualValues = Object.fromEntries(
    boundMetrics.map(({ metric, value }) => [
      metric.id,
      value,
    ])
  );

  const configuredPrimaryMetric =
    metrics.find(
      (metric) =>
        metric.id === config.primaryMetricId &&
        metric.kind !== "status"
    ) || null;

  const customPrimary = config.primaryMeasurement || {};
  const primaryDataKey =
    String(customPrimary.dataKey || "").trim() ||
    (configuredPrimaryMetric
      ? config.metricBindings?.[configuredPrimaryMetric.id] || ""
      : "");

  const primaryValue = primaryDataKey
    ? data?.[primaryDataKey]
    : undefined;

  // A semantic metric is optional. If one exists, feed the custom source into
  // the equipment visual too; otherwise the custom value remains display-only.
  if (configuredPrimaryMetric && primaryDataKey) {
    visualValues[configuredPrimaryMetric.id] = primaryValue;
  }

  const displayMetric = {
    id: configuredPrimaryMetric?.id || "customPrimaryMeasurement",
    label:
      String(customPrimary.label || "").trim() ||
      configuredPrimaryMetric?.label ||
      primaryDataKey ||
      "Measurement",
    unit:
      String(customPrimary.unit || "").trim() ||
      configuredPrimaryMetric?.unit ||
      "",
    min: configuredPrimaryMetric?.min ?? 0,
    max: configuredPrimaryMetric?.max ?? 100,
    kind: "number",
  };

  const primaryForDisplay = {
    metric: displayMetric,
    dataKey: primaryDataKey,
    value: primaryValue,
  };

  const range = resolvePrimaryRange(
    item?.rangeConfig || {},
    primaryForDisplay?.metric || {}
  );
  const overallState = resolveStatusState(
    boundMetrics,
    primaryForDisplay,
    range
  );
  const trendSeries = getTrendSeries(
    history,
    primaryForDisplay?.dataKey,
    config.trendPoints
  );

  const label =
    item?.label ||
    definition.label ||
    "Process Equipment";
  const displayUnit =
    range.unit || primaryForDisplay?.metric?.unit || "";

  if (config.displayMode === "visual") {
    return (
      <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden p-3">
        {(config.showEquipmentLabel || config.showStatus) && (
          <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
            {config.showEquipmentLabel ? (
              <div className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">
                {label}
              </div>
            ) : (
              <span />
            )}

            {config.showStatus && (
              <StatusBadge state={overallState} />
            )}
          </div>
        )}

        <div className="min-h-0 flex-1">
          <ProcessEquipmentVisual
            type={config.equipmentType}
            values={visualValues}
            alarmState={overallState}
            monitoring
            dark={dark}
          />
        </div>
      </div>
    );
  }

  if (config.displayMode === "compact") {
    return (
      <div className="grid h-full min-h-0 w-full grid-cols-[minmax(72px,0.4fr)_minmax(0,0.6fr)] gap-2 overflow-hidden p-3">
        <div className="min-h-0 overflow-hidden rounded-xl bg-slate-50/70 dark:bg-[#0B1328]">
          <ProcessEquipmentVisual
            type={config.equipmentType}
            values={visualValues}
            alarmState={overallState}
            monitoring
            dark={dark}
          />
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="truncate text-[11px] font-black text-slate-900 dark:text-slate-100">
              {label}
            </div>
            {config.showStatus && (
              <StatusBadge state={overallState} />
            )}
          </div>

          {primaryForDisplay?.dataKey ? (
            <>
              <div className="mt-2 min-w-0">
                <div className="truncate text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {metricLabel(primaryForDisplay.metric)}
                </div>
                <div className="mt-0.5 flex min-w-0 items-baseline gap-1">
                  <span className="truncate text-xl font-black leading-none text-slate-900 dark:text-white">
                    {formatValue(
                      primaryForDisplay.value,
                      primaryForDisplay.metric
                    )}
                  </span>
                  {displayUnit && (
                    <span className="shrink-0 text-[9px] font-bold text-slate-400">
                      {displayUnit}
                    </span>
                  )}
                </div>
              </div>

              {config.showRangeIndicator && (
                <RangeIndicator
                  value={primaryForDisplay.value}
                  range={range}
                  state={overallState}
                  compact
                />
              )}
            </>
          ) : (
            <div className="mt-2 text-[9px] leading-4 text-slate-400">
              Select one primary measurement in Widget Settings.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Focused / Detailed mode: one equipment visual + one important process
  // measurement. This intentionally avoids empty secondary-metric panels when
  // an installation only exposes pressure (or another single channel).
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-3">
      {(config.showEquipmentLabel || config.showStatus) && (
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            {config.showEquipmentLabel && (
              <div className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">
                {label}
              </div>
            )}
            <div className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {definition.category || "Process Equipment"}
            </div>
          </div>

          {config.showStatus && (
            <StatusBadge state={overallState} />
          )}
        </div>
      )}

      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] gap-3">
        <div className="flex min-h-0 min-w-0 items-stretch justify-stretch overflow-hidden rounded-2xl bg-slate-50/80 p-2 dark:bg-[#0B1328]">
          <div className="h-full min-h-0 w-full">
            <ProcessEquipmentVisual
              type={config.equipmentType}
              values={visualValues}
              alarmState={overallState}
              monitoring
              dark={dark}
            />
          </div>
        </div>

        <div
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-3 dark:border-slate-700/80 dark:bg-slate-900/45 ${
            config.showTrend ? "" : "justify-center"
          }`}
        >
          {primaryForDisplay?.dataKey ? (
            <>
              <div className="min-w-0 shrink-0">
                <div className="break-words text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                  {metricLabel(primaryForDisplay.metric)}
                </div>

                <div className="mt-1.5 flex min-w-0 items-baseline gap-1.5">
                  <span className="truncate text-[clamp(2rem,4vw,3rem)] font-black leading-none tracking-tight text-slate-900 dark:text-white">
                    {formatValue(
                      primaryForDisplay.value,
                      primaryForDisplay.metric
                    )}
                  </span>
                  {displayUnit && (
                    <span className="shrink-0 text-[11px] font-black text-slate-400">
                      {displayUnit}
                    </span>
                  )}
                </div>
              </div>

              {config.showRangeIndicator && (
                <RangeIndicator
                  value={primaryForDisplay.value}
                  range={range}
                  state={overallState}
                />
              )}

              {config.showTrend && (
                <MiniTrend
                  series={trendSeries}
                  state={overallState}
                  grow
                />
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center dark:border-slate-700">
                <div className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                  No primary measurement mapped
                </div>
                <div className="mt-1 text-[8px] leading-4 text-slate-400">
                  Choose a measurement label and data source in Widget Settings.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";

const WINDOW_MS = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "2d": 2 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const DEFAULT_DISPLAY = {
  heatmapColumns: 16,
  heatmapShowValues: false,
  heatmapShowLegend: true,
  heatmapShowTimeLabels: true,
  heatmapColor: "#0EA5E9",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value, fallback = null) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getTimestamp = (row, index) => {
  const candidate = row?.timestamp ?? row?._time ?? row?.time ?? row?.date;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  const parsed = new Date(candidate).getTime();
  return Number.isFinite(parsed) ? parsed : index;
};

const formatValue = (value, unit = "") => {
  if (!Number.isFinite(Number(value))) return "—";
  const numeric = Number(value);
  const text = Math.abs(numeric) >= 1000
    ? numeric.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(1);

  return `${text}${unit ? ` ${unit}` : ""}`;
};

const formatTime = (timestamp, historyWindow) => {
  if (!Number.isFinite(timestamp) || timestamp < 100000000000) return "";

  const date = new Date(timestamp);

  if (["2d", "7d", "30d", "90d"].includes(historyWindow)) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const average = (values) => {
  const valid = values.map(Number).filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const hexToRgb = (
  value,
  fallback = {
    r: 14,
    g: 165,
    b: 233,
  }
) => {
  const match =
    /^#([0-9a-fA-F]{6})$/.exec(
      String(value || "").trim()
    );

  if (!match) {
    return fallback;
  }

  const hex = match[1];

  return {
    r: parseInt(
      hex.slice(0, 2),
      16
    ),
    g: parseInt(
      hex.slice(2, 4),
      16
    ),
    b: parseInt(
      hex.slice(4, 6),
      16
    ),
  };
};

const getCellPalette = (
  value,
  min,
  max,
  warning,
  danger,
  normalColor
) => {
  if (!Number.isFinite(value)) {
    return {
      backgroundColor: "rgba(148, 163, 184, 0.12)",
      color: "#94a3b8",
      severity: "No data",
    };
  }

  if (Number.isFinite(danger) && value >= danger) {
    return {
      backgroundColor: "rgba(244, 63, 94, 0.9)",
      color: "#ffffff",
      severity: "Danger",
    };
  }

  if (Number.isFinite(warning) && value >= warning) {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.88)",
      color: "#ffffff",
      severity: "Warning",
    };
  }

  const span = Math.max(0.000001, max - min);
  const ratio = clamp((value - min) / span, 0, 1);
  const alpha = 0.12 + ratio * 0.78;

  const rgb =
    hexToRgb(normalColor);

  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`,
    color: ratio >= 0.52 ? "#ffffff" : "#0f172a",
    severity: "Normal",
  };
};

export default function HeatmapWidget({
  data = [],
  dataKeys = [],
  label = "Heatmap",
  historyWindow = "15m",
  rangeConfig = {},
  dataLabels = {},
  chartDisplay = {},
}) {
  const rootRef = useRef(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const update = () => setWidth(Math.max(220, element.getBoundingClientRect().width));
    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const display = {
    ...DEFAULT_DISPLAY,
    ...(chartDisplay || {}),
  };

  const heatmapColor =
    /^#[0-9a-fA-F]{6}$/.test(
      String(
        display.heatmapColor || ""
      )
    )
      ? display.heatmapColor
      : "#0EA5E9";
  const requestedColumns = clamp(Number(display.heatmapColumns) || 16, 6, 32);
  const responsiveColumns = width < 420
    ? Math.min(requestedColumns, 8)
    : width < 620
    ? Math.min(requestedColumns, 12)
    : requestedColumns;

  const rows = useMemo(() => {
    const source = Array.isArray(data) ? data : [];
    const normalized = source
      .map((row, index) => ({ ...row, __timestamp: getTimestamp(row, index) }))
      .sort((a, b) => a.__timestamp - b.__timestamp);

    if (!normalized.length) return [];

    const realTimestamps = normalized
      .map((row) => row.__timestamp)
      .filter((timestamp) => timestamp >= 100000000000);

    const latest = realTimestamps.length
      ? Math.max(...realTimestamps)
      : null;
    const windowMs = WINDOW_MS[historyWindow];

    if (!latest || !windowMs) return normalized;
    const cutoff = latest - windowMs;
    return normalized.filter((row) => row.__timestamp >= cutoff);
  }, [data, historyWindow]);

  const buckets = useMemo(() => {
    if (!rows.length) return [];

    const count = Math.min(responsiveColumns, rows.length);
    const result = [];

    for (let bucketIndex = 0; bucketIndex < count; bucketIndex += 1) {
      const start = Math.floor((bucketIndex * rows.length) / count);
      const end = Math.max(start + 1, Math.floor(((bucketIndex + 1) * rows.length) / count));
      const bucketRows = rows.slice(start, end);

      result.push({
        rows: bucketRows,
        timestamp: bucketRows[bucketRows.length - 1]?.__timestamp,
      });
    }

    return result;
  }, [rows, responsiveColumns]);

  const selectedKeys = Array.from(new Set((dataKeys || []).filter(Boolean)));

  const visibleValues = [];
  selectedKeys.forEach((key) => {
    buckets.forEach((bucket) => {
      const value = average(bucket.rows.map((row) => row?.[key]));
      if (Number.isFinite(value)) visibleValues.push(value);
    });
  });

  const configuredMin = toFiniteNumber(rangeConfig?.min, null);
  const configuredMax = toFiniteNumber(rangeConfig?.max, null);
  const observedMin = visibleValues.length ? Math.min(...visibleValues) : 0;
  const observedMax = visibleValues.length ? Math.max(...visibleValues) : 100;
  const min = Number.isFinite(configuredMin) ? configuredMin : observedMin;
  const rawMax = Number.isFinite(configuredMax) ? configuredMax : observedMax;
  const max = rawMax > min ? rawMax : min + 1;
  const warning = toFiniteNumber(rangeConfig?.warning, null);
  const danger = toFiniteNumber(rangeConfig?.danger, null);
  const unit = String(rangeConfig?.unit || "").trim();

  const compact = width < 520;
  const rowLabelWidth = compact ? 82 : 118;

  if (!selectedKeys.length) {
    return (
      <div ref={rootRef} className="flex h-full w-full items-center justify-center rounded-xl bg-white p-4 text-center dark:bg-[#111C34]">
        <div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</div>
          <div className="mt-1 text-xs text-slate-400">Select one or more comparable data sources.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl bg-white p-3 text-slate-900 dark:bg-[#111C34] dark:text-slate-100"
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-black uppercase tracking-[0.08em] text-slate-700 dark:text-slate-100">
            {label}
          </div>
          {!compact && (
            <div className="mt-0.5 text-[9px] text-slate-400">
              {selectedKeys.length} source{selectedKeys.length === 1 ? "" : "s"} · {historyWindow}
            </div>
          )}
        </div>

        {display.heatmapShowLegend !== false && (
          <div className="flex shrink-0 items-center gap-1.5 text-[8px] font-semibold text-slate-400">
            <span>{formatValue(min, unit)}</span>
            <div
              className="h-2.5 w-16 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(14,165,233,.12), rgba(14,165,233,.9))",
              }}
            />
            <span>{formatValue(max, unit)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-auto">
        {buckets.length ? (
          <div
            className="grid h-full min-h-0 gap-[3px]"
            style={{
              gridTemplateColumns: `${rowLabelWidth}px repeat(${buckets.length}, minmax(10px, 1fr))`,
              gridTemplateRows: `${display.heatmapShowTimeLabels === false ? "0px" : compact ? "18px" : "22px"} repeat(${selectedKeys.length}, minmax(22px, 1fr))`,
            }}
          >
            <div />

            {buckets.map((bucket, index) => {
              const showLabel =
                display.heatmapShowTimeLabels !== false &&
                (index === 0 ||
                  index === buckets.length - 1 ||
                  index % Math.max(1, Math.ceil(buckets.length / (compact ? 3 : 5))) === 0);

              return (
                <div
                  key={`time-${index}`}
                  className="flex items-end justify-center overflow-hidden text-[7px] font-semibold text-slate-400"
                  title={formatTime(bucket.timestamp, historyWindow)}
                >
                  {showLabel ? formatTime(bucket.timestamp, historyWindow) : ""}
                </div>
              );
            })}

            {selectedKeys.flatMap((key) => {
              const labelText = dataLabels?.[key] || key;
              const cells = buckets.map((bucket, bucketIndex) => {
                const value = average(bucket.rows.map((row) => row?.[key]));
                const palette =
                  getCellPalette(
                    value,
                    min,
                    max,
                    warning,
                    danger,
                    heatmapColor
                  );

                return (
                  <div
                    key={`${key}-${bucketIndex}`}
                    className="flex min-w-0 items-center justify-center overflow-hidden rounded-[5px] border border-white/20 text-[8px] font-black transition-transform hover:z-10 hover:scale-[1.06] dark:border-slate-950/20"
                    style={{
                      backgroundColor: palette.backgroundColor,
                      color: palette.color,
                    }}
                    title={`${labelText}\n${formatTime(bucket.timestamp, historyWindow)}\n${formatValue(value, unit)}\n${palette.severity}`}
                  >
                    {display.heatmapShowValues && Number.isFinite(value)
                      ? Number(value).toFixed(compact ? 0 : 1)
                      : ""}
                  </div>
                );
              });

              return [
                <div
                  key={`${key}-label`}
                  className="flex min-w-0 items-center truncate pr-2 text-[8px] font-bold text-slate-500 dark:text-slate-300"
                  title={labelText}
                >
                  <span className="truncate">{labelText}</span>
                </div>,
                ...cells,
              ];
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">
            No historical data available for this time window.
          </div>
        )}
      </div>

      {(Number.isFinite(warning) || Number.isFinite(danger)) && !compact && (
        <div className="mt-2 flex shrink-0 justify-end gap-3 text-[8px] font-semibold text-slate-400">
          {Number.isFinite(warning) && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-500" />
              Warning ≥ {formatValue(warning, unit)}
            </span>
          )}
          {Number.isFinite(danger) && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-rose-500" />
              Danger ≥ {formatValue(danger, unit)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

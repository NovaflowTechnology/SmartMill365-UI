import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gauge, TrendingUp } from "lucide-react";
import boilerImg from "../assets/Boiler.png";

export const clampImageOverlayValue = (value, min, max) =>
  Math.min(Math.max(value, min), max);

export const normalizeImageOverlayVisualType = (value) => {
  const type = String(value || "pin").toLowerCase();

  return [
    "pin",
    "value",
    "status",
    "gauge",
    "level",
    "bar",
    "sparkline",
  ].includes(type)
    ? type
    : "pin";
};

const getStatus = (value, config, hasValue) => {
  if (!hasValue) return "nodata";

  const warning = Number(config?.warning);
  const danger = Number(config?.danger);

  if (Number.isFinite(danger) && value >= danger) {
    return "critical";
  }

  if (Number.isFinite(warning) && value >= warning) {
    return "warning";
  }

  return "normal";
};

const statusStyles = {
  normal: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/25",
    label: "NORMAL",
  },
  warning: {
    dot: "bg-amber-400",
    text: "text-amber-600 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/25",
    label: "WARNING",
  },
  critical: {
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/25",
    label: "CRITICAL",
  },
  nodata: {
    dot: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-600",
    label: "NO DATA",
  },
};

const getUserScale = (scale) =>
  scale === "small" ? 0.82 : scale === "large" ? 1.18 : 1;

const formatValue = (value, decimals, hasValue) => {
  if (!hasValue) return "—";

  const safeDecimals = clampImageOverlayValue(
    Number(decimals) || 0,
    0,
    4
  );

  return Number(value).toFixed(safeDecimals);
};

const getPercent = (value, config, hasValue) => {
  if (!hasValue) return 0;

  const min = Number(config?.min);
  const max = Number(config?.max);
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax =
    Number.isFinite(max) && max !== safeMin ? max : safeMin + 100;

  return clampImageOverlayValue(
    ((value - safeMin) / (safeMax - safeMin)) * 100,
    0,
    100
  );
};

const buildSparklinePoints = (history, key) => {
  const values = (Array.isArray(history) ? history : [])
    .map((row) => Number(row?.[key]))
    .filter(Number.isFinite)
    .slice(-24);

  if (values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 28 - ((value - min) / span) * 24;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const OverlayShell = ({ children, scale, canvasScale, className = "" }) => (
  <div
    className={className}
    style={{
      transform: `scale(${getUserScale(scale) * canvasScale})`,
      transformOrigin: "center",
    }}
  >
    {children}
  </div>
);

export function ImageOverlayVisual({
  pin,
  index,
  valueMap = {},
  history = [],
  customDataOptions = [],
  canvasScale = 1,
  renderUnmapped = false,
}) {
  if (!pin?.dataKey && !renderUnmapped) return null;

  const rawValue = pin?.dataKey ? valueMap?.[pin.dataKey] : undefined;
  const numericValue = Number(rawValue);
  const hasValue =
    rawValue !== null &&
    rawValue !== undefined &&
    rawValue !== "" &&
    Number.isFinite(numericValue);
  const value = hasValue ? numericValue : 0;

  const allDataOptions = Array.isArray(customDataOptions)
    ? customDataOptions
    : [];

  const dataOption = allDataOptions.find(
    (option) => option.key === pin?.dataKey
  );

  const config = {
    min: 0,
    max: 100,
    unit: "",
    warning: 80,
    danger: 90,
    ...(dataOption?.rangeConfig || {}),
    ...(pin?.rangeConfig || {}),
  };

  const display = {
    label: "",
    decimals: 1,
    scale: "medium",
    showLabel: true,
    showStatus: true,
    ...(pin?.display || {}),
  };

  const status = getStatus(value, config, hasValue);
  const style = statusStyles[status];
  const label =
    display.label ||
    dataOption?.label ||
    pin?.source?.field ||
    pin?.source?.channel ||
    pin?.dataKey ||
    `Overlay #${index + 1}`;

  const formattedValue = formatValue(value, display.decimals, hasValue);
  const percent = getPercent(value, config, hasValue);
  const visualType = normalizeImageOverlayVisualType(pin?.visualType);
  const unitText = config.unit ? ` ${config.unit}` : "";
  const sparklinePoints = buildSparklinePoints(history, pin?.dataKey);

  if (visualType === "value") {
    return (
      <OverlayShell
        scale={display.scale}
        canvasScale={canvasScale}
        className="min-w-[112px] rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-white shadow-xl backdrop-blur-md"
      >
        {display.showLabel && (
          <div className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-300">
            {label}
          </div>
        )}
        <div className="mt-0.5 text-base font-black tabular-nums">
          {formattedValue}
          <span className="ml-1 text-[10px] font-semibold text-slate-300">
            {config.unit}
          </span>
        </div>
      </OverlayShell>
    );
  }

  if (visualType === "status") {
    return (
      <OverlayShell
        scale={display.scale}
        canvasScale={canvasScale}
        className={`min-w-[108px] rounded-xl border bg-white/95 px-3 py-2 shadow-xl backdrop-blur dark:bg-slate-950/90 ${style.border}`}
      >
        {display.showLabel && (
          <div className="truncate text-[9px] font-bold text-slate-600 dark:text-slate-300">
            {label}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <span className={`text-[10px] font-black ${style.text}`}>
            {style.label}
          </span>
        </div>
      </OverlayShell>
    );
  }

  if (visualType === "gauge") {
    return (
      <OverlayShell
        scale={display.scale}
        canvasScale={canvasScale}
        className="rounded-xl border border-white/20 bg-slate-950/85 p-2 text-white shadow-xl backdrop-blur-md"
      >
        <div
          className="relative mx-auto h-14 w-14 rounded-full"
          style={{
            background: `conic-gradient(from -90deg, #22d3ee 0deg ${
              percent * 3.6
            }deg, rgba(148,163,184,.25) ${percent * 3.6}deg 360deg)`,
          }}
        >
          <div className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full bg-slate-950">
            <Gauge size={11} className="text-cyan-300" />
            <span className="mt-0.5 text-[9px] font-black">
              {formattedValue}
            </span>
          </div>
        </div>
        {display.showLabel && (
          <div className="mt-1 max-w-[100px] truncate text-center text-[8px] text-slate-300">
            {label}
          </div>
        )}
      </OverlayShell>
    );
  }

  if (visualType === "level") {
    return (
      <OverlayShell
        scale={display.scale}
        canvasScale={canvasScale}
        className="flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/85 p-2 text-white shadow-xl backdrop-blur-md"
      >
        <div className="relative h-16 w-8 overflow-hidden rounded-md border border-slate-500 bg-slate-900">
          <div
            className="absolute bottom-0 left-0 right-0 bg-cyan-400/80 transition-all duration-500"
            style={{ height: `${percent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black">
            {Math.round(percent)}%
          </div>
        </div>
        <div className="min-w-[68px]">
          {display.showLabel && (
            <div className="max-w-[90px] truncate text-[8px] text-slate-300">
              {label}
            </div>
          )}
          <div className="mt-1 text-[11px] font-black">
            {formattedValue}
            <span className="ml-1 text-[8px] text-slate-300">
              {config.unit}
            </span>
          </div>
        </div>
      </OverlayShell>
    );
  }

  if (visualType === "bar") {
    return (
      <OverlayShell
        scale={display.scale}
        canvasScale={canvasScale}
        className="min-w-[150px] rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-white shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-2">
          {display.showLabel && (
            <span className="truncate text-[8px] text-slate-300">{label}</span>
          )}
          <span className="shrink-0 text-[9px] font-black">
            {formattedValue}
            {unitText}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </OverlayShell>
    );
  }

  if (visualType === "sparkline") {
    return (
      <OverlayShell
        scale={display.scale}
        canvasScale={canvasScale}
        className="min-w-[150px] rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-white shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {display.showLabel && (
              <div className="truncate text-[8px] text-slate-300">{label}</div>
            )}
            <div className="text-[10px] font-black">
              {formattedValue}
              {unitText}
            </div>
          </div>
          <TrendingUp size={13} className="shrink-0 text-cyan-300" />
        </div>
        <svg
          viewBox="0 0 100 30"
          className="mt-1 h-8 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="28"
            x2="100"
            y2="28"
            stroke="rgba(148,163,184,.22)"
            strokeWidth="1"
          />
          {sparklinePoints ? (
            <polyline
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.2"
              points={sparklinePoints}
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <text x="50" y="18" textAnchor="middle" fontSize="8" fill="#94a3b8">
              No history
            </text>
          )}
        </svg>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell
      scale={display.scale}
      canvasScale={canvasScale}
      className="group flex flex-col items-center"
    >
      {status === "critical" && (
        <div className={`absolute h-8 w-8 animate-ping rounded-full opacity-30 ${style.dot}`} />
      )}

      <div
        className={`relative h-5 w-5 rounded-full border-2 border-white shadow-xl ${style.dot} ${
          status === "critical" ? "animate-pulse" : ""
        }`}
      />

      <div className="mt-2 min-w-[110px] max-w-[170px] break-words rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-center text-white shadow-2xl backdrop-blur-md">
        {display.showLabel && (
          <div className="mb-1 truncate text-[9px] uppercase tracking-wide opacity-70">
            {label}
          </div>
        )}
        <div className="text-sm font-bold">
          {formattedValue}
          {unitText}
        </div>
        {display.showStatus && (
          <div className={`mt-1 text-[8px] font-semibold uppercase tracking-wider ${style.text}`}>
            {style.label}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export default function ImageOverlayCanvas({
  image = null,
  pins = [],
  valueMap = {},
  history = [],
  customDataOptions = [],
  renderUnmapped = false,
  editorMode = false,
  draggingIndex = null,
  selectedIndex = null,
  onCanvasClick,
  onCanvasPointerMove,
  onOverlayPointerDown,
  onOverlayClick,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  imageAlt = "Interactive process diagram",
  className = "",
}) {
  const rootRef = useRef(null);
  const imageRef = useRef(null);
  const [imageBox, setImageBox] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const safePins = Array.isArray(pins) ? pins : [];
  const imageSrc = image?.croppedSrc || image?.originalSrc || boilerImg;

  const updateImageBox = useCallback(() => {
    const root = rootRef.current;
    const img = imageRef.current;
    if (!root || !img) return;

    const rect = root.getBoundingClientRect();
    const naturalWidth = img.naturalWidth || 1;
    const naturalHeight = img.naturalHeight || 1;

    if (!rect.width || !rect.height || !naturalWidth || !naturalHeight) {
      return;
    }

    const scale = Math.min(
      rect.width / naturalWidth,
      rect.height / naturalHeight
    );
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    setImageBox({
      left: (rect.width - width) / 2,
      top: (rect.height - height) / 2,
      width,
      height,
    });
  }, []);

  useEffect(() => {
    updateImageBox();

    const observer = new ResizeObserver(updateImageBox);
    if (rootRef.current) observer.observe(rootRef.current);

    window.addEventListener("resize", updateImageBox);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateImageBox);
    };
  }, [updateImageBox]);

  const pointerToImagePosition = useCallback(
    (event) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect || !imageBox.width || !imageBox.height) return null;

      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;

      const inside =
        px >= imageBox.left &&
        px <= imageBox.left + imageBox.width &&
        py >= imageBox.top &&
        py <= imageBox.top + imageBox.height;

      return {
        x: clampImageOverlayValue(
          ((px - imageBox.left) / imageBox.width) * 100,
          0,
          100
        ),
        y: clampImageOverlayValue(
          ((py - imageBox.top) / imageBox.height) * 100,
          0,
          100
        ),
        inside,
      };
    },
    [imageBox]
  );

  const canvasScale = useMemo(() => {
    if (!imageBox.width) return 1;

    // Reference width keeps overlay size proportional to the process image.
    // This makes a large editor preview and a smaller dashboard widget look
    // like the same composition rather than using fixed-pixel overlay cards.
    return clampImageOverlayValue(imageBox.width / 1000, 0.32, 1.8);
  }, [imageBox.width]);

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      onClick={(event) => {
        if (event.target.closest("[data-image-overlay-control='true']")) return;
        const position = pointerToImagePosition(event);
        if (!position?.inside) return;
        onCanvasClick?.(position, event);
      }}
      onPointerMove={(event) => {
        const position = pointerToImagePosition(event);
        if (!position) return;
        onCanvasPointerMove?.(position, event);
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      <img
        ref={imageRef}
        src={imageSrc}
        alt={imageAlt}
        draggable={false}
        onLoad={updateImageBox}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      />

      <div className="pointer-events-none absolute inset-0 z-0 bg-black/[0.02] dark:bg-black/15" />

      <div
        className="pointer-events-none absolute z-10"
        style={{
          left: imageBox.left,
          top: imageBox.top,
          width: imageBox.width,
          height: imageBox.height,
        }}
      >
        {safePins.map((pin, index) => {
          if (!pin?.dataKey && !renderUnmapped) return null;

          const x = clampImageOverlayValue(Number(pin?.x) || 0, 0, 100);
          const y = clampImageOverlayValue(Number(pin?.y) || 0, 0, 100);
          const isActive = editorMode && (selectedIndex === index || draggingIndex === index);

          return (
            <div
              key={pin?.id || `${pin?.dataKey || "overlay"}-${index}`}
              className="pointer-events-none absolute z-20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                data-image-overlay-control="true"
                className={`relative ${
                  editorMode
                    ? pin?.locked
                      ? "pointer-events-auto cursor-not-allowed"
                      : "pointer-events-auto cursor-move"
                    : "pointer-events-none"
                } ${isActive ? "rounded-xl ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent" : ""}`}
                onPointerDown={(event) => {
                  if (!editorMode) return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  onOverlayPointerDown?.(event, index);
                }}
                onClick={(event) => {
                  if (!editorMode) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onOverlayClick?.(event, index);
                }}
              >
                <ImageOverlayVisual
                  pin={pin}
                  index={index}
                  valueMap={valueMap}
                  history={history}
                  customDataOptions={customDataOptions}
                  canvasScale={canvasScale}
                  renderUnmapped={renderUnmapped}
                />

                {editorMode && (
                  <div
                    className={`absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[8px] font-black text-white shadow ${
                      pin?.locked ? "bg-slate-500" : "bg-emerald-500"
                    }`}
                    style={{
                      transform: `scale(${canvasScale})`,
                      transformOrigin: "center",
                    }}
                  >
                    {index + 1}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

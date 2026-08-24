import { useEffect, useState } from "react";

// Visualization palette derived from the supplied dark analytics reference:
// electric cyan, indigo, violet, coral, amber and steel blue on deep navy surfaces.
export const TECH_SERIES = [
  "#58D7FF", // electric cyan
  "#7D75E7", // indigo
  "#A86BDF", // violet
  "#FF6F88", // coral pink
  "#FF9C63", // coral orange
  "#FFD66B", // warm amber
  "#4D91C9", // steel blue
  "#8DA2FF", // periwinkle
];

// Keep the legacy property names so existing widgets do not need a large API
// refactor; the values now point to the new visual system.
export const TECH_ACCENT = {
  lime: "#58D7FF",
  forest: "#7D75E7",
  olive: "#A86BDF",
  plum: "#FF6F88",
  berry: "#A86BDF",
  sage: "#4D91C9",
  pale: "#FFD66B",
  ink: "#101A31",
  paper: "#FFFFFF",
  canvas: "#F2F4F8",
  darkPaper: "#0E172D",
  darkCanvas: "#081022",
};

export const TECH_SURFACE_CLASS = `
  dashboard-widget-surface relative h-full w-full overflow-hidden
  rounded-[11px]
  bg-white text-slate-950
  shadow-[0_4px_14px_rgba(30,41,35,0.10)]
  dark:bg-[#0E172D] dark:text-slate-100
  dark:shadow-[0_8px_24px_rgba(2,7,22,0.38)]
`;

export const TECH_HEADER_CLASS = `
  text-[12px] font-extrabold tracking-[-0.01em]
  text-slate-900 dark:text-slate-100
`;

export const TECH_MUTED_CLASS =
  "text-slate-400 dark:text-[#96A4C7]";

export const TECH_DOT_SAFE_HEADER = "pr-14";

export const TECH_GRID_STROKE = "#DDE3EA";
export const TECH_AXIS_STROKE = "#94A3B8";

export const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

export const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? numericValue
    : fallback;
};

export const readableFieldLabel = (value = "") =>
  String(value || "Value")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

export const formatCompactValue = (value, decimals = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";

  if (Math.abs(numeric) >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(numeric) >= 1_000) {
    return `${(numeric / 1_000).toFixed(1)}k`;
  }

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const botanicalTooltipStyle = {
  background: "rgba(13, 22, 44, 0.97)",
  border: "1px solid rgba(88, 215, 255, 0.28)",
  borderRadius: "12px",
  color: "#F5F7FF",
  fontSize: "11px",
  boxShadow:
    "0 14px 34px rgba(2,7,22,0.42), 0 0 22px rgba(88,215,255,0.06)",
};

export function useWidgetSize(ref) {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = ref?.current;
    if (!element) return undefined;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: rect.height,
      });
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () =>
        window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return {
    ...size,
    tiny:
      size.width > 0 &&
      (size.width < 220 || size.height < 150),
    compact:
      size.width > 0 &&
      (size.width < 380 || size.height < 285),
    wide: size.width >= 540,
    tall: size.height >= 380,
  };
}

// Three tiny accent LEDs echo the supplied reference and provide a subtle
// shared signature across widget cards. The animation is defined globally and
// automatically respects prefers-reduced-motion.
export function TechBackdrop() {
  return (
    <>
      <div
        className="
          widget-tech-backdrop
          pointer-events-none absolute right-3.5 top-3.5 z-20
          flex items-center gap-1 opacity-60 dark:opacity-70
        "
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#58D7FF] shadow-[0_0_8px_rgba(88,215,255,0.45)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#A86BDF] shadow-[0_0_8px_rgba(168,107,223,0.38)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6F88] shadow-[0_0_8px_rgba(255,111,136,0.34)]" />
      </div>
    </>
  );
}

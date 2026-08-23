import { useEffect, useState } from "react";

// Editorial / botanical palette inspired by the user's green dashboard reference.
// Keep the palette shared so every visualization feels like one product.
export const TECH_SERIES = [
  "#7CB342", // fresh leaf
  "#2E7D32", // forest
  "#A4C65A", // soft lime
  "#6D254D", // plum
  "#4F8A5B", // sage green
  "#B65C7A", // berry
  "#C5D98B", // pale olive
  "#365F3C", // deep moss
];

export const TECH_ACCENT = {
  lime: "#7CB342",
  forest: "#2E7D32",
  olive: "#A4C65A",
  plum: "#6D254D",
  berry: "#B65C7A",
  sage: "#4F8A5B",
  pale: "#C5D98B",
  ink: "#172019",
  paper: "#FFFFFF",
  canvas: "#F2F3F0",
  darkPaper: "#121816",
  darkCanvas: "#0B100E",
};

export const TECH_SURFACE_CLASS = `
  dashboard-widget-surface relative h-full w-full overflow-hidden
  rounded-[11px]
  bg-white text-slate-950
  shadow-[0_4px_14px_rgba(30,41,35,0.10)]
  dark:bg-[#121816] dark:text-slate-100
  dark:shadow-[0_4px_14px_rgba(0,0,0,0.22)]
`;

export const TECH_HEADER_CLASS = `
  text-[12px] font-extrabold tracking-[-0.01em]
  text-slate-900 dark:text-slate-100
`;

export const TECH_MUTED_CLASS =
  "text-slate-400 dark:text-slate-400";

export const TECH_DOT_SAFE_HEADER = "pr-14";

export const TECH_GRID_STROKE = "#DDE3D8";
export const TECH_AXIS_STROKE = "#9AA69A";

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
  background: "rgba(18,24,22,0.97)",
  border: "1px solid rgba(164,198,90,0.28)",
  borderRadius: "12px",
  color: "#f8fafc",
  fontSize: "11px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.20)",
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

// Subtle visual signature shared by every widget: no card gradient, no metallic
// effect; only a tiny botanical corner mark so the cards feel related.
export function TechBackdrop() {
  return (
    <>
      <div
        className="
          pointer-events-none absolute right-3.5 top-3.5 z-20
          flex items-center gap-1 opacity-50 dark:opacity-35
        "
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#7CB342]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#B7D27C]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#7C355D]" />
      </div>
      {/* Intentionally no border/underline: cards are separated by shadow only. */}
    </>
  );
}

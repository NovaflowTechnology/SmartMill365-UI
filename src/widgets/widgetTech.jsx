import { useEffect, useState } from "react";

export const TECH_SERIES = [
  "#22d3ee",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#f43f5e",
  "#a3e635",
  "#ec4899",
];

export const TECH_SURFACE_CLASS = `
  relative h-full w-full overflow-hidden
  rounded-2xl border border-cyan-100/80
  bg-gradient-to-br
  from-slate-50 via-white to-cyan-50/50
  text-slate-900
  shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]
  dark:border-cyan-500/20
  dark:from-slate-950 dark:via-slate-900
  dark:to-cyan-950/20 dark:text-white
`;

export const TECH_HEADER_CLASS = `
  text-[11px] font-semibold uppercase tracking-[0.16em]
  text-slate-500 dark:text-cyan-100/65
`;

export const TECH_MUTED_CLASS =
  "text-slate-500 dark:text-slate-400";

export const TECH_GRID_STROKE = "#64748b";
export const TECH_AXIS_STROKE = "#94a3b8";

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
      (size.width < 360 || size.height < 240),
    wide:
      size.width >= 520,
    tall:
      size.height >= 360,
  };
}

export function TechBackdrop() {
  return (
    <>
      <div
        className="
          pointer-events-none absolute inset-0 opacity-40
          [background-image:linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)]
          [background-size:24px_24px]
          dark:opacity-30
        "
      />
      <div
        className="
          pointer-events-none absolute -right-16 -top-16
          h-36 w-36 rounded-full
          bg-cyan-400/10 blur-3xl
          dark:bg-cyan-400/10
        "
      />
    </>
  );
}

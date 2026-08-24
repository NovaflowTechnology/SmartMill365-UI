import { PROCESS_MEDIA } from "./equipmentLibrary";

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

export default function ProcessPipeline({
  id,
  path,
  medium = "steam",
  value,
  label,
  selected = false,
  dark = false,
  variant = "editor",
  onSelect,
}) {
  const media = PROCESS_MEDIA[medium] || PROCESS_MEDIA.steam;
  const numeric = Number(value);
  const hasValue = Number.isFinite(numeric);
  const magnitude = hasValue ? Math.abs(numeric) : 0;
  const monitoring = variant === "monitor";

  // Keep topology stable while still giving higher flows slightly more visual weight.
  const strokeWidth = monitoring
    ? 4.5 + clamp(magnitude / 90, 0, 2.4)
    : selected
    ? 6
    : 3 + clamp(magnitude / 80, 0, 2);

  // Higher flow means faster directional movement.
  const duration = clamp(
    (monitoring ? 2.1 : 2.4) - magnitude / 55,
    monitoring ? 0.48 : 0.55,
    monitoring ? 2.1 : 2.4
  );

  const active = !hasValue || magnitude > 0.05;
  const markerId = monitoring
    ? `monitor-arrow-${medium}`
    : `arrow-${medium}`;

  return (
    <g data-pipeline-id={id}>
      {onSelect && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="18"
          className="cursor-pointer"
          onClick={onSelect}
        />
      )}

      {monitoring && (
        <path
          d={path}
          fill="none"
          stroke={media.color}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={active ? (dark ? 0.10 : 0.07) : (dark ? 0.04 : 0.025)}
          strokeLinecap="round"
          className="pointer-events-none"
          style={{
            filter: dark ? `drop-shadow(0 0 8px ${media.color}55)` : `drop-shadow(0 0 4px ${media.color}33)`,
          }}
        />
      )}

      <path
        d={path}
        fill="none"
        stroke={media.color}
        strokeWidth={strokeWidth}
        strokeOpacity={
          selected ? 0.98 : active ? (monitoring ? 0.92 : 0.72) : 0.24
        }
        strokeLinecap="round"
        strokeDasharray={active ? (monitoring ? "13 9" : "10 9") : "4 9"}
        markerEnd={`url(#${markerId})`}
        className={
          active
            ? "process-flow-line pointer-events-none"
            : "pointer-events-none"
        }
        style={{
          animationDuration: `${duration}s`,
          filter: monitoring
            ? dark
              ? `drop-shadow(0 0 3px ${media.color}55)`
              : `drop-shadow(0 0 2px ${media.color}2b)`
            : undefined,
        }}
      />

      <title>
        {`${label || media.label}${
          hasValue ? `: ${numeric.toFixed(1)}` : ""
        }`}
      </title>
    </g>
  );
}

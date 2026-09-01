import { PROCESS_MEDIA } from "./equipmentLibrary";

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

export const PIPE_DESIGNS = [
  {
    value: "industrial",
    label: "Industrial Pipe",
    description: "Cased pipe with highlight and moving flow particles.",
  },
  {
    value: "classic",
    label: "Classic Pipe",
    description: "Clean solid pipe with a subtle casing.",
  },
  {
    value: "double",
    label: "Double Line",
    description: "Twin-wall process line for a technical diagram look.",
  },
  {
    value: "segmented",
    label: "Segmented Flow",
    description: "Animated dashed process line.",
  },
  {
    value: "neon",
    label: "Active Glow",
    description: "Bright monitoring line with a stronger operating glow.",
  },
  {
    value: "minimal",
    label: "Minimal Line",
    description: "Thin simple process connection.",
  },
];

export const CONNECTION_TYPES = [
  {
    value: "pipeline",
    label: "Pipeline",
    description: "Industrial process pipe with optional animated flow.",
  },
  {
    value: "arrow",
    label: "Arrow",
    description: "Directional connector with an arrow head.",
  },
  {
    value: "line",
    label: "Line",
    description: "Simple plain connector without an arrow head.",
  },
];

const CONNECTION_TYPE_VALUES =
  new Set(
    CONNECTION_TYPES.map(
      (item) => item.value
    )
  );

const normalizeConnectionType = (
  value
) =>
  CONNECTION_TYPE_VALUES.has(value)
    ? value
    : "pipeline";

const PIPE_DESIGN_VALUES =
  new Set(PIPE_DESIGNS.map((item) => item.value));

const normalizePipeDesign = (value) =>
  PIPE_DESIGN_VALUES.has(value)
    ? value
    : "industrial";

const normalizeColor = (value, fallback) => {
  const candidate = String(value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return candidate;
  }

  return fallback;
};

function FlowParticle({
  path,
  color,
  duration,
  delay = 0,
  monitoring = false,
  size = 1,
}) {
  const radius =
    (monitoring ? 4.2 : 3.5) * size;

  return (
    <g className="pointer-events-none">
      <circle
        r={radius + 2}
        fill={color}
        opacity={0.16}
      >
        <animateMotion
          path={path}
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>

      <circle
        r={radius}
        fill={color}
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={monitoring ? 1.4 : 1.1}
      >
        <animateMotion
          path={path}
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>

      <circle
        r={Math.max(1.05, radius * 0.28)}
        fill="#FFFFFF"
        opacity={0.9}
      >
        <animateMotion
          path={path}
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

export default function ProcessPipeline({
  id,
  path,
  medium = "steam",
  value,
  label,
  selected = false,
  dark = false,
  variant = "editor",

  // Connection appearance
  connectorType = "pipeline",
  pipeDesign = "industrial",
  colorOverride = "",
  animateFlow = true,

  // Kept for backward compatibility with older saved layouts.
  connectionStyle,
  onSelect,
  onPointerDown,
  onDoubleClick,
}) {
  const media =
    PROCESS_MEDIA[medium] ||
    PROCESS_MEDIA.steam;

  const normalizedConnectorType =
    normalizeConnectionType(
      connectorType ||
        (
          connectionStyle ===
          "arrows"
            ? "arrow"
            : "pipeline"
        )
    );

  const design =
    normalizePipeDesign(
      pipeDesign ||
        "industrial"
    );

  const pipeColor =
    normalizeColor(
      colorOverride,
      media.color
    );

  const numeric = Number(value);
  const hasValue =
    Number.isFinite(numeric);
  const magnitude =
    hasValue ? Math.abs(numeric) : 0;

  const monitoring =
    variant === "monitor";

  const active =
    !hasValue || magnitude > 0.05;

  const baseWidth =
    monitoring
      ? 5.4 +
        clamp(magnitude / 100, 0, 1.9)
      : selected
      ? 6.2
      : 4.8 +
        clamp(magnitude / 110, 0, 1.4);

  const borderColor =
    dark ? "#263553" : "#CBD7E5";

  const duration = clamp(
    (monitoring ? 2.15 : 2.55) -
      magnitude / 65,
    monitoring ? 0.62 : 0.72,
    monitoring ? 2.15 : 2.55
  );

  const particleCount =
    design === "neon" ? 4 : 3;

  const particleScale =
    design === "neon" ? 1.08 : 1;

  const renderParticles =
    normalizedConnectorType ===
      "pipeline" &&
    animateFlow &&
    active &&
    [
      "industrial",
      "neon",
      "classic",
    ].includes(design);

  const arrowMarkerId =
    `connection-arrow-${String(
      id || "connection"
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      )}`;

  const simpleWidth =
    monitoring
      ? 2.6
      : selected
      ? 3
      : 2.2;

  return (
    <g
      data-pipeline-id={id}
      data-pipe-design={design}
      data-pipe-color={pipeColor}
      data-connector-type={
        normalizedConnectorType
      }
    >
      {normalizedConnectorType ===
        "arrow" && (
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="4.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L9,4.5 L0,9 z"
              fill={pipeColor}
            />
          </marker>
        </defs>
      )}
      {/* Easy selection / drag hit-area.
          The visible pipe remains pointer-events-none; this wider
          transparent path is what users select and drag. */}
      {(onSelect || onPointerDown) && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            onPointerDown
              ? "cursor-move"
              : "cursor-pointer"
          }
          onPointerDown={onPointerDown}
          onClick={onSelect}
          onDoubleClick={onDoubleClick}
        />
      )}

      {normalizedConnectorType === "pipeline" && (
        <>
      {/* -----------------------------------------------
          INDUSTRIAL
         ----------------------------------------------- */}
      {design === "industrial" && (
        <>
          <path
            d={path}
            fill="none"
            stroke={borderColor}
            strokeWidth={baseWidth + 4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={selected ? 1 : .94}
            className="pointer-events-none"
          />

          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={baseWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? .96 : .34}
            className="pointer-events-none"
            style={{
              filter:
                selected || monitoring
                  ? `drop-shadow(0 0 4px ${pipeColor}66)`
                  : undefined,
            }}
          />

          <path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,.78)"
            strokeWidth={Math.max(1, baseWidth * .18)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? .62 : .2}
            className="pointer-events-none"
          />
        </>
      )}

      {/* -----------------------------------------------
          CLASSIC
         ----------------------------------------------- */}
      {design === "classic" && (
        <>
          <path
            d={path}
            fill="none"
            stroke={borderColor}
            strokeWidth={baseWidth + 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={baseWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? .94 : .32}
            className="pointer-events-none"
          />
        </>
      )}

      {/* -----------------------------------------------
          DOUBLE WALL
         ----------------------------------------------- */}
      {design === "double" && (
        <>
          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={baseWidth + 5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? .92 : .34}
            className="pointer-events-none"
          />
          <path
            d={path}
            fill="none"
            stroke={dark ? "#071124" : "#F8FAFC"}
            strokeWidth={Math.max(2.2, baseWidth - .5)}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={Math.max(1.2, baseWidth * .28)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".92"
            className={
              animateFlow && active
                ? "process-flow-line pointer-events-none"
                : "pointer-events-none"
            }
            strokeDasharray="7 7"
            style={{
              animationDuration: `${duration}s`,
            }}
          />
        </>
      )}

      {/* -----------------------------------------------
          SEGMENTED
         ----------------------------------------------- */}
      {design === "segmented" && (
        <>
          <path
            d={path}
            fill="none"
            stroke={borderColor}
            strokeWidth={baseWidth + 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={baseWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="12 8"
            opacity={active ? .98 : .34}
            className={
              animateFlow && active
                ? "process-flow-line pointer-events-none"
                : "pointer-events-none"
            }
            style={{
              animationDuration: `${duration}s`,
            }}
          />
        </>
      )}

      {/* -----------------------------------------------
          NEON / ACTIVE GLOW
         ----------------------------------------------- */}
      {design === "neon" && (
        <>
          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={baseWidth + 11}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? .12 : .04}
            className="pointer-events-none"
            style={{
              filter: `blur(2px) drop-shadow(0 0 8px ${pipeColor})`,
            }}
          />

          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={baseWidth + 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={active ? 1 : .32}
            className="pointer-events-none"
            style={{
              filter: `drop-shadow(0 0 5px ${pipeColor})`,
            }}
          />

          <path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,.9)"
            strokeWidth={Math.max(1, baseWidth * .18)}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        </>
      )}

      {/* -----------------------------------------------
          MINIMAL
         ----------------------------------------------- */}
      {design === "minimal" && (
        <path
          d={path}
          fill="none"
          stroke={pipeColor}
          strokeWidth={Math.max(2.2, baseWidth * .62)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? .92 : .3}
          className="pointer-events-none"
        />
      )}

        </>
      )}

      {/* Simple line / arrow connectors */}
      {normalizedConnectorType !==
        "pipeline" && (
        <>
          {selected && (
            <path
              d={path}
              fill="none"
              stroke={
                dark
                  ? "#E8EDFF"
                  : "#334155"
              }
              strokeWidth={
                simpleWidth + 5
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".12"
              className="pointer-events-none"
            />
          )}

          <path
            d={path}
            fill="none"
            stroke={pipeColor}
            strokeWidth={simpleWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={
              normalizedConnectorType ===
              "arrow"
                ? `url(#${arrowMarkerId})`
                : undefined
            }
            opacity={
              active ? 0.96 : 0.36
            }
            className="pointer-events-none"
            style={{
              filter:
                selected
                  ? `drop-shadow(0 0 3px ${pipeColor}55)`
                  : undefined,
            }}
          />
        </>
      )}

      {/* Animated process particles */}
      {renderParticles &&
        Array.from({
          length: particleCount,
        }).map((_, index) => (
          <FlowParticle
            key={`${id}-particle-${index}`}
            path={path}
            color={pipeColor}
            duration={duration}
            delay={
              -(duration * index) /
              particleCount
            }
            monitoring={monitoring}
            size={particleScale}
          />
        ))}

      <title>
        {`${
          normalizedConnectorType ===
          "pipeline"
            ? label || media.label
            : label ||
              (
                normalizedConnectorType ===
                "arrow"
                  ? "Arrow"
                  : "Line"
              )
        }${
          hasValue &&
          normalizedConnectorType ===
            "pipeline"
            ? `: ${numeric.toFixed(1)}`
            : ""
        }`}
      </title>
    </g>
  );
}

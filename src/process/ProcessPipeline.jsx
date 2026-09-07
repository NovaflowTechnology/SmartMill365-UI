import { useId } from "react";
import { PipeRoute, ConveyorRoute, roundProcessRoute } from "./ProcessRouteVisual";
import {
  buildPipeNetworkJunctions,
} from "./ProcessPipeParts";

export {
  buildPipeNetworkJunctions,
};

export function ProcessPipeJunctions({ junctions = [], dark = false }) {
  return (
    <g className="pointer-events-none">
      {junctions.map((junction) => {
        const type = junction.connectorType || "pipeline";
        const color = junction.color || "#64748B";

        if (type === "line") {
          return <rect key={junction.id} x={junction.x - 4} y={junction.y - 4} width="8" height="8"
            transform={`rotate(45 ${junction.x} ${junction.y})`} rx="1" fill={dark ? "#111B34" : "#FFFFFF"} stroke={color} strokeWidth="2" />;
        }

        if (type === "arrow") {
          return <g key={junction.id} transform={`translate(${junction.x} ${junction.y})`}>
            <circle r="6" fill={dark ? "#111B34" : "#FFFFFF"} stroke={color} strokeWidth="2" />
            <circle r="2.2" fill={color} />
          </g>;
        }

        if (type === "conveyor") {
          return <g key={junction.id} transform={`translate(${junction.x} ${junction.y})`}>
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill={dark ? "#59636B" : "#A7B0B5"} stroke="#E5BA42" strokeWidth="2" />
            <circle r="4" fill="#E5BA42" stroke="#8C762D" />
          </g>;
        }

        return <g key={junction.id} transform={`translate(${junction.x} ${junction.y})`}>
          <circle r="10" fill={dark ? "#555F68" : "#899399"} />
          <circle r="7" fill={dark ? "#B9C0C4" : "#D5DADD"} stroke={dark ? "#7B858C" : "#69747B"} strokeWidth="1.5" />
          <circle r="3.5" fill={color || (dark ? "#929CA3" : "#AEB7BC")} opacity=".75" />
        </g>;
      })}
    </g>
  );
}

const clamp = (
  value,
  min,
  max
) =>
  Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

export const PIPE_DESIGNS = [
  {
    value: "auto",
    label: "Pipe",
    description:
      "Continuous steel pipe following the connection route.",
  },
  {
    value: "conveyorTrack",
    label: "Conveyor",
    description: "Roller belt following the connection route.",
  },
  {
    value: "realPipe",
    label: "Real Pipe",
    description:
      "Industrial pipe with straight sections, elbows, flanges, couplings, and animated internal flow.",
  },
];

export const CONNECTION_TYPES = [
  {
    value: "pipeline",
    label: "Pipe",
    description:
      "Steel pipe with editable endpoints and bends.",
  },
  {
    value: "conveyor",
    label: "Conveyor",
    description: "Continuous conveyor with editable endpoints and bends.",
  },
  {
    value: "arrow",
    label: "Arrow",
    description:
      "Directional connector with continuously travelling direction markers.",
  },
  {
    value: "line",
    label: "Signal Line",
    description:
      "Dynamic process/control line with travelling signal markers.",
  },
];

const SOLID_MEDIA =
  new Set([
    "fruit",
    "ffb",
    "looseFruit",
    "freshFruitBunch",
    "bunch",
    "product",
    "package",
    "solid",
    "fiber",
    "kernel",
    "emptyBunch",
  ]);

export const isSolidProcessMedium = (
  medium
) =>
  SOLID_MEDIA.has(
    String(
      medium || ""
    )
  );

export const normalizePipeDesignValue = (
  value
) => {
  const candidate =
    String(
      value || ""
    );

  if (
    candidate ===
      "conveyor" ||
    candidate ===
      "conveyorTrack"
  ) {
    return "conveyorTrack";
  }

  if (
    [
      "industrial",
      "classic",
      "double",
      "segmented",
      "neon",
      "minimal",
      "realPipe",
    ].includes(
      candidate
    )
  ) {
    return "realPipe";
  }

  if (
    candidate ===
    "auto"
  ) {
    return "auto";
  }

  return "auto";
};

export const resolveDynamicPipeDesign = (
  design
) => {
  const normalized =
    normalizePipeDesignValue(
      design
    );

  if (
    normalized !==
    "auto"
  ) {
    return normalized;
  }

  return "realPipe";
};

const normalizeConnectorType = (
  value
) =>
  [
    "pipeline",
    "conveyor",
    "arrow",
    "line",
  ].includes(value)
    ? value
    : "pipeline";

const normalizeColor = (
  value,
  fallback
) => {
  const candidate =
    String(
      value || ""
    ).trim();

  return /^#[0-9a-fA-F]{6}$/.test(
    candidate
  )
    ? candidate
    : fallback;
};

function DirectionMarker({
  path,
  color,
  duration,
  delay = 0,
  type = "arrow",
}) {
  if (
    type === "line"
  ) {
    return (
      <g className="pointer-events-none">
        <circle
          r="3"
          fill={color}
          stroke="rgba(255,255,255,.92)"
          strokeWidth=".8"
        >
          <animateMotion
            path={path}
            dur={`${duration}s`}
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
        </circle>
        <circle
          r="6"
          fill={color}
          opacity=".08"
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

  return (
    <polygon
      points="-6,-3.6 5,0 -6,3.6 -2,0"
      fill={color}
      stroke="rgba(255,255,255,.92)"
      strokeWidth=".65"
      className="pointer-events-none"
    >
      <animateMotion
        path={path}
        dur={`${duration}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        rotate="auto"
      />
    </polygon>
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
  connectorType = "pipeline",
  pipeDesign = "auto",
  colorOverride = "",
  animateFlow = true,
  sourceJoined = false,
  targetJoined = false,
  onSelect,
  onPointerDown,
  onDoubleClick,
}) {
  const arrowHeadId = `process-arrow-${useId().replace(/:/g, "")}`;
  const color =
    normalizeColor(
      colorOverride,
      ["pipeline", "conveyor"].includes(connectorType) ? "" : "#64748B"
    );

  const type =
    normalizeConnectorType(
      connectorType
    );

  const resolvedDesign =
    resolveDynamicPipeDesign(
      connectorType === "conveyor" ? "conveyorTrack" : pipeDesign,
      medium
    );

  const numeric =
    Number(value);

  const magnitude =
    Number.isFinite(
      numeric
    )
      ? Math.abs(
          numeric
        )
      : 0;

  const monitoring =
    variant === "monitor";

  const flowDuration =
    clamp(
      (
        monitoring
          ? 1.45
          : 1.75
      ) -
        magnitude / 180,
      0.58,
      1.9
    );

  const directionDuration =
    clamp(
      2.05 -
        magnitude / 160,
      0.8,
      2.1
    );

  const hitWidth =
    ["pipeline", "conveyor"].includes(type)
      ? 40
      : 22;

  const markerCount =
    type === "arrow"
      ? 4
      : 3;

  return (
    <g
      data-pipeline-id={id}
      data-connector-type={
        type
      }
      data-pipe-design={
        resolvedDesign
      }
    >
      {(onSelect ||
        onPointerDown ||
        onDoubleClick) && (
        <path
          d={["pipeline", "conveyor"].includes(type) ? roundProcessRoute(path, resolvedDesign === "conveyorTrack" ? 28 : 20) : path}
          fill="none"
          stroke="transparent"
          strokeWidth={
            hitWidth
          }
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            onPointerDown
              ? "cursor-move"
              : "cursor-pointer"
          }
          onClick={
            onSelect
          }
          onPointerDown={
            onPointerDown
          }
          onDoubleClick={
            onDoubleClick
          }
        />
      )}

      {type ===
        "pipeline" &&
        resolvedDesign ===
          "realPipe" && (
          <PipeRoute
            path={path}
            color={
              color
            }
            dark={dark}
            selected={
              selected
            }
            animateFlow={
              animateFlow !==
              false
            }
            duration={
              flowDuration
            }
            thickness={
              monitoring
                ? 25
                : 23
            }
            showStartFlange={
              !sourceJoined
            }
            showEndFlange={
              !targetJoined
            }
          />
        )}


      {(["pipeline", "conveyor"].includes(type)) && resolvedDesign === "conveyorTrack" && (
        <ConveyorRoute path={path} color={color} dark={dark} selected={selected} animateFlow={animateFlow !== false} />
      )}

      {!["pipeline", "conveyor"].includes(type) && (
        <>
          {type === "arrow" && (
            <defs>
              <marker id={arrowHeadId} viewBox="0 0 12 12" refX="10" refY="6"
                markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M 1 1 L 11 6 L 1 11 L 3 6 Z" fill={color} />
              </marker>
            </defs>
          )}
          {selected && (
            <path
              d={path}
              fill="none"
              stroke={
                color
              }
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".12"
              className="pointer-events-none"
            />
          )}

          <path
            d={path}
            fill="none"
            stroke={
              color
            }
            strokeWidth={
              type ===
              "arrow"
                ? 2.7
                : 2.2
            }
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={
              type ===
              "arrow"
                ? undefined
                : "8 7"
            }
            markerEnd={type === "arrow" ? `url(#${arrowHeadId})` : undefined}
            className={
              animateFlow !==
              false
                ? "process-direction-line pointer-events-none"
                : "pointer-events-none"
            }
            style={{
              animationDuration:
                `${Math.max(
                  0.65,
                  directionDuration *
                    0.72
                )}s`,
            }}
          />

          {animateFlow !==
            false &&
            Array.from({
              length:
                markerCount,
            }).map(
              (
                _,
                index
              ) => (
                <DirectionMarker
                  key={`${id}-marker-${index}`}
                  path={
                    path
                  }
                  color={
                    color
                  }
                  duration={
                    directionDuration
                  }
                  delay={
                    -(
                      directionDuration *
                      index
                    ) /
                    markerCount
                  }
                  type={
                    type
                  }
                />
              )
            )}
        </>
      )}

      <title>
        {label ||
          (
            resolvedDesign === "conveyorTrack" && ["pipeline", "conveyor"].includes(type)
              ? "Conveyor" : CONNECTION_TYPES.find((item) => item.value === type)?.label
          )}
      </title>
    </g>
  );
}

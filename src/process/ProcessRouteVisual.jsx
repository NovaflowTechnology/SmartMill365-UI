import { useId } from "react";
import { parseOrthogonalPath } from "./ProcessPipeParts";

// The editor stores M/L vertices. Trim each corner along its actual vectors
// so diagonal and right-angle routes share the same continuous surface.
export function roundProcessRoute(path, radius = 20) {
  const points = parseOrthogonalPath(path);
  if (points.length < 2) return path;
  let rounded = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y);
    const trim = Math.min(radius, incoming / 2, outgoing / 2);
    const entry = {
      x: corner.x + (previous.x - corner.x) * trim / incoming,
      y: corner.y + (previous.y - corner.y) * trim / incoming,
    };
    const exit = {
      x: corner.x + (next.x - corner.x) * trim / outgoing,
      y: corner.y + (next.y - corner.y) * trim / outgoing,
    };
    rounded += ` L ${entry.x} ${entry.y} Q ${corner.x} ${corner.y} ${exit.x} ${exit.y}`;
  }
  const end = points[points.length - 1];
  return `${rounded} L ${end.x} ${end.y}`;
}

function PipeFlange({ point, toward, thickness, dark }) {
  if (!point || !toward) return null;

  const angle = Math.atan2(
    Number(toward.y) - Number(point.y),
    Number(toward.x) - Number(point.x)
  ) * (180 / Math.PI);
  const height = thickness + 10;

  return (
    <g
      transform={`translate(${point.x} ${point.y}) rotate(${angle})`}
      className="pointer-events-none"
      data-pipe-flange="true"
    >
      <rect
        x="-3.5"
        y={-height / 2}
        width="7"
        height={height}
        rx="1.5"
        fill={dark ? "#6B737B" : "#929AA0"}
        stroke={dark ? "#343C43" : "#667078"}
        strokeWidth="1.4"
      />
      <rect
        x="-1.25"
        y={-height / 2 + 2}
        width="2.5"
        height={height - 4}
        rx="1"
        fill="rgba(255,255,255,.38)"
      />
      {[-1, 1].map((direction) => (
        <circle
          key={direction}
          cx="0"
          cy={direction * (height / 2 - 2.2)}
          r="1.4"
          fill={dark ? "#252D34" : "#4F5961"}
        />
      ))}
    </g>
  );
}

export function PipeRoute({
  path,
  color,
  dark,
  selected,
  animateFlow,
  duration,
  thickness = 23,
  showStartFlange = true,
  showEndFlange = true,
}) {
  const gradientId = `pipe-metal-${useId().replace(/:/g, "")}`;
  const route = roundProcessRoute(path);
  const points = parseOrthogonalPath(path);
  const start = points[0];
  const startToward = points[1];
  const end = points[points.length - 1];
  const endToward = points[points.length - 2];
  const outerWidth = Math.max(18, thickness);
  const bodyWidth = Math.max(14, outerWidth - 5);
  const highlightWidth = Math.max(6, bodyWidth * .42);
  const accent = color || (dark ? "#A8B0B5" : "#BFC6CA");

  return (
    <g className="pointer-events-none" fill="none" strokeLinejoin="round" strokeLinecap="butt">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark ? "#B9C0C5" : "#E4E8EA"} />
          <stop offset=".28" stopColor={accent} />
          <stop offset=".68" stopColor={dark ? "#747D84" : "#8D979D"} />
          <stop offset="1" stopColor={dark ? "#4A535A" : "#68737A"} />
        </linearGradient>
      </defs>

      {selected && (
        <path
          d={route}
          stroke="#06B6D4"
          strokeWidth={outerWidth + 8}
          opacity=".22"
        />
      )}

      <path
        d={route}
        stroke={dark ? "rgba(0,0,0,.52)" : "rgba(15,23,42,.2)"}
        strokeWidth={outerWidth + 4}
        opacity=".75"
        transform="translate(0 2)"
      />
      <path
        d={route}
        stroke={dark ? "#343C43" : "#687279"}
        strokeWidth={outerWidth + 1}
      />
      <path
        d={route}
        stroke={`url(#${gradientId})`}
        strokeWidth={bodyWidth}
      />
      <path
        d={route}
        stroke="#FFFFFF"
        strokeWidth={highlightWidth}
        opacity={dark ? ".12" : ".22"}
        transform="translate(0 -2.5)"
      />
      <path
        d={route}
        stroke={dark ? "#2B353D" : "#59666E"}
        strokeWidth="3.4"
        opacity=".76"
      />
      {animateFlow && (
        <path
          d={route}
          stroke={dark ? "#67D7F4" : "#1597B8"}
          strokeWidth="2.2"
          strokeDasharray="7 20"
          strokeLinecap="round"
          opacity=".9"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="27"
            to="0"
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
        </path>
      )}

      {showStartFlange && (
        <PipeFlange
          point={start}
          toward={startToward}
          thickness={outerWidth}
          dark={dark}
        />
      )}
      {showEndFlange && (
        <PipeFlange
          point={end}
          toward={endToward}
          thickness={outerWidth}
          dark={dark}
        />
      )}
    </g>
  );
}

export function ConveyorRoute({ path, color, dark, selected, animateFlow }) {
  const patternId = `conveyor-${useId().replace(/:/g, "")}`;
  const route = roundProcessRoute(path, 28);
  const points = parseOrthogonalPath(path);
  return (
    <g className="pointer-events-none">
      <defs>
        <linearGradient id={patternId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFD3D4" />
          <stop offset=".5" stopColor="#777F84" />
          <stop offset="1" stopColor="#C5CCCF" />
        </linearGradient>
      </defs>
      {selected && <path d={route} fill="none" stroke="#06B6D4" strokeWidth="38" strokeLinejoin="round" opacity=".3" />}
      <path d={route} fill="none" stroke={dark ? "#677179" : "#939DA3"} strokeWidth="32" strokeLinejoin="round" />
      <path d={route} fill="none" stroke={color || "#343A3E"} strokeWidth="25" strokeLinejoin="round" />
      <path d={route} fill="none" stroke="#747D82" strokeWidth="22" strokeDasharray="2 10">
        {animateFlow && <animate attributeName="stroke-dashoffset" from="12" to="0" dur=".7s" repeatCount="indefinite" />}
      </path>
      {points.slice(0, -1).map((start, index) => {
        const end = points[index + 1];
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
        const count = Math.floor(length / 28);
        return (
          <g key={index} transform={`translate(${start.x} ${start.y}) rotate(${angle})`}>
            {Array.from({ length: count }, (_, roller) => {
              const x = (roller + .5) * length / count;
              if ((index > 0 && x < 28) || (index < points.length - 2 && length - x < 28)) return null;
              return (
                <g key={roller}>
                  <rect x={x - 2} y="-11" width="4" height="22" rx="1" fill={`url(#${patternId})`} />
                  {[-14, 14].map((y) => <circle key={y} cx={x} cy={y} r="3.2" fill="#E5BA42" stroke="#8C762D" strokeWidth=".8" />)}
                </g>
              );
            })}
          </g>
        );
      })}
      {animateFlow && [0, 1, 2].map((index) => (
        <g key={index}>
          <rect x="-9" y="-8" width="18" height="16" rx="1.5" fill="#CEAA7A" stroke="#8F7554" strokeWidth="1" />
          <path d="M 0 -8 V 8" stroke="#EAD3AF" strokeWidth="3" />
          <animateMotion path={route} dur="9s" begin={`${-index * 3}s`} repeatCount="indefinite" rotate="auto" />
        </g>
      ))}
    </g>
  );
}

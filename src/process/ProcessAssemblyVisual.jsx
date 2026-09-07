import { useId } from "react";

const PIPE_TYPES = new Set([
  "pipe-straight",
  "pipe-elbow",
  "pipe-tee",
  "pipe-cross",
  "pipe-gate-valve",
  "pipe-handwheel-valve",
  "pipe-lever-valve",
  "pipe-pressure-gauge",
  "pipe-y-branch",
]);

const normalizeRotation = (rotation = 0) => {
  const value = Number(rotation) || 0;
  return ((value % 360) + 360) % 360;
};

function PipeDefs({ id, dark }) {
  return (
    <defs>
      <linearGradient id={`${id}-pipe-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={dark ? "#D7DEE8" : "#F8FAFC"} />
        <stop offset="24%" stopColor={dark ? "#8F9AA8" : "#C8CDD4"} />
        <stop offset="52%" stopColor={dark ? "#4F5967" : "#8B929C"} />
        <stop offset="76%" stopColor={dark ? "#778290" : "#B8BEC6"} />
        <stop offset="100%" stopColor={dark ? "#343C48" : "#6D747D"} />
      </linearGradient>
      <linearGradient id={`${id}-flange-metal`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={dark ? "#515B68" : "#747B84"} />
        <stop offset="48%" stopColor={dark ? "#D5DCE6" : "#E7EAEE"} />
        <stop offset="100%" stopColor={dark ? "#454E5A" : "#676E77"} />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity={dark ? ".45" : ".2"} />
      </filter>
    </defs>
  );
}

function Flange({ x, y, vertical = true, id }) {
  return vertical ? (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-5" y="-25" width="10" height="50" rx="2.5" fill={`url(#${id}-flange-metal)`} stroke="#59616C" strokeWidth="1.3" />
      <line x1="0" y1="-20" x2="0" y2="20" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
    </g>
  ) : (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-25" y="-5" width="50" height="10" rx="2.5" fill={`url(#${id}-flange-metal)`} stroke="#59616C" strokeWidth="1.3" />
      <line x1="-20" y1="0" x2="20" y2="0" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
    </g>
  );
}

function StraightPipe({ id, flowColor, animate }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M8 55H152" stroke="#59616C" strokeWidth="38" strokeLinecap="butt" />
      <path d="M8 55H152" stroke={`url(#${id}-pipe-metal)`} strokeWidth="32" strokeLinecap="butt" />
      <path d="M18 45h124" stroke="rgba(255,255,255,.48)" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M18 55h124"
        stroke={flowColor}
        strokeWidth="4"
        strokeDasharray="10 9"
        strokeLinecap="round"
        className={animate ? "assembly-flow-dash" : ""}
        opacity=".88"
      />
      <Flange x={8} y={55} id={id} />
      <Flange x={152} y={55} id={id} />
    </g>
  );
}

function ElbowPipe({ id, flowColor, animate }) {
  const route = "M42 8V47C42 76 60 88 89 88H152";
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path
        d={route}
        fill="none"
        stroke="#59616C"
        strokeWidth="38"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      <path
        d={route}
        fill="none"
        stroke={`url(#${id}-pipe-metal)`}
        strokeWidth="32"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      <path d="M51 16v31c0 22 14 33 38 33h48" fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d={route}
        fill="none"
        stroke={flowColor}
        strokeWidth="4"
        strokeDasharray="10 9"
        className={animate ? "assembly-flow-dash" : ""}
        opacity=".9"
      />
      <Flange x={42} y={8} vertical={false} id={id} />
      <Flange x={152} y={88} id={id} />
    </g>
  );
}

function TeePipe({ id, flowColor, animate }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M8 55H152M80 55V104" fill="none" stroke="#59616C" strokeWidth="38" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M8 55H152M80 55V104" fill="none" stroke={`url(#${id}-pipe-metal)`} strokeWidth="32" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M18 45h124M90 62v32" stroke="rgba(255,255,255,.38)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 55h124M80 55v41" stroke={flowColor} strokeWidth="4" strokeDasharray="10 9" className={animate ? "assembly-flow-dash" : ""} opacity=".9" />
      <Flange x={8} y={55} id={id} />
      <Flange x={152} y={55} id={id} />
      <Flange x={80} y={104} vertical={false} id={id} />
    </g>
  );
}

function CrossPipe({ id, flowColor, animate }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M8 55H152M80 8V102" fill="none" stroke="#59616C" strokeWidth="38" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M8 55H152M80 8V102" fill="none" stroke={`url(#${id}-pipe-metal)`} strokeWidth="32" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M18 45h124M90 17v76" stroke="rgba(255,255,255,.38)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 55h124M80 17v76" stroke={flowColor} strokeWidth="4" strokeDasharray="10 9" className={animate ? "assembly-flow-dash" : ""} opacity=".9" />
      <Flange x={8} y={55} id={id} />
      <Flange x={152} y={55} id={id} />
      <Flange x={80} y={8} vertical={false} id={id} />
      <Flange x={80} y={102} vertical={false} id={id} />
    </g>
  );
}

function YBranchPipe({ id, flowColor, animate }) {
  const upper = "M8 72H62C80 72 87 64 101 52L145 18";
  const lower = "M62 72C80 72 88 81 103 91L140 104";
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d={`${upper} ${lower}`} fill="none" stroke="#59616C" strokeWidth="34" strokeLinejoin="round" strokeLinecap="butt" />
      <path d={`${upper} ${lower}`} fill="none" stroke={`url(#${id}-pipe-metal)`} strokeWidth="28" strokeLinejoin="round" strokeLinecap="butt" />
      <path d="M18 63h44c17 0 25-7 39-18l33-23M62 80c17 0 25 8 39 18l26 3" fill="none" stroke="rgba(255,255,255,.38)" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M18 72h44c17 0 25-8 39-20l34-27M62 72c17 0 26 8 41 19l25 8" fill="none" stroke={flowColor} strokeWidth="4" strokeDasharray="10 9" className={animate ? "assembly-flow-dash" : ""} opacity=".9" />
      <Flange x={8} y={72} id={id} />
      <Flange x={145} y={18} id={id} />
      <Flange x={140} y={104} id={id} />
    </g>
  );
}

function PipeBodyWithValve({ id, flowColor, animate, children }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M8 62H152" stroke="#59616C" strokeWidth="34" strokeLinecap="butt" />
      <path d="M8 62H152" stroke={`url(#${id}-pipe-metal)`} strokeWidth="28" strokeLinecap="butt" />
      <path d="M18 53h124" stroke="rgba(255,255,255,.42)" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M18 62h124" stroke={flowColor} strokeWidth="4" strokeDasharray="10 9" className={animate ? "assembly-flow-dash" : ""} opacity=".9" />
      <Flange x={8} y={62} id={id} />
      <Flange x={152} y={62} id={id} />
      {children}
    </g>
  );
}

function GateValve({ id, flowColor, animate }) {
  return (
    <PipeBodyWithValve id={id} flowColor={flowColor} animate={animate}>
      <path d="M58 45L80 28l22 17v34L80 62 58 79Z" fill="#242A32" stroke="#111827" strokeWidth="1.5" />
      <path d="M80 31V16" stroke="#20262D" strokeWidth="7" strokeLinecap="round" />
      <rect x="56" y="8" width="48" height="8" rx="4" fill="#151A20" />
      <rect x="64" y="20" width="32" height="8" rx="3" fill="#5B6470" />
    </PipeBodyWithValve>
  );
}

function HandwheelValve({ id, flowColor, animate }) {
  return (
    <PipeBodyWithValve id={id} flowColor={flowColor} animate={animate}>
      <path d="M58 45L80 28l22 17v34L80 62 58 79Z" fill="#242A32" stroke="#111827" strokeWidth="1.5" />
      <path d="M80 31V19" stroke="#20262D" strokeWidth="7" strokeLinecap="round" />
      <circle cx="80" cy="12" r="14" fill="none" stroke="#171C22" strokeWidth="5" />
      <path d="M66 12h28M80-2v28M70 2l20 20M90 2L70 22" stroke="#171C22" strokeWidth="2.7" />
      <circle cx="80" cy="12" r="4" fill="#5A626D" />
    </PipeBodyWithValve>
  );
}

function LeverValve({ id, flowColor, animate }) {
  return (
    <PipeBodyWithValve id={id} flowColor={flowColor} animate={animate}>
      <path d="M58 45L80 28l22 17v34L80 62 58 79Z" fill="#242A32" stroke="#111827" strokeWidth="1.5" />
      <path d="M80 31V21" stroke="#20262D" strokeWidth="7" strokeLinecap="round" />
      <path d="M80 20l20-12h34" fill="none" stroke="#171C22" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="20" r="5" fill="#5A626D" />
    </PipeBodyWithValve>
  );
}

function PressureGauge({ id, flowColor, animate }) {
  return (
    <PipeBodyWithValve id={id} flowColor={flowColor} animate={animate}>
      <path d="M80 45V31" stroke="#20262D" strokeWidth="7" />
      <circle cx="80" cy="17" r="19" fill="#F8FAFC" stroke="#111827" strokeWidth="5" />
      <path d="M70 25a14 14 0 1 1 20 0" fill="none" stroke="#CBD5E1" strokeWidth="1.7" />
      <path d="M80 17l9-8" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="80" cy="17" r="2.8" fill="#111827" />
    </PipeBodyWithValve>
  );
}

function ConveyorDefs({ id, dark }) {
  return (
    <defs>
      <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={dark ? "#A9B1BE" : "#AAB2BC"} />
        <stop offset="100%" stopColor={dark ? "#4A5563" : "#5F6B78"} />
      </linearGradient>
      <linearGradient id={`${id}-belt`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={dark ? "#323947" : "#44505D"} />
        <stop offset="48%" stopColor={dark ? "#1E2530" : "#2F3A46"} />
        <stop offset="100%" stopColor={dark ? "#111827" : "#1F2933"} />
      </linearGradient>
      <linearGradient id={`${id}-roller`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFE08A" />
        <stop offset="100%" stopColor="#F6B83B" />
      </linearGradient>
      <linearGradient id={`${id}-box`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E9B98E" />
        <stop offset="100%" stopColor="#BD7A4E" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity={dark ? ".42" : ".22"} />
      </filter>
    </defs>
  );
}

function ConveyorStraight({ id, flowColor, animate }) {
  const rollers = [18, 39, 60, 81, 102, 123, 144];
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M16 79v19M142 79v19M35 98h90" stroke="#5F6B78" strokeWidth="5" strokeLinecap="round" />
      <rect x="4" y="50" width="152" height="34" rx="9" fill={`url(#${id}-frame)`} />
      <rect x="11" y="56" width="138" height="18" rx="6" fill={`url(#${id}-belt)`} />
      <path d="M14 51h132M14 83h132" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M20 65h120"
        stroke={flowColor}
        strokeWidth="2.4"
        strokeDasharray="9 8"
        className={animate ? "assembly-flow-dash" : ""}
        opacity=".75"
      />
      {rollers.map((x) => (
        <g key={x} transform={`translate(${x} 67)`}>
          <circle r="8.2" fill={`url(#${id}-roller)`} stroke="#C98B16" strokeWidth="1.4" />
          <circle r="2.4" fill="#4B5563" />
        </g>
      ))}
      <g className={animate ? "assembly-conveyor-packages" : ""}>
        <g transform="translate(43 31)">
          <rect x="-17" y="-18" width="34" height="34" rx="5" fill={`url(#${id}-box)`} />
          <path d="M0-18v36" stroke="rgba(255,255,255,.15)" />
          <rect x="-7" y="-4" width="14" height="7" rx="3.5" fill="#6E6770" />
        </g>
        <g transform="translate(96 31)">
          <rect x="-17" y="-18" width="34" height="34" rx="5" fill={`url(#${id}-box)`} />
          <path d="M0-18v36" stroke="rgba(255,255,255,.15)" />
          <rect x="-7" y="-4" width="14" height="7" rx="3.5" fill="#6E6770" />
        </g>
      </g>
    </g>
  );
}

function ConveyorCurve({ id, flowColor, animate }) {
  const route = "M29 12v35c0 31 18 47 51 47h67";
  const rollers = [
    [29, 24],
    [31, 47],
    [42, 70],
    [64, 88],
    [91, 94],
    [120, 94],
    [145, 94],
  ];
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M29 12v35c0 31 18 47 51 47h67" fill="none" stroke="#475569" strokeWidth="44" strokeLinecap="butt" strokeLinejoin="round" />
      <path d={route} fill="none" stroke={`url(#${id}-frame)`} strokeWidth="38" strokeLinecap="butt" strokeLinejoin="round" />
      <path d={route} fill="none" stroke={`url(#${id}-belt)`} strokeWidth="20" strokeLinecap="butt" strokeLinejoin="round" />
      <path
        d="M29 23v24c0 26 20 39 51 39h56"
        fill="none"
        stroke={flowColor}
        strokeWidth="2.4"
        strokeDasharray="9 8"
        className={animate ? "assembly-flow-dash" : ""}
        opacity=".75"
      />
      {rollers.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="7.2" fill={`url(#${id}-roller)`} stroke="#C98B16" strokeWidth="1.25" />
      ))}
      <g className={animate ? "assembly-conveyor-curve-package" : ""}>
        <rect x="9" y="10" width="31" height="31" rx="5" fill={`url(#${id}-box)`} />
        <rect x="17" y="22" width="14" height="6" rx="3" fill="#6E6770" />
      </g>
    </g>
  );
}

function ConveyorIncline({ id, flowColor, animate }) {
  const rollers = [
    [28, 79],
    [53, 68],
    [78, 57],
    [103, 46],
    [128, 35],
    [146, 27],
  ];
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M34 85v15M130 42v58M34 100h96" stroke="#5F6B78" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 84L150 24" stroke="#475569" strokeWidth="41" strokeLinecap="butt" />
      <path d="M14 84L150 24" stroke={`url(#${id}-frame)`} strokeWidth="35" strokeLinecap="butt" />
      <path d="M18 82L146 26" stroke={`url(#${id}-belt)`} strokeWidth="18" strokeLinecap="butt" />
      <path
        d="M28 78L137 30"
        stroke={flowColor}
        strokeWidth="2.4"
        strokeDasharray="9 8"
        className={animate ? "assembly-flow-dash" : ""}
        opacity=".75"
      />
      {rollers.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="7.2" fill={`url(#${id}-roller)`} stroke="#C98B16" strokeWidth="1.25" />
      ))}
      <g className={animate ? "assembly-conveyor-incline-package" : ""}>
        <rect x="61" y="42" width="32" height="32" rx="5" fill={`url(#${id}-box)`} transform="rotate(-24 77 58)" />
        <rect x="70" y="55" width="14" height="6" rx="3" fill="#6E6770" transform="rotate(-24 77 58)" />
      </g>
    </g>
  );
}

export default function ProcessAssemblyVisual({
  type,
  rotation = 0,
  dark = false,
  animate = true,
}) {
  const id = `assembly-${useId().replace(/:/g, "")}`;
  const flowColor = "#879298";
  const angle = normalizeRotation(rotation);

  let visual = null;

  if (type === "pipe-straight") visual = <StraightPipe id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-elbow") visual = <ElbowPipe id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-tee") visual = <TeePipe id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-cross") visual = <CrossPipe id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-y-branch") visual = <YBranchPipe id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-gate-valve") visual = <GateValve id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-handwheel-valve") visual = <HandwheelValve id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-lever-valve") visual = <LeverValve id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "pipe-pressure-gauge") visual = <PressureGauge id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "conveyor-straight-module") visual = <ConveyorStraight id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "conveyor-curve-module") visual = <ConveyorCurve id={id} flowColor={flowColor} animate={animate} />;
  else if (type === "conveyor-incline-module") visual = <ConveyorIncline id={id} flowColor={flowColor} animate={animate} />;

  if (!visual) return null;

  return (
    <svg viewBox="0 0 160 110" className="h-full w-full overflow-visible" aria-hidden="true">
      {PIPE_TYPES.has(type) ? <PipeDefs id={id} dark={dark} /> : <ConveyorDefs id={id} dark={dark} />}
      <g transform={`rotate(${angle} 80 55)`}>{visual}</g>
    </svg>
  );
}

import { useId } from "react";
import IndustrialEquipmentIcon from "./IndustrialEquipmentIcon";

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const on = (value) => Number(value) === 1 || value === true;

const pct = (value, min = 0, max = 100) => {
  const span = Math.max(0.0001, max - min);
  return clamp(((num(value, min) - min) / span) * 100, 0, 100);
};

const SvgShell = ({ children, className = "" }) => (
  <svg
    viewBox="0 0 120 82"
    className={`h-full w-full overflow-visible ${className}`}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const BoilerVisual = ({ values, dark = false }) => {
  const clipId = `boiler-body-${useId().replace(/:/g, "")}`;
  const waterLevel = pct(values.waterLevel ?? 55, 0, 100);
  const pressure = num(values.pressure, 0);
  const steamFlow = num(values.steamFlow, 0);
  const active = steamFlow > 0.5 || pressure > 2;
  const waterY = 61 - waterLevel * 0.34;

  return (
    <SvgShell>
      <defs>
        <clipPath id={clipId}>
          <rect x="35" y="12" width="48" height="52" rx="15" />
        </clipPath>
      </defs>

      <rect
        x="35"
        y="12"
        width="48"
        height="52"
        rx="15"
        fill="rgba(88,215,255,.08)"
        stroke="currentColor"
        strokeWidth="2"
      />

      <rect
        x="35"
        y={waterY}
        width="48"
        height={64 - waterY}
        fill="rgba(88,215,255,.38)"
        clipPath={`url(#${clipId})`}
      />

      <path
        d="M47 55 C42 49 46 43 52 39 C51 46 60 47 58 36 C68 43 72 50 67 57 C62 64 51 64 47 55Z"
        fill={active ? "#FF6F88" : "#475569"}
        opacity={active ? 0.95 : 0.5}
        className={active ? "process-flame" : ""}
      />

      <path d="M59 12V5M48 5h22" stroke="currentColor" strokeWidth="2" />
      <path d="M83 24h17v10H83" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="59" cy="29" r="8" fill={dark ? "#0B1328" : "#FFFFFF"} stroke="#58D7FF" strokeWidth="2" />
      <path
        d={`M59 29 L${59 + Math.cos((Math.min(pressure, 400) / 400) * Math.PI * 1.5 - Math.PI * .75) * 5} ${29 + Math.sin((Math.min(pressure, 400) / 400) * Math.PI * 1.5 - Math.PI * .75) * 5}`}
        stroke={dark ? "#E8EDFF" : "#334155"}
        strokeWidth="1.5"
      />
    </SvgShell>
  );
};

const TankVisual = ({ values, dark = false }) => {
  const clipId = `tank-body-${useId().replace(/:/g, "")}`;
  const level = pct(values.level ?? values.waterLevel ?? 50, 0, 100);
  const y = 65 - level * 0.48;

  return (
    <SvgShell>
      <defs>
        <clipPath id={clipId}>
          <rect x="35" y="8" width="50" height="58" rx="18" />
        </clipPath>
      </defs>
      <rect
        x="35"
        y="8"
        width="50"
        height="58"
        rx="18"
        fill="rgba(125,117,231,.08)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="35"
        y={y}
        width="50"
        height={66 - y}
        fill="rgba(88,215,255,.48)"
        clipPath={`url(#${clipId})`}
      />
      <ellipse cx="60" cy={y} rx="25" ry="4" fill="rgba(88,215,255,.62)" />
      <path d="M45 66v8M75 66v8M85 28h13" stroke="currentColor" strokeWidth="2" />
      <text x="60" y="40" textAnchor="middle" fontSize="10" fontWeight="800" fill={dark ? "#E8EDFF" : "#334155"}>
        {Math.round(level)}%
      </text>
    </SvgShell>
  );
};

const PumpVisual = ({ values, dark = false }) => {
  const running = on(values.running);
  const flow = num(values.flow, 0);

  return (
    <SvgShell>
      <path d="M15 41h24M81 41h24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="41" r="22" fill="rgba(125,117,231,.10)" stroke="currentColor" strokeWidth="2" />
      <g className={running ? "process-rotor" : ""} style={{ transformOrigin: "60px 41px" }}>
        <circle cx="60" cy="41" r="5" fill="#58D7FF" />
        <path d="M60 20l6 15-6 6-6-6 6-15z" fill="#7D75E7" />
        <path d="M81 41l-15 6-6-6 6-6 15 6z" fill="#A86BDF" />
        <path d="M60 62l-6-15 6-6 6 6-6 15z" fill="#58D7FF" />
        <path d="M39 41l15-6 6 6-6 6-15-6z" fill="#7D75E7" />
      </g>
      <circle cx="60" cy="41" r="27" fill="none" stroke={running ? "#58D7FF" : "#475569"} strokeOpacity=".45" />
      {flow > 0 && (
        <text x="60" y="77" textAnchor="middle" fontSize="8" fill={dark ? "#93A2C7" : "#64748B"}>
          {flow.toFixed(1)} flow
        </text>
      )}
    </SvgShell>
  );
};

const ValveVisual = ({ values, dark = false }) => {
  const opened = on(values.open ?? values.inletValve);
  return (
    <SvgShell>
      <path d="M10 41h34M76 41h34" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <g transform={`rotate(${opened ? 0 : 45} 60 41)`}>
        <path d="M44 29l16 12-16 12zM76 29L60 41l16 12z" fill="rgba(88,215,255,.18)" stroke="#58D7FF" strokeWidth="2" />
      </g>
      <path d="M60 29V16M52 16h16" stroke="currentColor" strokeWidth="2" />
      <text x="60" y="72" textAnchor="middle" fontSize="9" fontWeight="800" fill={opened ? "#58D7FF" : dark ? "#93A2C7" : "#64748B"}>
        {opened ? "OPEN" : "CLOSED"}
      </text>
    </SvgShell>
  );
};

const SterilizerVisual = ({ values, dark = false }) => {
  const pressure = num(values.pressure, 0);
  const temperature = num(values.temperature, 0);
  const auto = on(values.auto);
  const inletOpen = on(values.inletValve);
  const pressurePct = pct(pressure, 0, 100);

  return (
    <SvgShell>
      <rect x="28" y="17" width="64" height="44" rx="20" fill="rgba(125,117,231,.09)" stroke="currentColor" strokeWidth="2" />
      <rect x="33" y="22" width={54 * (pressurePct / 100)} height="34" rx="15" fill="rgba(88,215,255,.20)" />
      <path d="M22 39h6M92 39h8M44 61v8M76 61v8" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="39" r="12" fill={dark ? "#0B1328" : "#FFFFFF"} stroke="#7D75E7" strokeWidth="2" />
      <text x="60" y="37" textAnchor="middle" fontSize="8" fontWeight="800" fill={dark ? "#E8EDFF" : "#334155"}>{pressure.toFixed(1)}</text>
      <text x="60" y="47" textAnchor="middle" fontSize="6" fill={dark ? "#93A2C7" : "#64748B"}>psi</text>
      <circle cx="88" cy="22" r="4" fill={inletOpen ? "#58D7FF" : "#475569"} />
      <text x="60" y="76" textAnchor="middle" fontSize="8" fill={auto ? "#A86BDF" : dark ? "#93A2C7" : "#64748B"}>
        {auto ? "AUTO" : "MANUAL"} · {temperature ? `${temperature.toFixed(0)}°C` : "—"}
      </text>
    </SvgShell>
  );
};

const RotatingMachineVisual = ({ type, values, dark = false }) => {
  const running = on(values.running) || num(values.power, 0) > 1 || num(values.motorAmp, 0) > 1;
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className={running ? "process-machine-active" : ""}>
        <IndustrialEquipmentIcon type={type} className="h-[72px] w-[72px]" />
      </div>
      <span
        className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${
          running ? "bg-cyan-400" : "bg-slate-500"
        }`}
      />
    </div>
  );
};

export default function ProcessEquipmentVisual({
  type,
  values = {},
  alarmState = "normal",
  monitoring = false,
  dark = false,
}) {
  let visual = null;

  if (type === "boiler") visual = <BoilerVisual values={values} dark={dark} />;
  else if (type === "sterilizer") visual = <SterilizerVisual values={values} dark={dark} />;
  else if (type === "oil-tank" || type === "clarifier") {
    visual = <TankVisual values={values} dark={dark} />;
  } else if (type === "pump") visual = <PumpVisual values={values} dark={dark} />;
  else if (type === "valve") visual = <ValveVisual values={values} dark={dark} />;
  else if (
    [
      "turbine",
      "genset",
      "digester",
      "screw-press",
      "oil-separator",
      "decanter",
      "conveyor",
    ].includes(type)
  ) {
    visual = <RotatingMachineVisual type={type} values={values} dark={dark} />;
  } else {
    visual = (
      <div className="flex h-full w-full items-center justify-center">
        <IndustrialEquipmentIcon type={type} className="h-[70px] w-[70px]" />
      </div>
    );
  }

  return (
    <div
      className={`process-equipment-visual h-full w-full ${
        monitoring ? "is-monitoring" : ""
      } ${
        alarmState === "danger"
          ? "has-danger"
          : alarmState === "warning"
          ? "has-warning"
          : ""
      }`}
    >
      {visual}
    </div>
  );
}

import { useId } from "react";
import IndustrialEquipmentIcon from "./IndustrialEquipmentIcon";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const num = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const on = (value) =>
  Number(value) === 1 || value === true || String(value).toLowerCase() === "on";

const pct = (value, min = 0, max = 100) => {
  const span = Math.max(0.0001, max - min);
  return clamp(((num(value, min) - min) / span) * 100, 0, 100);
};

const hasIncomingData = (values = {}) =>
  Object.values(values).some(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== ""
  );

const isEquipmentActive = (
  type,
  values = {}
) => {
  // Raw material and final product visuals are intentionally static.
  if (
    [
      "palm-fruit-bunch",
      "fruit-bunch",
      "ffb",
      "palm-oil",
      "oil-output",
      "product-oil",
    ].includes(type)
  ) {
    return false;
  }

  // Animation is intentionally data-driven:
  // ANY valid incoming value activates the equipment.
  //
  // Examples that all count as incoming data:
  //   { pressure: 5.2 }
  //   { temperature: 0 }
  //   { customFlow: 42.8 }
  //   { status: 0 }
  //
  // Only null, undefined, and "" mean "no data".
  return hasIncomingData(values);
};

const spinDuration = (speed, fallback = 1.1, minimum = 0.24, maximum = 2.4) => {
  const numeric = Math.abs(num(speed, 0));

  if (numeric <= 0) return fallback;

  // Faster process speed -> shorter animation duration.
  return clamp(2.2 - numeric / 900, minimum, maximum);
};

const palette = (dark) => ({
  body: dark ? "#15213D" : "#F8FAFC",
  body2: dark ? "#0B1328" : "#EAF2F8",
  line: dark ? "#9FB3D8" : "#49627B",
  muted: dark ? "#7186AA" : "#94A3B8",
  text: dark ? "#E8EDFF" : "#334155",
  cyan: "#58D7FF",
  blue: "#4A91D0",
  blueDeep: dark ? "#2D66B7" : "#2C6AC6",
  machineBlue: dark ? "#2960A4" : "#2E76D4",
  machineBlue2: dark ? "#184B88" : "#1858B2",
  steel: dark ? "#AAB8D1" : "#C9D2DF",
  steelDark: dark ? "#5B6E93" : "#8EA1B7",
  violet: "#7D75E7",
  purple: "#A86BDF",
  amber: "#FFD66B",
  orange: "#FF9A62",
  rose: "#FF6F88",
  green: "#70D8C2",
  oil: dark ? "#C9932E" : "#D8A444",
  sludge: dark ? "#7D5B4D" : "#9A7464",
});

const SvgShell = ({ children, className = "" }) => (
  <svg
    viewBox="0 0 120 82"
    className={`h-full w-full overflow-visible ${className}`}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const MetallicDefs = ({ idBase, dark = false }) => {
  const p = palette(dark);

  return (
    <defs>
      <linearGradient id={`${idBase}-metal`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={dark ? "#E7EDF8" : "#FFFFFF"} stopOpacity=".98" />
        <stop offset="30%" stopColor={p.steel} stopOpacity=".98" />
        <stop offset="65%" stopColor={p.steelDark} stopOpacity=".98" />
        <stop offset="100%" stopColor={dark ? "#7B8FB4" : "#B0BECE"} stopOpacity=".98" />
      </linearGradient>

      <linearGradient id={`${idBase}-blue`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={dark ? "#6AB4FF" : "#8BC7FF"} stopOpacity=".92" />
        <stop offset="18%" stopColor={p.machineBlue} />
        <stop offset="60%" stopColor={p.machineBlue2} />
        <stop offset="100%" stopColor={dark ? "#113B77" : "#184F9D"} />
      </linearGradient>

      <linearGradient id={`${idBase}-amber`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F8D56A" />
        <stop offset="100%" stopColor="#C88A1A" />
      </linearGradient>
    </defs>
  );
};


const BoilerVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const pressure = num(values.pressure, 0);
  const clipId = `boiler-body-${useId().replace(/:/g, "")}`;
  const waterLevel = pct(values.waterLevel ?? 55, 0, 100);
  const steamFlow = num(values.steamFlow, 0);
  const active = hasIncomingData(values);
  const waterY = 61 - waterLevel * 0.34;

  return (
    <SvgShell>
      <defs>
        <clipPath id={clipId}>
          <rect x="35" y="12" width="48" height="52" rx="15" />
        </clipPath>
      </defs>
      <rect x="35" y="12" width="48" height="52" rx="15" fill="rgba(88,215,255,.08)" stroke="currentColor" strokeWidth="2" />
      <rect x="35" y={waterY} width="48" height={64 - waterY} fill="rgba(88,215,255,.38)" clipPath={`url(#${clipId})`} />
      <ellipse
        cx="59"
        cy={waterY}
        rx="23"
        ry="2.4"
        fill="rgba(88,215,255,.55)"
        className={active ? "equipment-liquid-surface" : ""}
        clipPath={`url(#${clipId})`}
      />
      <path
        d="M47 55 C42 49 46 43 52 39 C51 46 60 47 58 36 C68 43 72 50 67 57 C62 64 51 64 47 55Z"
        fill={active ? p.rose : "#475569"}
        opacity={active ? 0.95 : 0.5}
        className={active ? "process-flame" : ""}
      />
      <path d="M59 12V5M48 5h22" stroke="currentColor" strokeWidth="2" />

      {active && (
        <g className="equipment-boiler-steam">
          <g className="equipment-steam-wisp equipment-steam-wisp-1">
            <path d="M49 14 C43 9 55 5 49 0" fill="none" stroke={p.cyan} strokeWidth="2.1" strokeLinecap="round" />
          </g>
          <g className="equipment-steam-wisp equipment-steam-wisp-2">
            <path d="M59 12 C53 7 65 4 59 -1" fill="none" stroke={p.cyan} strokeWidth="2.1" strokeLinecap="round" />
          </g>
          <g className="equipment-steam-wisp equipment-steam-wisp-3">
            <path d="M69 14 C63 9 75 5 69 0" fill="none" stroke={p.cyan} strokeWidth="2.1" strokeLinecap="round" />
          </g>
        </g>
      )}

      <path d="M83 24h17v10H83" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="59" cy="29" r="8" fill={p.body2} stroke={p.cyan} strokeWidth="2" />
      <path
        d={`M59 29 L${59 + Math.cos((Math.min(pressure, 400) / 400) * Math.PI * 1.5 - Math.PI * 0.75) * 5} ${29 + Math.sin((Math.min(pressure, 400) / 400) * Math.PI * 1.5 - Math.PI * 0.75) * 5}`}
        stroke={p.text}
        strokeWidth="1.5"
      />
    </SvgShell>
  );
};

const ProcessTankVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const clipId = `tank-body-${useId().replace(/:/g, "")}`;
  const active = hasIncomingData(values);
  const level = pct(values.level ?? values.waterLevel ?? 50, 0, 100);
  const y = 65 - level * 0.48;

  return (
    <SvgShell>
      <defs>
        <clipPath id={clipId}>
          <rect x="35" y="8" width="50" height="58" rx="18" />
        </clipPath>
      </defs>
      <rect x="35" y="8" width="50" height="58" rx="18" fill="rgba(125,117,231,.08)" stroke="currentColor" strokeWidth="2" />
      <rect x="35" y={y} width="50" height={66 - y} fill="rgba(88,215,255,.48)" clipPath={`url(#${clipId})`} />
      <ellipse
        cx="60"
        cy={y}
        rx="25"
        ry="4"
        fill="rgba(88,215,255,.62)"
        className={
          active
            ? "equipment-liquid-surface"
            : ""
        }
      />
      <path d="M45 66v8M75 66v8M85 28h13" stroke="currentColor" strokeWidth="2" />
      <text x="60" y="40" textAnchor="middle" fontSize="10" fontWeight="800" fill={p.text}>{Math.round(level)}%</text>
    </SvgShell>
  );
};

const PumpVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running = hasIncomingData(values);
  const flow = num(values.flow, 0);
  const speed = num(values.speed, running ? Math.max(flow * 120, 900) : 0);
  const duration = spinDuration(speed, 1.05, 0.45, 1.6);

  return (
    <SvgShell>
      <path d="M15 41h24M81 41h24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="41" r="22" fill="rgba(125,117,231,.10)" stroke="currentColor" strokeWidth="2" />
      {running && (
        <circle
          cx="60"
          cy="41"
          r="30"
          fill="none"
          stroke={p.cyan}
          strokeWidth="1.4"
          strokeOpacity=".25"
          className="equipment-running-ring"
        />
      )}
      <g
        className={running ? "equipment-rotor" : ""}
        style={{
          "--equipment-spin-duration": `${duration}s`,
        }}
      >
        <circle cx="60" cy="41" r="5" fill={p.cyan} />
        <path d="M60 20l6 15-6 6-6-6 6-15z" fill={p.violet} />
        <path d="M81 41l-15 6-6-6 6-6 15 6z" fill={p.purple} />
        <path d="M60 62l-6-15 6-6 6 6-6 15z" fill={p.cyan} />
        <path d="M39 41l15-6 6 6-6 6-15-6z" fill={p.violet} />
      </g>
      <circle cx="60" cy="41" r="27" fill="none" stroke={running ? p.cyan : "#475569"} strokeOpacity=".45" />
      {flow > 0 && <text x="60" y="77" textAnchor="middle" fontSize="8" fill={p.muted}>{flow.toFixed(1)} flow</text>}
    </SvgShell>
  );
};

const ValveVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const opened = on(values.open ?? values.inletValve);
  return (
    <SvgShell>
      <path d="M10 41h34M76 41h34" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <g
        className="equipment-valve-motion"
        style={{
          transformOrigin: "60px 41px",
          transform: `rotate(${opened ? 0 : 45}deg)`,
        }}
      >
        <path d="M44 29l16 12-16 12zM76 29L60 41l16 12z" fill="rgba(88,215,255,.18)" stroke={p.cyan} strokeWidth="2" />
      </g>
      <path d="M60 29V16M52 16h16" stroke="currentColor" strokeWidth="2" />
      <text x="60" y="72" textAnchor="middle" fontSize="9" fontWeight="800" fill={opened ? p.cyan : p.muted}>{opened ? "OPEN" : "CLOSED"}</text>
    </SvgShell>
  );
};


const SterilizerVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const inletOpen = on(values.inletValve);
  const active = hasIncomingData(values);
  const idBase = `sterilizer-${useId().replace(/:/g, "")}`;

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />

      <ellipse cx="60" cy="14" rx="18" ry="5.5" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="1.5" />
      <rect x="42" y="14" width="36" height="46" rx="4" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="2" />
      <ellipse cx="60" cy="60" rx="18" ry="5.5" fill={dark ? "#174B86" : "#2467B8"} stroke={p.line} strokeWidth="1.5" />

      <path d="M52 8V4M52 4h12" stroke={p.line} strokeWidth="2" />
      <path d="M78 28h10v8H78" stroke={p.line} strokeWidth="2" fill="none" />
      <path d="M34 32h8" stroke={p.line} strokeWidth="2" />
      <rect x="57" y="46" width="6" height="10" rx="1.5" fill={p.body2} stroke={p.line} strokeWidth="1.5" />
      <path d="M55 56h10M48 64v8M72 64v8" stroke={p.line} strokeWidth="2" strokeLinecap="round" />

      {/* No numeric display inside the sterilizer body.
          Measurements belong in the external equipment data card. */}
      <rect
        x="51"
        y="24"
        width="18"
        height="20"
        rx="9"
        fill="rgba(168,107,223,.10)"
        stroke="rgba(168,107,223,.26)"
        strokeWidth="1.2"
        className={active ? "equipment-sterilizer-core" : ""}
      />

      {active && (
        <g className="equipment-sterilizer-bubbles">
          <circle cx="57" cy="40" r="1.2" fill={p.cyan} opacity=".55" />
          <circle cx="63" cy="34" r="1" fill={p.cyan} opacity=".48" />
          <circle cx="59" cy="28" r="1.15" fill={p.cyan} opacity=".42" />
        </g>
      )}

      <rect
        x="44"
        y="20"
        width="6"
        height="30"
        rx="2"
        fill="rgba(255,255,255,.18)"
        className={active ? "equipment-shine-sweep" : ""}
      />

      <circle
        cx="84"
        cy="32"
        r="3.7"
        fill={inletOpen ? p.cyan : "#475569"}
        className={inletOpen ? "equipment-indicator-pulse" : ""}
      />

      {active && (
        <g className="equipment-sterilizer-steam">
          <g className="equipment-steam-wisp equipment-steam-wisp-1">
            <path
              d="M48 16 C42 11 53 7 47 2"
              fill="none"
              stroke={p.cyan}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="48" cy="15" r="1.6" fill={p.cyan} opacity=".72" />
          </g>

          <g className="equipment-steam-wisp equipment-steam-wisp-2">
            <path
              d="M59 14 C53 9 64 6 58 1"
              fill="none"
              stroke={p.cyan}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="59" cy="13" r="1.6" fill={p.cyan} opacity=".72" />
          </g>

          <g className="equipment-steam-wisp equipment-steam-wisp-3">
            <path
              d="M70 16 C64 11 75 7 69 2"
              fill="none"
              stroke={p.cyan}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="70" cy="15" r="1.6" fill={p.cyan} opacity=".72" />
          </g>
        </g>
      )}
    </SvgShell>
  );
};

/* Palm-oil-specific equipment ------------------------------------------------ */

const ThresherVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);
  const idBase = `thresher-${useId().replace(/:/g, "")}`;
  const speed = num(values.speed, running ? 650 : 0);
  const duration = spinDuration(speed, 1.45, 0.42, 1.8);

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />

      <path d="M12 49h12" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 49h12" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M20 19h62l7 8v27l-8 8H20z" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="2" />
      <path d="M25 25h53v23H25z" fill={dark ? "#102746" : "rgba(255,255,255,.16)"} stroke={p.line} strokeWidth="1.4" />
      <g
        className={running ? "equipment-thresher-drum" : ""}
        style={{
          "--equipment-spin-duration": `${duration}s`,
        }}
      >
        <circle cx="51" cy="36.5" r="11.5" fill={p.body2} stroke={p.steel} strokeWidth="1.8" />
        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <path key={angle} d="M51 25v23" stroke={p.cyan} strokeWidth="1.5" opacity=".95" transform={`rotate(${angle} 51 36.5)`} />
        ))}
      </g>

      <path d="M32 60v9M76 60v9M20 69h66" stroke={p.line} strokeWidth="2" strokeLinecap="round" />
      <rect x="84" y="30" width="10" height="15" rx="2" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.5" />
      <circle cx="89" cy="37.5" r="2.6" fill={running ? p.cyan : p.muted} className={running ? "equipment-indicator-pulse" : ""} />

      {running && (
        <g className="equipment-thresher-particles">
          <circle cx="28" cy="31" r="2.3" fill={p.orange} />
          <circle cx="34" cy="38" r="2" fill={p.amber} />
          <circle cx="29" cy="45" r="1.8" fill={p.rose} />
        </g>
      )}
    </SvgShell>
  );
};

const HeatExchangerVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const hot = num(values.hotTemperature ?? values.inletTemperature ?? values.temperature, 0);
  const cold = num(values.coldTemperature ?? values.outletTemperature, 0);
  const active = hasIncomingData(values);

  return (
    <SvgShell>
      <path d="M12 28h18M90 28h18M12 54h18M90 54h18" stroke={p.line} strokeWidth="4" strokeLinecap="round" />
      <rect x="29" y="17" width="62" height="48" rx="8" fill={p.body} stroke={p.line} strokeWidth="2" />
      <path d="M34 22l52 38M34 60l52-38" stroke={p.cyan} strokeWidth="3" opacity=".8" />
      <path d="M35 27h50M35 55h50" stroke={p.orange} strokeWidth="2.5" opacity=".75" />
      <circle cx="31" cy="28" r="4" fill={p.rose} />
      <circle cx="89" cy="54" r="4" fill={p.cyan} />
      {active && <path className="equipment-flow-dash" d="M38 27h44" stroke={p.orange} strokeWidth="1.4" strokeDasharray="5 5" />}
    </SvgShell>
  );
};


const DigesterVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);
  const temp = num(values.temperature, 0);
  const idBase = `digester-${useId().replace(/:/g, "")}`;

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />

      <path d="M89 10h10v12H89z" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.5" />
      <path d="M85 22h18l7 7-7 7H85z" fill={`url(#${idBase}-amber)`} stroke={p.line} strokeWidth="1.8" />

      <path d="M24 27h55a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H24a11 11 0 0 1 0-24z" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="2" />
      <path d="M18 42h6M30 52v11M74 52v11M23 63h58" stroke={p.line} strokeWidth="2" strokeLinecap="round" />

      <g className={running ? "equipment-digester-scroll" : ""}>
        <path d="M31 39h43" stroke={p.cyan} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M34 33l7 12 7-12 7 12 7-12 7 12" fill="none" stroke={p.violet} strokeWidth="2.2" strokeLinecap="round" />
      </g>

      <path d="M42 27V18h16v9" stroke={p.line} strokeWidth="2" fill="none" />
      <path d="M45 18h10l5-6h-8z" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.4" />
      <path d="M79 37h9" stroke={p.line} strokeWidth="2.5" strokeLinecap="round" />
      {temp > 0 && (
        <text x="60" y="74" textAnchor="middle" fontSize="6.5" fontWeight="800" fill={p.orange}>
          {temp.toFixed(0)}°C
        </text>
      )}

      {running && (
        <g className="equipment-digester-particles">
          <circle cx="40" cy="39" r="2.1" fill={p.orange} opacity=".9" />
          <circle cx="52" cy="40" r="1.8" fill={p.amber} opacity=".9" />
          <circle cx="65" cy="38" r="2" fill={p.rose} opacity=".85" />
        </g>
      )}
    </SvgShell>
  );
};



const ScrewPressVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);
  const idBase = `press-${useId().replace(/:/g, "")}`;

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />

      <path d="M12 48h10" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
      <rect x="12" y="44" width="12" height="12" rx="2" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.5" />
      <path d="M24 31h16l7 8H29z" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="1.5" />
      <path d="M26 40h38a7 7 0 0 1 0 14H26z" fill={`url(#${idBase}-amber)`} stroke={p.line} strokeWidth="2" />
      <rect x="64" y="36" width="16" height="22" rx="3" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="2" />
      <rect x="80" y="34" width="10" height="26" rx="2" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.5" />
      <circle cx="96" cy="46.5" r="9.5" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="2" />
      <circle cx="96" cy="46.5" r="4.6" fill={p.body2} stroke={p.line} strokeWidth="1.5" />

      <g className={running ? "equipment-screw-shaft" : ""}>
        <path d="M30 47h49" stroke={p.cyan} strokeWidth="2.1" strokeLinecap="round" />
        <path d="M31 43c5-7 10 7 15 0s10 7 15 0 10 7 15 0" fill="none" stroke={p.violet} strokeWidth="2.2" />
        <path d="M31 51c5 7 10-7 15 0s10-7 15 0 10-7 15 0" fill="none" stroke={p.cyan} strokeWidth="2.2" opacity=".85" />
      </g>

      <path d="M26 58v9M74 58v9M24 67h57" stroke={p.line} strokeWidth="2" strokeLinecap="round" />
      <path d="M54 54v10" stroke={p.line} strokeWidth="1.8" />
      <path d="M50 64h8" stroke={p.oil} strokeWidth="3" strokeLinecap="round" />
      <path d="M100 44h10" stroke={p.line} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M108 44l4 2-4 2" fill={p.sludge} />

      {running && (
        <>
          <g
            className="equipment-press-motor"
            style={{
              "--equipment-spin-duration": ".65s",
            }}
          >
            <path
              d="M96 41v11M91 46.5h10"
              stroke={p.cyan}
              strokeWidth="1.2"
            />
          </g>
          <g className="equipment-oil-drops">
            <circle cx="52" cy="67" r="1.7" fill={p.oil} />
            <circle cx="57" cy="71" r="1.4" fill={p.oil} />
          </g>
        </>
      )}
    </SvgShell>
  );
};



const ClarifierVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const active = hasIncomingData(values);
  const oilLevel = pct(values.oilLevel ?? values.level ?? 68, 0, 100);
  const sludgeLevel = clamp(pct(values.sludgeLevel ?? 24, 0, 100), 0, oilLevel);
  const idBase = `clarifier-${useId().replace(/:/g, "")}`;
  const oilY = 56 - oilLevel * 0.28;
  const sludgeY = 56 - sludgeLevel * 0.12;

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />
      <defs>
        <clipPath id={`${idBase}-body-clip`}>
          <path d="M43 10h28l6 9v35l-8 16H45L37 54V19z" />
        </clipPath>
      </defs>

      <rect x="12" y="31" width="14" height="26" rx="4" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="1.8" />
      <circle cx="31" cy="58" r="5" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.5" />
      <path d="M26 58h10M32 53v10M26 63h17" stroke={p.line} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M37 42H26" stroke={p.line} strokeWidth="2.3" strokeLinecap="round" />

      <path d="M43 10h28l6 9v35l-8 16H45L37 54V19z" fill={`url(#${idBase}-blue)`} stroke={p.line} strokeWidth="2" />
      <rect x="43" y={oilY} width="34" height={70 - oilY} fill="rgba(216,164,68,.44)" clipPath={`url(#${idBase}-body-clip)`} />
      <ellipse
        cx="60"
        cy={oilY}
        rx="17"
        ry="2.8"
        fill="rgba(216,164,68,.56)"
        className={
          active
            ? "equipment-liquid-surface"
            : ""
        }
        clipPath={`url(#${idBase}-body-clip)`}
      />
      <rect x="43" y={sludgeY + 14} width="34" height={70 - (sludgeY + 14)} fill="rgba(154,116,100,.70)" clipPath={`url(#${idBase}-body-clip)`} />

      <path d="M50 8h14M57 8V3h6v5M52 70v8M68 70v8" stroke={p.line} strokeWidth="2" strokeLinecap="round" />
      <path d="M77 36h12" stroke={p.line} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M60 58h9" stroke={p.oil} strokeWidth="3" strokeLinecap="round" />
      <path d="M49 63h11" stroke={p.sludge} strokeWidth="3" strokeLinecap="round" />
      <text x="60" y="39" textAnchor="middle" fontSize="6" fontWeight="800" fill={p.oil}>OIL</text>
      <text x="60" y="56" textAnchor="middle" fontSize="5.5" fontWeight="800" fill={dark ? "#E7C1A9" : "#6B4C3C"}>SLUDGE</text>

      {active && (
        <g className="equipment-clarifier-bubbles">
          <circle cx="50" cy="48" r="1.2" fill={p.amber} opacity=".7" />
          <circle cx="66" cy="45" r="1.5" fill={p.amber} opacity=".55" />
          <circle cx="57" cy="52" r="1" fill={p.cyan} opacity=".65" />
        </g>
      )}
    </SvgShell>
  );
};



const OilSeparatorVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);
  const idBase = `separator-${useId().replace(/:/g, "")}`;
  const speed = num(values.speed, running ? 4500 : 0);
  const duration = spinDuration(speed, 0.82, 0.24, 1.1);

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />

      <path d="M49 10h22l10 13v23l-8 9V66H47V55l-8-9V23z" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="2" />
      <path d="M57 4v7M54 4h11" stroke={p.line} strokeWidth="2" strokeLinecap="round" />
      <path d="M80 40h17" stroke={p.line} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="97" y="34" width="12" height="12" rx="2.2" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.5" />
      <circle cx="103" cy="40" r="5" fill={dark ? "#788AA9" : "#C3CDD9"} stroke={p.line} strokeWidth="1.3" />

      <g
        className={running ? "equipment-separator-spin" : ""}
        style={{
          "--equipment-spin-duration": `${duration}s`,
        }}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <ellipse
            key={index}
            cx="60"
            cy={29 + index * 5}
            rx={12 - index * 1.2}
            ry="3.2"
            fill="none"
            stroke={index % 2 ? p.cyan : p.violet}
            strokeWidth="1.4"
            opacity=".95"
          />
        ))}
      </g>

      <path d="M48 66v7M72 66v7M43 73h35" stroke={p.line} strokeWidth="2" strokeLinecap="round" />
      <path d="M50 54v8M60 54v8M70 54v8" stroke={p.line} strokeWidth="1.7" />
      <path d="M47 62h7" stroke={p.oil} strokeWidth="3" strokeLinecap="round" />
      <path d="M57 62h6" stroke={p.sludge} strokeWidth="3" strokeLinecap="round" />
      <path d="M66 62h7" stroke={p.cyan} strokeWidth="3" strokeLinecap="round" />
      <circle cx="39" cy="45" r="3.2" fill={running ? p.cyan : p.muted} className={running ? "equipment-indicator-pulse" : ""} />
    </SvgShell>
  );
};



const DecanterVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);
  const idBase = `decanter-${useId().replace(/:/g, "")}`;

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />

      <g>
        <rect x="10" y="44" width="18" height="13" rx="3" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.6" />
        <circle
          cx="18.5"
          cy="50.5"
          r="5.5"
          fill={dark ? "#7D8EAB" : "#D2DAE4"}
          stroke={p.line}
          strokeWidth="1.5"
          className={running ? "equipment-motor-breathe" : ""}
        />
        <path d="M28 50.5h8" stroke={p.line} strokeWidth="3" strokeLinecap="round" />
      </g>

      <path d="M37 31h39l18 10-18 10H37L30 41z" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="2" />
      <path d="M40 28h40l15 8H49z" fill="rgba(88,215,255,.10)" stroke={p.line} strokeWidth="1.2" />

      <g className={running ? "equipment-decanter-scroll" : ""}>
        <path d="M36 41h44" stroke={p.cyan} strokeWidth="2" strokeLinecap="round" />
        <path d="M41 34l6 13 7-13 7 13 7-13 7 13" fill="none" stroke={p.violet} strokeWidth="2.1" strokeLinecap="round" />
      </g>

      <path d="M90 25h12" stroke={p.line} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M100 22l5 3-5 3" fill={p.orange} />
      <path d="M24 52v12" stroke={p.line} strokeWidth="1.8" />
      <path d="M20 64h8" stroke={p.sludge} strokeWidth="3" strokeLinecap="round" />
      <path d="M72 52v12" stroke={p.line} strokeWidth="1.8" />
      <path d="M68 64h9" stroke={p.oil} strokeWidth="3" strokeLinecap="round" />
      <path d="M82 52v10" stroke={p.line} strokeWidth="1.8" />
      <path d="M79 62h7" stroke={p.cyan} strokeWidth="3" strokeLinecap="round" />
      <path d="M43 52v14M81 52v14" stroke={p.line} strokeWidth="2.2" strokeLinecap="round" />
    </SvgShell>
  );
};



const FilterPressVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);
  const idBase = `filter-${useId().replace(/:/g, "")}`;

  return (
    <SvgShell>
      <MetallicDefs idBase={idBase} dark={dark} />
      <path d="M16 58h84" stroke={p.line} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="16" y="55" width="8" height="10" rx="2" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.4" />
      <rect x="96" y="55" width="8" height="10" rx="2" fill={`url(#${idBase}-metal)`} stroke={p.line} strokeWidth="1.4" />

      {[0,1,2,3,4,5,6,7].map((i) => (
        <rect
          key={i}
          x={28 + i * 7}
          y="23"
          width="5.5"
          height="28"
          rx="1.2"
          fill={i % 2 ? `url(#${idBase}-metal)` : dark ? "#D6E0EC" : "#EFF4F8"}
          stroke={p.line}
          strokeWidth="1"
        />
      ))}

      <path d="M18 38h8M104 38h-8" stroke={p.line} strokeWidth="2" strokeLinecap="round" />
      <path d="M25 36h55" stroke={p.cyan} strokeWidth="2" strokeLinecap="round" className={running ? "equipment-filter-flow" : ""} />
      <path d="M80 36h14" stroke={p.oil} strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="92" cy="36" r="3" fill={running ? p.oil : p.muted} className={running ? "equipment-indicator-pulse" : ""} />
      <path d="M23 50v6M97 50v6" stroke={p.line} strokeWidth="2" />
    </SvgShell>
  );
};

const PalmFruitBunchVisual = ({ dark = false }) => {
  const p = palette(dark);
  return (
    <SvgShell>
      {[
        [49, 27, 12], [59, 22, 12], [69, 27, 12],
        [44, 38, 12], [55, 34, 13], [67, 38, 12],
        [49, 50, 11], [61, 48, 11], [72, 51, 10],
      ].map(([cx, cy, r], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={r}
          fill={index % 3 === 0 ? "#A21D1D" : index % 3 === 1 ? "#C8501B" : "#DA8F29"}
          stroke={dark ? "#F2C57A" : "#744B23"}
          strokeWidth="1"
        />
      ))}
      <path d="M74 57c8 1 13 6 15 12-7-1-15-5-18-11z" fill="#7B5C3F" />
      {[36,42,48,54,60,66,72,78].map((x) => (
        <path key={x} d={`M${x} ${18 + ((x/2)%6)}l-4 -4M${x} ${58 - ((x/3)%6)}l-3 4`} stroke={p.oil} strokeWidth="1.1" strokeLinecap="round" opacity=".9" />
      ))}
    </SvgShell>
  );
};

const PalmOilProductVisual = ({ dark = false }) => {
  const p = palette(dark);
  return (
    <SvgShell>
      <ellipse cx="60" cy="18" rx="12" ry="4" fill={dark ? "#F0D2A0" : "#F8E2BF"} stroke={p.line} strokeWidth="1.2" />
      <path d="M48 18v26c0 13 24 13 24 0V18" fill="rgba(216,164,68,.34)" stroke={p.line} strokeWidth="1.5" />
      <ellipse cx="60" cy="44" rx="12" ry="4" fill="rgba(216,164,68,.72)" stroke={p.line} strokeWidth="1.2" />
      <path d="M51 21h18v20c0 6-18 6-18 0z" fill="rgba(216,164,68,.86)" />
      <ellipse cx="60" cy="21" rx="9" ry="2.4" fill="rgba(252,214,121,.75)" />
      <path d="M57 9h6v8h-6z" fill={dark ? "#E4EDF8" : "#FFFFFF"} stroke={p.line} strokeWidth="1.1" />
      <circle cx="82" cy="56" r="5" fill={p.oil} className="equipment-product-glow" />
    </SvgShell>
  );
};

const VacuumDryerVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const vacuum = Math.abs(num(values.vacuum ?? values.pressure, 0));
  const active = hasIncomingData(values);
  return (
    <SvgShell>
      <path d="M42 15h36l7 10v34l-8 10H43l-8-10V25z" fill={p.body} stroke={p.line} strokeWidth="2" />
      <path d="M60 15V6M52 6h16" stroke={p.line} strokeWidth="2" />
      <path d="M78 24h17v10H78M35 52H22v9h13" stroke={p.line} strokeWidth="2" fill="none" />
      <g className={active ? "equipment-vacuum-drops" : ""}>
        <path d="M47 28c5 7 5 10 0 13-5-3-5-6 0-13z" fill={p.cyan} opacity=".75" />
        <path d="M60 23c6 8 6 12 0 15-6-3-6-7 0-15z" fill={p.cyan} opacity=".9" />
        <path d="M72 30c4 6 4 9 0 11-4-2-4-5 0-11z" fill={p.cyan} opacity=".65" />
      </g>
      <path d="M43 50c11 6 23 6 34 0" stroke={p.oil} strokeWidth="5" strokeLinecap="round" opacity=".75" />
    </SvgShell>
  );
};

const TurbineVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running =
    hasIncomingData(values);

  const speed = num(values.speed, running ? 3600 : 0);
  const power = num(values.power, 0);
  const duration = spinDuration(speed, 0.82, 0.18, 1.3);

  return (
    <SvgShell>
      {/* Steam inlet / outlet */}
      <path d="M7 42h21M92 42h21" stroke={p.line} strokeWidth="5" strokeLinecap="round" />

      {running && (
        <>
          <path
            d="M8 42h18"
            stroke={p.cyan}
            strokeWidth="2"
            strokeDasharray="5 5"
            className="equipment-turbine-steam-flow"
          />
          <path
            d="M94 42h18"
            stroke={p.cyan}
            strokeWidth="2"
            strokeDasharray="5 5"
            className="equipment-turbine-steam-flow"
          />
        </>
      )}

      {/* Turbine casing */}
      <path
        d="M29 24h62l8 18-8 18H29l-8-18z"
        fill={p.body}
        stroke={running ? p.cyan : p.line}
        strokeWidth="2"
        className={running ? "equipment-turbine-casing" : ""}
      />

      {/* Outer active ring */}
      {running && (
        <circle
          cx="60"
          cy="42"
          r="25"
          fill="none"
          stroke={p.cyan}
          strokeWidth="1"
          strokeOpacity=".28"
          className="equipment-running-ring"
        />
      )}

      {/* Main rotor */}
      <g
        className={running ? "equipment-turbine-rotor" : ""}
        style={{
          "--equipment-spin-duration": `${duration}s`,
        }}
      >
        <circle
          cx="60"
          cy="42"
          r="9"
          fill={p.body2}
          stroke={p.cyan}
          strokeWidth="2"
        />

        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path
            key={angle}
            d="M60 32c5-8 11-8 13-2-4 4-7 7-9 12z"
            fill={angle % 90 === 0 ? p.cyan : p.violet}
            transform={`rotate(${angle} 60 42)`}
            opacity=".92"
          />
        ))}

        <circle cx="60" cy="42" r="3.2" fill={p.amber} />
      </g>

      {/* Shaft */}
      <path d="M35 42h16M69 42h16" stroke={p.steelDark} strokeWidth="2.2" />

      {/* Running / power indicator */}
      <circle
        cx="88"
        cy="30"
        r="3.2"
        fill={running ? p.green : p.muted}
        className={running ? "equipment-indicator-pulse" : ""}
      />

      {power > 0 && (
        <text
          x="60"
          y="73"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="800"
          fill={running ? p.green : p.muted}
        >
          {power.toFixed(1)} kW
        </text>
      )}
    </SvgShell>
  );
};

const GensetVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running = hasIncomingData(values);
  return (
    <SvgShell>
      <rect
        x="17"
        y="23"
        width="86"
        height="38"
        rx="7"
        fill={p.body}
        stroke={p.line}
        strokeWidth="2"
        className={running ? "equipment-genset-vibration" : ""}
      />
      <rect x="25" y="30" width="34" height="24" rx="4" fill={p.body2} stroke={p.line} strokeWidth="1.5" />
      <circle cx="76" cy="42" r="12" fill={p.body2} stroke={running ? p.cyan : p.line} strokeWidth="2" />
      <path d="M72 35l-5 8h7l-3 7 10-11h-7l3-4z" fill={running ? p.amber : p.muted} className={running ? "equipment-power-pulse" : ""} />
      <path d="M24 61v8M94 61v8M15 69h92" stroke={p.line} strokeWidth="2" />
      <rect x="31" y="35" width="22" height="4" rx="2" fill={running ? p.green : p.muted} />
      <rect x="31" y="44" width="15" height="3" rx="1.5" fill={p.muted} />
    </SvgShell>
  );
};

const ConveyorVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const running = hasIncomingData(values);
  return (
    <SvgShell>
      <path d="M15 28h83l7 24H22z" fill={p.body} stroke={p.line} strokeWidth="2" />
      <path className={running ? "equipment-conveyor-belt" : ""} d="M22 33h76" stroke={p.cyan} strokeWidth="3" strokeDasharray="8 5" />
      {[30, 48, 66, 84].map((x) => <circle key={x} cx={x} cy="50" r="5" fill={p.body2} stroke={p.line} strokeWidth="2" />)}
      <path d="M28 54v16M91 54v16M22 70h76" stroke={p.line} strokeWidth="2" />
      <path d="M36 25l7-9h9l4 9M67 25l6-10h10l4 10" stroke={p.orange} strokeWidth="2" fill="none" />

      {running && (
        <g className="equipment-conveyor-fruit">
          <circle cx="30" cy="31" r="2.6" fill={p.orange} />
          <circle cx="53" cy="31" r="2.4" fill={p.rose} />
          <circle cx="76" cy="31" r="2.5" fill={p.amber} />
        </g>
      )}
    </SvgShell>
  );
};

const JunctionVisual = ({ values, dark = false }) => {
  const p = palette(dark);
  const active = hasIncomingData(values);
  return (
    <SvgShell>
      <circle cx="60" cy="41" r="11" fill={p.body2} stroke={active ? p.cyan : p.line} strokeWidth="3" />
      <path d="M60 8v22M60 52v22M18 41h31M71 41h31" stroke={p.line} strokeWidth="5" strokeLinecap="round" />
      <circle cx="60" cy="8" r="5" fill={p.cyan} />
      <circle cx="60" cy="74" r="5" fill={p.violet} />
      <circle cx="18" cy="41" r="5" fill={p.green} />
      <circle cx="102" cy="41" r="5" fill={p.orange} />
      {active && <circle cx="60" cy="41" r="5" fill={p.cyan} className="equipment-junction-pulse" />}
    </SvgShell>
  );
};

export default function ProcessEquipmentVisual({
  type,
  values = {},
  alarmState = "normal",
  monitoring = false,
  selected = false,

  // Explicit application-level animation switch.
  // Defaults ON so process motion remains visible even when
  // the browser/OS has reduced-motion enabled.
  motionEnabled = true,

  dark = false,
}) {
  let visual = null;
  const active =
    motionEnabled &&
    isEquipmentActive(type, values);

  if (type === "boiler") visual = <BoilerVisual values={values} dark={dark} />;
  else if (type === "sterilizer") visual = <SterilizerVisual values={values} dark={dark} />;
  else if (["oil-tank", "process-tank", "tank"].includes(type)) visual = <ProcessTankVisual values={values} dark={dark} />;
  else if (type === "pump") visual = <PumpVisual values={values} dark={dark} />;
  else if (type === "valve") visual = <ValveVisual values={values} dark={dark} />;
  else if (["heat-exchanger", "heatExchanger"].includes(type)) visual = <HeatExchangerVisual values={values} dark={dark} />;
  else if (["thresher", "fruit-thresher"].includes(type)) visual = <ThresherVisual values={values} dark={dark} />;
  else if (type === "digester") visual = <DigesterVisual values={values} dark={dark} />;
  else if (["screw-press", "screwPress", "oil-press", "press"].includes(type)) visual = <ScrewPressVisual values={values} dark={dark} />;
  else if (type === "clarifier") visual = <ClarifierVisual values={values} dark={dark} />;
  else if (["oil-separator", "separator", "purifier"].includes(type)) visual = <OilSeparatorVisual values={values} dark={dark} />;
  else if (type === "decanter") visual = <DecanterVisual values={values} dark={dark} />;
  else if (["filter", "filter-press", "filterPress", "oil-filter"].includes(type)) visual = <FilterPressVisual values={values} dark={dark} />;
  else if (["vacuum-dryer", "vacuumDryer"].includes(type)) visual = <VacuumDryerVisual values={values} dark={dark} />;
  else if (type === "turbine") visual = <TurbineVisual values={values} dark={dark} />;
  else if (["genset", "generator"].includes(type)) visual = <GensetVisual values={values} dark={dark} />;
  else if (type === "conveyor") visual = <ConveyorVisual values={values} dark={dark} />;
  else if (["palm-fruit-bunch", "fruit-bunch", "ffb"].includes(type)) visual = <PalmFruitBunchVisual dark={dark} />;
  else if (["palm-oil", "oil-output", "product-oil"].includes(type)) visual = <PalmOilProductVisual dark={dark} />;
  else if (["junction", "pipeline-junction", "steam-header"].includes(type)) visual = <JunctionVisual values={values} dark={dark} />;
  else {
    const active =
      hasIncomingData(values);

    visual = (
      <div className="flex h-full w-full items-center justify-center">
        <div className={active ? "equipment-generic-active" : ""}>
          <IndustrialEquipmentIcon type={type} className="h-[70px] w-[70px]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`process-equipment-visual h-full w-full ${
        monitoring ? "is-monitoring" : ""
      } ${motionEnabled ? "motion-enabled" : "motion-disabled"} ${
        active ? "is-active" : ""
      } ${
        selected ? "is-selected" : ""
      } ${
        alarmState === "danger"
          ? "has-danger"
          : alarmState === "warning"
          ? "has-warning"
          : ""
      }`}
      data-equipment-type={type}
      data-equipment-active={active ? "true" : "false"}
    >
      {visual}
    </div>
  );
}

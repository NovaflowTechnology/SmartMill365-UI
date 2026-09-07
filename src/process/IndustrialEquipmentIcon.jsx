import React from "react";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Svg = ({ children, className = "" }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export default function IndustrialEquipmentIcon({
  type,
  className = "h-10 w-10",
}) {
  switch (type) {
    case "boiler":
      return (
        <Svg className={className}>
          <rect x="14" y="9" width="36" height="46" rx="8" {...common} />
          <rect x="21" y="29" width="22" height="18" rx="3" {...common} />
          <path d="M25 29c0-8 14-8 14 0" {...common} />
          <path d="M29 43c-4-5 1-8 3-12 3 4 7 7 3 12" {...common} />
          <path d="M21 14h22M21 19h22" {...common} />
        </Svg>
      );

    case "palm-fruit-bunch":
      return (
        <Svg className={className}>
          <path d="M31 10c4 4 7 8 8 13" {...common} />
          <path d="M30 11c-5 2-9 5-11 9" {...common} />
          <ellipse cx="22" cy="29" rx="7" ry="9" {...common} />
          <ellipse cx="32" cy="25" rx="7" ry="9" {...common} />
          <ellipse cx="42" cy="30" rx="7" ry="9" {...common} />
          <ellipse cx="27" cy="40" rx="7" ry="9" {...common} />
          <ellipse cx="38" cy="41" rx="7" ry="9" {...common} />
          <path d="M31 8v6M27 9l4 5 5-5" {...common} />
        </Svg>
      );

    case "sterilizer":
      return (
        <Svg className={className}>
          <rect x="8" y="20" width="48" height="25" rx="12" {...common} />
          <circle cx="20" cy="32.5" r="7" {...common} />
          <path d="M27 32.5h22M14 45v7M50 45v7M8 30H4M60 30h-4" {...common} />
          <path d="M20 28v9M16 32.5h8" {...common} />
        </Svg>
      );

    case "process-tank":
    case "tank":
    case "oil-tank":
      return (
        <Svg className={className}>
          <ellipse cx="32" cy="13" rx="17" ry="7" {...common} />
          <path d="M15 13v35c0 4 8 7 17 7s17-3 17-7V13" {...common} />
          <ellipse cx="32" cy="48" rx="17" ry="7" {...common} />
          <path d="M21 29h22M32 6V2M29 2h6" {...common} />
        </Svg>
      );

    case "pump":
      return (
        <Svg className={className}>
          <circle cx="30" cy="32" r="15" {...common} />
          <path d="M30 17v30M15 32h30" {...common} />
          <path d="M45 26h11v12H45M4 27h11v10H4" {...common} />
          <path d="M30 24l7 8-7 8-7-8 7-8z" {...common} />
        </Svg>
      );

    case "valve":
      return (
        <Svg className={className}>
          <path d="M7 32h12l13-12v24L19 32h26l12-12v24L45 32" {...common} />
          <path d="M32 20V9M24 9h16M32 44v11" {...common} />
        </Svg>
      );

    case "heat-exchanger":
      return (
        <Svg className={className}>
          <rect x="10" y="10" width="44" height="44" rx="8" {...common} />
          <path d="M18 18l28 28M46 18L18 46" {...common} />
          <circle cx="17" cy="17" r="3" {...common} />
          <circle cx="47" cy="17" r="3" {...common} />
          <circle cx="17" cy="47" r="3" {...common} />
          <circle cx="47" cy="47" r="3" {...common} />
        </Svg>
      );

    case "thresher":
      return (
        <Svg className={className}>
          <rect x="7" y="21" width="50" height="24" rx="12" {...common} />
          <circle cx="19" cy="33" r="8" {...common} />
          <circle cx="45" cy="33" r="8" {...common} />
          <path d="M19 25v16M11 33h16M45 25v16M37 33h16" {...common} />
          <path d="M14 45v8M50 45v8M7 29H3M61 37h-4" {...common} />
        </Svg>
      );

    case "digester":
      return (
        <Svg className={className}>
          <path d="M18 12h28l4 8v28l-5 6H19l-5-6V20l4-8z" {...common} />
          <path d="M32 12V5M25 5h14M24 22l16 20M40 22L24 42" {...common} />
          <path d="M24 54v5M40 54v5" {...common} />
        </Svg>
      );

    case "screw-press":
      return (
        <Svg className={className}>
          <rect x="8" y="20" width="48" height="26" rx="5" {...common} />
          <path d="M14 33h36M19 26l8 14 8-14 8 14" {...common} />
          <path d="M18 46v8M46 46v8M8 27H3M61 39h-5" {...common} />
        </Svg>
      );

    case "clarifier":
      return (
        <Svg className={className}>
          <path d="M9 16h46L43 47H21L9 16z" {...common} />
          <path d="M18 27h28M32 16v31M24 47v8M40 47v8" {...common} />
          <path d="M14 11h36" {...common} />
        </Svg>
      );

    case "oil-separator":
      return (
        <Svg className={className}>
          <path d="M21 10h22l7 14-8 30H22l-8-30 7-14z" {...common} />
          <path d="M22 25h20M24 33h16M27 41h10" {...common} />
          <path d="M32 10V4M28 4h8" {...common} />
        </Svg>
      );

    case "decanter":
      return (
        <Svg className={className}>
          <rect x="10" y="22" width="44" height="20" rx="10" {...common} />
          <path d="M20 32h24M27 26l10 12M37 26L27 38" {...common} />
          <path d="M16 42v10M48 42v10M54 28h7M3 36h7" {...common} />
        </Svg>
      );

    case "filter-press":
      return (
        <Svg className={className}>
          <path d="M9 18h46M13 18v32M51 18v32M9 50h46" {...common} />
          <rect x="17" y="23" width="5" height="22" rx="1" {...common} />
          <rect x="25" y="23" width="5" height="22" rx="1" {...common} />
          <rect x="33" y="23" width="5" height="22" rx="1" {...common} />
          <rect x="41" y="23" width="5" height="22" rx="1" {...common} />
          <path d="M13 31H5M59 31h-8M18 50v7M46 50v7" {...common} />
        </Svg>
      );

    case "vacuum-dryer":
      return (
        <Svg className={className}>
          <rect x="18" y="8" width="28" height="44" rx="13" {...common} />
          <path d="M25 16h14M25 24h14M25 32h14M25 40h14" {...common} />
          <path d="M32 8V3M18 28H8v8h10M46 20h10v8H46M24 52v7M40 52v7" {...common} />
        </Svg>
      );

    case "turbine":
      return (
        <Svg className={className}>
          <circle cx="30" cy="32" r="17" {...common} />
          <circle cx="30" cy="32" r="4" {...common} />
          <path d="M30 15l5 13-5 4-5-4 5-13zM47 32l-13 5-4-5 4-5 13 5zM30 49l-5-13 5-4 5 4-5 13zM13 32l13-5 4 5-4 5-13-5z" {...common} />
          <path d="M47 24h10v16H47" {...common} />
        </Svg>
      );

    case "genset":
      return (
        <Svg className={className}>
          <rect x="8" y="16" width="48" height="34" rx="5" {...common} />
          <circle cx="23" cy="33" r="9" {...common} />
          <path d="M23 24v18M14 33h18M38 25h11M38 32h11M38 39h8" {...common} />
          <path d="M16 50v7M48 50v7" {...common} />
        </Svg>
      );

    case "conveyor":
      return (
        <Svg className={className}>
          <path d="M8 22h45l4 18H12L8 22z" {...common} />
          <circle cx="18" cy="47" r="5" {...common} />
          <circle cx="47" cy="47" r="5" {...common} />
          <path d="M18 40h29M15 27h35M20 27v13M31 27v13M42 27v13" {...common} />
        </Svg>
      );

    case "palm-oil":
      return (
        <Svg className={className}>
          <path d="M32 7c12 16 16 23 16 32 0 10-7 17-16 17s-16-7-16-17c0-9 4-16 16-32z" {...common} />
          <path d="M24 39c4 6 12 8 18 2" {...common} />
          <path d="M29 27c2-4 5-7 8-10" {...common} />
        </Svg>
      );

    case "fruit-cage":
      return (
        <Svg className={className}>
          <path d="M10 18h42l4 28H14z" {...common} />
          <path d="M18 22l4 20M28 22l3 20M38 22l2 20M48 22l1 20M15 30h38M16 38h38" {...common} />
          <circle cx="20" cy="51" r="4" {...common} />
          <circle cx="48" cy="51" r="4" {...common} />
        </Svg>
      );

    case "stripper":
      return (
        <Svg className={className}>
          <rect x="8" y="19" width="48" height="30" rx="5" {...common} />
          <circle cx="32" cy="34" r="12" {...common} />
          <path d="M32 22v24M20 34h24M24 26l16 16M40 26L24 42M8 27H3M61 41h-5" {...common} />
        </Svg>
      );

    case "vibrating-screen":
      return (
        <Svg className={className}>
          <path d="M9 20h42L44 45H16z" {...common} />
          <path d="M18 24l-5 17M27 24l-5 17M36 24l-5 17M45 24l-5 17M18 45l-4 9M42 45l4 9" {...common} />
          <circle cx="54" cy="32" r="6" {...common} />
        </Svg>
      );

    case "nut-fibre-separator":
      return (
        <Svg className={className}>
          <path d="M18 11h28l8 12-7 30H17L10 23z" {...common} />
          <path d="M21 24h24M19 33h28M18 42h29M10 26H4M60 26h-6" {...common} />
          <circle cx="27" cy="30" r="3" {...common} />
          <path d="M34 29q8 4 8 11" {...common} />
        </Svg>
      );

    case "nut-cracker":
      return (
        <Svg className={className}>
          <rect x="8" y="20" width="48" height="28" rx="4" {...common} />
          <circle cx="25" cy="34" r="9" {...common} />
          <circle cx="40" cy="34" r="9" {...common} />
          <path d="M25 27v14M18 34h14M40 27v14M33 34h14M25 48v8M40 48v8" {...common} />
        </Svg>
      );

    case "fibre-cyclone":
    case "shell-cyclone":
      return (
        <Svg className={className}>
          <path d="M20 10h25l6 8-9 26-10 14-9-14-9-26z" {...common} />
          <path d="M14 18H5M45 18h14M27 26q13-10 14 2q0 9-12 8q-8-1-5-8" {...common} />
          <path d="M32 58v4" {...common} />
        </Svg>
      );

    case "winnower":
      return (
        <Svg className={className}>
          <rect x="8" y="14" width="48" height="38" rx="4" {...common} />
          <circle cx="24" cy="33" r="10" {...common} />
          <path d="M24 23l3 8-3 2-3-2zM34 33l-8 3-2-3 2-3zM24 43l-3-8 3-2 3 2zM14 33l8-3 2 3-2 3zM38 24h11M38 33h14M38 42h9" {...common} />
        </Svg>
      );

    case "claybath-separator":
      return (
        <Svg className={className}>
          <rect x="8" y="16" width="48" height="34" rx="4" {...common} />
          <path d="M12 30h40M12 39h40M18 50v8M46 50v8" {...common} />
          <circle cx="23" cy="33" r="3" {...common} />
          <circle cx="41" cy="42" r="3" {...common} />
        </Svg>
      );

    case "oil-purifier":
      return (
        <Svg className={className}>
          <path d="M20 9h24l7 10-6 34H19l-6-34z" {...common} />
          <path d="M22 24h20M24 31h16M27 38h10" {...common} />
          <circle cx="32" cy="45" r="6" {...common} />
          <path d="M13 27H5M51 27h8" {...common} />
        </Svg>
      );

    case "tray-dryer":
      return (
        <Svg className={className}>
          <rect x="10" y="8" width="44" height="48" rx="4" {...common} />
          <path d="M16 18h32M16 27h32M16 36h32M16 45h32M16 56v5M48 56v5" {...common} />
          <circle cx="22" cy="15" r="2" {...common} />
          <circle cx="32" cy="24" r="2" {...common} />
          <circle cx="42" cy="33" r="2" {...common} />
        </Svg>
      );

    case "kernel-silo":
    case "crude-oil-tank":
    case "sludge-tank":
      return (
        <Svg className={className}>
          <ellipse cx="32" cy="12" rx="16" ry="6" {...common} />
          <path d="M16 12v35c0 5 32 5 32 0V12" {...common} />
          <ellipse cx="32" cy="47" rx="16" ry="6" {...common} />
          <path d="M23 53v7M41 53v7M32 6V2" {...common} />
        </Svg>
      );

    case "empty-bunch-hopper":
      return (
        <Svg className={className}>
          <path d="M12 13h40L45 43H19z" {...common} />
          <path d="M19 43l5 15M45 43l-5 15M24 58h16M22 23h20M20 32h24" {...common} />
        </Svg>
      );

    case "kernel":
      return (
        <Svg className={className}>
          <ellipse cx="22" cy="26" rx="7" ry="5" {...common} />
          <ellipse cx="35" cy="23" rx="7" ry="5" {...common} />
          <ellipse cx="45" cy="31" rx="7" ry="5" {...common} />
          <ellipse cx="28" cy="39" rx="7" ry="5" {...common} />
          <ellipse cx="41" cy="43" rx="7" ry="5" {...common} />
        </Svg>
      );

    case "shell":
      return (
        <Svg className={className}>
          <path d="M12 29q8-14 16 0q-3 12-16 0zM31 23q8-14 16 0q-3 12-16 0zM23 44q8-14 16 0q-3 12-16 0zM42 41q7-12 14 0q-3 10-14 0z" {...common} />
        </Svg>
      );

    case "fibre":
      return (
        <Svg className={className}>
          <path d="M15 52q14-22 4-42M24 54q-9-25 6-42M33 54q13-22 4-42M42 54q-8-23 7-39M51 53q-4-20 4-34" {...common} />
          <path d="M12 55h46" {...common} />
        </Svg>
      );

    case "press-liquor":
      return (
        <Svg className={className}>
          <path d="M18 10h28l5 8v34l-5 7H18l-5-7V18z" {...common} />
          <path d="M16 34h32M16 44h32M13 25H5M51 25h8" {...common} />
        </Svg>
      );

    case "condensate":
      return (
        <Svg className={className}>
          <path d="M32 7c12 16 16 23 16 32 0 10-7 17-16 17s-16-7-16-17c0-9 4-16 16-32z" {...common} />
          <path d="M24 39q8 9 17 1" {...common} />
        </Svg>
      );

    case "custom-equipment":
      return (
        <Svg className={className}>
          <rect x="10" y="17" width="44" height="32" rx="5" {...common} />
          <circle cx="24" cy="33" r="8" {...common} />
          <path d="M24 25v16M16 33h16M39 25h9M39 33h9M39 41h6" {...common} />
          <path d="M16 49v7M48 49v7M10 27H5M59 39h-5" {...common} />
        </Svg>
      );

    case "junction":
      return (
        <Svg className={className}>
          <circle cx="32" cy="32" r="9" {...common} />
          <path d="M32 23V5M23 32H5M41 32h18M32 41v18" {...common} />
          <circle cx="32" cy="5" r="3" {...common} />
          <circle cx="5" cy="32" r="3" {...common} />
          <circle cx="59" cy="32" r="3" {...common} />
          <circle cx="32" cy="59" r="3" {...common} />
        </Svg>
      );

    default:
      return (
        <Svg className={className}>
          <rect x="9" y="18" width="46" height="31" rx="5" {...common} />
          <circle cx="23" cy="33.5" r="8" {...common} />
          <path d="M23 25.5v16M15 33.5h16M38 26h10M38 34h10M38 42h7" {...common} />
          <path d="M15 49v7M49 49v7M9 28H4M60 39h-5" {...common} />
        </Svg>
      );
  }
}

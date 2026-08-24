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

    case "sterilizer":
      return (
        <Svg className={className}>
          <rect x="8" y="20" width="48" height="25" rx="12" {...common} />
          <circle cx="20" cy="32.5" r="7" {...common} />
          <path d="M27 32.5h22M14 45v7M50 45v7M8 30H4M60 30h-4" {...common} />
          <path d="M20 28v9M16 32.5h8" {...common} />
        </Svg>
      );

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
          <rect x="10" y="10" width="44" height="44" rx="8" {...common} />
          <path d="M20 32h24M32 20v24" {...common} />
        </Svg>
      );
  }
}

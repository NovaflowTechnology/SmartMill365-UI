import { useEffect, useMemo, useRef } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import {
  TECH_SURFACE_CLASS,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TechBackdrop,
  clamp,
  toFiniteNumber,
  useWidgetSize,
} from "./widgetTech";

const DEFAULT_DISPLAY = {
  mode: "number",
  style: "modern",
  showLabel: true,
  showUnit: true,
  showTrend: true,
  showRawValue: false,
  showProgress: true,
  decimals: 1,
  unit: "",
  alignment: "left",
  valueSize: "xlarge",
  valueColor: "default",
  customValueColor: "#0F172A",
  trendThreshold: null,

  // Combined Stat + Machine Status
  statusDataKey: "",
  statusLabel: "Machine Status",
  statusSource: "mapping",

  mappings: [
    { value: 0, text: "OFF", color: "red" },
    { value: 1, text: "MANUAL", color: "amber" },
    { value: 2, text: "AUTO", color: "green" },
    { value: 3, text: "MANUAL INLET", color: "purple" },
  ],

  fallbackText: "",
  fallbackColor: "default",
};

const alignmentClasses = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const valueColorClasses = {
  default:
    "text-slate-950 dark:text-slate-100",
  green:
    "text-cyan-700 dark:text-[#58D7FF]",
  blue:
    "text-blue-700 dark:text-[#58D7FF]",
  amber:
    "text-amber-700 dark:text-amber-300",
  orange:
    "text-orange-700 dark:text-orange-300",
  red:
    "text-rose-700 dark:text-rose-300",
  purple:
    "text-violet-700 dark:text-[#A86BDF]",
  gray:
    "text-slate-600 dark:text-slate-300",
};

const statusTone = {
  default: {
    text: "text-slate-700 dark:text-slate-200",
    badge:
      "border-slate-300/70 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/80",
    dot: "bg-slate-400",
  },
  cyan: {
    text: "text-cyan-700 dark:text-[#58D7FF]",
    badge:
      "border-cyan-300/50 bg-cyan-100/60 dark:border-[#58D7FF]/30 dark:bg-[#58D7FF]/10",
    dot: "bg-[#58D7FF]",
  },
  green: {
    text: "text-emerald-600 dark:text-emerald-400",
    badge:
      "border-emerald-300/50 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-400/10",
    dot: "bg-emerald-500",
  },
  blue: {
    text: "text-blue-700 dark:text-[#7D75E7]",
    badge:
      "border-blue-300/50 bg-blue-100/60 dark:border-[#7D75E7]/35 dark:bg-[#7D75E7]/10",
    dot: "bg-[#7D75E7]",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    badge:
      "border-amber-300/60 bg-amber-100/70 dark:border-amber-500/30 dark:bg-amber-500/10",
    dot: "bg-amber-400",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    badge:
      "border-orange-300/60 bg-orange-100/70 dark:border-orange-500/30 dark:bg-orange-500/10",
    dot: "bg-orange-400",
  },
  red: {
    text: "text-rose-700 dark:text-rose-300",
    badge:
      "border-rose-300/60 bg-rose-100/70 dark:border-rose-500/30 dark:bg-rose-500/10",
    dot: "bg-rose-400",
  },
  purple: {
    text: "text-violet-700 dark:text-[#A86BDF]",
    badge:
      "border-violet-300/50 bg-violet-100/60 dark:border-[#A86BDF]/30 dark:bg-[#A86BDF]/10",
    dot: "bg-[#A86BDF]",
  },
  gray: {
    text: "text-slate-600 dark:text-slate-300",
    badge:
      "border-slate-300/60 bg-slate-100/70 dark:border-slate-600 dark:bg-slate-800/80",
    dot: "bg-slate-400",
  },
};

const normaliseComparableValue = (value) => {
  if (value === null || value === undefined) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? numeric
    : String(value).trim();
};

const findMapping = (mappings, value) => {
  const current = normaliseComparableValue(value);
  return mappings.find(
    (mapping) =>
      String(normaliseComparableValue(mapping?.value)) ===
      String(current)
  );
};

export default function NumStatWidget({
  value = 0,
  statusValue,
  label = "Value",
  display = {},
  rangeConfig = null,
}) {
  const rootRef = useRef(null);
  const {
    width,
    tiny,
    compact,
    wide,
  } = useWidgetSize(rootRef);

  const settings = {
    ...DEFAULT_DISPLAY,
    ...(display || {}),
    mappings: Array.isArray(display?.mappings)
      ? display.mappings
      : DEFAULT_DISPLAY.mappings,
  };

  const config = {
    min: 0,
    max: 100,
    unit: "",
    warning: 80,
    danger: 90,
    ...(rangeConfig || {}),
  };

  const numericValue = toFiniteNumber(value, 0);
  const previousValueRef = useRef(numericValue);
  // This ref intentionally carries the previous render's value for the trend.
  // eslint-disable-next-line react-hooks/refs
  const previousValue = previousValueRef.current;

  const min = toFiniteNumber(config.min, 0);
  const configuredMax = toFiniteNumber(config.max, 100);
  const max = configuredMax > min
    ? configuredMax
    : min + 1;

  const warning = toFiniteNumber(
    config.warning,
    min + (max - min) * 0.8
  );
  const danger = toFiniteNumber(
    config.danger,
    min + (max - min) * 0.9
  );

  const automaticThreshold =
    Math.abs(max - min) > 0
      ? Math.abs(max - min) * 0.02
      : 0.5;

  const trendThreshold =
    settings.trendThreshold === null ||
    settings.trendThreshold === undefined ||
    settings.trendThreshold === ""
      ? automaticThreshold
      : Math.max(
          0,
          toFiniteNumber(
            settings.trendThreshold,
            automaticThreshold
          )
        );

  const trend = useMemo(() => {
    const difference =
      numericValue - previousValue;

    if (Math.abs(difference) <= trendThreshold) {
      return "stable";
    }

    return difference > 0 ? "up" : "down";
  }, [
    numericValue,
    previousValue,
    trendThreshold,
  ]);

  useEffect(() => {
    previousValueRef.current = numericValue;
  }, [numericValue]);

  const decimals = Math.min(
    6,
    Math.max(
      0,
      Math.round(
        toFiniteNumber(settings.decimals, 1)
      )
    )
  );

  const formattedValue =
    numericValue.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const unit =
    settings.unit?.trim() ||
    String(config.unit || "").trim();

  const percentage =
    clamp(
      (numericValue - min) /
        (max - min),
      0,
      1
    ) * 100;

  const mappedSourceValue =
    settings.mode === "combined"
      ? statusValue
      : value;

  const activeMapping = findMapping(
    settings.mappings,
    mappedSourceValue
  );

  let thresholdStatus = {
    text: "NORMAL",
    color: "cyan",
  };

  if (numericValue >= danger) {
    thresholdStatus = {
      text: "CRITICAL",
      color: "red",
    };
  } else if (numericValue >= warning) {
    thresholdStatus = {
      text: "WARNING",
      color: "amber",
    };
  }

  const mappedStatus = {
    text:
      activeMapping?.text?.trim() ||
      settings.fallbackText?.trim() ||
      (settings.mode === "combined" &&
      mappedSourceValue === undefined
        ? "NO STATUS DATA"
        : String(mappedSourceValue ?? "—")),
    color:
      activeMapping?.color ||
      settings.fallbackColor ||
      "default",
  };

  const currentStatus =
    settings.statusSource === "threshold"
      ? thresholdStatus
      : mappedStatus;

  const statusClass =
    statusTone[currentStatus.color] ||
    statusTone.default;

  const alignmentClass =
    alignmentClasses[settings.alignment] ||
    alignmentClasses.left;

  const horizontalAlignment =
    settings.alignment === "center"
      ? "center"
      : settings.alignment === "right"
      ? "right"
      : "left";

  const valueJustifyClass =
    horizontalAlignment === "center"
      ? "justify-center"
      : horizontalAlignment === "right"
      ? "justify-end"
      : "justify-start";

  /*
   * Header alignment is intentionally independent from the three-dot
   * signature at the top-right.
   *
   * Previously a centred label used `pr-14` only. That removed space from
   * the right side but not the left, so the mathematical centre shifted
   * left. Centre mode now reserves the SAME amount on both sides.
   */
  const headerPaddingClass =
    horizontalAlignment === "center"
      ? "px-12"
      : horizontalAlignment === "right"
      ? "pl-8 pr-12"
      : "pl-0 pr-12";

  const headerTextAlignClass =
    horizontalAlignment === "center"
      ? "text-center"
      : horizontalAlignment === "right"
      ? "text-right"
      : "text-left";

  const labelLength =
    String(label || "").length;

  const labelSizeClass =
    labelLength > 36
      ? "text-[9px]"
      : labelLength > 24
      ? "text-[10px]"
      : labelLength > 16
      ? "text-[11px]"
      : tiny
      ? "text-[11px]"
      : compact
      ? "text-xs"
      : wide
      ? "text-sm"
      : "text-[13px]";

  const renderWidgetLabel = () => {
    if (!settings.showLabel) {
      return null;
    }

    return (
      <div
        className={`
          w-full min-w-0
          ${headerPaddingClass}
        `}
      >
        <div
          className={`
            ${TECH_HEADER_CLASS}
            ${headerTextAlignClass}
            ${labelSizeClass}
            whitespace-normal
            break-words
            leading-[1.15]
          `}
          title={label}
        >
          {label}
        </div>
      </div>
    );
  };

  /*
   * Display Style
   * -------------
   * TemplateDesigner saves:
   *   modern
   *   compact
   *   simple
   *
   * Older templates may still contain "company", so it is treated as
   * an alias of "simple".
   */
  const normalizedStyle =
    settings.style === "company"
      ? "simple"
      : ["modern", "compact", "simple"].includes(
          settings.style
        )
      ? settings.style
      : "modern";

  const normalizedValueSize =
    ["small", "medium", "large", "xlarge"].includes(
      settings.valueSize
    )
      ? settings.valueSize
      : "xlarge";

  const getResponsiveValueSize = (
    style,
    size
  ) => {
    const sizeIndex = {
      small: 0,
      medium: 1,
      large: 2,
      xlarge: 3,
    }[size];

    const modernSizes = tiny
      ? ["text-2xl", "text-3xl", "text-4xl", "text-5xl"]
      : compact
      ? ["text-3xl", "text-4xl", "text-5xl", "text-6xl"]
      : wide
      ? [
          "text-4xl",
          "text-5xl xl:text-6xl",
          "text-6xl xl:text-7xl",
          "text-7xl xl:text-8xl",
        ]
      : ["text-3xl", "text-4xl", "text-5xl", "text-6xl"];

    const compactSizes = tiny
      ? ["text-xl", "text-2xl", "text-3xl", "text-4xl"]
      : compact
      ? ["text-2xl", "text-3xl", "text-4xl", "text-5xl"]
      : wide
      ? ["text-3xl", "text-4xl", "text-5xl", "text-6xl"]
      : ["text-2xl", "text-3xl", "text-4xl", "text-5xl"];

    const simpleSizes = tiny
      ? ["text-2xl", "text-3xl", "text-4xl", "text-5xl"]
      : compact
      ? ["text-3xl", "text-4xl", "text-5xl", "text-6xl"]
      : wide
      ? ["text-4xl", "text-5xl", "text-6xl", "text-7xl"]
      : ["text-3xl", "text-4xl", "text-5xl", "text-6xl"];

    const source =
      style === "compact"
        ? compactSizes
        : style === "simple"
        ? simpleSizes
        : modernSizes;

    return source[sizeIndex];
  };

  const requestedSizeClass =
    getResponsiveValueSize(
      normalizedStyle,
      normalizedValueSize
    );

  /*
   * A plain numeric Stat is the main KPI card, so Large / Extra Large
   * presentations can use more of the available space than a Combined
   * Stat + Status card. Extra Large is the default for new Stat widgets.
   *
   * This applies to:
   *   mode  = number
   *   style = modern
   *   size  = large or xlarge
   *
   * Long values are still protected by the overflow rules below.
   */
  const emphasizedNumberSizeClass =
    settings.mode === "number" &&
    normalizedStyle === "modern"
      ? normalizedValueSize === "xlarge"
        ? tiny
          ? "text-6xl"
          : compact
          ? "text-7xl"
          : wide
          ? "text-8xl xl:text-9xl"
          : "text-7xl"
        : normalizedValueSize === "large"
        ? tiny
          ? "text-5xl"
          : compact
          ? "text-6xl"
          : wide
          ? "text-7xl xl:text-8xl"
          : "text-6xl"
        : requestedSizeClass
      : requestedSizeClass;

  /*
   * Large sensor values can be much longer than "44.1".
   * Instead of clipping them with `truncate`, reduce only the value's
   * typography when the text is unusually long for the current card width.
   */
  const visibleValueText =
    `${formattedValue}${
      settings.showUnit && unit
        ? ` ${unit}`
        : ""
    }`;

  const visibleValueLength =
    visibleValueText.length;

  const sizeClass =
    visibleValueLength >= 20
      ? tiny
        ? "text-base"
        : compact
        ? "text-xl"
        : "text-2xl"
      : visibleValueLength >= 15
      ? tiny
        ? "text-lg"
        : compact
        ? "text-2xl"
        : "text-3xl"
      : visibleValueLength >= 11
      ? tiny
        ? "text-xl"
        : compact
        ? "text-3xl"
        : "text-4xl"
      : width > 0 &&
        width < 180
      ? "text-2xl"
      : emphasizedNumberSizeClass;

  /*
   * Value Mapping needs its own responsive typography.
   *
   * The previous mapping branch ignored settings.valueSize completely and
   * always used fixed text-xl / text-2xl / text-3xl classes.
   */
  const mappedTextLength =
    String(
      currentStatus.text || ""
    ).length;

  const getMappingValueSize = () => {
    const sizeIndex = {
      small: 0,
      medium: 1,
      large: 2,
      xlarge: 3,
    }[
      normalizedValueSize
    ];

    const mappingSizes = tiny
      ? [
          "text-base",
          "text-lg",
          "text-xl",
          "text-2xl",
        ]
      : compact
      ? [
          "text-lg",
          "text-xl",
          "text-2xl",
          "text-3xl",
        ]
      : wide
      ? [
          "text-4xl",
          "text-5xl",
          "text-6xl",
          "text-7xl",
        ]
      : [
          "text-xl",
          "text-2xl",
          "text-3xl",
          "text-4xl",
        ];

    let requested =
      mappingSizes[sizeIndex];

    /*
     * Long mapping labels such as "MANUAL INLET VALVE" should wrap rather
     * than overflow the card. Reduce only when needed.
     */
    if (mappedTextLength >= 44) {
      requested = tiny
        ? "text-sm"
        : compact
        ? "text-base"
        : wide
        ? "text-4xl"
        : "text-2xl";
    } else if (
      mappedTextLength >= 32
    ) {
      requested = tiny
        ? "text-sm"
        : compact
        ? "text-lg"
        : wide
        ? "text-5xl"
        : "text-3xl";
    } else if (
      mappedTextLength >= 22 &&
      ["large", "xlarge"].includes(
        normalizedValueSize
      )
    ) {
      requested = tiny
        ? "text-base"
        : compact
        ? "text-xl"
        : wide
        ? "text-5xl"
        : "text-3xl";
    }

    return requested;
  };

  const mappingValueSizeClass =
    getMappingValueSize();

  const valueColorClass =
    settings.valueColor === "custom"
      ? ""
      : valueColorClasses[
          settings.valueColor
        ] ||
        valueColorClasses.default;

  const customValueStyle =
    settings.valueColor === "custom" &&
    /^#[0-9a-fA-F]{6}$/.test(
      String(
        settings.customValueColor ||
          ""
      )
    )
      ? {
          color:
            settings.customValueColor,
        }
      : undefined;

  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
      ? ArrowDownRight
      : Minus;

  const trendLabel =
    trend === "up"
      ? "Rising"
      : trend === "down"
      ? "Falling"
      : "Stable";

  if (settings.mode === "valueMapping") {
    return (
      <div
        ref={rootRef}
        className={`${TECH_SURFACE_CLASS} border border-slate-200/80 dark:border-slate-700/70 ${
          tiny
            ? "p-2.5"
            : compact
            ? "p-3"
            : "p-3.5"
        }`}
      >
        <div
          className={`
            relative z-10
            flex h-full min-h-0
            flex-col
            ${alignmentClass}
          `}
        >
          {renderWidgetLabel()}

          {/*
            Value Mapping intentionally follows a simple status-card layout:
            widget label at the top and the mapped operating state centered
            in the remaining space. No nested badge/card is used, so the
            widget stays clean in both light and dark themes.
          */}
          <div className="flex min-h-0 w-full flex-1 items-center justify-center px-2 py-2">
            <div
              className={`
                max-w-full
                whitespace-normal
                break-words
                text-center
                font-black
                leading-[1.02]
                tracking-[0.01em]
                ${mappingValueSizeClass}
                ${statusClass.text}
              `}
              title={currentStatus.text}
            >
              {currentStatus.text}
            </div>
          </div>

          {settings.showRawValue && (
            <div
              className={`
                w-full pb-0.5 text-center
                text-[10px] font-medium
                ${TECH_MUTED_CLASS}
              `}
            >
              Raw value: {String(value ?? "—")}
            </div>
          )}
        </div>
      </div>
    );
  }

  /*
   * NUMBER / COMBINED MODE
   *
   * The three display styles are deliberately different:
   *
   * Modern:
   *   large KPI, trend below, full min/max progress footer
   *
   * Compact:
   *   smaller KPI, trend inline, thin progress strip, tighter spacing
   *
   * Simple:
   *   clean value + unit, no progress decoration
   */
  const renderTrend = ({
    inline = false,
  } = {}) => {
    if (
      !settings.showTrend ||
      tiny
    ) {
      return null;
    }

    return (
      <div
        className={`
          inline-flex items-center gap-1.5
          text-slate-500
          dark:text-slate-400
          ${
            inline
              ? "text-[10px]"
              : "text-xs"
          }
        `}
      >
        <TrendIcon
          size={
            inline ? 12 : 14
          }
          className={
            trend === "up"
              ? "text-[#58D7FF]"
              : trend === "down"
              ? "text-[#FF6F88]"
              : "text-slate-400"
          }
        />

        <span>
          {trendLabel}
        </span>
      </div>
    );
  };

  const renderValue = ({
    compactLayout = false,
  } = {}) => (
    <div
      style={customValueStyle}
      className={`
        flex w-full min-w-0
        max-w-full flex-wrap
        items-baseline
        ${valueJustifyClass}
        ${
          compactLayout
            ? "gap-x-1.5 gap-y-0.5"
            : "gap-x-2 gap-y-1"
        }
        font-extrabold
        tracking-[-0.055em]
        ${valueColorClass}
        ${sizeClass}
      `}
    >
      <span
        className="
          min-w-0 max-w-full
          whitespace-nowrap
        "
        title={formattedValue}
      >
        {formattedValue}
      </span>

      {settings.showUnit &&
        unit && (
          <span
            className={`
              shrink-0 whitespace-nowrap
              font-medium
              tracking-normal
              text-slate-500
              dark:text-slate-400
              ${
                compactLayout
                  ? "text-[10px]"
                  : "text-sm"
              }
            `}
            title={unit}
          >
            {unit}
          </span>
        )}
    </div>
  );

  const renderModernProgress = () => {
    if (
      !settings.showProgress ||
      tiny
    ) {
      return null;
    }

    return (
      <div className="w-full">
        <div
          className="
            mb-1.5 flex items-center
            justify-between
            text-[10px]
            text-slate-400
          "
        >
          <span>{min}</span>
          <span>{max}</span>
        </div>

        <div
          className="
            h-1.5 overflow-hidden
            rounded-full
            bg-slate-200/80
            dark:bg-slate-700/70
          "
        >
          <div
            className="
              h-full rounded-full
              bg-gradient-to-r
              from-[#58D7FF]
              via-[#7D75E7]
              to-[#A86BDF]
              transition-[width]
              duration-500
            "
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>
    );
  };

  const renderCompactProgress = () => {
    if (
      !settings.showProgress ||
      tiny
    ) {
      return null;
    }

    return (
      <div
        className="
          mt-1 h-1 w-full
          overflow-hidden rounded-full
          bg-slate-200/70
          dark:bg-slate-700/60
        "
      >
        <div
          className="
            h-full rounded-full
            bg-[#58D7FF]
            transition-[width]
            duration-500
          "
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    );
  };

  if (
    settings.mode === "number" &&
    normalizedStyle === "compact"
  ) {
    return (
      <div
        ref={rootRef}
        className={`${TECH_SURFACE_CLASS} ${
          tiny
            ? "p-2.5"
            : "p-3"
        }`}
      >
        <TechBackdrop />

        <div
          className={`
            relative z-10
            flex h-full min-h-0
            flex-col
            ${alignmentClass}
          `}
        >
          {renderWidgetLabel()}

          <div
            className="
              flex min-h-0
              flex-1 items-center
              w-full
            "
          >
            <div className="w-full">
              <div
                className="
                  flex w-full flex-wrap
                  items-center gap-x-3
                  gap-y-1
                  ${valueJustifyClass}
                "
              >
                {renderValue({
                  compactLayout:
                    true,
                })}

                {renderTrend({
                  inline: true,
                })}
              </div>

              {renderCompactProgress()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    settings.mode === "number" &&
    normalizedStyle === "simple"
  ) {
    return (
      <div
        ref={rootRef}
        className={`${TECH_SURFACE_CLASS} ${
          tiny
            ? "p-3"
            : "p-4"
        }`}
      >
        <TechBackdrop />

        <div
          className={`
            relative z-10
            flex h-full min-h-0
            flex-col
            ${alignmentClass}
          `}
        >
          {renderWidgetLabel()}

          <div
            className="
              flex min-h-0
              flex-1 items-center
              w-full
            "
          >
            <div className="w-full">
              {renderValue()}

              {settings.showTrend &&
                !tiny && (
                  <div
                    className={`
                      mt-1.5 flex w-full
                      ${valueJustifyClass}
                    `}
                  >
                    {renderTrend()}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODERN style and COMBINED mode.
  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny
          ? "p-3"
          : "p-4"
      }`}
    >
      <TechBackdrop />

      <div
        className={`
          relative z-10
          flex h-full flex-col
          ${alignmentClass}
        `}
      >
        <div
          className="
            relative flex w-full
            min-w-0 items-start
          "
        >
          <div className="w-full min-w-0">
            {renderWidgetLabel()}
          </div>
        </div>

        <div
          className="
            flex min-h-0
            flex-1 items-center
          "
        >
          <div className="w-full">
            {renderValue()}

            {settings.showTrend &&
              !tiny && (
                <div
                  className={`
                    mt-2 flex w-full
                    ${valueJustifyClass}
                  `}
                >
                  {renderTrend()}
                </div>
              )}

            {settings.mode ===
              "combined" && (
                <div
                  className={`
                    flex w-full
                    min-w-0 items-center
                    ${tiny ? "mt-1.5 gap-1.5" : "mt-3 gap-2"}
                    ${valueJustifyClass}
                  `}
                  title={currentStatus.text}
                >
                  <Activity
                    size={tiny ? 11 : 14}
                    className={`
                      shrink-0
                      ${statusClass.text}
                    `}
                  />

                  <span
                    className={`
                      min-w-0
                      max-w-[85%]
                      whitespace-normal
                      break-words
                      ${
                        tiny
                          ? "text-[10px]"
                          : "text-sm"
                      }
                      font-semibold
                      leading-tight
                      ${statusClass.text}
                    `}
                  >
                    {currentStatus.text}
                  </span>
                </div>
              )}
          </div>
        </div>

        {renderModernProgress()}
      </div>
    </div>
  );

}

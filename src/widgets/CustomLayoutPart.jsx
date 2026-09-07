import {
  Box,
  CircleDot,
  Droplets,
  Factory,
  Flame,
  Gauge as GaugeIcon,
  Wind,
  Zap,
} from "lucide-react";
import BarWidget from "./BarWidget";
import NumStatWidget from "./NumStatWidget";
import GaugeWidget from "./GaugeWidget";
import LineWidget from "./LineWidget";
import LinearGaugeWidget from "./LinearGaugeWidget";
import PieWidget from "./PieWidget";
import {
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SERIES,
  TECH_SURFACE_CLASS,
  TechBackdrop,
} from "./widgetTech";
import {
  CUSTOM_LAYOUT_CHILD_LABELS,
} from "./customLayoutConfig";
import { EQUIPMENT_BY_TYPE } from "../process/equipmentLibrary";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import "../process/processVisualization.css";

const EQUIPMENT_ICONS = {
  factory: Factory,
  gauge: GaugeIcon,
  droplets: Droplets,
  flame: Flame,
  wind: Wind,
  zap: Zap,
  box: Box,
  circle: CircleDot,
};

const selectedKeys = (
  part
) =>
  Array.isArray(
    part?.dataKeys
  ) &&
  part.dataKeys.length
    ? part.dataKeys.filter(
        Boolean
      )
    : part?.dataKey
    ? [part.dataKey]
    : [];

const resolveAccent = (
  part
) =>
  /^#[0-9a-fA-F]{6}$/.test(
    String(
      part?.accentColor || ""
    )
  )
    ? part.accentColor
    : "#35C9F4";

const getDataLabel = (
  key,
  dataOptions
) =>
  dataOptions.find(
    (option) =>
      option.key === key
  )?.label || key;

const gridSpanForPart = (
  part
) => ({
  w:
    part?.w >= 520
      ? 3
      : part?.w >= 300
      ? 2
      : 1,
  h:
    part?.h >= 260
      ? 2
      : 1,
});

function CleanCustomPart({
  children,
}) {
  return (
    <div
      className="
        h-full min-h-0 w-full
        overflow-hidden
        [&_.widget-tech-backdrop]:hidden
      "
    >
      {children}
    </div>
  );
}

function EmptyDataState() {
  return (
    <div className="flex h-full items-center justify-center p-3">
      <div
        className={`text-center text-[9px] ${TECH_MUTED_CLASS}`}
      >
        Select data source
      </div>
    </div>
  );
}

function EquipmentPanel({
  part,
  data,
  useExampleFallback,
}) {
  const panel =
    part?.equipmentPanel || {
      label: "",
      displayMode: "panel",
      icon: "factory",
      measurements: [],
    };

  const measurements =
    Array.isArray(
      panel.measurements
    )
      ? panel.measurements
      : [];

  const equipmentDefinition =
    EQUIPMENT_BY_TYPE[
      panel.equipmentType
    ];

  const displayLabel =
    panel.label ||
    equipmentDefinition?.label ||
    "Equipment";

  const Icon =
    EQUIPMENT_ICONS[
      panel.icon
    ] || Factory;

  if (
    panel.displayMode ===
    "icon"
  ) {
    return (
      <div
        className="flex h-full items-center justify-center p-2"
      >
        <div className="flex h-full w-full flex-col items-center justify-center text-center">
          <div className="min-h-0 w-full flex-1">
            {panel.equipmentType ? (
              <ProcessEquipmentVisual
                type={
                  panel.equipmentType
                }
                values={{}}
                motionEnabled={
                  false
                }
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div
                  className="flex items-center justify-center rounded-2xl bg-cyan-50 text-[#0891B2] dark:bg-cyan-400/10"
                  style={{
                    width:
                      "min(58%, 96px)",
                    aspectRatio:
                      "1 / 1",
                  }}
                >
                  <Icon className="h-[52%] w-[52%]" />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div
      className={`${TECH_SURFACE_CLASS} h-full p-3`}
    >
      <TechBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2">
          <div className="h-10 w-12 shrink-0 overflow-visible">
            {panel.equipmentType ? (
              <ProcessEquipmentVisual
                type={
                  panel.equipmentType
                }
                values={{}}
                motionEnabled={
                  false
                }
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-cyan-50 text-[#0891B2] dark:bg-cyan-400/10">
                <Icon size={16} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div
              className={`${TECH_HEADER_CLASS} truncate`}
            >
              {displayLabel}
            </div>

            <div
              className={`text-[8px] ${TECH_MUTED_CLASS}`}
            >
              {measurements.length
                ? `${measurements.length} measurement${
                    measurements.length ===
                    1
                      ? ""
                      : "s"
                  }`
                : "No measurements"}
            </div>
          </div>
        </div>

        {measurements.length ? (
          <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-hidden">
            {measurements
              .slice(0, 6)
              .map(
                (
                  measurement,
                  index
                ) => {
                  const raw =
                    measurement.dataKey
                      ? data?.[
                          measurement
                            .dataKey
                        ]
                      : undefined;

                  const numeric =
                    Number(raw);

                  const hasValue =
                    Number.isFinite(
                      numeric
                    );

                  const fallback =
                    10 + index * 4;

                  return (
                    <div
                      key={
                        measurement.id
                      }
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <span className="min-w-0 truncate text-[8px] font-medium text-slate-500 dark:text-slate-400">
                        {measurement.label ||
                          "Measurement"}
                      </span>

                      <span className="shrink-0 text-[9px] font-extrabold text-slate-800 dark:text-slate-100">
                        {hasValue ||
                        useExampleFallback
                          ? (
                              hasValue
                                ? numeric
                                : fallback
                            ).toLocaleString(
                              undefined,
                              {
                                maximumFractionDigits:
                                  1,
                              }
                            )
                          : "—"}
                        {measurement.unit
                          ? ` ${measurement.unit}`
                          : ""}
                      </span>
                    </div>
                  );
                }
              )}
          </div>
        ) : (
          <div
            className={`flex min-h-0 flex-1 items-center justify-center text-center text-[9px] ${TECH_MUTED_CLASS}`}
          >
            No measurements
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomLayoutPart({
  part,
  data = {},
  history = [],
  dataOptions = [],
  useExampleFallback = false,
}) {
  const keys =
    selectedKeys(part);

  const firstKey =
    part?.dataKey ||
    keys[0] ||
    "";

  const accent =
    resolveAccent(part);

  const span =
    gridSpanForPart(part);

  const labels =
    Object.fromEntries(
      keys.map((key) => [
        key,
        getDataLabel(
          key,
          dataOptions
        ),
      ])
    );

  const seriesColors =
    Object.fromEntries(
      keys.map(
        (key, index) => [
          key,
          index === 0
            ? accent
            : TECH_SERIES[
                index %
                  TECH_SERIES.length
              ],
        ]
      )
    );

  const rawValue =
    firstKey
      ? data?.[firstKey]
      : undefined;

  const numericValue =
    Number(rawValue);

  const value =
    Number.isFinite(
      numericValue
    )
      ? numericValue
      : useExampleFallback
      ? 10
      : 0;

  if (
    part?.type ===
    "text"
  ) {
    return (
      <div
        className="flex h-full w-full items-center px-3 py-2"
        style={{
          justifyContent:
            part.textAlign ===
            "center"
              ? "center"
              : part.textAlign ===
                "right"
              ? "flex-end"
              : "flex-start",
          color:
            part.textColor ||
            "#0F172A",
          fontSize: `${Math.min(
            72,
            Math.max(
              8,
              part.fontSize ||
                24
            )
          )}px`,
          fontWeight:
            part.fontWeight ||
            700,
          textAlign:
            part.textAlign ||
            "left",
          lineHeight: 1.1,
        }}
      >
        {part.text || "Text"}
      </div>
    );
  }

  if (
    part?.type ===
    "divider"
  ) {
    const vertical =
      part.dividerDirection ===
      "vertical";

    return (
      <div className="flex h-full w-full items-center justify-center p-2">
        <div
          className="rounded-full"
          style={{
            backgroundColor:
              accent,
            width: vertical
              ? "3px"
              : "100%",
            height: vertical
              ? "100%"
              : "3px",
          }}
        />
      </div>
    );
  }

  if (
    part?.type ===
    "processEquipment"
  ) {
    return (
      <CleanCustomPart>
        <EquipmentPanel
          part={part}
          data={data}
          useExampleFallback={
            useExampleFallback
          }
        />
      </CleanCustomPart>
    );
  }

  if (!keys.length) {
    return (
      <EmptyDataState />
    );
  }

  const commonRange =
    part?.rangeConfig || {
      min: 0,
      max: 100,
      unit: "",
      warning: "",
      danger: "",
    };

  const label =
    String(
      part?.label || ""
    ).trim() || " ";

  switch (part?.type) {
    case "gauge":
      return (
        <CleanCustomPart>
          <GaugeWidget
          value={value}
          label={label}
          dataKey={firstKey}
          rangeConfig={commonRange}
          display={{
            ...(part?.gaugeDisplay ||
              {}),
            ...(part?.accentColor
              ? {
                  colorMode:
                    "custom",
                  normalColor:
                    accent,
                }
              : {}),
          }}
          />
        </CleanCustomPart>
      );

    case "linearGauge":
      return (
        <CleanCustomPart>
          <LinearGaugeWidget
          value={value}
          label={label}
          dataKey={firstKey}
          rangeConfig={commonRange}
          display={{
            ...(part?.gaugeDisplay ||
              {}),
            ...(part?.accentColor
              ? {
                  colorMode:
                    "custom",
                  normalColor:
                    accent,
                }
              : {}),
          }}
          />
        </CleanCustomPart>
      );

    case "line":
      return (
        <CleanCustomPart>
          <LineWidget
          data={history}
          label={label}
          historyWindow="15m"
          rangeConfig={
            commonRange
          }
          rangeConfigs={
            part?.rangeConfigs ||
            {}
          }
          dataLabels={labels}
          chartDisplay={{
            ...(part?.chartDisplay ||
              {}),
            seriesColors,
          }}
          gridWidth={span.w}
          gridHeight={span.h}
          lines={keys.map(
            (key) => ({
              key,
              color:
                seriesColors[key],
            })
          )}
          />
        </CleanCustomPart>
      );

    case "bar":
      return (
        <CleanCustomPart>
          <BarWidget
          data={data}
          dataKeys={keys}
          label={label}
          orientation={
            part?.orientation ||
            "vertical"
          }
          rangeConfig={
            commonRange
          }
          rangeConfigs={
            part?.rangeConfigs ||
            {}
          }
          dataLabels={labels}
          chartDisplay={{
            ...(part?.chartDisplay ||
              {}),
            seriesColors,
          }}
          gridWidth={span.w}
          gridHeight={span.h}
          />
        </CleanCustomPart>
      );

    case "pie":
      return (
        <CleanCustomPart>
          <PieWidget
          data={data}
          gridWidth={span.w}
          gridHeight={span.h}
          item={{
            id:
              part?.id,
            type: "pie",
            label,
            dataKey:
              firstKey,
            dataKeys: keys,
            dataLabels:
              labels,
            rangeConfig:
              commonRange,
            rangeConfigs:
              part?.rangeConfigs ||
              {},
            chartDisplay: {
              ...(part?.chartDisplay ||
                {}),
              seriesColors,
            },
            pieDisplay:
              part?.pieDisplay ||
              {},
            w: span.w,
            h: span.h,
          }}
          />
        </CleanCustomPart>
      );

    case "bignumber":
    default:
      return (
        <CleanCustomPart>
          <NumStatWidget
          value={value}
          label={label}
          dataKey={firstKey}
          display={{
            ...(part?.bigNumberDisplay ||
              {}),
            ...(part?.accentColor
              ? {
                  valueColor:
                    "custom",
                  customValueColor:
                    accent,
                }
              : {}),
          }}
          rangeConfig={
            commonRange
          }
          />
        </CleanCustomPart>
      );
  }
}

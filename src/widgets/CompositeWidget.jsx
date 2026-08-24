import NumStatWidget from "./NumStatWidget";
import GaugeWidget from "./GaugeWidget";
import LinearGaugeWidget from "./LinearGaugeWidget";
import LineWidget from "./LineWidget";
import BarWidget from "./BarWidget";
import PieWidget from "./PieWidget";
import {
  DEFAULT_COMPOSITE_CONFIG,
  getCompositePreset,
} from "../data/compositeWidgets";
import {
  TECH_SERIES,
  TECH_SURFACE_CLASS,
  TechBackdrop,
} from "./widgetTech";

const getSelectedKeys = (
  item = {}
) =>
  Array.isArray(item.dataKeys) &&
  item.dataKeys.length
    ? item.dataKeys
    : item.dataKey
    ? [item.dataKey]
    : [];

export default function CompositeWidget({
  data = {},
  history = [],
  liveStatus = null,
  historyWindow = "15m",
  item = {},
}) {
  const config = {
    ...DEFAULT_COMPOSITE_CONFIG,
    ...(item.compositeConfig || {}),
  };

  const preset = getCompositePreset(
    config.preset
  );

  const selectedKeys =
    getSelectedKeys(item);

  const primaryKey =
    selectedKeys[0] ||
    item.dataKey ||
    "";

  const primaryValue =
    Number(
      data?.[primaryKey]
    ) || 0;

  const ratio = Math.min(
    70,
    Math.max(
      25,
      Number(config.ratio) || 34
    )
  );

  const gridW =
    Math.max(
      1,
      Number(item?.w) || 1
    );

  const gridH =
    Math.max(
      1,
      Number(item?.h) || 1
    );

  const horizontal =
    config.layout ===
    "horizontal";

  const primaryGridW =
    horizontal
      ? Math.max(
          1,
          Math.round(
            gridW *
              (ratio / 100)
          )
        )
      : gridW;

  const secondaryGridW =
    horizontal
      ? Math.max(
          1,
          gridW -
            primaryGridW
        )
      : gridW;

  /*
   * A vertical composite inside a 4×1 card physically contains two short
   * bands, but both are still part of a 1-row dashboard widget. Passing
   * gridHeight=1 keeps child responsive modes consistent with runtime.
   */
  const primaryGridH =
    horizontal
      ? gridH
      : Math.max(
          1,
          Math.round(
            gridH *
              (ratio / 100)
          )
        );

  const secondaryGridH =
    horizontal
      ? gridH
      : Math.max(
          1,
          gridH -
            primaryGridH
        );

  const getPartConfig = (partName) => ({
    ...(
      partName === "primary"
        ? config.primaryConfig
        : config.secondaryConfig
    ),
  });

  const getPartKeys = (partName, type) => {
    const partConfig = getPartConfig(partName);
    const allowedKeys = new Set(selectedKeys);

    const configuredKeys = Array.isArray(partConfig.dataKeys)
      ? partConfig.dataKeys.filter((key) => key && allowedKeys.has(key))
      : [];

    const configuredSingle =
      partConfig.dataKey && allowedKeys.has(partConfig.dataKey)
        ? partConfig.dataKey
        : "";

    if (["line", "area", "bar", "pie"].includes(type)) {
      if (partConfig.sourceMode === "custom") {
        if (configuredKeys.length > 0) return configuredKeys;
        return selectedKeys.slice(0, 1);
      }

      return selectedKeys;
    }

    if (configuredSingle) return [configuredSingle];
    if (configuredKeys.length > 0) return [configuredKeys[0]];
    return primaryKey ? [primaryKey] : selectedKeys.slice(0, 1);
  };

  const renderPart = (type, partName) => {
    const partConfig = getPartConfig(partName);
    const partKeys = getPartKeys(partName, type);
    const partPrimaryKey = partKeys[0] || primaryKey || "";
    const partValue = Number(data?.[partPrimaryKey]) || 0;

    const label = String(
      partConfig.label ||
        (partName === "primary"
          ? item.compositeConfig?.primaryLabel
          : item.compositeConfig?.secondaryLabel) ||
        item.label ||
        ""
    ).trim();

    const partGridW =
      partName === "primary" ? primaryGridW : secondaryGridW;
    const partGridH =
      partName === "primary" ? primaryGridH : secondaryGridH;

    const partRangeConfig = {
      ...(item.rangeConfig || {}),
      ...(partConfig.rangeConfig || {}),
    };

    const partChartDisplay = {
      ...(item.chartDisplay || {}),
      ...(partConfig.chartDisplay || {}),
    };

    const partBigNumberDisplay = {
      ...(item.bigNumberDisplay || {}),
      ...(partConfig.bigNumberDisplay || {}),
    };

    const partHistoryWindow =
      partConfig.historyWindow || item.historyWindow || historyWindow;

    const partLines = partKeys.map((key, index) => ({
      key,
      label: item.dataLabels?.[key] || key,
      color:
        item.seriesColors?.[key] ||
        TECH_SERIES[index % TECH_SERIES.length],
    }));

    const commonItem = {
      ...item,
      label,
      dataKey: partPrimaryKey,
      dataKeys: partKeys,
      w: partGridW,
      h: partGridH,
    };

    switch (type) {
      case "bignumber":
        return (
          <NumStatWidget
            value={partValue}
            label={label}
            dataKey={partPrimaryKey}
            display={{
              ...partBigNumberDisplay,
              mode: partBigNumberDisplay.mode || "number",
              showLabel: partBigNumberDisplay.showLabel !== false,
            }}
            rangeConfig={partRangeConfig}
          />
        );

      case "gauge":
        return (
          <GaugeWidget
            value={partValue}
            label={label}
            dataKey={partPrimaryKey}
            rangeConfig={partRangeConfig}
          />
        );

      case "linearGauge":
        return (
          <LinearGaugeWidget
            value={partValue}
            label={label}
            dataKey={partPrimaryKey}
            rangeConfig={partRangeConfig}
          />
        );

      case "line":
      case "area":
        return (
          <LineWidget
            data={history}
            lines={partLines}
            label={label || "Trend"}
            historyWindow={partHistoryWindow}
            rangeConfig={partRangeConfig}
            rangeConfigs={item.rangeConfigs}
            dataLabels={item.dataLabels}
            gridWidth={partGridW}
            gridHeight={partGridH}
            chartDisplay={{
              ...partChartDisplay,
              compactLegend: partChartDisplay.compactLegend !== false,
              showLatestValues: partChartDisplay.showLatestValues === true,
              ...(type === "area" ? { chartStyle: "area" } : {}),
            }}
          />
        );

      case "bar":
        return (
          <BarWidget
            data={data}
            dataKeys={partKeys}
            label={label || "Comparison"}
            orientation={partConfig.orientation || item.orientation || "vertical"}
            rangeConfig={partRangeConfig}
            rangeConfigs={item.rangeConfigs}
            dataLabels={item.dataLabels}
            chartDisplay={partChartDisplay}
          />
        );

      case "pie":
        return (
          <PieWidget
            data={data}
            gridWidth={partGridW}
            gridHeight={partGridH}
            item={{
              ...commonItem,
              label: label || "Distribution",
              pieDisplay: {
                ...(item.pieDisplay || {}),
                ...(partConfig.pieDisplay || {}),
              },
            }}
          />
        );

      default:
        return null;
    }
  };

  const primaryContent =
    renderPart(
      preset.primaryType,
      "primary"
    );

  const secondaryContent =
    renderPart(
      preset.secondaryType,
      "secondary"
    );

  return (
    <div
      className={`${TECH_SURFACE_CLASS} p-0`}
    >
      {/* Composite owns ONE card signature. Child widget signatures are hidden. */}
      <TechBackdrop />

      <div
        className={`
          relative z-10 grid
          h-full min-h-0 w-full
          ${
            horizontal
              ? "grid-cols-[var(--primary)_minmax(0,1fr)]"
              : "grid-rows-[var(--primary)_minmax(0,1fr)]"
          }
        `}
        style={{
          "--primary":
            `${ratio}%`,
        }}
      >
        <section
          className={`
            min-h-0 min-w-0
            overflow-hidden
            ${
              horizontal
                ? "border-r"
                : "border-b"
            }
            border-slate-100
            dark:border-slate-800

            [&_.dashboard-widget-surface]:rounded-none
            [&_.dashboard-widget-surface]:border-0
            [&_.dashboard-widget-surface]:bg-transparent
            [&_.dashboard-widget-surface]:shadow-none
            [&_.widget-tech-backdrop]:hidden
          `}
        >
          {primaryContent}
        </section>

        <section
          className="
            min-h-0 min-w-0
            overflow-hidden

            [&_.dashboard-widget-surface]:rounded-none
            [&_.dashboard-widget-surface]:border-0
            [&_.dashboard-widget-surface]:bg-transparent
            [&_.dashboard-widget-surface]:shadow-none
            [&_.widget-tech-backdrop]:hidden
          "
        >
          {secondaryContent}
        </section>
      </div>
    </div>
  );
}

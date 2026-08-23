import BigNumberWidget from "./BigNumberWidget";
import GaugeWidget from "./GaugeWidget";
import LinearGaugeWidget from "./LinearGaugeWidget";
import LineWidget from "./LineWidget";
import BarWidget from "./BarWidget";
import PieWidget from "./PieWidget";
import StatusWidget from "./StatusWidget";
import {
  DEFAULT_COMPOSITE_CONFIG,
  getCompositePreset,
} from "../data/compositeWidgets";
import { TECH_SERIES, TECH_SURFACE_CLASS, TechBackdrop } from "./widgetTech";

const getSelectedKeys = (item = {}) =>
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

  const selectedKeys = getSelectedKeys(item);
  const primaryKey =
    selectedKeys[0] || item.dataKey || "";

  const primaryValue =
    Number(data?.[primaryKey]) || 0;

  const ratio = Math.min(
    70,
    Math.max(25, Number(config.ratio) || 34)
  );

  const commonItem = {
    ...item,
    label: item.label || "",
    dataKey: primaryKey,
    dataKeys: selectedKeys,
  };

  const lines = selectedKeys.map(
    (key, index) => ({
      key,
      label:
        item.dataLabels?.[key] || key,
      color:
        item.seriesColors?.[key] ||
        TECH_SERIES[
          index % TECH_SERIES.length
        ],
    })
  );

  const renderPart = (
    type,
    partName
  ) => {
    const label =
      partName === "primary"
        ? item.compositeConfig?.primaryLabel ||
          item.label ||
          ""
        : item.compositeConfig?.secondaryLabel ||
          item.label ||
          "";

    switch (type) {
      case "bignumber":
        return (
          <BigNumberWidget
            value={primaryValue}
            label={label}
            dataKey={primaryKey}
            display={{
              ...(item.bigNumberDisplay || {}),
              showLabel:
                partName === "primary"
                  ? true
                  : item.bigNumberDisplay
                      ?.showLabel,
            }}
            rangeConfig={item.rangeConfig}
          />
        );

      case "gauge":
        return (
          <GaugeWidget
            value={primaryValue}
            label={label}
            dataKey={primaryKey}
            rangeConfig={item.rangeConfig}
          />
        );

      case "linearGauge":
        return (
          <LinearGaugeWidget
            value={primaryValue}
            label={label}
            dataKey={primaryKey}
            rangeConfig={item.rangeConfig}
          />
        );

      case "line":
        return (
          <LineWidget
            data={history}
            lines={lines}
            label={label || "Trend"}
            historyWindow={
              item.historyWindow ||
              historyWindow
            }
            rangeConfig={item.rangeConfig}
            rangeConfigs={item.rangeConfigs}
            dataLabels={item.dataLabels}
            chartDisplay={{
              ...(item.chartDisplay || {}),
              compactLegend: true,
              showLatestValues: false,
            }}
          />
        );

      case "bar":
        return (
          <BarWidget
            data={data}
            dataKeys={selectedKeys}
            label={label || "Comparison"}
            orientation={
              item.orientation || "vertical"
            }
            rangeConfig={item.rangeConfig}
            rangeConfigs={item.rangeConfigs}
            dataLabels={item.dataLabels}
          />
        );

      case "pie":
        return (
          <PieWidget
            data={data}
            item={{
              ...commonItem,
              label:
                label || "Distribution",
            }}
          />
        );

      case "status":
        return (
          <StatusWidget
            liveStatus={liveStatus}
          />
        );

      default:
        return null;
    }
  };

  const primaryContent = renderPart(
    preset.primaryType,
    "primary"
  );

  const secondaryContent = renderPart(
    preset.secondaryType,
    "secondary"
  );

  const horizontal =
    config.layout === "horizontal";

  return (
    <div className={`${TECH_SURFACE_CLASS} p-0`}>
      <TechBackdrop />
      <div
        className={`
          grid h-full min-h-0 w-full
          ${
            horizontal
              ? "grid-cols-[var(--primary)_minmax(0,1fr)]"
              : "grid-rows-[var(--primary)_minmax(0,1fr)]"
          }
        `}
        style={{
          "--primary": `${ratio}%`,
        }}
      >
        <section
          className={`
            min-h-0 min-w-0 overflow-hidden
            ${
              horizontal
                ? "border-r"
                : "border-b"
            }
            border-[#E8ECE5]
            dark:border-white/10
            [&_.dashboard-widget-surface]:rounded-none
            [&_.dashboard-widget-surface]:border-0
            [&_.dashboard-widget-surface]:shadow-none
          `}
        >
          {primaryContent}
        </section>

        <section
          className="
            min-h-0 min-w-0 overflow-hidden
            [&_.dashboard-widget-surface]:rounded-none
            [&_.dashboard-widget-surface]:border-0
            [&_.dashboard-widget-surface]:shadow-none
          "
        >
          {secondaryContent}
        </section>
      </div>
    </div>
  );
}

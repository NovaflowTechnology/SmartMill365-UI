import BarWidget from "./BarWidget";
import NumStatWidget from "./NumStatWidget";
import GaugeWidget from "./GaugeWidget";
import LineWidget from "./LineWidget";
import LinearGaugeWidget from "./LinearGaugeWidget";
import PieWidget from "./PieWidget";
import ProcessEquipmentWidget, {
  DEFAULT_PROCESS_EQUIPMENT_CONFIG,
  normalizeProcessEquipmentConfig,
} from "./ProcessEquipmentWidget";

export const CUSTOM_LAYOUT_CHILD_TYPES = [
  "bignumber",
  "gauge",
  "linearGauge",
  "line",
  "bar",
  "pie",
  "processEquipment",
];

export const CUSTOM_LAYOUT_CHILD_LABELS = {
  bignumber: "Stat",
  gauge: "Gauge",
  linearGauge: "Linear Gauge",
  line: "Line / Area",
  bar: "Bar",
  pie: "Pie",
  processEquipment: "Process Equipment",
};

const createPartId = () =>
  `custom-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createCustomLayoutPart = (overrides = {}) => ({
  id: createPartId(),
  type: "bignumber",
  label: "",
  dataKey: "",
  dataKeys: [],
  fullWidth: false,
  chartDisplay: {},
  bigNumberDisplay: {},
  processEquipmentConfig: { ...DEFAULT_PROCESS_EQUIPMENT_CONFIG },
  ...overrides,
});

export const DEFAULT_CUSTOM_LAYOUT_CONFIG = {
  columns: 2,
  gap: 8,
  parts: [
    createCustomLayoutPart(),
    createCustomLayoutPart(),
  ],
};

export const normalizeCustomLayoutConfig = (config = {}) => {
  const columns = Math.max(1, Math.min(2, Number(config?.columns) || 2));
  const gap = Math.max(0, Math.min(20, Number(config?.gap) || 8));
  const rawParts = Array.isArray(config?.parts) && config.parts.length
    ? config.parts.slice(0, 4)
    : DEFAULT_CUSTOM_LAYOUT_CONFIG.parts;

  const parts = rawParts.map((part, index) => {
    const type = CUSTOM_LAYOUT_CHILD_TYPES.includes(part?.type)
      ? part.type
      : "bignumber";

    const dataKeys = Array.isArray(part?.dataKeys)
      ? [...new Set(part.dataKeys.filter(Boolean))]
      : part?.dataKey
      ? [part.dataKey]
      : [];

    return {
      ...createCustomLayoutPart(),
      ...part,
      id: part?.id || `custom-part-${index}-${Date.now()}`,
      type,
      dataKey: part?.dataKey || dataKeys[0] || "",
      dataKeys,
      fullWidth: Boolean(part?.fullWidth),
      processEquipmentConfig: normalizeProcessEquipmentConfig(
        part?.processEquipmentConfig || DEFAULT_PROCESS_EQUIPMENT_CONFIG
      ),
    };
  });

  return {
    ...DEFAULT_CUSTOM_LAYOUT_CONFIG,
    ...config,
    columns,
    gap,
    parts,
  };
};

const selectedKeysForPart = (part) => {
  if (Array.isArray(part?.dataKeys) && part.dataKeys.length) {
    return part.dataKeys.filter(Boolean);
  }
  return part?.dataKey ? [part.dataKey] : [];
};

export default function CustomLayoutWidget({
  data = {},
  history = [],
  historyWindow = "15m",
  item = {},
}) {
  const config = normalizeCustomLayoutConfig(item?.customLayoutConfig);

  const renderPart = (part) => {
    const selectedKeys = selectedKeysForPart(part);
    const dataKey = part.dataKey || selectedKeys[0] || "";
    const value = dataKey ? data?.[dataKey] : undefined;
    const label = part.label || CUSTOM_LAYOUT_CHILD_LABELS[part.type] || "Widget";

    const commonItem = {
      ...item,
      id: `${item?.id || "custom"}-${part.id}`,
      type: part.type,
      label,
      dataKey,
      dataKeys: selectedKeys,
      w: part.fullWidth ? Math.max(2, Number(item?.w) || 2) : 1,
      h: 1,
      chartDisplay: {
        ...(item?.chartDisplay || {}),
        ...(part?.chartDisplay || {}),
      },
      bigNumberDisplay: {
        ...(item?.bigNumberDisplay || {}),
        ...(part?.bigNumberDisplay || {}),
      },
      processEquipmentConfig: part?.processEquipmentConfig,
      rangeConfig:
        item?.rangeConfigs?.[dataKey] ||
        item?.rangeConfig,
    };

    switch (part.type) {
      case "gauge":
        return (
          <GaugeWidget
            value={value}
            label={label}
            dataKey={dataKey}
            rangeConfig={item?.rangeConfigs?.[dataKey] || item?.rangeConfig}
          />
        );

      case "linearGauge":
        return (
          <LinearGaugeWidget
            value={value}
            label={label}
            dataKey={dataKey}
            rangeConfig={item?.rangeConfigs?.[dataKey] || item?.rangeConfig}
          />
        );

      case "line":
        return (
          <LineWidget
            data={history}
            label={label}
            historyWindow={historyWindow}
            rangeConfig={item?.rangeConfig}
            rangeConfigs={item?.rangeConfigs || {}}
            dataLabels={item?.dataLabels || {}}
            chartDisplay={{
              ...(item?.chartDisplay || {}),
              ...(part?.chartDisplay || {}),
              compactLegend: true,
              showLatestValues: false,
            }}
            gridWidth={part.fullWidth ? 2 : 1}
            gridHeight={1}
            lines={selectedKeys.map((key, index) => ({
              key,
              color: ["#58D7FF", "#7D75E7", "#FF6F88", "#70D8C2"][index % 4],
            }))}
          />
        );

      case "bar":
        return (
          <BarWidget
            data={data}
            dataKeys={selectedKeys}
            label={label}
            orientation={part?.orientation || "vertical"}
            rangeConfig={item?.rangeConfig}
            rangeConfigs={item?.rangeConfigs || {}}
            dataLabels={item?.dataLabels || {}}
            chartDisplay={part?.chartDisplay || item?.chartDisplay || {}}
          />
        );

      case "pie":
        return (
          <PieWidget
            data={data}
            gridWidth={part.fullWidth ? 2 : 1}
            gridHeight={1}
            item={commonItem}
          />
        );

      case "processEquipment":
        return (
          <ProcessEquipmentWidget
            data={data}
            history={history}
            item={commonItem}
          />
        );

      case "bignumber":
      default:
        return (
          <NumStatWidget
            value={value}
            label={label}
            dataKey={dataKey}
            display={commonItem.bigNumberDisplay}
            rangeConfig={item?.rangeConfigs?.[dataKey] || item?.rangeConfig}
          />
        );
    }
  };

  return (
    <div className="h-full min-h-0 w-full overflow-hidden p-1.5">
      <div
        className="grid h-full min-h-0 w-full auto-rows-fr"
        style={{
          gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
          gap: `${config.gap}px`,
        }}
      >
        {config.parts.map((part) => (
          <section
            key={part.id}
            className="min-h-0 min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white/65 dark:border-[#263657] dark:bg-[#0B1328]/82 [&_.dashboard-widget-surface]:h-full [&_.dashboard-widget-surface]:rounded-none [&_.dashboard-widget-surface]:border-0 [&_.dashboard-widget-surface]:bg-transparent [&_.dashboard-widget-surface]:shadow-none [&_.widget-tech-backdrop]:hidden"
            style={{
              gridColumn: part.fullWidth && config.columns > 1 ? "1 / -1" : "auto",
            }}
          >
            {renderPart(part)}
          </section>
        ))}
      </div>
    </div>
  );
}

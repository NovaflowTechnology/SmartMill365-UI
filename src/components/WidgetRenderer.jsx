import AreaWidget from "../widgets/AreaWidget";
import BarWidget from "../widgets/BarWidget";
import BigNumberWidget from "../widgets/BigNumberWidget";
import GaugeWidget from "../widgets/GaugeWidget";
import LineWidget from "../widgets/LineWidget";
import LinearGaugeWidget from "../widgets/LinearGaugeWidget";
import ImageWidget from "../widgets/ImageWidget";
import ImageWidgetConfigurator from "../widgets/ImageWidgetConfigurator";

export default function WidgetRenderer({
  type,
  value,
  dataKey,
  data = {},
  history = [],
  historyWindow = "15m",
  item = {},
  updateItem = () => {},
  editMode = false,
}) {
  switch (type) {
    // GAUGE
    case "gauge":
      return (
        <GaugeWidget
          value={value}
          label={dataKey}
          dataKey={dataKey}
        />
      );

    // LINEAR GAUGE
    case "linearGauge":
      return (
        <LinearGaugeWidget
          value={value}
          label={dataKey}
          dataKey={dataKey}
        />
      );

    case "bar": {
      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <BarWidget
          data={data}
          dataKeys={selectedKeys}
          label={item?.label || "Bar Chart"}
          orientation={item?.orientation || "vertical"}
        />
      );
    }

    // BIG NUMBER
    case "bignumber":
      return (
        <BigNumberWidget
          value={value}
          label={dataKey}
          dataKey={dataKey}
        />
      );
    
    // AREA
    case "area": {
      const colors = [
        "#10b981",
        "#3b82f6",
        "#ef4444",
        "#f59e0b",
        "#8b5cf6",
        "#06b6d4",
      ];

      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <AreaWidget
          data={history}
          label={item?.label || "Area Trend"}
          historyWindow={historyWindow}
          lines={selectedKeys.map((key, index) => ({
            key,
            color: colors[index % colors.length],
          }))}
        />
      );
    }

    // LINE
    case "line": {
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#22c55e",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
    ];

    const selectedKeys =
      item?.dataKeys?.length > 0
        ? item.dataKeys
        : dataKey
        ? [dataKey]
        : [];

    return (
      <LineWidget
        data={history}
        label={item?.label || "Trend"}
        historyWindow={historyWindow}
        lines={selectedKeys.map((key, index) => ({
          key,
          color: colors[index % colors.length],
        }))}
      />
    );
  }

    // IMAGE
    case "image":
      if (editMode) {
        return (
          <ImageWidgetConfigurator
            pins={item.pins || []}
            setPins={(updatedPins) => {
              updateItem({
                ...item,
                pins: updatedPins,
              });
            }}
          />
        );
      }

      return (
        <ImageWidget
          pins={item.pins || []}
          valueMap={data}
        />
      );

    default:
      return (
        <div className="text-gray-400">
          Unknown Widget
        </div>
      );
  }
}
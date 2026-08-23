import { TECH_SERIES } from "../widgets/widgetTech";
import BarWidget from "../widgets/BarWidget";
import BigNumberWidget from "../widgets/BigNumberWidget";
import GaugeWidget from "../widgets/GaugeWidget";
import LineWidget from "../widgets/LineWidget";
import LinearGaugeWidget from "../widgets/LinearGaugeWidget";
import ImageWidget from "../widgets/ImageWidget";
import ImageWidgetConfigurator from "../widgets/ImageWidgetConfigurator";
import StatusWidget from "../widgets/StatusWidget";
import PieWidget from "../widgets/PieWidget";
import SankeyWidget from "../widgets/SankeyWidget";
import LogsWidget from "../widgets/LogsWidget";
import CompositeWidget from "../widgets/CompositeWidget";

export default function WidgetRenderer({
  type,
  value,
  dataKey,
  data = {},
  history = [],
  historyWindow = "15m",
  liveStatus = null,
  item = {},
  updateItem = () => {},
  editMode = false,
}) {
  switch (type) {
    case "composite":
      return (
        <CompositeWidget
          data={data}
          history={history}
          liveStatus={liveStatus}
          historyWindow={historyWindow}
          item={item}
        />
      );

    case "status":
      return (
        <StatusWidget
          liveStatus={liveStatus}
        />
      );

    case "logs": {
      const logs =
        Array.isArray(item?.logs)
          ? item.logs
          : Array.isArray(data?.logs)
          ? data.logs
          : Array.isArray(liveStatus?.logs)
          ? liveStatus.logs
          : [];

      return (
        <LogsWidget
          logs={logs}
          label={
            item?.label ||
            "System Logs"
          }
          display={
            item?.logDisplay
          }
        />
      );
    }

    case "gauge":
      return (
        <GaugeWidget
          value={value}
          label={item?.label || dataKey}
          dataKey={dataKey}
          rangeConfig={item?.rangeConfig}
        />
      );

    case "linearGauge":
      return (
        <LinearGaugeWidget
          value={value}
          label={item?.label || dataKey}
          dataKey={dataKey}
          rangeConfig={item?.rangeConfig}
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
          label={
            item?.label ||
            "Bar Chart"
          }
          orientation={
            item?.orientation ||
            "vertical"
          }
          rangeConfig={
            item?.rangeConfig
          }
          rangeConfigs={
            item?.rangeConfigs || {}
          }
          dataLabels={
            item?.dataLabels || {}
          }
          chartDisplay={
            item?.chartDisplay || {}
          }
        />
      );
    }

    case "pie": {
      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <PieWidget
          data={data}
          item={{
            ...item,
            dataKeys: selectedKeys,
          }}
        />
      );
    }

    case "sankey":
      return (
        <SankeyWidget
          data={data}
          item={item}
        />
      );

    case "bignumber": {
      const statusDataKey =
        item?.bigNumberDisplay?.statusDataKey ||
        item?.dataKeys?.[1] ||
        "";

      const statusValue =
        statusDataKey
          ? data?.[statusDataKey]
          : undefined;

      return (
        <BigNumberWidget
          value={value}
          statusValue={statusValue}
          label={item?.label || dataKey}
          dataKey={dataKey}
          display={{
            ...(item?.bigNumberDisplay || {}),
            statusDataKey,
          }}
          rangeConfig={
            item?.rangeConfig
          }
        />
      );
    }

    /*
     * Backward compatibility for older saved templates.
     *
     * New widgets should no longer save:
     *   type: "area"
     *
     * They should save:
     *   type: "line"
     *   chartDisplay.chartStyle: "area"
     *
     * Keeping this case means old Area widgets still render correctly
     * even after AreaWidget.jsx is removed.
     */
    case "area": {
      const colors = TECH_SERIES;

      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <LineWidget
          data={history}
          label={
            item?.label ||
            "Area Trend"
          }
          historyWindow={
            historyWindow
          }
          rangeConfig={
            item?.rangeConfig
          }
          rangeConfigs={
            item?.rangeConfigs || {}
          }
          dataLabels={
            item?.dataLabels || {}
          }
          chartDisplay={{
            ...(item?.chartDisplay || {}),
            chartStyle: "area",
          }}
          lines={selectedKeys.map(
            (key, index) => ({
              key,
              color:
                colors[
                  index %
                    colors.length
                ],
            })
          )}
        />
      );
    }

    case "line": {
      const colors = TECH_SERIES;

      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <LineWidget
          data={history}
          label={
            item?.label ||
            "Trend"
          }
          historyWindow={
            historyWindow
          }
          rangeConfig={
            item?.rangeConfig
          }
          rangeConfigs={
            item?.rangeConfigs || {}
          }
          dataLabels={
            item?.dataLabels || {}
          }
          chartDisplay={{
            ...(item?.chartDisplay || {}),
            chartStyle:
              item?.chartDisplay?.chartStyle ||
              "line",
          }}
          lines={selectedKeys.map(
            (key, index) => ({
              key,
              color:
                colors[
                  index %
                    colors.length
                ],
            })
          )}
        />
      );
    }

    case "image":
      if (editMode) {
        return (
          <ImageWidgetConfigurator
            pins={item?.pins || []}
            image={item?.image}
            customDataOptions={
              item?.customDataOptions ||
              []
            }
            setPins={(
              updatedPins
            ) => {
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
          pins={item?.pins || []}
          valueMap={data}
          image={item?.image}
          customDataOptions={
            item?.customDataOptions ||
            []
          }
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

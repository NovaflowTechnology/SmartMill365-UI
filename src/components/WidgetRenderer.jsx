import { TECH_SERIES } from "../widgets/widgetTech";
import BarWidget from "../widgets/BarWidget";
import NumStatWidget from "../widgets/NumStatWidget";
import GaugeWidget from "../widgets/GaugeWidget";
import LineWidget from "../widgets/LineWidget";
import HeatmapWidget from "../widgets/HeatmapWidget";
import LinearGaugeWidget from "../widgets/LinearGaugeWidget";
import ImageWidget from "../widgets/ImageWidget";
import ImageWidgetConfigurator from "../widgets/ImageWidgetConfigurator";
import PieWidget from "../widgets/PieWidget";
import SankeyWidget from "../widgets/SankeyWidget";
import LogsWidget from "../widgets/LogsWidget";
import CompositeWidget from "../widgets/CompositeWidget";
import ProcessEquipmentWidget from "../widgets/ProcessEquipmentWidget";
import ProcessViewWidget from "../widgets/ProcessViewWidget";
import CustomLayoutWidget from "../widgets/CustomLayoutWidget";


const hasDisplayValue = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "";

const hashText = (value = "") => {
  let hash = 2166136261;

  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
};

const addDataKey = (set, value) => {
  if (typeof value === "string" && value.trim()) {
    set.add(value.trim());
  }
};

const collectWidgetDataKeys = (item = {}, directDataKey = "") => {
  const keys = new Set();

  addDataKey(keys, directDataKey);
  addDataKey(keys, item?.dataKey);

  (Array.isArray(item?.dataKeys) ? item.dataKeys : []).forEach((key) =>
    addDataKey(keys, key)
  );

  addDataKey(
    keys,
    item?.bigNumberDisplay?.statusDataKey
  );

  (Array.isArray(item?.pins) ? item.pins : []).forEach((pin) =>
    addDataKey(keys, pin?.dataKey)
  );

  const sankeyLinks = Array.isArray(item?.sankeyConfig?.links)
    ? item.sankeyConfig.links
    : Array.isArray(item?.sankeyConfig?.outputs)
    ? item.sankeyConfig.outputs
    : [];

  sankeyLinks.forEach((link) =>
    addDataKey(keys, link?.dataKey)
  );

  const equipmentConfig =
    item?.processEquipmentConfig || {};

  Object.values(
    equipmentConfig?.bindings ||
      equipmentConfig?.metricBindings ||
      {}
  ).forEach((key) =>
    addDataKey(keys, key)
  );

  (Array.isArray(equipmentConfig?.customMetrics)
    ? equipmentConfig.customMetrics
    : []
  ).forEach((metric) =>
    addDataKey(
      keys,
      metric?.dataKey ||
        metric?.key
    )
  );

  const walk = (value, depth = 0) => {
    if (!value || depth > 5) return;

    if (Array.isArray(value)) {
      value.forEach((entry) =>
        walk(entry, depth + 1)
      );
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    Object.entries(value).forEach(
      ([property, propertyValue]) => {
        if (
          property === "dataKey" ||
          property === "statusDataKey"
        ) {
          addDataKey(
            keys,
            propertyValue
          );
        } else if (
          property === "dataKeys" &&
          Array.isArray(propertyValue)
        ) {
          propertyValue.forEach(
            (key) =>
              addDataKey(
                keys,
                key
              )
          );
        } else if (
          property === "bindings" ||
          property === "metricBindings"
        ) {
          if (
            propertyValue &&
            typeof propertyValue ===
              "object"
          ) {
            Object.values(
              propertyValue
            ).forEach(
              (key) =>
                addDataKey(
                  keys,
                  key
                )
            );
          }
        } else if (
          [
            "processEquipmentConfig",
            "customLayoutConfig",
            "parts",
            "children",
            "items",
            "widgets",
          ].includes(property)
        ) {
          walk(
            propertyValue,
            depth + 1
          );
        }
      }
    );
  };

  walk(item);

  return [...keys];
};

const findPinRange = (
  item,
  key
) =>
  (Array.isArray(item?.pins)
    ? item.pins
    : []
  ).find(
    (pin) =>
      pin?.dataKey === key
  )?.rangeConfig || null;

const getRangeForFakeKey = (
  item,
  key
) => {
  const range = {
    ...(item?.rangeConfig || {}),
    ...(item?.rangeConfigs?.[
      key
    ] || {}),
    ...(findPinRange(
      item,
      key
    ) || {}),
  };

  const min =
    Number.isFinite(
      Number(range.min)
    )
      ? Number(range.min)
      : 0;

  let max =
    Number.isFinite(
      Number(range.max)
    )
      ? Number(range.max)
      : 100;

  if (max <= min) {
    max = min + 100;
  }

  return {
    ...range,
    min,
    max,
  };
};

const getSemanticFakeRatio = (
  key
) => {
  const normalized =
    String(key || "")
      .toLowerCase();

  if (
    /status|running|state|active|enabled|onoff/.test(
      normalized
    )
  ) {
    return null;
  }

  if (/pressure/.test(normalized)) {
    return 0.58;
  }

  if (/temp/.test(normalized)) {
    return 0.62;
  }

  if (/flow/.test(normalized)) {
    return 0.68;
  }

  if (/level/.test(normalized)) {
    return 0.67;
  }

  if (/speed|rpm/.test(normalized)) {
    return 0.56;
  }

  if (/power|kw/.test(normalized)) {
    return 0.48;
  }

  if (/draft/.test(normalized)) {
    return 0.42;
  }

  return undefined;
};

const makeFakeValue = (
  key,
  item,
  index = 0
) => {
  const normalized =
    String(key || "")
      .toLowerCase();

  if (
    /status|running|state|active|enabled|onoff/.test(
      normalized
    )
  ) {
    return 1;
  }

  const {
    min,
    max,
  } = getRangeForFakeKey(
    item,
    key
  );

  const span =
    Math.max(
      1,
      max - min
    );

  const semanticRatio =
    getSemanticFakeRatio(
      key
    );

  const hash =
    hashText(key);

  const ratio =
    semanticRatio ??
    (
      0.32 +
      ((hash + index * 17) %
        46) /
        100
    );

  const value =
    min +
    span *
      Math.min(
        0.88,
        Math.max(
          0.12,
          ratio
        )
      );

  const decimals =
    span >= 1000
      ? 0
      : span >= 100
      ? 1
      : 2;

  return Number(
    value.toFixed(
      decimals
    )
  );
};

const fillMissingFakeData = (
  data,
  item,
  directDataKey
) => {
  const result = {
    ...(data || {}),
  };

  if (
    item?.fakeFallback === false
  ) {
    return result;
  }

  const keys =
    collectWidgetDataKeys(
      item,
      directDataKey
    );

  keys.forEach(
    (key, index) => {
      if (
        !hasDisplayValue(
          result[key]
        )
      ) {
        result[key] =
          makeFakeValue(
            key,
            item,
            index
          );
      }
    }
  );

  return result;
};

const makeFakeHistory = (
  history,
  keys,
  item
) => {
  const sourceRows =
    Array.isArray(history)
      ? history
      : [];

  if (
    item?.fakeFallback === false ||
    !keys.length
  ) {
    return sourceRows;
  }

  const now = Date.now();
  const pointCount = 36;
  const intervalMs =
    60 * 1000;

  const makeRow = (
    timestamp,
    row = {},
    rowIndex = 0
  ) => {
    const result = {
      ...row,
      timestamp:
        row?.timestamp ||
        timestamp,
    };

    keys.forEach(
      (key, keyIndex) => {
        if (
          hasDisplayValue(
            result[key]
          )
        ) {
          return;
        }

        const base =
          makeFakeValue(
            key,
            item,
            keyIndex
          );

        if (
          typeof base !==
            "number"
        ) {
          result[key] =
            base;
          return;
        }

        const range =
          getRangeForFakeKey(
            item,
            key
          );

        const span =
          Math.max(
            1,
            range.max -
              range.min
          );

        const amplitude =
          span *
          (
            0.035 +
            (hashText(key) %
              4) *
              0.008
          );

        const wave =
          Math.sin(
            rowIndex *
              0.45 +
              keyIndex *
                1.3
          ) *
            amplitude +
          Math.sin(
            rowIndex *
              0.13 +
              keyIndex
          ) *
            amplitude *
            0.35;

        const next =
          Math.min(
            range.max,
            Math.max(
              range.min,
              base + wave
            )
          );

        result[key] =
          Number(
            next.toFixed(
              span >= 100
                ? 1
                : 2
            )
          );
      }
    );

    return result;
  };

  if (
    sourceRows.length
  ) {
    return sourceRows.map(
      (row, index) =>
        makeRow(
          row?.timestamp ||
            now -
              (sourceRows.length -
                index -
                1) *
                intervalMs,
          row,
          index
        )
    );
  }

  return Array.from(
    {
      length:
        pointCount,
    },
    (_, index) =>
      makeRow(
        now -
          (pointCount -
            index -
            1) *
            intervalMs,
        {},
        index
      )
  );
};

const makeFakeLogs = () => {
  const now = Date.now();

  return [
    {
      id: "demo-alarm-high",
      timestamp:
        new Date(
          now - 4 * 60000
        ).toISOString(),
      severity: "high",
      level: "error",
      source: "Sterilizer 4",
      equipment: "Sterilizer 4",
      message:
        "Pressure exceeded the configured operating threshold.",
      acknowledged: false,
    },
    {
      id: "demo-alarm-medium",
      timestamp:
        new Date(
          now - 9 * 60000
        ).toISOString(),
      severity: "medium",
      level: "warning",
      source: "Boiler",
      equipment: "Boiler",
      message:
        "Steam flow is approaching the warning threshold.",
      acknowledged: false,
    },
    {
      id: "demo-alarm-low",
      timestamp:
        new Date(
          now - 15 * 60000
        ).toISOString(),
      severity: "low",
      level: "notice",
      source: "Sterilizer 2",
      equipment: "Sterilizer 2",
      message:
        "Minor process deviation detected.",
      acknowledged: true,
    },
    {
      id: "demo-alarm-info",
      timestamp:
        new Date(
          now - 22 * 60000
        ).toISOString(),
      severity: "info",
      level: "info",
      source: "System",
      equipment: "System",
      message:
        "Process monitoring is running in demonstration fallback mode.",
      acknowledged: true,
    },
  ];
};

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
  const demoData =
    fillMissingFakeData(
      data,
      item,
      dataKey
    );

  const requiredDataKeys =
    collectWidgetDataKeys(
      item,
      dataKey
    );

  const demoHistory =
    makeFakeHistory(
      history,
      requiredDataKeys,
      item
    );

  const resolvedValue =
    hasDisplayValue(value)
      ? value
      : dataKey &&
        hasDisplayValue(
          demoData?.[dataKey]
        )
      ? demoData[dataKey]
      : makeFakeValue(
          dataKey ||
            item?.dataKey ||
            "value",
          item
        );

  switch (type) {
    case "composite":
      return (
        <CompositeWidget
          data={demoData}
          history={demoHistory}
          liveStatus={liveStatus}
          historyWindow={historyWindow}
          item={item}
        />
      );

    case "processEquipment":
      return (
        <ProcessEquipmentWidget
          data={demoData}
          history={demoHistory}
          item={item}
        />
      );

    case "processView":
      return (
        <ProcessViewWidget
          data={demoData}
          item={item}
        />
      );

    case "customLayout":
      return (
        <CustomLayoutWidget
          data={demoData}
          history={demoHistory}
          historyWindow={historyWindow}
          item={item}
        />
      );

    case "logs": {
      const configuredLogs =
        Array.isArray(item?.logs)
          ? item.logs
          : Array.isArray(demoData?.logs)
          ? demoData.logs
          : Array.isArray(liveStatus?.logs)
          ? liveStatus.logs
          : [];

      const logs =
        configuredLogs.length > 0 ||
        item?.fakeFallback === false
          ? configuredLogs
          : makeFakeLogs();

      return (
        <LogsWidget
          logs={logs}
          label={
            item?.label ||
            "Events & Alarms"
          }
          display={
            item?.logDisplay
          }
        />
      );
    }

    case "gauge": {
      const gaugeStyle =
        item?.gaugeDisplay?.style === "linear"
          ? "linear"
          : "circular";

      return gaugeStyle === "linear" ? (
        <LinearGaugeWidget
          value={resolvedValue}
          label={item?.label || dataKey}
          dataKey={dataKey}
          rangeConfig={item?.rangeConfig}
        />
      ) : (
        <GaugeWidget
          value={resolvedValue}
          label={item?.label || dataKey}
          dataKey={dataKey}
          rangeConfig={item?.rangeConfig}
        />
      );
    }

    // Backward compatibility for templates saved before V33.
    case "linearGauge":
      return (
        <LinearGaugeWidget
          value={resolvedValue}
          label={item?.label || dataKey}
          dataKey={dataKey}
          rangeConfig={item?.rangeConfig}
        />
      );

    case "heatmap": {
      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <HeatmapWidget
          data={demoHistory}
          dataKeys={selectedKeys}
          label={item?.label || "Heatmap"}
          historyWindow={historyWindow}
          rangeConfig={item?.rangeConfig || {}}
          dataLabels={item?.dataLabels || {}}
          chartDisplay={item?.chartDisplay || {}}
        />
      );
    }

    case "bar": {
      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <BarWidget
          data={demoData}
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
          gridWidth={item?.w}
          gridHeight={item?.h}
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
          data={demoData}
          gridWidth={item?.w}
          gridHeight={item?.h}
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
          data={demoData}
          item={item}
        />
      );

    case "bignumber": {
      const statusDataKey =
        item?.bigNumberDisplay
          ?.statusDataKey ||
        item?.dataKeys?.[1] ||
        "";

      const statusValue =
        statusDataKey
          ? demoData?.[statusDataKey]
          : undefined;

      return (
        <NumStatWidget
          value={resolvedValue}
          statusValue={statusValue}
          label={item?.label || dataKey}
          dataKey={dataKey}
          display={{
            ...(item?.bigNumberDisplay ||
              {}),
            statusDataKey,
          }}
          rangeConfig={
            item?.rangeConfig
          }
        />
      );
    }

    /*
     * "area" remains as a compatibility alias for old saved templates.
     * New templates use type="line" + chartDisplay.chartStyle="area".
     */
    case "area":
    case "line": {
      const colors =
        TECH_SERIES;

      const selectedKeys =
        item?.dataKeys?.length > 0
          ? item.dataKeys
          : dataKey
          ? [dataKey]
          : [];

      return (
        <LineWidget
          data={demoHistory}
          label={
            item?.label ||
            (type === "area"
              ? "Area Trend"
              : "Trend")
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
            ...(item?.chartDisplay ||
              {}),
            ...(type === "area"
              ? {
                  chartStyle:
                    "area",
                }
              : {}),
          }}
          gridWidth={item?.w}
          gridHeight={item?.h}
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
          valueMap={demoData}
          history={demoHistory}
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

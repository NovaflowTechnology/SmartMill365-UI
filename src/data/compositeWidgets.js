export const COMPOSITE_PRESETS = [
  {
    id: "stat-line",
    label: "Stat + Line",
    description:
      "Current KPI with historical trend.",
    primaryType: "bignumber",
    secondaryType: "line",
    defaultLayout: "vertical",
    defaultRatio: 34,
    minSources: 1,
  },

  {
    id: "stat-gauge",
    label: "Stat + Gauge",
    description:
      "Numeric KPI beside a semi-circular gauge.",
    primaryType: "bignumber",
    secondaryType: "gauge",
    defaultLayout: "horizontal",
    defaultRatio: 38,
    minSources: 1,
  },

  {
    id: "stat-linear",
    label: "Stat + Linear Gauge",
    description:
      "Numeric KPI with a compact progress meter.",
    primaryType: "bignumber",
    secondaryType: "linearGauge",
    defaultLayout: "vertical",
    defaultRatio: 42,
    minSources: 1,
  },

  {
    id: "gauge-line",
    label: "Gauge + Line",
    description:
      "Current gauge with historical trend.",
    primaryType: "gauge",
    secondaryType: "line",
    defaultLayout: "horizontal",
    defaultRatio: 38,
    minSources: 1,
  },

  {
    id: "stat-bar",
    label: "Stat + Bar",
    description:
      "KPI summary with a comparison chart.",
    primaryType: "bignumber",
    secondaryType: "bar",
    defaultLayout: "vertical",
    defaultRatio: 32,
    minSources: 2,
  },

  {
    id: "stat-pie",
    label: "Stat + Pie",
    description:
      "Total KPI with a proportional breakdown.",
    primaryType: "bignumber",
    secondaryType: "pie",
    defaultLayout: "horizontal",
    defaultRatio: 34,
    minSources: 2,
  },

  {
    id: "stat-status",
    label: "Stat + Data Status",
    description:
      "Live KPI together with device health.",
    primaryType: "bignumber",
    secondaryType: "status",
    defaultLayout: "horizontal",
    defaultRatio: 44,
    minSources: 1,
  },
];

export const DEFAULT_COMPOSITE_CONFIG = {
  preset: "stat-line",
  layout: "vertical",
  ratio: 34,
};

export const getCompositePreset = (
  presetId
) =>
  COMPOSITE_PRESETS.find(
    (preset) =>
      preset.id === presetId
  ) || COMPOSITE_PRESETS[0];

export const getCompatibleCompositePresets = (
  selectedSourceCount = 1
) =>
  COMPOSITE_PRESETS.filter(
    (preset) =>
      selectedSourceCount >=
      preset.minSources
  );

import {
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Hash,
  Image as ImageIcon,
  Gauge,
  ChartArea,
  Radio,
  Workflow,
  ScrollText,
} from "lucide-react";

export const allDataKeys = [
  "steamPressure",
  "steamFlowrate",
  "steamOutletTemp",
  "inletDraft",
  "outletDraft",
  "furnaceDraft",
  "waterInletTemp",
  "waterFlowrate",
  "waterDrumLevel",
  "vgPressure",
  "vgInletTemp",
  "vgOutletTemp",
];

export const widgetLibrary = [
  {
    type: "gauge",
    label: "Gauge",
    description:
      "Display a value using a circular gauge.",
    icon: Activity,
    supportedData: allDataKeys,
  },

  {
    type: "linearGauge",
    label: "Linear Gauge",
    description:
      "Display a value using a horizontal progress gauge.",
    icon: Gauge,
    supportedData: allDataKeys,
  },

  {
    type: "line",
    label: "Line",
    description:
      "Display historical values as a line chart.",
    icon: TrendingUp,
    supportedData: allDataKeys,
  },

  {
    type: "area",
    label: "Area",
    description:
      "Display historical values as a filled area chart.",
    icon: ChartArea,
    supportedData: allDataKeys,
  },

  {
    type: "bar",
    label: "Bar",
    description:
      "Compare one or more values using bars.",
    icon: BarChart3,
    supportedData: allDataKeys,
  },

  {
    type: "pie",
    label: "Pie",
    description:
      "Compare the proportions of multiple values.",
    icon: PieChart,
    supportedData: allDataKeys,
  },

  {
    type: "sankey",
    label: "Sankey",
    description:
      "Visualize flow distribution from one source to multiple outputs.",
    icon: Workflow,
    supportedData: [],
  },

  {
    type: "bignumber",
    label: "Stat",
    description:
      "Display a numeric value or map raw values into readable status text.",
    icon: Hash,
    supportedData: allDataKeys,
  },

  {
    type: "logs",
    label: "Logs",
    description:
      "Display alarms, device events, and system activity in a chronological list.",
    icon: ScrollText,
    supportedData: [],
  },

  {
    type: "status",
    label: "Data Status",
    description:
      "Display device health, connection status, and data freshness.",
    icon: Radio,
    supportedData: [],
  },

  {
    type: "image",
    label: "Image",
    description:
      "Display a process diagram with configurable live sensor pins.",
    icon: ImageIcon,
    supportedData: [],
  },
];

/**
 * Original Channel Mapping from Novaflow
 *
 * ch1:  steamPressure
 * ch2:  steamFlowrate
 * ch3:  steamOutletTemp
 * ch4:  inletDraft
 * ch5:  outletDraft
 * ch6:  furnaceDraft
 *
 * ch8:  waterInletTemp
 * ch9:  waterFlowrate
 * ch10: waterDrumLevel
 * ch11: vgPressure
 * ch12: vgInletTemp
 * ch13: vgOutletTemp
 */

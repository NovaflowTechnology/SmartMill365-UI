import {
  BarChart3,
  PieChart,
  TrendingUp,
  Hash,
  Image as ImageIcon,
  Gauge,
  Workflow,
  ScrollText,
  BellRing,
  PanelsTopLeft,
  Grid3X3,
  Factory,
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
      "Display a value using a circular or linear gauge style.",
    // Switched: circular Gauge now uses the Gauge icon.
    icon: Gauge,
    supportedData: allDataKeys,
  },

  {
    type: "line",
    label: "Line",
    description:
      "Display historical values as a line or filled area chart.",
    icon: TrendingUp,
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
    type: "heatmap",
    label: "Heatmap",
    description:
      "Compare one or more comparable process values across time using colour intensity.",
    icon: Grid3X3,
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
    type: "composite",
    label: "Composite",
    description:
      "Combine two compatible widget views inside one dashboard card.",
    icon: PanelsTopLeft,
    supportedData: allDataKeys,
  },

  {
    type: "processEquipment",
    label: "Process Equipment",
    description:
      "Display live measurements in the context of a boiler, sterilizer, tank, pump, valve, or other industrial equipment.",
    icon: Factory,
    supportedData: allDataKeys,
  },

  {
    type: "processView",
    label: "Process View",
    description:
      "Embed the saved Plant Simulator topology directly inside the dashboard and visualize connected equipment with live or simulated process data.",
    icon: Workflow,
    supportedData: [],
  },

  {
    type: "logs",
    label: "Events & Alarms",
    description:
      "Display an event log, alarm summary, or active alarm list from system and process events.",
    icon: BellRing,
    supportedData: [],
  },

  {
    type: "image",
    label: "Interactive Process Image",
    description:
      "Overlay live values, status, gauges, levels, bars, trends, and sensor markers on a process image.",
    icon: ImageIcon,
    supportedData: [],
  },
];

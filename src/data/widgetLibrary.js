import {
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Hash,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";

export const widgetLibrary = [
  {
    type: "gauge",
    label: "Gauge",
    icon: Activity,
    supportedData: ["steamPressure", "waterDrumLevel", "vgPressure"],
  },
  {
    type: "line",
    label: "Line",
    icon: TrendingUp,
    supportedData: ["steamPressure", "steamOutletTemp","steamFlowrate", "waterFlowrate"],
  },

  {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    supportedData: [],
  },
  {
    type: "bar",
    label: "Bar",
    icon: BarChart3,
    supportedData: ["steamPressure", "steamFlowrate", "waterFlowrate"],
  },
  {
    type: "bignumber",
    label: "Number",
    icon: Hash,
    supportedData: ["waterDrumLevel"],
  },
  {
    type: "alarm",
    label: "Alarm",
    icon: AlertTriangle,
    supportedData: ["furnaceDraft"],
  },
  {
    type: "pie",
    label: "Pie",
    icon: PieChart,
    supportedData: ["steamFlowrate", "waterFlowrate"],
  },
];

/**
 *   
  ch1: "steamPressure",
  ch2: "steamFlowrate",
  ch3: "steamOutletTemp",
  ch4: "inletDraft",
  ch5: "outletDraft",
  ch6: "furnaceDraft",

  ch8: "waterInletTemp",
  ch9: "waterFlowrate",
  ch10: "waterDrumLevel",
  ch11: "vgPressure",
  ch12: "vgInletTemp",
  ch13: "vgOutletTemp",
 */
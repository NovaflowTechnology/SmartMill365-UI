import {
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Hash,
  AlertTriangle,
  Image as ImageIcon,
  Gauge,
  ChartArea,
  Radio,
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
    icon: Activity,
    supportedData: allDataKeys,
  },
  {
    type: "linearGauge",
    label: "Linear Gauge",
    icon: Gauge,
    supportedData: allDataKeys,
  },
  {
    type: "line",
    label: "Line",
    icon: TrendingUp,
    supportedData: allDataKeys,
  },
  {
    type: "area",
    label: "Area",
    icon: ChartArea,
    supportedData: allDataKeys,
  },
  {
    type: "bar",
    label: "Bar",
    icon: BarChart3,
    supportedData: allDataKeys,
  },
  {
    type: "bignumber",
    label: "Number",
    icon: Hash,
    supportedData: allDataKeys,
  },

  {
    type: "status",
    label: "Data Status",
    icon: Radio,
    supportedData: [],
  },

  {
    type: "pie",
    label: "Pie",
    icon: PieChart,
    supportedData: allDataKeys,
  },
  
  {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    supportedData: [],
  },
];

/**
 * CHANNEL MAPPING from Novaflow (Veli Important)
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
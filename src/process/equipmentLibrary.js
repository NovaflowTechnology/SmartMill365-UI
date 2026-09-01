export const PROCESS_MEDIA = {
  steam: {
    label: "Steam",
    color: "#58D7FF",
    unit: "t/h",
  },
  water: {
    label: "Water",
    color: "#4A91D0",
    unit: "m³/h",
  },
  fruit: {
    label: "Fruit / Biomass",
    color: "#FF9A62",
    unit: "t/h",
  },
  crudeOil: {
    label: "Press Liquor",
    color: "#D97706",
    unit: "t/h",
  },
  oil: {
    label: "Palm Oil",
    color: "#D8A444",
    unit: "t/h",
  },
  sludge: {
    label: "Sludge",
    color: "#9A7464",
    unit: "t/h",
  },
  air: {
    label: "Air",
    color: "#94A3B8",
    unit: "m³/h",
  },
  electricity: {
    label: "Electrical Power",
    color: "#FFD66B",
    unit: "kW",
  },
};

const metric = (
  id,
  label,
  unit = "",
  min = 0,
  max = 100,
  kind = "number"
) => ({
  id,
  label,
  unit,
  min,
  max,
  kind,
});

export const EQUIPMENT_LIBRARY = [
  {
    type: "palm-fruit-bunch",
    label: "Fresh Fruit Bunch",
    category: "Material",
    description: "Incoming fresh fruit bunch material.",
    metrics: [],
  },
  {
    type: "sterilizer",
    label: "Sterilizer",
    category: "Palm Oil Process",
    description: "Steam sterilization vessel for fresh fruit bunches.",
    metrics: [
      metric("pressure", "Pressure", "bar", 0, 10),
      metric("temperature", "Temperature", "°C", 0, 160),
      metric("steamFlow", "Steam Flow", "t/h", 0, 80),
      metric("inletValve", "Inlet Valve", "", 0, 1, "status"),
      metric("auto", "Auto Mode", "", 0, 1, "status"),
    ],
  },
  {
    type: "thresher",
    label: "Thresher",
    category: "Palm Oil Process",
    description: "Rotating drum that separates fruitlets from bunch stalks.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Drum Speed", "rpm", 0, 1200),
      metric("motorAmp", "Motor Current", "A", 0, 200),
      metric("throughput", "Throughput", "t/h", 0, 100),
    ],
  },
  {
    type: "digester",
    label: "Digester",
    category: "Palm Oil Process",
    description: "Conditions and mixes fruit mash before pressing.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Agitator Speed", "rpm", 0, 1200),
      metric("temperature", "Temperature", "°C", 0, 120),
      metric("motorAmp", "Motor Current", "A", 0, 200),
    ],
  },
  {
    type: "screw-press",
    label: "Screw Press",
    category: "Palm Oil Process",
    description: "Extracts crude palm oil from digested fruit mash.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("power", "Motor Power", "kW", 0, 300),
      metric("motorAmp", "Motor Current", "A", 0, 300),
      metric("pressure", "Press Pressure", "bar", 0, 100),
      metric("flow", "Oil Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "clarifier",
    label: "Clarification Tank",
    category: "Palm Oil Process",
    description: "Separates oil from sludge and water.",
    metrics: [
      metric("oilLevel", "Oil Level", "%", 0, 100),
      metric("sludgeLevel", "Sludge Level", "%", 0, 100),
      metric("temperature", "Temperature", "°C", 0, 120),
      metric("flow", "Oil Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "oil-separator",
    label: "Disc Separator",
    category: "Palm Oil Process",
    description: "High-speed centrifugal purification of palm oil.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Separator Speed", "rpm", 0, 8000),
      metric("motorAmp", "Motor Current", "A", 0, 200),
      metric("flow", "Oil Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "decanter",
    label: "Decanter Centrifuge",
    category: "Palm Oil Process",
    description: "Separates oil, water and solids using centrifugal force.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Bowl Speed", "rpm", 0, 5000),
      metric("motorAmp", "Motor Current", "A", 0, 250),
      metric("flow", "Feed Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "filter-press",
    label: "Oil Filter Press",
    category: "Palm Oil Process",
    description: "Final filtration stage for clarified palm oil.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("pressure", "Filter Pressure", "bar", 0, 20),
      metric("flow", "Oil Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "palm-oil",
    label: "Palm Oil Output",
    category: "Material",
    description: "Filtered palm oil product.",
    metrics: [],
  },

  // Utilities and supporting equipment
  {
    type: "boiler",
    label: "Boiler",
    category: "Utilities",
    description: "Steam generation for process heating.",
    metrics: [
      metric("pressure", "Steam Pressure", "bar", 0, 50),
      metric("steamFlow", "Steam Flow", "t/h", 0, 80),
      metric("waterLevel", "Water Level", "%", 0, 100),
      metric("temperature", "Temperature", "°C", 0, 400),
    ],
  },
  {
    type: "process-tank",
    label: "Process Tank",
    category: "Storage",
    description: "General-purpose process storage tank.",
    metrics: [
      metric("level", "Level", "%", 0, 100),
      metric("temperature", "Temperature", "°C", 0, 150),
      metric("pressure", "Pressure", "bar", 0, 20),
    ],
  },
  {
    type: "pump",
    label: "Pump",
    category: "Utilities",
    description: "Transfers process liquid between equipment.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("flow", "Flow", "m³/h", 0, 500),
      metric("speed", "Speed", "rpm", 0, 3600),
      metric("motorAmp", "Motor Current", "A", 0, 200),
    ],
  },
  {
    type: "valve",
    label: "Valve",
    category: "Utilities",
    description: "Controls process flow.",
    metrics: [
      metric("open", "Valve Open", "", 0, 1, "status"),
      metric("position", "Position", "%", 0, 100),
    ],
  },
  {
    type: "heat-exchanger",
    label: "Heat Exchanger",
    category: "Utilities",
    description: "Transfers heat between process streams.",
    metrics: [
      metric("hotTemperature", "Hot Temperature", "°C", 0, 250),
      metric("coldTemperature", "Cold Temperature", "°C", 0, 250),
      metric("flow", "Flow", "m³/h", 0, 500),
    ],
  },
  {
    type: "vacuum-dryer",
    label: "Vacuum Dryer",
    category: "Palm Oil Process",
    description: "Removes residual moisture from purified oil.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("vacuum", "Vacuum", "bar", 0, 1),
      metric("temperature", "Temperature", "°C", 0, 150),
      metric("flow", "Oil Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "turbine",
    label: "Steam Turbine",
    category: "Utilities",
    description: "Converts steam energy into rotating mechanical power.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Rotor Speed", "rpm", 0, 6000),
      metric("power", "Power", "kW", 0, 5000),
      metric("steamFlow", "Steam Flow", "t/h", 0, 100),
    ],
  },
  {
    type: "genset",
    label: "Generator Set",
    category: "Utilities",
    description: "Electrical generator for plant power.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("power", "Power", "kW", 0, 5000),
      metric("current", "Current", "A", 0, 5000),
      metric("voltage", "Voltage", "V", 0, 1000),
    ],
  },
  {
    type: "conveyor",
    label: "Process Conveyor",
    category: "Material Handling",
    description: "Moves fruit or biomass between process stages.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Belt Speed", "m/s", 0, 5),
      metric("motorAmp", "Motor Current", "A", 0, 200),
      metric("throughput", "Throughput", "t/h", 0, 100),
    ],
  },
  {
    type: "junction",
    label: "Pipeline Junction",
    category: "Utilities",
    description: "Splits or combines process flow.",
    metrics: [
      metric("flow", "Flow", "t/h", 0, 200),
    ],
  },
];

export const EQUIPMENT_BY_TYPE = Object.fromEntries(
  EQUIPMENT_LIBRARY.map((item) => [item.type, item])
);

export const EQUIPMENT_CATEGORIES = [
  "All",
  ...Array.from(
    new Set(EQUIPMENT_LIBRARY.map((item) => item.category))
  ),
];

export const makeEquipmentNode = (
  type,
  x,
  y,
  sequence = 1
) => {
  const definition =
    EQUIPMENT_BY_TYPE[type] ||
    EQUIPMENT_LIBRARY[0];

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: definition.type,
    label:
      sequence > 1
        ? `${definition.label} ${sequence}`
        : definition.label,
    x,
    y,
    // Node dimensions are persisted and can be resized in Plant Simulator.
    width: 150,
    height: 172,

    labelOffset: {
      x: 0,
      y: 0,
    },
    deviceId: "",

    // Default metric definitions come from EQUIPMENT_LIBRARY.
    // bindings stores the actual mapped dashboard data key for
    // both default metrics and per-node custom metrics.
    bindings: {},

    // Custom fields belong only to this node, allowing the same
    // equipment icon to be reused for different measurements.
    customMetrics: [],

    // Default to the first two library metrics on the compact card.
    // Users can change this per equipment item in the Inspector.
    displayMetricIds: (definition.metrics || [])
      .slice(0, 2)
      .map((metricDefinition) => metricDefinition.id),

    thresholds: {},
    dataDisplayPosition:
      definition.metrics.length === 0
        ? "hidden"
        : "bottom",
  };
};

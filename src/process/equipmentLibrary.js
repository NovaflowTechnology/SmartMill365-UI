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


export const ASSEMBLY_COMPONENTS = [
  {
    type: "pipe-straight",
    label: "Straight Pipe",
    category: "Pipe & Fittings",
    libraryGroup: "assembly",
    description: "Straight modular pipe section with flanged ends.",
    defaultWidth: 170,
    defaultHeight: 72,
    minWidth: 90,
    minHeight: 46,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-elbow",
    label: "90° Pipe Elbow",
    category: "Pipe & Fittings",
    libraryGroup: "assembly",
    description: "Quarter-turn pipe elbow for manual process routing.",
    defaultWidth: 132,
    defaultHeight: 112,
    minWidth: 74,
    minHeight: 70,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-tee",
    label: "Pipe Tee",
    category: "Pipe & Fittings",
    libraryGroup: "assembly",
    description: "Three-way tee fitting for splitting or combining flow.",
    defaultWidth: 150,
    defaultHeight: 112,
    minWidth: 82,
    minHeight: 70,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-cross",
    label: "Pipe Cross",
    category: "Pipe & Fittings",
    libraryGroup: "assembly",
    description: "Four-way cross fitting for process pipe layouts.",
    defaultWidth: 126,
    defaultHeight: 126,
    minWidth: 72,
    minHeight: 72,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-y-branch",
    label: "Y Branch",
    category: "Pipe & Fittings",
    libraryGroup: "assembly",
    description: "Angled three-way branch fitting.",
    defaultWidth: 145,
    defaultHeight: 112,
    minWidth: 82,
    minHeight: 70,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-gate-valve",
    label: "Gate Valve",
    category: "Pipe Controls",
    libraryGroup: "assembly",
    description: "Inline gate valve visual for process piping.",
    defaultWidth: 165,
    defaultHeight: 105,
    minWidth: 95,
    minHeight: 68,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-handwheel-valve",
    label: "Handwheel Valve",
    category: "Pipe Controls",
    libraryGroup: "assembly",
    description: "Inline handwheel valve visual.",
    defaultWidth: 165,
    defaultHeight: 112,
    minWidth: 95,
    minHeight: 72,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-lever-valve",
    label: "Lever Valve",
    category: "Pipe Controls",
    libraryGroup: "assembly",
    description: "Inline lever-operated valve visual.",
    defaultWidth: 175,
    defaultHeight: 105,
    minWidth: 100,
    minHeight: 68,
    medium: "steam",
    metrics: [],
  },
  {
    type: "pipe-pressure-gauge",
    label: "Pressure Gauge",
    category: "Pipe Controls",
    libraryGroup: "assembly",
    description: "Inline pressure gauge mounted above the pipe.",
    defaultWidth: 165,
    defaultHeight: 120,
    minWidth: 95,
    minHeight: 78,
    medium: "steam",
    metrics: [],
  },
  {
    type: "conveyor-straight-module",
    label: "Straight Conveyor",
    category: "Conveyor Parts",
    libraryGroup: "assembly",
    description: "Modular roller/belt conveyor with visible product packages.",
    defaultWidth: 190,
    defaultHeight: 105,
    minWidth: 110,
    minHeight: 68,
    medium: "fruit",
    metrics: [],
  },
  {
    type: "conveyor-curve-module",
    label: "90° Conveyor Curve",
    category: "Conveyor Parts",
    libraryGroup: "assembly",
    description: "Quarter-turn conveyor section for manual layout assembly.",
    defaultWidth: 148,
    defaultHeight: 126,
    minWidth: 86,
    minHeight: 82,
    medium: "fruit",
    metrics: [],
  },
  {
    type: "conveyor-incline-module",
    label: "Inclined Conveyor",
    category: "Conveyor Parts",
    libraryGroup: "assembly",
    description: "Inclined conveyor module with supports and a visible package.",
    defaultWidth: 180,
    defaultHeight: 120,
    minWidth: 104,
    minHeight: 78,
    medium: "fruit",
    metrics: [],
  },
];

export const ASSEMBLY_COMPONENT_TYPES = new Set(
  ASSEMBLY_COMPONENTS.map((item) => item.type)
);

export const isAssemblyComponentType = (type) =>
  ASSEMBLY_COMPONENT_TYPES.has(type);

export const EQUIPMENT_LIBRARY = [
  ...ASSEMBLY_COMPONENTS,
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

  {
    type: "fruit-cage",
    label: "Fruit Cage",
    category: "Material Handling",
    description: "Receives and transfers fresh fruit bunches to sterilization.",
    metrics: [
      metric("load", "Load", "%", 0, 100),
      metric("count", "Batch Count", "batch", 0, 20),
      metric("position", "Position", "%", 0, 100),
    ],
  },
  {
    type: "stripper",
    label: "Stripper",
    category: "Palm Oil Process",
    description: "Separates sterilized fruitlets from empty fruit bunches.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("throughput", "Throughput", "t/h", 0, 100),
      metric("motorAmp", "Motor Current", "A", 0, 180),
      metric("speed", "Rotor Speed", "rpm", 0, 900),
    ],
  },
  {
    type: "vibrating-screen",
    label: "Vibrating Screen",
    category: "Palm Oil Process",
    description: "Screens press liquor and removes coarse solids.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Vibration Speed", "rpm", 0, 1500),
      metric("throughput", "Throughput", "t/h", 0, 100),
      metric("motorAmp", "Motor Current", "A", 0, 120),
    ],
  },
  {
    type: "nut-fibre-separator",
    label: "Nut & Fibre Separator",
    category: "Palm Oil Process",
    description: "Separates nut stream from fibre after pressing.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("airFlow", "Air Flow", "m³/h", 0, 5000),
      metric("throughput", "Throughput", "t/h", 0, 60),
      metric("motorAmp", "Motor Current", "A", 0, 120),
    ],
  },
  {
    type: "nut-cracker",
    label: "Nut Cracker",
    category: "Palm Oil Process",
    description: "Cracks nuts to release palm kernels.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Cracker Speed", "rpm", 0, 1800),
      metric("throughput", "Throughput", "t/h", 0, 60),
      metric("motorAmp", "Motor Current", "A", 0, 150),
    ],
  },
  {
    type: "fibre-cyclone",
    label: "Fibre Cyclone",
    category: "Palm Oil Process",
    description: "Collects and separates fibre using cyclonic action.",
    metrics: [
      metric("pressure", "Cyclone Pressure", "kPa", 0, 80),
      metric("airFlow", "Air Flow", "m³/h", 0, 5000),
      metric("temperature", "Temperature", "°C", 0, 150),
    ],
  },
  {
    type: "shell-cyclone",
    label: "Shell Cyclone",
    category: "Palm Oil Process",
    description: "Separates shell particles from the kernel stream.",
    metrics: [
      metric("pressure", "Cyclone Pressure", "kPa", 0, 80),
      metric("airFlow", "Air Flow", "m³/h", 0, 5000),
      metric("throughput", "Throughput", "t/h", 0, 50),
    ],
  },
  {
    type: "winnower",
    label: "Winnower",
    category: "Palm Oil Process",
    description: "Air separator for kernel and shell separation.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("airFlow", "Air Flow", "m³/h", 0, 5000),
      metric("throughput", "Throughput", "t/h", 0, 50),
    ],
  },
  {
    type: "claybath-separator",
    label: "Claybath Separator",
    category: "Palm Oil Process",
    description: "Separates kernels from shells based on density.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("density", "Bath Density", "kg/m³", 900, 1300),
      metric("throughput", "Throughput", "t/h", 0, 50),
      metric("level", "Bath Level", "%", 0, 100),
    ],
  },
  {
    type: "oil-purifier",
    label: "Oil Purifier",
    category: "Palm Oil Process",
    description: "Polishes crude oil before drying or storage.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("speed", "Purifier Speed", "rpm", 0, 8000),
      metric("motorAmp", "Motor Current", "A", 0, 150),
      metric("flow", "Oil Flow", "t/h", 0, 80),
    ],
  },
  {
    type: "tray-dryer",
    label: "Tray Dryer",
    category: "Palm Oil Process",
    description: "Dries palm kernels before storage.",
    metrics: [
      metric("running", "Running", "", 0, 1, "status"),
      metric("temperature", "Drying Temperature", "°C", 0, 140),
      metric("moisture", "Kernel Moisture", "%", 0, 100),
      metric("throughput", "Throughput", "t/h", 0, 40),
    ],
  },
  {
    type: "kernel-silo",
    label: "Kernel Silo",
    category: "Storage",
    description: "Stores dried palm kernels before dispatch.",
    metrics: [
      metric("level", "Level", "%", 0, 100),
      metric("temperature", "Temperature", "°C", 0, 80),
      metric("inventory", "Inventory", "t", 0, 500),
    ],
  },
  {
    type: "crude-oil-tank",
    label: "Crude Palm Oil Tank",
    category: "Storage",
    description: "Intermediate storage tank for crude palm oil.",
    metrics: [
      metric("level", "Level", "%", 0, 100),
      metric("temperature", "Temperature", "°C", 0, 100),
      metric("flow", "Transfer Flow", "t/h", 0, 80),
    ],
  },
  {
    type: "sludge-tank",
    label: "Sludge Tank",
    category: "Storage",
    description: "Stores sludge before further treatment.",
    metrics: [
      metric("level", "Level", "%", 0, 100),
      metric("temperature", "Temperature", "°C", 0, 100),
      metric("flow", "Discharge Flow", "t/h", 0, 60),
    ],
  },
  {
    type: "empty-bunch-hopper",
    label: "Empty Bunch Hopper",
    category: "Material",
    description: "Collection point for empty fruit bunches.",
    metrics: [
      metric("level", "Level", "%", 0, 100),
      metric("throughput", "Throughput", "t/h", 0, 80),
    ],
  },
  {
    type: "kernel",
    label: "Palm Kernel",
    category: "Material",
    description: "Kernel material stream or output.",
    metrics: [],
  },
  {
    type: "shell",
    label: "Shell",
    category: "Material",
    description: "Shell by-product stream.",
    metrics: [],
  },
  {
    type: "fibre",
    label: "Fibre",
    category: "Material",
    description: "Fibre by-product stream.",
    metrics: [],
  },
  {
    type: "press-liquor",
    label: "Press Liquor",
    category: "Material",
    description: "Mixed oil, water and solids from the screw press.",
    metrics: [],
  },
  {
    type: "condensate",
    label: "Condensate",
    category: "Material",
    description: "Recovered condensate stream.",
    metrics: [],
  },
  {
    type: "custom-equipment",
    label: "Custom Image Equipment",
    category: "Custom",
    description: "Upload your own equipment picture and place it on the canvas.",
    metrics: [
      metric("value", "Value", "", 0, 100),
    ],
  },

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
    new Set(EQUIPMENT_LIBRARY.filter((item) => item.libraryGroup !== "assembly").map((item) => item.category))
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
    width: Number(definition.defaultWidth || 150),
    height: Number(definition.defaultHeight || 172),

    rotation: 0,
    medium: definition.medium || "steam",
    showLabel: definition.libraryGroup === "assembly" ? false : true,

    labelOffset: {
      x: 0,
      y: 0,
    },
    deviceId: "",

    bindings: {},

    customMetrics: [],
    customImageSrc: "",
    customImageName: "",

    displayMetricIds: (definition.metrics || [])
      .slice(0, 2)
      .map((metricDefinition) => metricDefinition.id),

    thresholds: {},
    dataDisplayPosition:
      definition.libraryGroup === "assembly" || definition.metrics.length === 0
        ? "hidden"
        : "bottom",
  };
};

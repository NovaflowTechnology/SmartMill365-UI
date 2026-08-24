export const PROCESS_MEDIA = {
  steam: {
    label: "Steam",
    color: "#FF6F88",
  },
  water: {
    label: "Water",
    color: "#58D7FF",
  },
  oil: {
    label: "Oil",
    color: "#FFD66B",
  },
  sludge: {
    label: "Sludge",
    color: "#A86BDF",
  },
  material: {
    label: "Material",
    color: "#FF9C63",
  },
  electricity: {
    label: "Electricity",
    color: "#7D75E7",
  },
};

const metric = (
  id,
  label,
  unit,
  min,
  max,
  keywords = [],
  kind = "number"
) => ({ id, label, unit, min, max, keywords, kind });

export const EQUIPMENT_LIBRARY = [
  {
    type: "boiler",
    label: "Boiler",
    category: "Steam & Utility",
    description: "Steam generation and boiler-water monitoring.",
    metrics: [
      metric("pressure", "Steam Pressure", "psi", 0, 400, ["steam_pressure", "steamp_bar", "pressure", "PBLR"]),
      metric("steamFlow", "Steam Flow", "t/h", 0, 80, ["steamFlow", "steam_flowrate"]),
      metric("steamTemp", "Steam Outlet Temp", "°C", 0, 350, ["SteamOutletTemp", "steam_outlet_temp"]),
      metric("furnaceDraft", "Furnace Draft", "Pa", -20, 10, ["furnaceDraft", "furnace_draft"]),
      metric("waterLevel", "Water Drum Level", "%", 0, 100, ["waterLevel", "water_drum_level"]),
    ],
  },
  {
    type: "sterilizer",
    label: "Sterilizer",
    category: "Sterilization",
    description: "Pressure vessel with process step and interlock signals.",
    metrics: [
      metric("pressure", "Pressure", "psi", 0, 100, ["PSTR_psi", "PSTR_bar", "pressure"]),
      metric("temperature", "Temperature", "°C", 20, 160, ["PSTR_temp", "temperature"]),
      metric("step", "Current Step", "", 0, 12, ["PSTR_current_step", "step"], "integer"),
      metric("auto", "Auto / Manual", "", 0, 1, ["PSTR_aom_status", "PSTR_SwitchAuto"], "status"),
      metric("inletValve", "Inlet Valve", "", 0, 1, ["PSTR_inletvalve1"], "status"),
    ],
  },
  {
    type: "oil-tank",
    label: "Process Tank",
    category: "Oil Room",
    description: "Crude-oil, clarifier, sludge or pure-oil storage tank.",
    metrics: [
      metric("level", "Level", "%", 0, 100, ["level", "Tank", "tank"]),
      metric("temperature", "Temperature", "°C", 20, 110, ["PSTK_temp", "POilRoom_temp", "temperature"]),
      metric("pressure", "Pressure", "psi", 0, 80, ["PSTK_psi", "PSTK_bar", "pressure"]),
    ],
  },
  {
    type: "pump",
    label: "Pump",
    category: "Flow Equipment",
    description: "Generic process-water or oil transfer pump.",
    metrics: [
      metric("running", "Running", "", 0, 1, ["motor_run", "status", "run"], "status"),
      metric("flow", "Flow", "m³/h", 0, 100, ["flowrate", "flow"]),
    ],
  },
  {
    type: "valve",
    label: "Valve",
    category: "Flow Equipment",
    description: "On/off process or steam valve.",
    metrics: [metric("open", "Valve Open", "", 0, 1, ["valve", "status"], "status")],
  },
  {
    type: "heat-exchanger",
    label: "Heat Exchanger",
    category: "Steam & Utility",
    description: "Generic heat-exchange stage.",
    metrics: [
      metric("inletTemp", "Inlet Temp", "°C", 20, 180, ["inlet", "temp"]),
      metric("outletTemp", "Outlet Temp", "°C", 20, 180, ["outlet", "temp"]),
    ],
  },
  {
    type: "digester",
    label: "Digester",
    category: "Pressing",
    description: "Digester station equipment.",
    metrics: [
      metric("motorAmp", "Motor Current", "A", 0, 200, ["PDIG_motor_amp", "PDIG_ma_A", "dga"]),
      metric("runHours", "Run Hours", "h", 0, 10000, ["PDIG_hour_run", "PDIG_HourRun", "PDIG_rh_hr"]),
    ],
  },
  {
    type: "screw-press",
    label: "Screw Press",
    category: "Pressing",
    description: "Pressing-stage equipment for material extraction.",
    metrics: [
      metric("motorAmp", "Motor Current", "A", 0, 200, ["spa", "press", "motor_amp"]),
      metric("runHours", "Run Hours", "h", 0, 10000, ["sp1hr", "sp2hr", "sp3hr", "hour_run"]),
    ],
  },
  {
    type: "clarifier",
    label: "Clarifier",
    category: "Oil Room",
    description: "Clarification / settling stage.",
    metrics: [
      metric("temperature", "Temperature", "°C", 20, 110, ["clarifier", "temperature"]),
      metric("level", "Level", "%", 0, 100, ["clarifier", "Tank"]),
    ],
  },
  {
    type: "oil-separator",
    label: "Oil Separator",
    category: "Oil Room",
    description: "Oil separator with run, trip and flow signals.",
    metrics: [
      metric("flow", "Flowrate", "m³/h", 0, 100, ["POilSeperator_flowrate", "flowrate"]),
      metric("running", "Motor Running", "", 0, 1, ["POilSeperator_motor_run"], "status"),
      metric("trip", "Motor Trip", "", 0, 1, ["POilSeperator_motor_trip"], "status"),
      metric("runHours", "Run Hours", "h", 0, 10000, ["POilSeperator_motor_runhr"]),
    ],
  },
  {
    type: "decanter",
    label: "Decanter",
    category: "Oil Room",
    description: "Decanter with flow and motor-state data.",
    metrics: [
      metric("flow", "Flowrate", "m³/h", 0, 100, ["PDecanter_flowrate"]),
      metric("running", "Motor Running", "", 0, 1, ["PDecanter_motor_run"], "status"),
      metric("runHours", "Run Hours", "h", 0, 10000, ["PDecanter_motor_runhr"]),
    ],
  },
  {
    type: "vacuum-dryer",
    label: "Vacuum Dryer",
    category: "Oil Room",
    description: "Vacuum drying stage for oil-room processing.",
    metrics: [
      metric("temperature", "Temperature", "°C", 20, 120, ["POilRoom_vacuumdryer", "temperature"]),
      metric("pressure", "Vacuum / Pressure", "psi", -15, 30, ["pressure", "vacuumdryer"]),
    ],
  },
  {
    type: "turbine",
    label: "Turbine",
    category: "Power",
    description: "Turbine electrical and energy-monitoring signals.",
    metrics: [
      metric("power", "Power", "kW", 0, 3000, ["power_total", "PT", "ETRB_turbine"]),
      metric("frequency", "Frequency", "Hz", 45, 55, ["frequency", "FRQ"]),
      metric("voltage", "Voltage", "V", 0, 500, ["voltage", "V12", "VA"]),
      metric("current", "Current", "A", 0, 3000, ["current_avg", "current", "ALA"]),
    ],
  },
  {
    type: "genset",
    label: "Genset",
    category: "Power",
    description: "Generator electrical-monitoring signals.",
    metrics: [
      metric("power", "Power", "kW", 0, 3000, ["power_total", "PT", "ETRB_genset", "EDPM_GEN"]),
      metric("frequency", "Frequency", "Hz", 45, 55, ["frequency", "FRQ"]),
      metric("voltage", "Voltage", "V", 0, 500, ["voltage", "V12", "VA"]),
      metric("powerFactor", "Power Factor", "", 0, 1, ["power_factor_total", "PFT"]),
    ],
  },
  {
    type: "conveyor",
    label: "Conveyor",
    category: "Material Handling",
    description: "Generic FFB/EFB material conveyor.",
    metrics: [
      metric("running", "Running", "", 0, 1, ["PEFB_status", "PEFB_motor_state"], "status"),
      metric("motorAmp", "Motor Current", "A", 0, 200, ["PEFB_ma_A"]),
      metric("runHours", "Run Hours", "h", 0, 10000, ["PEFB_hour_run", "PEFB_rh_hr"]),
    ],
  },
  {
    type: "junction",
    label: "Pipeline Junction",
    category: "Flow Equipment",
    description: "Branch or merge pipelines without adding equipment.",
    metrics: [],
  },
];

export const EQUIPMENT_BY_TYPE = Object.fromEntries(
  EQUIPMENT_LIBRARY.map((item) => [item.type, item])
);

export const EQUIPMENT_CATEGORIES = [
  "All",
  ...Array.from(new Set(EQUIPMENT_LIBRARY.map((item) => item.category))),
];

export const makeEquipmentNode = (type, x, y, index = 1) => {
  const definition = EQUIPMENT_BY_TYPE[type] || EQUIPMENT_LIBRARY[0];

  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label: `${definition.label} ${index}`,
    x,
    y,
    bindings: {},
  };
};

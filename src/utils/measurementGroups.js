// src/utils/measurementGroups.js
//
// Grouping verified against:
// "NVFT_New SmartMill 365 Data Connection"
//
// IMPORTANT:
// - Raw InfluxDB measurement names are NEVER changed.
// - Device Type is UI-only and derived from these rules.
// - The order matters for special/legacy names whose prefix does not match
//   the equipment description in the SmartMill document.

export const MEASUREMENT_GROUPS = [
  {
    key: "sterilizer",
    label: "Sterilizer",
    prefixes: ["PSTR_"],
  },

  {
    key: "oil-room",
    label: "Oil Room",
    prefixes: [
      // SmartMill document describes PSTK_* as oil-room equipment
      // temperature / pressure measurements.
      "PSTK_",
      "POilRoom_",
      "POil_Room_",
    ],
  },

  {
    key: "oil-separator",
    label: "Oil Separator",
    prefixes: [
      "POilSeperator_",
      "EOilSeperator_",

      // Despite the name, the SmartMill document describes
      // EOilRoom_motor_amp as oil-separator equipment motor-amp.
      "EOilRoom_",
    ],
  },

  {
    key: "efb-station",
    label: "EFB Station",
    prefixes: ["PEFB_"],
  },

  {
    key: "decanter",
    label: "Decanter",
    prefixes: [
      "PDecanter_",
      "EDecanter_",
    ],
  },

  {
    key: "digester-station",
    label: "Digester Station",
    prefixes: ["PDIG_"],
  },

  {
    key: "boiler",
    label: "Boiler",
    exact: ["PBLR"],
    prefixes: ["PBLR_"],
  },

  {
    key: "turbine",
    label: "Turbine",
    exact: [
      // The SmartMill document describes ETRB_genset as
      // "Turbine energy monitoring parameters".
      "ETRB_genset",

      // Turbine DPM parameters.
      "EDPM_TRB",
    ],
  },

  {
    key: "genset",
    label: "Genset",
    exact: [
      // The SmartMill document describes ETRB_turbine as
      // "Genset energy monitoring parameters".
      "ETRB_turbine",

      "EDPM_GEN",
      "EDPM_GEN1",
      "EDPM_GEN2",
    ],
  },

  {
    key: "b1-dpm",
    label: "B1 DPM",
    exact: ["EDPM_B1"],
  },
];

const normaliseMeasurement = (value = "") =>
  String(value || "").trim();

export const getMeasurementGroup = (measurement) => {
  const raw = normaliseMeasurement(measurement);
  const lower = raw.toLowerCase();

  const matchedGroup = MEASUREMENT_GROUPS.find((group) => {
    const matchesExact = (group.exact || []).some(
      (value) => String(value).toLowerCase() === lower
    );

    const matchesPrefix = (group.prefixes || []).some(
      (prefix) =>
        lower.startsWith(
          String(prefix).toLowerCase()
        )
    );

    return matchesExact || matchesPrefix;
  });

  return (
    matchedGroup || {
      key: "other",
      label: "Other",
      prefixes: [],
      exact: [],
    }
  );
};

export const formatMeasurementLabel = (measurement) => {
  const raw = normaliseMeasurement(measurement);

  if (!raw) return "";

  const group = getMeasurementGroup(raw);

  // If the rule matched the exact measurement name, show the raw name.
  // This is useful for compact names such as PBLR / EDPM_TRB.
  if (
    (group.exact || []).some(
      (value) =>
        String(value).toLowerCase() === raw.toLowerCase()
    )
  ) {
    return raw;
  }

  let display = raw;

  const matchingPrefix = (group.prefixes || []).find(
    (prefix) =>
      raw.toLowerCase().startsWith(
        String(prefix).toLowerCase()
      )
  );

  if (matchingPrefix) {
    display = raw.slice(matchingPrefix.length);
  }

  return display
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
};

export const groupMeasurements = (measurements = []) => {
  const uniqueMeasurements = [
    ...new Set(
      (Array.isArray(measurements) ? measurements : [])
        .filter(Boolean)
        .map((measurement) =>
          normaliseMeasurement(measurement)
        )
    ),
  ];

  const result = [];

  MEASUREMENT_GROUPS.forEach((definition) => {
    const matching = uniqueMeasurements
      .filter(
        (measurement) =>
          getMeasurementGroup(measurement).key ===
          definition.key
      )
      .sort((a, b) =>
        formatMeasurementLabel(a).localeCompare(
          formatMeasurementLabel(b),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        )
      );

    if (matching.length > 0) {
      result.push({
        key: definition.key,
        label: definition.label,
        measurements: matching,
      });
    }
  });

  const other = uniqueMeasurements
    .filter(
      (measurement) =>
        getMeasurementGroup(measurement).key ===
        "other"
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  if (other.length > 0) {
    result.push({
      key: "other",
      label: "Other",
      measurements: other,
    });
  }

  return result;
};

export const filterMeasurementsByGroup = (
  measurements = [],
  groupKey = ""
) => {
  if (!groupKey) return [];

  return (
    groupMeasurements(measurements)
      .find((group) => group.key === groupKey)
      ?.measurements || []
  );
};

export const getMeasurementGroupOptions = (
  measurements = []
) =>
  groupMeasurements(measurements).map((group) => ({
    key: group.key,
    label: group.label,
    count: group.measurements.length,
  }));

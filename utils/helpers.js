// =====================================
// HELPERS
// =====================================
export const parseTemplateLayout = (template) => {
  if (!template) return null;

  try {
    return {
      ...template,
      layout:
        typeof template.layout === "string"
          ? JSON.parse(template.layout)
          : template.layout || {},
    };
  } catch (err) {
    console.error(
      "❌ Template layout parse error:",
      err
    );

    return {
      ...template,
      layout: {},
    };
  }
};

export const escapeFluxString = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

export const isValidFluxColumnName = (value) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(
    String(value || "")
  );

export const toNumericValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : value;
};


// Supports dashboard windows such as -30d, -6mo and -5y.
// The start time is calculated in JavaScript and sent to Flux as ISO time,
// avoiding duration parsing limitations for month/year periods.
// Tracks whether the latest Influx source timestamps are advancing between
// dashboard requests. This is process memory only and resets when Node restarts.
export const liveFetchMonitor = new Map();

export const parseRelativeHistoryWindow = (value) => {
  let requested = String(value || "15m").trim();

  // Template Designer stores values such as "15m" while older
  // dashboard code may still send "-15m". Accept both formats.
  if (!requested.startsWith("-")) {
    requested = `-${requested}`;
  }

  const match = requested.match(
    /^-(\d+)(m|h|d|w|mo|y)$/
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const end = new Date();
  const start = new Date(end);

  switch (unit) {
    case "m":
      start.setMinutes(start.getMinutes() - amount);
      break;
    case "h":
      start.setHours(start.getHours() - amount);
      break;
    case "d":
      start.setDate(start.getDate() - amount);
      break;
    case "w":
      start.setDate(start.getDate() - amount * 7);
      break;
    case "mo":
      start.setMonth(start.getMonth() - amount);
      break;
    case "y":
      start.setFullYear(start.getFullYear() - amount);
      break;
    default:
      return null;
  }

  return {
    requested,
    start,
    end,
    durationMs:
      end.getTime() - start.getTime(),
  };
};

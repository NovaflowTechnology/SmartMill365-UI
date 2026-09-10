const parseStoredTemplateLayout = (rawLayout) => {
  if (!rawLayout) return {};

  if (typeof rawLayout === "object") {
    return rawLayout;
  }

  try {
    return JSON.parse(rawLayout);
  } catch {
    return {};
  }
};

export const normalizeTemplateDeviceSource = (source) => {
  if (!source || typeof source !== "object") {
    return null;
  }

  const bucket = String(source.bucket || "").trim();
  const measurement = String(source.measurement || "").trim();
  const tagKey = String(source.tagKey || "id").trim() || "id";
  const tagValue = String(
    source.tagValue || source.deviceId || source.id || ""
  ).trim();

  if (!bucket || !measurement || !tagValue) {
    return null;
  }

  return {
    bucket,
    measurement,
    tagKey,
    tagValue,
  };
};

export const getTemplateDeviceSourceKey = (source) =>
  [source.bucket, source.measurement, source.tagKey, source.tagValue].join(
    "::"
  );

// Layouts can contain mappings in top-level dataSources and inside complex
// widgets. Recursing through the JSON prevents a nested mapping from bypassing
// the same organization permission check applied to ordinary widgets.
export const extractTemplateDeviceSources = (rawLayout) => {
  const layout = parseStoredTemplateLayout(rawLayout);
  const uniqueSources = new Map();
  const visited = new Set();

  const visit = (value) => {
    if (!value || typeof value !== "object" || visited.has(value)) {
      return;
    }

    visited.add(value);

    const source = normalizeTemplateDeviceSource(value);
    if (source) {
      uniqueSources.set(getTemplateDeviceSourceKey(source), source);
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    Object.values(value).forEach(visit);
  };

  visit(layout);

  return [...uniqueSources.values()];
};

export const findUnauthorizedTemplateDeviceSources = (
  rawLayout,
  allowedSources
) => {
  const allowedSourceKeys = new Set(
    (allowedSources || [])
      .map(normalizeTemplateDeviceSource)
      .filter(Boolean)
      .map(getTemplateDeviceSourceKey)
  );

  return extractTemplateDeviceSources(rawLayout).filter(
    (source) => !allowedSourceKeys.has(getTemplateDeviceSourceKey(source))
  );
};

export const getTemplateGridDimensions = (rawLayout) => {
  const layout = parseStoredTemplateLayout(rawLayout);

  return {
    rows: Number(layout.rows || 3),
    cols: Number(layout.cols || 4),
  };
};

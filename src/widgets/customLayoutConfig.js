export const CUSTOM_LAYOUT_CHILD_TYPES = [
  "bignumber",
  "gauge",
  "linearGauge",
  "line",
  "bar",
  "pie",
  "processEquipment",
  "text",
  "divider",
];

export const CUSTOM_LAYOUT_CHILD_LABELS = {
  bignumber: "Stat",
  gauge: "Gauge",
  linearGauge: "Linear Gauge",
  line: "Line / Area",
  bar: "Bar",
  pie: "Pie",
  processEquipment: "Equipment Panel",
  text: "Text",
  divider: "Divider",
};

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

const DEFAULT_PART_SIZE = {
  bignumber: { w: 190, h: 105 },
  gauge: { w: 230, h: 175 },
  linearGauge: { w: 260, h: 90 },
  line: { w: 320, h: 170 },
  bar: { w: 300, h: 175 },
  pie: { w: 250, h: 190 },
  processEquipment: { w: 260, h: 175 },
  text: { w: 220, h: 60 },
  divider: { w: 220, h: 22 },
};

const createPartId = () =>
  `custom-part-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const createCustomLayoutPart = (
  overrides = {}
) => {
  const type =
    CUSTOM_LAYOUT_CHILD_TYPES.includes(
      overrides?.type
    )
      ? overrides.type
      : "bignumber";

  const defaultSize =
    DEFAULT_PART_SIZE[type] ||
    DEFAULT_PART_SIZE.bignumber;

  return {
    id: createPartId(),
    type,
    label: "",
    text: "Text",
    dataKey: "",
    dataKeys: [],
    x: 40,
    y: 40,
    w: defaultSize.w,
    h: defaultSize.h,
    z: 1,
    rotation: 0,
    showFrame: false,
    backgroundColor: "",
    borderColor: "#D8E2EF",
    borderRadius: 12,
    opacity: 1,
    accentColor: "",
    textColor: "#0F172A",
    fontSize: 24,
    fontWeight: 700,
    textAlign: "left",
    dividerDirection: "horizontal",
    chartDisplay: {},
    bigNumberDisplay: {},
    gaugeDisplay: {},
    equipmentPanel: {
      equipmentType: "",
      label: "",
      displayMode: "panel",
      icon: "factory",
      measurements: [],
    },
    ...overrides,
  };
};

export const DEFAULT_CUSTOM_LAYOUT_CONFIG = {
  mode: "freeform",
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    snap: 10,
    snapEnabled: true,
    backgroundColor: "#FFFFFF",
    transparentBackground: false,
  },
  parts: [
    createCustomLayoutPart({
      x: 50,
      y: 50,
    }),
  ],
};

const clamp = (
  value,
  minimum,
  maximum
) =>
  Math.min(
    Math.max(
      Number(value) || 0,
      minimum
    ),
    maximum
  );

const normalizeDataKeys = (part) => {
  if (
    Array.isArray(part?.dataKeys) &&
    part.dataKeys.length
  ) {
    return [
      ...new Set(
        part.dataKeys.filter(Boolean)
      ),
    ];
  }

  return part?.dataKey
    ? [part.dataKey]
    : [];
};

const migrateLegacyParts = (
  config,
  canvasWidth,
  canvasHeight
) => {
  const rawParts =
    Array.isArray(config?.parts) &&
    config.parts.length
      ? config.parts
      : DEFAULT_CUSTOM_LAYOUT_CONFIG.parts;

  const hasFreeformCoordinates =
    rawParts.some(
      (part) =>
        Number.isFinite(
          Number(part?.x)
        ) &&
        Number.isFinite(
          Number(part?.y)
        ) &&
        Number.isFinite(
          Number(part?.w)
        ) &&
        Number.isFinite(
          Number(part?.h)
        )
    );

  if (hasFreeformCoordinates) {
    return rawParts;
  }

  const columns = clamp(
    config?.columns || 2,
    1,
    2
  );

  const gap = clamp(
    config?.gap || 12,
    0,
    40
  );

  const rows = Math.max(
    1,
    Math.ceil(
      rawParts.length / columns
    )
  );

  const cellWidth =
    (
      canvasWidth -
      gap * (columns + 1)
    ) /
    columns;

  const cellHeight =
    (
      canvasHeight -
      gap * (rows + 1)
    ) /
    rows;

  return rawParts.map(
    (part, index) => {
      const row = Math.floor(
        index / columns
      );
      const column =
        index % columns;

      const fullWidth =
        Boolean(
          part?.fullWidth
        ) &&
        columns > 1;

      return {
        ...part,
        x: gap,
        y:
          gap +
          row *
            (cellHeight + gap),
        w: fullWidth
          ? canvasWidth -
            gap * 2
          : cellWidth,
        h: cellHeight,
        ...(fullWidth
          ? {}
          : {
              x:
                gap +
                column *
                  (
                    cellWidth +
                    gap
                  ),
            }),
      };
    }
  );
};

const normalizeEquipmentPanel = (
  value = {}
) => {
  const rawMeasurements =
    Array.isArray(
      value?.measurements
    )
      ? value.measurements
      : [];

  const measurements =
    rawMeasurements
      .slice(0, 8)
      .map(
        (measurement, index) => ({
          id:
            measurement?.id ||
            `equipment-measurement-${index}-${Date.now()}`,
          label: String(
            measurement?.label ||
              ""
          ),
          dataKey: String(
            measurement?.dataKey ||
              ""
          ),
          unit: String(
            measurement?.unit ||
              ""
          ),
        })
      );

  const allowedIcons =
    new Set([
      "factory",
      "gauge",
      "droplets",
      "flame",
      "wind",
      "zap",
      "box",
      "circle",
    ]);

  return {
    equipmentType: String(
      value?.equipmentType || ""
    ),
    label: String(
      value?.label || ""
    ),
    displayMode:
      value?.displayMode ===
      "icon"
        ? "icon"
        : "panel",
    icon:
      allowedIcons.has(
        value?.icon
      )
        ? value.icon
        : "factory",
    measurements,
  };
};

export const normalizeCustomLayoutConfig = (
  config = {}
) => {
  const canvasWidth = clamp(
    config?.canvas?.width ||
      CANVAS_WIDTH,
    600,
    2000
  );

  const canvasHeight = clamp(
    config?.canvas?.height ||
      CANVAS_HEIGHT,
    360,
    1200
  );

  const migratedParts =
    migrateLegacyParts(
      config,
      canvasWidth,
      canvasHeight
    );

  const parts = migratedParts
    .slice(0, 30)
    .map((part, index) => {
      const type =
        CUSTOM_LAYOUT_CHILD_TYPES.includes(
          part?.type
        )
          ? part.type
          : "bignumber";

      const defaultSize =
        DEFAULT_PART_SIZE[type] ||
        DEFAULT_PART_SIZE.bignumber;

      const dataKeys =
        normalizeDataKeys(part);

      const width = clamp(
        part?.w ||
          defaultSize.w,
        60,
        canvasWidth
      );

      const height = clamp(
        part?.h ||
          defaultSize.h,
        28,
        canvasHeight
      );

      const equipmentPanel =
        normalizeEquipmentPanel(
          part?.equipmentPanel ||
            {
              label:
                part?.label || "",
              measurements: [],
            }
        );

      const equipmentDataKeys =
        equipmentPanel.measurements
          .map(
            (measurement) =>
              measurement.dataKey
          )
          .filter(Boolean);

      return {
        ...createCustomLayoutPart({
          type,
        }),
        ...part,
        id:
          part?.id ||
          `custom-part-${index}-${Date.now()}`,
        type,
        dataKey:
          type ===
          "processEquipment"
            ? equipmentDataKeys[0] ||
              ""
            : part?.dataKey ||
              dataKeys[0] ||
              "",
        dataKeys:
          type ===
          "processEquipment"
            ? equipmentDataKeys
            : dataKeys,
        equipmentPanel,
        x: clamp(
          part?.x,
          0,
          Math.max(
            0,
            canvasWidth - width
          )
        ),
        y: clamp(
          part?.y,
          0,
          Math.max(
            0,
            canvasHeight - height
          )
        ),
        w: width,
        h: height,
        z:
          Number.isFinite(
            Number(part?.z)
          )
            ? Number(part.z)
            : index + 1,
        rotation:
          Number.isFinite(
            Number(part?.rotation)
          )
            ? (
                (
                  Number(
                    part.rotation
                  ) %
                  360
                ) +
                360
              ) %
              360
            : 0,
        borderRadius: clamp(
          part?.borderRadius ?? 12,
          0,
          40
        ),
        opacity: clamp(
          part?.opacity ?? 1,
          0.1,
          1
        ),
        fontSize: clamp(
          part?.fontSize ?? 24,
          8,
          72
        ),
        fontWeight: clamp(
          part?.fontWeight ?? 700,
          300,
          900
        ),
        equipmentPanel:
          normalizeEquipmentPanel(
            part?.equipmentPanel ||
              {
                label:
                  part?.label || "",
                measurements:
                  part?.processEquipmentConfig
                    ?.primaryMeasurement
                    ?.dataKey
                    ? [
                        {
                          id:
                            "legacy-primary",
                          label:
                            part
                              .processEquipmentConfig
                              .primaryMeasurement
                              .label ||
                            "",
                          dataKey:
                            part
                              .processEquipmentConfig
                              .primaryMeasurement
                              .dataKey ||
                            "",
                          unit:
                            part
                              .processEquipmentConfig
                              .primaryMeasurement
                              .unit ||
                            "",
                        },
                      ]
                    : [],
              }
          ),
      };
    });

  const orderedParts = [
    ...parts,
  ].sort((a, b) => {
    const aZ =
      Number.isFinite(
        Number(a?.z)
      )
        ? Number(a.z)
        : 0;

    const bZ =
      Number.isFinite(
        Number(b?.z)
      )
        ? Number(b.z)
        : 0;

    if (aZ !== bZ) {
      return aZ - bZ;
    }

    return (
      parts.indexOf(a) -
      parts.indexOf(b)
    );
  });

  const safeLayerById =
    new Map(
      orderedParts.map(
        (part, index) => [
          part.id,
          index + 1,
        ]
      )
    );

  const safeParts =
    parts.map((part) => ({
      ...part,
      z:
        safeLayerById.get(
          part.id
        ) || 1,
    }));

  return {
    ...DEFAULT_CUSTOM_LAYOUT_CONFIG,
    ...config,
    mode: "freeform",
    canvas: {
      ...DEFAULT_CUSTOM_LAYOUT_CONFIG.canvas,
      ...(config?.canvas || {}),
      width: canvasWidth,
      height: canvasHeight,
      snap: clamp(
        config?.canvas?.snap ?? 10,
        1,
        100
      ),
      snapEnabled:
        config?.canvas?.snapEnabled !==
        false,
      backgroundColor:
        /^#[0-9a-fA-F]{6}$/.test(
          String(
            config?.canvas
              ?.backgroundColor ||
              ""
          )
        )
          ? config.canvas
              .backgroundColor
          : "#FFFFFF",
      transparentBackground:
        config?.canvas
          ?.transparentBackground ===
        true,
    },
    parts: safeParts,
  };
};

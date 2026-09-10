import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  BarChart3,
  Copy,
  Gauge,
  Grip,
  Hash,
  LayoutGrid,
  Minus,
  Move,
  PieChart,
  Plus,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Type,
  Factory,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CUSTOM_LAYOUT_CHILD_LABELS,
  CUSTOM_LAYOUT_CHILD_TYPES,
  createCustomLayoutPart,
  normalizeCustomLayoutConfig,
} from "./customLayoutConfig";
import CustomLayoutPart from "./CustomLayoutPart";
import { EQUIPMENT_LIBRARY } from "../process/equipmentLibrary";

const ICONS = {
  bignumber: Hash,
  gauge: Gauge,
  linearGauge: SlidersHorizontal,
  line: TrendingUp,
  bar: BarChart3,
  pie: PieChart,
  processEquipment: Factory,
  text: Type,
  divider: Minus,
};

const MULTI_SOURCE_TYPES =
  new Set([
    "line",
    "bar",
    "pie",
  ]);

const NO_SOURCE_TYPES =
  new Set([
    "text",
    "divider",
  ]);

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

const snapValue = (
  value,
  snap,
  enabled
) =>
  enabled
    ? Math.round(value / snap) *
      snap
    : value;

const defaultSizeForType = (
  type
) =>
  ({
    bignumber: {
      w: 190,
      h: 105,
    },
    gauge: {
      w: 230,
      h: 175,
    },
    linearGauge: {
      w: 260,
      h: 90,
    },
    line: {
      w: 320,
      h: 170,
    },
    bar: {
      w: 300,
      h: 175,
    },
    pie: {
      w: 250,
      h: 190,
    },
    processEquipment: {
      w: 260,
      h: 175,
    },
    text: {
      w: 220,
      h: 60,
    },
    divider: {
      w: 220,
      h: 22,
    },
  }[type] || {
    w: 190,
    h: 105,
  });

const ResizeHandle = ({
  edge,
  className,
  onPointerDown,
}) => (
  <button
    type="button"
    aria-label={`Resize ${edge}`}
    onPointerDown={(event) =>
      onPointerDown(
        event,
        edge
      )
    }
    className={`absolute z-30 h-3 w-3 rounded-full border-2 border-white bg-[#0891B2] shadow-sm ${className}`}
  />
);

export default function CustomLayoutSettings({
  config,
  onChange = () => {},
  availableDataKeys = [],
  dataOptions = [],
  previewData = {},
  previewHistory = [],
}) {
  const canvasRef =
    useRef(null);

  const normalized =
    useMemo(
      () =>
        normalizeCustomLayoutConfig(
          config
        ),
      [config]
    );

  const [
    selectedId,
    setSelectedId,
  ] = useState(
    normalized.parts[0]?.id ||
      null
  );

  const [
    interaction,
    setInteraction,
  ] = useState(null);

  const canvas =
    normalized.canvas;

  const selectedPart =
    normalized.parts.find(
      (part) =>
        part.id === selectedId
    ) || null;

  const orderedParts =
    useMemo(
      () =>
        [...normalized.parts].sort(
          (a, b) =>
            (Number(a.z) || 1) -
            (Number(b.z) || 1)
        ),
      [normalized.parts]
    );

  const selectedLayerIndex =
    selectedPart
      ? orderedParts.findIndex(
          (part) =>
            part.id ===
            selectedPart.id
        )
      : -1;

  const isBackmost =
    selectedLayerIndex <= 0;

  const isFrontmost =
    selectedLayerIndex >= 0 &&
    selectedLayerIndex ===
      orderedParts.length - 1;

  const options =
    availableDataKeys
      .map(
        (key) =>
          dataOptions.find(
            (option) =>
              option.key === key
          ) || {
            key,
            label: key,
          }
      )
      .filter(Boolean);

  const equipmentGroups =
    useMemo(() => {
      const groups =
        new Map();

      EQUIPMENT_LIBRARY.forEach(
        (equipment) => {
          const category =
            equipment.category ||
            "Other";

          if (!groups.has(category)) {
            groups.set(
              category,
              []
            );
          }

          groups
            .get(category)
            .push(equipment);
        }
      );

      return Array.from(
        groups.entries()
      ).map(
        ([
          category,
          equipment,
        ]) => ({
          category,
          equipment,
        })
      );
    }, []);

  const exampleData =
    useMemo(() => {
      const values = {
        ...previewData,
      };

      options.forEach(
        (option, index) => {
          if (
            values[option.key] ===
            undefined
          ) {
            values[option.key] =
              20 + index * 8;
          }
        }
      );

      return values;
    }, [
      previewData,
      options,
    ]);

  const [previewEndTime] =
    useState(() => Date.now());

  const exampleHistory =
    useMemo(() => {
      const rows =
        previewHistory.length
          ? previewHistory
          : Array.from(
              {
                length: 20,
              },
              (_, index) => ({
                timestamp:
                  previewEndTime -
                  (20 - index) *
                    2000,
                time: new Date(
                  previewEndTime -
                    (20 - index) *
                      2000
                ).toLocaleTimeString(),
              })
            );

      return rows.map(
        (row, rowIndex) => {
          const next = {
            ...row,
          };

          options.forEach(
            (option, index) => {
              if (
                next[option.key] ===
                undefined
              ) {
                const base =
                  Number(
                    exampleData[
                      option.key
                    ]
                  ) ||
                  20 + index * 8;

                next[option.key] =
                  base +
                  Math.sin(
                    rowIndex /
                      2.4 +
                      index *
                        0.7
                  ) *
                    Math.max(
                      1,
                      Math.abs(base) *
                        0.08
                    );
              }
            }
          );

          return next;
        }
      );
    }, [
      previewHistory,
      options,
      exampleData,
      previewEndTime,
    ]);

  const getPreviewPart = (
    part
  ) => {
    if (
      NO_SOURCE_TYPES.has(
        part.type
      )
    ) {
      return part;
    }

    const selectedKeys =
      Array.isArray(
        part.dataKeys
      )
        ? part.dataKeys.filter(
            Boolean
          )
        : [];

    return {
      ...part,
      dataKey:
        part.dataKey || "",
      dataKeys:
        selectedKeys,
      label:
        part.label || "",
    };
  };

  const renderPartPreview = (
    part
  ) => (
    <CustomLayoutPart
      part={getPreviewPart(part)}
      data={exampleData}
      history={exampleHistory}
      dataOptions={options}
      useExampleFallback
    />
  );

  const patch = (next) =>
    onChange(
      normalizeCustomLayoutConfig({
        ...normalized,
        ...next,
      })
    );

  const patchCanvas = (
    next
  ) =>
    patch({
      canvas: {
        ...canvas,
        ...next,
      },
    });

  const updatePart = (
    partId,
    partPatch
  ) => {
    patch({
      parts:
        normalized.parts.map(
          (part) =>
            part.id === partId
              ? {
                  ...part,
                  ...partPatch,
                }
              : part
        ),
    });
  };

  const addPart = (
    type
  ) => {
    if (
      normalized.parts.length >=
      30
    ) {
      return;
    }

    const size =
      defaultSizeForType(type);

    const index =
      normalized.parts.length;

    const offset =
      30 +
      (index % 8) * 22;

    const maxZ = Math.max(
      0,
      ...normalized.parts.map(
        (part) =>
          Number(part.z) || 0
      )
    );

    const next =
      createCustomLayoutPart({
        type,
        dataKey: "",
        dataKeys: [],
        x: clamp(
          offset,
          0,
          canvas.width -
            size.w
        ),
        y: clamp(
          offset,
          0,
          canvas.height -
            size.h
        ),
        w: size.w,
        h: size.h,
        z: maxZ + 1,
      });

    patch({
      parts: [
        ...normalized.parts,
        next,
      ],
    });

    setSelectedId(next.id);
  };

  const deletePart = (
    partId
  ) => {
    const nextParts =
      normalized.parts.filter(
        (part) =>
          part.id !== partId
      );

    patch({
      parts: nextParts,
    });

    if (
      selectedId === partId
    ) {
      setSelectedId(
        nextParts[0]?.id ||
          null
      );
    }
  };

  const duplicatePart = (
    part
  ) => {
    const maxZ = Math.max(
      0,
      ...normalized.parts.map(
        (candidate) =>
          Number(
            candidate.z
          ) || 0
      )
    );

    const {
      id: _ignoredId,
      ...copyablePart
    } = part;

    const next =
      createCustomLayoutPart({
        ...copyablePart,
        x: clamp(
          part.x + 24,
          0,
          canvas.width -
            part.w
        ),
        y: clamp(
          part.y + 24,
          0,
          canvas.height -
            part.h
        ),
        z: maxZ + 1,
      });

    patch({
      parts: [
        ...normalized.parts,
        next,
      ],
    });

    setSelectedId(next.id);
  };

  const changePartType = (
    part,
    type
  ) => {
    const size =
      defaultSizeForType(type);

    const keepSource =
      !NO_SOURCE_TYPES.has(
        type
      ) &&
      type !==
        "processEquipment";

    updatePart(part.id, {
      type,
      dataKey:
        keepSource
          ? part.dataKey ||
            ""
          : "",
      dataKeys:
        keepSource
          ? Array.isArray(
              part.dataKeys
            )
            ? part.dataKeys
            : []
          : [],
      w:
        part.w ||
        size.w,
      h:
        part.h ||
        size.h,
      equipmentPanel:
        type ===
        "processEquipment"
          ? part.equipmentPanel ||
            {
              label: "",
              measurements: [],
            }
          : part.equipmentPanel,
    });
  };

  const setSingleDataKey = (
    part,
    key
  ) => {
    updatePart(part.id, {
      dataKey: key,
      dataKeys: key
        ? [key]
        : [],
    });
  };

  const toggleDataKey = (
    part,
    key
  ) => {
    const current =
      Array.isArray(
        part.dataKeys
      )
        ? part.dataKeys
        : [];

    const next =
      current.includes(key)
        ? current.filter(
            (candidate) =>
              candidate !== key
          )
        : [
            ...current,
            key,
          ];

    updatePart(part.id, {
      dataKeys: next,
      dataKey:
        next[0] || "",
    });
  };

  const getEquipmentPanel = (
    part
  ) => ({
    equipmentType: String(
      part?.equipmentPanel
        ?.equipmentType ||
        ""
    ),
    label: String(
      part?.equipmentPanel?.label ||
        ""
    ),
    displayMode:
      part?.equipmentPanel
        ?.displayMode ===
      "icon"
        ? "icon"
        : "panel",
    icon:
      String(
        part?.equipmentPanel?.icon ||
          "factory"
      ),
    measurements:
      Array.isArray(
        part?.equipmentPanel
          ?.measurements
      )
        ? part.equipmentPanel.measurements
        : [],
  });

  const saveEquipmentPanel = (
    part,
    panel
  ) => {
    const measurements =
      Array.isArray(
        panel?.measurements
      )
        ? panel.measurements
        : [];

    const dataKeys =
      measurements
        .map(
          (measurement) =>
            measurement.dataKey
        )
        .filter(Boolean);

    updatePart(part.id, {
      equipmentPanel: {
        equipmentType:
          String(
            panel?.equipmentType ||
              ""
          ),
        label:
          String(
            panel?.label || ""
          ),
        displayMode:
          panel?.displayMode ===
          "icon"
            ? "icon"
            : "panel",
        icon:
          String(
            panel?.icon ||
              "factory"
          ),
        measurements,
      },
      dataKey:
        dataKeys[0] || "",
      dataKeys,
    });
  };

  const addEquipmentMeasurement = (
    part
  ) => {
    const panel =
      getEquipmentPanel(part);

    if (
      panel.measurements.length >=
      8
    ) {
      return;
    }

    saveEquipmentPanel(
      part,
      {
        ...panel,
        measurements: [
          ...panel.measurements,
          {
            id:
              `equipment-measurement-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 7)}`,
            label: "",
            dataKey: "",
            unit: "",
          },
        ],
      }
    );
  };

  const updateEquipmentMeasurement =
    (
      part,
      measurementId,
      patchValue
    ) => {
      const panel =
        getEquipmentPanel(part);

      saveEquipmentPanel(
        part,
        {
          ...panel,
          measurements:
            panel.measurements.map(
              (measurement) =>
                measurement.id ===
                measurementId
                  ? {
                      ...measurement,
                      ...patchValue,
                    }
                  : measurement
            ),
        }
      );
    };

  const removeEquipmentMeasurement =
    (
      part,
      measurementId
    ) => {
      const panel =
        getEquipmentPanel(part);

      saveEquipmentPanel(
        part,
        {
          ...panel,
          measurements:
            panel.measurements.filter(
              (measurement) =>
                measurement.id !==
                measurementId
            ),
        }
      );
    };

  const getOrderedParts =
    () =>
      [...normalized.parts].sort(
        (a, b) =>
          (Number(a.z) || 1) -
          (Number(b.z) || 1)
      );

  const applyLayerOrder = (
    orderedParts
  ) => {
    const layerById =
      new Map(
        orderedParts.map(
          (part, index) => [
            part.id,
            index + 1,
          ]
        )
      );

    patch({
      parts:
        normalized.parts.map(
          (part) => ({
            ...part,
            z:
              layerById.get(
                part.id
              ) || 1,
          })
        ),
    });
  };

  const moveForward = (
    part
  ) => {
    const ordered =
      getOrderedParts();

    const index =
      ordered.findIndex(
        (candidate) =>
          candidate.id ===
          part.id
      );

    if (
      index < 0 ||
      index >=
        ordered.length - 1
    ) {
      return;
    }

    [
      ordered[index],
      ordered[index + 1],
    ] = [
      ordered[index + 1],
      ordered[index],
    ];

    applyLayerOrder(ordered);
  };

  const moveBackward = (
    part
  ) => {
    const ordered =
      getOrderedParts();

    const index =
      ordered.findIndex(
        (candidate) =>
          candidate.id ===
          part.id
      );

    if (index <= 0) {
      return;
    }

    [
      ordered[index - 1],
      ordered[index],
    ] = [
      ordered[index],
      ordered[index - 1],
    ];

    applyLayerOrder(ordered);
  };

  const bringToFront = (
    part
  ) => {
    const ordered =
      getOrderedParts();

    const index =
      ordered.findIndex(
        (candidate) =>
          candidate.id ===
          part.id
      );

    if (
      index < 0 ||
      index ===
        ordered.length - 1
    ) {
      return;
    }

    const [selected] =
      ordered.splice(
        index,
        1
      );

    ordered.push(selected);

    applyLayerOrder(ordered);
  };

  const sendToBack = (
    part
  ) => {
    const ordered =
      getOrderedParts();

    const index =
      ordered.findIndex(
        (candidate) =>
          candidate.id ===
          part.id
      );

    if (index <= 0) {
      return;
    }

    const [selected] =
      ordered.splice(
        index,
        1
      );

    ordered.unshift(
      selected
    );

    applyLayerOrder(ordered);
  };

  const beginInteraction = (
    event,
    part,
    mode,
    edge = ""
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const rect =
      canvasRef.current
        ?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setSelectedId(part.id);

    const partElement =
      event.currentTarget
        ?.closest(
          "[data-custom-part]"
        );

    const partRect =
      partElement
        ?.getBoundingClientRect();

    const centerX =
      partRect
        ? partRect.left +
          partRect.width / 2
        : event.clientX;

    const centerY =
      partRect
        ? partRect.top +
          partRect.height / 2
        : event.clientY;

    const startPointerAngle =
      Math.atan2(
        event.clientY -
          centerY,
        event.clientX -
          centerX
      ) *
      (180 / Math.PI);

    setInteraction({
      partId: part.id,
      mode,
      edge,
      startClientX:
        event.clientX,
      startClientY:
        event.clientY,
      startX: part.x,
      startY: part.y,
      startW: part.w,
      startH: part.h,
      startRotation:
        Number(
          part.rotation
        ) || 0,
      startPointerAngle,
      centerX,
      centerY,
      rectWidth:
        rect.width,
      rectHeight:
        rect.height,
    });
  };

  useEffect(() => {
    if (!interaction) {
      return undefined;
    }

    const handleMove = (
      event
    ) => {
      const part =
        normalized.parts.find(
          (candidate) =>
            candidate.id ===
            interaction.partId
        );

      if (!part) {
        return;
      }

      const dx =
        (
          event.clientX -
          interaction.startClientX
        ) /
        interaction.rectWidth *
        canvas.width;

      const dy =
        (
          event.clientY -
          interaction.startClientY
        ) /
        interaction.rectHeight *
        canvas.height;

      const snap =
        canvas.snap || 10;

      const snapEnabled =
        canvas.snapEnabled !==
        false;

      if (
        interaction.mode ===
        "rotate"
      ) {
        const pointerAngle =
          Math.atan2(
            event.clientY -
              interaction.centerY,
            event.clientX -
              interaction.centerX
          ) *
          (180 / Math.PI);

        const delta =
          pointerAngle -
          interaction.startPointerAngle;

        let nextRotation =
          interaction.startRotation +
          delta;

        if (event.shiftKey) {
          nextRotation =
            Math.round(
              nextRotation / 15
            ) * 15;
        }

        nextRotation =
          (
            (
              nextRotation %
                360
            ) +
            360
          ) %
          360;

        updatePart(
          part.id,
          {
            rotation:
              Math.round(
                nextRotation
              ),
          }
        );

        return;
      }

      if (
        interaction.mode ===
        "move"
      ) {
        const nextX =
          snapValue(
            interaction.startX +
              dx,
            snap,
            snapEnabled
          );

        const nextY =
          snapValue(
            interaction.startY +
              dy,
            snap,
            snapEnabled
          );

        updatePart(
          part.id,
          {
            x: clamp(
              nextX,
              0,
              canvas.width -
                part.w
            ),
            y: clamp(
              nextY,
              0,
              canvas.height -
                part.h
            ),
          }
        );

        return;
      }

      const edge =
        interaction.edge;

      let nextX =
        interaction.startX;
      let nextY =
        interaction.startY;
      let nextW =
        interaction.startW;
      let nextH =
        interaction.startH;

      const minW =
        part.type ===
        "divider"
          ? 40
          : 80;

      const minH =
        part.type ===
        "divider"
          ? 14
          : 50;

      if (
        edge.includes(
          "right"
        )
      ) {
        nextW =
          interaction.startW +
          dx;
      }

      if (
        edge.includes(
          "bottom"
        )
      ) {
        nextH =
          interaction.startH +
          dy;
      }

      if (
        edge.includes(
          "left"
        )
      ) {
        nextX =
          interaction.startX +
          dx;

        nextW =
          interaction.startW -
          dx;
      }

      if (
        edge.includes(
          "top"
        )
      ) {
        nextY =
          interaction.startY +
          dy;

        nextH =
          interaction.startH -
          dy;
      }

      nextX = snapValue(
        nextX,
        snap,
        snapEnabled
      );

      nextY = snapValue(
        nextY,
        snap,
        snapEnabled
      );

      nextW = snapValue(
        nextW,
        snap,
        snapEnabled
      );

      nextH = snapValue(
        nextH,
        snap,
        snapEnabled
      );

      if (nextW < minW) {
        if (
          edge.includes(
            "left"
          )
        ) {
          nextX =
            interaction.startX +
            interaction.startW -
            minW;
        }

        nextW = minW;
      }

      if (nextH < minH) {
        if (
          edge.includes(
            "top"
          )
        ) {
          nextY =
            interaction.startY +
            interaction.startH -
            minH;
        }

        nextH = minH;
      }

      nextX = clamp(
        nextX,
        0,
        canvas.width -
          minW
      );

      nextY = clamp(
        nextY,
        0,
        canvas.height -
          minH
      );

      nextW = clamp(
        nextW,
        minW,
        canvas.width -
          nextX
      );

      nextH = clamp(
        nextH,
        minH,
        canvas.height -
          nextY
      );

      updatePart(
        part.id,
        {
          x: nextX,
          y: nextY,
          w: nextW,
          h: nextH,
        }
      );
    };

    const handleUp = () =>
      setInteraction(null);

    window.addEventListener(
      "pointermove",
      handleMove
    );

    window.addEventListener(
      "pointerup",
      handleUp
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handleMove
      );

      window.removeEventListener(
        "pointerup",
        handleUp
      );
    };
  }, [
    interaction,
    normalized.parts,
    canvas,
  ]);

  return (
    <div className="space-y-3">
      <div
        className="
          flex flex-wrap
          items-center
          justify-between gap-2
          rounded-xl border
          border-slate-200
          bg-slate-50/70 p-2
          dark:border-[#263657]
          dark:bg-[#0B1328]
        "
      >
        <div className="flex flex-wrap gap-1.5">
          {CUSTOM_LAYOUT_CHILD_TYPES.map(
            (type) => {
              const Icon =
                ICONS[type] ||
                LayoutGrid;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    addPart(type)
                  }
                  className="
                    inline-flex h-8
                    items-center gap-1.5
                    rounded-lg border
                    border-slate-200
                    bg-white px-2.5
                    text-[9px]
                    font-bold
                    text-slate-600
                    transition
                    hover:border-[#0891B2]
                    hover:text-[#0891B2]
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:text-slate-300
                  "
                >
                  <Plus size={11} />
                  <Icon size={12} />
                  {
                    CUSTOM_LAYOUT_CHILD_LABELS[
                      type
                    ]
                  }
                </button>
              );
            }
          )}
        </div>

        <div className="flex items-center gap-2">
          <label
            className="
              inline-flex
              items-center gap-1.5
              text-[9px]
              font-semibold
              text-slate-500
              dark:text-slate-400
            "
          >
            <input
              type="checkbox"
              checked={
                canvas.snapEnabled !==
                false
              }
              onChange={(event) =>
                patchCanvas({
                  snapEnabled:
                    event.target
                      .checked,
                })
              }
              className="h-3.5 w-3.5 accent-[#0891B2]"
            />
            Snap
          </label>

          <select
            value={canvas.snap}
            disabled={
              canvas.snapEnabled ===
              false
            }
            onChange={(event) =>
              patchCanvas({
                snap:
                  Number(
                    event.target.value
                  ) || 10,
              })
            }
            className="
              h-8 rounded-lg
              border border-slate-200
              bg-white px-2
              text-[9px]
              text-slate-600
              dark:border-slate-700
              dark:bg-slate-900
              dark:text-slate-300
            "
          >
            <option value={5}>
              5 px
            </option>
            <option value={10}>
              10 px
            </option>
            <option value={20}>
              20 px
            </option>
          </select>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

          <label className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
            Canvas
            <input
              type="color"
              value={
                canvas.backgroundColor ||
                "#FFFFFF"
              }
              disabled={
                canvas.transparentBackground ===
                true
              }
              onChange={(event) =>
                patchCanvas({
                  backgroundColor:
                    event.target.value,
                })
              }
              className="h-7 w-8 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              title="Canvas background color"
            />
          </label>

          <label className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={
                canvas.transparentBackground ===
                true
              }
              onChange={(event) =>
                patchCanvas({
                  transparentBackground:
                    event.target.checked,
                })
              }
              className="h-3.5 w-3.5 accent-[#0891B2]"
            />
            Transparent
          </label>
        </div>
      </div>

      <div
        className="
          grid min-h-0
          grid-cols-1 gap-3
          xl:grid-cols-[minmax(0,1fr)_280px]
        "
      >
        <div
          className="
            min-w-0 rounded-2xl
            border border-slate-200
            bg-slate-100/70 p-2.5
            dark:border-[#263657]
            dark:bg-[#071224]
          "
        >
          <div
            className="
              mb-2 flex
              items-center
              justify-between
              text-[9px]
              text-slate-400
            "
          >
            <span>
              Freeform canvas · drag
              elements · resize from
              any edge or corner
            </span>

            <span>
              {Math.round(
                canvas.width
              )}{" "}
              ×{" "}
              {Math.round(
                canvas.height
              )}
            </span>
          </div>

          <div
            ref={canvasRef}
            onPointerDown={() =>
              setSelectedId(null)
            }
            className="
              relative mx-auto
              overflow-hidden
              rounded-xl border
              border-slate-200
              bg-white
              shadow-inner
              dark:border-[#34476F]
              dark:bg-[#0B1429]
            "
            style={{
              width: `min(100%, 820px, calc((100vh - 340px) * ${
                canvas.width / canvas.height
              }))`,
              minWidth: "520px",
              maxWidth: "100%",
              aspectRatio: `${canvas.width} / ${canvas.height}`,
              backgroundColor:
                canvas.transparentBackground
                  ? "transparent"
                  : canvas.backgroundColor ||
                    "#FFFFFF",
              backgroundImage:
                canvas.snapEnabled !==
                false
                  ? "radial-gradient(circle, rgba(100,116,139,.24) 1px, transparent 1px)"
                  : "none",
              backgroundSize:
                canvas.snapEnabled !==
                false
                  ? `${Math.max(
                      8,
                      canvas.snap *
                        0.9
                    )}px ${Math.max(
                      8,
                      canvas.snap *
                        0.9
                    )}px`
                  : undefined,
            }}
          >
            {normalized.parts.map(
              (part) => {
                const selected =
                  part.id ===
                  selectedId;

                return (
                  <div
                    key={part.id}
                    data-custom-part
                    onPointerDown={(
                      event
                    ) => {
                      if (
                        event.target
                          .closest(
                            "[data-resize-handle], [data-rotate-handle]"
                          )
                      ) {
                        return;
                      }

                      beginInteraction(
                        event,
                        part,
                        "move"
                      );
                    }}
                    className={`
                      absolute
                      select-none
                      cursor-move
                      overflow-visible
                      ${
                        selected
                          ? "z-[1000]"
                          : ""
                      }
                    `}
                    style={{
                      left: `${
                        (
                          part.x /
                          canvas.width
                        ) * 100
                      }%`,
                      top: `${
                        (
                          part.y /
                          canvas.height
                        ) * 100
                      }%`,
                      width: `${
                        (
                          part.w /
                          canvas.width
                        ) * 100
                      }%`,
                      height: `${
                        (
                          part.h /
                          canvas.height
                        ) * 100
                      }%`,
                      zIndex:
                        selected
                          ? 1000
                          : part.z || 1,
                      opacity:
                        part.opacity ??
                        1,
                      transform: `rotate(${
                        part.rotation || 0
                      }deg)`,
                      transformOrigin:
                        "center center",
                    }}
                  >
                    <div
                      className={`
                        relative h-full w-full
                        overflow-hidden
                        ${
                          selected
                            ? "ring-2 ring-[#0891B2] ring-offset-1"
                            : "ring-1 ring-slate-200/80"
                        }
                      `}
                      style={{
                        backgroundColor:
                          part.backgroundColor ||
                          "transparent",
                        border:
                          part.showFrame
                            ? `1px solid ${
                                part.borderColor ||
                                "#D8E2EF"
                              }`
                            : undefined,
                        borderRadius:
                          `${
                            part.borderRadius ??
                            12
                          }px`,
                      }}
                    >
                      {renderPartPreview(
                        part
                      )}
                    </div>

                    {selected && (
                      <>
                        <div
                          data-resize-handle
                          className="
                            pointer-events-none
                            absolute inset-0
                            border border-[#0891B2]/50
                          "
                        />

                        <div
                          className="
                            pointer-events-none
                            absolute left-1/2
                            top-[-30px]
                            z-40 flex
                            -translate-x-1/2
                            flex-col
                            items-center
                          "
                        >
                          <button
                            type="button"
                            data-rotate-handle
                            onPointerDown={(event) =>
                              beginInteraction(
                                event,
                                part,
                                "rotate"
                              )
                            }
                            className="
                              pointer-events-auto
                              flex h-6 w-6
                              cursor-grab
                              items-center
                              justify-center
                              rounded-full
                              border-2
                              border-white
                              bg-[#0891B2]
                              text-white
                              shadow-md
                              transition
                              hover:bg-[#07829F]
                              active:cursor-grabbing
                            "
                            title="Drag to rotate · hold Shift for 15° snapping"
                            aria-label="Rotate element"
                          >
                            <RotateCw
                              size={12}
                              strokeWidth={2.4}
                            />
                          </button>

                          <div className="h-2.5 w-px bg-[#0891B2]" />
                        </div>

                        <ResizeHandle
                          edge="top-left"
                          className="-left-1.5 -top-1.5 cursor-nwse-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="top"
                          className="left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="top-right"
                          className="-right-1.5 -top-1.5 cursor-nesw-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="right"
                          className="-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="bottom-right"
                          className="-bottom-1.5 -right-1.5 cursor-nwse-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="bottom"
                          className="bottom-[-6px] left-1/2 -translate-x-1/2 cursor-ns-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="bottom-left"
                          className="-bottom-1.5 -left-1.5 cursor-nesw-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />

                        <ResizeHandle
                          edge="left"
                          className="-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize"
                          onPointerDown={(
                            event,
                            edge
                          ) =>
                            beginInteraction(
                              event,
                              part,
                              "resize",
                              edge
                            )
                          }
                        />
                      </>
                    )}
                  </div>
                );
              }
            )}

            {normalized.parts.length ===
              0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Move
                    size={22}
                    className="mx-auto text-slate-300"
                  />
                  <div className="mt-2 text-[10px] font-bold text-slate-500">
                    Empty custom canvas
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400">
                    Add any element from the toolbar above.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside
          className="
            min-h-0 rounded-2xl
            border border-slate-200
            bg-white
            dark:border-[#263657]
            dark:bg-[#0B1328]
          "
        >
          {selectedPart ? (
            <div
              className="overflow-y-auto p-3"
              style={{
                maxHeight:
                  "min(500px, calc(100vh - 340px))",
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                    Selected element
                  </div>
                  <div className="mt-0.5 truncate text-xs font-black text-slate-900 dark:text-white">
                    {selectedPart.label ||
                      CUSTOM_LAYOUT_CHILD_LABELS[
                        selectedPart.type
                      ]}
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      duplicatePart(
                        selectedPart
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#0891B2] dark:hover:bg-slate-800"
                    title="Duplicate"
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deletePart(
                        selectedPart.id
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                    title="Delete"
                  >
                    <Trash2
                      size={13}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
                    Element type
                  </label>
                  <select
                    value={
                      selectedPart.type
                    }
                    onChange={(
                      event
                    ) =>
                      changePartType(
                        selectedPart,
                        event.target
                          .value
                      )
                    }
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {CUSTOM_LAYOUT_CHILD_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {
                            CUSTOM_LAYOUT_CHILD_LABELS[
                              type
                            ]
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {!(
                  selectedPart.type ===
                    "text" ||
                  selectedPart.type ===
                    "divider" ||
                  selectedPart.type ===
                    "processEquipment"
                ) && (
                  <div>
                    <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
                      Label
                    </label>
                    <input
                      value={
                        selectedPart.label ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        updatePart(
                          selectedPart.id,
                          {
                            label:
                              event.target
                                .value,
                          }
                        )
                      }
                      placeholder="Optional"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                )}

                {selectedPart.type ===
                  "text" && (
                  <>
                    <div>
                      <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
                        Text
                      </label>
                      <textarea
                        value={
                          selectedPart.text ||
                          ""
                        }
                        onChange={(
                          event
                        ) =>
                          updatePart(
                            selectedPart.id,
                            {
                              text:
                                event.target
                                  .value,
                            }
                          )
                        }
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2 py-2 text-[10px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-500">
                          Font size
                        </label>
                        <input
                          type="number"
                          value={
                            selectedPart.fontSize
                          }
                          min={8}
                          max={72}
                          onChange={(
                            event
                          ) =>
                            updatePart(
                              selectedPart.id,
                              {
                                fontSize:
                                  Number(
                                    event.target
                                      .value
                                  ) || 8,
                              }
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-500">
                          Weight
                        </label>
                        <select
                          value={
                            selectedPart.fontWeight
                          }
                          onChange={(
                            event
                          ) =>
                            updatePart(
                              selectedPart.id,
                              {
                                fontWeight:
                                  Number(
                                    event.target
                                      .value
                                  ),
                              }
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-[10px]"
                        >
                          <option
                            value={400}
                          >
                            Regular
                          </option>
                          <option
                            value={600}
                          >
                            Semi Bold
                          </option>
                          <option
                            value={700}
                          >
                            Bold
                          </option>
                          <option
                            value={800}
                          >
                            Extra Bold
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-[9px] font-bold text-slate-500">
                        Alignment
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        {[
                          [
                            "left",
                            AlignLeft,
                          ],
                          [
                            "center",
                            AlignCenter,
                          ],
                          [
                            "right",
                            AlignRight,
                          ],
                        ].map(
                          ([
                            value,
                            Icon,
                          ]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                updatePart(
                                  selectedPart.id,
                                  {
                                    textAlign:
                                      value,
                                  }
                                )
                              }
                              className={`flex h-8 items-center justify-center rounded-lg border ${
                                selectedPart.textAlign ===
                                value
                                  ? "border-[#0891B2] bg-[#0891B2] text-white"
                                  : "border-slate-200 text-slate-500"
                              }`}
                            >
                              <Icon
                                size={13}
                              />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}

                {!NO_SOURCE_TYPES.has(
                  selectedPart.type
                ) &&
                  selectedPart.type !==
                    "processEquipment" && (
                  <div>
                    <div className="mb-1 text-[9px] font-bold text-slate-500 dark:text-slate-300">
                      {MULTI_SOURCE_TYPES.has(
                        selectedPart.type
                      )
                        ? "Data sources"
                        : "Data source"}
                    </div>

                    {MULTI_SOURCE_TYPES.has(
                      selectedPart.type
                    ) ? (
                      <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
                        {options.length ? (
                          options.map(
                            (
                              option
                            ) => (
                              <label
                                key={
                                  option.key
                                }
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[9px] hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedPart.dataKeys?.includes(
                                      option.key
                                    ) ||
                                    false
                                  }
                                  onChange={() =>
                                    toggleDataKey(
                                      selectedPart,
                                      option.key
                                    )
                                  }
                                  className="h-3.5 w-3.5 accent-[#0891B2]"
                                />
                                <span className="truncate">
                                  {
                                    option.label
                                  }
                                </span>
                              </label>
                            )
                          )
                        ) : (
                          <div className="px-2 py-3 text-center text-[9px] text-slate-400">
                            No connected sources available.
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        value={
                          selectedPart.dataKey ||
                          ""
                        }
                        onChange={(
                          event
                        ) =>
                          setSingleDataKey(
                            selectedPart,
                            event.target
                              .value
                          )
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">
                          Select source
                        </option>
                        {options.map(
                          (option) => (
                            <option
                              key={
                                option.key
                              }
                              value={
                                option.key
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    )}
                  </div>
                )}

                {selectedPart.type ===
                  "processEquipment" && (
                    <div className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                      <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
                          Available equipment
                        </label>

                        <select
                          value={
                            getEquipmentPanel(
                              selectedPart
                            ).equipmentType
                          }
                          onChange={(event) =>
                            saveEquipmentPanel(
                              selectedPart,
                              {
                                ...getEquipmentPanel(
                                  selectedPart
                                ),
                                equipmentType:
                                  event.target
                                    .value,
                              }
                            )
                          }
                          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">
                            Custom / Generic
                          </option>

                          {equipmentGroups.map(
                            (group) => (
                              <optgroup
                                key={
                                  group.category
                                }
                                label={
                                  group.category
                                }
                              >
                                {group.equipment.map(
                                  (
                                    equipment
                                  ) => (
                                    <option
                                      key={
                                        equipment.type
                                      }
                                      value={
                                        equipment.type
                                      }
                                    >
                                      {
                                        equipment.label
                                      }
                                    </option>
                                  )
                                )}
                              </optgroup>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
                          Display label
                        </label>

                        <input
                          value={
                            selectedPart
                              .equipmentPanel
                              ?.label ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            saveEquipmentPanel(
                              selectedPart,
                              {
                                ...getEquipmentPanel(
                                  selectedPart
                                ),
                                label:
                                  event.target
                                    .value,
                              }
                            )
                          }
                          placeholder={
                            EQUIPMENT_LIBRARY.find(
                              (equipment) =>
                                equipment.type ===
                                getEquipmentPanel(
                                  selectedPart
                                ).equipmentType
                            )?.label ||
                            "Optional custom label"
                          }
                          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            value: "icon",
                            label: "Icon only",
                          },
                          {
                            value: "panel",
                            label: "Icon + data",
                          },
                        ].map(
                          (option) => {
                            const active =
                              getEquipmentPanel(
                                selectedPart
                              ).displayMode ===
                              option.value;

                            return (
                              <button
                                key={
                                  option.value
                                }
                                type="button"
                                onClick={() =>
                                  saveEquipmentPanel(
                                    selectedPart,
                                    {
                                      ...getEquipmentPanel(
                                        selectedPart
                                      ),
                                      displayMode:
                                        option.value,
                                    }
                                  )
                                }
                                className={`h-8 rounded-lg border text-[8px] font-bold transition ${
                                  active
                                    ? "border-[#0891B2] bg-[#0891B2] text-white"
                                    : "border-slate-200 text-slate-500 hover:border-[#0891B2] hover:text-[#0891B2] dark:border-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {
                                  option.label
                                }
                              </button>
                            );
                          }
                        )}
                      </div>

                      {getEquipmentPanel(
                        selectedPart
                      ).equipmentType ? (
                        <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 px-2.5 py-2 text-[8px] leading-4 text-slate-500 dark:border-cyan-500/15 dark:bg-cyan-500/5 dark:text-slate-400">
                          The selected equipment uses the same detailed process visual as the Process Simulator.
                        </div>
                      ) : (
                        <div>
                          <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
                            Generic icon
                          </label>

                          <select
                            value={
                              getEquipmentPanel(
                                selectedPart
                              ).icon
                            }
                            onChange={(event) =>
                              saveEquipmentPanel(
                                selectedPart,
                                {
                                  ...getEquipmentPanel(
                                    selectedPart
                                  ),
                                  icon:
                                    event.target
                                      .value,
                                }
                              )
                            }
                            className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          >
                            <option value="factory">
                              Factory
                            </option>
                            <option value="gauge">
                              Instrument
                            </option>
                            <option value="droplets">
                              Fluid
                            </option>
                            <option value="flame">
                              Heat
                            </option>
                            <option value="wind">
                              Air / Flow
                            </option>
                            <option value="zap">
                              Electrical
                            </option>
                            <option value="box">
                              Equipment
                            </option>
                            <option value="circle">
                              Generic
                            </option>
                          </select>
                        </div>
                      )}

                      {getEquipmentPanel(
                        selectedPart
                      ).displayMode ===
                        "panel" && (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-300">
                              Measurements
                            </span>

                            <button
                          type="button"
                          disabled={
                            (
                              selectedPart
                                .equipmentPanel
                                ?.measurements
                                ?.length ||
                              0
                            ) >= 8
                          }
                          onClick={() =>
                            addEquipmentMeasurement(
                              selectedPart
                            )
                          }
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-[8px] font-bold text-[#0891B2] hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-cyan-500/20 dark:bg-cyan-500/10"
                        >
                          <Plus size={10} />
                          Add
                        </button>
                      </div>

                      {(
                        selectedPart
                          .equipmentPanel
                          ?.measurements ||
                        []
                      ).length ? (
                        <div className="space-y-2">
                          {(
                            selectedPart
                              .equipmentPanel
                              ?.measurements ||
                            []
                          ).map(
                            (
                              measurement,
                              index
                            ) => (
                              <div
                                key={
                                  measurement.id
                                }
                                className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-800/40"
                              >
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                  <span className="text-[8px] font-bold text-slate-400">
                                    Measurement{" "}
                                    {index + 1}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeEquipmentMeasurement(
                                        selectedPart,
                                        measurement.id
                                      )
                                    }
                                    className="text-slate-300 hover:text-rose-500"
                                    title="Remove measurement"
                                  >
                                    <Trash2
                                      size={11}
                                    />
                                  </button>
                                </div>

                                <div className="grid grid-cols-[1fr_74px] gap-1.5">
                                  <input
                                    value={
                                      measurement.label ||
                                      ""
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateEquipmentMeasurement(
                                        selectedPart,
                                        measurement.id,
                                        {
                                          label:
                                            event
                                              .target
                                              .value,
                                        }
                                      )
                                    }
                                    placeholder="Label"
                                    className="h-8 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950"
                                  />

                                  <input
                                    value={
                                      measurement.unit ||
                                      ""
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateEquipmentMeasurement(
                                        selectedPart,
                                        measurement.id,
                                        {
                                          unit:
                                            event
                                              .target
                                              .value,
                                        }
                                      )
                                    }
                                    placeholder="Unit"
                                    className="h-8 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950"
                                  />
                                </div>

                                <select
                                  value={
                                    measurement.dataKey ||
                                    ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateEquipmentMeasurement(
                                      selectedPart,
                                      measurement.id,
                                      {
                                        dataKey:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  className="mt-1.5 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[9px] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                >
                                  <option value="">
                                    Select data
                                  </option>

                                  {options.map(
                                    (
                                      option
                                    ) => (
                                      <option
                                        key={
                                          option.key
                                        }
                                        value={
                                          option.key
                                        }
                                      >
                                        {
                                          option.label
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[8px] text-slate-400 dark:border-slate-700">
                          Add only the measurements you want to display.
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  )}

                <details className="group rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <summary className="cursor-pointer list-none text-[9px] font-bold text-slate-500 dark:text-slate-300">
                    Position & Size
                  </summary>

                  <div className="mt-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [
                      "X",
                      "x",
                    ],
                    [
                      "Y",
                      "y",
                    ],
                    [
                      "Width",
                      "w",
                    ],
                    [
                      "Height",
                      "h",
                    ],
                  ].map(
                    ([
                      label,
                      key,
                    ]) => (
                      <div
                        key={key}
                      >
                        <label className="mb-1 block text-[9px] font-bold text-slate-500">
                          {label}
                        </label>
                        <input
                          type="number"
                          value={Math.round(
                            selectedPart[
                              key
                            ]
                          )}
                          min={0}
                          onChange={(
                            event
                          ) =>
                            updatePart(
                              selectedPart.id,
                              {
                                [key]:
                                  Number(
                                    event.target
                                      .value
                                  ) || 0,
                              }
                            )
                          }
                          className="h-8 w-full rounded-lg border border-slate-300 px-2 text-[9px]"
                        />
                      </div>
                    )
                  )}
                </div>

                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-800/40">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-300">
                          <RotateCw size={11} />
                          Rotation
                        </span>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={359}
                            value={
                              Math.round(
                                selectedPart.rotation ||
                                  0
                              )
                            }
                            onChange={(event) =>
                              updatePart(
                                selectedPart.id,
                                {
                                  rotation:
                                    (
                                      (
                                        Number(
                                          event.target
                                            .value
                                        ) || 0
                                      ) %
                                        360 +
                                      360
                                    ) %
                                    360,
                                }
                              )
                            }
                            className="h-7 w-16 rounded-md border border-slate-300 bg-white px-2 text-right text-[9px] dark:border-slate-700 dark:bg-slate-950"
                          />
                          <span className="text-[8px] text-slate-400">
                            °
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={359}
                        step={1}
                        value={
                          selectedPart.rotation ||
                          0
                        }
                        onChange={(event) =>
                          updatePart(
                            selectedPart.id,
                            {
                              rotation:
                                Number(
                                  event.target
                                    .value
                                ),
                            }
                          )
                        }
                        className="w-full accent-[#0891B2]"
                      />

                      <div className="mt-1.5 grid grid-cols-4 gap-1">
                        {[0, 90, 180, 270].map(
                          (angle) => (
                            <button
                              key={angle}
                              type="button"
                              onClick={() =>
                                updatePart(
                                  selectedPart.id,
                                  {
                                    rotation:
                                      angle,
                                  }
                                )
                              }
                              className={`h-7 rounded-md border text-[8px] font-bold transition ${
                                (selectedPart.rotation ||
                                  0) ===
                                angle
                                  ? "border-[#0891B2] bg-[#0891B2] text-white"
                                  : "border-slate-200 text-slate-500 hover:border-[#0891B2] hover:text-[#0891B2] dark:border-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {angle}°
                            </button>
                          )
                        )}
                      </div>
                    </div>

                  </div>
                </details>

                <details className="group rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <summary className="cursor-pointer list-none text-[9px] font-bold text-slate-500 dark:text-slate-300">
                    Layer
                  </summary>

                  <div className="mt-2">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-500">
                      Layer
                    </span>

                    <span className="text-[8px] font-medium text-slate-400">
                      {selectedLayerIndex >= 0
                        ? `${selectedLayerIndex + 1} / ${orderedParts.length}`
                        : "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isFrontmost}
                      onClick={() =>
                        moveForward(
                          selectedPart
                        )
                      }
                      className="
                        inline-flex h-8
                        items-center
                        justify-center gap-1
                        rounded-lg border
                        border-slate-200
                        text-[9px]
                        font-semibold
                        text-slate-500
                        transition
                        hover:border-[#0891B2]
                        hover:text-[#0891B2]
                        disabled:cursor-not-allowed
                        disabled:border-slate-100
                        disabled:bg-slate-50
                        disabled:text-slate-300
                        disabled:hover:border-slate-100
                        disabled:hover:text-slate-300
                        dark:border-slate-700
                        dark:disabled:border-slate-800
                        dark:disabled:bg-slate-900/40
                        dark:disabled:text-slate-600
                      "
                      title={
                        isFrontmost
                          ? "Already at the front"
                          : "Move forward one layer"
                      }
                    >
                      <ArrowUp
                        size={11}
                      />
                      Forward
                    </button>

                    <button
                      type="button"
                      disabled={isBackmost}
                      onClick={() =>
                        moveBackward(
                          selectedPart
                        )
                      }
                      className="
                        inline-flex h-8
                        items-center
                        justify-center gap-1
                        rounded-lg border
                        border-slate-200
                        text-[9px]
                        font-semibold
                        text-slate-500
                        transition
                        hover:border-[#0891B2]
                        hover:text-[#0891B2]
                        disabled:cursor-not-allowed
                        disabled:border-slate-100
                        disabled:bg-slate-50
                        disabled:text-slate-300
                        disabled:hover:border-slate-100
                        disabled:hover:text-slate-300
                        dark:border-slate-700
                        dark:disabled:border-slate-800
                        dark:disabled:bg-slate-900/40
                        dark:disabled:text-slate-600
                      "
                      title={
                        isBackmost
                          ? "Already at the back"
                          : "Move backward one layer"
                      }
                    >
                      <ArrowDown
                        size={11}
                      />
                      Backward
                    </button>

                    <button
                      type="button"
                      disabled={isFrontmost}
                      onClick={() =>
                        bringToFront(
                          selectedPart
                        )
                      }
                      className="
                        inline-flex h-8
                        items-center
                        justify-center gap-1
                        rounded-lg border
                        border-slate-200
                        text-[9px]
                        font-semibold
                        text-slate-500
                        transition
                        hover:border-[#0891B2]
                        hover:text-[#0891B2]
                        disabled:cursor-not-allowed
                        disabled:border-slate-100
                        disabled:bg-slate-50
                        disabled:text-slate-300
                        disabled:hover:border-slate-100
                        disabled:hover:text-slate-300
                        dark:border-slate-700
                        dark:disabled:border-slate-800
                        dark:disabled:bg-slate-900/40
                        dark:disabled:text-slate-600
                      "
                      title={
                        isFrontmost
                          ? "Already at the front"
                          : "Move to the frontmost layer"
                      }
                    >
                      <ArrowUpToLine
                        size={11}
                      />
                      To Front
                    </button>

                    <button
                      type="button"
                      disabled={isBackmost}
                      onClick={() =>
                        sendToBack(
                          selectedPart
                        )
                      }
                      className="
                        inline-flex h-8
                        items-center
                        justify-center gap-1
                        rounded-lg border
                        border-slate-200
                        text-[9px]
                        font-semibold
                        text-slate-500
                        transition
                        hover:border-[#0891B2]
                        hover:text-[#0891B2]
                        disabled:cursor-not-allowed
                        disabled:border-slate-100
                        disabled:bg-slate-50
                        disabled:text-slate-300
                        disabled:hover:border-slate-100
                        disabled:hover:text-slate-300
                        dark:border-slate-700
                        dark:disabled:border-slate-800
                        dark:disabled:bg-slate-900/40
                        dark:disabled:text-slate-600
                      "
                      title={
                        isBackmost
                          ? "Already at the back"
                          : "Move to the backmost layer"
                      }
                    >
                      <ArrowDownToLine
                        size={11}
                      />
                      To Back
                    </button>
                  </div>
                </div>

                  </div>
                </details>

                <details className="group rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <summary className="cursor-pointer list-none text-[9px] font-bold text-slate-500 dark:text-slate-300">
                    Appearance
                  </summary>

                  <div className="mt-2 space-y-2">

                  <label className="flex items-center justify-between gap-2 text-[9px] font-semibold text-slate-500">
                    Frame
                    <input
                      type="checkbox"
                      checked={Boolean(
                        selectedPart.showFrame
                      )}
                      onChange={(
                        event
                      ) =>
                        updatePart(
                          selectedPart.id,
                          {
                            showFrame:
                              event.target
                                .checked,
                          }
                        )
                      }
                      className="h-3.5 w-3.5 accent-[#0891B2]"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[8px] font-semibold text-slate-500">
                      Accent
                      <input
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(
                            String(
                              selectedPart.accentColor ||
                                ""
                            )
                          )
                            ? selectedPart.accentColor
                            : "#0891B2"
                        }
                        onChange={(
                          event
                        ) =>
                          updatePart(
                            selectedPart.id,
                            {
                              accentColor:
                                event.target
                                  .value,
                            }
                          )
                        }
                        className="mt-1 h-8 w-full rounded-lg border border-slate-200 p-1"
                      />
                    </label>

                    <label className="text-[8px] font-semibold text-slate-500">
                      Background
                      <input
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(
                            String(
                              selectedPart.backgroundColor ||
                                ""
                            )
                          )
                            ? selectedPart.backgroundColor
                            : "#FFFFFF"
                        }
                        onChange={(
                          event
                        ) =>
                          updatePart(
                            selectedPart.id,
                            {
                              backgroundColor:
                                event.target
                                  .value,
                            }
                          )
                        }
                        className="mt-1 h-8 w-full rounded-lg border border-slate-200 p-1"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-[8px] font-semibold text-slate-500">
                      Corner radius
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      value={
                        selectedPart.borderRadius ??
                        12
                      }
                      onChange={(
                        event
                      ) =>
                        updatePart(
                          selectedPart.id,
                          {
                            borderRadius:
                              Number(
                                event.target
                                  .value
                              ),
                          }
                        )
                      }
                      className="w-full accent-[#0891B2]"
                    />
                  </div>
                  </div>
                </details>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center p-6 text-center">
              <div>
                <Move
                  size={24}
                  className="mx-auto text-slate-300"
                />
                <div className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  Select an element
                </div>
                <div className="mt-1 text-[9px] leading-4 text-slate-400">
                  Click an item on the canvas to edit its data, size, position, layer, and appearance.
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

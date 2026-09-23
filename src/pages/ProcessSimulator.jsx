import { useEffect, useMemo, useRef, useState } from "react";
import { buildPageDraftKey, clearPageDraft, readPageDraft, writePageDraft } from "../utils/pageDraftStorage";
import {
  ChevronLeft,
  ChevronRight,
  Factory,
  Layers,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Workflow,
  ArrowRight,
  ArrowRightLeft,
  GitFork,
  Minus,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import ProcessPipeline, {
  CONNECTION_TYPES,
  buildPipeNetworkJunctions,
  ProcessPipeJunctions,
  resolveDynamicPipeDesign,
} from "../process/ProcessPipeline";
import "../process/processVisualization.css";
import {
  ASSEMBLY_COMPONENTS,
  EQUIPMENT_BY_TYPE,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_LIBRARY,
  PROCESS_MEDIA,
  makeEquipmentNode,
} from "../process/equipmentLibrary";
import { confirmAction, notify } from "../utils/feedback";
import { reverseConnectionNetwork } from "../process/reverseConnection";
import {
  buildConnectionBranchJunctions,
  canConnectionsBranch,
  getBranchPlacement,
  getConnectionKind,
} from "../process/connectionBranches";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 172;
const LIVE_POLL_INTERVAL_MS = 2000;

const MIN_NODE_WIDTH = 110;
const MIN_NODE_HEIGHT = 148;
const MAX_NODE_WIDTH = 360;
const MAX_NODE_HEIGHT = 320;

const isAssemblyNode = (node = {}) =>
  EQUIPMENT_BY_TYPE[node?.type]?.libraryGroup === "assembly";

const getNodeConstraints = (node = {}) => {
  const definition = EQUIPMENT_BY_TYPE[node?.type] || {};
  const assembly = definition.libraryGroup === "assembly";

  return {
    minWidth: Number(definition.minWidth || (assembly ? 44 : MIN_NODE_WIDTH)),
    minHeight: Number(definition.minHeight || (assembly ? 44 : MIN_NODE_HEIGHT)),
    maxWidth: Number(definition.maxWidth || (assembly ? 460 : MAX_NODE_WIDTH)),
    maxHeight: Number(definition.maxHeight || (assembly ? 420 : MAX_NODE_HEIGHT)),
    defaultWidth: Number(definition.defaultWidth || DEFAULT_NODE_WIDTH),
    defaultHeight: Number(definition.defaultHeight || DEFAULT_NODE_HEIGHT),
  };
};

const EQUIPMENT_TOP = 30;
const NODE_BOTTOM_RESERVE = 48;

// Floating equipment labels sit outside the machine body. Top-side
// connectors terminate above this label instead of passing behind/below it.
const EQUIPMENT_LABEL_HEIGHT = 26;
const EQUIPMENT_LABEL_CONNECTOR_GAP = 8;
const EQUIPMENT_VISUAL_SAFETY_PAD = 4;

const getNodeSize = (node = {}) => {
  const constraints = getNodeConstraints(node);

  return {
    width: clamp(
      Number(node?.width || constraints.defaultWidth),
      constraints.minWidth,
      constraints.maxWidth
    ),
    height: clamp(
      Number(node?.height || constraints.defaultHeight),
      constraints.minHeight,
      constraints.maxHeight
    ),
  };
};

const getEquipmentRect = (node = {}) => {
  const { width, height } = getNodeSize(node);

  if (isAssemblyNode(node)) {
    return {
      left: 3,
      top: 3,
      width: Math.max(1, width - 6),
      height: Math.max(1, height - 6),
    };
  }

  /*
   * When the live-data card is hidden, do not keep the large instrument-card
   * footprint around the machine. The compact rectangle is also used by the
   * resize handles and connector anchors, so arrows/pipes attach much closer
   * to the actual equipment visual instead of an empty outer box.
   */
  const compactVisual =
    node?.dataDisplayPosition === "hidden";

  if (compactVisual) {
    const equipmentWidth = clamp(
      width * 0.78,
      82,
      270
    );

    const equipmentHeight = clamp(
      height * 0.58,
      62,
      190
    );

    return {
      left: (width - equipmentWidth) / 2,
      top: Math.max(
        EQUIPMENT_TOP,
        (height - equipmentHeight) / 2
      ),
      width: equipmentWidth,
      height: equipmentHeight,
    };
  }

  const horizontalPadding = clamp(
    width * 0.1533,
    14,
    34
  );

  const equipmentWidth = Math.max(
    72,
    width - horizontalPadding * 2
  );

  const equipmentHeight = Math.max(
    58,
    height - EQUIPMENT_TOP - NODE_BOTTOM_RESERVE
  );

  return {
    left: horizontalPadding,
    top: EQUIPMENT_TOP,
    width: equipmentWidth,
    height: equipmentHeight,
  };
};

const getEquipmentSelectionRect = (node = {}) => {
  const equipment = getEquipmentRect(node);
  const size = getNodeSize(node);
  const pad = EQUIPMENT_VISUAL_SAFETY_PAD;

  const left = Math.max(0, equipment.left - pad);
  const top = Math.max(0, equipment.top - pad);
  const right = Math.min(size.width, equipment.left + equipment.width + pad);
  const bottom = Math.min(size.height, equipment.top + equipment.height + pad);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

const PORT_SIDES = [
  "top",
  "right",
  "bottom",
  "left",
];

const isValidPortSide = (side) =>
  PORT_SIDES.includes(side);

const normalizeAnchor = (
  anchor,
  fallbackSide = "right"
) => {
  const side =
    isValidPortSide(
      anchor?.side
    )
      ? anchor.side
      : isValidPortSide(anchor)
      ? anchor
      : fallbackSide;

  const rawOffset =
    typeof anchor === "object"
      ? Number(anchor?.offset)
      : 0.5;

  return {
    side,
    offset: clamp(
      Number.isFinite(rawOffset)
        ? rawOffset
        : 0.5,
      0.04,
      0.96
    ),
  };
};

const getEquipmentBounds = (
  node
) => {
  const equipment =
    getEquipmentRect(node);

  const left =
    Number(node?.x || 0) +
    equipment.left;

  const top =
    Number(node?.y || 0) +
    equipment.top;

  const right =
    left +
    equipment.width;

  const bottom =
    top +
    equipment.height;

  return {
    left,
    top,
    right,
    bottom,
    width:
      equipment.width,
    height:
      equipment.height,
    centerX:
      left +
      equipment.width / 2,
    centerY:
      top +
      equipment.height / 2,
  };
};

const makeAutoAnchor = () => ({
  mode: "auto",
});

const isAutoAnchor = (
  anchor
) =>
  anchor?.mode ===
  "auto";

const getSmartAnchorTowardPoint = (
  node,
  targetPoint,
  fallbackSide = "right"
) => {
  const bounds =
    getEquipmentBounds(node);

  const dx =
    Number(
      targetPoint?.x ??
        bounds.centerX
    ) -
    bounds.centerX;

  const dy =
    Number(
      targetPoint?.y ??
        bounds.centerY
    ) -
    bounds.centerY;

  if (
    Math.abs(dx) < 0.001 &&
    Math.abs(dy) < 0.001
  ) {
    return {
      mode: "auto",
      side:
        fallbackSide,
      offset: 0.5,
    };
  }

  const halfWidth =
    Math.max(
      1,
      bounds.width / 2
    );

  const halfHeight =
    Math.max(
      1,
      bounds.height / 2
    );

  const tx =
    Math.abs(dx) > 0.001
      ? halfWidth /
        Math.abs(dx)
      : Number.POSITIVE_INFINITY;

  const ty =
    Math.abs(dy) > 0.001
      ? halfHeight /
        Math.abs(dy)
      : Number.POSITIVE_INFINITY;

  if (tx <= ty) {
    const side =
      dx >= 0
        ? "right"
        : "left";

    const t = tx;

    const hitY =
      bounds.centerY +
      dy * t;

    return {
      mode: "auto",
      side,
      offset: clamp(
        (
          hitY -
          bounds.top
        ) /
          Math.max(
            1,
            bounds.height
          ),
        0.08,
        0.92
      ),
    };
  }

  const side =
    dy >= 0
      ? "bottom"
      : "top";

  const t = ty;

  const hitX =
    bounds.centerX +
    dx * t;

  return {
    mode: "auto",
    side,
    offset: clamp(
      (
        hitX -
        bounds.left
      ) /
        Math.max(
          1,
          bounds.width
        ),
      0.08,
      0.92
    ),
  };
};

const getSmartAnchorTowardNode = (
  node,
  otherNode,
  fallbackSide = "right"
) => {
  const otherBounds =
    getEquipmentBounds(
      otherNode
    );

  return getSmartAnchorTowardPoint(
    node,
    {
      x:
        otherBounds.centerX,
      y:
        otherBounds.centerY,
    },
    fallbackSide
  );
};

const resolveConnectionAnchor = (
  node,
  otherNode,
  anchorInput,
  fallbackSide
) => {
  if (
    isAutoAnchor(
      anchorInput
    )
  ) {
    return getSmartAnchorTowardNode(
      node,
      otherNode,
      fallbackSide
    );
  }

  return normalizeAnchor(
    anchorInput,
    fallbackSide
  );
};

const getAnchorPoint = (
  node,
  anchor,
  fallbackSide = "right"
) => {
  const normalized =
    normalizeAnchor(
      anchor,
      fallbackSide
    );

  const equipment =
    getEquipmentRect(node);

  const x =
    Number(node?.x || 0);
  const y =
    Number(node?.y || 0);

  const offset =
    normalized.offset;

  switch (normalized.side) {
    case "top": {
      const label = getEquipmentLabelRect(node);
      const labelTop = y + label.top;

      return {
        // Keep the top connector visually aligned with the equipment body,
        // while ending above the floating equipment-name pill.
        x:
          x +
          equipment.left +
          equipment.width *
            offset,
        y:
          Math.min(
            y + equipment.top,
            labelTop - EQUIPMENT_LABEL_CONNECTOR_GAP
          ),
      };
    }

    case "bottom":
      return {
        x:
          x +
          equipment.left +
          equipment.width *
            offset,
        y:
          y +
          equipment.top +
          equipment.height,
      };

    case "left":
      return {
        x:
          x +
          equipment.left,
        y:
          y +
          equipment.top +
          equipment.height *
            offset,
      };

    case "right":
    default:
      return {
        x:
          x +
          equipment.left +
          equipment.width,
        y:
          y +
          equipment.top +
          equipment.height *
            offset,
      };
  }
};

const getBoundaryAnchorFromPoint = (
  node,
  canvasPoint
) => {
  const equipment =
    getEquipmentRect(node);

  const left =
    Number(node?.x || 0) +
    equipment.left;

  const top =
    Number(node?.y || 0) +
    equipment.top;

  const right =
    left +
    equipment.width;

  const bottom =
    top +
    equipment.height;

  const x =
    clamp(
      Number(canvasPoint?.x || 0),
      left,
      right
    );

  const y =
    clamp(
      Number(canvasPoint?.y || 0),
      top,
      bottom
    );

  const distances = [
    {
      side: "left",
      distance:
        Math.abs(
          Number(canvasPoint?.x || 0) -
            left
        ),
    },
    {
      side: "right",
      distance:
        Math.abs(
          Number(canvasPoint?.x || 0) -
            right
        ),
    },
    {
      side: "top",
      distance:
        Math.abs(
          Number(canvasPoint?.y || 0) -
            top
        ),
    },
    {
      side: "bottom",
      distance:
        Math.abs(
          Number(canvasPoint?.y || 0) -
            bottom
        ),
    },
  ];

  distances.sort(
    (a, b) =>
      a.distance - b.distance
  );

  const side =
    distances[0]?.side ||
    "right";

  const offset =
    side === "left" ||
    side === "right"
      ? (y - top) /
        Math.max(
          1,
          equipment.height
        )
      : (x - left) /
        Math.max(
          1,
          equipment.width
        );

  return {
    ...normalizeAnchor(
      {
        side,
        offset,
      },
      side
    ),
    mode: "fixed",
  };
};

const getAnchorDirection = (
  side = "right"
) =>
  ({
    top: {
      x: 0,
      y: -1,
    },
    right: {
      x: 1,
      y: 0,
    },
    bottom: {
      x: 0,
      y: 1,
    },
    left: {
      x: -1,
      y: 0,
    },
  }[side] || {
    x: 1,
    y: 0,
  });

const pointsEqual = (
  left,
  right,
  tolerance = 0.5
) =>
  Math.abs(
    Number(left?.x || 0) -
      Number(right?.x || 0)
  ) <= tolerance &&
  Math.abs(
    Number(left?.y || 0) -
      Number(right?.y || 0)
  ) <= tolerance;

const simplifyOrthogonalVertices = (
  input = []
) => {
  const result = [];

  input.forEach((point) => {
    if (
      !point ||
      !Number.isFinite(
        Number(point.x)
      ) ||
      !Number.isFinite(
        Number(point.y)
      )
    ) {
      return;
    }

    const normalized = {
      x: Number(point.x),
      y: Number(point.y),
    };

    if (
      result.length &&
      pointsEqual(
        result[
          result.length - 1
        ],
        normalized
      )
    ) {
      return;
    }

    result.push(normalized);

    while (
      result.length >= 3
    ) {
      const a =
        result[
          result.length - 3
        ];
      const b =
        result[
          result.length - 2
        ];
      const c =
        result[
          result.length - 1
        ];

      const sameX =
        Math.abs(
          a.x - b.x
        ) < 0.5 &&
        Math.abs(
          b.x - c.x
        ) < 0.5;

      const sameY =
        Math.abs(
          a.y - b.y
        ) < 0.5 &&
        Math.abs(
          b.y - c.y
        ) < 0.5;

      if (!sameX && !sameY) {
        break;
      }

      result.splice(
        result.length - 2,
        1
      );
    }
  });

  return result;
};

const orthogonalizeVertices = (
  desired = []
) => {
  const result = [];

  desired.forEach(
    (candidate) => {
      if (
        !candidate ||
        !Number.isFinite(
          Number(candidate.x)
        ) ||
        !Number.isFinite(
          Number(candidate.y)
        )
      ) {
        return;
      }

      const next = {
        x:
          Number(candidate.x),
        y:
          Number(candidate.y),
      };

      if (!result.length) {
        result.push(next);
        return;
      }

      const current =
        result[
          result.length - 1
        ];

      if (
        pointsEqual(
          current,
          next
        )
      ) {
        return;
      }

      const sameX =
        Math.abs(
          current.x -
            next.x
        ) < 0.5;

      const sameY =
        Math.abs(
          current.y -
            next.y
        ) < 0.5;

      if (sameX || sameY) {
        result.push(next);
        return;
      }

      let preferHorizontal =
        true;

      if (result.length >= 2) {
        const previous =
          result[
            result.length - 2
          ];

        const previousHorizontal =
          Math.abs(
            previous.y -
              current.y
          ) < 0.5;

        // Continue in the previous
        // direction first, then turn.
        preferHorizontal =
          previousHorizontal;
      } else {
        preferHorizontal =
          Math.abs(
            next.x -
              current.x
          ) >=
          Math.abs(
            next.y -
              current.y
          );
      }

      result.push(
        preferHorizontal
          ? {
              x: next.x,
              y: current.y,
            }
          : {
              x: current.x,
              y: next.y,
            }
      );

      result.push(next);
    }
  );

  return simplifyOrthogonalVertices(
    result
  );
};

const verticesToPath = (
  vertices = []
) => {
  if (!vertices.length) {
    return "";
  }

  return [
    `M ${vertices[0].x} ${vertices[0].y}`,
    ...vertices
      .slice(1)
      .map(
        (point) =>
          `L ${point.x} ${point.y}`
      ),
  ].join(" ");
};

const distanceToSegment = (
  point,
  start,
  end
) => {
  const px =
    Number(point?.x || 0);
  const py =
    Number(point?.y || 0);

  const x1 =
    Number(start?.x || 0);
  const y1 =
    Number(start?.y || 0);

  const x2 =
    Number(end?.x || 0);
  const y2 =
    Number(end?.y || 0);

  const dx =
    x2 - x1;
  const dy =
    y2 - y1;

  const lengthSquared =
    dx * dx + dy * dy;

  if (lengthSquared <= 0.0001) {
    return Math.hypot(
      px - x1,
      py - y1
    );
  }

  const t = clamp(
    (
      (px - x1) * dx +
      (py - y1) * dy
    ) /
      lengthSquared,
    0,
    1
  );

  const projectedX =
    x1 + t * dx;
  const projectedY =
    y1 + t * dy;

  return Math.hypot(
    px - projectedX,
    py - projectedY
  );
};

const projectPointToSegment = (
  point,
  start,
  end
) => {
  const px =
    Number(point?.x || 0);
  const py =
    Number(point?.y || 0);

  const x1 =
    Number(start?.x || 0);
  const y1 =
    Number(start?.y || 0);

  const x2 =
    Number(end?.x || 0);
  const y2 =
    Number(end?.y || 0);

  const dx =
    x2 - x1;
  const dy =
    y2 - y1;

  const lengthSquared =
    dx * dx + dy * dy;

  if (
    lengthSquared <=
    0.0001
  ) {
    return {
      x: x1,
      y: y1,
      t: 0,
      distance:
        Math.hypot(
          px - x1,
          py - y1
        ),
    };
  }

  const t = clamp(
    (
      (px - x1) * dx +
      (py - y1) * dy
    ) /
      lengthSquared,
    0,
    1
  );

  const x =
    x1 +
    t * dx;

  const y =
    y1 +
    t * dy;

  return {
    x,
    y,
    t,
    distance:
      Math.hypot(
        px - x,
        py - y
      ),
  };
};

const getPortButtonStyle = (
  node,
  side
) => {
  const equipment =
    getEquipmentRect(node);

  switch (side) {
    case "top":
      return {
        left:
          equipment.left +
          equipment.width / 2 -
          8,
        top:
          equipment.top - 8,
      };

    case "bottom":
      return {
        left:
          equipment.left +
          equipment.width / 2 -
          8,
        top:
          equipment.top +
          equipment.height -
          8,
      };

    case "left":
      return {
        left:
          equipment.left - 8,
        top:
          equipment.top +
          equipment.height / 2 -
          8,
      };

    case "right":
    default:
      return {
        left:
          equipment.left +
          equipment.width -
          8,
        top:
          equipment.top +
          equipment.height / 2 -
          8,
      };
  }
};

const getLabelOffset = (
  node = {}
) => ({
  x:
    Number.isFinite(
      Number(
        node?.labelOffset?.x
      )
    )
      ? Number(
          node.labelOffset.x
        )
      : 0,

  y:
    Number.isFinite(
      Number(
        node?.labelOffset?.y
      )
    )
      ? Number(
          node.labelOffset.y
        )
      : 0,
});

const getEquipmentLabelRect = (node = {}) => {
  const size = getNodeSize(node);
  const offset = getLabelOffset(node);
  const text = String(node?.label || "Equipment");

  // Approximate the rendered pill width closely enough for connector routing.
  // The label itself remains independently draggable.
  const width = clamp(
    28 + text.length * 5.8,
    66,
    220
  );

  return {
    left: size.width / 2 + offset.x - width / 2,
    top: offset.y,
    width,
    height: EQUIPMENT_LABEL_HEIGHT,
  };
};

const getEquipmentLabelStyle = (
  node = {}
) => {
  const size =
    getNodeSize(node);

  const offset =
    getLabelOffset(node);

  return {
    left:
      size.width / 2 +
      offset.x,
    top:
      offset.y,
    transform:
      "translateX(-50%)",
  };
};

const getResizeHandleStyle = (
  node,
  direction
) => {
  const equipment =
    getEquipmentSelectionRect(node);

  const left =
    equipment.left;
  const right =
    equipment.left +
    equipment.width;
  const top =
    equipment.top;
  const bottom =
    equipment.top +
    equipment.height;
  const centerX =
    left +
    equipment.width / 2;
  const centerY =
    top +
    equipment.height / 2;

  const size = 10;
  const half = size / 2;

  const map = {
    nw: {
      left: left - half,
      top: top - half,
      cursor: "nwse-resize",
    },
    n: {
      left: centerX - half,
      top: top - half,
      cursor: "ns-resize",
    },
    ne: {
      left: right - half,
      top: top - half,
      cursor: "nesw-resize",
    },
    e: {
      left: right - half,
      top: centerY - half,
      cursor: "ew-resize",
    },
    se: {
      left: right - half,
      top: bottom - half,
      cursor: "nwse-resize",
    },
    s: {
      left: centerX - half,
      top: bottom - half,
      cursor: "ns-resize",
    },
    sw: {
      left: left - half,
      top: bottom - half,
      cursor: "nesw-resize",
    },
    w: {
      left: left - half,
      top: centerY - half,
      cursor: "ew-resize",
    },
  };

  return map[direction];
};

const DATA_DISPLAY_POSITIONS = new Set([
  "bottom",
  "top",
  "left",
  "right",
  "hidden",
]);

const normalizeDataDisplayPosition = (value) =>
  DATA_DISPLAY_POSITIONS.has(value)
    ? value
    : "bottom";

const getDataDisplayStyle = (position, node = {}) => {
  const { width } = getNodeSize(node);
  switch (normalizeDataDisplayPosition(position)) {
    case "top":
      return {
        left: "50%",
        top: -58,
        transform: "translateX(-50%)",
      };

    case "left":
      return {
        left: -154,
        top: 42,
      };

    case "right":
      return {
        left: width + 8,
        top: 42,
      };

    case "hidden":
      return {
        display: "none",
      };

    case "bottom":
    default:
      return {
        left: "50%",
        top: getEquipmentRect(node).top + getEquipmentRect(node).height + 6,
        transform: "translateX(-50%)",
      };
  }
};

const DEFAULT_VISIBLE_METRIC_COUNT = 2;
const MAX_VISIBLE_METRICS = 6;

const DEFAULT_STATUS_MAPPINGS = [
  {
    value: "0",
    label: "OFF",
  },
  {
    value: "1",
    label: "ON",
  },
];

const normalizeStatusMappings = (mappings) => {
  const source =
    Array.isArray(mappings) &&
    mappings.length > 0
      ? mappings
      : DEFAULT_STATUS_MAPPINGS;

  return source.map(
    (mapping, index) => ({
      id:
        mapping?.id ||
        `status-${index}`,
      value: String(
        mapping?.value ?? index
      ),
      label: String(
        mapping?.label ??
          mapping?.status ??
          mapping?.value ??
          index
      ),
    })
  );
};

const normalizeMetric = (
  metric,
  fallbackId = "metric"
) => {
  const kind =
    metric?.kind === "status"
      ? "status"
      : "number";

  return {
    id: String(
      metric?.id || fallbackId
    ),
    label: String(
      metric?.label ||
        metric?.id ||
        "Data"
    ),
    unit: String(metric?.unit || ""),
    kind,
    min: Number.isFinite(
      Number(metric?.min)
    )
      ? Number(metric.min)
      : 0,
    max: Number.isFinite(
      Number(metric?.max)
    )
      ? Number(metric.max)
      : 100,
    custom: Boolean(metric?.custom),

    statusMappings:
      kind === "status"
        ? normalizeStatusMappings(
            metric?.statusMappings ||
              metric?.statusMap
          )
        : [],
  };
};

const withNodeStatusMappings = (
  node,
  metric
) => {
  if (metric.kind !== "status") {
    return metric;
  }

  return {
    ...metric,
    statusMappings:
      normalizeStatusMappings(
        node?.statusMappings?.[
          metric.id
        ] ||
          metric.statusMappings
      ),
  };
};

const getNodeMetricDefinitions = (
  node
) => {
  const defaults =
    (
      EQUIPMENT_BY_TYPE[
        node?.type
      ]?.metrics || []
    ).map((metric) =>
      withNodeStatusMappings(
        node,
        normalizeMetric(metric)
      )
    );

  const defaultIds =
    new Set(
      defaults.map(
        (metric) => metric.id
      )
    );

  const custom =
    (
      Array.isArray(
        node?.customMetrics
      )
        ? node.customMetrics
        : []
    )
      .map((metric, index) =>
        withNodeStatusMappings(
          node,
          normalizeMetric(
            {
              ...metric,
              custom: true,
            },
            `custom-${index + 1}`
          )
        )
      )
      .filter(
        (metric) =>
          metric.id &&
          !defaultIds.has(metric.id)
      );

  return [
    ...defaults,
    ...custom,
  ];
};

const getHiddenDefaultMetricIds = (
  node
) =>
  Array.isArray(
    node?.hiddenDefaultMetricIds
  )
    ? node.hiddenDefaultMetricIds
    : [];

const getVisibleMetricIds = (node) => {
  if (Array.isArray(node?.displayMetricIds)) {
    return node.displayMetricIds;
  }

  return getNodeMetricDefinitions(node)
    .slice(0, DEFAULT_VISIBLE_METRIC_COUNT)
    .map((metric) => metric.id);
};

const PIPE_COLOR_PRESETS = [
  { label: "Default", value: "" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Red", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Green", value: "#22C55E" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Gold", value: "#D8A444" },
];

const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1300;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseLayout = (template) => {
  if (!template?.layout) return {};

  if (typeof template.layout === "string") {
    try {
      return JSON.parse(template.layout);
    } catch {
      return {};
    }
  }

  return template.layout || {};
};

const getMappedSources = (layout) => {
  if (
    layout?.dataSources &&
    typeof layout.dataSources === "object" &&
    !Array.isArray(layout.dataSources)
  ) {
    return layout.dataSources;
  }

  return (layout?.customDataOptions || []).reduce((result, option) => {
    if (option?.key && option?.source) {
      result[option.key] = option.source;
    }

    return result;
  }, {});
};

const hashText = (text) => {
  let hash = 2166136261;
  const value = String(text || "");

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
};

const fakeMetricValue = (nodeId, metric, clock) => {
  const seed = hashText(`${nodeId}:${metric.id}`);

  if (metric.kind === "status") {
    return Math.sin(clock / 11000 + seed) > -0.72 ? 1 : 0;
  }

  const minimum = Number(metric.min ?? 0);
  const maximum = Number(metric.max ?? minimum + 100);
  const span = Math.max(0.0001, maximum - minimum);
  const midpoint = minimum + span * 0.52;
  const amplitude = span * 0.18;
  const slowWave = Math.sin(clock / 5200 + seed * 0.0017);
  const fastWave = Math.sin(clock / 1700 + seed * 0.0031) * 0.25;
  const value = clamp(midpoint + amplitude * (slowWave + fastWave), minimum, maximum);

  return metric.kind === "integer" ? Math.round(value) : Number(value.toFixed(1));
};

const statusValuesMatch = (
  actual,
  configured
) => {
  const actualNumber =
    Number(actual);
  const configuredNumber =
    Number(configured);

  if (
    Number.isFinite(actualNumber) &&
    Number.isFinite(
      configuredNumber
    )
  ) {
    return (
      actualNumber ===
      configuredNumber
    );
  }

  return (
    String(actual) ===
    String(configured)
  );
};

const formatMetricValue = (
  value,
  metric
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    metric?.kind === "status"
  ) {
    const mappings =
      normalizeStatusMappings(
        metric?.statusMappings
      );

    const matched =
      mappings.find(
        (mapping) =>
          statusValuesMatch(
            value,
            mapping.value
          )
      );

    // Keep the raw value visible when
    // it has not been configured yet.
    return matched
      ? matched.label
      : String(value);
  }

  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return Number.isInteger(numeric)
    ? numeric.toLocaleString()
    : numeric.toFixed(1);
};

const getConnectionWaypoints = (
  connection = {}
) => {
  if (
    Array.isArray(
      connection.waypoints
    )
  ) {
    return connection.waypoints
      .filter(
        (point) =>
          point &&
          Number.isFinite(
            Number(point.x)
          ) &&
          Number.isFinite(
            Number(point.y)
          )
      )
      .map(
        (point) => ({
          x:
            Number(point.x),
          y:
            Number(point.y),
        })
      );
  }

  // V7 backward compatibility.
  if (
    connection.routePoint &&
    Number.isFinite(
      Number(
        connection.routePoint.x
      )
    ) &&
    Number.isFinite(
      Number(
        connection.routePoint.y
      )
    )
  ) {
    return [
      {
        x:
          Number(
            connection.routePoint.x
          ),
        y:
          Number(
            connection.routePoint.y
          ),
      },
    ];
  }

  return [];
};

const getConnectionLabelOffset = (
  connection = {}
) => ({
  x: Number.isFinite(
    Number(
      connection?.labelOffset?.x
    )
  )
    ? Number(
        connection.labelOffset.x
      )
    : 0,
  y: Number.isFinite(
    Number(
      connection?.labelOffset?.y
    )
  )
    ? Number(
        connection.labelOffset.y
      )
    : 0,
});

const getConnectionLabelPoint = (
  connection = {},
  geometry = {}
) => {
  const base =
    geometry?.labelPoint || {
      x: 0,
      y: 0,
    };

  const offset =
    getConnectionLabelOffset(
      connection
    );

  return {
    x: clamp(
      Number(base.x || 0) +
        offset.x,
      54,
      CANVAS_WIDTH - 54
    ),
    y: clamp(
      Number(base.y || 0) +
        offset.y,
      18,
      CANVAS_HEIGHT - 18
    ),
  };
};

const getEdgeGeometry = (
  sourceNode,
  targetNode,
  sourceAnchorInput,
  targetAnchorInput,
  waypoints = []
) => {
  const sourceAnchor =
    resolveConnectionAnchor(
      sourceNode,
      targetNode,
      sourceAnchorInput,
      "right"
    );

  const targetAnchor =
    resolveConnectionAnchor(
      targetNode,
      sourceNode,
      targetAnchorInput,
      "left"
    );

  const source =
    getAnchorPoint(
      sourceNode,
      sourceAnchor,
      "right"
    );

  const target =
    getAnchorPoint(
      targetNode,
      targetAnchor,
      "left"
    );

  const offset = 28;

  const sourceDirection =
    getAnchorDirection(
      sourceAnchor.side
    );

  const targetDirection =
    getAnchorDirection(
      targetAnchor.side
    );

  const sourceOuter = {
    x:
      source.x +
      sourceDirection.x *
        offset,
    y:
      source.y +
      sourceDirection.y *
        offset,
  };

  const targetOuter = {
    x:
      target.x +
      targetDirection.x *
        offset,
    y:
      target.y +
      targetDirection.y *
        offset,
  };

  const cleanedWaypoints =
    Array.isArray(waypoints)
      ? waypoints
          .filter(
            (point) =>
              point &&
              Number.isFinite(
                Number(point.x)
              ) &&
              Number.isFinite(
                Number(point.y)
              )
          )
          .map(
            (point) => ({
              x:
                Number(point.x),
              y:
                Number(point.y),
            })
          )
      : [];

  let vertices;

  if (cleanedWaypoints.length) {
    const internal =
      orthogonalizeVertices([
        sourceOuter,
        ...cleanedWaypoints,
        targetOuter,
      ]);

    vertices = [
      source,
      ...internal,
      target,
    ];
  } else {
    const sourceHorizontal =
      sourceAnchor.side ===
        "left" ||
      sourceAnchor.side ===
        "right";

    const targetHorizontal =
      targetAnchor.side ===
        "left" ||
      targetAnchor.side ===
        "right";

    if (
      sourceHorizontal &&
      targetHorizontal
    ) {
      const midX =
        (
          sourceOuter.x +
          targetOuter.x
        ) /
        2;

      const internal =
        simplifyOrthogonalVertices([
          sourceOuter,
          {
            x: midX,
            y:
              sourceOuter.y,
          },
          {
            x: midX,
            y:
              targetOuter.y,
          },
          targetOuter,
        ]);

      vertices = [
        source,
        ...internal,
        target,
      ];
    } else if (
      !sourceHorizontal &&
      !targetHorizontal
    ) {
      const midY =
        (
          sourceOuter.y +
          targetOuter.y
        ) /
        2;

      const internal =
        simplifyOrthogonalVertices([
          sourceOuter,
          {
            x:
              sourceOuter.x,
            y: midY,
          },
          {
            x:
              targetOuter.x,
            y: midY,
          },
          targetOuter,
        ]);

      vertices = [
        source,
        ...internal,
        target,
      ];
    } else if (
      sourceHorizontal
    ) {
      const internal =
        simplifyOrthogonalVertices([
          sourceOuter,
          {
            x:
              sourceOuter.x,
            y:
              targetOuter.y,
          },
          targetOuter,
        ]);

      vertices = [
        source,
        ...internal,
        target,
      ];
    } else {
      const internal =
        simplifyOrthogonalVertices([
          sourceOuter,
          {
            x:
              targetOuter.x,
            y:
              sourceOuter.y,
          },
          targetOuter,
        ]);

      vertices = [
        source,
        ...internal,
        target,
      ];
    }
  }

  const segments =
    vertices
      .slice(0, -1)
      .map(
        (start, index) => {
          const end =
            vertices[
              index + 1
            ];

          const horizontal =
            Math.abs(
              start.y - end.y
            ) < 0.5;

          return {
            index,
            start,
            end,
            orientation:
              horizontal
                ? "horizontal"
                : "vertical",
            midpoint: {
              x:
                (
                  start.x +
                  end.x
                ) /
                2,
              y:
                (
                  start.y +
                  end.y
                ) /
                2,
            },
            // Keep the small stubs
            // physically attached to
            // the equipment locked.
            draggable:
              index > 0 &&
              index <
                vertices.length -
                  2,
          };
        }
      );

  const middleVertex =
    vertices[
      Math.floor(
        vertices.length / 2
      )
    ] ||
    {
      x:
        (
          source.x +
          target.x
        ) /
        2,
      y:
        (
          source.y +
          target.y
        ) /
        2,
    };

  return {
    path:
      verticesToPath(vertices),
    source,
    target,
    sourceOuter,
    targetOuter,
    sourceAnchor,
    targetAnchor,
    vertices,
    segments,
    labelPoint: {
      x:
        middleVertex.x,
      y:
        middleVertex.y -
        22,
    },
    manual:
      cleanedWaypoints.length > 0,
  };
};

const makeConnection = (
  source,
  target,
  sourceAnchorInput = {
    side: "right",
    offset: 0.5,
  },
  targetAnchorInput = {
    side: "left",
    offset: 0.5,
  },
  waypoints = [],
  connectorType = "pipeline"
) => {
  const sourceAnchor =
    isAutoAnchor(
      sourceAnchorInput
    )
      ? makeAutoAnchor()
      : {
          ...normalizeAnchor(
            sourceAnchorInput,
            "right"
          ),
          mode:
            sourceAnchorInput
              ?.mode ||
            "fixed",
        };

  const targetAnchor =
    isAutoAnchor(
      targetAnchorInput
    )
      ? makeAutoAnchor()
      : {
          ...normalizeAnchor(
            targetAnchorInput,
            "left"
          ),
          mode:
            targetAnchorInput
              ?.mode ||
            "fixed",
        };

  return {
    id:
      `pipe-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    source,
    target,

    // V8 smart perimeter anchors.
    sourceAnchor,
    targetAnchor,

    // Keep the old side fields so
    // older Process View versions can
    // still render the connection.
    sourcePort:
      sourceAnchor.side ||
      "right",
    targetPort:
      targetAnchor.side ||
      "left",

    connectorType:
      ["pipeline", "conveyor", "arrow", "line"].includes(
        connectorType
      )
        ? connectorType
        : "pipeline",

    // V29: Line is intentionally simple: one straight segment with only
    // draggable endpoints. Pipeline / Arrow keep Diagram routing.
    routingMode:
      connectorType === "line"
        ? "simple"
        : "diagram",

    medium: "steam",
    label: "",
    labelOffset: {
      x: 0,
      y: 0,
    },
    dataKey: "",

    pipeDesign:
      "auto",
    colorOverride: "",
    animateFlow: true,

    // V8 explicit routing bends.
    waypoints:
      Array.isArray(waypoints)
        ? waypoints
        : [],

    // Legacy V7 field. New edits
    // use waypoints instead.
    routePoint: null,
  };
};

const makeFreeConnection = (
  connectorType,
  centerX,
  centerY
) => {
  const halfLength = 90;

  return {
    ...makeConnection(
      null,
      null,
      makeAutoAnchor(),
      makeAutoAnchor(),
      [],
      connectorType
    ),

    source: null,
    target: null,

    sourceAnchor: null,
    targetAnchor: null,

    freeSource: {
      x:
        clamp(
          Number(centerX) -
            halfLength,
          12,
          CANVAS_WIDTH - 12
        ),
      y:
        clamp(
          Number(centerY),
          12,
          CANVAS_HEIGHT - 12
        ),
    },

    freeTarget: {
      x:
        clamp(
          Number(centerX) +
            halfLength,
          12,
          CANVAS_WIDTH - 12
        ),
      y:
        clamp(
          Number(centerY),
          12,
          CANVAS_HEIGHT - 12
        ),
    },

    waypoints: [],
    routePoint: null,
  };
};

const normalizePolylinePoints = (
  points = []
) => {
  const result = [];

  points.forEach((point) => {
    if (
      !point ||
      !Number.isFinite(Number(point.x)) ||
      !Number.isFinite(Number(point.y))
    ) {
      return;
    }

    const normalized = {
      x: Number(point.x),
      y: Number(point.y),
    };

    const previous =
      result[result.length - 1];

    if (
      previous &&
      pointsEqual(
        previous,
        normalized
      )
    ) {
      return;
    }

    result.push(normalized);
  });

  return result;
};

const getPolylineGeometry = (
  sourcePoint,
  targetPoint,
  waypoints = [],
  extra = {}
) => {
  const source = {
    x: Number(sourcePoint?.x || 0),
    y: Number(sourcePoint?.y || 0),
  };

  const target = {
    x: Number(targetPoint?.x || 0),
    y: Number(targetPoint?.y || 0),
  };

  const cleanedWaypoints =
    normalizePolylinePoints(
      Array.isArray(waypoints)
        ? waypoints
        : []
    );

  const vertices =
    normalizePolylinePoints([
      source,
      ...cleanedWaypoints,
      target,
    ]);

  const segments =
    vertices
      .slice(0, -1)
      .map((start, index) => {
        const end =
          vertices[index + 1];

        return {
          index,
          start,
          end,
          orientation: "free",
          midpoint: {
            x:
              (start.x + end.x) /
              2,
            y:
              (start.y + end.y) /
              2,
          },
          draggable: true,
        };
      });

  const labelSegment =
    [...segments]
      .map((segment) => ({
        ...segment,
        length: Math.hypot(
          segment.end.x -
            segment.start.x,
          segment.end.y -
            segment.start.y
        ),
      }))
      .sort(
        (left, right) =>
          right.length -
          left.length
      )[0];

  const labelPoint =
    labelSegment?.midpoint || {
      x:
        (source.x + target.x) /
        2,
      y:
        (source.y + target.y) /
        2,
    };

  return {
    path:
      verticesToPath(vertices),
    source,
    target,
    vertices,
    segments,
    labelPoint: {
      x: labelPoint.x,
      y: labelPoint.y - 18,
    },
    manual:
      cleanedWaypoints.length > 0,
    flexible: true,
    ...extra,
  };
};

const getFlexibleAttachedGeometry = (
  sourceNode,
  targetNode,
  sourceAnchorInput,
  targetAnchorInput,
  waypoints = []
) => {
  const sourceAnchor = resolveConnectionAnchor(
    sourceNode, targetNode, sourceAnchorInput, "right"
  );
  const targetAnchor = resolveConnectionAnchor(
    targetNode, sourceNode, targetAnchorInput, "left"
  );
  const source = getAnchorPoint(sourceNode, sourceAnchor, sourceAnchor.side);
  const target = getAnchorPoint(targetNode, targetAnchor, targetAnchor.side);

  const stubLength = 22;
  const sourceDirection = getAnchorDirection(sourceAnchor.side);
  const targetDirection = getAnchorDirection(targetAnchor.side);
  const sourceOuter = {
    x: source.x + sourceDirection.x * stubLength,
    y: source.y + sourceDirection.y * stubLength,
  };
  const targetOuter = {
    x: target.x + targetDirection.x * stubLength,
    y: target.y + targetDirection.y * stubLength,
  };

  const cleanedWaypoints = normalizePolylinePoints(
    Array.isArray(waypoints) ? waypoints : []
  );
  const vertices = normalizePolylinePoints([
    source, sourceOuter, ...cleanedWaypoints, targetOuter, target,
  ]);

  const segments = vertices.slice(0, -1).map((start, index) => {
    const end = vertices[index + 1];
    const isStub = index === 0 || index === vertices.length - 2;
    return {
      index, start, end, orientation: "free",
      midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      draggable: !isStub,
      waypointInsertIndex: clamp(index - 1, 0, cleanedWaypoints.length),
    };
  });

  const labelSegment = [...segments]
    .filter((segment) => segment.draggable)
    .map((segment) => ({
      ...segment,
      length: Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y),
    }))
    .sort((a, b) => b.length - a.length)[0];
  const labelPoint = labelSegment?.midpoint || {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  };

  return {
    path: verticesToPath(vertices),
    source, target, sourceOuter, targetOuter, sourceAnchor, targetAnchor,
    vertices, segments,
    labelPoint: { x: labelPoint.x, y: labelPoint.y - 18 },
    manual: cleanedWaypoints.length > 0,
    flexible: true,
    free: false,
  };
};

const isFlexibleConnector = (
  connection
) =>
  ["conveyor", "arrow", "line"].includes(
    connection?.connectorType ||
      (
        connection?.connectionStyle ===
        "arrows"
          ? "arrow"
          : "pipeline"
      )
  );

const getConnectionRoutingMode = (connection = {}) => {
  const connectorType =
    connection?.connectorType ||
    (connection?.connectionStyle === "arrows" ? "arrow" : "pipeline");

  // V29.2: Line keeps one simple interaction mode. It starts straight, but
  // the route itself may be pulled into lightweight free bends. There is no
  // routing-mode selector for Line; endpoint + bend editing is always direct.
  if (connectorType === "line") {
    return "simple";
  }

  const saved = String(connection?.routingMode || "").toLowerCase();

  if (["diagram", "auto", "circuit", "flexible", "free"].includes(saved)) {
    return saved;
  }

  return isFlexibleConnector(connection) ? "free" : "auto";
};

const isFreeformRoutingConnection = (connection) =>
  ["diagram", "flexible", "free", "simple"].includes(
    getConnectionRoutingMode(connection)
  );

// Circuit mode is intentionally orthogonal, but unlike Auto it is
// immediately editable when the connection is selected. This gives
// a circuit-board / wiring-diagram feel without forcing the user into
// the full advanced route editor first.
const isCircuitRoutingConnection = (connection) =>
  getConnectionRoutingMode(connection) === "circuit";

const pointInsideExpandedBounds = (
  point,
  bounds,
  padding = 28
) =>
  Number(point?.x) >=
    Number(bounds?.left) -
      padding &&
  Number(point?.x) <=
    Number(bounds?.right) +
      padding &&
  Number(point?.y) >=
    Number(bounds?.top) -
      padding &&
  Number(point?.y) <=
    Number(bounds?.bottom) +
      padding;

const getLooseEdgeGeometry = (
  sourcePoint,
  targetPoint,
  waypoints = []
) => {
  const source = {
    x:
      Number(sourcePoint?.x || 0),
    y:
      Number(sourcePoint?.y || 0),
  };

  const target = {
    x:
      Number(targetPoint?.x || 0),
    y:
      Number(targetPoint?.y || 0),
  };

  const cleanedWaypoints =
    Array.isArray(waypoints)
      ? waypoints
          .filter(
            (point) =>
              point &&
              Number.isFinite(
                Number(point.x)
              ) &&
              Number.isFinite(
                Number(point.y)
              )
          )
          .map(
            (point) => ({
              x:
                Number(point.x),
              y:
                Number(point.y),
            })
          )
      : [];

  let vertices;

  if (cleanedWaypoints.length) {
    vertices =
      orthogonalizeVertices([
        source,
        ...cleanedWaypoints,
        target,
      ]);
  } else if (
    Math.abs(
      source.x -
        target.x
    ) < 0.5 ||
    Math.abs(
      source.y -
        target.y
    ) < 0.5
  ) {
    vertices = [
      source,
      target,
    ];
  } else {
    const midX =
      (
        source.x +
        target.x
      ) /
      2;

    vertices =
      simplifyOrthogonalVertices([
        source,
        {
          x: midX,
          y: source.y,
        },
        {
          x: midX,
          y: target.y,
        },
        target,
      ]);
  }

  const segments =
    vertices
      .slice(0, -1)
      .map(
        (start, index) => {
          const end =
            vertices[
              index + 1
            ];

          const horizontal =
            Math.abs(
              start.y -
                end.y
            ) < 0.5;

          return {
            index,
            start,
            end,
            orientation:
              horizontal
                ? "horizontal"
                : "vertical",
            midpoint: {
              x:
                (
                  start.x +
                  end.x
                ) /
                2,
              y:
                (
                  start.y +
                  end.y
                ) /
                2,
            },
            draggable: true,
          };
        }
      );

  const middle =
    vertices[
      Math.floor(
        vertices.length / 2
      )
    ] || {
      x:
        (
          source.x +
          target.x
        ) /
        2,
      y:
        (
          source.y +
          target.y
        ) /
        2,
    };

  return {
    path:
      verticesToPath(
        vertices
      ),
    source,
    target,
    vertices,
    segments,
    labelPoint: {
      x: middle.x,
      y: middle.y - 22,
    },
    manual:
      cleanedWaypoints.length >
      0,
    free: true,
  };
};

const getStoredTopologyKey = (templateId) =>
  `palm-oil-process-simulator:${String(templateId || "standalone")}`;

const LATEST_TOPOLOGY_KEY =
  "palm-oil-process-simulator:last-saved";

const getInitialDemo = () => {
  const node = (
    type,
    x,
    y,
    id,
    label,
    dataDisplayPosition = "bottom"
  ) => ({
    ...makeEquipmentNode(
      type,
      x,
      y,
      1
    ),
    id,
    label,
    dataDisplayPosition,
  });

  const connect = (
    id,
    source,
    target,
    {
      connectorType = "pipeline",
      medium = "fruit",
      label = "",
      colorOverride = "",
      pipeDesign = "auto",
      waypoints = [],
      animateFlow = true,
    } = {}
  ) => ({
    ...makeConnection(
      source,
      target,
      makeAutoAnchor(),
      makeAutoAnchor(),
      waypoints,
      connectorType
    ),
    id,
    medium,
    label,
    colorOverride,
    pipeDesign,
    animateFlow,
  });

  return {
    mode: "fake",
    dataSources: {},

    nodes: [
      node(
        "palm-fruit-bunch",
        80,
        300,
        "sample-ffb",
        "Fresh Fruit Bunch",
        "hidden"
      ),
      node(
        "conveyor",
        300,
        300,
        "sample-conveyor",
        "Process Conveyor"
      ),
      node(
        "sterilizer",
        540,
        300,
        "sample-sterilizer",
        "Sterilizer"
      ),
      node(
        "thresher",
        780,
        300,
        "sample-thresher",
        "Thresher"
      ),
      node(
        "digester",
        1020,
        300,
        "sample-digester",
        "Digester"
      ),

      node(
        "screw-press",
        1020,
        640,
        "sample-press",
        "Screw Press"
      ),
      node(
        "clarifier",
        780,
        640,
        "sample-clarifier",
        "Clarification Tank"
      ),
      node(
        "oil-separator",
        540,
        640,
        "sample-separator",
        "Disc Separator"
      ),
      node(
        "vacuum-dryer",
        300,
        640,
        "sample-dryer",
        "Vacuum Dryer"
      ),
      node(
        "palm-oil",
        80,
        640,
        "sample-output",
        "Palm Oil Output",
        "hidden"
      ),

      node(
        "boiler",
        535,
        40,
        "sample-boiler",
        "Boiler"
      ),
      node(
        "genset",
        1015,
        40,
        "sample-genset",
        "Generator Set"
      ),
      node(
        "decanter",
        785,
        930,
        "sample-decanter",
        "Decanter Centrifuge"
      ),
      node(
        "filter-press",
        540,
        930,
        "sample-filter",
        "Oil Filter Press"
      ),
    ],

    connections: [
      // Main material route. Arrow demonstrates the new flexible
      // draw.io-like editing behavior.
      connect(
        "sample-arrow-1",
        "sample-ffb",
        "sample-conveyor",
        {
          connectorType: "pipeline",
          pipeDesign: "conveyorTrack",
          medium: "fruit",
          label:
            "Fresh Fruit Bunch",
          colorOverride:
            "#F97316",
        }
      ),
      connect(
        "sample-arrow-2",
        "sample-conveyor",
        "sample-sterilizer",
        {
          connectorType: "pipeline",
          pipeDesign: "conveyorTrack",
          medium: "fruit",
          label:
            "FFB Feed",
          colorOverride:
            "#F97316",
        }
      ),
      connect(
        "sample-arrow-3",
        "sample-sterilizer",
        "sample-thresher",
        {
          connectorType: "pipeline",
          pipeDesign: "conveyorTrack",
          medium: "fruit",
          label:
            "Sterilized Fruit",
          colorOverride:
            "#FB7185",
        }
      ),
      connect(
        "sample-arrow-4",
        "sample-thresher",
        "sample-digester",
        {
          connectorType: "pipeline",
          pipeDesign: "conveyorTrack",
          medium: "fruit",
          label:
            "Loose Fruit",
          colorOverride:
            "#F59E0B",
        }
      ),
      connect(
        "sample-arrow-5",
        "sample-digester",
        "sample-press",
        {
          connectorType: "pipeline",
          pipeDesign: "conveyorTrack",
          medium: "fruit",
          label:
            "Digested Mash",
          colorOverride:
            "#A78BFA",
        }
      ),

      // Oil route in the lower row.
      connect(
        "sample-pipe-1",
        "sample-press",
        "sample-clarifier",
        {
          medium: "crudeOil",
          label: "Press Liquor",
          colorOverride:
            "#D97706",
          pipeDesign:
            "realPipe",
        }
      ),
      connect(
        "sample-pipe-2",
        "sample-clarifier",
        "sample-separator",
        {
          medium: "oil",
          label: "Clarified Oil",
          colorOverride:
            "#D8A444",
          pipeDesign:
            "realPipe",
        }
      ),
      connect(
        "sample-pipe-3",
        "sample-separator",
        "sample-dryer",
        {
          medium: "oil",
          label: "Purified Oil",
          colorOverride:
            "#EAB308",
          pipeDesign:
            "realPipe",
        }
      ),
      connect(
        "sample-pipe-4",
        "sample-dryer",
        "sample-output",
        {
          medium: "oil",
          label: "Dry Palm Oil",
          colorOverride:
            "#D8A444",
          pipeDesign:
            "realPipe",
        }
      ),

      // Boiler steam line to the sterilizer.
      connect(
        "sample-steam",
        "sample-boiler",
        "sample-sterilizer",
        {
          connectorType:
            "pipeline",
          medium: "steam",
          label: "Steam",
          colorOverride:
            "#38BDF8",
          pipeDesign:
            "realPipe",
        }
      ),

      // Generator power lines: plain Line connectors use the same
      // freely movable bends as Arrow but without an arrow head.
      connect(
        "sample-power-1",
        "sample-genset",
        "sample-digester",
        {
          connectorType: "line",
          medium:
            "electricity",
          label:
            "Electrical Power",
          colorOverride:
            "#FACC15",
        }
      ),
      connect(
        "sample-power-2",
        "sample-genset",
        "sample-press",
        {
          connectorType: "line",
          medium:
            "electricity",
          label: "Power",
          colorOverride:
            "#FACC15",
          waypoints: [
            {
              x: 1160,
              y: 220,
            },
            {
              x: 1160,
              y: 570,
            },
          ],
        }
      ),

      // Sludge branch to the decanter and recovered oil to filter press.
      connect(
        "sample-sludge",
        "sample-clarifier",
        "sample-decanter",
        {
          connectorType: "arrow",
          medium: "sludge",
          label: "Sludge",
          colorOverride:
            "#9A7464",
        }
      ),
      connect(
        "sample-recovery",
        "sample-decanter",
        "sample-filter",
        {
          medium: "oil",
          label:
            "Recovered Oil",
          colorOverride:
            "#D8A444",
          pipeDesign:
            "realPipe",
        }
      ),
      connect(
        "sample-return",
        "sample-filter",
        "sample-separator",
        {
          connectorType: "arrow",
          medium: "oil",
          label:
            "Filtered Recovery",
          colorOverride:
            "#EAB308",
          waypoints: [
            {
              x: 620,
              y: 850,
            },
            {
              x: 620,
              y: 785,
            },
          ],
        }
      ),
    ],
  };
};

export default function ProcessSimulator({
  template,
  dark = false,
  processFlow = null,
  onSaveProcessFlow = null,
}) {
  const role = localStorage.getItem("role");
  const readOnly = role === "viewer";
  const layout = useMemo(() => parseLayout(template), [template]);
  const dataSources = useMemo(() => getMappedSources(layout), [layout]);

  const runtimeDataSources = useMemo(
    () => ({
      ...(processFlow?.topology?.dataSources || {}),
      ...(dataSources || {}),
    }),
    [
      processFlow?.id,
      processFlow?.updated_at,
      dataSources,
    ]
  );

  const availableDataOptions = useMemo(() => {
    const customOptions = Array.isArray(layout?.customDataOptions)
      ? layout.customDataOptions
      : [];

    const labelMap = Object.fromEntries(
      customOptions
        .filter((option) => option?.key)
        .map((option) => [option.key, option.label || option.key])
    );

    return Object.keys(runtimeDataSources)
      .sort((a, b) => String(labelMap[a] || a).localeCompare(String(labelMap[b] || b)))
      .map((key) => {
        const source = runtimeDataSources[key] || {};
        const customOption = customOptions.find((option) => option?.key === key);
        const customSource = customOption?.source || {};
        const deviceId = String(
          source.tagValue ||
            source.id ||
            customSource.tagValue ||
            customSource.id ||
            ""
        );
        const deviceName =
          customSource.deviceName ||
          customSource.device_name ||
          customSource.name ||
          deviceId ||
          "Mapped device";

        return {
          key,
          label: labelMap[key] || key,
          deviceId,
          deviceName,
          measurement: source.measurement || customSource.measurement || "",
          unit:
            source.unit ||
            customOption?.unit ||
            customSource.unit ||
            "",
        };
      });
  }, [runtimeDataSources, layout?.customDataOptions]);

  const mappedDevices = useMemo(() => {
    const byId = new Map();

    availableDataOptions.forEach((option) => {
      if (!option.deviceId) return;

      if (!byId.has(option.deviceId)) {
        byId.set(option.deviceId, {
          id: option.deviceId,
          name: option.deviceName || option.deviceId,
          fields: 0,
          measurements: new Set(),
        });
      }

      const device = byId.get(option.deviceId);
      device.fields += 1;
      if (option.measurement) device.measurements.add(option.measurement);
    });

    return [...byId.values()]
      .map((device) => ({
        ...device,
        measurements: [...device.measurements],
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [availableDataOptions]);

  const processDraftKey = useMemo(
    () =>
      buildPageDraftKey(
        "process-simulator",
        processFlow?.id
          ? `flow-${processFlow.id}`
          : template?.id
          ? `template-${template.id}`
          : "standalone"
      ),
    [processFlow?.id, template?.id]
  );

  const stored = useMemo(() => {
    const draft = readPageDraft(processDraftKey);

    if (
      draft &&
      Array.isArray(draft.nodes) &&
      Array.isArray(draft.connections)
    ) {
      return draft;
    }
    const flowTopology =
      processFlow?.topology;

    if (
      flowTopology &&
      Array.isArray(flowTopology.nodes) &&
      Array.isArray(flowTopology.connections)
    ) {
      return flowTopology;
    }

    try {
      return JSON.parse(
        localStorage.getItem(
          getStoredTopologyKey(template?.id)
        ) || "null"
      );
    } catch {
      return null;
    }
  }, [
    processDraftKey,
    processFlow?.id,
    processFlow?.updated_at,
    template?.id,
  ]);

  const demo = useMemo(
    () => getInitialDemo(),
    []
  );
  const [nodes, setNodes] = useState(
    Array.isArray(stored?.nodes)
      ? stored.nodes
      : demo.nodes
  );
  const [connections, setConnections] = useState(
    Array.isArray(stored?.connections)
      ? stored.connections
      : demo.connections
  );
  const [mode, setMode] = useState(
    ["live", "hybrid", "fake"].includes(stored?.mode)
      ? stored.mode
      : demo.mode || "fake"
  );
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);

  // Packet-Tracer-like connection tool.
  const [
    pipelineToolActive,
    setPipelineToolActive,
  ] = useState(false);

  const [
    connectionToolType,
    setConnectionToolType,
  ] = useState("arrow");

  // Simple connection mode is the default interaction.
  // Single: source -> target -> connection tool turns off.
  // Chain: every target becomes the next source until Esc/Cancel.
  const chainConnect = false;

  // Advanced route controls are hidden until explicitly enabled
  // for the selected connection.
  const [routeEditConnectionId, setRouteEditConnectionId] =
    useState(null);

  const [, setConnectWaypoints] =
    useState([]);

  const [
    draftPointer,
    setDraftPointer,
  ] = useState(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [category, setCategory] = useState("All");
  const [zoom, setZoom] = useState(1);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [liveData, setLiveData] = useState({});
  const [lastLiveAt, setLastLiveAt] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [pipelineDragging, setPipelineDragging] = useState(null);

  // The equipment name pill can be moved without moving the equipment.
  const [
    labelDragging,
    setLabelDragging,
  ] = useState(null);

  const canvasRef = useRef(null);
  // Prevent a flow/template switch from briefly writing the previous page state
  // into the new draft key before the correct draft/saved topology is restored.
  const skipNextDraftWriteRef = useRef(true);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedConnection =
    connections.find((connection) => connection.id === selectedConnectionId) || null;
  const hasLibrarySearch = librarySearch.trim().length > 0;

  const getDeviceDataOptions = (deviceId, currentBinding = "") => {
    const filtered = deviceId
      ? availableDataOptions.filter((option) => option.deviceId === deviceId)
      : availableDataOptions;

    if (
      currentBinding &&
      !filtered.some((option) => option.key === currentBinding)
    ) {
      const current = availableDataOptions.find((option) => option.key === currentBinding);
      return current ? [current, ...filtered] : filtered;
    }

    return filtered;
  };

  const getDeviceLabel = (deviceId) => {
    if (!deviceId) return "Any mapped device";
    const device = mappedDevices.find((item) => item.id === deviceId);
    if (!device) return deviceId;
    return device.name === device.id ? device.id : `${device.name} · ${device.id}`;
  };

  const filteredLibrary = useMemo(() => {
    const keyword = librarySearch.trim().toLowerCase();

    return EQUIPMENT_LIBRARY.filter((item) => {
      if (item.libraryGroup === "assembly") return false;
      if (item.type === "conveyor") return false;
      if (category !== "All" && item.category !== category) return false;
      if (!keyword) return true;

      return [item.label, item.category, item.description, item.type].some((value) =>
        String(value).toLowerCase().includes(keyword)
      );
    });
  }, [category, librarySearch]);

  const filteredAssembly = useMemo(() => {
    const keyword = librarySearch.trim().toLowerCase();
    return ASSEMBLY_COMPONENTS.filter((item) =>
      item.category !== "Conveyor Parts" && [item.label, item.category, item.description, item.type].some((value) =>
        String(value).toLowerCase().includes(keyword)
      )
    );
  }, [librarySearch]);

  const assemblyGroups = useMemo(() => {
    const groups = {};
    filteredAssembly.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return Object.entries(groups);
  }, [filteredAssembly]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    skipNextDraftWriteRef.current = true;
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectFrom(null);
    setConnectWaypoints([]);
    setDraftPointer(null);
    setPipelineToolActive(false);
    setRouteEditConnectionId(null);
    setPipelineDragging(null);
    setLabelDragging(null);

    const draft = readPageDraft(processDraftKey);

    if (
      draft &&
      Array.isArray(draft.nodes) &&
      Array.isArray(draft.connections)
    ) {
      setNodes(draft.nodes);
      setConnections(draft.connections);
      setMode(
        ["live", "hybrid", "fake"].includes(draft.mode)
          ? draft.mode
          : "hybrid"
      );
      if (Number.isFinite(Number(draft.zoom))) {
        setZoom(Math.max(0.35, Math.min(2.5, Number(draft.zoom))));
      }
      if (typeof draft.libraryCollapsed === "boolean") {
        setLibraryCollapsed(draft.libraryCollapsed);
      }
      if (typeof draft.inspectorCollapsed === "boolean") {
        setInspectorCollapsed(draft.inspectorCollapsed);
      }
      return;
    }

    const flowTopology =
      processFlow?.topology;

    if (
      flowTopology &&
      Array.isArray(flowTopology.nodes) &&
      Array.isArray(flowTopology.connections)
    ) {
      setNodes(flowTopology.nodes);
      setConnections(
        flowTopology.connections
      );
      setMode(
        ["live", "hybrid", "fake"].includes(
          flowTopology.mode
        )
          ? flowTopology.mode
          : "hybrid"
      );
      return;
    }

    try {
      const nextStored = JSON.parse(
        localStorage.getItem(
          getStoredTopologyKey(template?.id)
        ) || "null"
      );

      if (
        nextStored &&
        Array.isArray(nextStored.nodes) &&
        Array.isArray(nextStored.connections)
      ) {
        setNodes(nextStored.nodes);
        setConnections(
          nextStored.connections
        );
        setMode(
          nextStored.mode || "hybrid"
        );
      } else {
        const nextDemo =
          getInitialDemo();
        setNodes(nextDemo.nodes);
        setConnections(
          nextDemo.connections
        );
        setMode(
          nextDemo.mode || "fake"
        );
      }
    } catch {
      const nextDemo = getInitialDemo();
      setNodes(nextDemo.nodes);
      setConnections(
        nextDemo.connections
      );
      setMode(
        nextDemo.mode || "fake"
      );
    }
  }, [
    processDraftKey,
    processFlow?.id,
    processFlow?.updated_at,
    template?.id,
  ]);

  // Autosave an unsaved working draft so SPA page switches, refreshes and
  // accidental navigation do not destroy the current simulator layout.
  useEffect(() => {
    if (readOnly) return;

    if (skipNextDraftWriteRef.current) {
      skipNextDraftWriteRef.current = false;
      return;
    }

    writePageDraft(processDraftKey, {
      nodes,
      connections,
      mode,
      zoom,
      libraryCollapsed,
      inspectorCollapsed,
      templateId: template?.id ?? null,
      processFlowId: processFlow?.id ?? null,
    });
  }, [
    readOnly,
    processDraftKey,
    nodes,
    connections,
    mode,
    zoom,
    libraryCollapsed,
    inspectorCollapsed,
    template?.id,
    processFlow?.id,
  ]);

  useEffect(() => {
    if (mode === "fake") {
      return undefined;
    }

    if (Object.keys(runtimeDataSources).length === 0) {
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const fetchLive = async () => {
      const token = localStorage.getItem("token");
      if (!token || cancelled) return;

      try {
        const response = await fetch("http://localhost:5000/template-live-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            dataSources: runtimeDataSources,
            influx: layout?.influx || null,
            channelMap: layout?.channelMap || {},
            historyWindow: "-15m",
            items: layout?.items || [],
            includeHistory: false,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Unable to retrieve process data");
        }

        if (cancelled) return;

        if (result?.data && typeof result.data === "object") {
          setLiveData((previous) => ({ ...previous, ...result.data }));
        }

        setLastLiveAt(new Date().toISOString());
      } catch (error) {
        if (!cancelled) {
          console.warn("Process simulator live-data request failed", error);
        }
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(
            fetchLive,
            LIVE_POLL_INTERVAL_MS
          );
        }
      }
    };

    fetchLive();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [runtimeDataSources, layout, mode]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMove = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left + canvas.scrollLeft) / zoom - dragging.offsetX;
      const y = (event.clientY - rect.top + canvas.scrollTop) / zoom - dragging.offsetY;

      setNodes((current) =>
        current.map((node) =>
          node.id === dragging.id
            ? (() => {
                const size =
                  getNodeSize(node);

                return {
                  ...node,
                  x: clamp(
                    x,
                    8,
                    CANVAS_WIDTH -
                      size.width -
                      8
                  ),
                  y: clamp(
                    y,
                    8,
                    CANVAS_HEIGHT -
                      size.height -
                      8
                  ),
                };
              })()
            : node
        )
      );
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, zoom]);

  useEffect(() => {
    if (!resizing) {
      return undefined;
    }

    const handleMove = (event) => {
      const dx =
        (event.clientX -
          resizing.pointerX) /
        zoom;

      const dy =
        (event.clientY -
          resizing.pointerY) /
        zoom;

      const direction =
        resizing.direction;

      let nextX =
        resizing.x;
      let nextY =
        resizing.y;
      let nextWidth =
        resizing.width;
      let nextHeight =
        resizing.height;

      if (
        direction.includes("e")
      ) {
        nextWidth = clamp(
          resizing.width + dx,
          resizing.minWidth,
          Math.min(
            resizing.maxWidth,
            CANVAS_WIDTH -
              resizing.x -
              8
          )
        );
      }

      if (
        direction.includes("s")
      ) {
        nextHeight = clamp(
          resizing.height + dy,
          resizing.minHeight,
          Math.min(
            resizing.maxHeight,
            CANVAS_HEIGHT -
              resizing.y -
              8
          )
        );
      }

      if (
        direction.includes("w")
      ) {
        nextWidth = clamp(
          resizing.width - dx,
          resizing.minWidth,
          resizing.maxWidth
        );

        nextX =
          resizing.x +
          (resizing.width -
            nextWidth);

        if (nextX < 8) {
          nextWidth +=
            nextX - 8;
          nextX = 8;
        }
      }

      if (
        direction.includes("n")
      ) {
        nextHeight = clamp(
          resizing.height - dy,
          resizing.minHeight,
          resizing.maxHeight
        );

        nextY =
          resizing.y +
          (resizing.height -
            nextHeight);

        if (nextY < 8) {
          nextHeight +=
            nextY - 8;
          nextY = 8;
        }
      }

      setNodes((current) =>
        current.map((node) =>
          node.id === resizing.id
            ? {
                ...node,
                x: nextX,
                y: nextY,
                width: nextWidth,
                height: nextHeight,
              }
            : node
        )
      );
    };

    const handleUp = () =>
      setResizing(null);

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
  }, [resizing, zoom]);

  useEffect(() => {
    if (!pipelineDragging) {
      return undefined;
    }

    const handleMove = (event) => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      const rect =
        canvas.getBoundingClientRect();

      const pointer = {
        x: clamp(
          (
            event.clientX -
            rect.left +
            canvas.scrollLeft
          ) /
            zoom,
          8,
          CANVAS_WIDTH - 8
        ),
        y: clamp(
          (
            event.clientY -
            rect.top +
            canvas.scrollTop
          ) /
            zoom,
          8,
          CANVAS_HEIGHT - 8
        ),
      };

      if (
        pipelineDragging.kind ===
        "corner"
      ) {
        const vertices =
          pipelineDragging
            .baseVertices
            .map(
              (point) => ({
                ...point,
              })
            );

        const index =
          pipelineDragging.vertexIndex;

        if (
          !vertices[index]
        ) {
          return;
        }

        vertices[index] = {
          x: pointer.x,
          y: pointer.y,
        };

        // Keep equipment stubs locked,
        // but let draw.io-like corner
        // dragging reshape the middle.
        const internal =
          orthogonalizeVertices([
            vertices[1],
            ...vertices.slice(
              2,
              -2
            ),
            vertices[
              vertices.length - 2
            ],
          ]);

        const nextWaypoints =
          pipelineDragging.free
            ? orthogonalizeVertices(
                vertices
              ).slice(
                1,
                -1
              )
            : internal.slice(
                1,
                -1
              );

        setConnections(
          (current) =>
            current.map(
              (connection) =>
                connection.id ===
                pipelineDragging.id
                  ? {
                      ...connection,
                      waypoints:
                        nextWaypoints,
                      routePoint:
                        null,
                    }
                  : connection
            )
        );

        return;
      }

      if (
        pipelineDragging.kind ===
        "waypoint"
      ) {
        setConnections(
          (current) =>
            current.map(
              (connection) => {
                if (
                  connection.id !==
                  pipelineDragging.id
                ) {
                  return connection;
                }

                const waypoints =
                  getConnectionWaypoints(
                    connection
                  );

                const next =
                  [...waypoints];

                if (
                  !next[
                    pipelineDragging.index
                  ]
                ) {
                  return connection;
                }

                next[
                  pipelineDragging.index
                ] = pointer;

                return {
                  ...connection,
                  waypoints: next,
                  routePoint: null,
                };
              }
            )
        );

        return;
      }

      if (
        pipelineDragging.kind ===
        "route-move"
      ) {
        const movedX =
          (event.clientX - pipelineDragging.pointerX) / zoom;
        const movedY =
          (event.clientY - pipelineDragging.pointerY) / zoom;

        if (Math.hypot(movedX, movedY) < 1) return;

        const movePoint = (point) =>
          point
            ? {
                x: clamp(Number(point.x) + movedX, 8, CANVAS_WIDTH - 8),
                y: clamp(Number(point.y) + movedY, 8, CANVAS_HEIGHT - 8),
              }
            : point;

        setConnections((current) =>
          current.map((connection) => {
            if (connection.id !== pipelineDragging.id) return connection;

            return {
              ...connection,
              waypoints: pipelineDragging.baseWaypoints.map(movePoint),
              freeSource: connection.source
                ? connection.freeSource
                : movePoint(pipelineDragging.baseFreeSource),
              freeTarget: connection.target
                ? connection.freeTarget
                : movePoint(pipelineDragging.baseFreeTarget),
              routePoint: null,
            };
          })
        );

        return;
      }

      if (
        pipelineDragging.kind ===
        "endpoint"
      ) {
        setConnections(
          (current) =>
            current.map(
              (connection) => {
                if (
                  connection.id !==
                  pipelineDragging.id
                ) {
                  return connection;
                }

                return pipelineDragging.endpoint ===
                  "source"
                  ? {
                      ...connection,
                      source: null,
                      sourceAnchor: null,
                      sourcePipeJoin:
                        null,
                      freeSource:
                        pointer,
                    }
                  : {
                      ...connection,
                      target: null,
                      targetAnchor: null,
                      targetPipeJoin:
                        null,
                      freeTarget:
                        pointer,
                    };
              }
            )
        );

        return;
      }

      if (
        pipelineDragging.kind ===
        "flex-segment"
      ) {
        const movedX =
          (
            event.clientX -
            pipelineDragging.pointerX
          ) /
          zoom;

        const movedY =
          (
            event.clientY -
            pipelineDragging.pointerY
          ) /
          zoom;

        // Do not create an accidental bend when the user only
        // clicks an Arrow/Line to select it.
        if (
          Math.hypot(
            movedX,
            movedY
          ) < 3
        ) {
          return;
        }

        const connection =
          connections.find(
            (item) =>
              item.id ===
              pipelineDragging.id
          );

        if (!connection) {
          return;
        }

        const currentWaypoints =
          getConnectionWaypoints(
            connection
          );

        const insertIndex =
          clamp(
            Number(
              pipelineDragging
                .segmentIndex
            ),
            0,
            currentWaypoints.length
          );

        const nextWaypoints = [
          ...currentWaypoints,
        ];

        nextWaypoints.splice(
          insertIndex,
          0,
          pointer
        );

        setConnections(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                connection.id
                  ? {
                      ...item,
                      waypoints:
                        nextWaypoints,
                      routePoint: null,
                    }
                  : item
            )
        );

        // Continue the same drag as a normal free waypoint drag.
        setPipelineDragging({
          kind: "waypoint",
          id: connection.id,
          index: insertIndex,
        });

        return;
      }

      if (
        pipelineDragging.kind ===
        "segment"
      ) {
        const movedX =
          (
            event.clientX -
            pipelineDragging.pointerX
          ) /
          zoom;

        const movedY =
          (
            event.clientY -
            pipelineDragging.pointerY
          ) /
          zoom;

        if (
          Math.hypot(
            movedX,
            movedY
          ) < 2
        ) {
          return;
        }

        const vertices =
          pipelineDragging
            .baseVertices
            .map(
              (point) => ({
                ...point,
              })
            );

        const index =
          pipelineDragging
            .segmentIndex;

        const start =
          vertices[index];

        const end =
          vertices[index + 1];

        if (!start || !end) {
          return;
        }

        const horizontal =
          pipelineDragging.orientation ===
          "horizontal";

        const first =
          horizontal
            ? {
                x: start.x,
                y: clamp(
                  start.y +
                    movedY,
                  10,
                  CANVAS_HEIGHT -
                    10
                ),
              }
            : {
                x: clamp(
                  start.x +
                    movedX,
                  10,
                  CANVAS_WIDTH -
                    10
                ),
                y: start.y,
              };

        const second =
          horizontal
            ? {
                x: end.x,
                y: first.y,
              }
            : {
                x: first.x,
                y: end.y,
              };

        // Draw.io-style segment drag:
        // move the selected horizontal
        // segment vertically or vertical
        // segment horizontally.
        const internal =
          vertices.slice(
            1,
            -1
          );

        const internalIndex =
          index - 1;

        const nextInternal = [
          ...internal.slice(
            0,
            internalIndex + 1
          ),
          first,
          second,
          ...internal.slice(
            internalIndex + 1
          ),
        ];

        const cleanedInternal =
          simplifyOrthogonalVertices(
            nextInternal
          );

        const nextWaypoints =
          pipelineDragging.free
            ? simplifyOrthogonalVertices(
                nextInternal
              ).slice(
                1,
                -1
              )
            : cleanedInternal.slice(
                1,
                -1
              );

        setConnections(
          (current) =>
            current.map(
              (connection) =>
                connection.id ===
                pipelineDragging.id
                  ? {
                      ...connection,
                      waypoints:
                        nextWaypoints,
                      routePoint:
                        null,
                    }
                  : connection
            )
        );
      }
    };

    const handleUp = (event) => {
      if (
        pipelineDragging.kind ===
        "endpoint"
      ) {
        const canvas =
          canvasRef.current;

        if (canvas) {
          const rect =
            canvas.getBoundingClientRect();

          const pointer = {
            x:
              (
                event.clientX -
                rect.left +
                canvas.scrollLeft
              ) /
              zoom,
            y:
              (
                event.clientY -
                rect.top +
                canvas.scrollTop
              ) /
              zoom,
          };

          const connection =
            connections.find(
              (item) =>
                item.id ===
                pipelineDragging.id
            );

          const oppositeNodeId =
            pipelineDragging.endpoint ===
            "source"
              ? connection?.target
              : connection?.source;

          const snapPadding =
            connection && isFreeformRoutingConnection(connection)
              ? 56
              : 38;

          const hoveredNode =
            event.altKey
              ? null
              : nodes.find((node) => {
                  if (node.id === oppositeNodeId) return false;

                  return pointInsideExpandedBounds(
                    pointer,
                    getEquipmentBounds(node),
                    snapPadding
                  );
                });

          if (hoveredNode) {
            const anchor =
              getBoundaryAnchorFromPoint(
                hoveredNode,
                pointer
              );

            setConnections(
              (current) =>
                current.map(
                  (item) => {
                    if (
                      item.id !==
                      pipelineDragging.id
                    ) {
                      return item;
                    }

                    return pipelineDragging.endpoint ===
                      "source"
                      ? {
                          ...item,
                          source:
                            hoveredNode.id,
                          sourceAnchor:
                            anchor,
                          sourcePort:
                            anchor.side,
                          sourcePipeJoin:
                            null,
                        }
                      : {
                          ...item,
                          target:
                            hoveredNode.id,
                          targetAnchor:
                            anchor,
                          targetPort:
                            anchor.side,
                          targetPipeJoin:
                            null,
                        };
                  }
                )
            );
          } else {
            const pipeSnap = !event.altKey &&
              findPipeSnapPoint(
                pointer,
                pipelineDragging.id
              );

            if (pipeSnap) {
              setConnections(
                (current) =>
                  current.map(
                    (item) => {
                      if (
                        item.id !==
                        pipelineDragging.id
                      ) {
                        return item;
                      }

                      const snapPoint = {
                        x:
                          pipeSnap.x,
                        y:
                          pipeSnap.y,
                      };

                      return pipelineDragging.endpoint ===
                        "source"
                        ? {
                            ...item,
                            source: null,
                            sourceAnchor: null,
                            sourcePort: null,
                            freeSource:
                              snapPoint,
                            sourcePipeJoin: {
                              connectionId:
                                pipeSnap.connectionId,
                              segmentIndex:
                                pipeSnap.segmentIndex,
                              t:
                                pipeSnap.t,
                            },
                          }
                        : {
                            ...item,
                            target: null,
                            targetAnchor: null,
                            targetPort: null,
                            freeTarget:
                              snapPoint,
                            targetPipeJoin: {
                              connectionId:
                                pipeSnap.connectionId,
                              segmentIndex:
                                pipeSnap.segmentIndex,
                              t:
                                pipeSnap.t,
                            },
                          };
                    }
                  )
              );
            }
          }
        }
      }

      setPipelineDragging(
        null
      );
    };

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
    pipelineDragging,
    zoom,
    nodes,
    connections,
  ]);

  useEffect(() => {
    if (!labelDragging) {
      return undefined;
    }

    const handleMove = (
      event
    ) => {
      const dx =
        (
          event.clientX -
          labelDragging.pointerX
        ) /
        zoom;

      const dy =
        (
          event.clientY -
          labelDragging.pointerY
        ) /
        zoom;

      if (
        labelDragging.type ===
        "connection"
      ) {
        const basePoint =
          labelDragging.basePoint || {
            x: 0,
            y: 0,
          };

        const nextX =
          clamp(
            labelDragging
              .startOffset.x + dx,
            54 -
              Number(
                basePoint.x || 0
              ),
            CANVAS_WIDTH -
              54 -
              Number(
                basePoint.x || 0
              )
          );

        const nextY =
          clamp(
            labelDragging
              .startOffset.y + dy,
            18 -
              Number(
                basePoint.y || 0
              ),
            CANVAS_HEIGHT -
              18 -
              Number(
                basePoint.y || 0
              )
          );

        setConnections((current) =>
          current.map((connection) =>
            connection.id ===
            labelDragging.id
              ? {
                  ...connection,
                  labelOffset: {
                    x: nextX,
                    y: nextY,
                  },
                }
              : connection
          )
        );

        return;
      }

      setNodes((current) =>
        current.map((node) => {
          if (
            node.id !==
            labelDragging.id
          ) {
            return node;
          }

          const size =
            getNodeSize(node);

          const centerX =
            Number(node.x || 0) +
            size.width / 2;

          const baseY =
            Number(node.y || 0);

          const nextX =
            clamp(
              labelDragging
                .startOffset.x +
                dx,
              -centerX + 20,
              CANVAS_WIDTH -
                centerX -
                20
            );

          const nextY =
            clamp(
              labelDragging
                .startOffset.y +
                dy,
              -baseY + 8,
              CANVAS_HEIGHT -
                baseY -
                30
            );

          return {
            ...node,
            labelOffset: {
              x: nextX,
              y: nextY,
            },
          };
        })
      );
    };

    const handleUp = () => {
      setLabelDragging(null);
    };

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
    labelDragging,
    zoom,
  ]);

  const resolveMetric = (node, metric) => {
    const dataKey =
      node.bindings?.[metric.id] ||
      node.metricBindings?.[metric.id] ||
      "";
    const hasLive = dataKey && liveData[dataKey] !== undefined && liveData[dataKey] !== null;

    if (mode === "live") {
      return {
        value: hasLive ? liveData[dataKey] : null,
        source: hasLive ? "live" : "missing",
      };
    }

    if (mode === "hybrid" && hasLive) {
      return { value: liveData[dataKey], source: "live" };
    }

    return {
      value: fakeMetricValue(node.id, metric, clock),
      source: "fake",
    };
  };

  const resolveConnectionValue = (connection) => {
    if (connection.dataKey && liveData[connection.dataKey] !== undefined && mode !== "fake") {
      return Number(liveData[connection.dataKey]);
    }

    const seed = hashText(connection.id);
    return 20 + Math.abs(Math.sin(clock / 4200 + seed * 0.001)) * 60;
  };

  const startNodeDrag = (event, node) => {
    if (readOnly || event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left + canvas.scrollLeft) / zoom;
    const pointerY = (event.clientY - rect.top + canvas.scrollTop) / zoom;

    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setDragging({
      id: node.id,
      offsetX: pointerX - node.x,
      offsetY: pointerY - node.y,
    });
  };

  const startLabelDrag = (
    event,
    node
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedNodeId(
      node.id
    );
    setSelectedConnectionId(
      null
    );

    setDragging(null);
    setResizing(null);
    setPipelineDragging(null);

    setLabelDragging({
      type: "node",
      id: node.id,
      pointerX:
        event.clientX,
      pointerY:
        event.clientY,
      startOffset:
        getLabelOffset(node),
    });
  };

  const startConnectionLabelDrag = (
    event,
    connection,
    geometry
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedConnectionId(
      connection.id
    );
    setSelectedNodeId(null);

    setDragging(null);
    setResizing(null);
    setPipelineDragging(null);

    setLabelDragging({
      type: "connection",
      id: connection.id,
      pointerX:
        event.clientX,
      pointerY:
        event.clientY,
      basePoint:
        geometry?.labelPoint || {
          x: 0,
          y: 0,
        },
      startOffset:
        getConnectionLabelOffset(
          connection
        ),
    });
  };

  const startResize = (
    event,
    node,
    direction
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const size =
      getNodeSize(node);
    const constraints =
      getNodeConstraints(node);

    setSelectedNodeId(
      node.id
    );

    setSelectedConnectionId(
      null
    );

    setDragging(null);

    setResizing({
      id: node.id,
      direction,
      pointerX:
        event.clientX,
      pointerY:
        event.clientY,
      x:
        Number(node.x || 0),
      y:
        Number(node.y || 0),
      width:
        size.width,
      height:
        size.height,
      minWidth: constraints.minWidth,
      minHeight: constraints.minHeight,
      maxWidth: constraints.maxWidth,
      maxHeight: constraints.maxHeight,
    });
  };

  const getCanvasPointFromEvent = (
    event
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x: clamp(
        (
          event.clientX -
          rect.left +
          canvas.scrollLeft
        ) /
          zoom,
        8,
        CANVAS_WIDTH - 8
      ),
      y: clamp(
        (
          event.clientY -
          rect.top +
          canvas.scrollTop
        ) /
          zoom,
        8,
        CANVAS_HEIGHT - 8
      ),
    };
  };

  const cancelConnectionDraft = () => {
    setConnectFrom(null);
    setConnectWaypoints([]);
    setDraftPointer(null);
  };

  const stopConnectionTool = () => {
    cancelConnectionDraft();
    setPipelineToolActive(false);
  };

  const activateConnectionTool = (type) => {
    if (readOnly) return;

    const nextType = ["pipeline", "conveyor", "arrow", "line"].includes(type)
      ? type
      : "pipeline";

    if (pipelineToolActive && connectionToolType === nextType) {
      stopConnectionTool();
      return;
    }

    setConnectionToolType(nextType);
    setPipelineToolActive(true);
    cancelConnectionDraft();
    setSelectedConnectionId(null);
    setRouteEditConnectionId(null);
  };

  useEffect(() => {
    if (readOnly) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      stopConnectionTool();
      setRouteEditConnectionId(null);
      setPipelineDragging(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly, pipelineToolActive, connectionToolType]);

  const addNodeAt = (type, x, y) => {
    if (readOnly) return;

    const count = nodes.filter((node) => node.type === type).length + 1;
    const node = makeEquipmentNode(type, x, y, count);
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    if (readOnly) return;

    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const rect =
      canvas.getBoundingClientRect();

    const canvasX =
      (
        event.clientX -
        rect.left +
        canvas.scrollLeft
      ) /
      zoom;

    const canvasY =
      (
        event.clientY -
        rect.top +
        canvas.scrollTop
      ) /
      zoom;

    const connectorType =
      event.dataTransfer.getData(
        "application/x-process-connection"
      );

    if (connectorType) {
      const connection =
        makeFreeConnection(
          connectorType,
          clamp(
            canvasX,
            100,
            CANVAS_WIDTH - 100
          ),
          clamp(
            canvasY,
            20,
            CANVAS_HEIGHT - 20
          )
        );

      setConnections(
        (current) => [
          ...current,
          connection,
        ]
      );

      setSelectedConnectionId(
        connection.id
      );

      setSelectedNodeId(null);
      cancelConnectionDraft();
      setPipelineToolActive(false);

      return;
    }

    const type =
      event.dataTransfer.getData(
        "application/x-process-equipment"
      );

    if (!type) return;

    const dropConstraints =
      getNodeConstraints({
        type,
      });

    const dropWidth =
      dropConstraints.defaultWidth;

    const dropHeight =
      dropConstraints.defaultHeight;

    const x =
      canvasX -
      dropWidth / 2;

    const y =
      canvasY -
      dropHeight / 2;

    addNodeAt(
      type,
      clamp(
        x,
        8,
        CANVAS_WIDTH -
          dropWidth -
          8
      ),
      clamp(
        y,
        8,
        CANVAS_HEIGHT -
          dropHeight -
          8
      )
    );
  };

  const completeConnection = (
    targetId,
    targetAnchorInput = {
      side: "left",
      offset: 0.5,
    }
  ) => {
    if (readOnly) return;

    if (!connectFrom) {
      notify(
        "Choose a pipeline start point first.",
        "info"
      );
      return;
    }

    if (
      connectFrom.nodeId ===
      targetId
    ) {
      notify(
        "A pipeline cannot connect equipment to itself.",
        "warning"
      );
      return;
    }

    const targetAnchor =
      isAutoAnchor(
        targetAnchorInput
      )
        ? makeAutoAnchor()
        : {
            ...normalizeAnchor(
              targetAnchorInput,
              "left"
            ),
            mode:
              targetAnchorInput?.mode ||
              "fixed",
          };

    const sourceAnchor =
      isAutoAnchor(
        connectFrom.anchor
      )
        ? makeAutoAnchor()
        : {
            ...normalizeAnchor(
              connectFrom.anchor,
              connectFrom.side ||
                "right"
            ),
            mode:
              connectFrom.anchor
                ?.mode ||
              "fixed",
          };

    const connection =
      makeConnection(
        connectFrom.nodeId,
        targetId,
        sourceAnchor,
        targetAnchor,

        // Draw.io-style creation:
        // source -> target first.
        // Bends are adjusted after
        // creation by dragging.
        [],
        pipelineToolActive
          ? connectionToolType
          : "pipeline"
      );

    setConnections(
      (current) => [
        ...current,
        connection,
      ]
    );

    setSelectedConnectionId(
      connection.id
    );

    if (chainConnect) {
      // Continue the chain from the actual side the user selected.
      // The user can drag this endpoint later if another side is preferred.
      const nextAnchor = {
        ...normalizeAnchor(
          targetAnchor,
          targetAnchor.side || "right"
        ),
        mode: "fixed",
      };

      setConnectFrom({
        nodeId: targetId,
        anchor: nextAnchor,
        side: nextAnchor.side,
      });
      setConnectWaypoints([]);
      setDraftPointer(null);
      setSelectedNodeId(targetId);
    } else {
      setSelectedNodeId(null);
      cancelConnectionDraft();
      setPipelineToolActive(false);
    }
  };

  const startConnection = (
    nodeId,
    anchorInput = {
      side: "right",
      offset: 0.5,
    }
  ) => {
    if (readOnly) return;

    const anchor =
      isAutoAnchor(
        anchorInput
      )
        ? makeAutoAnchor()
        : {
            ...normalizeAnchor(
              anchorInput,
              "right"
            ),
            mode:
              anchorInput?.mode ||
              "fixed",
          };

    setConnectFrom({
      nodeId,
      anchor,

      // Legacy helper text and
      // compatibility.
      side: anchor.side,
    });

    setConnectWaypoints([]);
    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);
  };

  const handleJunctionPort = (
    nodeId,
    side
  ) => {
    if (readOnly) return;

    const anchor = {
      side,
      offset: 0.5,
    };

    if (connectFrom) {
      completeConnection(
        nodeId,
        anchor
      );
      return;
    }

    startConnection(
      nodeId,
      anchor
    );
  };

  const handleEquipmentBoundaryPointerDown = (
    event,
    node
  ) => {
    if (
      readOnly ||
      (
        !pipelineToolActive &&
        !connectFrom
      ) ||
      event.button !== 0
    ) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    // V30: manual perimeter attachment. The side/offset comes from the
    // exact place the user clicks on the equipment, rather than a later
    // "smart" re-attachment decision. Once created, the anchor stays fixed
    // until the user drags the endpoint somewhere else.
    const canvasPoint =
      getCanvasPointFromEvent(event);

    const clickedAnchor =
      getBoundaryAnchorFromPoint(
        node,
        canvasPoint || getEquipmentBounds(node)
      );

    if (connectFrom) {
      completeConnection(
        node.id,
        clickedAnchor
      );
    } else {
      startConnection(
        node.id,
        clickedAnchor
      );
    }

    return true;
  };

  const updateSelectedNode = (patch) => {
    if (!selectedNode) return;
    setNodes((current) =>
      current.map((node) => (node.id === selectedNode.id ? { ...node, ...patch } : node))
    );
  };

  const rotateSelectedAssembly = () => {
    if (!selectedNode || !isAssemblyNode(selectedNode) || readOnly) return;

    const size = getNodeSize(selectedNode);
    const nextRotation = ((Number(selectedNode.rotation || 0) + 90) % 360 + 360) % 360;

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              rotation: nextRotation,
              width: size.height,
              height: size.width,
            }
          : node
      )
    );
  };

  const convertSelectedAssembly = () => {
    if (!selectedNode || readOnly) return;
    const { width, height } = getNodeSize(selectedNode);
    const center = { x: selectedNode.x + width / 2, y: selectedNode.y + height / 2 };
    const angle = Number(selectedNode.rotation || 0) * Math.PI / 180;
    const vertical = Math.abs(Math.sin(angle)) > .5;
    const length = vertical ? height : width;
    const delta = { x: Math.cos(angle) * length / 2, y: Math.sin(angle) * length / 2 };
    const conveyor = selectedNode.type.startsWith("conveyor-");
    const connection = {
      ...makeFreeConnection(conveyor ? "conveyor" : "pipeline", center.x, center.y),
      freeSource: { x: center.x - delta.x, y: center.y - delta.y },
      freeTarget: { x: center.x + delta.x, y: center.y + delta.y },
      label: selectedNode.showLabel ? selectedNode.label : "",
    };
    setConnections((current) => [...current.map((item) => {
      const patch = {};
      for (const endpoint of ["source", "target"]) {
        if (item[endpoint] !== selectedNode.id) continue;
        const isSource = endpoint === "source";
        const position = getConnectionGeometry(item)?.[endpoint] || center;
        const t = Math.hypot(position.x - connection.freeSource.x, position.y - connection.freeSource.y) <
          Math.hypot(position.x - connection.freeTarget.x, position.y - connection.freeTarget.y) ? 0 : 1;
        patch[endpoint] = null;
        patch[`${endpoint}Anchor`] = null;
        patch[`${endpoint}Port`] = null;
        patch[isSource ? "freeSource" : "freeTarget"] = t === 0 ? connection.freeSource : connection.freeTarget;
        patch[`${endpoint}PipeJoin`] = { connectionId: connection.id, segmentIndex: 0, t };
      }
      return Object.keys(patch).length ? { ...item, ...patch } : item;
    }), connection]);
    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setSelectedNodeId(null);
    setSelectedConnectionId(connection.id);
  };

  const addBranchToSelectedConnection = () => {
    if (!selectedConnection || readOnly) return;

    const geometry = getConnectionGeometry(selectedConnection);
    const placement = getBranchPlacement(geometry, {
      maxX: CANVAS_WIDTH - 12,
      maxY: CANVAS_HEIGHT - 12,
    });

    if (!placement) return;

    const { source, target } = placement;
    const x = source.x;
    const y = source.y;
    const kind = getConnectionKind(selectedConnection);
    const branch = {
      ...makeFreeConnection(kind, (x + target.x) / 2, (y + target.y) / 2),
      source: null,
      target: null,
      freeSource: { x, y },
      freeTarget: target,
      sourcePipeJoin: {
        connectionId: selectedConnection.id,
        segmentIndex: placement.segmentIndex,
        t: placement.t,
      },
      targetPipeJoin: null,
      connectorType: kind,
      pipeDesign: kind === "conveyor" ? "conveyorTrack" : "realPipe",
      routingMode: kind === "line" ? "simple" : "diagram",
      colorOverride: selectedConnection.colorOverride || "",
      medium: selectedConnection.medium || "steam",
      animateFlow: selectedConnection.animateFlow !== false,
    };

    setConnections((current) => [...current, branch]);
    setSelectedConnectionId(branch.id);
    setSelectedNodeId(null);
    setRouteEditConnectionId(branch.id);
  };

  const handleCustomEquipmentImage = (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedNode || selectedNode.type !== "custom-equipment") return;

    if (!file.type?.startsWith("image/")) {
      notify("Please choose an image file for the custom equipment.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateSelectedNode({
        customImageSrc: String(reader.result || ""),
        customImageName: file.name,
        dataDisplayPosition: selectedNode.dataDisplayPosition || "hidden",
      });
      notify("Custom equipment image updated.", "success");
    };
    reader.onerror = () => notify("Unable to read the selected image.", "error");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const getConnectionGeometry = (
    connection
  ) => {
    const sourceNode =
      connection.source
        ? nodes.find(
            (node) =>
              node.id ===
              connection.source
          )
        : null;

    const targetNode =
      connection.target
        ? nodes.find(
            (node) =>
              node.id ===
              connection.target
          )
        : null;

    const freeSource =
      connection.freeSource || {
        x: 300,
        y: 300,
      };

    const freeTarget =
      connection.freeTarget || {
        x: 480,
        y: 300,
      };

    const routingMode = getConnectionRoutingMode(connection);

    // V29.2 Simple Line: starts as one straight segment, but preserves optional
    // user-created bend points. This keeps Line easy to create while allowing
    // draw.io-style direct reshaping when needed.
    if (routingMode === "simple") {
      let sourcePoint = freeSource;
      let targetPoint = freeTarget;
      let resolvedSourceAnchor = null;
      let resolvedTargetAnchor = null;

      if (sourceNode) {
        resolvedSourceAnchor = targetNode
          ? resolveConnectionAnchor(
              sourceNode,
              targetNode,
              connection.sourceAnchor || makeAutoAnchor(),
              "right"
            )
          : isAutoAnchor(connection.sourceAnchor) || !connection.sourceAnchor
          ? getSmartAnchorTowardPoint(sourceNode, targetPoint, "right")
          : normalizeAnchor(connection.sourceAnchor, "right");

        sourcePoint = getAnchorPoint(
          sourceNode,
          resolvedSourceAnchor,
          resolvedSourceAnchor.side
        );
      }

      if (targetNode) {
        resolvedTargetAnchor = sourceNode
          ? resolveConnectionAnchor(
              targetNode,
              sourceNode,
              connection.targetAnchor || makeAutoAnchor(),
              "left"
            )
          : isAutoAnchor(connection.targetAnchor) || !connection.targetAnchor
          ? getSmartAnchorTowardPoint(targetNode, sourcePoint, "left")
          : normalizeAnchor(connection.targetAnchor, "left");

        targetPoint = getAnchorPoint(
          targetNode,
          resolvedTargetAnchor,
          resolvedTargetAnchor.side
        );
      }

      return getPolylineGeometry(
        sourcePoint,
        targetPoint,
        getConnectionWaypoints(connection),
        {
          sourceAnchor: resolvedSourceAnchor,
          targetAnchor: resolvedTargetAnchor,
          free: !sourceNode || !targetNode,
          routingMode: "simple",
          simpleLine: true,
        }
      );
    }

    if (routingMode === "free" || routingMode === "diagram") {
      let sourcePoint = freeSource;
      let targetPoint = freeTarget;
      let resolvedSourceAnchor = null;
      let resolvedTargetAnchor = null;

      if (sourceNode) {
        resolvedSourceAnchor = targetNode
          ? resolveConnectionAnchor(
              sourceNode, targetNode,
              connection.sourceAnchor || makeAutoAnchor(),
              "right"
            )
          : isAutoAnchor(connection.sourceAnchor) || !connection.sourceAnchor
          ? getSmartAnchorTowardPoint(sourceNode, targetPoint, "right")
          : normalizeAnchor(connection.sourceAnchor, "right");
        sourcePoint = getAnchorPoint(
          sourceNode, resolvedSourceAnchor, resolvedSourceAnchor.side
        );
      }

      if (targetNode) {
        resolvedTargetAnchor = sourceNode
          ? resolveConnectionAnchor(
              targetNode, sourceNode,
              connection.targetAnchor || makeAutoAnchor(),
              "left"
            )
          : isAutoAnchor(connection.targetAnchor) || !connection.targetAnchor
          ? getSmartAnchorTowardPoint(targetNode, sourcePoint, "left")
          : normalizeAnchor(connection.targetAnchor, "left");
        targetPoint = getAnchorPoint(
          targetNode, resolvedTargetAnchor, resolvedTargetAnchor.side
        );
      }

      return getPolylineGeometry(
        sourcePoint, targetPoint, getConnectionWaypoints(connection),
        {
          sourceAnchor: resolvedSourceAnchor,
          targetAnchor: resolvedTargetAnchor,
          free: !sourceNode || !targetNode,
          routingMode,
        }
      );
    }

    if (routingMode === "flexible") {
      if (sourceNode && targetNode) {
        return {
          ...getFlexibleAttachedGeometry(
            sourceNode, targetNode,
            connection.sourceAnchor || makeAutoAnchor(),
            connection.targetAnchor || makeAutoAnchor(),
            getConnectionWaypoints(connection)
          ),
          routingMode,
        };
      }

      let sourcePoint = freeSource;
      let targetPoint = freeTarget;

      if (sourceNode) {
        const anchor =
          isAutoAnchor(connection.sourceAnchor) || !connection.sourceAnchor
            ? getSmartAnchorTowardPoint(sourceNode, targetPoint, "right")
            : normalizeAnchor(connection.sourceAnchor, "right");
        sourcePoint = getAnchorPoint(sourceNode, anchor, anchor.side);
      }

      if (targetNode) {
        const anchor =
          isAutoAnchor(connection.targetAnchor) || !connection.targetAnchor
            ? getSmartAnchorTowardPoint(targetNode, sourcePoint, "left")
            : normalizeAnchor(connection.targetAnchor, "left");
        targetPoint = getAnchorPoint(targetNode, anchor, anchor.side);
      }

      return getPolylineGeometry(
        sourcePoint, targetPoint, getConnectionWaypoints(connection),
        { free: true, routingMode }
      );
    }

    if (
      sourceNode &&
      targetNode
    ) {
      return {
        ...getEdgeGeometry(
          sourceNode,
          targetNode,
          connection.sourceAnchor ||
            makeAutoAnchor(),
          connection.targetAnchor ||
            makeAutoAnchor(),
          getConnectionWaypoints(
            connection
          )
        ),
        free: false,
      };
    }

    let sourcePoint =
      freeSource;

    let targetPoint =
      freeTarget;

    if (sourceNode) {
      const anchor =
        isAutoAnchor(
          connection.sourceAnchor
        ) ||
        !connection.sourceAnchor
          ? getSmartAnchorTowardPoint(
              sourceNode,
              targetPoint,
              "right"
            )
          : normalizeAnchor(
              connection.sourceAnchor,
              "right"
            );

      sourcePoint =
        getAnchorPoint(
          sourceNode,
          anchor,
          anchor.side
        );
    }

    if (targetNode) {
      const anchor =
        isAutoAnchor(
          connection.targetAnchor
        ) ||
        !connection.targetAnchor
          ? getSmartAnchorTowardPoint(
              targetNode,
              sourcePoint,
              "left"
            )
          : normalizeAnchor(
              connection.targetAnchor,
              "left"
            );

      targetPoint =
        getAnchorPoint(
          targetNode,
          anchor,
          anchor.side
        );
    }

    return getLooseEdgeGeometry(
      sourcePoint,
      targetPoint,
      getConnectionWaypoints(
        connection
      )
    );
  };

  const findPipeSnapPoint = (
    point,
    ignoreConnectionId
  ) => {
    const candidates = [];
    const draggedConnection = connections.find((item) => item.id === ignoreConnectionId);

    if (!draggedConnection) {
      return null;
    }

    connections.forEach(
      (connection) => {
        if (
          connection.id ===
            ignoreConnectionId
        ) {
          return;
        }

        if (!canConnectionsBranch(draggedConnection, connection)) {
          return;
        }

        const geometry =
          getConnectionGeometry(
            connection
          );

        if (!geometry) {
          return;
        }

        geometry.segments.forEach(
          (
            segment,
            segmentIndex
          ) => {
            const projected =
              projectPointToSegment(
                point,
                segment.start,
                segment.end
              );

            candidates.push({
              ...projected,
              connectionId:
                connection.id,
              segmentIndex,
            });
          }
        );
      }
    );

    const nearest =
      candidates.sort(
        (left, right) =>
          left.distance -
          right.distance
      )[0];

    if (
      !nearest ||
      nearest.distance > 18
    ) {
      return null;
    }

    return nearest;
  };

  useEffect(() => {
    if (!connections.length) {
      return;
    }

    setConnections(
      (current) => {
        let changed = false;

        const byId =
          new Map(
            current.map(
              (connection) => [
                connection.id,
                connection,
              ]
            )
          );

        const next =
          current.map(
            (connection) => {
              let patch = null;

              const syncJoin = (
                join,
                key
              ) => {
                if (
                  !join?.connectionId
                ) {
                  return;
                }

                const parent =
                  byId.get(
                    join.connectionId
                  );

                if (!parent) {
                  return;
                }

                const geometry =
                  getConnectionGeometry(
                    parent
                  );

                const segment =
                  geometry?.segments?.[
                    Number(
                      join.segmentIndex
                    )
                  ];

                if (!segment) {
                  return;
                }

                const t =
                  clamp(
                    Number.isFinite(
                      Number(
                        join.t
                      )
                    )
                      ? Number(
                          join.t
                        )
                      : 0.5,
                    0,
                    1
                  );

                const point = {
                  x:
                    segment.start.x +
                    (
                      segment.end.x -
                      segment.start.x
                    ) *
                      t,
                  y:
                    segment.start.y +
                    (
                      segment.end.y -
                      segment.start.y
                    ) *
                      t,
                };

                const existing =
                  connection[
                    key
                  ];

                if (
                  !existing ||
                  Math.hypot(
                    Number(
                      existing.x || 0
                    ) -
                      point.x,
                    Number(
                      existing.y || 0
                    ) -
                      point.y
                  ) >
                    0.5
                ) {
                  patch = {
                    ...(patch ||
                      {}),
                    [key]:
                      point,
                  };
                }
              };

              syncJoin(
                connection.sourcePipeJoin,
                "freeSource"
              );

              syncJoin(
                connection.targetPipeJoin,
                "freeTarget"
              );

              if (!patch) {
                return connection;
              }

              changed = true;

              return {
                ...connection,
                ...patch,
              };
            }
          );

        return changed
          ? next
          : current;
      }
    );
  }, [
    nodes,
    connections,
  ]);

  const startPipelineDrag = (
    event,
    connection
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedConnectionId(
      connection.id
    );
    setSelectedNodeId(null);
    cancelConnectionDraft();

    const point =
      getCanvasPointFromEvent(
        event
      );

    const geometry =
      getConnectionGeometry(
        connection
      );

    if (!point || !geometry) {
      return;
    }

    const candidates =
      geometry.segments.filter(
        (segment) =>
          segment.draggable
      );

    if (!candidates.length) {
      return;
    }

    const nearest =
      candidates
        .map(
          (segment) => ({
            segment,
            distance:
              distanceToSegment(
                point,
                segment.start,
                segment.end
              ),
          })
        )
        .sort(
          (a, b) =>
            a.distance -
            b.distance
        )[0]?.segment;

    if (!nearest) {
      return;
    }

    // draw.io / Enterprise Architect style: Shift + drag moves the route
    // body as one unit. Attached equipment endpoints remain attached;
    // free endpoints move together with the route. If the route is still
    // straight, seed one bend at the grab point so the middle can move.
    if (
      event.shiftKey &&
      isFreeformRoutingConnection(connection)
    ) {
      const existingWaypoints = getConnectionWaypoints(connection);
      const baseWaypoints = existingWaypoints.length
        ? existingWaypoints.map((waypoint) => ({ ...waypoint }))
        : [{ x: point.x, y: point.y }];

      setPipelineDragging({
        kind: "route-move",
        id: connection.id,
        pointerX: event.clientX,
        pointerY: event.clientY,
        baseWaypoints,
        baseFreeSource: connection.freeSource
          ? { ...connection.freeSource }
          : null,
        baseFreeTarget: connection.freeTarget
          ? { ...connection.freeTarget }
          : null,
      });

      return;
    }

    if (
      isFreeformRoutingConnection(
        connection
      )
    ) {
      // A normal click only selects the Arrow/Line.
      // Once the pointer actually moves, a waypoint is inserted
      // at this segment and follows the pointer freely.
      setPipelineDragging({
        kind:
          "flex-segment",
        id: connection.id,
        segmentIndex:
          Number.isFinite(Number(nearest.waypointInsertIndex))
            ? Number(nearest.waypointInsertIndex)
            : nearest.index,
        pointerX:
          event.clientX,
        pointerY:
          event.clientY,
      });

      return;
    }

    setPipelineDragging({
      kind: "segment",
      id: connection.id,
      segmentIndex:
        nearest.index,
      orientation:
        nearest.orientation,
      baseVertices:
        geometry.vertices.map(
          (vertex) => ({
            ...vertex,
          })
        ),
      free:
        Boolean(
          geometry.free
        ),
      pointerX:
        event.clientX,
      pointerY:
        event.clientY,
    });
  };

  const startCornerDrag = (
    event,
    connection,
    vertexIndex,
    geometry
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedConnectionId(
      connection.id
    );
    setSelectedNodeId(null);

    setPipelineDragging({
      kind: "corner",
      id: connection.id,
      vertexIndex,
      baseVertices:
        geometry.vertices.map(
          (point) => ({
            ...point,
          })
        ),
      free:
        Boolean(
          geometry.free
        ),
    });
  };

  const startWaypointDrag = (
    event,
    connection,
    index
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedConnectionId(
      connection.id
    );
    setSelectedNodeId(null);

    setPipelineDragging({
      kind: "waypoint",
      id: connection.id,
      index,
    });
  };

  const startEndpointDrag = (
    event,
    connection,
    endpoint
  ) => {
    if (
      readOnly ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const geometry =
      getConnectionGeometry(
        connection
      );

    if (!geometry) return;

    const startPoint =
      endpoint === "source"
        ? geometry.source
        : geometry.target;

    setSelectedConnectionId(
      connection.id
    );

    setSelectedNodeId(null);

    // Detach immediately so the
    // endpoint follows the pointer.
    setConnections(
      (current) =>
        current.map((item) => {
          if (
            item.id !==
            connection.id
          ) {
            return item;
          }

          return endpoint ===
            "source"
            ? {
                ...item,
                source: null,
                sourceAnchor: null,
                freeSource:
                  startPoint,
              }
            : {
                ...item,
                target: null,
                targetAnchor: null,
                freeTarget:
                  startPoint,
              };
        })
    );

    setPipelineDragging({
      kind: "endpoint",
      id: connection.id,
      endpoint,
      free: true,
    });
  };

  const getStoredWaypointsFromVertices = (
    geometry,
    vertices
  ) => {
    if (
      !Array.isArray(vertices)
    ) {
      return [];
    }

    if (geometry?.free) {
      return vertices.slice(
        1,
        -1
      );
    }

    return vertices.slice(
      2,
      -2
    );
  };

  const insertBendAtPoint = (
    connection,
    point,
    preferredSegment = null
  ) => {
    if (readOnly) return;

    const geometry =
      getConnectionGeometry(
        connection
      );

    if (!geometry) return;

    const candidates =
      geometry.segments.filter(
        (segment) =>
          segment.draggable
      );

    if (!candidates.length) {
      return;
    }

    const nearest =
      preferredSegment ||
      candidates
        .map(
          (segment) => ({
            segment,
            distance:
              distanceToSegment(
                point,
                segment.start,
                segment.end
              ),
          })
        )
        .sort(
          (left, right) =>
            left.distance -
            right.distance
        )[0]?.segment;

    if (!nearest) return;

    if (
      isFreeformRoutingConnection(
        connection
      )
    ) {
      const currentWaypoints =
        getConnectionWaypoints(
          connection
        );

      // For a polyline, segment index directly maps to the
      // insertion position in the waypoint array.
      const insertIndex =
        clamp(
          Number.isFinite(Number(nearest.waypointInsertIndex))
            ? Number(nearest.waypointInsertIndex)
            : Number(nearest.index),
          0,
          currentWaypoints.length
        );

      const nextWaypoints = [
        ...currentWaypoints,
      ];

      nextWaypoints.splice(
        insertIndex,
        0,
        {
          x: Number(point.x),
          y: Number(point.y),
        }
      );

      setConnections(
        (current) =>
          current.map(
            (item) =>
              item.id ===
                connection.id
                ? {
                    ...item,
                    waypoints:
                      nextWaypoints,
                    routePoint: null,
                  }
                : item
          )
      );

      setSelectedConnectionId(
        connection.id
      );
      setSelectedNodeId(null);
      return;
    }

    const vertices =
      geometry.vertices.map(
        (vertex) => ({
          ...vertex,
        })
      );

    // A collinear point would disappear during simplification.
    // Offset it perpendicular to the chosen segment so a genuine
    // editable detour/bend is created.
    const detour = 34;

    let bendPoint;

    if (
      nearest.orientation ===
      "horizontal"
    ) {
      const roomBelow =
        CANVAS_HEIGHT -
        Number(point.y);

      bendPoint = {
        x:
          Number(point.x),
        y: clamp(
          Number(point.y) +
            (
              roomBelow >
              detour + 20
                ? detour
                : -detour
            ),
          12,
          CANVAS_HEIGHT - 12
        ),
      };
    } else {
      const roomRight =
        CANVAS_WIDTH -
        Number(point.x);

      bendPoint = {
        x: clamp(
          Number(point.x) +
            (
              roomRight >
              detour + 20
                ? detour
                : -detour
            ),
          12,
          CANVAS_WIDTH - 12
        ),
        y:
          Number(point.y),
      };
    }

    const insertAfter =
      nearest.index;

    const desired = [
      ...vertices.slice(
        0,
        insertAfter + 1
      ),
      bendPoint,
      ...vertices.slice(
        insertAfter + 1
      ),
    ];

    const routed =
      orthogonalizeVertices(
        desired
      );

    const nextWaypoints =
      getStoredWaypointsFromVertices(
        geometry,
        routed
      );

    setConnections(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            connection.id
              ? {
                  ...item,
                  waypoints:
                    nextWaypoints,
                  routePoint: null,
                }
              : item
        )
    );

    setSelectedConnectionId(
      connection.id
    );
    setSelectedNodeId(null);
  };

  const addWaypointToConnection = (
    event,
    connection
  ) => {
    if (readOnly) return;

    event.preventDefault();
    event.stopPropagation();

    const point =
      getCanvasPointFromEvent(
        event
      );

    if (!point) return;

    /*
     * V29.1 bend removal guard
     * -------------------------
     * A double-click can occasionally land on the wide invisible connector
     * hit-stroke instead of the small bend handle. Previously that meant the
     * connector-level handler inserted ANOTHER bend.
     *
     * Behave more like draw.io instead:
     *   - double-click near an existing bend -> remove that bend
     *   - double-click on an empty part of the route -> add a bend
     */
    const geometry =
      getConnectionGeometry(
        connection
      );

    const removeRadius = 22;

    if (
      isFreeformRoutingConnection(
        connection
      )
    ) {
      const waypoints =
        getConnectionWaypoints(
          connection
        );

      const nearest =
        waypoints
          .map((waypoint, index) => ({
            index,
            distance: Math.hypot(
              Number(waypoint.x) - Number(point.x),
              Number(waypoint.y) - Number(point.y)
            ),
          }))
          .sort(
            (left, right) =>
              left.distance - right.distance
          )[0];

      if (
        nearest &&
        nearest.distance <= removeRadius
      ) {
        setConnections(
          (current) =>
            current.map(
              (item) =>
                item.id === connection.id
                  ? {
                      ...item,
                      waypoints:
                        waypoints.filter(
                          (_waypoint, index) =>
                            index !== nearest.index
                        ),
                      routePoint: null,
                    }
                  : item
            )
        );

        setSelectedConnectionId(
          connection.id
        );
        setSelectedNodeId(null);
        return;
      }
    } else if (geometry) {
      const firstEditableVertex =
        geometry.free ? 1 : 2;

      const lastEditableVertex =
        geometry.free
          ? geometry.vertices.length - 2
          : geometry.vertices.length - 3;

      const editableVertices =
        geometry.vertices
          .map((vertex, vertexIndex) => ({
            vertex,
            vertexIndex,
          }))
          .filter(
            ({ vertexIndex }) =>
              vertexIndex >= firstEditableVertex &&
              vertexIndex <= lastEditableVertex
          );

      const nearest =
        editableVertices
          .map(({ vertex, vertexIndex }) => ({
            vertexIndex,
            distance: Math.hypot(
              Number(vertex.x) - Number(point.x),
              Number(vertex.y) - Number(point.y)
            ),
          }))
          .sort(
            (left, right) =>
              left.distance - right.distance
          )[0];

      if (
        nearest &&
        nearest.distance <= removeRadius
      ) {
        const vertices =
          geometry.vertices.map(
            (vertex) => ({ ...vertex })
          );

        vertices.splice(
          nearest.vertexIndex,
          1
        );

        const routed =
          orthogonalizeVertices(
            vertices
          );

        setConnections(
          (current) =>
            current.map(
              (item) =>
                item.id === connection.id
                  ? {
                      ...item,
                      waypoints:
                        getStoredWaypointsFromVertices(
                          geometry,
                          routed
                        ),
                      routePoint: null,
                    }
                  : item
            )
        );

        setSelectedConnectionId(
          connection.id
        );
        setSelectedNodeId(null);
        return;
      }
    }

    insertBendAtPoint(
      connection,
      point
    );
  };

  const addBendToSelectedConnection = () => {
    if (
      readOnly ||
      !selectedConnection
    ) {
      return;
    }

    const geometry =
      getConnectionGeometry(
        selectedConnection
      );

    if (!geometry) return;

    const longest =
      geometry.segments
        .filter(
          (segment) =>
            segment.draggable
        )
        .map(
          (segment) => ({
            ...segment,
            length:
              Math.hypot(
                segment.end.x -
                  segment.start.x,
                segment.end.y -
                  segment.start.y
              ),
          })
        )
        .sort(
          (left, right) =>
            right.length -
            left.length
        )[0];

    if (!longest) {
      return;
    }

    insertBendAtPoint(
      selectedConnection,
      longest.midpoint,
      longest
    );
  };

  const removeCornerFromConnection = (
    event,
    connection,
    vertexIndex,
    geometry
  ) => {
    if (readOnly) return;

    event.preventDefault();
    event.stopPropagation();

    if (
      isFreeformRoutingConnection(
        connection
      )
    ) {
      const waypoints =
        getConnectionWaypoints(
          connection
        );

      // Geometry is [source, ...waypoints, target].
      const waypointIndex =
        vertexIndex - 1;

      if (
        waypointIndex < 0 ||
        waypointIndex >=
          waypoints.length
      ) {
        return;
      }

      const nextWaypoints = [
        ...waypoints,
      ];

      nextWaypoints.splice(
        waypointIndex,
        1
      );

      setConnections(
        (current) =>
          current.map(
            (item) =>
              item.id ===
                connection.id
                ? {
                    ...item,
                    waypoints:
                      nextWaypoints,
                    routePoint: null,
                  }
                : item
          )
      );

      return;
    }

    const vertices =
      geometry.vertices.map(
        (vertex) => ({
          ...vertex,
        })
      );

    if (
      vertexIndex <= 0 ||
      vertexIndex >=
        vertices.length - 1
    ) {
      return;
    }

    vertices.splice(
      vertexIndex,
      1
    );

    const routed =
      orthogonalizeVertices(
        vertices
      );

    setConnections(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            connection.id
              ? {
                  ...item,
                  waypoints:
                    getStoredWaypointsFromVertices(
                      geometry,
                      routed
                    ),
                  routePoint: null,
                }
              : item
        )
    );
  };

  const removeWaypoint = (
    connectionId,
    index
  ) => {
    if (readOnly) return;

    setConnections(
      (current) =>
        current.map(
          (connection) => {
            if (
              connection.id !==
              connectionId
            ) {
              return connection;
            }

            const waypoints =
              getConnectionWaypoints(
                connection
              );

            return {
              ...connection,
              waypoints:
                waypoints.filter(
                  (
                    _point,
                    pointIndex
                  ) =>
                    pointIndex !==
                    index
                ),
              routePoint: null,
            };
          }
        )
    );
  };

  const updateSelectedConnection = (patch) => {
    if (!selectedConnection) return;
    setConnections((current) =>
      current.map((connection) =>
        connection.id === selectedConnection.id ? { ...connection, ...patch } : connection
      )
    );
  };

  const updateNodeBinding = (
    metricId,
    dataKey
  ) => {
    if (!selectedNode) return;

    updateSelectedNode({
      bindings: {
        ...(selectedNode.bindings ||
          selectedNode.metricBindings ||
          {}),
        [metricId]: dataKey,
      },
    });
  };

  const toggleMetricDisplay = (
    metricId
  ) => {
    if (!selectedNode) return;

    const current =
      getVisibleMetricIds(selectedNode);

    const exists =
      current.includes(metricId);

    const next = exists
      ? current.filter(
          (id) => id !== metricId
        )
      : [
          ...current,
          metricId,
        ].slice(0, MAX_VISIBLE_METRICS);

    updateSelectedNode({
      displayMetricIds: next,
    });
  };

  const addCustomMetric = () => {
    if (!selectedNode || readOnly) return;

    const existingBindings =
      selectedNode.bindings ||
      selectedNode.metricBindings ||
      {};

    const usedDataKeys =
      new Set(
        Object.values(
          existingBindings
        ).filter(Boolean)
      );

    const available =
      getDeviceDataOptions(
        selectedNode.deviceId
      );

    const suggested =
      available.find(
        (option) =>
          !usedDataKeys.has(option.key)
      ) ||
      available[0] ||
      null;

    const id =
      `custom-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

    const customMetric = {
      id,
      label:
        suggested?.label ||
        `Custom Data ${
          (selectedNode.customMetrics || [])
            .length + 1
        }`,
      unit:
        suggested?.unit || "",
      kind: "number",
      min: 0,
      max: 100,
      custom: true,
      statusMappings: [],
    };

    const nextCustomMetrics = [
      ...(selectedNode.customMetrics ||
        []),
      customMetric,
    ];

    const nextBindings = {
      ...existingBindings,
    };

    if (suggested?.key) {
      nextBindings[id] =
        suggested.key;
    }

    const visibleIds =
      getVisibleMetricIds(
        selectedNode
      );

    updateSelectedNode({
      customMetrics:
        nextCustomMetrics,
      bindings: nextBindings,
      displayMetricIds:
        visibleIds.length <
        MAX_VISIBLE_METRICS
          ? [
              ...visibleIds,
              id,
            ]
          : visibleIds,
    });
  };

  const updateCustomMetric = (
    metricId,
    patch
  ) => {
    if (!selectedNode) return;

    updateSelectedNode({
      customMetrics: (
        selectedNode.customMetrics ||
        []
      ).map((metric) =>
        metric.id === metricId
          ? {
              ...metric,
              ...patch,
            }
          : metric
      ),
    });
  };

  const removeCustomMetric = (
    metricId
  ) => {
    if (!selectedNode || readOnly) {
      return;
    }

    const nextBindings = {
      ...(selectedNode.bindings ||
        selectedNode.metricBindings ||
        {}),
    };

    delete nextBindings[metricId];

    updateSelectedNode({
      customMetrics: (
        selectedNode.customMetrics ||
        []
      ).filter(
        (metric) =>
          metric.id !== metricId
      ),
      bindings: nextBindings,
      displayMetricIds:
        getVisibleMetricIds(
          selectedNode
        ).filter(
          (id) => id !== metricId
        ),
    });
  };

  const hideDefaultMetric = (
    metricId
  ) => {
    if (!selectedNode || readOnly) {
      return;
    }

    const hidden =
      new Set(
        getHiddenDefaultMetricIds(
          selectedNode
        )
      );

    hidden.add(metricId);

    updateSelectedNode({
      hiddenDefaultMetricIds:
        [...hidden],

      // Hiding a default field also
      // removes it from the compact
      // data card. Its binding is
      // preserved in case it is
      // restored later.
      displayMetricIds:
        getVisibleMetricIds(
          selectedNode
        ).filter(
          (id) =>
            id !== metricId
        ),
    });
  };

  const restoreDefaultMetrics = () => {
    if (!selectedNode || readOnly) {
      return;
    }

    updateSelectedNode({
      hiddenDefaultMetricIds: [],
    });
  };

  const updateMetricStatusMappings = (
    metricId,
    mappings
  ) => {
    if (!selectedNode || readOnly) {
      return;
    }

    updateSelectedNode({
      statusMappings: {
        ...(
          selectedNode.statusMappings ||
          {}
        ),
        [metricId]:
          normalizeStatusMappings(
            mappings
          ),
      },
    });
  };

  const updateStatusMappingEntry = (
    metricId,
    index,
    patch
  ) => {
    const metric =
      getNodeMetricDefinitions(
        selectedNode
      ).find(
        (item) =>
          item.id === metricId
      );

    const current =
      normalizeStatusMappings(
        metric?.statusMappings
      );

    const next =
      current.map(
        (mapping, itemIndex) =>
          itemIndex === index
            ? {
                ...mapping,
                ...patch,
              }
            : mapping
      );

    updateMetricStatusMappings(
      metricId,
      next
    );
  };

  const addStatusMappingEntry = (
    metricId
  ) => {
    const metric =
      getNodeMetricDefinitions(
        selectedNode
      ).find(
        (item) =>
          item.id === metricId
      );

    const current =
      normalizeStatusMappings(
        metric?.statusMappings
      );

    const numericValues =
      current
        .map((mapping) =>
          Number(mapping.value)
        )
        .filter(
          Number.isFinite
        );

    const nextValue =
      numericValues.length > 0
        ? Math.max(
            ...numericValues
          ) + 1
        : current.length;

    updateMetricStatusMappings(
      metricId,
      [
        ...current,
        {
          id:
            `status-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 5)}`,
          value:
            String(nextValue),
          label:
            `STATUS ${nextValue}`,
        },
      ]
    );
  };

  const removeStatusMappingEntry = (
    metricId,
    index
  ) => {
    const metric =
      getNodeMetricDefinitions(
        selectedNode
      ).find(
        (item) =>
          item.id === metricId
      );

    const current =
      normalizeStatusMappings(
        metric?.statusMappings
      );

    // Keep at least one mapping row.
    if (current.length <= 1) {
      return;
    }

    updateMetricStatusMappings(
      metricId,
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const renderStatusMappingEditor = (
    metric
  ) => {
    if (
      metric?.kind !== "status"
    ) {
      return null;
    }

    const mappings =
      normalizeStatusMappings(
        metric.statusMappings
      );

    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2 dark:border-amber-400/20 dark:bg-amber-400/5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[8px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Status Value Mapping
            </div>
            <div className="mt-0.5 text-[7px] leading-relaxed text-slate-400">
              Define what each raw number means.
              Example: 0 = OFF, 1 = ON, 2 = ALARM.
            </div>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                addStatusMappingEntry(
                  metric.id
                )
              }
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 text-[7px] font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-[#081022] dark:text-amber-200"
            >
              <Plus size={9} />
              Add status
            </button>
          )}
        </div>

        <div className="mt-2 space-y-1.5">
          {mappings.map(
            (mapping, index) => (
              <div
                key={
                  mapping.id ||
                  `${metric.id}-${index}`
                }
                className="grid grid-cols-[62px_12px_1fr_24px] items-center gap-1.5"
              >
                <input
                  value={
                    mapping.value
                  }
                  disabled={readOnly}
                  onChange={(event) =>
                    updateStatusMappingEntry(
                      metric.id,
                      index,
                      {
                        value:
                          event.target
                            .value,
                      }
                    )
                  }
                  aria-label="Raw status value"
                  placeholder="0"
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 text-center text-[8px] font-bold outline-none focus:border-amber-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                />

                <span className="text-center text-[8px] font-bold text-slate-400">
                  =
                </span>

                <input
                  value={
                    mapping.label
                  }
                  disabled={readOnly}
                  onChange={(event) =>
                    updateStatusMappingEntry(
                      metric.id,
                      index,
                      {
                        label:
                          event.target
                            .value,
                      }
                    )
                  }
                  aria-label="Status label"
                  placeholder="OFF"
                  className="h-7 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-[8px] font-semibold outline-none focus:border-amber-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                />

                {!readOnly ? (
                  <button
                    type="button"
                    title="Remove status mapping"
                    disabled={
                      mappings.length <=
                      1
                    }
                    onClick={() =>
                      removeStatusMappingEntry(
                        metric.id,
                        index
                      )
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-400/10"
                  >
                    <X size={10} />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const deleteSelectedNode = async () => {
    if (!selectedNode || readOnly) return;

    const confirmed = await confirmAction({
      title: "Delete equipment?",
      message: `Remove ${selectedNode.label} and all pipelines connected to it?`,
      confirmLabel: "Delete",
      tone: "danger",
    });

    if (!confirmed) return;

    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setConnections((current) =>
      current.filter(
        (connection) =>
          connection.source !== selectedNode.id && connection.target !== selectedNode.id
      )
    );
    setSelectedNodeId(null);
  };

  const deleteSelectedConnection = () => {
    if (!selectedConnection || readOnly) return;
    setConnections((current) =>
      current.filter((connection) => connection.id !== selectedConnection.id)
    );
    setSelectedConnectionId(null);
    setRouteEditConnectionId(null);
  };

  // V29.2 keyboard convenience: Delete / Backspace removes the currently
  // selected connector or equipment. Never intercept typing/editing controls.
  useEffect(() => {
    if (readOnly) return undefined;

    const handleDeleteKey = (event) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const target = event.target;
      const tagName = String(target?.tagName || "").toLowerCase();
      const isTypingTarget =
        target?.isContentEditable ||
        ["input", "textarea", "select", "option"].includes(tagName);

      if (isTypingTarget) {
        return;
      }

      if (selectedConnection) {
        event.preventDefault();
        deleteSelectedConnection();
        return;
      }

      if (selectedNode) {
        event.preventDefault();
        deleteSelectedNode();
      }
    };

    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [readOnly, selectedConnection, selectedNode]);

  const saveTopology = async () => {
    const primaryStorageKey =
      getStoredTopologyKey(template?.id);

    const payload = {
      nodes,
      connections,
      mode,
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
      dataSources:
        runtimeDataSources || {},
      templateId:
        template?.id ?? null,
      processFlowId:
        processFlow?.id ?? null,
      savedAt:
        new Date().toISOString(),
    };

    try {
      // V6 source of truth: save the named Process Flow through
      // the workspace/backend when one is open.
      if (
        processFlow?.id &&
        typeof onSaveProcessFlow ===
          "function"
      ) {
        await onSaveProcessFlow(
          payload
        );
      }

      // Keep the previous local cache as a compatibility/offline
      // fallback and as an import path for older widgets.
      const serialized =
        JSON.stringify(payload);

      localStorage.setItem(
        primaryStorageKey,
        serialized
      );

      localStorage.setItem(
        LATEST_TOPOLOGY_KEY,
        JSON.stringify({
          ...payload,
          sourceKey:
            primaryStorageKey,
        })
      );

      // The official save is now the source of truth. Remove the temporary
      // working draft so it cannot override the freshly saved topology later.
      clearPageDraft(processDraftKey);

      window.dispatchEvent(
        new CustomEvent(
          "palm-oil-process-topology-saved",
          {
            detail: {
              storageKey:
                primaryStorageKey,
              templateId:
                template?.id ?? null,
              processFlowId:
                processFlow?.id ?? null,
            },
          }
        )
      );

      notify(
        processFlow?.id
          ? `Process flow "${
              processFlow.name ||
              processFlow.id
            }" saved.`
          : "Plant process layout saved.",
        "success"
      );
    } catch (error) {
      console.error(
        "Save process flow error:",
        error
      );

      notify(
        error?.message ||
          "Unable to save process flow",
        "error"
      );
    }
  };

  const pipeNetworkJunctions =
    buildPipeNetworkJunctions(
      connections
        .map(
          (connection) => {
            const connectorType =
              connection.connectorType ||
              (
                connection.connectionStyle ===
                "arrows"
                  ? "arrow"
                  : "pipeline"
              );

            if (
              connectorType !==
              "pipeline"
            ) {
              return null;
            }

            const resolvedDesign =
              resolveDynamicPipeDesign(
                connection.pipeDesign ||
                  "auto",
                connection.medium
              );

            if (
              resolvedDesign !==
              "realPipe"
            ) {
              return null;
            }

            const geometry =
              getConnectionGeometry(
                connection
              );

            if (!geometry) {
              return null;
            }

            return {
              id:
                connection.id,
              path:
                geometry.path,
              color:
                /^#[0-9a-fA-F]{6}$/.test(
                  String(
                    connection.colorOverride ||
                      ""
                  )
                )
                  ? connection.colorOverride
                  : "#AEB7BC",
            };
          }
        )
        .filter(Boolean)
    );

  const connectionBranchJunctions =
    buildConnectionBranchJunctions(
      connections.map((connection) => {
        const geometry = getConnectionGeometry(connection);
        return {
          ...connection,
          path: geometry?.path || "",
          color: connection.colorOverride ||
            (["arrow", "line"].includes(getConnectionKind(connection)) ? "#64748B" : "#AEB7BC"),
        };
      })
    );

  const visibleConnectionJunctions = [
    ...pipeNetworkJunctions,
    ...connectionBranchJunctions,
  ].filter((junction, index, all) =>
    index === all.findIndex((candidate) =>
      Math.hypot(candidate.x - junction.x, candidate.y - junction.y) < 1 &&
      (candidate.connectorType || "pipeline") === (junction.connectorType || "pipeline")
    )
  );

  const renderConnection = (connection) => {
    const geometry =
      getConnectionGeometry(
        connection
      );

    if (!geometry) {
      return null;
    }

    const media =
      PROCESS_MEDIA[
        connection.medium
      ] ||
      PROCESS_MEDIA.steam;

    const selected =
      connection.id ===
      selectedConnectionId;

    const routeEditing =
      routeEditConnectionId === connection.id;

    // V24 quick-edit: once a Flexible/Free connection is selected,
    // dragging the visible route can pull out a bend immediately.
    // Full endpoint/corner handles still require Edit Route.
    const quickFreeEdit =
      selected &&
      !readOnly &&
      isFreeformRoutingConnection(connection);

    // V27 circuit quick-edit: selected circuit routes expose their
    // 90° elbows and segment grips immediately. Dragging the route
    // moves the nearest H/V segment, while double-click adds a new elbow.
    const quickCircuitEdit =
      selected &&
      !readOnly &&
      isCircuitRoutingConnection(connection);

    // V28 direct-manipulation mode. Selected Diagram connectors behave
    // like draw.io/Packet Tracer links: drag the route itself, drag bend
    // points, or drag either endpoint immediately without entering Edit Route.
    const quickDiagramEdit =
      selected &&
      !readOnly &&
      getConnectionRoutingMode(connection) === "diagram";

    // V29.2: Line stays simple, but is directly editable: endpoints are always
    // available, dragging the line can pull out a bend, and saved bends can be
    // dragged/double-clicked without entering a separate route-edit mode.
    const quickSimpleLine =
      selected &&
      !readOnly &&
      getConnectionRoutingMode(connection) === "simple";

    const value =
      resolveConnectionValue(
        connection
      );

    const connectionColor =
      /^#[0-9a-fA-F]{6}$/.test(
        String(
          connection.colorOverride ||
            ""
        )
      )
        ? connection.colorOverride
        : media.color;

    const labelPoint =
      getConnectionLabelPoint(
        connection,
        geometry
      );

    return (
      <g key={connection.id}>
        <ProcessPipeline
          id={connection.id}
          path={geometry.path}
          medium={
            connection.medium
          }
          value={value}
          label={
            connection.label ||
            media.label
          }
          selected={selected}
          dark={dark}
          pipeDesign={
            connection.pipeDesign ||
            "auto"
          }
          colorOverride={
            connection.colorOverride ||
            ""
          }
          connectorType={
            connection.connectorType ||
            (
              connection.connectionStyle ===
              "arrows"
                ? "arrow"
                : "pipeline"
            )
          }
          animateFlow={
            connection.animateFlow !==
            false
          }
          sourceJoined={
            Boolean(
              connection.sourcePipeJoin
            )
          }
          targetJoined={
            Boolean(
              connection.targetPipeJoin
            )
          }
          onSelect={(event) => {
            event.stopPropagation();

            setSelectedConnectionId(
              connection.id
            );

            setSelectedNodeId(null);
          }}
          onPointerDown={
            routeEditing || quickFreeEdit || quickCircuitEdit || quickDiagramEdit || quickSimpleLine
              ? (event) =>
                  startPipelineDrag(
                    event,
                    connection
                  )
              : undefined
          }
          onDoubleClick={
            routeEditing || quickFreeEdit || quickCircuitEdit || quickDiagramEdit || quickSimpleLine
              ? (event) =>
                  addWaypointToConnection(
                    event,
                    connection
                  )
              : undefined
          }
        />

        {selected &&
          (routeEditing || quickCircuitEdit || quickDiagramEdit || quickSimpleLine) &&
          !readOnly && (
            <>
              {/* Endpoint reconnection remains an advanced action so
                  circuit quick-edit cannot accidentally detach equipment. */}
              {(routeEditing || quickDiagramEdit || quickSimpleLine) && [
                {
                  endpoint:
                    "source",
                  point:
                    geometry.source,
                },
                {
                  endpoint:
                    "target",
                  point:
                    geometry.target,
                },
              ].map(
                ({
                  endpoint,
                  point,
                }) => (
                  <g
                    key={
                      endpoint
                    }
                    transform={`translate(${point.x}, ${point.y})`}
                    className="cursor-crosshair"
                    onPointerDown={(
                      event
                    ) =>
                      startEndpointDrag(
                        event,
                        connection,
                        endpoint
                      )
                    }
                  >
                    {/* Large invisible grab target. The visible handle stays compact,
                        but grabbing/reconnecting near equipment is much easier. */}
                    <circle
                      r="19"
                      fill="transparent"
                      stroke="transparent"
                      style={{ pointerEvents: "all" }}
                    />

                    <circle
                      r="9"
                      fill={
                        dark
                          ? "#081022"
                          : "#ffffff"
                      }
                      stroke={
                        connectionColor
                      }
                      strokeWidth="2.5"
                    />

                    <circle
                      r="3.5"
                      fill={
                        connectionColor
                      }
                    />
                  </g>
                )
              )}

              {isFreeformRoutingConnection(
                connection
              ) ? (
                <>
                  {/* Arrow / Line: each saved bend is a free X/Y waypoint. */}
                  {getConnectionWaypoints(
                    connection
                  ).map(
                    (
                      point,
                      index
                    ) => (
                      <g
                        key={`${connection.id}-free-waypoint-${index}`}
                        transform={`translate(${point.x}, ${point.y})`}
                        className="cursor-move"
                        title="Drag bend · double-click or right-click to remove"
                        onPointerDown={(
                          event
                        ) =>
                          startWaypointDrag(
                            event,
                            connection,
                            index
                          )
                        }
                        onDoubleClick={(
                          event
                        ) =>
                          removeCornerFromConnection(
                            event,
                            connection,
                            index + 1,
                            geometry
                          )
                        }
                        onContextMenu={(
                          event
                        ) =>
                          removeCornerFromConnection(
                            event,
                            connection,
                            index + 1,
                            geometry
                          )
                        }
                      >
                        <circle
                          r="8"
                          fill={
                            dark
                              ? "#081022"
                              : "#ffffff"
                          }
                          stroke={
                            connectionColor
                          }
                          strokeWidth="2"
                        />

                        <circle
                          r="3"
                          fill={
                            connectionColor
                          }
                        />
                      </g>
                    )
                  )}

                  {/* Drag a midpoint + to pull out a brand-new bend.
                      Clicking without moving does not create anything. */}
                  {getConnectionRoutingMode(connection) !== "simple" &&
                    geometry.segments.map(
                      (segment) => (
                        <g
                          key={`${connection.id}-free-mid-${segment.index}`}
                          transform={`translate(${segment.midpoint.x}, ${segment.midpoint.y})`}
                          className="cursor-move"
                          onPointerDown={(
                            event
                          ) =>
                            startPipelineDrag(
                              event,
                              connection
                            )
                          }
                        >
                          <circle
                            r="7"
                            fill={
                              dark
                                ? "#0E172D"
                                : "#ffffff"
                            }
                            stroke={
                              connectionColor
                            }
                            strokeWidth="1.5"
                            opacity=".92"
                          />

                          <path
                            d="M-3 0h6M0 -3v6"
                            stroke={
                              connectionColor
                            }
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </g>
                      )
                    )}
                </>
              ) : (
                <>
                  {/* Pipeline Auto/Circuit: orthogonal corners. Circuit mode
                      exposes these immediately after selection. */}
                  {(geometry.free
                    ? geometry.vertices.slice(
                        1,
                        -1
                      )
                    : geometry.vertices.slice(
                        2,
                        -2
                      )
                  ).map(
                    (
                      point,
                      index
                    ) => {
                      const vertexIndex =
                        index +
                        (
                          geometry.free
                            ? 1
                            : 2
                        );

                      return (
                        <g
                          key={`${connection.id}-corner-${vertexIndex}`}
                          transform={`translate(${point.x}, ${point.y})`}
                          className="cursor-move"
                          title="Drag bend · double-click or right-click to remove"
                          onPointerDown={(
                            event
                          ) =>
                            startCornerDrag(
                              event,
                              connection,
                              vertexIndex,
                              geometry
                            )
                          }
                          onDoubleClick={(
                            event
                          ) =>
                            removeCornerFromConnection(
                              event,
                              connection,
                              vertexIndex,
                              geometry
                            )
                          }
                          onContextMenu={(
                            event
                          ) =>
                            removeCornerFromConnection(
                              event,
                              connection,
                              vertexIndex,
                              geometry
                            )
                          }
                        >
                          <rect
                            x="-6"
                            y="-6"
                            width="12"
                            height="12"
                            rx="2"
                            fill={
                              dark
                                ? "#0E172D"
                                : "#ffffff"
                            }
                            stroke={
                              connectionColor
                            }
                            strokeWidth="2"
                            transform="rotate(45)"
                          />

                          <circle
                            r="2.4"
                            fill={
                              connectionColor
                            }
                          />
                        </g>
                      );
                    }
                  )}

                  {/* Circuit/Auto segment grips move only perpendicular
                      to the H/V segment, preserving clean 90° elbows. */}
                  {geometry.segments
                    .filter(
                      (segment) =>
                        segment.draggable
                    )
                    .map(
                      (segment) => {
                        const horizontal =
                          segment.orientation ===
                          "horizontal";

                        return (
                          <g
                            key={`${connection.id}-segment-${segment.index}`}
                            transform={`translate(${segment.midpoint.x}, ${segment.midpoint.y})`}
                            className={
                              horizontal
                                ? "cursor-ns-resize"
                                : "cursor-ew-resize"
                            }
                            onPointerDown={(
                              event
                            ) =>
                              startPipelineDrag(
                                event,
                                connection
                              )
                            }
                          >
                            <rect
                              x={
                                horizontal
                                  ? -13
                                  : -6
                              }
                              y={
                                horizontal
                                  ? -6
                                  : -13
                              }
                              width={
                                horizontal
                                  ? 26
                                  : 12
                              }
                              height={
                                horizontal
                                  ? 12
                                  : 26
                              }
                              rx="6"
                              fill={
                                dark
                                  ? "#081022"
                                  : "#ffffff"
                              }
                              stroke={
                                connectionColor
                              }
                              strokeWidth="1.6"
                              opacity=".96"
                            />

                            {horizontal ? (
                              <path
                                d="M-5 -2h10M-5 2h10"
                                stroke={
                                  connectionColor
                                }
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            ) : (
                              <path
                                d="M-2 -5v10M2 -5v10"
                                stroke={
                                  connectionColor
                                }
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            )}
                          </g>
                        );
                      }
                    )}
                </>
              )}
            </>
          )}

        {(connection.label ||
          connection.dataKey) && (
          <g
            transform={`translate(${labelPoint.x}, ${labelPoint.y})`}
            className={
              readOnly
                ? "pointer-events-none"
                : "cursor-move"
            }
            onPointerDown={(event) =>
              startConnectionLabelDrag(
                event,
                connection,
                geometry
              )
            }
            onClick={(event) => {
              event.stopPropagation();

              setSelectedConnectionId(
                connection.id
              );
              setSelectedNodeId(null);
            }}
            onDoubleClick={(event) => {
              if (readOnly) return;

              event.preventDefault();
              event.stopPropagation();

              setConnections((current) =>
                current.map((item) =>
                  item.id ===
                  connection.id
                    ? {
                        ...item,
                        labelOffset: {
                          x: 0,
                          y: 0,
                        },
                      }
                    : item
                )
              );
            }}
          >
            <rect
              x="-45"
              y="-14"
              width="90"
              height="28"
              rx="8"
              fill={
                dark
                  ? "#0E172D"
                  : "#ffffff"
              }
              stroke={
                selected
                  ? connectionColor
                  : dark
                  ? "#263657"
                  : "#CBD5E1"
              }
              strokeWidth="1"
              opacity=".96"
            />

            <text
              y="-2"
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="800"
              pointerEvents="none"
              fill={
                dark
                  ? "#E8EDFF"
                  : "#334155"
              }
            >
              {connection.label ||
                media.label}
            </text>

            <text
              y="9"
              textAnchor="middle"
              fontSize="6.5"
              pointerEvents="none"
              fill={
                connectionColor
              }
            >
              {Number.isFinite(
                Number(value)
              )
                ? `${Number(
                    value
                  ).toFixed(1)} ${
                    media.unit ||
                    ""
                  }`
                : "—"}
            </text>

            <title>
              {readOnly
                ? "Connection label"
                : "Drag label to move · double-click to reset"}
            </title>
          </g>
        )}
      </g>
    );
  };

  const draftPipeline = (() => {
    if (
      !pipelineToolActive ||
      !connectFrom ||
      !draftPointer
    ) {
      return null;
    }

    const sourceNode =
      nodes.find(
        (node) =>
          node.id ===
          connectFrom.nodeId
      );

    if (!sourceNode) {
      return null;
    }

    const sourceAnchor =
      isAutoAnchor(
        connectFrom.anchor
      )
        ? getSmartAnchorTowardPoint(
            sourceNode,
            draftPointer,
            "right"
          )
        : normalizeAnchor(
            connectFrom.anchor,
            connectFrom.side ||
              "right"
          );

    const source =
      getAnchorPoint(
        sourceNode,
        sourceAnchor,
        sourceAnchor.side
      );

    const direction =
      getAnchorDirection(
        sourceAnchor.side
      );

    const sourceOuter = {
      x:
        source.x +
        direction.x * 28,
      y:
        source.y +
        direction.y * 28,
    };

    const vertices =
      connectionToolType === "pipeline"
        ? orthogonalizeVertices([
            source,
            sourceOuter,
            draftPointer,
          ])
        : [source, draftPointer];

    return {
      path:
        verticesToPath(
          vertices
        ),
      vertices,
    };
  })();

  return (
    <div className="process-simulator-page relative flex h-full min-h-0 flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      <div className="mb-2 flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#2C3C61] dark:bg-[#0E172D] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
            <Factory size={19} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black text-slate-900 dark:text-[#E8EDFF]">
              {processFlow?.name ||
                "Palm Oil Process View"}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#93A2C7]">
              {processFlow?.description ||
                "Visualize mapped industrial data through equipment displays connected only by animated process pipelines."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-[#2C3C61] dark:bg-[#081022]">
            {["live", "hybrid", "fake"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                  mode === item
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {item === "fake" ? "Simulation" : item}
              </button>
            ))}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={saveTopology}
              className="process-save-button inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[11px] font-semibold text-white transition hover:bg-cyan-500"
            >
              <Save size={13} /> {processFlow?.id ? "Save Flow" : "Save Layout"}
            </button>
          )}

        </div>
      </div>

      <div
        className={`process-simulator-layout grid min-h-0 flex-1 grid-cols-1 items-stretch gap-2 overflow-hidden pb-11 ${
          libraryCollapsed && inspectorCollapsed
            ? "xl:grid-cols-[46px_minmax(0,1fr)_46px]"
            : libraryCollapsed
            ? "xl:grid-cols-[46px_minmax(0,1fr)_310px]"
            : inspectorCollapsed
            ? "xl:grid-cols-[280px_minmax(0,1fr)_46px]"
            : "xl:grid-cols-[280px_minmax(0,1fr)_310px]"
        }`}
      >
        <aside className="process-simulator-side-panel flex max-h-[360px] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-[width] dark:border-[#2C3C61] dark:bg-[#0E172D] xl:h-full xl:max-h-none">
          {libraryCollapsed ? (
            <div className="flex min-h-[46px] flex-row items-center justify-center gap-3 p-2 xl:h-full xl:min-h-0 xl:flex-col xl:justify-start xl:py-3">
              <button
                type="button"
                onClick={() => setLibraryCollapsed(false)}
                title="Expand equipment library"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-cyan-600 transition hover:bg-cyan-50 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-cyan-300 dark:hover:bg-[#1B2948]"
              >
                <ChevronRight size={15} />
              </button>
              <Layers size={16} className="text-cyan-500" />
              <span className="hidden [writing-mode:vertical-rl] rotate-180 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 xl:block">
                Equipment
              </span>
            </div>
          ) : (
            <>
          <div className="border-b border-slate-200 p-2.5 dark:border-[#263657]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xs font-bold">Equipment Library</h2>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">Drag an item onto the plant canvas.</p>
              </div>
              <button
                type="button"
                onClick={() => setLibraryCollapsed(true)}
                title="Minimize equipment library"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-[#2C3C61] dark:text-slate-300 dark:hover:bg-[#15213D] dark:hover:text-cyan-200"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Search equipment or parts..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-8 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
              />
              {hasLibrarySearch && (
                <button
                  type="button"
                  onClick={() => setLibrarySearch("")}
                  title="Clear search"
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-[#15213D] dark:hover:text-slate-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">

          <div className="border-b border-slate-200 p-2 dark:border-[#263657]">
            <div className="mb-1.5 flex items-center justify-between">
              <div>
                <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300">
                  Your Equipment
                </div>
                <div className="mt-0.5 text-[7px] text-slate-400">
                  Need a machine that is not in the library? Add your own image.
                </div>
              </div>
            </div>
            {(
              <button
                type="button"
                draggable={!readOnly}
                disabled={readOnly}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-process-equipment", "custom-equipment");
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onDoubleClick={() => addNodeAt("custom-equipment", 320, 180)}
                className="mb-1.5 w-full rounded-lg border-2 border-dashed border-cyan-300 bg-cyan-50/60 p-1.5 text-left transition hover:border-cyan-400 hover:bg-cyan-50 disabled:opacity-60 dark:border-cyan-400/30 dark:bg-cyan-400/5 dark:hover:bg-cyan-400/10"
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-white dark:bg-[#081022]">
                    <ProcessEquipmentVisual
                      type="custom-equipment"
                      values={{}}
                      dark={dark}
                    />
                    <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white shadow">
                      <Upload size={11} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black text-cyan-800 dark:text-cyan-200">
                      + Custom Equipment
                    </div>
                    <div className="mt-0.5 text-[8px] leading-3 text-slate-500 dark:text-slate-400">
                      Place it, then upload your own machine image in the Inspector.
                    </div>
                  </div>
                </div>
              </button>
            )}

          </div>
          <details className="border-b border-slate-200 p-2 dark:border-[#263657]">
            <summary className="cursor-pointer py-1 text-[11px] font-semibold text-slate-500">
              Optional Fittings & Valves
            </summary>

            <div className="max-h-[275px] space-y-2 overflow-y-auto pr-0.5">
              {assemblyGroups.map(([groupName, items]) => (
                <div key={groupName}>
                  <div className="mb-1 text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    {groupName}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        draggable={!readOnly}
                        disabled={readOnly}
                        title={`${item.label} · drag to canvas · double-click to add`}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/x-process-equipment", item.type);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onDoubleClick={() =>
                          addNodeAt(item.type, 280 + Math.random() * 180, 120 + Math.random() * 260)
                        }
                        className="group rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-left transition hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#111B34] dark:hover:border-cyan-400/30 dark:hover:bg-[#15213D]"
                      >
                        <div className="flex h-14 w-full items-center justify-center overflow-visible rounded-md bg-white/80 px-1 dark:bg-[#081022]/80">
                          <ProcessEquipmentVisual
                            type={item.type}
                            values={{}}
                            forceMotion
                            motionEnabled
                            medium={item.medium || "steam"}
                            dark={dark}
                          />
                        </div>
                        <div className="mt-1 truncate text-center text-[7px] font-bold text-slate-700 dark:text-slate-200">
                          {item.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {assemblyGroups.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[8px] text-slate-400 dark:border-[#2C3C61]">
                <div>No pipe or conveyor parts match this search.</div>
                {hasLibrarySearch && (
                  <button
                    type="button"
                    onClick={() => setLibrarySearch("")}
                    className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700 dark:bg-[#15213D] dark:text-slate-200"
                  >
                    Show all parts
                  </button>
                )}
              </div>
            )}
          </details>

          <div className="border-b border-slate-200 p-2 dark:border-[#263657]">
            <div className="mb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Connections
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CONNECTION_TYPES.map((tool) => {
                const active = pipelineToolActive && connectionToolType === tool.value;
                return (
                  <button
                    key={tool.value}
                    type="button"
                    draggable={!readOnly}
                    disabled={readOnly}
                    onClick={() => activateConnectionTool(tool.value)}
                    title={`${tool.label}: select two equipment items, or drag onto the canvas`}
                    aria-pressed={active}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-process-connection", tool.value);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className={`rounded-lg border px-2 py-1.5 transition ${
                      active
                        ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-400/15 dark:bg-cyan-400/10"
                        : "border-slate-200 bg-slate-50 hover:border-cyan-300 dark:border-[#2C3C61] dark:bg-[#111B34]"
                    }`}
                  >
                    <div className="relative mx-auto h-8 w-full">
                      {["pipeline", "conveyor"].includes(tool.value) ? (
                        <svg viewBox="0 0 140 48" className="h-full w-full" aria-hidden="true">
                          <ProcessPipeline id={`library-${tool.value}`} path="M 12 24 L 128 24" connectorType={tool.value} animateFlow={false} dark={dark} />
                        </svg>
                      ) : <>
                      <span
                        className={`absolute left-1 right-1 top-1/2 -translate-y-1/2 border-t-2 ${
                          tool.value === "line" ? "border-dashed" : ""
                        } border-slate-500 dark:border-slate-300`}
                      />
                      {tool.value === "arrow" && (
                        <span className="absolute right-0.5 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[7px] border-y-transparent border-l-slate-500 dark:border-l-slate-300" />
                      )}
                      </>}
                    </div>
                    <div className="text-center text-[10px] font-semibold text-slate-600 dark:text-slate-200">
                      {tool.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-slate-200 p-2 dark:border-[#263657]">
            <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Plant Equipment
            </div>
            <p className="mb-2 text-[7px] leading-3 text-slate-400">
              Every card previews the same equipment design that will appear on the canvas.
            </p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {EQUIPMENT_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`whitespace-nowrap rounded-md px-2 py-1 text-[8px] font-semibold ${
                    category === item
                      ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                      : "bg-slate-100 text-slate-500 dark:bg-[#15213D] dark:text-slate-400"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 p-2">
            {filteredLibrary
              .filter((item) => item.type !== "custom-equipment")
              .map((item) => (
                <button
                  key={item.type}
                  type="button"
                  draggable={!readOnly}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-process-equipment", item.type);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onDoubleClick={() => addNodeAt(item.type, 280 + Math.random() * 180, 120 + Math.random() * 300)}
                  className="group flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-left transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-[#2C3C61] dark:bg-[#111B34] dark:hover:border-cyan-400/30 dark:hover:bg-[#15213D]"
                >
                  <div className="flex h-10 w-[60px] shrink-0 items-center justify-center overflow-visible rounded-md bg-white px-1 dark:bg-[#081022]">
                    <ProcessEquipmentVisual
                      type={item.type}
                      values={{}}
                      forceMotion
                      motionEnabled
                      dark={dark}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[9px] font-bold text-slate-800 dark:text-slate-100">{item.label}</div>
                    <div className="truncate text-[8px] text-slate-400">{item.category}</div>
                  </div>
                </button>
              ))}
            {filteredLibrary.filter((item) => item.type !== "custom-equipment").length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 px-2 py-5 text-center text-[8px] text-slate-400 dark:border-[#2C3C61]">
                <div>No plant equipment matches this search.</div>
                {hasLibrarySearch && (
                  <button
                    type="button"
                    onClick={() => setLibrarySearch("")}
                    className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700 dark:bg-[#15213D] dark:text-slate-200"
                  >
                    Show all equipment
                  </button>
                )}
              </div>
            )}
          </div>
          </div>
            </>
          )}
        </aside>

        <section className="relative flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-[#eef2f7] dark:border-[#2C3C61] dark:bg-[#081022] xl:min-h-0">
          <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur dark:border-[#2C3C61] dark:bg-[#0E172D]/95">
            <Workflow size={13} className="text-cyan-500" />
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {pipelineToolActive
                ? connectFrom
                  ? `Select target equipment · ${chainConnect ? "Chain mode ON" : "one connection"}`
                  : `Select source equipment · ${connectionToolType}`
                : "Plant Canvas"}
            </span>
            {(connectFrom || pipelineToolActive) && (
              <button
                type="button"
                onClick={stopConnectionTool}
                className="text-slate-400 hover:text-rose-400"
                title="Cancel pipeline tool"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="absolute right-3 top-3 z-30 inline-flex items-center rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-[#2C3C61] dark:bg-[#0E172D]/95">
            <button type="button" onClick={() => setZoom((value) => clamp(value - 0.1, 0.55, 1.35))} className="h-7 w-7 rounded-md text-sm font-bold hover:bg-slate-100 dark:hover:bg-[#15213D]">−</button>
            <span className="w-12 text-center text-[9px] font-semibold text-slate-500 dark:text-slate-400">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => clamp(value + 0.1, 0.55, 1.35))} className="h-7 w-7 rounded-md text-sm font-bold hover:bg-slate-100 dark:hover:bg-[#15213D]">+</button>
          </div>

          <div
            ref={canvasRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onPointerMove={(event) => {
              if (
                pipelineToolActive &&
                connectFrom
              ) {
                setDraftPointer(
                  getCanvasPointFromEvent(
                    event
                  )
                );
              }
            }}
            onClick={() => {
              if (
                pipelineToolActive &&
                connectFrom
              ) {
                // Creation stays simple:
                // source -> target.
                // Do not create waypoints
                // from empty-canvas clicks.
                return;
              }

              setSelectedNodeId(null);
              setSelectedConnectionId(null);
            }}
            className={`min-h-[420px] flex-1 overflow-auto xl:min-h-0 ${
              pipelineToolActive
                ? "cursor-crosshair"
                : ""
            }`}
          >
            <div style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom, position: "relative" }}>
              <div
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${zoom})`,
                  transformOrigin: "0 0",
                  position: "absolute",
                  inset: 0,
                  backgroundImage: dark
                    ? "radial-gradient(circle, rgba(88,215,255,.12) 1px, transparent 1px)"
                    : "radial-gradient(circle, rgba(71,85,105,.16) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              >
                <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 overflow-visible">
                  <defs>
                    {Object.entries(PROCESS_MEDIA).map(([key, media]) => (
                      <marker
                        key={key}
                        id={`arrow-${key}`}
                        markerWidth="8"
                        markerHeight="8"
                        refX="7"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 8 3.5, 0 7" fill={media.color} />
                      </marker>
                    ))}
                  </defs>
                  {draftPipeline && (
                    <ProcessPipeline
                      id="draft-connection"
                      path={
                        draftPipeline.path
                      }
                      medium="steam"
                      value={1}
                      label=""
                      selected={false}
                      dark={dark}
                      connectorType={
                        connectionToolType
                      }
                      pipeDesign="auto"
                      colorOverride=""
                      animateFlow
                    />
                  )}

                  {/* Keep the selected connector out of the base layer. Once selected,
                      it is rendered again in a dedicated foreground SVG after the
                      equipment nodes. This gives connector handles draw.io-style
                      pointer priority over equipment underneath them. */}
                  {connections
                    .filter((connection) => connection.id !== selectedConnectionId)
                    .map(renderConnection)}

                  <ProcessPipeJunctions
                    junctions={
                      visibleConnectionJunctions
                    }
                    dark={dark}
                  />
                </svg>

                {nodes.map((node) => {
                  const definition =
                    EQUIPMENT_BY_TYPE[node.type] ||
                    EQUIPMENT_LIBRARY[0];
                  const selected =
                    node.id === selectedNodeId;

                  const metricDefinitions =
                    getNodeMetricDefinitions(node);

                  const allMetrics =
                    metricDefinitions.map(
                      (metric) => ({
                        metric,
                        ...resolveMetric(
                          node,
                          metric
                        ),
                      })
                    );

                  const visibleMetricIds =
                    getVisibleMetricIds(node);

                  // The data card can show any default or custom
                  // measurement selected for this particular equipment.
                  const metrics =
                    allMetrics
                      .filter(({ metric }) =>
                        visibleMetricIds.includes(
                          metric.id
                        )
                      )
                      .slice(
                        0,
                        MAX_VISIBLE_METRICS
                      );

                  const dataDisplayPosition =
                    normalizeDataDisplayPosition(
                      node.dataDisplayPosition
                    );

                  const visualValues =
                    Object.fromEntries(
                      allMetrics.map(
                        ({ metric, value }) => [
                          metric.id,
                          value,
                        ]
                      )
                    );

                  const nodeSize =
                    getNodeSize(node);

                  const equipmentRect =
                    getEquipmentRect(node);

                  const equipmentSelectionRect =
                    getEquipmentSelectionRect(node);

                  const isJunction =
                    [
                      "junction",
                      "pipeline-junction",
                      "steam-header",
                    ].includes(
                      node.type
                    );

                  return (
                    <div
                      key={node.id}
                      onPointerDown={(event) => {
                        if (pipelineToolActive || connectFrom) {
                          const handled =
                            handleEquipmentBoundaryPointerDown(event, node);
                          if (handled) return;
                        }

                        startNodeDrag(event, node);
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedNodeId(node.id);
                        setSelectedConnectionId(null);
                      }}
                      className="process-simulator-node group absolute select-none cursor-grab active:cursor-grabbing"
                      style={{
                        width:
                          nodeSize.width,
                        height:
                          nodeSize.height,
                        left: node.x,
                        top: node.y,

                        zIndex: selected ? 70 : isAssemblyNode(node) ? 6 : 10,
                      }}
                    >
                      {node.showLabel !== false && (
                      <div
                        onPointerDown={(
                          event
                        ) =>
                          startLabelDrag(
                            event,
                            node
                          )
                        }
                        onDoubleClick={(
                          event
                        ) => {
                          event.preventDefault();
                          event.stopPropagation();

                          setNodes(
                            (current) =>
                              current.map(
                                (item) =>
                                  item.id ===
                                  node.id
                                    ? {
                                        ...item,
                                        labelOffset: {
                                          x: 0,
                                          y: 0,
                                        },
                                      }
                                    : item
                              )
                          );
                        }}
                        className={`
                          absolute z-50 max-w-[220px]
                          cursor-move truncate rounded-md border
                          bg-white/95 px-2 py-1 text-[9px]
                          font-bold text-slate-700 shadow-sm
                          dark:bg-[#0E172D]/95 dark:text-slate-100
                          ${
                            selected
                              ? "border-cyan-400 ring-2 ring-cyan-400/15"
                              : "border-slate-200 dark:border-[#34476F]"
                          }
                        `}
                        style={
                          getEquipmentLabelStyle(
                            node
                          )
                        }
                        title={`${node.label} · drag to move · top connectors stay above this label · double-click to reset`}
                      >
                        {node.label}
                      </div>
                      )}

                      {isJunction ? (
                        <>
                          {PORT_SIDES.map(
                            (side) => {
                              const isSource =
                                connectFrom?.nodeId ===
                                  node.id &&
                                connectFrom?.side ===
                                  side;

                              return (
                                <button
                                  key={side}
                                  type="button"
                                  title={`Junction ${side} connection`}
                                  onPointerDown={(event) =>
                                    event.stopPropagation()
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleJunctionPort(
                                      node.id,
                                      side
                                    );
                                  }}
                                  className={`
                                    absolute z-50 h-4 w-4 rounded-full
                                    border-[3px] shadow-sm transition
                                    ${
                                      isSource
                                        ? "border-violet-200 bg-violet-500 ring-4 ring-violet-500/20"
                                        : connectFrom
                                        ? "border-cyan-100 bg-cyan-500 ring-2 ring-cyan-400/20"
                                        : "border-cyan-200 bg-cyan-500"
                                    }
                                  `}
                                  style={getPortButtonStyle(
                                    node,
                                    side
                                  )}
                                />
                              );
                            }
                          )}
                        </>
                      ) : null}

                      <div
                        onPointerDown={(event) => {
                          if (
                            pipelineToolActive ||
                            connectFrom
                          ) {
                            handleEquipmentBoundaryPointerDown(
                              event,
                              node
                            );
                          }
                        }}
                        className={`
                          absolute z-20 flex items-center justify-center
                          text-cyan-600 transition-all
                          dark:text-cyan-300
                          ${
                            pipelineToolActive ||
                            connectFrom
                              ? "cursor-crosshair rounded-xl ring-2 ring-cyan-400/20 hover:ring-cyan-400/70"
                              : selected
                              ? "rounded-xl bg-cyan-50/50 ring-2 ring-cyan-400/30 dark:bg-cyan-400/5"
                              : ""
                          }
                        `}
                        style={{
                          left:
                            equipmentRect.left,
                          top:
                            equipmentRect.top,
                          width:
                            equipmentRect.width,
                          height:
                            equipmentRect.height,
                        }}
                      >
                        <div className="h-full w-full">
                          <ProcessEquipmentVisual
                            type={node.type}
                            values={visualValues}
                            selected={selected}
                            motionEnabled
                            forceMotion={
                              mode !== "live"
                            }
                            rotation={node.rotation || 0}
                            medium={node.medium || definition.medium || "steam"}
                            customImageSrc={node.customImageSrc || ""}
                            dark={dark}
                          />
                        </div>
                      </div>

                      {selected && !readOnly && (
                        <>
                          <div
                            className="pointer-events-none absolute z-30 rounded-xl border border-cyan-400/70"
                            style={{
                              left:
                                equipmentSelectionRect.left,
                              top:
                                equipmentSelectionRect.top,
                              width:
                                equipmentSelectionRect.width,
                              height:
                                equipmentSelectionRect.height,
                            }}
                          />

                          {[
                            "nw",
                            "n",
                            "ne",
                            "e",
                            "se",
                            "s",
                            "sw",
                            "w",
                          ].map(
                            (direction) => (
                              <button
                                key={
                                  direction
                                }
                                type="button"
                                aria-label={`Resize ${direction}`}
                                title={`Resize ${direction}`}
                                onPointerDown={(
                                  event
                                ) =>
                                  startResize(
                                    event,
                                    node,
                                    direction
                                  )
                                }
                                className="absolute z-[60] h-[10px] w-[10px] rounded-[3px] border-2 border-white bg-cyan-500 shadow-[0_0_0_1px_rgba(8,145,178,.7)] dark:border-[#081022]"
                                style={getResizeHandleStyle(
                                  node,
                                  direction
                                )}
                              />
                            )
                          )}
                        </>
                      )}

                      {/* Compact instrumentation/device display.
                          This is intentionally separate from the pipe path. */}
                      <div
                        className="
                          absolute z-30 w-[146px]
                          rounded-lg border border-slate-200
                          bg-white/95 px-2 py-1.5 shadow-md backdrop-blur
                          dark:border-[#34476F] dark:bg-[#0B1428]/95
                        "
                        style={getDataDisplayStyle(
                          dataDisplayPosition,
                          node
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-1">
                          <div
                            className="
                              min-w-0 truncate text-[7px] font-bold
                              uppercase tracking-wide text-slate-400
                            "
                            title={
                              node.deviceId
                                ? getDeviceLabel(node.deviceId)
                                : definition.label
                            }
                          >
                            {node.deviceId
                              ? getDeviceLabel(node.deviceId)
                              : definition.label}
                          </div>

                          <span
                            title={`${mode} mode`}
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              mode === "live"
                                ? "bg-cyan-400"
                                : mode === "fake"
                                ? "bg-violet-400"
                                : "bg-amber-400"
                            }`}
                          />
                        </div>

                        {metrics.length === 0 ? (
                          <div className="text-center text-[8px] font-semibold text-slate-400">
                            Flow junction
                          </div>
                        ) : (
                          <div
                            className={`grid gap-1 ${
                              metrics.length > 1
                                ? "grid-cols-2"
                                : "grid-cols-1"
                            }`}
                          >
                            {metrics.map(
                              ({
                                metric,
                                value,
                                source,
                              }) => (
                                <div
                                  key={metric.id}
                                  className="
                                    min-w-0 rounded-md bg-slate-100/80
                                    px-1.5 py-1 dark:bg-[#15213D]
                                  "
                                >
                                  <div className="truncate text-[6px] font-medium text-slate-400">
                                    {metric.label}
                                  </div>

                                  <div className="mt-0.5 flex items-baseline gap-0.5">
                                    <span className="truncate text-[9px] font-black text-slate-800 dark:text-slate-100">
                                      {formatMetricValue(
                                        value,
                                        metric
                                      )}
                                    </span>

                                    {metric.unit && (
                                      <span className="shrink-0 text-[6px] text-slate-400">
                                        {metric.unit}
                                      </span>
                                    )}

                                    <span
                                      title={
                                        source === "live"
                                          ? "Live data"
                                          : source === "fake"
                                          ? "Simulated data"
                                          : "No data"
                                      }
                                      className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                                        source === "live"
                                          ? "bg-cyan-400"
                                          : source === "fake"
                                          ? "bg-violet-400"
                                          : "bg-slate-400"
                                      }`}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Foreground connector interaction layer.
                    This is intentionally AFTER equipment in DOM/z-order. When a
                    connection is selected, its stroke, endpoint handles and bend
                    handles win the hit test over the equipment below it. Blank canvas
                    still passes through because only the child group enables pointer events. */}
                {selectedConnection && (
                  <svg
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="pointer-events-none absolute inset-0 z-[100] overflow-visible"
                  >
                    <g className="pointer-events-auto">
                      {renderConnection(selectedConnection)}
                    </g>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="process-simulator-side-panel flex max-h-[360px] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-[width] dark:border-[#2C3C61] dark:bg-[#0E172D] xl:h-full xl:max-h-none">
          {inspectorCollapsed ? (
            <div className="flex min-h-[46px] flex-row items-center justify-center gap-3 p-2 xl:h-full xl:min-h-0 xl:flex-col xl:justify-start xl:py-3">
              <button
                type="button"
                onClick={() => setInspectorCollapsed(false)}
                title="Expand inspector"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-violet-600 transition hover:bg-violet-50 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-violet-300 dark:hover:bg-[#1B2948]"
              >
                <ChevronLeft size={15} />
              </button>
              <Settings size={16} className="text-violet-400" />
              <span className="hidden [writing-mode:vertical-rl] text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 xl:block">
                Inspector
              </span>
            </div>
          ) : (
            <>
          <div className="border-b border-slate-200 p-3 dark:border-[#263657]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Settings size={15} className="shrink-0 text-violet-400" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Inspector</h2>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">Configure equipment, devices, and pipelines.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectorCollapsed(true)}
                title="Minimize inspector"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-[#2C3C61] dark:text-slate-300 dark:hover:bg-[#15213D] dark:hover:text-violet-200"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!selectedNode && !selectedConnection ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center dark:border-[#34476F]">
                <Factory size={26} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-300">Select equipment or a pipeline</p>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Equipment can bind to any data source already mapped in the current dashboard template.</p>
              </div>
            ) : selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-[#111B34]">
                  <div className="flex h-12 w-[76px] shrink-0 items-center justify-center overflow-visible rounded-lg bg-white px-1 dark:bg-[#081022]">
                    <ProcessEquipmentVisual
                      type={selectedNode.type}
                      values={{}}
                      forceMotion
                      motionEnabled
                      rotation={selectedNode.rotation || 0}
                      medium={selectedNode.medium || EQUIPMENT_BY_TYPE[selectedNode.type]?.medium || "steam"}
                      customImageSrc={selectedNode.customImageSrc || ""}
                      dark={dark}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold">{EQUIPMENT_BY_TYPE[selectedNode.type]?.label}</div>
                    <div className="text-[9px] text-slate-400">Node ID: {selectedNode.id.slice(-8)}</div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Display Name</span>
                  <input
                    value={selectedNode.label}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedNode({ label: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                  />
                </label>

                {isAssemblyNode(selectedNode) ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 dark:border-cyan-400/20 dark:bg-cyan-400/5">
                      <div className="text-[9px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
                        Assembly Component
                      </div>
                      <p className="mt-1 text-[8px] leading-4 text-slate-500 dark:text-slate-400">
                        This is a physical layout piece, not an automatic connector. Position it beside other parts to build the pipe or conveyor route yourself.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={rotateSelectedAssembly}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[9px] font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200"
                      >
                        <RotateCw size={13} /> Rotate 90°
                      </button>

                      <label className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-semibold text-slate-600 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedNode.showLabel !== false}
                          disabled={readOnly}
                          onChange={(event) => updateSelectedNode({ showLabel: event.target.checked })}
                          className="h-3.5 w-3.5 rounded border-slate-300"
                        />
                        Show label
                      </label>
                    </div>

                    {(selectedNode.type === "pipe-straight" || selectedNode.type.startsWith("conveyor-")) && (
                      <button type="button" disabled={readOnly} onClick={convertSelectedAssembly}
                        className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200">
                        <ArrowRight size={14} /> Convert to Connection
                      </button>
                    )}

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[8px] text-slate-500 dark:border-[#2C3C61] dark:bg-[#111B34] dark:text-slate-400">
                      Size: {Math.round(getNodeSize(selectedNode).width)} × {Math.round(getNodeSize(selectedNode).height)} · Rotation: {Number(selectedNode.rotation || 0)}°
                      <div className="mt-1">Use the handles around the selected part to resize it.</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedNode.type === "custom-equipment" && (
                      <div className="rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50/60 p-3 dark:border-cyan-400/25 dark:bg-cyan-400/5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 dark:bg-[#081022]">
                            <ProcessEquipmentVisual
                              type="custom-equipment"
                              values={{}}
                              customImageSrc={selectedNode.customImageSrc || ""}
                              dark={dark}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black text-cyan-800 dark:text-cyan-200">
                              Custom Equipment Image
                            </div>
                            <div className="mt-0.5 truncate text-[8px] text-slate-400">
                              {selectedNode.customImageName || "No image uploaded yet"}
                            </div>
                            {!readOnly && (
                              <label className="mt-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[8px] font-bold text-white transition hover:bg-cyan-500">
                                <Upload size={11} /> {selectedNode.customImageSrc ? "Replace Image" : "Upload Image"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleCustomEquipmentImage}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2C3C61] dark:bg-[#111B34]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        Display Name Position
                      </span>

                      <span className="mt-0.5 block text-[8px] leading-4 text-slate-400">
                        Drag the name pill directly on the canvas.
                      </span>
                    </div>

                    <span className="shrink-0 text-[8px] tabular-nums text-slate-400">
                      {Math.round(
                        getLabelOffset(
                          selectedNode
                        ).x
                      )}, {Math.round(
                        getLabelOffset(
                          selectedNode
                        ).y
                      )}
                    </span>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedNode({
                          labelOffset: {
                            x: 0,
                            y: 0,
                          },
                        })
                      }
                      className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[8px] font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200 dark:hover:bg-[#15213D]"
                    >
                      Reset Name Position
                    </button>
                  )}
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Data Display Position
                  </span>
                  <select
                    value={normalizeDataDisplayPosition(
                      selectedNode.dataDisplayPosition
                    )}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateSelectedNode({
                        dataDisplayPosition:
                          event.target.value,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="bottom">Below equipment</option>
                    <option value="top">Above equipment</option>
                    <option value="left">Left of equipment</option>
                    <option value="right">Right of equipment</option>
                    <option value="hidden">Hide data display</option>
                  </select>
                  <p className="mt-1 text-[8px] leading-relaxed text-slate-400">
                    Controls where the compact live-data card is shown around this equipment.
                    When hidden, the equipment selection and connection boundary becomes compact too.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Device</span>
                  <select
                    value={selectedNode.deviceId || ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateSelectedNode({ deviceId: event.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 disabled:opacity-60 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="">Any mapped device</option>
                    {mappedDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name === device.id
                          ? `${device.id} · ${device.fields} fields`
                          : `${device.name} · ${device.id} · ${device.fields} fields`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[8px] leading-relaxed text-slate-400">
                    Selecting a device filters the field choices below. Each equipment item can use a different device.
                  </p>
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        Data Bindings
                      </span>
                      <span className="mt-0.5 block text-[8px] text-slate-400">
                        Start with the equipment defaults, then add any extra mapped measurement you need.
                      </span>
                    </div>

                    <span className="shrink-0 text-[8px] text-slate-400">
                      {getDeviceDataOptions(selectedNode.deviceId).length} fields
                    </span>
                  </div>

                  {/* ===========================
                      DEFAULT EQUIPMENT FIELDS
                     =========================== */}
                  {(() => {
                    const hiddenDefaultIds =
                      getHiddenDefaultMetricIds(
                        selectedNode
                      );

                    const defaultMetrics =
                      getNodeMetricDefinitions(
                        selectedNode
                      ).filter(
                        (metric) =>
                          !metric.custom &&
                          !hiddenDefaultIds.includes(
                            metric.id
                          )
                      );

                    return (
                      <>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div>
                            <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-400">
                              Default fields
                            </span>
                            <span className="mt-0.5 block text-[7px] text-slate-400">
                              Presets for this equipment icon. Hide any you do not need.
                            </span>
                          </div>

                          {hiddenDefaultIds.length > 0 && !readOnly && (
                            <button
                              type="button"
                              onClick={
                                restoreDefaultMetrics
                              }
                              className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[7px] font-semibold text-slate-500 transition hover:border-cyan-300 hover:text-cyan-600 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300"
                            >
                              Restore hidden ({hiddenDefaultIds.length})
                            </button>
                          )}
                        </div>

                        {defaultMetrics.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[8px] leading-relaxed text-slate-400 dark:border-[#2C3C61]">
                            All default fields are hidden.
                            {hiddenDefaultIds.length > 0 && !readOnly && (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  onClick={
                                    restoreDefaultMetrics
                                  }
                                  className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
                                >
                                  Restore them
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {defaultMetrics.map(
                              (metric) => {
                                const resolved =
                                  resolveMetric(
                                    selectedNode,
                                    metric
                                  );

                                const currentBinding =
                                  selectedNode.bindings?.[
                                    metric.id
                                  ] ||
                                  selectedNode.metricBindings?.[
                                    metric.id
                                  ] ||
                                  "";

                                const bindingOptions =
                                  getDeviceDataOptions(
                                    selectedNode.deviceId,
                                    currentBinding
                                  );

                                const shown =
                                  getVisibleMetricIds(
                                    selectedNode
                                  ).includes(
                                    metric.id
                                  );

                                return (
                                  <div
                                    key={
                                      metric.id
                                    }
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2C3C61] dark:bg-[#111B34]"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="truncate text-[10px] font-bold">
                                          {
                                            metric.label
                                          }
                                        </div>

                                        <div className="mt-0.5 text-[8px] text-slate-400">
                                          {formatMetricValue(
                                            resolved.value,
                                            metric
                                          )}{" "}
                                          {
                                            metric.unit
                                          }{" "}
                                          ·{" "}
                                          {
                                            resolved.source
                                          }
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1">
                                        <label className="flex cursor-pointer items-center gap-1 text-[8px] font-semibold text-slate-500">
                                          <input
                                            type="checkbox"
                                            checked={
                                              shown
                                            }
                                            disabled={
                                              readOnly
                                            }
                                            onChange={() =>
                                              toggleMetricDisplay(
                                                metric.id
                                              )
                                            }
                                            className="h-3 w-3 rounded border-slate-300"
                                          />
                                          Show
                                        </label>

                                        {!readOnly && (
                                          <button
                                            type="button"
                                            title="Hide this default field"
                                            onClick={() =>
                                              hideDefaultMetric(
                                                metric.id
                                              )
                                            }
                                            className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-400/10"
                                          >
                                            <X
                                              size={
                                                11
                                              }
                                            />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <select
                                      value={
                                        currentBinding
                                      }
                                      disabled={
                                        readOnly
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateNodeBinding(
                                          metric.id,
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                    >
                                      <option value="">
                                        Fake /
                                        unbound
                                      </option>

                                      {bindingOptions.map(
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
                                            }{" "}
                                            (
                                            {
                                              option.key
                                            }
                                            )
                                          </option>
                                        )
                                      )}
                                    </select>

                                    {renderStatusMappingEditor(
                                      metric
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* ===========================
                      CUSTOM / ADDITIONAL FIELDS
                     =========================== */}
                  <div className="mb-2 mt-4 flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[8px] font-bold uppercase tracking-wide text-violet-500 dark:text-violet-300">
                        Additional fields
                      </span>
                      <span className="mt-0.5 block text-[8px] text-slate-400">
                        Reuse this equipment visual for Flow, pH, Vibration, or any mapped data.
                      </span>
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={addCustomMetric}
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-2 text-[8px] font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-200"
                      >
                        <Plus size={11} />
                        Add field
                      </button>
                    )}
                  </div>

                  {(selectedNode.customMetrics || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[8px] leading-relaxed text-slate-400 dark:border-[#2C3C61]">
                      No additional fields yet. The default equipment measurements above are optional — add your own fields whenever the same visual needs to represent different process data.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedNode.customMetrics || []).map((rawMetric) => {
                        const metric =
                          getNodeMetricDefinitions(
                            selectedNode
                          ).find(
                            (item) =>
                              item.id ===
                              rawMetric.id
                          ) ||
                          withNodeStatusMappings(
                            selectedNode,
                            normalizeMetric({
                              ...rawMetric,
                              custom: true,
                            })
                          );

                        const resolved =
                          resolveMetric(
                            selectedNode,
                            metric
                          );

                        const currentBinding =
                          selectedNode.bindings?.[metric.id] ||
                          selectedNode.metricBindings?.[metric.id] ||
                          "";

                        const bindingOptions =
                          getDeviceDataOptions(
                            selectedNode.deviceId,
                            currentBinding
                          );

                        const shown =
                          getVisibleMetricIds(
                            selectedNode
                          ).includes(metric.id);

                        return (
                          <div
                            key={metric.id}
                            className="rounded-xl border border-violet-200 bg-violet-50/40 p-2.5 dark:border-violet-400/20 dark:bg-violet-400/5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[8px] font-bold uppercase tracking-wide text-violet-500 dark:text-violet-300">
                                Custom field
                              </span>

                              {!readOnly && (
                                <button
                                  type="button"
                                  title="Remove custom field"
                                  onClick={() =>
                                    removeCustomMetric(
                                      metric.id
                                    )
                                  }
                                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-400/10"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>

                            <div className="mt-2 grid grid-cols-[1fr_72px] gap-2">
                              <label>
                                <span className="mb-1 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
                                  Display label
                                </span>
                                <input
                                  value={metric.label}
                                  disabled={readOnly}
                                  onChange={(event) =>
                                    updateCustomMetric(
                                      metric.id,
                                      {
                                        label:
                                          event.target.value,
                                      }
                                    )
                                  }
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] outline-none focus:border-violet-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                />
                              </label>

                              <label>
                                <span className="mb-1 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
                                  Unit
                                </span>
                                <input
                                  value={metric.unit}
                                  disabled={readOnly}
                                  onChange={(event) =>
                                    updateCustomMetric(
                                      metric.id,
                                      {
                                        unit:
                                          event.target.value,
                                      }
                                    )
                                  }
                                  placeholder="e.g. t/h"
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] outline-none focus:border-violet-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                />
                              </label>
                            </div>

                            <div className="mt-2 grid grid-cols-[1fr_86px] gap-2">
                              <label>
                                <span className="mb-1 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
                                  Data source
                                </span>
                                <select
                                  value={currentBinding}
                                  disabled={readOnly}
                                  onChange={(event) => {
                                    const nextKey =
                                      event.target.value;

                                    updateNodeBinding(
                                      metric.id,
                                      nextKey
                                    );

                                    const option =
                                      availableDataOptions.find(
                                        (item) =>
                                          item.key ===
                                          nextKey
                                      );

                                    if (
                                      option?.unit &&
                                      !metric.unit
                                    ) {
                                      updateCustomMetric(
                                        metric.id,
                                        {
                                          unit:
                                            option.unit,
                                        }
                                      );
                                    }
                                  }}
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] outline-none focus:border-violet-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                >
                                  <option value="">
                                    Fake / unbound
                                  </option>
                                  {bindingOptions.map(
                                    (option) => (
                                      <option
                                        key={option.key}
                                        value={option.key}
                                      >
                                        {option.label}
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>

                              <label>
                                <span className="mb-1 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
                                  Type
                                </span>
                                <select
                                  value={metric.kind}
                                  disabled={readOnly}
                                  onChange={(event) => {
                                    const nextKind =
                                      event.target.value;

                                    updateCustomMetric(
                                      metric.id,
                                      {
                                        kind:
                                          nextKind,
                                      }
                                    );

                                    if (
                                      nextKind ===
                                      "status"
                                    ) {
                                      updateMetricStatusMappings(
                                        metric.id,
                                        metric.statusMappings?.length
                                          ? metric.statusMappings
                                          : DEFAULT_STATUS_MAPPINGS
                                      );
                                    }
                                  }}
                                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[9px] outline-none focus:border-violet-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                                >
                                  <option value="number">
                                    Number
                                  </option>
                                  <option value="status">
                                    Status
                                  </option>
                                </select>
                              </label>
                            </div>

                            {renderStatusMappingEditor(
                              metric
                            )}

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-[8px] text-slate-400">
                                Current:{" "}
                                <span className="font-semibold text-slate-600 dark:text-slate-200">
                                  {formatMetricValue(
                                    resolved.value,
                                    metric
                                  )}{" "}
                                  {metric.unit}
                                </span>
                              </div>

                              <label className="flex cursor-pointer items-center gap-1 text-[8px] font-semibold text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={shown}
                                  disabled={readOnly}
                                  onChange={() =>
                                    toggleMetricDisplay(
                                      metric.id
                                    )
                                  }
                                  className="h-3 w-3 rounded border-slate-300"
                                />
                                Show on card
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[8px] leading-relaxed text-slate-400 dark:bg-[#111B34]">
                    Up to {MAX_VISIBLE_METRICS} selected measurements can appear on the compact equipment data card. Default fields are presets, not restrictions.
                  </div>
                </div>
                  </>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={deleteSelectedNode}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-400/15 dark:text-rose-300"
                  >
                    <Trash2 size={13} /> {isAssemblyNode(selectedNode) ? "Delete Component" : "Delete Equipment"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#111B34]">
                  <div className="flex items-center gap-2">
                    <Workflow size={15} className="text-cyan-500" />
                    <div>
                      <div className="text-[11px] font-bold">
                        {
                          CONNECTION_TYPES.find(
                            (item) =>
                              item.value ===
                              (
                                selectedConnection.connectorType ||
                                (
                                  selectedConnection.connectionStyle ===
                                  "arrows"
                                    ? "arrow"
                                    : "pipeline"
                                )
                              )
                          )?.label ||
                          "Connection"
                        }
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {selectedConnection.source || "Free"} → {selectedConnection.target || "Free"}
                      </div>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Connection Type
                  </span>

                  <select
                    value={
                      selectedConnection.connectorType ||
                      (
                        selectedConnection.connectionStyle ===
                        "arrows"
                          ? "arrow"
                          : "pipeline"
                      )
                    }
                    disabled={readOnly}
                    onChange={(event) => {
                      const nextType =
                        event.target.value;

                      updateSelectedConnection({
                        connectorType:
                          nextType,
                        pipeDesign: nextType === "conveyor" ? "conveyorTrack" : "realPipe",
                        routingMode: nextType === "line" ? "simple" : "diagram",
                        animateFlow:
                          ["pipeline", "conveyor"].includes(nextType)
                            ? selectedConnection.animateFlow !==
                              false
                            : false,
                      });
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    {CONNECTION_TYPES.map(
                      (type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      )
                    )}
                  </select>

                  <p className="mt-1 text-[8px] leading-4 text-slate-400">
                    {
                      CONNECTION_TYPES.find(
                        (item) =>
                          item.value ===
                          (
                            selectedConnection.connectorType ||
                            (
                              selectedConnection.connectionStyle ===
                              "arrows"
                                ? "arrow"
                                : "pipeline"
                            )
                          )
                      )?.description
                    }
                  </p>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Source
                    </span>

                    <select
                      value={
                        selectedConnection.source ||
                        ""
                      }
                      disabled={readOnly}
                      onChange={(event) => {
                        const nextId =
                          event.target.value;

                        const geometry =
                          getConnectionGeometry(
                            selectedConnection
                          );

                        if (!nextId) {
                          updateSelectedConnection({
                            source: null,
                            sourceAnchor: null,
                            freeSource:
                              geometry?.source ||
                              selectedConnection.freeSource ||
                              {
                                x: 300,
                                y: 300,
                              },
                          });

                          return;
                        }

                        updateSelectedConnection({
                          source:
                            nextId,
                          sourceAnchor: {
                            side: "right",
                            offset: 0.5,
                            mode: "fixed",
                          },
                          sourcePort:
                            "right",
                        });
                      }}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                    >
                      <option value="">
                        Free endpoint
                      </option>

                      {nodes.map(
                        (node) => (
                          <option
                            key={
                              node.id
                            }
                            value={
                              node.id
                            }
                            disabled={
                              node.id ===
                              selectedConnection.target
                            }
                          >
                            {node.label ||
                              node.id}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Target
                    </span>

                    <select
                      value={
                        selectedConnection.target ||
                        ""
                      }
                      disabled={readOnly}
                      onChange={(event) => {
                        const nextId =
                          event.target.value;

                        const geometry =
                          getConnectionGeometry(
                            selectedConnection
                          );

                        if (!nextId) {
                          updateSelectedConnection({
                            target: null,
                            targetAnchor: null,
                            freeTarget:
                              geometry?.target ||
                              selectedConnection.freeTarget ||
                              {
                                x: 480,
                                y: 300,
                              },
                          });

                          return;
                        }

                        updateSelectedConnection({
                          target:
                            nextId,
                          targetAnchor: {
                            side: "left",
                            offset: 0.5,
                            mode: "fixed",
                          },
                          targetPort:
                            "left",
                        });
                      }}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                    >
                      <option value="">
                        Free endpoint
                      </option>

                      {nodes.map(
                        (node) => (
                          <option
                            key={
                              node.id
                            }
                            value={
                              node.id
                            }
                            disabled={
                              node.id ===
                              selectedConnection.source
                            }
                          >
                            {node.label ||
                              node.id}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={readOnly}
                    onClick={addBranchToSelectedConnection}
                    title="Create a connected fork from the middle of this connection"
                    className="flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 text-[10px] font-semibold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                    <GitFork size={14} /> Add Branch
                  </button>
                  <button type="button" disabled={readOnly}
                    onClick={() => {
                      const segmentCount = getConnectionGeometry(selectedConnection)?.segments.length || 1;
                      setConnections((current) => reverseConnectionNetwork(current, selectedConnection.id, segmentCount));
                    }}
                    className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200">
                    <ArrowRightLeft size={14} /> Reverse Flow
                  </button>
                </div>

                <p className="text-[8px] leading-4 text-slate-400">
                  Add Branch creates a connected fork. Drag its free endpoint onto equipment or another matching connection.
                </p>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Label</span>
                  <input
                    value={selectedConnection.label || ""}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedConnection({ label: event.target.value })}
                    placeholder="e.g. Main Steam Header"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2C3C61] dark:bg-[#111B34]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        Label Position
                      </span>

                      <span className="mt-0.5 block text-[8px] leading-4 text-slate-400">
                        Drag the connection label directly on the canvas. Double-click the label to reset it.
                      </span>
                    </div>

                    <span className="shrink-0 text-[8px] tabular-nums text-slate-400">
                      {Math.round(
                        getConnectionLabelOffset(
                          selectedConnection
                        ).x
                      )}, {Math.round(
                        getConnectionLabelOffset(
                          selectedConnection
                        ).y
                      )}
                    </span>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedConnection({
                          labelOffset: {
                            x: 0,
                            y: 0,
                          },
                        })
                      }
                      className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[8px] font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200 dark:hover:bg-[#15213D]"
                    >
                      Reset Label Position
                    </button>
                  )}
                </div>


                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                      Connection Color
                    </span>

                    {selectedConnection.colorOverride && (
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          updateSelectedConnection({
                            colorOverride: "",
                          })
                        }
                        className="text-[8px] font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
                      >
                        Reset color
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {PIPE_COLOR_PRESETS.map(
                      (preset) => {
                        const selectedPreset =
                          (selectedConnection.colorOverride ||
                            "") ===
                          preset.value;

                        const previewColor = preset.value || "#BFC6CA";

                        return (
                          <button
                            key={
                              preset.value ||
                              "default"
                            }
                            type="button"
                            disabled={readOnly}
                            title={preset.label}
                            onClick={() =>
                              updateSelectedConnection({
                                colorOverride:
                                  preset.value,
                              })
                            }
                            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[8px] font-semibold transition ${
                              selectedPreset
                                ? "border-cyan-400 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-200"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300"
                            }`}
                          >
                            <span
                              className="h-3 w-3 rounded-full border border-black/10"
                              style={{
                                backgroundColor:
                                  previewColor,
                              }}
                            />
                            {preset.label}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        selectedConnection.colorOverride || "#BFC6CA"
                      }
                      disabled={readOnly}
                      onChange={(event) =>
                        updateSelectedConnection({
                          colorOverride:
                            event.target.value,
                        })
                      }
                      className="h-8 w-11 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5 dark:border-[#2C3C61]"
                    />
                    <span className="text-[8px] text-slate-400">
                      Pick any custom connection color
                    </span>
                  </label>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2C3C61] dark:bg-[#111B34]">
                  {(selectedConnection.connectorType || "pipeline") === "line" ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-600 dark:text-slate-200">
                            Simple Line
                          </span>
                          <span className="mt-0.5 block text-[8px] leading-4 text-slate-400">
                            A Line starts straight. Drag either endpoint to reconnect it, or drag the line itself to pull out a simple bend. Double-click a bend to remove it.
                          </span>
                        </div>

                        <span className="shrink-0 rounded-full bg-cyan-500/10 px-2 py-1 text-[7px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
                          SIMPLE
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[8px] text-slate-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300">
                          <span className="block font-bold text-slate-700 dark:text-slate-100">
                            Move an end
                          </span>
                          Drag either round endpoint. Release near equipment to snap, or release in empty space to keep it free.
                        </div>

                        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[8px] text-slate-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300">
                          <span className="block font-bold text-slate-700 dark:text-slate-100">
                            Adjust a bend
                          </span>
                          Drag the line to create a bend. Drag the bend circle to move it, or double-click the bend circle to remove it.
                        </div>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedConnection({
                              routingMode: "simple",
                              waypoints: [],
                              routePoint: null,
                            })
                          }
                          className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-cyan-300/50 bg-white text-[8px] font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-400/20 dark:bg-[#081022] dark:text-cyan-200 dark:hover:bg-cyan-400/10"
                        >
                          Reset to Straight Line
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        Connection Routing
                      </span>

                      <span className="mt-0.5 block text-[8px] leading-4 text-slate-400">
                        Diagram is recommended: click a connector, drag the line itself to reshape it, drag either endpoint to reconnect, and drag bend points directly. Double-click or right-click a bend to remove it.
                      </span>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[7px] font-bold uppercase tracking-wide ${
                        getConnectionWaypoints(
                          selectedConnection
                        ).length
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                          : "bg-slate-200/70 text-slate-500 dark:bg-[#1B2947] dark:text-slate-300"
                      }`}
                    >
                      {`${getConnectionRoutingMode(
                        selectedConnection
                      ).toUpperCase()}${
                        getConnectionWaypoints(selectedConnection).length
                          ? ` · ${getConnectionWaypoints(selectedConnection).length} BENDS`
                          : ""
                      }`}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      { value: "diagram", label: "Diagram", hint: "Direct drag · recommended" },
                      { value: "auto", label: "Auto", hint: "Automatic H/V" },
                      { value: "circuit", label: "Orthogonal", hint: "Legacy 90° route" },
                      { value: "free", label: "Free", hint: "Any angle" },
                    ].map((option) => {
                      const active =
                        getConnectionRoutingMode(selectedConnection) ===
                        option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={readOnly}
                          onClick={() =>
                            updateSelectedConnection({
                              routingMode: option.value,
                            })
                          }
                          className={`rounded-lg border px-2 py-2 text-left transition ${
                            active
                              ? "border-cyan-400 bg-cyan-50 text-cyan-700 ring-1 ring-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"
                              : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300"
                          } ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <span className="block text-[8px] font-black">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-[7px] opacity-70">
                            {option.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!readOnly &&
                    getConnectionRoutingMode(selectedConnection) !== "diagram" && (
                    <button
                      type="button"
                      onClick={() =>
                        setRouteEditConnectionId((current) =>
                          current === selectedConnection.id
                            ? null
                            : selectedConnection.id
                        )
                      }
                      className={`mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border text-[8px] font-semibold transition ${
                        routeEditConnectionId === selectedConnection.id
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                          : "border-cyan-300/50 bg-white text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400/20 dark:bg-[#081022] dark:text-cyan-200"
                      }`}
                    >
                      <Settings size={11} />
                      {routeEditConnectionId === selectedConnection.id
                        ? "Finish Route Editing"
                        : "Edit Route"}
                    </button>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[8px] text-slate-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300">
                      <span className="block font-bold text-slate-700 dark:text-slate-100">
                        Endpoints
                      </span>
                      Drag freely. Release over equipment to attach exactly where you drop it. Hold Alt while releasing to keep it detached.
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[8px] text-slate-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-300">
                      <span className="block font-bold text-slate-700 dark:text-slate-100">
                        Route shaping
                      </span>
                      Diagram: drag the connector itself to pull out a bend. Drag visible bend points freely, then double-click or right-click one to remove it. Drag either endpoint directly onto another equipment item. Double-click the route adds another bend.
                    </div>
                  </div>

                  {!readOnly &&
                    (routeEditConnectionId === selectedConnection.id ||
                      isCircuitRoutingConnection(selectedConnection)) && (
                    <button
                      type="button"
                      onClick={
                        addBendToSelectedConnection
                      }
                      className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-cyan-300/50 bg-white text-[8px] font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-400/20 dark:bg-[#081022] dark:text-cyan-200 dark:hover:bg-cyan-400/10"
                    >
                      <Plus size={11} />
                      {isCircuitRoutingConnection(selectedConnection)
                        ? "Add 90° Elbow"
                        : "Add Bend"}
                      <span className="ml-1 text-[7px] font-normal opacity-70">
                        {getConnectionWaypoints(
                          selectedConnection
                        ).length}
                      </span>
                    </button>
                  )}

                  {getConnectionWaypoints(
                    selectedConnection
                  ).length > 0 &&
                    !readOnly &&
                    (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {getConnectionWaypoints(
                            selectedConnection
                          ).map((point, index) => (
                            <button
                              key={`${selectedConnection.id}-remove-bend-${index}`}
                              type="button"
                              onClick={() =>
                                removeWaypoint(
                                  selectedConnection.id,
                                  index
                                )
                              }
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[8px] font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200 dark:hover:border-rose-400/40 dark:hover:bg-rose-400/10 dark:hover:text-rose-200"
                              title={`Remove bend ${index + 1} at ${Math.round(point.x)}, ${Math.round(point.y)}`}
                            >
                              <Trash2 size={10} />
                              Bend {index + 1}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const waypoints =
                              getConnectionWaypoints(
                                selectedConnection
                              );

                            updateSelectedConnection({
                              waypoints:
                                waypoints.slice(
                                  0,
                                  -1
                                ),
                              routePoint: null,
                            });
                          }}
                          className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-[8px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-slate-200"
                        >
                          Remove Last Bend
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedConnection({
                              waypoints: [],
                              routePoint: null,
                            })
                          }
                          className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-cyan-300/50 bg-white text-[8px] font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-400/20 dark:bg-[#081022] dark:text-cyan-200 dark:hover:bg-cyan-400/10"
                        >
                          Reset Auto Route
                        </button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </div>

                {(
                  selectedConnection.connectorType ||
                  (
                    selectedConnection.connectionStyle ===
                    "arrows"
                      ? "arrow"
                      : "pipeline"
                  )
                ) !== "pipeline" && (
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2C3C61] dark:bg-[#111B34]">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        Animate Direction
                      </span>
                      <span className="mt-0.5 block text-[8px] text-slate-400">
                        Show travelling direction markers along this connector.
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        selectedConnection.animateFlow !==
                        false
                      }
                      disabled={readOnly}
                      onChange={(event) =>
                        updateSelectedConnection({
                          animateFlow:
                            event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </label>
                )}

                {(
                  selectedConnection.connectorType ||
                  "pipeline"
                ) === "pipeline" && (
                  <>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#2C3C61] dark:bg-[#111B34]">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-600 dark:text-slate-200">
                      Animate Flow
                    </span>
                    <span className="mt-0.5 block text-[8px] text-slate-400">
                      Show moving particles or travelling pipe segments.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      selectedConnection.animateFlow !==
                      false
                    }
                    disabled={readOnly}
                    onChange={(event) =>
                      updateSelectedConnection({
                        animateFlow:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Device</span>
                  <select
                    value={selectedConnection.deviceId || ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateSelectedConnection({ deviceId: event.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="">Any mapped device</option>
                    {mappedDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name === device.id
                          ? `${device.id} · ${device.fields} fields`
                          : `${device.name} · ${device.id} · ${device.fields} fields`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Flow Data</span>
                  <select
                    value={selectedConnection.dataKey || ""}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedConnection({ dataKey: event.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022]"
                  >
                    <option value="">Simulated flow</option>
                    {getDeviceDataOptions(
                      selectedConnection.deviceId,
                      selectedConnection.dataKey
                    ).map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label} ({option.key})
                      </option>
                    ))}
                  </select>
                </label>

                  </>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={deleteSelectedConnection}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-400/15 dark:text-rose-300"
                  >
                    <Trash2 size={13} /> Delete Connection
                  </button>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </aside>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-40 flex min-h-8 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] text-slate-500 shadow-sm dark:border-[#2C3C61] dark:bg-[#0E172D] dark:text-slate-400">
        <span>
          {nodes.length} equipment · {connections.length} pipelines · {mappedDevices.length} mapped devices · {availableDataOptions.length} mapped live fields
        </span>
        <span>
          {readOnly ? "Viewer mode - topology editing disabled" : "Tip: double-click library items to add them quickly"}
          {lastLiveAt ? ` · Live ${new Date(lastLiveAt).toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  );
}

ProcessSimulator.createDefaultTopology = getInitialDemo;

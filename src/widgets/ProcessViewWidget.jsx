import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Cable,
  Cpu,
  Database,
  Factory,
  RefreshCw,
} from "lucide-react";
import ProcessEquipmentVisual from "../process/ProcessEquipmentVisual";
import ProcessPipeline, {
  buildPipeNetworkJunctions,
  ProcessPipeJunctions,
  resolveDynamicPipeDesign,
} from "../process/ProcessPipeline";
import {
  EQUIPMENT_BY_TYPE,
  PROCESS_MEDIA,
} from "../process/equipmentLibrary";
import { getProcessFlow } from "../process/processFlowApi";
import {
  buildConnectionBranchJunctions,
  getConnectionKind,
} from "../process/connectionBranches";
import "../process/processVisualization.css";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 172;

const MIN_NODE_WIDTH = 110;
const MIN_NODE_HEIGHT = 148;
const MAX_NODE_WIDTH = 360;
const MAX_NODE_HEIGHT = 320;

const EQUIPMENT_TOP = 30;
const NODE_BOTTOM_RESERVE = 48;

export const DEFAULT_PROCESS_VIEW_CONFIG = {
  processFlowId: null,
  templateId: null,
  mode: "inherit",
  showLabels: true,
  showMetrics: true,
  showFlowLabels: true,
  showInspector: true,
  preserveCanvasLayout: true,
};

export const normalizeProcessViewConfig = (config = {}) => ({
  ...DEFAULT_PROCESS_VIEW_CONFIG,
  ...(config || {}),
  processFlowId:
    Number.isFinite(Number(config?.processFlowId)) &&
    Number(config?.processFlowId) > 0
      ? Number(config.processFlowId)
      : null,
  mode: ["inherit", "live", "hybrid", "fake"].includes(config?.mode)
    ? config.mode
    : "inherit",
  showLabels: config?.showLabels !== false,
  showMetrics: config?.showMetrics !== false,
  showFlowLabels: config?.showFlowLabels !== false,
  showInspector: config?.showInspector !== false,
  preserveCanvasLayout:
    config?.preserveCanvasLayout !== false,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getNodeConstraints = (node = {}) => {
  const definition = EQUIPMENT_BY_TYPE?.[node?.type] || {};
  const assembly = definition.libraryGroup === "assembly";

  return {
    minWidth: Number(definition.minWidth || (assembly ? 44 : MIN_NODE_WIDTH)),
    minHeight: Number(definition.minHeight || (assembly ? 44 : MIN_NODE_HEIGHT)),
    maxWidth: Number(definition.maxWidth || (assembly ? 460 : MAX_NODE_WIDTH)),
    maxHeight: Number(definition.maxHeight || (assembly ? 420 : MAX_NODE_HEIGHT)),
    defaultWidth: Number(definition.defaultWidth || DEFAULT_NODE_WIDTH),
    defaultHeight: Number(definition.defaultHeight || DEFAULT_NODE_HEIGHT),
    assembly,
  };
};

const getNodeWidth = (node) => {
  const constraints = getNodeConstraints(node);
  return clamp(
    Number(node?.width) || constraints.defaultWidth,
    constraints.minWidth,
    constraints.maxWidth
  );
};

const getNodeHeight = (node) => {
  const constraints = getNodeConstraints(node);
  return clamp(
    Number(node?.height) || constraints.defaultHeight,
    constraints.minHeight,
    constraints.maxHeight
  );
};

const getEquipmentRect = (node = {}) => {
  const width = getNodeWidth(node);
  const height = getNodeHeight(node);
  const constraints = getNodeConstraints(node);

  if (constraints.assembly) {
    return {
      left: 3,
      top: 3,
      width: Math.max(1, width - 6),
      height: Math.max(1, height - 6),
    };
  }

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
      left:
        (width - equipmentWidth) / 2,
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
    height -
      EQUIPMENT_TOP -
      NODE_BOTTOM_RESERVE
  );

  return {
    left: horizontalPadding,
    top: EQUIPMENT_TOP,
    width: equipmentWidth,
    height: equipmentHeight,
  };
};

const getLabelOffset = (node = {}) => ({
  x: Number.isFinite(
    Number(node?.labelOffset?.x)
  )
    ? Number(node.labelOffset.x)
    : 0,
  y: Number.isFinite(
    Number(node?.labelOffset?.y)
  )
    ? Number(node.labelOffset.y)
    : 0,
});

const getEquipmentLabelStyle = (
  node = {}
) => {
  const width = getNodeWidth(node);
  const offset = getLabelOffset(node);

  return {
    left:
      width / 2 +
      offset.x,
    top: offset.y,
    transform: "translateX(-50%)",
  };
};

const normalizeDataDisplayPosition = (
  value
) =>
  [
    "bottom",
    "top",
    "left",
    "right",
    "hidden",
  ].includes(value)
    ? value
    : "bottom";

const getDataDisplayStyle = (
  position,
  node = {}
) => {
  const width = getNodeWidth(node);
  const equipment =
    getEquipmentRect(node);

  switch (
    normalizeDataDisplayPosition(
      position
    )
  ) {
    case "top":
      return {
        left: "50%",
        top: -58,
        transform:
          "translateX(-50%)",
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
        top:
          equipment.top +
          equipment.height +
          6,
        transform:
          "translateX(-50%)",
      };
  }
};

const renderEquipmentVisualContent = ({
  node,
  visualValues,
  dark,
  forceMotion = false,
}) => {
  if (node?.customImageSrc) {
    return (
      <img
        src={node.customImageSrc}
        alt={
          node?.customImageName ||
          node?.label ||
          "Equipment"
        }
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }

  return (
    <ProcessEquipmentVisual
      type={node?.type}
      values={visualValues}
      monitoring
      motionEnabled
      forceMotion={
        forceMotion
      }
      rotation={node?.rotation || 0}
      medium={
        node?.medium ||
        EQUIPMENT_BY_TYPE?.[node?.type]?.medium ||
        "steam"
      }
      dark={dark}
    />
  );
};

const getStoredTopologyKey = (templateId) =>
  `palm-oil-process-simulator:${String(templateId || "standalone")}`;

const LATEST_TOPOLOGY_KEY = "palm-oil-process-simulator:last-saved";

const readStoredTopology = (storageKey) => {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");

    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.connections)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const readFirstStoredTopology = (storageKeys = []) => {
  for (const key of storageKeys) {
    const topology = readStoredTopology(key);

    if (topology && Array.isArray(topology.nodes) && topology.nodes.length > 0) {
      return { topology, storageKey: key };
    }
  }

  return {
    topology: null,
    storageKey: storageKeys[0] || "",
  };
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
  const seed = hashText(`${nodeId}:${metric?.id || "metric"}`);

  if (metric?.kind === "status") {
    return Math.sin(clock / 11000 + seed) > -0.72 ? 1 : 0;
  }

  const minimum = Number(metric?.min ?? 0);
  const maximum = Number(metric?.max ?? minimum + 100);
  const span = Math.max(0.0001, maximum - minimum);
  const midpoint = minimum + span * 0.52;
  const amplitude = span * 0.15;

  return Number(
    clamp(
      midpoint + Math.sin(clock / 5200 + seed * 0.0017) * amplitude,
      minimum,
      maximum
    ).toFixed(1)
  );
};

const formatMetricValue = (value, metric) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (metric?.kind === "status") {
    return Number(value) === 1 ? "ON" : "OFF";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

const PORT_SIDES = [
  "top",
  "right",
  "bottom",
  "left",
];

const normalizeAnchor = (
  anchor,
  fallbackSide = "right"
) => {
  const side =
    PORT_SIDES.includes(anchor?.side)
      ? anchor.side
      : PORT_SIDES.includes(anchor)
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

const isAutoAnchor = (anchor) =>
  !anchor ||
  anchor?.mode === "auto";

const getEquipmentBounds = (node) => {
  const equipment = getEquipmentRect(node);
  const left =
    Number(node?.x || 0) +
    equipment.left;
  const top =
    Number(node?.y || 0) +
    equipment.top;

  return {
    left,
    top,
    right:
      left + equipment.width,
    bottom:
      top + equipment.height,
    width: equipment.width,
    height: equipment.height,
    centerX:
      left + equipment.width / 2,
    centerY:
      top + equipment.height / 2,
  };
};

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
      side: fallbackSide,
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

    const hitY =
      bounds.centerY +
      dy * tx;

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

  const hitX =
    bounds.centerX +
    dx * ty;

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

const resolveConnectionAnchor = (
  node,
  otherNode,
  anchorInput,
  fallbackSide
) => {
  if (isAutoAnchor(anchorInput)) {
    const otherBounds =
      getEquipmentBounds(otherNode);

    return getSmartAnchorTowardPoint(
      node,
      {
        x: otherBounds.centerX,
        y: otherBounds.centerY,
      },
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
  anchorInput,
  fallbackSide = "right"
) => {
  const anchor =
    normalizeAnchor(
      anchorInput,
      fallbackSide
    );

  const equipment =
    getEquipmentRect(node);

  const x =
    Number(node?.x || 0) +
    equipment.left;

  const y =
    Number(node?.y || 0) +
    equipment.top;

  switch (anchor.side) {
    case "top":
      return {
        x:
          x +
          equipment.width *
            anchor.offset,
        y,
      };

    case "bottom":
      return {
        x:
          x +
          equipment.width *
            anchor.offset,
        y:
          y + equipment.height,
      };

    case "left":
      return {
        x,
        y:
          y +
          equipment.height *
            anchor.offset,
      };

    case "right":
    default:
      return {
        x:
          x + equipment.width,
        y:
          y +
          equipment.height *
            anchor.offset,
      };
  }
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

const normalizePoints = (
  points = []
) => {
  const result = [];

  points.forEach((point) => {
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

    const previous =
      result[result.length - 1];

    if (
      previous &&
      Math.abs(
        previous.x -
          normalized.x
      ) < 0.5 &&
      Math.abs(
        previous.y -
          normalized.y
      ) < 0.5
    ) {
      return;
    }

    result.push(normalized);
  });

  return result;
};

const verticesToPath = (
  vertices = []
) =>
  vertices.length
    ? [
        `M ${vertices[0].x} ${vertices[0].y}`,
        ...vertices
          .slice(1)
          .map(
            (point) =>
              `L ${point.x} ${point.y}`
          ),
      ].join(" ")
    : "";

const getConnectionWaypoints = (
  connection,
  minX,
  minY
) => {
  const source =
    Array.isArray(
      connection?.waypoints
    )
      ? connection.waypoints
      : connection?.routePoint
      ? [connection.routePoint]
      : [];

  return normalizePoints(
    source.map((point) => ({
      x:
        Number(point.x) -
        minX,
      y:
        Number(point.y) -
        minY,
    }))
  );
};

const makeViewNode = (
  node,
  minX,
  minY
) => ({
  ...node,
  x:
    Number(node?.x || 0) -
    minX,
  y:
    Number(node?.y || 0) -
    minY,
});

const getConnectionRoutingMode = (
  connection = {}
) => {
  const connectorType =
    connection.connectorType ||
    (
      connection.connectionStyle ===
      "arrows"
        ? "arrow"
        : "pipeline"
    );

  if (connectorType === "line") {
    return "simple";
  }

  const saved = String(
    connection.routingMode ||
      ""
  ).toLowerCase();

  if (
    [
      "diagram",
      "auto",
      "circuit",
      "flexible",
      "free",
    ].includes(saved)
  ) {
    return saved;
  }

  return ["arrow", "conveyor"].includes(connectorType)
    ? "free"
    : "auto";
};

const getConnectionGeometry = (
  connection,
  sourceNode,
  targetNode,
  minX,
  minY
) => {
  const source =
    sourceNode
      ? makeViewNode(
          sourceNode,
          minX,
          minY
        )
      : null;

  const target =
    targetNode
      ? makeViewNode(
          targetNode,
          minX,
          minY
        )
      : null;

  const freeSource =
    connection?.freeSource
      ? {
          x:
            Number(
              connection.freeSource.x
            ) -
            minX,
          y:
            Number(
              connection.freeSource.y
            ) -
            minY,
        }
      : null;

  const freeTarget =
    connection?.freeTarget
      ? {
          x:
            Number(
              connection.freeTarget.x
            ) -
            minX,
          y:
            Number(
              connection.freeTarget.y
            ) -
            minY,
        }
      : null;

  if (
    !source &&
    !freeSource
  ) {
    return null;
  }

  if (
    !target &&
    !freeTarget
  ) {
    return null;
  }

  let sourcePoint =
    freeSource;

  let targetPoint =
    freeTarget;

  let sourceAnchor =
    null;

  let targetAnchor =
    null;

  if (source) {
    if (target) {
      sourceAnchor =
        resolveConnectionAnchor(
          source,
          target,
          connection.sourceAnchor,
          "right"
        );
    } else {
      sourceAnchor =
        isAutoAnchor(
          connection.sourceAnchor
        )
          ? getSmartAnchorTowardPoint(
              source,
              targetPoint,
              "right"
            )
          : normalizeAnchor(
              connection.sourceAnchor,
              "right"
            );
    }

    sourcePoint =
      getAnchorPoint(
        source,
        sourceAnchor,
        sourceAnchor.side
      );
  }

  if (target) {
    if (source) {
      targetAnchor =
        resolveConnectionAnchor(
          target,
          source,
          connection.targetAnchor,
          "left"
        );
    } else {
      targetAnchor =
        isAutoAnchor(
          connection.targetAnchor
        )
          ? getSmartAnchorTowardPoint(
              target,
              sourcePoint,
              "left"
            )
          : normalizeAnchor(
              connection.targetAnchor,
              "left"
            );
    }

    targetPoint =
      getAnchorPoint(
        target,
        targetAnchor,
        targetAnchor.side
      );
  }

  const waypoints =
    getConnectionWaypoints(
      connection,
      minX,
      minY
    );

  const routingMode =
    getConnectionRoutingMode(
      connection
    );

  if (
    !source ||
    !target ||
    [
      "free",
      "diagram",
      "flexible",
      "simple",
    ].includes(routingMode)
  ) {
    const vertices =
      normalizePoints([
        sourcePoint,
        ...waypoints,
        targetPoint,
      ]);

    return {
      path:
        verticesToPath(vertices),
      labelPoint:
        vertices[
          Math.floor(
            vertices.length / 2
          )
        ] || {
          x:
            (
              sourcePoint.x +
              targetPoint.x
            ) /
            2,
          y:
            (
              sourcePoint.y +
              targetPoint.y
            ) /
            2,
        },
    };
  }

  const sourceDirection =
    getAnchorDirection(
      sourceAnchor.side
    );

  const targetDirection =
    getAnchorDirection(
      targetAnchor.side
    );

  const offset = 28;

  const sourceOuter = {
    x:
      sourcePoint.x +
      sourceDirection.x *
        offset,
    y:
      sourcePoint.y +
      sourceDirection.y *
        offset,
  };

  const targetOuter = {
    x:
      targetPoint.x +
      targetDirection.x *
        offset,
    y:
      targetPoint.y +
      targetDirection.y *
        offset,
  };

  let internal;

  if (waypoints.length) {
    internal = waypoints;
  } else {
    const sourceHorizontal =
      [
        "left",
        "right",
      ].includes(
        sourceAnchor.side
      );

    const targetHorizontal =
      [
        "left",
        "right",
      ].includes(
        targetAnchor.side
      );

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

      internal = [
        sourceOuter,
        {
          x:
            midX,
          y:
            sourceOuter.y,
        },
        {
          x:
            midX,
          y:
            targetOuter.y,
        },
        targetOuter,
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

      internal = [
        sourceOuter,
        {
          x:
            sourceOuter.x,
          y:
            midY,
        },
        {
          x:
            targetOuter.x,
          y:
            midY,
        },
        targetOuter,
      ];
    } else if (
      sourceHorizontal
    ) {
      internal = [
        sourceOuter,
        {
          x:
            sourceOuter.x,
          y:
            targetOuter.y,
        },
        targetOuter,
      ];
    } else {
      internal = [
        sourceOuter,
        {
          x:
            targetOuter.x,
          y:
            sourceOuter.y,
        },
        targetOuter,
      ];
    }
  }

  const vertices =
    normalizePoints([
      sourcePoint,
      ...internal,
      targetPoint,
    ]);

  return {
    path:
      verticesToPath(vertices),
    labelPoint:
      vertices[
        Math.floor(
          vertices.length / 2
        )
      ] || {
        x:
          (
            sourcePoint.x +
            targetPoint.x
          ) /
          2,
        y:
          (
            sourcePoint.y +
            targetPoint.y
          ) /
          2,
      },
  };
};

const useDarkMode = () => {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const update = () =>
      setDark(document.documentElement.classList.contains("dark"));

    update();

    const observer = new MutationObserver(update);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return dark;
};

export default function ProcessViewWidget({
  data = {},
  item = {},
  canvasOnly = false,
  highlightNodeId = null,
  onNodeHover,
  onNodeMove,
  onNodeLeave,
  onNodeClick,
  onBackgroundClick,
}) {
  const rootRef = useRef(null);
  const lastTopologyTextRef = useRef("");

  const config = useMemo(() => {
    const normalized =
      normalizeProcessViewConfig(
        item?.processViewConfig ||
          {}
      );

    if (!canvasOnly) {
      return normalized;
    }

    return {
      ...normalized,
      showInspector: false,
    };
  }, [
    item?.processViewConfig,
    canvasOnly,
  ]);

  const candidateStorageKeys = useMemo(
    () =>
      Array.from(
        new Set(
          [
            config.templateId ? getStoredTopologyKey(config.templateId) : null,
            LATEST_TOPOLOGY_KEY,
            getStoredTopologyKey(null),
          ].filter(Boolean)
        )
      ),
    [config.templateId]
  );

  const initialStoredTopology = useMemo(
    () => readFirstStoredTopology(candidateStorageKeys),
    [candidateStorageKeys]
  );

  const [topology, setTopology] = useState(() =>
    config.processFlowId
      ? null
      : initialStoredTopology.topology
  );
  const [activeStorageKey, setActiveStorageKey] = useState(
    () =>
      config.processFlowId
        ? `process-flow:${config.processFlowId}`
        : initialStoredTopology.storageKey
  );
  const [processFlowName, setProcessFlowName] = useState("");
  const [topologyError, setTopologyError] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [clock, setClock] = useState(Date.now());
  const dark = useDarkMode();

  const refreshTopology = async () => {
    if (config.processFlowId) {
      try {
        const flow = await getProcessFlow(
          config.processFlowId
        );

        const nextTopology =
          flow?.topology &&
          Array.isArray(flow.topology.nodes) &&
          Array.isArray(flow.topology.connections)
            ? flow.topology
            : null;

        const fallback = nextTopology
          ? null
          : readFirstStoredTopology(
              candidateStorageKeys
            );
        const topologyToDisplay =
          nextTopology ||
          fallback?.topology ||
          null;

        const fingerprint = JSON.stringify({
          id: flow?.id,
          updatedAt: flow?.updated_at,
          topology: topologyToDisplay,
        });

        if (
          fingerprint !==
          lastTopologyTextRef.current
        ) {
          lastTopologyTextRef.current =
            fingerprint;
          setTopology(topologyToDisplay);
        }

        setProcessFlowName(
          flow?.name ||
            `Process Flow ${config.processFlowId}`
        );
        setActiveStorageKey(
          nextTopology
            ? `process-flow:${config.processFlowId}`
            : fallback?.storageKey ||
              `process-flow:${config.processFlowId}`
        );
        setTopologyError(
          nextTopology
            ? ""
            : fallback?.topology
            ? "Selected flow unavailable; showing the latest saved layout."
            : ""
        );
      } catch (error) {
        const fallback =
          readFirstStoredTopology(
            candidateStorageKeys
          );

        if (fallback.topology) {
          setTopology(fallback.topology);
          setActiveStorageKey(
            fallback.storageKey || ""
          );
          setTopologyError(
            "Selected flow unavailable; showing the latest saved layout."
          );
        } else {
          setTopologyError(
            error?.message ||
              "Unable to load process flow"
          );
        }
      }

      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const fingerprint = candidateStorageKeys
      .map(
        (key) =>
          `${key}:${
            window.localStorage.getItem(key) ||
            ""
          }`
      )
      .join("\n");

    if (
      fingerprint ===
      lastTopologyTextRef.current
    ) {
      return;
    }

    lastTopologyTextRef.current =
      fingerprint;

    const next =
      readFirstStoredTopology(
        candidateStorageKeys
      );

    setTopology(next.topology);
    setActiveStorageKey(
      next.storageKey || ""
    );
    setProcessFlowName("");
    setTopologyError("");
  };

  useEffect(() => {
    lastTopologyTextRef.current = "";

    if (config.processFlowId) {
      setTopology(null);
      setProcessFlowName("");
    }

    refreshTopology();

    const timer = window.setInterval(
      refreshTopology,
      config.processFlowId ? 5000 : 900
    );

    const handleStorage = (event) => {
      if (
        !config.processFlowId &&
        candidateStorageKeys.includes(event.key)
      ) {
        refreshTopology();
      }
    };

    const handleProcessSaved = (event) => {
      const savedProcessFlowId =
        Number(
          event?.detail?.processFlowId ||
            0
        ) || null;

      if (
        !config.processFlowId ||
        !savedProcessFlowId ||
        savedProcessFlowId ===
          config.processFlowId
      ) {
        lastTopologyTextRef.current = "";
        refreshTopology();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );
    window.addEventListener(
      "process-flow-saved",
      handleProcessSaved
    );

    window.addEventListener(
      "palm-oil-process-topology-saved",
      handleProcessSaved
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "storage",
        handleStorage
      );
      window.removeEventListener(
        "process-flow-saved",
        handleProcessSaved
      );
      window.removeEventListener(
        "palm-oil-process-topology-saved",
        handleProcessSaved
      );
    };
  }, [
    config.processFlowId,
    candidateStorageKeys,
  ]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const parentRect =
        element.parentElement?.getBoundingClientRect();
      setSize({
        width: Math.max(
          260,
          rect.width,
          parentRect?.width || 0
        ),
        height: Math.max(
          160,
          rect.height,
          parentRect?.height || 0
        ),
      });
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const resolvedMode = config.mode === "inherit" ? topology?.mode || "hybrid" : config.mode;

  useEffect(() => {
    if (resolvedMode !== "fake" && resolvedMode !== "hybrid") {
      return undefined;
    }

    const timer = window.setInterval(() => setClock(Date.now()), 1500);
    return () => window.clearInterval(timer);
  }, [resolvedMode]);

  const nodes = Array.isArray(topology?.nodes) ? topology.nodes : [];
  const connections = Array.isArray(topology?.connections) ? topology.connections : [];

  const selectedNode =
    nodes.find(
      (node) =>
        node.id === selectedNodeId
    ) || null;

  const inspectorVisible = config.showInspector && size.width >= 760 && size.height >= 250;
  const inspectorWidth = inspectorVisible ? (size.width >= 1120 ? 270 : 236) : 0;
  const diagramWidth = Math.max(260, size.width - inspectorWidth);

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  const bounds = useMemo(() => {
    const canvasWidth = Number(topology?.canvas?.width);
    const canvasHeight = Number(topology?.canvas?.height);

    if (
      config.preserveCanvasLayout &&
      nodes.length > 0 &&
      size.width >= 900 &&
      canvasWidth > 0 &&
      canvasHeight > 0
    ) {
      return {
        minX: 0,
        minY: 0,
        width: canvasWidth,
        height: canvasHeight,
      };
    }

    if (!nodes.length) {
      return { minX: 0, minY: 0, width: 1000, height: 600 };
    }

    const minX = Math.min(...nodes.map((node) => Number(node?.x || 0)));
    const minY = Math.min(...nodes.map((node) => Number(node?.y || 0)));
    const maxX = Math.max(...nodes.map((node) => Number(node?.x || 0) + getNodeWidth(node)));
    const maxY = Math.max(...nodes.map((node) => Number(node?.y || 0) + getNodeHeight(node)));

    return {
      minX,
      minY,
      width: Math.max(240, maxX - minX),
      height: Math.max(160, maxY - minY),
    };
  }, [
    nodes,
    topology?.canvas?.width,
    topology?.canvas?.height,
    config.preserveCanvasLayout,
    size.width,
  ]);

  const fit = useMemo(() => {
    const paddingX = inspectorVisible ? 10 : 14;
    const paddingY = 10;
    const availableWidth = Math.max(80, diagramWidth - paddingX * 2);
    const availableHeight = Math.max(80, size.height - paddingY * 2);
    const widthScale = availableWidth / bounds.width;
    const heightScale = availableHeight / bounds.height;
    const maxScale = inspectorVisible ? 1.55 : 1.8;
    const scale = Math.min(widthScale, heightScale, maxScale);

    return {
      scale,
      x: (diagramWidth - bounds.width * scale) / 2,
      y: (size.height - bounds.height * scale) / 2,
    };
  }, [bounds, diagramWidth, size.height, inspectorVisible]);

  const resolveMetric = (node, metric) => {
    const dataKey = node?.bindings?.[metric.id] || "";

    const liveValue =
      dataKey && data?.[dataKey] !== undefined && data?.[dataKey] !== null
        ? data[dataKey]
        : null;

    if (resolvedMode === "live") {
      return liveValue;
    }

    if (resolvedMode === "hybrid" && liveValue !== null) {
      return liveValue;
    }

    return fakeMetricValue(node.id, metric, clock);
  };

  const resolveConnectionValue = (connection) => {
    if (
      connection?.dataKey &&
      data?.[connection.dataKey] !== undefined &&
      data?.[connection.dataKey] !== null &&
      resolvedMode !== "fake"
    ) {
      return Number(data[connection.dataKey]);
    }

    if (resolvedMode === "live") {
      return null;
    }

    const seed = hashText(connection?.id || "flow");

    return Number((20 + Math.abs(Math.sin(clock / 4200 + seed * 0.001)) * 60).toFixed(1));
  };

  const selectedDefinition = selectedNode ? EQUIPMENT_BY_TYPE?.[selectedNode.type] || {} : null;

  const getNodeMetricRows = (node) => {
    const definition = EQUIPMENT_BY_TYPE?.[node.type] || {};
    const metrics = Array.isArray(definition?.metrics) ? definition.metrics : [];
    return metrics.map((metric) => ({
      metric,
      value: resolveMetric(node, metric),
      dataKey: node?.bindings?.[metric.id] || "",
    }));
  };

  const selectedMetricRows = selectedNode ? getNodeMetricRows(selectedNode) : [];



  const pipeNetworkJunctions =
    useMemo(
      () =>
        buildPipeNetworkJunctions(
          connections
            .map(
              (
                connection
              ) => {
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

                if (
                  resolveDynamicPipeDesign(
                    connection.pipeDesign ||
                      "auto",
                    connection.medium
                  ) !==
                  "realPipe"
                ) {
                  return null;
                }

                const source =
                  nodes.find(
                    (node) =>
                      node.id ===
                      connection.source
                  ) ||
                  null;

                const target =
                  nodes.find(
                    (node) =>
                      node.id ===
                      connection.target
                  ) ||
                  null;

                const geometry =
                  getConnectionGeometry(
                    connection,
                    source,
                    target,
                    bounds.minX,
                    bounds.minY
                  );

                if (
                  !geometry
                ) {
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
        ),
      [
        connections,
        nodes,
        bounds.minX,
        bounds.minY,
      ]
    );

  const connectionBranchJunctions = useMemo(
    () => buildConnectionBranchJunctions(
      connections.map((connection) => {
        const source = nodes.find((node) => node.id === connection.source) || null;
        const target = nodes.find((node) => node.id === connection.target) || null;
        const geometry = getConnectionGeometry(
          connection,
          source,
          target,
          bounds.minX,
          bounds.minY
        );
        return {
          ...connection,
          path: geometry?.path || "",
          color: connection.colorOverride ||
            (["arrow", "line"].includes(getConnectionKind(connection)) ? "#64748B" : "#AEB7BC"),
        };
      })
    ),
    [connections, nodes, bounds.minX, bounds.minY]
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

  const mappedEquipmentCount = nodes.filter((node) => Boolean(node?.deviceId)).length;

  const topologySourceLabel =
    config.processFlowId
      ? processFlowName ||
        `Process Flow ${config.processFlowId}`
      : activeStorageKey ===
        LATEST_TOPOLOGY_KEY
      ? "Latest saved layout"
      : activeStorageKey ===
        getStoredTopologyKey(null)
      ? "Standalone layout"
      : config.templateId
      ? `Template ${config.templateId}`
      : "Saved layout";

  const lastSavedLabel = topology?.savedAt
    ? new Date(topology.savedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  if (!nodes.length) {
    return (
      <div
        ref={rootRef}
        className="dashboard-widget-surface relative flex h-full w-full items-center justify-center overflow-hidden rounded-[11px] bg-white p-4 text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:bg-[#111C34] dark:text-slate-100"
      >
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300">
            <Factory size={20} />
          </div>

          <div className="mt-3 text-sm font-bold">
            {config.processFlowId
              ? "Process flow unavailable"
              : "No process flow selected"}
          </div>

          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            {topologyError
              ? topologyError
              : config.processFlowId
              ? "The selected saved Process Flow has no available topology yet."
              : "Choose a saved Process Flow for this widget in Widget Studio."}
          </p>

          <button
            type="button"
            onClick={refreshTopology}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onClick={() => {
        setSelectedNodeId(null);
        onBackgroundClick?.();
      }}
      className={`dashboard-widget-surface relative h-full w-full overflow-hidden bg-[#F7FAFD] dark:bg-[#0B1429] ${
        canvasOnly
          ? "rounded-none shadow-none"
          : "rounded-[11px] shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.24)]"
      }`}
      style={
        canvasOnly
          ? {
              height: "100%",
              minHeight: "320px",
            }
          : undefined
      }
    >
      {!canvasOnly && (
        <div className="pointer-events-none absolute left-3 top-2.5 z-30 rounded-lg bg-white/85 px-2 py-1 backdrop-blur dark:bg-[#0B1429]/85">
          <div className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
            {item?.label || "Process View"}
          </div>
          <div className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-400">
            {resolvedMode}
          </div>
        </div>
      )}

      <div
        className="absolute left-0 top-0"
        style={{
          width: bounds.width,
          height: bounds.height,
          transformOrigin: "top left",
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="none"
        >

          {connections.map((connection) => {
            const source =
              nodes.find(
                (node) =>
                  node.id ===
                  connection.source
              ) || null;

            const target =
              nodes.find(
                (node) =>
                  node.id ===
                  connection.target
              ) || null;

            if (
              (
                !source &&
                !connection.freeSource
              ) ||
              (
                !target &&
                !connection.freeTarget
              )
            ) {
              return null;
            }

            const geometry =
              getConnectionGeometry(
                connection,
                source,
                target,
                bounds.minX,
                bounds.minY
              );

            const flowValue =
              resolveConnectionValue(
                connection
              );

            const medium =
              PROCESS_MEDIA[
                connection.medium ||
                  "steam"
              ] ||
              PROCESS_MEDIA.steam;

            return (
              <g key={connection.id}>
                <ProcessPipeline
                  id={connection.id}
                  path={geometry.path}
                  medium={
                    connection.medium ||
                    "steam"
                  }
                  value={
                    config.showFlowLabels
                      ? flowValue
                      : null
                  }
                  label={
                    config.showFlowLabels
                      ? connection.label ||
                        medium?.label
                      : ""
                  }
                  dark={dark}
                  variant="monitor"
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
                />
              </g>
            );
          })}

          <ProcessPipeJunctions
            junctions={
              visibleConnectionJunctions
            }
            dark={dark}
          />
        </svg>

        {nodes.map((node) => {
          const definition =
            EQUIPMENT_BY_TYPE?.[
              node.type
            ] || {};

          const metrics =
            Array.isArray(
              definition.metrics
            )
              ? definition.metrics
              : [];

          const resolvedMetrics =
            metrics.map((metric) => {
              const value =
                resolveMetric(
                  node,
                  metric
                );

              const dataKey =
                node?.bindings?.[
                  metric.id
                ] || "";

              const hasLive =
                dataKey &&
                data?.[dataKey] !==
                  undefined &&
                data?.[dataKey] !==
                  null;

              const source =
                resolvedMode === "live"
                  ? hasLive
                    ? "live"
                    : "missing"
                  : resolvedMode ===
                      "hybrid" &&
                    hasLive
                  ? "live"
                  : "fake";

              return {
                metric,
                value,
                source,
              };
            });

          const shownMetrics =
            resolvedMetrics
              .filter(
                ({ value }) =>
                  value !== null &&
                  value !== undefined
              )
              .slice(0, 2);

          const visualValues =
            Object.fromEntries(
              resolvedMetrics.map(
                ({
                  metric,
                  value,
                }) => [
                  metric.id,
                  value,
                ]
              )
            );

          const equipmentRect =
            getEquipmentRect(node);

          const dataDisplayPosition =
            normalizeDataDisplayPosition(
              node.dataDisplayPosition
            );

          const selected =
            highlightNodeId
              ? highlightNodeId ===
                node.id
              : selectedNodeId ===
                node.id;

          return (
            <div
              key={node.id}
              onMouseEnter={(event) => {
                onNodeHover?.(
                  node,
                  event
                );
              }}
              onMouseMove={(event) => {
                onNodeMove?.(
                  node,
                  event
                );
              }}
              onMouseLeave={() => {
                onNodeLeave?.(
                  node
                );
              }}
              onClick={(event) => {
                event.stopPropagation();

                setSelectedNodeId(
                  node.id
                );

                onNodeClick?.(
                  node,
                  event
                );
              }}
              className={`absolute ${
                canvasOnly
                  ? "cursor-pointer"
                  : ""
              }`}
              style={{
                left:
                  Number(node.x || 0) -
                  bounds.minX,
                top:
                  Number(node.y || 0) -
                  bounds.minY,
                width:
                  getNodeWidth(node),
                height:
                  getNodeHeight(node),
              }}
            >
              {config.showLabels && (
                <div
                  className={`
                    absolute z-30
                    max-w-[220px]
                    truncate rounded-lg
                    border bg-white/95
                    px-2.5 py-1.5
                    text-[8px] font-black
                    text-slate-700 shadow-sm
                    dark:bg-[#0E172D]/95
                    dark:text-slate-100
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
                  title={
                    node.label ||
                    definition.label ||
                    node.type
                  }
                >
                  {node.label ||
                    definition.label ||
                    node.type}
                </div>
              )}

              <div
                className={`
                  absolute z-20 flex
                  items-center
                  justify-center
                  rounded-xl
                  transition-all
                  ${
                    selected
                      ? "bg-cyan-50/50 ring-2 ring-cyan-400/30 dark:bg-cyan-400/5"
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
                  {renderEquipmentVisualContent({
                    node,
                    visualValues,
                    dark,
                    forceMotion:
                      resolvedMode !== "live",
                  })}
                </div>
              </div>

              {config.showMetrics &&
                dataDisplayPosition !==
                  "hidden" && (
                  <div
                    className="
                      absolute z-30
                      w-[146px]
                      rounded-lg border
                      border-slate-200
                      bg-white/95
                      px-2 py-1.5
                      shadow-md
                      backdrop-blur
                      dark:border-[#34476F]
                      dark:bg-[#0B1428]/95
                    "
                    style={
                      getDataDisplayStyle(
                        dataDisplayPosition,
                        node
                      )
                    }
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <div
                        className="
                          min-w-0 truncate
                          text-[7px] font-bold
                          uppercase tracking-wide
                          text-slate-400
                        "
                        title={
                          node.deviceId ||
                          definition.label
                        }
                      >
                        {node.deviceId ||
                          definition.label ||
                          node.type}
                      </div>

                      <span
                        title={`${resolvedMode} mode`}
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          resolvedMode ===
                          "live"
                            ? "bg-cyan-400"
                            : resolvedMode ===
                              "fake"
                            ? "bg-violet-400"
                            : "bg-amber-400"
                        }`}
                      />
                    </div>

                    {shownMetrics.length ===
                    0 ? (
                      <div className="text-center text-[8px] font-semibold text-slate-400">
                        No mapped metrics
                      </div>
                    ) : (
                      <div
                        className={`grid gap-1 ${
                          shownMetrics.length >
                          1
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        {shownMetrics.map(
                          ({
                            metric,
                            value,
                            source,
                          }) => (
                            <div
                              key={
                                metric.id
                              }
                              className="
                                min-w-0
                                rounded-md
                                bg-slate-100/80
                                px-1.5 py-1
                                dark:bg-[#15213D]
                              "
                            >
                              <div className="truncate text-[6px] font-medium text-slate-400">
                                {
                                  metric.label
                                }
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
                                    {
                                      metric.unit
                                    }
                                  </span>
                                )}

                                <span
                                  title={
                                    source ===
                                    "live"
                                      ? "Live data"
                                      : source ===
                                        "fake"
                                      ? "Simulated data"
                                      : "No data"
                                  }
                                  className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                                    source ===
                                    "live"
                                      ? "bg-cyan-400"
                                      : source ===
                                        "fake"
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
                )}
            </div>
          );
        })}
      </div>

      {inspectorVisible && (
        <aside
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 top-0 z-40 flex h-full flex-col border-l border-slate-200 bg-white/95 shadow-[-10px_0_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#2B3B60] dark:bg-[#0E172D]/97 dark:shadow-[-12px_0_32px_rgba(0,0,0,0.20)]"
          style={{ width: inspectorWidth }}
        >
          <div className="shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-[#263657]">
            <div className="truncate text-[11px] font-black text-slate-900 dark:text-slate-100">
              System Summary
            </div>
            <div className="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Process overview
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Cpu size={13} className="text-cyan-500" />
                  <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-white">
                    {nodes.length}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Equipment
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Database size={13} className="text-violet-500" />
                  <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-white">
                    {mappedEquipmentCount}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Mapped
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Cable size={13} className="text-amber-500" />
                  <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-white">
                    {connections.length}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Flow Links
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                  <Activity size={13} className="text-emerald-500" />
                  <div className="mt-2 truncate text-[11px] font-black uppercase text-slate-900 dark:text-white">
                    {resolvedMode}
                  </div>
                  <div className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
                    Data Mode
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-[#2B3B60] dark:bg-[#111C34]">
                <div className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Layout Source
                </div>
                <div className="mt-0.5 text-[8px] font-bold text-slate-700 dark:text-slate-200">
                  {topologySourceLabel}
                </div>
                <div className="mt-0.5 text-[7px] text-slate-400">
                  Saved: {lastSavedLabel}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-[#2B3B60] dark:bg-[#111C34]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      Device Data Details
                    </div>
                    <div className="mt-1 text-[9px] font-bold text-slate-700 dark:text-slate-200">
                      {selectedNode
                        ? selectedNode.label || selectedDefinition?.label || selectedNode.type
                        : "Select equipment"}
                    </div>
                  </div>
                  {selectedNode && (
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(null)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[8px] font-bold text-slate-500 hover:bg-slate-50 dark:border-[#2B3B60] dark:text-slate-300 dark:hover:bg-[#0B1429]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedNode ? (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 p-2 dark:border-cyan-400/15 dark:bg-cyan-400/[0.06]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-600 shadow-sm dark:bg-[#111C34] dark:text-cyan-300">
                          <Factory size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[9px] font-black text-slate-800 dark:text-slate-100">
                            {selectedNode.label || selectedDefinition?.label || selectedNode.type}
                          </div>
                          <div className="mt-0.5 truncate text-[8px] text-slate-400">
                            {selectedNode.deviceId || "No device assigned"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {selectedMetricRows.length ? (
                        selectedMetricRows.map(({ metric, value, dataKey }) => (
                          <div
                            key={metric.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-[#2B3B60] dark:bg-[#0B1429]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-[8px] font-semibold text-slate-500 dark:text-slate-400">
                                  {metric.label}
                                </div>
                                <div className="mt-0.5 truncate font-mono text-[7px] text-slate-400 dark:text-slate-500">
                                  {dataKey || (resolvedMode === "fake" ? "Simulated" : "No mapped field")}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="text-[12px] font-black text-slate-800 dark:text-white">
                                  {formatMetricValue(value, metric)}
                                </span>
                                {metric.unit && (
                                  <span className="ml-1 text-[7px] font-semibold text-slate-400">
                                    {metric.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[8px] text-slate-400 dark:border-slate-700">
                          No measurements are defined for this equipment type.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-cyan-200 bg-cyan-50/50 px-3 py-3 text-[8px] leading-4 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/[0.05] dark:text-cyan-200">
                    Click any equipment in the process flow to inspect its device ID, mapped fields, and current values.
                  </div>
                )}
              </div>

            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

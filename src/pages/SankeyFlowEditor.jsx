import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Eye,
  GitBranch,
  Link2,
  Moon,
  Move,
  Plus,
  RefreshCw,
  Save,
  Sun,
  Trash2,
  WandSparkles,
  Workflow,
} from "lucide-react";

import SankeyWidget, {
  defaultSankeyConfig,
  getSankeyDataKeys,
  normalizeSankeyConfig,
} from "../widgets/SankeyWidget";
import { notify } from "../utils/feedback";

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

const commonUnitOptions = [
  "",
  "bar",
  "psi",
  "kPa",
  "Pa",
  "°C",
  "%",
  "kg/h",
  "t/h",
  "m³/h",
  "L/min",
  "rpm",
  "A",
  "V",
];

const SANKEY_COLOR_PRESETS = [
  "#58D7FF",
  "#7D75E7",
  "#A86BDF",
  "#FF6F88",
  "#FFD66B",
  "#4D91C9",
  "#FF9C63",
  "#D66BFF",
  "#5EA8FF",
  "#C084FC",
];

const MAX_SANKEY_NODES = 30;
const MAX_SANKEY_LINKS = 60;
const MAX_SANKEY_TIERS = 10;

const GRAPH_WIDTH = 3600;
const GRAPH_HEIGHT = 920;
const NODE_WIDTH = 188;
const NODE_HEIGHT = 76;
// Wider tier spacing keeps downstream stages visually "further back"
// instead of crowding the previous tier.
const NODE_GAP_X = 350;
const NODE_GAP_Y = 112;

const previewData = {
  ch1: 31.2,
  ch2: 44.1,
  ch3: 120,
  ch4: 36.6,
  ch5: 55,
  ch6: 4.3,
  ch7: 28,
  ch8: 102,
  ch9: 33,
  ch10: 51,
  ch11: 62,
  ch12: 90,
  ch13: 80,
};

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const normalizeTier = (value, fallback = 1) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return clamp(
    Math.round(numeric),
    1,
    MAX_SANKEY_TIERS
  );
};

const normalizeHexColor = (
  value,
  fallback = "#58D7FF"
) => {
  const text = String(value || "").trim();

  return /^#[0-9a-fA-F]{6}$/.test(text)
    ? text
    : fallback;
};

const readDarkMode = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const html = document.documentElement;
  const body = document.body;
  const storedTheme =
    localStorage.getItem("theme") ||
    localStorage.getItem("colorTheme") ||
    localStorage.getItem("appearance");

  return (
    html.classList.contains("dark") ||
    body.classList.contains("dark") ||
    html.dataset.theme === "dark" ||
    body.dataset.theme === "dark" ||
    storedTheme === "dark" ||
    localStorage.getItem("darkMode") === "true"
  );
};

const unique = (values = []) => [
  ...new Set(
    values.filter(Boolean).map(String)
  ),
];

const createsCycle = (
  links,
  candidate,
  ignoredId = null
) => {
  if (
    !candidate?.source ||
    !candidate?.target ||
    candidate.source === candidate.target
  ) {
    return true;
  }

  const adjacency = new Map();

  links.forEach((link) => {
    if (
      !link?.source ||
      !link?.target ||
      link.id === ignoredId
    ) {
      return;
    }

    if (!adjacency.has(link.source)) {
      adjacency.set(link.source, []);
    }

    adjacency.get(link.source).push(
      link.target
    );
  });

  if (!adjacency.has(candidate.source)) {
    adjacency.set(candidate.source, []);
  }

  adjacency
    .get(candidate.source)
    .push(candidate.target);

  const stack = [candidate.target];
  const visited = new Set();

  while (stack.length) {
    const current = stack.pop();

    if (current === candidate.source) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    (adjacency.get(current) || []).forEach(
      (next) => stack.push(next)
    );
  }

  return false;
};

const buildGraphCounts = (
  nodes,
  links
) => {
  const incoming = new Map(
    nodes.map((node) => [node.id, 0])
  );

  const outgoing = new Map(
    nodes.map((node) => [node.id, 0])
  );

  links.forEach((link) => {
    incoming.set(
      link.target,
      (incoming.get(link.target) || 0) + 1
    );

    outgoing.set(
      link.source,
      (outgoing.get(link.source) || 0) + 1
    );
  });

  return {
    incoming,
    outgoing,
  };
};

const getNodeRole = (
  nodeId,
  incomingCounts,
  outgoingCounts
) => {
  const incoming =
    incomingCounts.get(nodeId) || 0;

  const outgoing =
    outgoingCounts.get(nodeId) || 0;

  if (incoming === 0) return "Root";
  if (outgoing === 0) return "End";
  return "Branch";
};

const autoLayoutGraph = (
  nodes,
  links
) => {
  if (!nodes.length) return {};

  const groups = new Map();

  nodes.forEach((node) => {
    const tier = normalizeTier(node.tier, 1);

    if (!groups.has(tier)) {
      groups.set(tier, []);
    }

    groups.get(tier).push(node);
  });

  // Keep connected nodes close to each other inside each tier. This does
  // not change the tier; it only gives Auto Layout a more readable order.
  const incomingOrder = new Map();

  links.forEach((link) => {
    if (!incomingOrder.has(link.target)) {
      incomingOrder.set(link.target, []);
    }

    incomingOrder.get(link.target).push(link.source);
  });

  const positions = {};
  const sortedTiers = [...groups.keys()].sort((a, b) => a - b);

  sortedTiers.forEach((tier) => {
    const group = [...(groups.get(tier) || [])];

    group.sort((a, b) => {
      const aParent = incomingOrder.get(a.id)?.[0] || "";
      const bParent = incomingOrder.get(b.id)?.[0] || "";
      return aParent.localeCompare(bParent) || a.name.localeCompare(b.name);
    });

    const totalHeight = Math.max(
      NODE_HEIGHT,
      group.length * NODE_GAP_Y
    );

    const startY = Math.max(
      105,
      (GRAPH_HEIGHT - totalHeight) / 2
    );

    group.forEach((node, rowIndex) => {
      positions[node.id] = {
        x: clamp(
          95 + (tier - 1) * NODE_GAP_X,
          30,
          GRAPH_WIDTH - NODE_WIDTH - 30
        ),
        y: clamp(
          startY + rowIndex * NODE_GAP_Y,
          60,
          GRAPH_HEIGHT - NODE_HEIGHT - 30
        ),
      };
    });
  });

  return positions;
};

const getLinkPath = (
  sourcePosition,
  targetPosition
) => {
  if (
    !sourcePosition ||
    !targetPosition
  ) {
    return "";
  }

  const startX =
    sourcePosition.x + NODE_WIDTH;
  const startY =
    sourcePosition.y +
    NODE_HEIGHT / 2;

  const endX = targetPosition.x;
  const endY =
    targetPosition.y +
    NODE_HEIGHT / 2;

  const controlDistance = Math.max(
    75,
    Math.abs(endX - startX) * 0.48
  );

  return `M ${startX} ${startY} C ${
    startX + controlDistance
  } ${startY}, ${
    endX - controlDistance
  } ${endY}, ${endX} ${endY}`;
};

export default function SankeyFlowEditor({
  sankeyWidget,
  setSankeyWidget,
  setPage,
  darkMode,
  toggleTheme,
}) {
  const [detectedDarkMode, setDetectedDarkMode] =
    useState(() => readDarkMode());

  const isDarkMode =
    typeof darkMode === "boolean"
      ? darkMode
      : detectedDarkMode;

  const canvasViewportRef =
    useRef(null);

  useEffect(() => {
    if (typeof darkMode === "boolean") {
      return undefined;
    }

    const updateTheme = () =>
      setDetectedDarkMode(
        readDarkMode()
      );

    updateTheme();

    const observer =
      new MutationObserver(updateTheme);

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "class",
          "data-theme",
        ],
      }
    );

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-theme",
      ],
    });

    window.addEventListener(
      "storage",
      updateTheme
    );

    window.addEventListener(
      "themechange",
      updateTheme
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "storage",
        updateTheme
      );

      window.removeEventListener(
        "themechange",
        updateTheme
      );
    };
  }, [darkMode]);

  const templateMapping =
    sankeyWidget?.designerSnapshot
      ?.influxConfig || {};

  const mappedSource = useMemo(
    () => ({
      bucket: String(
        templateMapping.bucket || ""
      ),
      measurement: String(
        templateMapping.measurement || ""
      ),
      tagKey: String(
        templateMapping.tagKey || "id"
      ),
      tagValue: String(
        templateMapping.tagValue ||
          templateMapping.id ||
          ""
      ),
    }),
    [
      templateMapping.bucket,
      templateMapping.measurement,
      templateMapping.tagKey,
      templateMapping.tagValue,
      templateMapping.id,
    ]
  );

  const mappingReady = Boolean(
    mappedSource.bucket &&
      mappedSource.measurement &&
      mappedSource.tagValue
  );

  const initialConfig = useMemo(() => {
    const raw =
      sankeyWidget?.sankeyConfig ||
      defaultSankeyConfig;

    const normalized =
      normalizeSankeyConfig(raw);

    const rawPositions = new Map(
      (Array.isArray(raw?.nodes)
        ? raw.nodes
        : []
      ).map((node) => [
        node.id,
        node.editorPosition,
      ])
    );

    return {
      ...normalized,
      unit:
        normalized.unit || "psi",
      nodes: normalized.nodes.map(
        (node, index) => ({
          ...node,
          color: normalizeHexColor(
            node.color,
            SANKEY_COLOR_PRESETS[
              index %
                SANKEY_COLOR_PRESETS.length
            ]
          ),
          tier: normalizeTier(node.tier, 1),
          editorPosition:
            rawPositions.get(node.id) ||
            null,
        })
      ),
      links: normalized.links.map(
        (link, index) => {
          const channel =
            link.dataSource?.channel ||
            link.dataKey ||
            "";

          return {
            ...link,
            dataKey: channel,
            color: normalizeHexColor(
              link.color,
              SANKEY_COLOR_PRESETS[
                (index + 1) %
                  SANKEY_COLOR_PRESETS.length
              ]
            ),
            dataSource: {
              ...(link.dataSource || {}),
              ...(mappingReady
                ? mappedSource
                : {}),
              channel,
            },
          };
        }
      ),
    };
  }, []);

  const [config, setConfig] =
    useState(initialConfig);

  const safeNodes = Array.isArray(
    config.nodes
  )
    ? config.nodes
    : [];

  const safeLinks = Array.isArray(
    config.links
  )
    ? config.links
    : [];

  const highestNodeTier = Math.max(
    1,
    ...safeNodes.map((node) =>
      normalizeTier(node.tier, 1)
    )
  );

  const tierCount = normalizeTier(
    Math.max(
      Number(config.tierCount) || 0,
      highestNodeTier
    ),
    highestNodeTier
  );

  const initialPositions = useMemo(
    () => {
      const generated =
        autoLayoutGraph(
          safeNodes,
          safeLinks
        );

      const merged = {};

      safeNodes.forEach((node) => {
        const saved =
          node.editorPosition;

        merged[node.id] =
          saved &&
          Number.isFinite(saved.x) &&
          Number.isFinite(saved.y)
            ? {
                x: clamp(
                  saved.x,
                  20,
                  GRAPH_WIDTH -
                    NODE_WIDTH -
                    20
                ),
                y: clamp(
                  saved.y,
                  20,
                  GRAPH_HEIGHT -
                    NODE_HEIGHT -
                    20
                ),
              }
            : generated[node.id];
      });

      return merged;
    },
    []
  );

  const [positions, setPositions] =
    useState(initialPositions);

  const [selectedNodeId, setSelectedNodeId] =
    useState(
      safeNodes[0]?.id || null
    );

  const [selectedLinkId, setSelectedLinkId] =
    useState(null);

  const [connectFrom, setConnectFrom] =
    useState(null);

  const [dragging, setDragging] =
    useState(null);

  const [viewMode, setViewMode] =
    useState("graph");

  const [availableChannels, setAvailableChannels] =
    useState([]);

  const [loadingChannels, setLoadingChannels] =
    useState(false);

  const [channelError, setChannelError] =
    useState("");

  const nodeMap = useMemo(
    () =>
      new Map(
        safeNodes.map((node) => [
          node.id,
          node,
        ])
      ),
    [safeNodes]
  );

  const {
    incoming: incomingCounts,
    outgoing: outgoingCounts,
  } = useMemo(
    () =>
      buildGraphCounts(
        safeNodes,
        safeLinks
      ),
    [safeNodes, safeLinks]
  );

  const selectedNode =
    nodeMap.get(selectedNodeId) ||
    null;

  const selectedLink =
    safeLinks.find(
      (link) =>
        link.id === selectedLinkId
    ) || null;

  const rootNodes = safeNodes.filter(
    (node) =>
      (incomingCounts.get(node.id) ||
        0) === 0
  );

  const configuredLinks =
    safeLinks.filter(
      (link) =>
        link.dataSource?.channel ||
        link.dataKey
    );

  const derivedLinks =
    safeLinks.filter(
      (link) =>
        !(
          link.dataSource?.channel ||
          link.dataKey
        ) &&
        (outgoingCounts.get(
          link.target
        ) || 0) > 0 &&
        (incomingCounts.get(
          link.target
        ) || 0) === 1
    );

  const updateConfig = (changes) => {
    setConfig((current) => ({
      ...current,
      ...changes,
    }));
  };

  const updateNode = (
    nodeId,
    changes
  ) => {
    setConfig((current) => ({
      ...current,
      nodes: current.nodes.map(
        (node) =>
          node.id === nodeId
            ? {
                ...node,
                ...changes,
              }
            : node
      ),
    }));
  };

  const updateNodeTier = (nodeId, requestedTier) => {
    const nextTier = normalizeTier(requestedTier, 1);

    setConfig((current) => {
      const currentNode = current.nodes.find(
        (node) => node.id === nodeId
      );

      if (!currentNode) return current;

      const nextNodes = current.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, tier: nextTier }
          : node
      );

      const nextNodeMap = new Map(
        nextNodes.map((node) => [node.id, node])
      );

      const invalidLink = current.links.find((link) => {
        const sourceTier = normalizeTier(
          nextNodeMap.get(link.source)?.tier,
          1
        );
        const targetTier = normalizeTier(
          nextNodeMap.get(link.target)?.tier,
          sourceTier + 1
        );

        return sourceTier >= targetTier;
      });

      if (invalidLink) {
        notify(
          "A flow must move from an earlier tier to a later tier. Move or disconnect the conflicting node first.",
          "warning"
        );
        return current;
      }

      return {
        ...current,
        tierCount: Math.max(
          Number(current.tierCount) || 1,
          nextTier
        ),
        nodes: nextNodes,
      };
    });

    window.requestAnimationFrame(() => {
      setPositions(
        autoLayoutGraph(
          safeNodes.map((node) =>
            node.id === nodeId
              ? { ...node, tier: nextTier }
              : node
          ),
          safeLinks
        )
      );
    });
  };

  const updateLink = (
    linkId,
    changes
  ) => {
    setConfig((current) => {
      const existing =
        current.links.find(
          (link) =>
            link.id === linkId
        );

      if (!existing) {
        return current;
      }

      const candidate = {
        ...existing,
        ...changes,
      };

      const currentNodeMap = new Map(
        current.nodes.map((node) => [node.id, node])
      );

      const candidateSourceTier = normalizeTier(
        currentNodeMap.get(candidate.source)?.tier,
        1
      );

      const candidateTargetTier = normalizeTier(
        currentNodeMap.get(candidate.target)?.tier,
        candidateSourceTier + 1
      );

      if (
        (changes.source !== undefined ||
          changes.target !== undefined) &&
        candidateSourceTier >= candidateTargetTier
      ) {
        notify(
          "Flows must move from an earlier tier to a later tier.",
          "warning"
        );

        return current;
      }

      if (
        (changes.source !==
          undefined ||
          changes.target !==
            undefined) &&
        createsCycle(
          current.links,
          candidate,
          linkId
        )
      ) {
        notify(
          candidate.source ===
            candidate.target
            ? "A Sankey flow cannot connect a node to itself."
            : "That connection would create a loop. Sankey flows must stay acyclic.",
          "warning"
        );

        return current;
      }

      return {
        ...current,
        links: current.links.map(
          (link) =>
            link.id === linkId
              ? candidate
              : link
        ),
      };
    });
  };

  const addNode = () => {
    if (
      safeNodes.length >=
      MAX_SANKEY_NODES
    ) {
      notify(
        `Maximum ${MAX_SANKEY_NODES} Sankey nodes reached.`,
        "warning"
      );

      return;
    }

    const id = createId("node");
    const index = safeNodes.length;

    const selectedTier = normalizeTier(
      nodeMap.get(selectedNodeId)?.tier,
      tierCount
    );

    const nodeTier = selectedNodeId
      ? Math.min(
          MAX_SANKEY_TIERS,
          selectedTier + 1
        )
      : tierCount;

    const node = {
      id,
      name: `Node ${index + 1}`,
      color:
        SANKEY_COLOR_PRESETS[
          index %
            SANKEY_COLOR_PRESETS.length
        ],
      tier: nodeTier,
    };

    setConfig((current) => ({
      ...current,
      tierCount: Math.max(
        Number(current.tierCount) || 1,
        nodeTier
      ),
      nodes: [
        ...current.nodes,
        node,
      ],
    }));

    setPositions((current) => ({
      ...current,
      [id]: {
        x: clamp(
          95 + (nodeTier - 1) * NODE_GAP_X,
          20,
          GRAPH_WIDTH - NODE_WIDTH - 20
        ),
        y: clamp(
          130 +
            safeNodes.filter(
              (existingNode) =>
                normalizeTier(existingNode.tier, 1) === nodeTier
            ).length * NODE_GAP_Y,
          60,
          GRAPH_HEIGHT - NODE_HEIGHT - 20
        ),
      },
    }));

    setSelectedNodeId(id);
    setSelectedLinkId(null);
  };

  const removeNode = (nodeId) => {
    if (safeNodes.length <= 2) {
      notify(
        "A Sankey needs at least two nodes.",
        "warning"
      );
      return;
    }

    const node =
      nodeMap.get(nodeId);

    const connected =
      safeLinks.filter(
        (link) =>
          link.source === nodeId ||
          link.target === nodeId
      ).length;

    setConfig((current) => ({
      ...current,
      nodes: current.nodes.filter(
        (item) =>
          item.id !== nodeId
      ),
      links: current.links.filter(
        (link) =>
          link.source !== nodeId &&
          link.target !== nodeId
      ),
    }));

    setPositions((current) => {
      const next = {
        ...current,
      };
      delete next[nodeId];
      return next;
    });

    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setConnectFrom(null);

    notify(
      connected > 0
        ? `${node?.name || "Node"} removed together with ${connected} connected flow${connected === 1 ? "" : "s"}.`
        : `${node?.name || "Node"} removed.`,
      "info"
    );
  };

  const addLinkBetween = (
    source,
    target
  ) => {
    if (
      safeLinks.length >=
      MAX_SANKEY_LINKS
    ) {
      notify(
        `Maximum ${MAX_SANKEY_LINKS} Sankey flows reached.`,
        "warning"
      );
      return;
    }

    if (
      !source ||
      !target ||
      source === target
    ) {
      notify(
        "Choose two different nodes.",
        "warning"
      );
      return;
    }

    const sourceTier = normalizeTier(
      nodeMap.get(source)?.tier,
      1
    );

    const targetTier = normalizeTier(
      nodeMap.get(target)?.tier,
      sourceTier + 1
    );

    if (sourceTier >= targetTier) {
      notify(
        "Connect from an earlier tier to a later tier (for example Tier 1 → Tier 2 → Tier 3).",
        "warning"
      );
      return;
    }

    const duplicate =
      safeLinks.some(
        (link) =>
          link.source === source &&
          link.target === target
      );

    if (duplicate) {
      notify(
        "That flow already exists.",
        "info"
      );
      return;
    }

    const candidate = {
      id: createId("link"),
      source,
      target,
      label: "",
      color:
        SANKEY_COLOR_PRESETS[
          (safeLinks.length + 1) %
            SANKEY_COLOR_PRESETS.length
        ],
      dataKey: "",
      dataSource: {
        ...(mappingReady
          ? mappedSource
          : {}),
        channel: "",
      },
    };

    if (
      createsCycle(
        safeLinks,
        candidate
      )
    ) {
      notify(
        "That connection would create a loop. Sankey flows must move forward without cycles.",
        "warning"
      );
      return;
    }

    setConfig((current) => ({
      ...current,
      links: [
        ...current.links,
        candidate,
      ],
    }));

    setSelectedNodeId(null);
    setSelectedLinkId(candidate.id);
    setConnectFrom(null);
  };

  const canConnectNodes = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return false;
    }

    const sourceTier = normalizeTier(
      nodeMap.get(sourceId)?.tier,
      1
    );

    const targetTier = normalizeTier(
      nodeMap.get(targetId)?.tier,
      sourceTier + 1
    );

    if (targetTier <= sourceTier) {
      return false;
    }

    return !safeLinks.some(
      (link) =>
        link.source === sourceId &&
        link.target === targetId
    );
  };

  const beginConnectionFrom = (nodeId) => {
    if (!nodeId) {
      notify(
        "Select a source node first, then press Connect.",
        "info"
      );
      return;
    }

    setConnectFrom(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedLinkId(null);

    notify(
      `Connecting from ${nodeMap.get(nodeId)?.name || "node"}. Click any highlighted node in a later tier.`,
      "info"
    );
  };

  const handleNodeCanvasClick = (nodeId) => {
    if (connectFrom && nodeId !== connectFrom) {
      if (canConnectNodes(connectFrom, nodeId)) {
        addLinkBetween(connectFrom, nodeId);
      } else {
        const sourceTier = normalizeTier(
          nodeMap.get(connectFrom)?.tier,
          1
        );
        const targetTier = normalizeTier(
          nodeMap.get(nodeId)?.tier,
          1
        );

        if (targetTier <= sourceTier) {
          notify(
            `Choose a node after Tier ${sourceTier}. Sankey flows must move forward.`,
            "warning"
          );
        } else {
          notify(
            "That flow already exists.",
            "info"
          );
        }
      }
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedLinkId(null);
  };

  const addDefaultLink = () => {
    if (safeNodes.length < 2) {
      notify(
        "Add at least two nodes first.",
        "warning"
      );
      return;
    }

    const source =
      safeNodes[0]?.id;

    const target =
      safeNodes.find(
        (node) =>
          node.id !== source
      )?.id;

    addLinkBetween(
      source,
      target
    );
  };

  const removeLink = (linkId) => {
    setConfig((current) => ({
      ...current,
      links: current.links.filter(
        (link) =>
          link.id !== linkId
      ),
    }));

    setSelectedLinkId(null);
  };

  const setLinkChannel = (
    linkId,
    channel
  ) => {
    const existing =
      safeLinks.find(
        (link) =>
          link.id === linkId
      );

    updateLink(linkId, {
      dataKey: channel,
      dataSource: {
        ...(existing?.dataSource ||
          {}),
        ...(mappingReady
          ? mappedSource
          : {}),
        channel,
      },
    });
  };

  const handleAutoLayout = () => {
    setPositions(
      autoLayoutGraph(
        safeNodes,
        safeLinks
      )
    );

    notify(
      "Graph arranged by tier.",
      "success"
    );

    window.requestAnimationFrame(
      () => {
        if (canvasViewportRef.current) {
          canvasViewportRef.current.scrollTo({
            left: 0,
            top: 0,
            behavior: "smooth",
          });
        }
      }
    );
  };

  const startDrag = (
    event,
    nodeId
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // While a connection is being created, the whole target node becomes
    // clickable. Users do not need to hit the tiny input port precisely.
    if (connectFrom && nodeId !== connectFrom) {
      handleNodeCanvasClick(nodeId);
      return;
    }

    const position =
      positions[nodeId];

    if (!position) return;

    setSelectedNodeId(nodeId);
    setSelectedLinkId(null);

    setDragging({
      nodeId,
      startClientX:
        event.clientX,
      startClientY:
        event.clientY,
      startX: position.x,
      startY: position.y,
    });
  };

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const handleMove = (event) => {
      const dx =
        event.clientX -
        dragging.startClientX;

      const dy =
        event.clientY -
        dragging.startClientY;

      setPositions((current) => ({
        ...current,
        [dragging.nodeId]: {
          x: clamp(
            dragging.startX + dx,
            20,
            GRAPH_WIDTH -
              NODE_WIDTH -
              20
          ),
          y: clamp(
            dragging.startY + dy,
            20,
            GRAPH_HEIGHT -
              NODE_HEIGHT -
              20
          ),
        },
      }));
    };

    const handleUp = () => {
      setDragging(null);
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
  }, [dragging]);

  const handlePortClick = (
    nodeId,
    port
  ) => {
    if (port === "out") {
      if (connectFrom === nodeId) {
        setConnectFrom(null);
        return;
      }

      beginConnectionFrom(nodeId);
      return;
    }

    if (
      port === "in" &&
      connectFrom
    ) {
      handleNodeCanvasClick(nodeId);
    }
  };

  const fetchMappedChannels =
    async () => {
      if (!mappingReady) {
        setAvailableChannels([]);
        setChannelError(
          "Template Data Mapping is incomplete. Return to Template Designer and complete Data Mapping first."
        );
        return;
      }

      const token =
        localStorage.getItem("token");

      const query =
        new URLSearchParams({
          bucket:
            mappedSource.bucket,
          measurement:
            mappedSource.measurement,
          tagKey:
            mappedSource.tagKey ||
            "id",
          tagValue:
            mappedSource.tagValue,
        });

      setLoadingChannels(true);
      setChannelError("");

      try {
        const response = await fetch(
          `http://localhost:5000/influx/channels?${query.toString()}`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Failed to load fields for the mapped device."
          );
        }

        setAvailableChannels(
          unique(
            result?.channels ||
              result?.fields ||
              []
          )
        );
      } catch (error) {
        console.error(
          "❌ Sankey mapped channel error:",
          error
        );

        setAvailableChannels([]);

        setChannelError(
          error.message ||
            "Failed to load fields for the mapped device."
        );
      } finally {
        setLoadingChannels(false);
      }
    };

  useEffect(() => {
    fetchMappedChannels();
    // Data Mapping is inherited when the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewValues = useMemo(
    () => {
      const values = {
        ...previewData,
      };

      availableChannels.forEach(
        (channel, index) => {
          if (
            values[channel] ===
            undefined
          ) {
            values[channel] =
              18 + index * 8;
          }
        }
      );

      return values;
    },
    [availableChannels]
  );

  const handleBack = () => {
    setSankeyWidget({
      ...sankeyWidget,
      resumeWidgetSettings: true,
    });

    setPage(
      sankeyWidget?.returnPage ||
        "builder"
    );
  };

  const handleSave = () => {
    const cleanNodes =
      safeNodes.map(
        (node, index) => ({
          id:
            node.id ||
            createId(
              `node-${index + 1}`
            ),
          name:
            String(
              node.name || ""
            ).trim() ||
            `Node ${index + 1}`,
          color:
            normalizeHexColor(
              node.color,
              SANKEY_COLOR_PRESETS[
                index %
                  SANKEY_COLOR_PRESETS.length
              ]
            ),
          tier: normalizeTier(node.tier, 1),
        })
      );

    const validNodeIds =
      new Set(
        cleanNodes.map(
          (node) => node.id
        )
      );

    const cleanLinks =
      safeLinks
        .filter(
          (link) =>
            validNodeIds.has(
              link.source
            ) &&
            validNodeIds.has(
              link.target
            ) &&
            link.source !==
              link.target
        )
        .map((link, index) => {
          const channel =
            link.dataSource
              ?.channel ||
            link.dataKey ||
            "";

          return {
            id:
              link.id ||
              createId(
                `link-${index + 1}`
              ),
            source: link.source,
            target: link.target,
            label:
              String(
                link.label || ""
              ).trim(),
            color:
              normalizeHexColor(
                link.color,
                SANKEY_COLOR_PRESETS[
                  (index + 1) %
                    SANKEY_COLOR_PRESETS.length
                ]
              ),
            dataKey: channel,
            dataSource: {
              ...(link.dataSource ||
                {}),
              ...(mappingReady
                ? mappedSource
                : {}),
              channel,
            },
          };
        });

    if (!cleanLinks.length) {
      notify(
        "Configure at least one Sankey flow between two nodes.",
        "warning"
      );
      return;
    }

    for (const link of cleanLinks) {
      if (
        createsCycle(
          cleanLinks.filter(
            (item) =>
              item.id !== link.id
          ),
          link
        )
      ) {
        notify(
          "The Sankey contains a circular connection. Remove the loop before saving.",
          "error"
        );
        return;
      }
    }

    const terminalNodeIds =
      new Set(
        cleanNodes
          .filter(
            (node) =>
              !cleanLinks.some(
                (link) =>
                  link.source ===
                  node.id
              )
          )
          .map(
            (node) => node.id
          )
      );

    const unmappedTerminalLinks =
      cleanLinks.filter(
        (link) =>
          terminalNodeIds.has(
            link.target
          ) &&
          !(
            link.dataSource
              ?.channel ||
            link.dataKey
          )
      );

    if (
      unmappedTerminalLinks.length >
      0
    ) {
      notify(
        `${unmappedTerminalLinks.length} terminal flow${unmappedTerminalLinks.length === 1 ? " is" : "s are"} not mapped to a process field. They will show no live value until mapped.`,
        "warning"
      );
    }

    const normalized =
      normalizeSankeyConfig({
        unit:
          String(
            config.unit || ""
          ).trim() || "psi",
        flowStyle:
          config.flowStyle === "continuous"
            ? "continuous"
            : "separated",
        flowGap: clamp(
          Number(config.flowGap ?? 7) || 0,
          0,
          18
        ),
        tierCount,
        nodes: cleanNodes,
        links: cleanLinks,
      });

    const persistedNodes =
      normalized.nodes.map(
        (node) => ({
          ...node,
          editorPosition:
            positions[node.id] || null,
        })
      );

    const persistedConfig = {
      ...normalized,
      nodes: persistedNodes,
    };

    const dataKeys =
      getSankeyDataKeys(
        persistedConfig
      );

    setSankeyWidget({
      ...sankeyWidget,
      sankeyConfig:
        persistedConfig,
      dataKeys,
      dataKey:
        dataKeys[0] ||
        sankeyWidget?.dataKey ||
        "",
      resumeWidgetSettings: true,
    });

    notify(
      "Sankey flow network saved.",
      "success"
    );

    setPage(
      sankeyWidget?.returnPage ||
        "builder"
    );
  };

  return (
    <div
      data-theme={
        isDarkMode
          ? "dark"
          : "light"
      }
      className={
        isDarkMode
          ? "sankey-flow-editor-theme dark h-screen w-full"
          : "sankey-flow-editor-theme h-screen w-full"
      }
    >
      <style>{`
        .sankey-flow-editor-theme[data-theme="dark"] {
          background: #081022;
          color: #c8d1ea;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .bg-white {
          background-color: #111B34 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .bg-slate-50 {
          background-color: #0B1328 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] input,
        .sankey-flow-editor-theme[data-theme="dark"] select {
          background-color: #081022 !important;
          border-color: #2C3C61 !important;
          color: #e8edff !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] option {
          background-color: #081022;
          color: #e8edff;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .border-slate-200,
        .sankey-flow-editor-theme[data-theme="dark"] .border-slate-300,
        .sankey-flow-editor-theme[data-theme="dark"] .border-slate-700 {
          border-color: #2C3C61 !important;
        }

        .sankey-editor-grid {
          background-image:
            linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .dark .sankey-editor-grid {
          background-image:
            linear-gradient(rgba(88,215,255,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(88,215,255,0.055) 1px, transparent 1px);
        }

        .sankey-editor-node {
          user-select: none;
        }

        .sankey-editor-link {
          transition:
            stroke-width 140ms ease,
            opacity 140ms ease;
        }

        .sankey-editor-link:hover {
          stroke-width: 5;
        }

        @media (prefers-reduced-motion: reduce) {
          .sankey-flow-editor-theme * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50 p-3 dark:border-[#2C3C61] dark:bg-[#081022]">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-[#2C3C61] dark:bg-[#111B34]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-[#17233F] dark:hover:bg-[#1B2948]"
                aria-label="Back to template designer"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Workflow
                    className="text-cyan-500"
                    size={18}
                  />
                  <h1 className="truncate text-base font-black text-slate-900 dark:text-white">
                    Sankey Flow Editor
                  </h1>
                </div>

                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Drag nodes, connect ports, and edit only the selected item.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 md:flex dark:border-[#2C3C61] dark:bg-[#0B1328]">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode("graph")
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-black transition ${
                    viewMode === "graph"
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-[#17233F] dark:text-cyan-200"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Move size={13} />
                  Graph
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode("preview")
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-black transition ${
                    viewMode === "preview"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-[#17233F] dark:text-indigo-200"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Eye size={13} />
                  Preview
                </button>
              </div>

              {viewMode === "graph" && (
                <button
                  type="button"
                  onClick={handleAutoLayout}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 text-[10px] font-black text-violet-700 transition hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200"
                >
                  <WandSparkles size={14} />
                  Auto Layout
                </button>
              )}

              {typeof toggleTheme ===
                "function" && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-[#2C3C61] dark:bg-[#17233F] dark:text-slate-200 dark:hover:bg-[#1B2948]"
                >
                  {isDarkMode ? (
                    <Sun size={17} />
                  ) : (
                    <Moon size={17} />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 text-xs font-black text-white transition hover:from-cyan-400 hover:to-indigo-400"
              >
                <Save size={15} />
                Save
              </button>
            </div>
          </div>

          {viewMode === "preview" ? (
            <div className="min-h-0 flex-1">
              <SankeyWidget
                data={previewValues}
                item={{
                  ...sankeyWidget,
                  label:
                    sankeyWidget?.label ||
                    "Sankey Flow",
                  sankeyConfig: config,
                  previewMode: true,
                  isBuilderPreview: true,
                }}
              />
            </div>
          ) : (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2C3C61] dark:bg-[#0B1328]">
              <div className="absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addNode}
                  disabled={
                    safeNodes.length >=
                    MAX_SANKEY_NODES
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 text-[10px] font-black text-white shadow-sm transition hover:bg-cyan-400 disabled:opacity-40"
                >
                  <Plus size={13} />
                  Node
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (tierCount >= MAX_SANKEY_TIERS) {
                      notify(
                        `Maximum ${MAX_SANKEY_TIERS} tiers reached.`,
                        "warning"
                      );
                      return;
                    }

                    updateConfig({
                      tierCount: tierCount + 1,
                    });

                    notify(
                      `Tier ${tierCount + 1} added.`,
                      "success"
                    );
                  }}
                  disabled={tierCount >= MAX_SANKEY_TIERS}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[10px] font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-40 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200"
                >
                  <Plus size={13} />
                  Tier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (connectFrom) {
                      setConnectFrom(null);
                      return;
                    }

                    if (selectedNodeId) {
                      beginConnectionFrom(selectedNodeId);
                      return;
                    }

                    notify(
                      "Select a source node first, then press Connect.",
                      "info"
                    );
                  }}
                  disabled={safeNodes.length < 2}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-black transition disabled:opacity-40 ${
                    connectFrom
                      ? "border-cyan-400 bg-cyan-500 text-white shadow-sm dark:border-cyan-300 dark:bg-cyan-400/20 dark:text-cyan-100"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200"
                  }`}
                >
                  <Link2 size={13} />
                  {connectFrom ? "Cancel Connect" : "Connect"}
                </button>

                {connectFrom && (
                  <div className="inline-flex h-8 items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-[10px] font-bold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                    From:
                    <strong>
                      {nodeMap.get(
                        connectFrom
                      )?.name ||
                        "Node"}
                    </strong>
                    <span className="hidden sm:inline text-[9px] font-medium opacity-75">
                      → click a highlighted later-tier node
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setConnectFrom(null)
                      }
                      className="font-black"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={canvasViewportRef}
                className="h-full overflow-auto"
              >
                <div
                  className="sankey-editor-grid relative"
                  style={{
                    width: GRAPH_WIDTH,
                    height: GRAPH_HEIGHT,
                  }}
                  onPointerDown={() => {
                    setSelectedNodeId(null);
                    setSelectedLinkId(null);
                  }}
                >
                  {Array.from(
                    { length: tierCount },
                    (_, index) => {
                      const tier = index + 1;
                      const left =
                        68 + index * NODE_GAP_X;

                      return (
                        <div
                          key={`tier-band-${tier}`}
                          className="pointer-events-none absolute top-0 z-0 h-full border-l border-dashed border-slate-200/80 dark:border-[#2C3C61]/70"
                          style={{
                            left,
                            width: NODE_GAP_X,
                          }}
                        >
                          <div className="sticky top-3 ml-3 inline-flex rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm backdrop-blur dark:border-[#2C3C61] dark:bg-[#111B34]/90 dark:text-slate-300">
                            Tier {tier}
                          </div>
                        </div>
                      );
                    }
                  )}

                  <svg
                    className="pointer-events-none absolute inset-0 z-0"
                    width={GRAPH_WIDTH}
                    height={GRAPH_HEIGHT}
                    viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                  >
                    <defs>
                      <marker
                        id="sankey-editor-arrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto-start-reverse"
                      >
                        <path
                          d="M 0 0 L 10 5 L 0 10 z"
                          fill="#58D7FF"
                        />
                      </marker>
                    </defs>

                    {safeLinks.map(
                      (link) => {
                        const sourcePosition =
                          positions[
                            link.source
                          ];

                        const targetPosition =
                          positions[
                            link.target
                          ];

                        const path =
                          getLinkPath(
                            sourcePosition,
                            targetPosition
                          );

                        const selected =
                          selectedLinkId ===
                          link.id;

                        if (!path) {
                          return null;
                        }

                        return (
                          <g key={link.id}>
                            <path
                              d={path}
                              fill="none"
                              stroke="transparent"
                              strokeWidth={18}
                              className="pointer-events-auto cursor-pointer"
                              onPointerDown={(
                                event
                              ) => {
                                event.stopPropagation();
                                setSelectedLinkId(
                                  link.id
                                );
                                setSelectedNodeId(
                                  null
                                );
                              }}
                            />

                            <path
                              d={path}
                              fill="none"
                              stroke={
                                selected
                                  ? "#58D7FF"
                                  : normalizeHexColor(
                                      link.color,
                                      "#7D75E7"
                                    )
                              }
                              strokeWidth={
                                selected
                                  ? 4
                                  : 3
                              }
                              strokeOpacity={
                                selected
                                  ? 1
                                  : 0.72
                              }
                              markerEnd="url(#sankey-editor-arrow)"
                              className="sankey-editor-link pointer-events-none"
                            />
                          </g>
                        );
                      }
                    )}
                  </svg>

                  {safeNodes.map(
                    (node) => {
                      const position =
                        positions[node.id] ||
                        {
                          x: 80,
                          y: 80,
                        };

                      const selected =
                        selectedNodeId ===
                        node.id;

                      const role =
                        getNodeRole(
                          node.id,
                          incomingCounts,
                          outgoingCounts
                        );

                      const outgoing =
                        outgoingCounts.get(
                          node.id
                        ) || 0;

                      const incoming =
                        incomingCounts.get(
                          node.id
                        ) || 0;

                      return (
                        <div
                          key={node.id}
                          className={`sankey-editor-node absolute z-10 rounded-xl border shadow-sm transition-all ${
                            connectFrom && node.id !== connectFrom
                              ? canConnectNodes(connectFrom, node.id)
                                ? "cursor-copy border-cyan-400 bg-cyan-50/90 ring-2 ring-cyan-300/30 hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-300/60 dark:bg-cyan-400/10 dark:ring-cyan-400/15"
                                : "opacity-45 border-slate-200 bg-slate-50 dark:border-[#263657] dark:bg-[#0D172D]"
                              : connectFrom === node.id
                              ? "border-indigo-400 bg-indigo-50/90 ring-2 ring-indigo-300/30 dark:border-indigo-300/60 dark:bg-indigo-400/10"
                              : selected
                              ? "border-cyan-400 bg-cyan-50/95 shadow-[0_0_0_2px_rgba(34,211,238,0.12)] dark:bg-[#13233D]"
                              : "border-slate-200 bg-white hover:border-cyan-300 dark:border-[#2C3C61] dark:bg-[#111B34]"
                          }`}
                          style={{
                            left: position.x,
                            top: position.y,
                            width: NODE_WIDTH,
                            height: NODE_HEIGHT,
                          }}
                          onPointerDown={(
                            event
                          ) => {
                            event.stopPropagation();

                            if (connectFrom && node.id !== connectFrom) {
                              event.preventDefault();
                              handleNodeCanvasClick(node.id);
                              return;
                            }

                            setSelectedNodeId(node.id);
                            setSelectedLinkId(null);
                          }}
                        >
                          <button
                            type="button"
                            onPointerDown={(
                              event
                            ) =>
                              handlePortClick(
                                node.id,
                                "in"
                              )
                            }
                            className={`absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition dark:border-[#111B34] ${
                              connectFrom
                                ? "bg-cyan-400 ring-4 ring-cyan-400/10 hover:scale-125"
                                : "bg-slate-300 hover:bg-cyan-400 dark:bg-slate-600"
                            }`}
                            title={
                              connectFrom
                                ? "Connect to this node"
                                : "Input port"
                            }
                          />

                          <button
                            type="button"
                            onPointerDown={(
                              event
                            ) =>
                              handlePortClick(
                                node.id,
                                "out"
                              )
                            }
                            className={`absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition dark:border-[#111B34] ${
                              connectFrom ===
                              node.id
                                ? "bg-cyan-400 ring-4 ring-cyan-400/20"
                                : "bg-indigo-400 hover:scale-125 hover:bg-cyan-400"
                            }`}
                            title="Start connection"
                          />

                          <div
                            className="flex h-7 cursor-grab items-center justify-between gap-2 border-b border-slate-100 px-2.5 active:cursor-grabbing dark:border-[#263657]"
                            onPointerDown={(
                              event
                            ) =>
                              startDrag(
                                event,
                                node.id
                              )
                            }
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  background:
                                    normalizeHexColor(
                                      node.color,
                                      "#58D7FF"
                                    ),
                                }}
                              />

                              <span className="truncate text-[10px] font-black text-slate-800 dark:text-slate-100">
                                {node.name}
                              </span>
                            </div>

                            <Move
                              size={11}
                              className="shrink-0 text-slate-400"
                            />
                          </div>

                          <div className="flex h-[48px] items-center justify-between gap-2 px-2.5">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="inline-flex rounded-md bg-cyan-50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                                  Tier {normalizeTier(node.tier, 1)}
                                </span>
                                <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-500 dark:bg-[#17233F] dark:text-slate-300">
                                  {role}
                                </span>
                              </div>

                              <p className="mt-1 truncate text-[8px] text-slate-400">
                                {incoming} in · {outgoing} out
                              </p>
                            </div>

                            {outgoing > 1 && (
                              <div className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-1 text-[8px] font-bold text-violet-600 dark:bg-violet-400/10 dark:text-violet-200">
                                <GitBranch size={10} />
                                {outgoing}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="min-h-0 overflow-y-auto bg-white dark:bg-[#0B1328]">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-[#2C3C61] dark:bg-[#0B1328]/95">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Inspector
            </h2>

            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Select one node or flow. Only its settings appear here.
            </p>
          </div>

          <div className="space-y-3 p-4">
            <div
              className={`rounded-xl border p-3 ${
                mappingReady
                  ? "border-cyan-200 bg-cyan-50/60 dark:border-cyan-400/20 dark:bg-cyan-400/5"
                  : "border-amber-300 bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/5"
              }`}
            >
              <div className="flex items-start gap-2">
                <Database
                  size={15}
                  className={
                    mappingReady
                      ? "mt-0.5 text-cyan-600 dark:text-cyan-300"
                      : "mt-0.5 text-amber-600 dark:text-amber-300"
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                      Template Data Mapping
                    </p>

                    {mappingReady ? (
                      <CheckCircle2
                        size={14}
                        className="text-cyan-600"
                      />
                    ) : (
                      <AlertCircle
                        size={14}
                        className="text-amber-500"
                      />
                    )}
                  </div>

                  {mappingReady ? (
                    <p className="mt-1 truncate text-[9px] text-slate-500 dark:text-slate-400">
                      {mappedSource.measurement} · {mappedSource.tagValue}
                    </p>
                  ) : (
                    <p className="mt-1 text-[9px] font-semibold leading-4 text-amber-700 dark:text-amber-300">
                      Complete Data Mapping to select live fields.
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                      {loadingChannels
                        ? "Loading..."
                        : `${availableChannels.length} field(s)`}
                    </span>

                    <button
                      type="button"
                      onClick={
                        fetchMappedChannels
                      }
                      disabled={
                        loadingChannels ||
                        !mappingReady
                      }
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-bold text-slate-600 disabled:opacity-40 dark:border-[#2C3C61] dark:bg-[#17233F] dark:text-slate-300"
                    >
                      <RefreshCw
                        size={10}
                        className={
                          loadingChannels
                            ? "animate-spin"
                            : ""
                        }
                      />
                      Refresh
                    </button>
                  </div>

                  {channelError && (
                    <p className="mt-2 text-[9px] font-semibold leading-4 text-rose-500 dark:text-rose-300">
                      {channelError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center dark:border-[#2C3C61] dark:bg-[#111B34]">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Nodes
                </p>
                <p className="mt-0.5 text-sm font-black text-cyan-600 dark:text-cyan-300">
                  {safeNodes.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center dark:border-[#2C3C61] dark:bg-[#111B34]">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Flows
                </p>
                <p className="mt-0.5 text-sm font-black text-indigo-600 dark:text-indigo-300">
                  {safeLinks.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center dark:border-[#2C3C61] dark:bg-[#111B34]">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Roots
                </p>
                <p className="mt-0.5 text-sm font-black text-violet-600 dark:text-violet-300">
                  {rootNodes.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center dark:border-[#2C3C61] dark:bg-[#111B34]">
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Tiers
                </p>
                <p className="mt-0.5 text-sm font-black text-cyan-600 dark:text-cyan-300">
                  {tierCount}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-[#2C3C61] dark:bg-[#111B34]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Flow Appearance
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    Separated keeps visible space between branches.
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-1 dark:bg-[#081022]">
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      flowStyle: "separated",
                    })
                  }
                  className={`h-8 rounded-md text-[9px] font-black transition ${
                    config.flowStyle !== "continuous"
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-[#17233F] dark:text-cyan-200"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Separated
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      flowStyle: "continuous",
                    })
                  }
                  className={`h-8 rounded-md text-[9px] font-black transition ${
                    config.flowStyle === "continuous"
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-[#17233F] dark:text-indigo-200"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Continuous
                </button>
              </div>

              {config.flowStyle !== "continuous" && (
                <label className="mt-3 block">
                  <span className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <span>Branch Gap</span>
                    <span className="text-cyan-600 dark:text-cyan-300">
                      {Math.round(Number(config.flowGap ?? 7))} px
                    </span>
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="18"
                    step="1"
                    value={Number(config.flowGap ?? 7)}
                    onChange={(event) =>
                      updateConfig({
                        flowGap: Number(event.target.value),
                      })
                    }
                    className="mt-2 w-full accent-cyan-500"
                  />

                  <div className="mt-1 flex justify-between text-[8px] text-slate-400">
                    <span>Tight</span>
                    <span>Wide</span>
                  </div>
                </label>
              )}

              <div className="my-3 h-px bg-slate-200 dark:bg-[#263657]" />

              <label className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Unit
              </label>

              <input
                type="text"
                list="sankey-unit-options"
                value={config.unit || ""}
                onChange={(event) =>
                  updateConfig({
                    unit:
                      event.target.value,
                  })
                }
                placeholder="psi"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
              />

              <datalist id="sankey-unit-options">
                {commonUnitOptions.map(
                  (unit) => (
                    <option
                      key={
                        unit || "empty"
                      }
                      value={unit}
                    />
                  )
                )}
              </datalist>
            </div>

            {selectedNode && (
              <section className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3 dark:border-cyan-400/20 dark:bg-cyan-400/5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
                      Node
                    </p>

                    <h3 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                      {selectedNode.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeNode(
                        selectedNode.id
                      )
                    }
                    disabled={
                      safeNodes.length <= 2
                    }
                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-400/10"
                    title="Delete node"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <label className="mt-3 block">
                  <span className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Name
                  </span>

                  <input
                    type="text"
                    value={
                      selectedNode.name ||
                      ""
                    }
                    onChange={(event) =>
                      updateNode(
                        selectedNode.id,
                        {
                          name:
                            event.target
                              .value,
                        }
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-cyan-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tier
                  </span>

                  <select
                    value={normalizeTier(selectedNode.tier, 1)}
                    onChange={(event) =>
                      updateNodeTier(
                        selectedNode.id,
                        Number(event.target.value)
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-cyan-500 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                  >
                    {Array.from(
                      { length: tierCount },
                      (_, index) => index + 1
                    ).map((tier) => (
                      <option key={tier} value={tier}>
                        Tier {tier}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-[8px] leading-4 text-slate-400">
                    Nodes in the same tier share one visual stage/column. Flows must move to a later tier.
                  </p>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (connectFrom === selectedNode.id) {
                      setConnectFrom(null);
                    } else {
                      beginConnectionFrom(selectedNode.id);
                    }
                  }}
                  disabled={
                    safeNodes.length < 2 ||
                    normalizeTier(selectedNode.tier, 1) >= tierCount
                  }
                  className={`mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    connectFrom === selectedNode.id
                      ? "border-cyan-400 bg-cyan-500 text-white dark:bg-cyan-400/20 dark:text-cyan-100"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200"
                  }`}
                >
                  <Link2 size={13} />
                  {connectFrom === selectedNode.id
                    ? "Cancel Connection"
                    : "Connect From This Node"}
                </button>

                <div className="mt-3">
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Color
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {SANKEY_COLOR_PRESETS.map(
                      (color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            updateNode(
                              selectedNode.id,
                              {
                                color,
                              }
                            )
                          }
                          className={`h-7 w-7 rounded-lg border-2 transition ${
                            normalizeHexColor(
                              selectedNode.color
                            ) === color
                              ? "scale-110 border-slate-900 dark:border-white"
                              : "border-transparent"
                          }`}
                          style={{
                            background:
                              color,
                          }}
                          title={color}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-2.5 text-[9px] text-slate-500 dark:border-[#263657] dark:bg-[#111B34] dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-200">
                    {getNodeRole(
                      selectedNode.id,
                      incomingCounts,
                      outgoingCounts
                    )}
                  </strong>
                  {" · "}
                  {incomingCounts.get(
                    selectedNode.id
                  ) || 0} incoming
                  {" · "}
                  {outgoingCounts.get(
                    selectedNode.id
                  ) || 0} outgoing
                </div>
              </section>
            )}

            {selectedLink && (
              <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-400/20 dark:bg-indigo-400/5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
                      Flow
                    </p>

                    <h3 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                      {nodeMap.get(
                        selectedLink.source
                      )?.name ||
                        "Source"}
                      <span className="mx-2 text-cyan-500">
                        →
                      </span>
                      {nodeMap.get(
                        selectedLink.target
                      )?.name ||
                        "Target"}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeLink(
                        selectedLink.id
                      )
                    }
                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-400/10"
                    title="Delete flow"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <label>
                    <span className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      From
                    </span>

                    <select
                      value={
                        selectedLink.source
                      }
                      onChange={(event) =>
                        updateLink(
                          selectedLink.id,
                          {
                            source:
                              event.target
                                .value,
                          }
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-[10px] font-semibold outline-none dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                    >
                      {safeNodes.map(
                        (node) => (
                          <option
                            key={node.id}
                            value={node.id}
                          >
                            {node.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <ArrowRight
                    size={15}
                    className="mb-2 text-cyan-500"
                  />

                  <label>
                    <span className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      To
                    </span>

                    <select
                      value={
                        selectedLink.target
                      }
                      onChange={(event) =>
                        updateLink(
                          selectedLink.id,
                          {
                            target:
                              event.target
                                .value,
                          }
                        )
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-[10px] font-semibold outline-none dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                    >
                      {safeNodes.map(
                        (node) => (
                          <option
                            key={node.id}
                            value={node.id}
                          >
                            {node.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Flow Field
                  </span>

                  <select
                    value={
                      selectedLink
                        .dataSource
                        ?.channel ||
                      selectedLink.dataKey ||
                      ""
                    }
                    onChange={(event) =>
                      setLinkChannel(
                        selectedLink.id,
                        event.target.value
                      )
                    }
                    disabled={
                      !mappingReady ||
                      loadingChannels
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] outline-none disabled:opacity-50 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                  >
                    <option value="">
                      {(outgoingCounts.get(
                        selectedLink.target
                      ) || 0) > 0 &&
                      (incomingCounts.get(
                        selectedLink.target
                      ) || 0) === 1
                        ? "Auto · sum child flows"
                        : "No field selected"}
                    </option>

                    {availableChannels.map(
                      (field) => (
                        <option
                          key={field}
                          value={field}
                        >
                          {field}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <div className="mt-3">
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Flow Color
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {SANKEY_COLOR_PRESETS.map(
                      (color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            updateLink(
                              selectedLink.id,
                              {
                                color,
                              }
                            )
                          }
                          className={`h-7 w-7 rounded-lg border-2 transition ${
                            normalizeHexColor(
                              selectedLink.color
                            ) === color
                              ? "scale-110 border-slate-900 dark:border-white"
                              : "border-transparent"
                          }`}
                          style={{
                            background:
                              color,
                          }}
                          title={color}
                        />
                      )
                    )}
                  </div>
                </div>
              </section>
            )}

            {!selectedNode &&
              !selectedLink && (
                <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-[#2C3C61] dark:bg-[#111B34]">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Move size={15} />
                    <p className="text-xs font-black">
                      Select something on the canvas
                    </p>
                  </div>

                  <div className="mt-3 space-y-2 text-[9px] leading-4 text-slate-500 dark:text-slate-400">
                    <p>
                      <strong>Move:</strong>{" "}
                      drag a node by its top bar.
                    </p>
                    <p>
                      <strong>Connect:</strong>{" "}
                      select a source and press Connect, then click any highlighted node in a later tier. Ports remain available as a shortcut.
                    </p>
                    <p>
                      <strong>Edit flow:</strong>{" "}
                      click directly on a connection line.
                    </p>
                    <p>
                      <strong>Tiers:</strong>{" "}
                      use Tier 1, Tier 2, Tier 3 and more as separate process stages. Auto Layout keeps every tier in its own column.
                    </p>
                  </div>
                </section>
              )}

            <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-[#2C3C61] dark:bg-[#111B34]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                  Quick Navigator
                </p>

                <span className="text-[8px] text-slate-400">
                  {configuredLinks.length} mapped · {derivedLinks.length} derived
                </span>
              </div>

              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                {safeNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      if (connectFrom && node.id !== connectFrom) {
                        handleNodeCanvasClick(node.id);
                        return;
                      }

                      setSelectedNodeId(node.id);
                      setSelectedLinkId(null);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[9px] transition ${
                      selectedNodeId ===
                      node.id
                        ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#17233F]"
                    }`}
                  >
                    <span className="truncate">
                      {node.name}
                    </span>

                    <span className="shrink-0 text-[8px] text-slate-400">
                      T{normalizeTier(node.tier, 1)} · {getNodeRole(
                        node.id,
                        incomingCounts,
                        outgoingCounts
                      )}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={addDefaultLink}
                disabled={
                  safeNodes.length < 2 ||
                  safeLinks.length >=
                    MAX_SANKEY_LINKS
                }
                className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-[9px] font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200"
              >
                <Plus size={12} />
                Add Flow Using Dropdowns
              </button>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

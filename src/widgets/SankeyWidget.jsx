import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";

import { useId, useRef } from "react";
import {
  TECH_SURFACE_CLASS,
  useWidgetSize,
} from "./widgetTech";

const NODE_COLORS = [
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

const MAX_SANKEY_TIERS = 10;

const PREVIEW_VALUES = [
  44.1,
  33,
  31.2,
  28.5,
  22.8,
  18.6,
  16.4,
  14.8,
  12.6,
  10.9,
  9.4,
  8.2,
];

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

const normalizeTier = (value, fallback = 1) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(
    1,
    Math.min(
      MAX_SANKEY_TIERS,
      Math.round(numeric)
    )
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

const mixHex = (hex, target, amount) => {
  const source = normalizeHexColor(hex);
  const destination = normalizeHexColor(target);

  const parse = (value) => ({
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  });

  const a = parse(source);
  const b = parse(destination);

  const channel = (start, end) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(a.r, b.r)}${channel(
    a.g,
    b.g
  )}${channel(a.b, b.b)}`;
};

const getColorSet = (color) => {
  const base = normalizeHexColor(color);

  return {
    start: mixHex(base, "#ffffff", 0.58),
    middle: mixHex(base, "#ffffff", 0.28),
    end: base,
    text: mixHex(base, "#000000", 0.28),
  };
};

const normalizeDataSource = (source = {}) => ({
  bucket: source.bucket || "Mill",
  measurement: source.measurement || "PBLR",
  tagKey: source.tagKey || "id",
  tagValue:
    source.tagValue || source.id || "",
  id: source.id || source.tagValue || "",
  channel: source.channel || "",
});

const getNodeId = (value, nodes) => {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    nodes[value]
  ) {
    return nodes[value].id;
  }

  const text = String(value ?? "").trim();

  if (!text) return "";

  if (nodes.some((node) => node.id === text)) {
    return text;
  }

  return "";
};

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

  [...links, candidate].forEach((link) => {
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

    adjacency.get(link.source).push(link.target);
  });

  const stack = [candidate.target];
  const visited = new Set();

  while (stack.length) {
    const current = stack.pop();

    if (current === candidate.source) {
      return true;
    }

    if (visited.has(current)) continue;
    visited.add(current);

    (adjacency.get(current) || []).forEach(
      (next) => stack.push(next)
    );
  }

  return false;
};

const inferNodeTiers = (nodes, links) => {
  const tierById = new Map(
    nodes.map((node) => [
      node.id,
      normalizeTier(node.tier, 1),
    ])
  );

  const indegree = new Map(
    nodes.map((node) => [node.id, 0])
  );

  const adjacency = new Map(
    nodes.map((node) => [node.id, []])
  );

  links.forEach((link) => {
    if (
      !indegree.has(link.source) ||
      !indegree.has(link.target)
    ) {
      return;
    }

    indegree.set(
      link.target,
      (indegree.get(link.target) || 0) + 1
    );

    adjacency
      .get(link.source)
      .push(link.target);
  });

  const remaining = new Map(indegree);
  const queue = nodes
    .filter(
      (node) =>
        (remaining.get(node.id) || 0) === 0
    )
    .map((node) => node.id);

  if (!queue.length && nodes[0]) {
    queue.push(nodes[0].id);
  }

  const visited = new Set();

  while (queue.length) {
    const sourceId = queue.shift();

    if (visited.has(sourceId)) continue;
    visited.add(sourceId);

    const sourceTier = normalizeTier(
      tierById.get(sourceId),
      1
    );

    (adjacency.get(sourceId) || []).forEach(
      (targetId) => {
        tierById.set(
          targetId,
          normalizeTier(
            Math.max(
              tierById.get(targetId) || 1,
              sourceTier + 1
            ),
            sourceTier + 1
          )
        );

        remaining.set(
          targetId,
          (remaining.get(targetId) || 0) - 1
        );

        if (
          (remaining.get(targetId) || 0) <= 0
        ) {
          queue.push(targetId);
        }
      }
    );
  }

  return tierById;
};

const normalizeGraphConfig = (config = {}) => {
  const sourceNodes = Array.isArray(config.nodes)
    ? config.nodes
    : [];

  const nodes = sourceNodes.map((node, index) => ({
    id:
      String(node?.id || "").trim() ||
      `node-${index + 1}`,
    name:
      String(node?.name || node?.label || "").trim() ||
      `Node ${index + 1}`,
    color: normalizeHexColor(
      node?.color,
      NODE_COLORS[index % NODE_COLORS.length]
    ),
    tier: normalizeTier(node?.tier, 1),
    dataKey:
      String(
        node?.dataKey || ""
      ).trim(),
    dataSource:
      normalizeDataSource(
        node?.dataSource || {}
      ),
  }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawLinks = Array.isArray(config.links)
    ? config.links
    : [];

  const links = [];

  rawLinks.forEach((link, index) => {
    const source = getNodeId(link?.source, nodes);
    const target = getNodeId(link?.target, nodes);

    if (
      !source ||
      !target ||
      source === target ||
      !nodeIds.has(source) ||
      !nodeIds.has(target)
    ) {
      return;
    }

    const normalized = {
      id:
        String(link?.id || "").trim() ||
        `link-${index + 1}`,
      source,
      target,
      label:
        String(link?.label || "").trim() || "",
      color: normalizeHexColor(
        link?.color,
        NODE_COLORS[(index + 1) % NODE_COLORS.length]
      ),
      dataKey: link?.dataKey || "",
      dataSource: normalizeDataSource({
        ...(link?.dataSource || {}),
        channel:
          link?.dataSource?.channel ||
          link?.channel ||
          link?.dataKey ||
          "",
      }),
    };

    // Recharts Sankey expects an acyclic graph. If an old saved graph
    // contains a cycle, skip only the offending link instead of breaking
    // the whole widget.
    if (createsCycle(links, normalized)) {
      return;
    }

    links.push(normalized);
  });

  const flowStyle =
    config.flowStyle === "continuous"
      ? "continuous"
      : "separated";

  const flowGap = Math.max(
    0,
    Math.min(
      18,
      Number(config.flowGap ?? 4) || 0
    )
  );

  const tierById = inferNodeTiers(nodes, links);

  const tieredNodes = nodes.map((node) => ({
    ...node,
    tier: normalizeTier(
      tierById.get(node.id),
      node.tier || 1
    ),
  }));

  const highestNodeTier = Math.max(
    1,
    ...tieredNodes.map((node) => node.tier || 1)
  );

  const tierCount = normalizeTier(
    Math.max(
      Number(config.tierCount) || 0,
      highestNodeTier
    ),
    highestNodeTier
  );

  return {
    unit: String(config.unit || "psi").trim() || "psi",
    flowStyle,
    flowGap,
    tierCount,
    nodes: tieredNodes,
    links,
  };
};

const convertLegacyOutputs = (config = {}) => {
  const sourceNode = {
    id: "source",
    name:
      String(config.sourceName || "").trim() ||
      "Boiler A",
    color: normalizeHexColor(
      config.sourceColor,
      "#58D7FF"
    ),
    tier: 1,
  };

  const outputs = Array.isArray(config.outputs)
    ? config.outputs
    : [];

  const nodes = [sourceNode];
  const links = [];

  outputs.forEach((output, index) => {
    const outputId =
      String(output?.id || "").trim() ||
      `output-${index + 1}`;

    const nodeId = `node-${outputId}`;
    const color = normalizeHexColor(
      output?.color,
      NODE_COLORS[(index + 1) % NODE_COLORS.length]
    );

    nodes.push({
      id: nodeId,
      name:
        String(output?.name || "").trim() ||
        `Sterilizer ${index + 1}`,
      color,
      tier: 2,
    });

    links.push({
      // Keep the old output id as the new link id so existing runtime
      // values and saved templates continue to work after migration.
      id: outputId,
      source: sourceNode.id,
      target: nodeId,
      label:
        String(output?.name || "").trim() ||
        `Sterilizer ${index + 1}`,
      color,
      dataKey: output?.dataKey || "",
      dataSource: normalizeDataSource(
        output?.dataSource || {}
      ),
    });
  });

  return {
    unit: String(config.unit || "psi").trim() || "psi",
    tierCount: 2,
    nodes,
    links,
  };
};

export const defaultSankeyConfig = {
  unit: "psi",
  // separated keeps a visible gap between adjacent Sankey ribbons.
  // continuous restores the traditional touching-ribbon appearance.
  flowStyle: "continuous",
  flowGap: 4,
  tierCount: 2,
  nodes: [
    {
      id: "source",
      name: "Boiler A",
      color: "#58D7FF",
      tier: 1,
    },
    {
      id: "node-1",
      name: "Sterilizer 1",
      color: "#7D75E7",
      tier: 2,
    },
    {
      id: "node-2",
      name: "Sterilizer 2",
      color: "#A86BDF",
      tier: 2,
    },
    {
      id: "node-3",
      name: "Sterilizer 3",
      color: "#FF6F88",
      tier: 2,
    },
  ],
  links: [
    {
      id: "link-1",
      source: "source",
      target: "node-1",
      label: "",
      color: "#7D75E7",
      dataKey: "",
      dataSource: normalizeDataSource({
        channel: "ch2",
      }),
    },
    {
      id: "link-2",
      source: "source",
      target: "node-2",
      label: "",
      color: "#A86BDF",
      dataKey: "",
      dataSource: normalizeDataSource({
        channel: "ch2",
      }),
    },
    {
      id: "link-3",
      source: "source",
      target: "node-3",
      label: "",
      color: "#FF6F88",
      dataKey: "",
      dataSource: normalizeDataSource({
        channel: "ch2",
      }),
    },
  ],
};

export const normalizeSankeyConfig = (
  config = defaultSankeyConfig
) => {
  let graph;

  if (
    Array.isArray(config?.nodes) &&
    config.nodes.length >= 2 &&
    Array.isArray(config?.links)
  ) {
    graph = normalizeGraphConfig(config);
  } else if (Array.isArray(config?.outputs)) {
    graph = normalizeGraphConfig(
      convertLegacyOutputs(config)
    );
  } else {
    graph = normalizeGraphConfig(
      defaultSankeyConfig
    );
  }

  if (graph.nodes.length < 2) {
    graph = normalizeGraphConfig(
      defaultSankeyConfig
    );
  }

  // Compatibility fields are intentionally returned as well. Older parts
  // of the app can still read sourceName/sourceColor while the new editor
  // and widget use nodes + links.
  const incoming = new Set(
    graph.links.map((link) => link.target)
  );
  const rootNode =
    graph.nodes.find(
      (node) => !incoming.has(node.id)
    ) || graph.nodes[0];

  return {
    ...graph,
    sourceName: rootNode?.name || "Source",
    sourceColor:
      rootNode?.color || "#58D7FF",
  };
};

export const getSankeyDataKeys = (config) => {
  const normalized =
    normalizeSankeyConfig(config);

  return [
    ...new Set(
      [
        ...normalized.nodes.map(
          (node) =>
            node.dataKey ||
            node.dataSource?.field ||
            node.dataSource?.channel ||
            ""
        ),
        ...normalized.links.map(
          (link) =>
            link.dataKey ||
            link.dataSource?.field ||
            link.dataSource?.channel ||
            ""
        ),
      ].filter(Boolean)
    ),
  ];
};

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(
    Number.isInteger(number) ? 0 : 1
  );
};

const getRuntimeValue = (item, link) => {
  const payload =
    item?.sankeyRuntimeValues?.[link.id];
  const numeric = Number(payload?.value);

  return {
    value: Number.isFinite(numeric)
      ? numeric
      : null,
    timestamp: payload?.timestamp || null,
    error: payload?.error || null,
  };
};

function CustomNode({
  x,
  y,
  width,
  height,
  index,
  payload,
}) {
  if (payload?.synthetic) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(4, Number(height) || 0)}
        fill={normalizeHexColor(payload?.color)}
      />
    );
  }

  const color = normalizeHexColor(
    payload?.color,
    NODE_COLORS[index % NODE_COLORS.length]
  );

  const compact = Boolean(payload?.compact);
  const role = payload?.role || "intermediate";

  // Keep very small valid flows visible. Recharts can otherwise render
  // low-value terminal nodes as an almost invisible hairline.
  const minimumNodeHeight = compact ? 6 : 8;
  const visibleHeight = Math.max(minimumNodeHeight, Number(height) || 0);
  const visibleY = y - (visibleHeight - height) / 2;

  // Keep labels OUTSIDE the main flow whenever possible.
  // Root labels sit left of the source node, terminal labels sit right of
  // the destination node, and intermediate labels sit just above the node.
  let textX = x + width / 2;
  let textY = y - (compact ? 7 : 10);
  let textAnchor = "middle";

  if (role === "root") {
    textX = x - (compact ? 8 : 12);
    textY = visibleY + visibleHeight / 2;
    textAnchor = "end";
  } else if (role === "terminal") {
    textX = x + width + (compact ? 8 : 12);
    textY = visibleY + visibleHeight / 2;
    textAnchor = "start";
  }

  return (
    <g>
      <title>{payload?.name}</title>
      <rect
        x={x}
        y={visibleY}
        width={width}
        height={visibleHeight}
        rx={1.5}
        fill={color}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={1.25}
      />

      <text
        x={textX}
        y={textY}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        className="sankey-node-label"
        fontSize={compact ? 8.5 : 10.5}
        fontWeight={800}
        paintOrder="stroke"
        strokeWidth={compact ? 2.5 : 3.5}
        strokeLinejoin="round"
      >
        {String(payload?.name || "").length > (payload?.labelLimit || 22)
          ? `${String(payload.name).slice(0, (payload.labelLimit || 22) - 1)}…`
          : payload?.name}
      </text>
    </g>
  );
}

function CustomLink({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
  index,
  gradientPrefix,
}) {
  const colorSet = getColorSet(
    payload?.color ||
      NODE_COLORS[(index + 1) % NODE_COLORS.length]
  );

  const gradientId =
    `${gradientPrefix}-link-${index}`;

  // Preserve the real Sankey proportions for layout, but enforce a
  // minimum rendered width so low-value flows remain visible.
  const minimumVisibleFlow = payload?.compact ? 4 : 6;
  const allocatedLinkWidth = Math.max(
    minimumVisibleFlow,
    Number(linkWidth) || 0
  );

  const separated =
    payload?.flowStyle !== "continuous";

  const requestedGap = Math.max(
    0,
    Math.min(
      18,
      Number(payload?.flowGap ?? 7) || 0
    )
  );

  // Recharts allocates adjacent links edge-to-edge. Rendering each stroke
  // slightly thinner than its allocated width leaves real background
  // between branches without changing the underlying Sankey proportions.
  const effectiveGap = separated
    ? Math.min(
        requestedGap,
        Math.min(3, allocatedLinkWidth * 0.12)
      )
    : 0;

  const safeLinkWidth = Math.max(
    payload?.compact ? 3.5 : 5,
    allocatedLinkWidth - effectiveGap
  );

  const path = `
    M${sourceX},${sourceY}
    C${sourceControlX},${sourceY}
     ${targetControlX},${targetY}
     ${targetX},${targetY}
  `;

  const showValueBadge =
    !payload?.hideValueLabels &&
    safeLinkWidth >= (payload?.compact ? 7 : 9);

  // Put the value slightly toward the target rather than dead-center, where
  // multiple flows tend to cross and labels become difficult to scan.
  // Calculate the point on the same cubic Bezier curve used by the link.
  const valueT = 0.62;
  const inverseT = 1 - valueT;
  const valueX =
    inverseT ** 3 * sourceX +
    3 * inverseT ** 2 * valueT * sourceControlX +
    3 * inverseT * valueT ** 2 * targetControlX +
    valueT ** 3 * targetX;
  const valueY =
    inverseT ** 3 * sourceY +
    3 * inverseT ** 2 * valueT * sourceY +
    3 * inverseT * valueT ** 2 * targetY +
    valueT ** 3 * targetY;
  const displayText = String(payload?.displayValue || "");
  const valueBadgeWidth = Math.max(
    42,
    displayText.length * (payload?.compact ? 4.8 : 5.6) + 12
  );
  const valueBadgeHeight = payload?.compact ? 16 : 19;

  return (
    <g
      className="sankey-link-group"
      style={{
        animation:
          "sankeyLinkFade 420ms ease-out both",
        animationDelay: `${index * 55}ms`,
      }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop
            offset="0%"
            stopColor={colorSet.start}
            stopOpacity="0.48"
          />
          <stop
            offset="55%"
            stopColor={colorSet.middle}
            stopOpacity="0.58"
          />
          <stop
            offset="100%"
            stopColor={colorSet.end}
            stopOpacity="0.7"
          />
        </linearGradient>
      </defs>

      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={safeLinkWidth}
        strokeLinecap="butt"
        className="sankey-link-path"
      />

      {safeLinkWidth >= 24 && (
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={Math.max(
            1,
            safeLinkWidth * 0.045
          )}
          pointerEvents="none"
        />
      )}

      {showValueBadge && (
        <g
          transform={`translate(${valueX}, ${valueY})`}
          pointerEvents="none"
        >
          <rect
            x={-valueBadgeWidth / 2}
            y={-valueBadgeHeight / 2}
            width={valueBadgeWidth}
            height={valueBadgeHeight}
            rx={6}
            className="sankey-value-badge"
          />

          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            className="sankey-value-label"
            fontSize={payload?.compact ? 7.5 : 9}
            fontWeight={800}
          >
            {displayText}
          </text>
        </g>
      )}
    </g>
  );
}

export default function SankeyWidget({
  data = {},
  item = {},
}) {
  const generatedId = useId();
  const rootRef = useRef(null);
  const size = useWidgetSize(rootRef);
  const chartWidth = size.width || 480;
  const short = size.height > 0 && size.height < 280;
  const narrow = chartWidth < 480;
  const gradientPrefix =
    `sankey-${generatedId.replace(/:/g, "")}`;

  const config = normalizeSankeyConfig(
    item?.sankeyConfig || defaultSankeyConfig
  );

  const isPreview = Boolean(
    item?.previewMode || item?.isBuilderPreview
  );

  const outgoingByNode = new Map();
  const incomingByNode = new Map();

  config.nodes.forEach((node) => {
    outgoingByNode.set(node.id, []);
    incomingByNode.set(node.id, []);
  });

  config.links.forEach((link) => {
    outgoingByNode.get(link.source)?.push(link);
    incomingByNode.get(link.target)?.push(link);
  });

  const directInfoByLink = new Map();

  config.links.forEach((link, index) => {
    const runtime = getRuntimeValue(item, link);
    const dataKey =
      link.dataKey || link.dataSource?.channel;
    const dataValue = Number(
      dataKey ? data?.[dataKey] : undefined
    );

    const directValue = Number.isFinite(
      runtime.value
    )
      ? runtime.value
      : Number.isFinite(dataValue)
      ? dataValue
      : null;

    directInfoByLink.set(link.id, {
      ...runtime,
      directValue,
      isActual: Number.isFinite(runtime.value),
      isData:
        !Number.isFinite(runtime.value) &&
        Number.isFinite(dataValue),
      previewFallback:
        isPreview &&
        (outgoingByNode.get(link.target) || [])
          .length === 0
          ? PREVIEW_VALUES[
              index % PREVIEW_VALUES.length
            ]
          : null,
    });
  });

  const resolvedCache = new Map();

  const resolveLink = (link, stack = new Set()) => {
    if (resolvedCache.has(link.id)) {
      return resolvedCache.get(link.id);
    }

    if (stack.has(link.id)) {
      return {
        value: 0,
        derived: false,
      };
    }

    const nextStack = new Set(stack);
    nextStack.add(link.id);

    const direct = directInfoByLink.get(link.id);

    if (Number.isFinite(direct?.directValue)) {
      const result = {
        value: Math.max(0, direct.directValue),
        derived: false,
        isActual: direct.isActual,
        isData: direct.isData,
        timestamp: direct.timestamp,
        error: direct.error,
      };

      resolvedCache.set(link.id, result);
      return result;
    }

    const childLinks =
      outgoingByNode.get(link.target) || [];
    const targetIncomingCount =
      (incomingByNode.get(link.target) || []).length;

    // Automatic derivation is unambiguous when this is the only incoming
    // flow to the target node. If a node merges multiple incoming flows,
    // each incoming link should be mapped explicitly because the outgoing
    // total cannot tell us how much came from each parent.
    if (
      childLinks.length > 0 &&
      targetIncomingCount === 1
    ) {
      const children = childLinks.map((child) =>
        resolveLink(child, nextStack)
      );
      const sum = children.reduce(
        (total, child) =>
          total + Number(child.value || 0),
        0
      );

      if (sum > 0) {
        const result = {
          value: sum,
          derived: true,
          isActual: false,
          isData: false,
          timestamp: null,
          error: null,
        };

        resolvedCache.set(link.id, result);
        return result;
      }
    }

    if (Number.isFinite(direct?.previewFallback)) {
      const result = {
        value: Math.max(
          0,
          direct.previewFallback
        ),
        derived: false,
        isActual: false,
        isData: false,
        isPreviewOnly: true,
        timestamp: null,
        error: null,
      };

      resolvedCache.set(link.id, result);
      return result;
    }

    const result = {
      value: 0,
      derived: false,
      isActual: false,
      isData: false,
      timestamp: direct?.timestamp || null,
      error: direct?.error || null,
    };

    resolvedCache.set(link.id, result);
    return result;
  };

  const evaluatedLinks = config.links.map(
    (link) => ({
      ...link,
      ...resolveLink(link),
    })
  );

  const visibleLinks = evaluatedLinks.filter(
    (link) => link.value > 0
  );

  const visibleNodeIds = new Set();
  visibleLinks.forEach((link) => {
    visibleNodeIds.add(link.source);
    visibleNodeIds.add(link.target);
  });

  const visibleNodes = config.nodes.filter(
    (node) => visibleNodeIds.has(node.id)
  );

  const visibleNodeMap = new Map(
    visibleNodes.map((node) => [node.id, node])
  );

  // Recharts calculates columns from graph depth. To preserve an explicit
  // Tier 1 / Tier 2 / Tier 3 structure even when a flow skips a tier, split
  // that flow through invisible spacer nodes. The user still sees one flow;
  // the spacers only guide the layout engine.
  const expandedNodes = visibleNodes.map((node) => ({
    ...node,
    synthetic: false,
  }));

  const expandedLinks = [];

  visibleLinks.forEach((link) => {
    const sourceNode = visibleNodeMap.get(link.source);
    const targetNode = visibleNodeMap.get(link.target);

    const sourceTier = normalizeTier(sourceNode?.tier, 1);
    const targetTier = Math.max(
      sourceTier + 1,
      normalizeTier(targetNode?.tier, sourceTier + 1)
    );

    let previousId = link.source;

    for (
      let tier = sourceTier + 1;
      tier < targetTier;
      tier += 1
    ) {
      const spacerId = `__tier-spacer-${link.id}-${tier}`;

      expandedNodes.push({
        id: spacerId,
        name: "",
        color: link.color,
        tier,
        synthetic: true,
      });

      expandedLinks.push({
        ...link,
        id: `${link.id}-segment-${tier}`,
        source: previousId,
        target: spacerId,
        syntheticSegment: true,
        hideValueLabels: true,
      });

      previousId = spacerId;
    }

    expandedLinks.push({
      ...link,
      id: `${link.id}-segment-final`,
      source: previousId,
      target: link.target,
      syntheticSegment: previousId !== link.source,
    });
  });

  const indexByNodeId = new Map(
    expandedNodes.map((node, index) => [
      node.id,
      index,
    ])
  );

  const actualLinkCount = visibleLinks.filter(
    (link) => link.isActual
  ).length;
  const derivedLinkCount = visibleLinks.filter(
    (link) => link.derived
  ).length;
  const previewLinkCount = visibleLinks.filter(
    (link) => link.isPreviewOnly
  ).length;

  const rootNodeIds = config.nodes
    .filter(
      (node) =>
        (incomingByNode.get(node.id) || [])
          .length === 0
    )
    .map((node) => node.id);

  const rootNodeValues =
    rootNodeIds
      .map((nodeId) => {
        const node =
          config.nodes.find(
            (candidate) =>
              candidate.id === nodeId
          );

        const dataKey =
          node?.dataKey ||
          node?.dataSource?.field ||
          node?.dataSource?.channel ||
          "";

        const numeric =
          Number(
            dataKey
              ? data?.[dataKey]
              : undefined
          );

        return Number.isFinite(
          numeric
        )
          ? Math.max(0, numeric)
          : null;
      })
      .filter(
        (value) =>
          Number.isFinite(value)
      );

  const derivedRootTotal =
    visibleLinks
      .filter((link) =>
        rootNodeIds.includes(
          link.source
        )
      )
      .reduce(
        (sum, link) =>
          sum +
          Number(
            link.value || 0
          ),
        0
      );

  const totalValue =
    rootNodeValues.length
      ? rootNodeValues.reduce(
          (sum, value) =>
            sum + value,
          0
        )
      : derivedRootTotal;

  const rootValueIsMapped =
    rootNodeValues.length > 0;

  const nodeCount = visibleNodes.length;
  const renderedNodeCount = expandedNodes.length;
  const linkCount = visibleLinks.length;
  const compact =
    narrow || short || nodeCount > 10 || linkCount > 12;
  const sideMargin = Math.max(38, Math.min(108, chartWidth * .17));
  const labelLimit = Math.max(5, Math.floor((sideMargin - 16) / (compact ? 5.2 : 6.2)));

  const nodes = expandedNodes.map((node) => {
    if (node.synthetic) {
      return {
        ...node,
        role: "intermediate",
        compact,
      };
    }

    const incomingCount = (
      incomingByNode.get(node.id) || []
    ).length;
    const outgoingCount = (
      outgoingByNode.get(node.id) || []
    ).length;

    const role =
      incomingCount === 0
        ? "root"
        : outgoingCount === 0
        ? "terminal"
        : "intermediate";

    return {
      ...node,
      role,
      compact,
      labelLimit,
    };
  });

  const links = expandedLinks
    .map((link) => ({
      ...link,
      source: indexByNodeId.get(link.source),
      target: indexByNodeId.get(link.target),
      value: link.value,
      compact,
      flowStyle: config.flowStyle || "separated",
      flowGap: Number(config.flowGap ?? 7),
      hideValueLabels:
        Boolean(link.hideValueLabels) ||
        (compact && chartWidth < 340) ||
        linkCount > 9,
      displayValue: `${formatNumber(
        link.value
      )} ${config.unit || ""}`.trim(),
    }))
    .filter(
      (link) =>
        Number.isInteger(link.source) &&
        Number.isInteger(link.target)
    );

  const tierSizes = new Map();
  expandedNodes.forEach((node) => tierSizes.set(node.tier, (tierSizes.get(node.tier) || 0) + 1));
  const rows = Math.max(1, ...tierSizes.values());
  const availableHeight = Math.max(70, (size.height || 320) - (short ? 60 : 86));
  const baseNodePadding = Math.max(6, Math.min(short ? 12 : 28, availableHeight / (rows * 5)));

  const dynamicNodePadding =
    config.flowStyle === "continuous"
      ? baseNodePadding
      : baseNodePadding +
        Math.min(
          10,
          Math.max(0, Number(config.flowGap ?? 7))
        );

  const dynamicMargin = {
    top: compact ? 18 : 26,
    right: sideMargin,
    bottom: 12,
    left: sideMargin,
  };

  const dynamicIterations = Math.min(
    140,
    70 + linkCount * 2 + renderedNodeCount
  );

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} sankey-widget flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3`}
    >
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <style>{`
          @keyframes sankeyLinkFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .sankey-widget .sankey-node-label {
            fill: #334155;
            stroke: rgba(248, 250, 252, 0.88);
          }

          .dark .sankey-widget .sankey-node-label {
            fill: #E8EDFF;
            stroke: #111B34;
          }

          .sankey-widget .sankey-value-badge {
            fill: rgba(255, 255, 255, 0.96);
            stroke: rgba(100, 116, 139, 0.24);
            stroke-width: 1;
          }

          .sankey-widget .sankey-value-label {
            fill: #334155;
          }

          .dark .sankey-widget .sankey-value-badge {
            fill: rgba(11, 19, 40, 0.96);
            stroke: rgba(88, 215, 255, 0.22);
          }

          .dark .sankey-widget .sankey-value-label {
            fill: #DDE7FF;
          }

          .sankey-widget .sankey-link-path {
            transition: opacity 160ms ease, filter 160ms ease;
          }

          .sankey-widget .sankey-link-group:hover .sankey-link-path {
            opacity: 0.92;
            filter: saturate(1.08) brightness(1.04);
          }

          @media (prefers-reduced-motion: reduce) {
            .sankey-widget g {
              animation: none !important;
            }
          }
        `}</style>

        <div className="mb-1.5 flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/70 pb-2 pr-8 dark:border-slate-700/70">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-black text-slate-900 dark:text-white" title={item.label || config.sourceName}>
              {item.label || config.sourceName || "Flow"}
            </h3>
            {!short && (
              <p className="mt-0.5 truncate text-[9px] text-slate-500">
                {actualLinkCount > 0 ? "Live" : previewLinkCount > 0 ? "Preview" : derivedLinkCount > 0 ? "Derived" : "No data"}
                {" · "}{nodeCount} nodes{" · "}{linkCount} flows
              </p>
            )}
          </div>
          <div className="min-w-0 max-w-[48%] text-right" title={rootValueIsMapped ? "Root reading" : "Root flow"}>
            <div className="truncate text-[13px] font-black tabular-nums text-cyan-700 dark:text-cyan-300">
              {formatNumber(totalValue)} <span className="text-[10px] font-medium">{config.unit}</span>
            </div>
            {!short && <div className="text-[9px] text-slate-400">{rootValueIsMapped ? "Root reading" : "Root flow"}</div>}
          </div>
        </div>

        {links.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-transparent text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No valid Sankey flow links configured
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent" data-sankey-chart>
            <div style={{ height: "100%", minHeight: rows * 20 + 30 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={70}
            >
              <Sankey
                data={{ nodes, links }}
                nodeWidth={compact ? 9 : 12}
                nodePadding={dynamicNodePadding}
                linkCurvature={0.5}
                iterations={dynamicIterations}
                node={<CustomNode />}
                link={
                  <CustomLink
                    gradientPrefix={gradientPrefix}
                  />
                }
                margin={dynamicMargin}
              >
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border:
                      "1px solid rgba(148,163,184,0.28)",
                    background:
                      "rgba(15,23,42,0.96)",
                    color: "#f8fafc",
                    boxShadow:
                      "0 18px 40px rgba(15,23,42,0.24)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  itemStyle={{
                    color: "#f8fafc",
                  }}
                  formatter={(value) => [
                    `${formatNumber(value)} ${
                      config.unit || ""
                    }`.trim(),
                    "Flow",
                  ]}
                />
              </Sankey>
            </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

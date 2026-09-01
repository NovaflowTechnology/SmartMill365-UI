export const PROCESS_TOPOLOGY_PREFIX =
  "palm-oil-process-simulator:";

export const PROCESS_TOPOLOGY_LATEST_KEY =
  `${PROCESS_TOPOLOGY_PREFIX}last-saved`;

export const PROCESS_TOPOLOGY_SAVED_EVENT =
  "palm-oil-process-topology-saved";

const normalizeTemplateId = (templateId) => {
  if (
    templateId === null ||
    templateId === undefined ||
    templateId === ""
  ) {
    return "standalone";
  }

  return String(templateId);
};

export const getProcessTopologyKey = (templateId) =>
  `${PROCESS_TOPOLOGY_PREFIX}${normalizeTemplateId(
    templateId
  )}`;

const parseTopology = (raw, storageKey = "") => {
  if (!raw) return null;

  try {
    const parsed =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw;

    if (
      !parsed ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.connections)
    ) {
      return null;
    }

    return {
      ...parsed,
      nodes: parsed.nodes,
      connections: parsed.connections,
      mode:
        ["live", "hybrid", "fake"].includes(
          parsed.mode
        )
          ? parsed.mode
          : "hybrid",
      storageKey:
        parsed.storageKey ||
        parsed.sourceKey ||
        storageKey,
      savedAt:
        parsed.savedAt || null,
    };
  } catch {
    return null;
  }
};

export const readExactProcessTopology = (
  templateId
) => {
  if (typeof window === "undefined") {
    return {
      topology: null,
      storageKey: getProcessTopologyKey(
        templateId
      ),
    };
  }

  const storageKey =
    getProcessTopologyKey(templateId);

  return {
    topology: parseTopology(
      window.localStorage.getItem(
        storageKey
      ),
      storageKey
    ),
    storageKey,
  };
};

const getAllSavedTopologyCandidates = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const candidates = [];

  for (
    let index = 0;
    index < window.localStorage.length;
    index += 1
  ) {
    const key =
      window.localStorage.key(index);

    if (
      !key ||
      !key.startsWith(
        PROCESS_TOPOLOGY_PREFIX
      )
    ) {
      continue;
    }

    const topology = parseTopology(
      window.localStorage.getItem(key),
      key
    );

    if (!topology) continue;

    candidates.push({
      topology,
      storageKey: key,
      savedTime:
        topology.savedAt &&
        !Number.isNaN(
          new Date(
            topology.savedAt
          ).getTime()
        )
          ? new Date(
              topology.savedAt
            ).getTime()
          : 0,
    });
  }

  return candidates.sort(
    (left, right) =>
      right.savedTime - left.savedTime
  );
};

export const readProcessTopology = (
  templateId
) => {
  if (typeof window === "undefined") {
    return {
      topology: null,
      storageKey: "",
    };
  }

  const preferredKey =
    getProcessTopologyKey(templateId);

  const stableKeys = Array.from(
    new Set([
      preferredKey,
      PROCESS_TOPOLOGY_LATEST_KEY,
      getProcessTopologyKey(null),
    ])
  );

  for (const key of stableKeys) {
    const topology = parseTopology(
      window.localStorage.getItem(key),
      key
    );

    if (topology) {
      return {
        topology,
        storageKey: key,
      };
    }
  }

  // Compatibility fallback:
  // Search every older palm-oil-process-simulator:* record.
  // This prevents old saved layouts becoming invisible when the
  // simulator was opened before a template ID existed.
  const fallback =
    getAllSavedTopologyCandidates()[0];

  if (fallback) {
    return {
      topology: fallback.topology,
      storageKey: fallback.storageKey,
    };
  }

  return {
    topology: null,
    storageKey: preferredKey,
  };
};

export const saveProcessTopology = ({
  templateId = null,
  nodes = [],
  connections = [],
  mode = "hybrid",
}) => {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey =
    getProcessTopologyKey(templateId);

  const payload = {
    nodes: Array.isArray(nodes)
      ? nodes
      : [],
    connections:
      Array.isArray(connections)
        ? connections
        : [],
    mode:
      ["live", "hybrid", "fake"].includes(
        mode
      )
        ? mode
        : "hybrid",
    templateId:
      templateId ?? null,
    savedAt: new Date().toISOString(),
    storageKey,
  };

  const serialized =
    JSON.stringify(payload);

  // Exact/standalone key.
  window.localStorage.setItem(
    storageKey,
    serialized
  );

  // Stable alias used by Widget Studio and Dashboard.
  window.localStorage.setItem(
    PROCESS_TOPOLOGY_LATEST_KEY,
    serialized
  );

  // Same-tab updates do not fire the native storage event.
  window.dispatchEvent(
    new CustomEvent(
      PROCESS_TOPOLOGY_SAVED_EVENT,
      {
        detail: {
          templateId:
            templateId ?? null,
          storageKey,
          savedAt: payload.savedAt,
        },
      }
    )
  );

  return payload;
};

export const subscribeProcessTopology = (
  callback
) => {
  if (
    typeof window === "undefined" ||
    typeof callback !== "function"
  ) {
    return () => {};
  }

  const handleStorage = (event) => {
    if (
      event.key?.startsWith(
        PROCESS_TOPOLOGY_PREFIX
      )
    ) {
      callback();
    }
  };

  const handleSaved = () =>
    callback();

  window.addEventListener(
    "storage",
    handleStorage
  );

  window.addEventListener(
    PROCESS_TOPOLOGY_SAVED_EVENT,
    handleSaved
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleStorage
    );

    window.removeEventListener(
      PROCESS_TOPOLOGY_SAVED_EVENT,
      handleSaved
    );
  };
};

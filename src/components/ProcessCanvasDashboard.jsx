import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Lock,
  MousePointer2,
  Pin,
  X,
} from "lucide-react";

import WidgetRenderer from "./WidgetRenderer";
import ProcessViewWidget from "../widgets/ProcessViewWidget";
import {
  listProcessFlows,
} from "../process/processFlowApi";

const addDataKey = (target, value) => {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    target.add(value.trim());
  }
};

const collectWidgetDataKeys = (
  item = {}
) => {
  const keys = new Set();

  addDataKey(keys, item?.dataKey);

  (
    Array.isArray(item?.dataKeys)
      ? item.dataKeys
      : []
  ).forEach((key) =>
    addDataKey(keys, key)
  );

  addDataKey(
    keys,
    item?.bigNumberDisplay
      ?.statusDataKey
  );

  (
    Array.isArray(item?.pins)
      ? item.pins
      : []
  ).forEach((pin) =>
    addDataKey(
      keys,
      pin?.dataKey
    )
  );

  const sankeyLinks =
    Array.isArray(
      item?.sankeyConfig?.links
    )
      ? item.sankeyConfig.links
      : Array.isArray(
          item?.sankeyConfig
            ?.outputs
        )
      ? item.sankeyConfig.outputs
      : [];

  sankeyLinks.forEach((link) =>
    addDataKey(
      keys,
      link?.dataKey
    )
  );

  const equipmentConfig =
    item?.processEquipmentConfig ||
    {};

  Object.values(
    equipmentConfig?.bindings ||
      equipmentConfig
        ?.metricBindings ||
      {}
  ).forEach((key) =>
    addDataKey(keys, key)
  );

  (
    Array.isArray(
      equipmentConfig
        ?.customMetrics
    )
      ? equipmentConfig
          .customMetrics
      : []
  ).forEach((metric) =>
    addDataKey(
      keys,
      metric?.dataKey ||
        metric?.key
    )
  );

  const walk = (
    value,
    depth = 0
  ) => {
    if (
      !value ||
      depth > 5
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) =>
        walk(
          entry,
          depth + 1
        )
      );
      return;
    }

    if (
      typeof value !==
      "object"
    ) {
      return;
    }

    Object.entries(value).forEach(
      ([
        property,
        propertyValue,
      ]) => {
        if (
          property === "dataKey" ||
          property ===
            "statusDataKey"
        ) {
          addDataKey(
            keys,
            propertyValue
          );
          return;
        }

        if (
          property === "dataKeys" &&
          Array.isArray(
            propertyValue
          )
        ) {
          propertyValue.forEach(
            (key) =>
              addDataKey(
                keys,
                key
              )
          );
          return;
        }

        if (
          property ===
            "bindings" ||
          property ===
            "metricBindings"
        ) {
          if (
            propertyValue &&
            typeof propertyValue ===
              "object"
          ) {
            Object.values(
              propertyValue
            ).forEach((key) =>
              addDataKey(
                keys,
                key
              )
            );
          }
          return;
        }

        walk(
          propertyValue,
          depth + 1
        );
      }
    );
  };

  walk(
    item?.customLayoutConfig
  );

  return [...keys];
};

const collectNodeDataKeys = (
  node = {}
) => {
  const keys = new Set();

  Object.values(
    node?.bindings || {}
  ).forEach((key) =>
    addDataKey(keys, key)
  );

  Object.values(
    node?.metricBindings || {}
  ).forEach((key) =>
    addDataKey(keys, key)
  );

  (
    Array.isArray(
      node?.customMetrics
    )
      ? node.customMetrics
      : []
  ).forEach((metric) =>
    addDataKey(
      keys,
      metric?.dataKey ||
        metric?.key
    )
  );

  return [...keys];
};

const findWidgetsForNode = (
  node,
  items
) => {
  if (!node) return [];

  const nodeKeys = new Set(
    collectNodeDataKeys(node)
  );

  if (!nodeKeys.size) {
    return [];
  }

  return items.filter(
    (item) => {
      if (
        item?.type ===
        "processView"
      ) {
        return false;
      }

      return collectWidgetDataKeys(
        item
      ).some((key) =>
        nodeKeys.has(key)
      );
    }
  );
};

const getWidgetPreviewClass = (
  item
) => {
  if (
    [
      "line",
      "bar",
      "heatmap",
      "sankey",
      "logs",
    ].includes(item?.type)
  ) {
    return "col-span-2 h-[178px]";
  }

  if (
    item?.type === "customLayout"
  ) {
    return "col-span-2 h-[190px]";
  }

  return "h-[138px]";
};

const clamp = (
  value,
  minimum,
  maximum
) =>
  Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );

export default function ProcessCanvasDashboard({
  template,
  items = [],
  data = {},
  history = [],
  logs = [],
  historyWindow = "15m",
  liveStatus = null,
  sankeyValues = {},
  widgetAppearance = null,
  dark = false,
}) {
  const rootRef = useRef(null);

  const [
    hoveredNode,
    setHoveredNode,
  ] = useState(null);

  const [
    pinnedNode,
    setPinnedNode,
  ] = useState(null);

  const [
    pointerPosition,
    setPointerPosition,
  ] = useState({
    x: 24,
    y: 24,
  });

  const [
    processFlows,
    setProcessFlows,
  ] = useState([]);

  const [
    processFlowsLoading,
    setProcessFlowsLoading,
  ] = useState(true);

  const [
    processFlowsError,
    setProcessFlowsError,
  ] = useState("");

  const [
    resolvedProcessFlowId,
    setResolvedProcessFlowId,
  ] = useState(null);

  const [
    activeProcessFlowId,
    setActiveProcessFlowId,
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    const value = Number(
      window.localStorage.getItem(
        "process-flow-workspace:active-tab"
      ) || 0
    );

    return value || null;
  });

  useEffect(() => {
    const syncActiveFlow = (
      event
    ) => {
      const eventFlowId =
        Number(
          event?.detail
            ?.processFlowId || 0
        ) || null;

      if (eventFlowId) {
        setActiveProcessFlowId(
          eventFlowId
        );
        return;
      }

      const stored = Number(
        window.localStorage.getItem(
          "process-flow-workspace:active-tab"
        ) || 0
      );

      setActiveProcessFlowId(
        stored || null
      );
    };

    const handleStorage = (
      event
    ) => {
      if (
        event.key ===
        "process-flow-workspace:active-tab"
      ) {
        syncActiveFlow();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "process-flow-saved",
      syncActiveFlow
    );

    window.addEventListener(
      "palm-oil-process-topology-saved",
      syncActiveFlow
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "process-flow-saved",
        syncActiveFlow
      );

      window.removeEventListener(
        "palm-oil-process-topology-saved",
        syncActiveFlow
      );
    };
  }, []);

  const explicitProcessItem =
    useMemo(
      () =>
        items.find(
          (item) =>
            item?.type ===
              "processView" &&
            item
              ?.processViewConfig
              ?.processFlowId
        ) ||
        items.find(
          (item) =>
            item?.type ===
            "processView"
        ) ||
        null,
      [items]
    );

  const explicitProcessFlowId =
    Number(
      explicitProcessItem
        ?.processViewConfig
        ?.processFlowId || 0
    ) || null;

  const loadAvailableFlows =
    async () => {
      setProcessFlowsLoading(true);
      setProcessFlowsError("");

      try {
        const response =
          await listProcessFlows();

        const flows =
          Array.isArray(response)
            ? response
            : [];

        setProcessFlows(flows);

        const availableIds =
          new Set(
            flows.map((flow) =>
              Number(flow.id)
            )
          );

        const explicitAvailable =
          explicitProcessFlowId &&
          availableIds.has(
            Number(
              explicitProcessFlowId
            )
          );

        const activeAvailable =
          activeProcessFlowId &&
          availableIds.has(
            Number(
              activeProcessFlowId
            )
          );

        const flowWithTopology =
          flows.find(
            (flow) =>
              Array.isArray(
                flow?.topology
                  ?.nodes
              ) &&
              flow.topology.nodes
                .length > 0
          );

        const fallbackFlow =
          flowWithTopology ||
          flows[0] ||
          null;

        const nextFlowId =
          explicitAvailable
            ? Number(
                explicitProcessFlowId
              )
            : activeAvailable
            ? Number(
                activeProcessFlowId
              )
            : fallbackFlow
            ? Number(
                fallbackFlow.id
              )
            : null;

        setResolvedProcessFlowId(
          nextFlowId
        );
      } catch (error) {
        setProcessFlows([]);
        setResolvedProcessFlowId(
          explicitProcessFlowId ||
            activeProcessFlowId ||
            null
        );

        setProcessFlowsError(
          error?.message ||
            "Unable to load saved process flows"
        );
      } finally {
        setProcessFlowsLoading(false);
      }
    };

  useEffect(() => {
    loadAvailableFlows();
  }, [
    explicitProcessFlowId,
    activeProcessFlowId,
  ]);

  useEffect(() => {
    const refreshFlows = () => {
      loadAvailableFlows();
    };

    window.addEventListener(
      "process-flow-saved",
      refreshFlows
    );

    return () => {
      window.removeEventListener(
        "process-flow-saved",
        refreshFlows
      );
    };
  }, [
    explicitProcessFlowId,
    activeProcessFlowId,
  ]);

  const processItem =
    useMemo(() => {
      const explicitConfig =
        explicitProcessItem
          ?.processViewConfig ||
        {};

      const selectedProcessFlowId =
        resolvedProcessFlowId ||
        explicitConfig
          .processFlowId ||
        activeProcessFlowId ||
        null;

      return {
        ...(explicitProcessItem ||
          {}),
        id:
          explicitProcessItem?.id ||
          "__dashboard_process_canvas__",
        type: "processView",
        label:
          explicitProcessItem
            ?.label ||
          template?.name ||
          template?.template_name ||
          "Process Canvas",
        processViewConfig: {
          ...explicitConfig,
          processFlowId:
            selectedProcessFlowId,
          templateId:
            explicitConfig
              .templateId ??
            template?.id ??
            null,
          mode:
            explicitConfig.mode ||
            "inherit",
          showInspector: false,
        },
      };
    }, [
      explicitProcessItem,
      activeProcessFlowId,
      resolvedProcessFlowId,
      template,
    ]);

  const selectedProcessFlowId =
    processItem
      ?.processViewConfig
      ?.processFlowId ||
    null;

  const activeNode =
    pinnedNode || hoveredNode;

  const relatedWidgets =
    useMemo(
      () =>
        findWidgetsForNode(
          activeNode,
          items
        ),
      [
        activeNode,
        items,
      ]
    );

  const runtimeData =
    useMemo(
      () => ({
        ...data,
        logs,
      }),
      [
        data,
        logs,
      ]
    );

  const runtimeStatus =
    useMemo(
      () => ({
        ...(liveStatus || {}),
        logs,
      }),
      [
        liveStatus,
        logs,
      ]
    );

  const updatePointer =
    (event) => {
      const rect =
        rootRef.current
          ?.getBoundingClientRect();

      if (
        !rect ||
        !event
      ) {
        return;
      }

      setPointerPosition({
        x:
          event.clientX -
          rect.left,
        y:
          event.clientY -
          rect.top,
      });
    };

  const handleNodeHover = (
    node,
    event
  ) => {
    if (pinnedNode) {
      return;
    }

    updatePointer(event);
    setHoveredNode(node);
  };

  const handleNodeMove = (
    node,
    event
  ) => {
    if (pinnedNode) {
      return;
    }

    updatePointer(event);

    setHoveredNode(
      (current) =>
        current?.id ===
        node?.id
          ? current
          : node
    );
  };

  const handleNodeLeave =
    (node) => {
      if (
        pinnedNode ||
        hoveredNode?.id !==
          node?.id
      ) {
        return;
      }

      setHoveredNode(null);
    };

  const handleNodeClick = (
    node,
    event
  ) => {
    updatePointer(event);

    setPinnedNode(
      (current) =>
        current?.id === node?.id
          ? null
          : node
    );

    setHoveredNode(node);
  };

  const closePopup = () => {
    setPinnedNode(null);
    setHoveredNode(null);
  };

  const handleBackgroundClick =
    () => {
      setPinnedNode(null);
      setHoveredNode(null);
    };

  const popupWidth = 470;
  const popupHeight =
    relatedWidgets.length > 2
      ? 390
      : 245;

  const containerRect =
    rootRef.current
      ?.getBoundingClientRect();

  const availableWidth =
    containerRect?.width ||
    1000;

  const availableHeight =
    containerRect?.height ||
    700;

  const popupX = clamp(
    pointerPosition.x + 20,
    12,
    Math.max(
      12,
      availableWidth -
        popupWidth -
        12
    )
  );

  const popupY = clamp(
    pointerPosition.y - 36,
    12,
    Math.max(
      12,
      availableHeight -
        popupHeight -
        12
    )
  );

  if (
    processFlowsLoading &&
    !selectedProcessFlowId
  ) {
    return (
      <div
        className="
          flex h-full w-full
          items-center justify-center
          rounded-xl
          border border-slate-200
          bg-[#F7FAFD]
          dark:border-[#263657]
          dark:bg-[#071224]
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto h-7 w-7
              animate-spin rounded-full
              border-2 border-slate-200
              border-t-cyan-500
              dark:border-slate-700
              dark:border-t-cyan-400
            "
          />

          <p
            className="
              mt-3 text-[10px]
              font-semibold
              text-slate-500
              dark:text-slate-400
            "
          >
            Loading process canvas...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedProcessFlowId) {
    return (
      <div
        className="
          flex h-full w-full
          items-center justify-center
          rounded-xl
          border border-slate-200
          bg-[#F7FAFD]
          p-6
          dark:border-[#263657]
          dark:bg-[#071224]
        "
      >
        <div
          className="
            max-w-[430px]
            rounded-2xl border
            border-dashed
            border-slate-300
            bg-white/80
            px-6 py-6
            text-center
            dark:border-[#34476F]
            dark:bg-[#0B1429]/80
          "
        >
          <div
            className="
              text-sm font-black
              text-slate-900
              dark:text-white
            "
          >
            No saved process flow available
          </div>

          <p
            className="
              mt-2 text-[10px]
              leading-5
              text-slate-500
              dark:text-slate-400
            "
          >
            Save a process flow in Plant Simulator first.
            The Dashboard Process Canvas will then use that
            saved flow automatically.
          </p>

          {processFlowsError && (
            <div
              className="
                mt-3 rounded-lg
                bg-rose-50 px-3 py-2
                text-[9px]
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-300
              "
            >
              {processFlowsError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="
        absolute inset-0
        overflow-hidden
        rounded-xl
        border border-slate-200
        bg-[#F7FAFD]
        dark:border-[#263657]
        dark:bg-[#071224]
      "
    >
      {processFlows.length > 1 && (
        <div
          className="
            absolute right-3 top-3
            z-[70] flex
            items-center gap-2
            rounded-lg border
            border-slate-200
            bg-white/90
            px-2 py-1.5
            shadow-sm
            backdrop-blur
            dark:border-[#2B3B60]
            dark:bg-[#0B1429]/90
          "
        >
          <span
            className="
              text-[8px] font-black
              uppercase tracking-wide
              text-slate-400
            "
          >
            Flow
          </span>

          <select
            value={
              selectedProcessFlowId ||
              ""
            }
            onChange={(event) => {
              const nextId =
                Number(
                  event.target.value
                ) || null;

              setResolvedProcessFlowId(
                nextId
              );

              if (nextId) {
                localStorage.setItem(
                  "process-flow-workspace:active-tab",
                  String(nextId)
                );

                setActiveProcessFlowId(
                  nextId
                );
              }
            }}
            className="
              h-7 max-w-[190px]
              rounded-md border
              border-slate-200
              bg-white px-2
              text-[9px]
              font-semibold
              text-slate-700
              outline-none
              dark:border-[#34476F]
              dark:bg-[#111C34]
              dark:text-slate-200
            "
          >
            {processFlows.map(
              (flow) => (
                <option
                  key={flow.id}
                  value={flow.id}
                >
                  {flow.name ||
                    `Process Flow ${flow.id}`}
                </option>
              )
            )}
          </select>
        </div>
      )}

      <ProcessViewWidget
        data={runtimeData}
        item={processItem}
        canvasOnly
        highlightNodeId={
          activeNode?.id ||
          null
        }
        onNodeHover={
          handleNodeHover
        }
        onNodeMove={
          handleNodeMove
        }
        onNodeLeave={
          handleNodeLeave
        }
        onNodeClick={
          handleNodeClick
        }
        onBackgroundClick={
          handleBackgroundClick
        }
      />

      <div
        className="
          pointer-events-none
          absolute bottom-3
          left-3 z-30
          inline-flex
          items-center gap-1.5
          rounded-lg
          border border-slate-200
          bg-white/90
          px-2.5 py-1.5
          text-[9px]
          font-semibold
          text-slate-500
          shadow-sm
          backdrop-blur
          dark:border-[#2B3B60]
          dark:bg-[#0B1429]/90
          dark:text-slate-300
        "
      >
        <MousePointer2
          size={11}
        />
        {selectedProcessFlowId
          ? `Process Flow ${selectedProcessFlowId} · hover for data · click to pin`
          : "Process Canvas · hover for data · click to pin"}
      </div>

      {activeNode && (
        <div
          className={`
            absolute z-[80]
            w-[470px]
            max-w-[calc(100%-24px)]
            overflow-hidden
            rounded-2xl
            border
            border-cyan-400/25
            bg-white/95
            shadow-[0_18px_60px_rgba(15,23,42,0.22)]
            backdrop-blur-xl
            dark:border-cyan-400/20
            dark:bg-[#0A1528]/96
            dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
            ${
              pinnedNode
                ? "pointer-events-auto"
                : "pointer-events-none"
            }
          `}
          style={{
            left: popupX,
            top: popupY,
          }}
        >
          <div
            className="
              flex items-center
              justify-between gap-3
              border-b
              border-slate-200
              px-3.5 py-2.5
              dark:border-[#263657]
            "
          >
            <div className="min-w-0">
              <div
                className="
                  truncate text-[11px]
                  font-black
                  text-slate-900
                  dark:text-white
                "
              >
                {activeNode.label ||
                  activeNode.deviceId ||
                  activeNode.type ||
                  "Equipment"}
              </div>

              <div
                className="
                  mt-0.5 flex
                  flex-wrap items-center
                  gap-1.5
                  text-[8px]
                  text-slate-400
                "
              >
                <span>
                  {activeNode.deviceId ||
                    "No device assigned"}
                </span>

                {pinnedNode && (
                  <>
                    <span>•</span>
                    <span
                      className="
                        inline-flex
                        items-center gap-1
                        font-semibold
                        text-cyan-600
                        dark:text-cyan-300
                      "
                    >
                      <Pin
                        size={8}
                      />
                      Pinned
                    </span>
                  </>
                )}
              </div>
            </div>

            {pinnedNode && (
              <button
                type="button"
                onClick={closePopup}
                className="
                  flex h-7 w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  dark:hover:bg-white/5
                  dark:hover:text-white
                "
                aria-label="Close equipment data"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {relatedWidgets.length >
          0 ? (
            <div
              className="
                grid max-h-[340px]
                grid-cols-2 gap-2
                overflow-y-auto p-2
              "
            >
              {relatedWidgets
                .slice(0, 6)
                .map((widget) => (
                  <div
                    key={widget.id}
                    className={`
                      min-w-0
                      overflow-hidden
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      dark:border-[#263657]
                      dark:bg-[#0E1830]
                      ${getWidgetPreviewClass(
                        widget
                      )}
                    `}
                  >
                    <WidgetRenderer
                      type={
                        widget.type
                      }
                      value={
                        runtimeData[
                          widget
                            .dataKey
                        ]
                      }
                      data={
                        runtimeData
                      }
                      history={
                        history
                      }
                      historyWindow={
                        historyWindow
                      }
                      liveStatus={
                        runtimeStatus
                      }
                      dataKey={
                        widget.dataKey
                      }
                      item={{
                        ...widget,
                        sankeyRuntimeValues:
                          sankeyValues[
                            widget.id
                          ] || {},
                      }}
                      updateItem={() => {}}
                      editMode={false}
                      widgetAppearanceOverride={
                        widgetAppearance
                      }
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div
              className="
                flex min-h-[108px]
                items-center
                justify-center
                px-6 py-5
                text-center
              "
            >
              <div>
                <div
                  className="
                    mx-auto flex h-8
                    w-8 items-center
                    justify-center
                    rounded-lg
                    bg-slate-100
                    text-slate-400
                    dark:bg-white/5
                  "
                >
                  <Lock size={14} />
                </div>

                <div
                  className="
                    mt-2 text-[10px]
                    font-bold
                    text-slate-600
                    dark:text-slate-300
                  "
                >
                  No matching dashboard
                  widgets
                </div>

                <p
                  className="
                    mt-1 text-[8px]
                    leading-4
                    text-slate-400
                  "
                >
                  Map a dashboard widget
                  to one of this
                  equipment&apos;s data
                  sources to show it here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

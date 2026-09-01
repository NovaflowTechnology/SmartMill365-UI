import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Copy,
  Factory,
  FolderOpen,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import ProcessSimulator from "./ProcessSimulator";
import {
  createProcessFlow,
  deleteProcessFlow,
  duplicateProcessFlow,
  listProcessFlows,
  updateProcessFlow,
} from "../process/processFlowApi";
import {
  confirmAction,
  notify,
} from "../utils/feedback";

const OPEN_TABS_KEY =
  "process-flow-workspace:open-tabs";
const ACTIVE_TAB_KEY =
  "process-flow-workspace:active-tab";
const FAVORITES_KEY =
  "process-flow-workspace:favorites";

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const createBlankTopology = () => ({
  nodes: [],
  connections: [],
  mode: "hybrid",
  dataSources: {},
});

export default function ProcessFlowWorkspace({
  template,
  dark = false,
}) {
  const role =
    localStorage.getItem("role");

  const canEdit =
    role === "superadmin" ||
    role === "admin" ||
    role === "editor";

  const isSuperadmin =
    role === "superadmin";

  const [flows, setFlows] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [search, setSearch] =
    useState("");
  const [showLibrary, setShowLibrary] =
    useState(true);

  const [openTabIds, setOpenTabIds] =
    useState(() => {
      const value = safeParse(
        localStorage.getItem(
          OPEN_TABS_KEY
        ),
        []
      );

      return Array.isArray(value)
        ? value.map(Number).filter(Boolean)
        : [];
    });

  const [activeFlowId, setActiveFlowId] =
    useState(() => {
      const value = Number(
        localStorage.getItem(
          ACTIVE_TAB_KEY
        ) || 0
      );

      return value || null;
    });

  const [favoriteIds, setFavoriteIds] =
    useState(() => {
      const value = safeParse(
        localStorage.getItem(
          FAVORITES_KEY
        ),
        []
      );

      return Array.isArray(value)
        ? value.map(Number).filter(Boolean)
        : [];
    });

  const [showCreate, setShowCreate] =
    useState(false);
  const [createName, setCreateName] =
    useState("New Process Flow");
  const [createDescription, setCreateDescription] =
    useState("");
  const [createOrgId, setCreateOrgId] =
    useState("");
  const [organizations, setOrganizations] =
    useState([]);
  const [creating, setCreating] =
    useState(false);

  const [renameTarget, setRenameTarget] =
    useState(null);
  const [renameName, setRenameName] =
    useState("");
  const [renaming, setRenaming] =
    useState(false);

  const token =
    localStorage.getItem("token");

  const fetchFlows = async ({
    keepLoading = false,
  } = {}) => {
    try {
      if (!keepLoading) {
        setLoading(true);
      }

      const result =
        await listProcessFlows();

      setFlows(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (error) {
      console.error(error);
      notify(
        error.message ||
          "Unable to load process flows",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  useEffect(() => {
    if (!isSuperadmin || !token) {
      return;
    }

    let cancelled = false;

    const loadOrganizations =
      async () => {
        try {
          const response = await fetch(
            "http://localhost:5000/organizations",
            {
              headers: {
                Authorization: token,
              },
            }
          );

          const result =
            await response.json();

          if (
            response.ok &&
            !cancelled &&
            Array.isArray(result)
          ) {
            setOrganizations(result);

            if (
              !createOrgId &&
              result[0]?.id
            ) {
              setCreateOrgId(
                String(result[0].id)
              );
            }
          }
        } catch (error) {
          console.warn(
            "Unable to load organizations for process-flow creation",
            error
          );
        }
      };

    loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [isSuperadmin, token]);

  useEffect(() => {
    const validIds = new Set(
      flows.map((flow) =>
        Number(flow.id)
      )
    );

    setOpenTabIds((current) => {
      const next = current.filter(
        (id) => validIds.has(Number(id))
      );

      return next;
    });
  }, [flows]);

  useEffect(() => {
    localStorage.setItem(
      OPEN_TABS_KEY,
      JSON.stringify(openTabIds)
    );
  }, [openTabIds]);

  useEffect(() => {
    if (activeFlowId) {
      localStorage.setItem(
        ACTIVE_TAB_KEY,
        String(activeFlowId)
      );
    } else {
      localStorage.removeItem(
        ACTIVE_TAB_KEY
      );
    }
  }, [activeFlowId]);

  useEffect(() => {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favoriteIds)
    );
  }, [favoriteIds]);

  const flowById = useMemo(
    () =>
      new Map(
        flows.map((flow) => [
          Number(flow.id),
          flow,
        ])
      ),
    [flows]
  );

  const openTabs = useMemo(
    () =>
      openTabIds
        .map((id) =>
          flowById.get(Number(id))
        )
        .filter(Boolean),
    [openTabIds, flowById]
  );

  const activeFlow =
    activeFlowId
      ? flowById.get(
          Number(activeFlowId)
        ) || null
      : null;

  useEffect(() => {
    if (
      activeFlowId &&
      !flowById.has(
        Number(activeFlowId)
      )
    ) {
      const fallback =
        openTabs[0] || null;

      setActiveFlowId(
        fallback?.id || null
      );
    }
  }, [
    activeFlowId,
    flowById,
    openTabs,
  ]);

  const filteredFlows = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    const sorted = [...flows].sort(
      (left, right) => {
        const leftFavorite =
          favoriteIds.includes(
            Number(left.id)
          )
            ? 1
            : 0;
        const rightFavorite =
          favoriteIds.includes(
            Number(right.id)
          )
            ? 1
            : 0;

        if (
          leftFavorite !== rightFavorite
        ) {
          return (
            rightFavorite -
            leftFavorite
          );
        }

        return (
          new Date(
            right.updated_at || 0
          ).getTime() -
          new Date(
            left.updated_at || 0
          ).getTime()
        );
      }
    );

    if (!keyword) return sorted;

    return sorted.filter((flow) =>
      [
        flow.name,
        flow.description,
        flow.organization_name,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [flows, search, favoriteIds]);

  const openFlow = (flow) => {
    const id = Number(flow.id);

    setOpenTabIds((current) =>
      current.includes(id)
        ? current
        : [...current, id]
    );

    setActiveFlowId(id);
    setShowLibrary(false);
  };

  const closeTab = (
    event,
    flowId
  ) => {
    event.stopPropagation();

    const id = Number(flowId);

    setOpenTabIds((current) => {
      const index =
        current.indexOf(id);
      const next = current.filter(
        (item) => item !== id
      );

      if (
        Number(activeFlowId) === id
      ) {
        const nextActive =
          next[
            Math.min(
              Math.max(index - 1, 0),
              next.length - 1
            )
          ] || null;

        setActiveFlowId(
          nextActive
        );

        if (!nextActive) {
          setShowLibrary(true);
        }
      }

      return next;
    });
  };

  const toggleFavorite = (flowId) => {
    const id = Number(flowId);

    setFavoriteIds((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      notify(
        "Process flow name is required",
        "warning"
      );
      return;
    }

    if (
      isSuperadmin &&
      !createOrgId
    ) {
      notify(
        "Select an organization",
        "warning"
      );
      return;
    }

    try {
      setCreating(true);

      const flow =
        await createProcessFlow({
          name: createName.trim(),
          description:
            createDescription.trim(),
          topology:
            createBlankTopology(),
          org_id: isSuperadmin
            ? Number(createOrgId)
            : undefined,
        });

      setFlows((current) => [
        flow,
        ...current,
      ]);

      setShowCreate(false);
      setCreateName(
        "New Process Flow"
      );
      setCreateDescription("");

      openFlow(flow);
      notify(
        "Process flow created",
        "success"
      );
    } catch (error) {
      console.error(error);
      notify(
        error.message ||
          "Unable to create process flow",
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTopology = async (
    topology
  ) => {
    if (!activeFlow) {
      return null;
    }

    const updated =
      await updateProcessFlow(
        activeFlow.id,
        {
          topology,
        }
      );

    setFlows((current) =>
      current.map((flow) =>
        Number(flow.id) ===
        Number(updated.id)
          ? updated
          : flow
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "process-flow-saved",
        {
          detail: {
            processFlowId:
              updated.id,
          },
        }
      )
    );

    return updated;
  };

  const renameFlow = (flow) => {
    setRenameTarget(flow);
    setRenameName(flow?.name || "");
  };

  const submitRename = async () => {
    if (
      !renameTarget ||
      !renameName.trim()
    ) {
      return;
    }

    try {
      setRenaming(true);

      const updated =
        await updateProcessFlow(
          renameTarget.id,
          {
            name: renameName.trim(),
          }
        );

      setFlows((current) =>
        current.map((item) =>
          Number(item.id) ===
          Number(updated.id)
            ? updated
            : item
        )
      );

      setRenameTarget(null);
      setRenameName("");

      notify(
        "Process flow renamed",
        "success"
      );
    } catch (error) {
      notify(
        error.message ||
          "Unable to rename process flow",
        "error"
      );
    } finally {
      setRenaming(false);
    }
  };

  const handleDuplicate = async (
    flow
  ) => {
    try {
      const duplicate =
        await duplicateProcessFlow(
          flow
        );

      setFlows((current) => [
        duplicate,
        ...current,
      ]);

      openFlow(duplicate);

      notify(
        "Process flow duplicated",
        "success"
      );
    } catch (error) {
      notify(
        error.message ||
          "Unable to duplicate process flow",
        "error"
      );
    }
  };

  const handleDelete = async (
    flow
  ) => {
    const confirmed =
      await confirmAction({
        title: "Delete process flow?",
        message: `Permanently delete \"${flow.name}\"?`,
        confirmLabel: "Delete",
        tone: "danger",
      });

    if (!confirmed) return;

    try {
      await deleteProcessFlow(
        flow.id
      );

      const id = Number(flow.id);

      setFlows((current) =>
        current.filter(
          (item) =>
            Number(item.id) !== id
        )
      );

      setOpenTabIds((current) =>
        current.filter(
          (item) => item !== id
        )
      );

      if (
        Number(activeFlowId) === id
      ) {
        setActiveFlowId(null);
        setShowLibrary(true);
      }

      notify(
        "Process flow deleted",
        "success"
      );
    } catch (error) {
      notify(
        error.message ||
          "Unable to delete process flow",
        "error"
      );
    }
  };

  const importLegacy = async () => {
    const raw =
      localStorage.getItem(
        "palm-oil-process-simulator:last-saved"
      );

    const topology = safeParse(
      raw,
      null
    );

    if (
      !topology ||
      !Array.isArray(topology.nodes) ||
      !Array.isArray(
        topology.connections
      )
    ) {
      notify(
        "No legacy saved Plant Simulator layout was found",
        "info"
      );
      return;
    }

    try {
      const flow =
        await createProcessFlow({
          name: "Imported Plant Layout",
          description:
            "Imported from the previous local Plant Simulator save.",
          topology,
          org_id: isSuperadmin
            ? Number(createOrgId) ||
              undefined
            : undefined,
        });

      setFlows((current) => [
        flow,
        ...current,
      ]);
      openFlow(flow);

      notify(
        "Legacy process layout imported",
        "success"
      );
    } catch (error) {
      notify(
        error.message ||
          "Unable to import legacy process layout",
        "error"
      );
    }
  };

  return (
    <div className="min-w-0">
      {/* OPEN PROCESS FLOW TABS */}
      <div className="mb-2 flex min-h-[42px] items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-[#2C3C61] dark:bg-[#0E172D]">
        <button
          type="button"
          onClick={() =>
            setShowLibrary(true)
          }
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold transition ${
            showLibrary
              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#15213D]"
          }`}
        >
          <FolderOpen size={13} />
          Process Flows
        </button>

        <div className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-[#2C3C61]" />

        {openTabs.map((flow) => {
          const active =
            !showLibrary &&
            Number(activeFlowId) ===
              Number(flow.id);

          return (
            <button
              key={flow.id}
              type="button"
              onClick={() =>
                openFlow(flow)
              }
              className={`group inline-flex h-8 max-w-[220px] shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold transition ${
                active
                  ? "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-[#2C3C61] dark:hover:bg-[#15213D]"
              }`}
            >
              <Factory
                size={12}
                className="shrink-0"
              />
              <span className="truncate">
                {flow.name}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) =>
                  closeTab(
                    event,
                    flow.id
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    closeTab(
                      event,
                      flow.id
                    );
                  }
                }}
                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-400/10"
              >
                <X size={10} />
              </span>
            </button>
          );
        })}

        {canEdit && (
          <button
            type="button"
            onClick={() =>
              setShowCreate(true)
            }
            title="Create process flow"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-600 dark:border-[#3A4B70] dark:hover:bg-cyan-400/10"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {showLibrary || !activeFlow ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2C3C61] dark:bg-[#0E172D]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
                  <Layers3 size={18} />
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-900 dark:text-white">
                    Process Flow Library
                  </h1>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    Save independent plant topologies and open several flows in tabs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  fetchFlows()
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#2C3C61] dark:bg-[#111B34] dark:text-slate-200"
              >
                <RefreshCw size={12} />
                Refresh
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[10px] font-bold text-white hover:bg-cyan-500"
                >
                  <Plus size={12} />
                  New Flow
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-4 max-w-[420px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search process flows..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
            />
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-400">
              Loading process flows…
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="mt-4 flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 text-center dark:border-[#2C3C61]">
              <Factory
                size={34}
                className="text-slate-300 dark:text-slate-600"
              />
              <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                No process flows yet
              </h3>
              <p className="mt-1 max-w-md text-[10px] leading-5 text-slate-400">
                Create a flow for the main production line, steam system, clarification, utilities, or any other plant section.
              </p>

              {canEdit && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowCreate(true)
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[10px] font-bold text-white"
                  >
                    <Plus size={12} />
                    Create Flow
                  </button>
                  <button
                    type="button"
                    onClick={importLegacy}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 dark:border-[#2C3C61] dark:text-slate-200"
                  >
                    <Save size={12} />
                    Import Old Save
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredFlows.map(
                (flow) => {
                  const topology =
                    flow.topology || {};
                  const nodeCount =
                    Array.isArray(
                      topology.nodes
                    )
                      ? topology.nodes.length
                      : 0;
                  const connectionCount =
                    Array.isArray(
                      topology.connections
                    )
                      ? topology.connections
                          .length
                      : 0;
                  const favorite =
                    favoriteIds.includes(
                      Number(flow.id)
                    );

                  return (
                    <article
                      key={flow.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-cyan-300 hover:shadow-sm dark:border-[#2C3C61] dark:bg-[#111B34]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-[12px] font-black text-slate-800 dark:text-slate-100">
                            {flow.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 min-h-[30px] text-[9px] leading-[15px] text-slate-400">
                            {flow.description ||
                              "Saved industrial process topology"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            toggleFavorite(
                              flow.id
                            )
                          }
                          title={
                            favorite
                              ? "Remove favourite"
                              : "Favourite"
                          }
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            favorite
                              ? "bg-amber-100 text-amber-500 dark:bg-amber-400/10"
                              : "text-slate-300 hover:bg-amber-50 hover:text-amber-500 dark:text-slate-500"
                          }`}
                        >
                          <Star
                            size={13}
                            fill={
                              favorite
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5 text-[8px] text-slate-500 dark:text-slate-400">
                        <span className="rounded-md bg-white px-2 py-1 dark:bg-[#081022]">
                          {nodeCount} equipment
                        </span>
                        <span className="rounded-md bg-white px-2 py-1 dark:bg-[#081022]">
                          {connectionCount} pipelines
                        </span>
                        {flow.organization_name && (
                          <span className="max-w-[150px] truncate rounded-md bg-white px-2 py-1 dark:bg-[#081022]">
                            {flow.organization_name}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            openFlow(flow)
                          }
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-2 text-[9px] font-bold text-white"
                        >
                          <Factory size={11} />
                          Open
                        </button>

                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                renameFlow(flow)
                              }
                              title="Rename"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600 dark:border-[#2C3C61] dark:bg-[#081022]"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDuplicate(
                                  flow
                                )
                              }
                              title="Duplicate"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600 dark:border-[#2C3C61] dark:bg-[#081022]"
                            >
                              <Copy size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(flow)
                              }
                              title="Delete"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/5"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      ) : (
        <ProcessSimulator
          key={activeFlow.id}
          template={template}
          dark={dark}
          processFlow={activeFlow}
          onSaveProcessFlow={
            handleSaveTopology
          }
        />
      )}

      {renameTarget && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-[#2C3C61] dark:bg-[#0E172D]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Rename Process Flow
              </h3>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#15213D]"
              >
                <X size={14} />
              </button>
            </div>

            <input
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitRename();
                }
              }}
              autoFocus
              className="mt-4 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-500 dark:border-[#2C3C61] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renaming || !renameName.trim()}
                onClick={submitRename}
                className="h-9 rounded-lg bg-cyan-600 px-3 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {renaming ? "Saving…" : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-[#2C3C61] dark:bg-[#0E172D]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Create Process Flow
                </h3>
                <p className="mt-1 text-[9px] text-slate-400">
                  Create an independent saved plant topology.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#15213D]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  Name
                </span>
                <input
                  value={createName}
                  onChange={(event) =>
                    setCreateName(
                      event.target.value
                    )
                  }
                  autoFocus
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  Description
                </span>
                <textarea
                  value={createDescription}
                  onChange={(event) =>
                    setCreateDescription(
                      event.target.value
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] outline-none focus:border-cyan-400 dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                />
              </label>

              {isSuperadmin && (
                <label className="block">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Organization
                  </span>
                  <select
                    value={createOrgId}
                    onChange={(event) =>
                      setCreateOrgId(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] outline-none dark:border-[#2C3C61] dark:bg-[#081022] dark:text-white"
                  >
                    <option value="">
                      Select organization
                    </option>
                    {organizations.map(
                      (organization) => (
                        <option
                          key={organization.id}
                          value={organization.id}
                        >
                          {organization.name}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-500 dark:border-[#2C3C61] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[10px] font-bold text-white disabled:opacity-50"
              >
                <Plus size={12} />
                {creating
                  ? "Creating…"
                  : "Create Flow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

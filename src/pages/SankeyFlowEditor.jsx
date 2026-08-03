import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Workflow,
  Database,
  RefreshCw,
  Moon,
  Sun,
} from "lucide-react";

import SankeyWidget, {
  defaultSankeyConfig,
  normalizeSankeyConfig,
} from "../widgets/SankeyWidget";

import { dataOptions } from "../data/dataOptions";

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const previewData = {
  steamPressure: 31.2,
  steamFlowrate: 44.1,
  steamOutletTemp: 120,
  inletDraft: 36.6,
  outletDraft: 999.9,
  furnaceDraft: 4.3,
  waterInletTemp: 102,
  waterFlowrate: 33,
  waterDrumLevel: 51,
  vgPressure: 999.9,
  vgInletTemp: 90,
  vgOutletTemp: 80,

  // Channel-style preview values.
  ch1: 31.2,
  ch2: 44.1,
  ch3: 120,
  ch4: 36.6,
  ch5: 999.9,
  ch6: 4.3,
  ch8: 102,
  ch9: 33,
  ch10: 51,
  ch11: 999.9,
  ch12: 90,
  ch13: 80,
};

const commonUnitOptions = [
  "",
  "bar",
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

const defaultDataSource = {
  bucket: "Mill",
  measurement: "PBLR",
  tagKey: "id",
  tagValue: "",
  channel: "",
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

  const storedDarkMode =
    localStorage.getItem("darkMode");

  return (
    html.classList.contains("dark") ||
    body.classList.contains("dark") ||
    html.dataset.theme === "dark" ||
    body.dataset.theme === "dark" ||
    storedTheme === "dark" ||
    storedDarkMode === "true"
  );
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

  useEffect(() => {
    if (typeof darkMode === "boolean") {
      return undefined;
    }

    const updateTheme = () => {
      setDetectedDarkMode(readDarkMode());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    window.addEventListener("storage", updateTheme);
    window.addEventListener("themechange", updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateTheme);
      window.removeEventListener("themechange", updateTheme);
    };
  }, [darkMode]);

  const initialConfig = normalizeSankeyConfig(
    sankeyWidget?.sankeyConfig || defaultSankeyConfig
  );

  const [config, setConfig] = useState(initialConfig);

  // Global suggestions are still kept for simple typing/autocomplete.
  const [influxLoading, setInfluxLoading] = useState(false);
  const [influxError, setInfluxError] = useState("");
  const [influxMeasurements, setInfluxMeasurements] = useState([]);
  const [influxIds, setInfluxIds] = useState([]);
  const [influxChannels, setInfluxChannels] = useState([]);
  const [assignedDevices, setAssignedDevices] = useState([]);

  // Per-output reload status and channel suggestions.
  // This is important because each Sankey output may point to a different device.
  const [outputMetadata, setOutputMetadata] = useState({});

  const customDataOptions = sankeyWidget?.customDataOptions || [];

  const allDataOptions = useMemo(
    () => [...dataOptions, ...customDataOptions],
    [customDataOptions]
  );

  const safeOutputs = Array.isArray(config.outputs)
    ? config.outputs
    : defaultSankeyConfig.outputs;

  const updateConfig = (changes) => {
    setConfig((current) => ({
      ...current,
      ...changes,
    }));
  };

  const updateOutput = (outputId, changes) => {
    setConfig((current) => ({
      ...current,
      outputs: current.outputs.map((output) =>
        output.id === outputId
          ? {
              ...output,
              ...changes,
            }
          : output
      ),
    }));
  };

  const updateOutputDataSource = (outputId, changes) => {
    setConfig((current) => ({
      ...current,
      outputs: current.outputs.map((output) =>
        output.id === outputId
          ? {
              ...output,
              dataSource: {
                ...defaultDataSource,
                ...(output.dataSource || {}),
                ...changes,
              },
            }
          : output
      ),
    }));
  };

  const addOutput = () => {
    setConfig((current) => {
      const nextIndex = current.outputs.length + 1;

      return {
        ...current,
        outputs: [
          ...current.outputs,
          {
            id: createId("output"),
            name: `Sterilizer ${nextIndex}`,
            dataKey: "",
            dataSource: {
              ...defaultDataSource,
            },
          },
        ],
      };
    });
  };

  const removeOutput = (outputId) => {
    setConfig((current) => ({
      ...current,
      outputs: current.outputs.filter((output) => output.id !== outputId),
    }));

    setOutputMetadata((current) => {
      const next = { ...current };
      delete next[outputId];
      return next;
    });
  };

  const fetchInfluxMeasurements = async (bucket, token) => {
    const res = await fetch(
      `http://localhost:5000/influx/measurements?bucket=${encodeURIComponent(bucket)}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result?.error || "Failed to load Influx measurements.");
    }

    return result?.measurements || [];
  };

  const fetchAllowedDevices = async (token) => {
    const res = await fetch("http://localhost:5000/influx/allowed-devices", {
      headers: {
        Authorization: token,
      },
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result?.error || "Failed to load assigned devices.");
    }

    return Array.isArray(result) ? result : [];
  };

  const fetchInfluxIdsAndChannels = async ({
    bucket,
    measurement,
    tagKey = "id",
    tagValue = "",
    token,
  }) => {
    const idQuery = new URLSearchParams({
      bucket,
      measurement,
      tagKey: tagKey || "id",
    });

    const channelQuery = new URLSearchParams({
      bucket,
      measurement,
      tagKey: tagKey || "id",
    });

    if (tagValue) {
      channelQuery.set("tagValue", tagValue);
    }

    const [idsRes, channelsRes] = await Promise.all([
      fetch(`http://localhost:5000/influx/ids?${idQuery.toString()}`, {
        headers: {
          Authorization: token,
        },
      }),
      fetch(`http://localhost:5000/influx/channels?${channelQuery.toString()}`, {
        headers: {
          Authorization: token,
        },
      }),
    ]);

    const idsData = await idsRes.json();
    const channelsData = await channelsRes.json();

    if (!idsRes.ok) {
      throw new Error(idsData?.error || "Failed to load Influx IDs.");
    }

    if (!channelsRes.ok) {
      throw new Error(channelsData?.error || "Failed to load Influx channels.");
    }

    return {
      ids: idsData?.ids || [],
      channels: channelsData?.channels || [],
    };
  };

  const fetchInfluxChannelsForDevice = async ({
    bucket,
    measurement,
    tagKey = "id",
    tagValue,
    token,
  }) => {
    const query = new URLSearchParams({
      bucket,
      measurement,
      tagKey: tagKey || "id",
    });

    if (tagValue) {
      query.set("tagValue", tagValue);
    }

    const res = await fetch(`http://localhost:5000/influx/channels?${query.toString()}`, {
      headers: {
        Authorization: token,
      },
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result?.error || "Failed to load Influx channels.");
    }

    return result?.channels || [];
  };

  // General reload. Superadmin gets measurement/id/channel suggestions.
  // Admin zero uses assigned devices because /influx/ids is superadmin-only in your backend.
  const reloadInfluxOptions = async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const firstSource =
      safeOutputs.find(
        (output) =>
          output.dataSource?.bucket &&
          output.dataSource?.measurement
      )?.dataSource ||
      safeOutputs[0]?.dataSource ||
      defaultDataSource;

    const bucket = firstSource.bucket || "Mill";
    const measurement = firstSource.measurement || "PBLR";
    const tagKey = firstSource.tagKey || "id";
    const tagValue = firstSource.tagValue || "";

    setInfluxLoading(true);
    setInfluxError("");

    try {
      if (role === "admin") {
        const devices = await fetchAllowedDevices(token);
        setAssignedDevices(devices);

        const measurements = [
          ...new Set(devices.map((device) => device.measurement_name).filter(Boolean)),
        ].sort();

        const ids = [
          ...new Set(devices.map((device) => device.tag_value).filter(Boolean)),
        ].sort();

        setInfluxMeasurements(measurements);
        setInfluxIds(ids);

        if (bucket && measurement && tagValue) {
          const channels = await fetchInfluxChannelsForDevice({
            bucket,
            measurement,
            tagKey,
            tagValue,
            token,
          });

          setInfluxChannels(channels);
        } else {
          setInfluxChannels([]);
        }

        return;
      }

      const measurements = await fetchInfluxMeasurements(bucket, token);
      setInfluxMeasurements(measurements);

      if (measurement) {
        const { ids, channels } = await fetchInfluxIdsAndChannels({
          bucket,
          measurement,
          tagKey,
          tagValue,
          token,
        });

        setInfluxIds(ids);
        setInfluxChannels(channels);
      }
    } catch (error) {
      console.error("❌ Sankey Influx metadata error:", error);
      setInfluxMeasurements([]);
      setInfluxIds([]);
      setInfluxChannels([]);
      setAssignedDevices([]);
      setInfluxError(error.message || "Failed to load Influx metadata.");
    } finally {
      setInfluxLoading(false);
    }
  };

  // Automatically load available devices and Influx suggestions
  // when the Sankey editor opens. The Reload button remains available
  // for manual refreshes.
  useEffect(() => {
    reloadInfluxOptions();
    // Run only when the editor is first opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadOutputChannels = async (output) => {
    const token = localStorage.getItem("token");
    const dataSource = {
      ...defaultDataSource,
      ...(output.dataSource || {}),
    };

    const bucket = dataSource.bucket || "Mill";
    const measurement = dataSource.measurement || "PBLR";
    const tagKey = dataSource.tagKey || "id";
    const tagValue = dataSource.tagValue || "";

    if (!bucket || !measurement || !tagValue) {
      setOutputMetadata((current) => ({
        ...current,
        [output.id]: {
          loading: false,
          channels: [],
          error: "Bucket, measurement, and device ID are required before reloading channels.",
        },
      }));
      return;
    }

    setOutputMetadata((current) => ({
      ...current,
      [output.id]: {
        ...(current[output.id] || {}),
        loading: true,
        error: "",
      },
    }));

    try {
      const channels = await fetchInfluxChannelsForDevice({
        bucket,
        measurement,
        tagKey,
        tagValue,
        token,
      });

      setOutputMetadata((current) => ({
        ...current,
        [output.id]: {
          loading: false,
          channels,
          error: "",
        },
      }));

      setInfluxChannels((current) => [
        ...new Set([...current, ...channels]),
      ].sort());
    } catch (error) {
      console.error("❌ Sankey output channel reload error:", error);

      setOutputMetadata((current) => ({
        ...current,
        [output.id]: {
          loading: false,
          channels: [],
          error: error.message || "Failed to load channels for this output.",
        },
      }));
    }
  };

  const applyAssignedDeviceToOutput = (outputId, encodedValue) => {
    if (!encodedValue) return;

    try {
      const device = JSON.parse(encodedValue);

      updateOutputDataSource(outputId, {
        bucket: device.bucket_name || "Mill",
        measurement: device.measurement_name || "PBLR",
        tagKey: device.tag_key || "id",
        tagValue: device.tag_value || "",
        channel: "",
      });
    } catch (error) {
      console.error("❌ Failed to apply assigned device:", error);
    }
  };

  const handleSave = () => {
    const cleanConfig = normalizeSankeyConfig(config);

    const dataKeys = [
      ...new Set(
        cleanConfig.outputs
          .map((output) => output.dataKey)
          .filter(Boolean)
      ),
    ];

    setSankeyWidget({
      ...sankeyWidget,
      sankeyConfig: cleanConfig,
      dataKeys,
      dataKey: dataKeys[0] || sankeyWidget?.dataKey || "",
      resumeWidgetSettings: true,
    });

    setPage(sankeyWidget?.returnPage || "builder");
  };

  const totalPreview = safeOutputs.reduce((sum, output) => {
    const liveByDataKey = Number(previewData?.[output.dataKey]);
    const liveByChannel = Number(previewData?.[output.dataSource?.channel]);
    const value = Number.isFinite(liveByDataKey)
      ? liveByDataKey
      : Number.isFinite(liveByChannel)
      ? liveByChannel
      : 0;

    return sum + Math.max(0, value);
  }, 0);

  return (
    <div
      data-theme={isDarkMode ? "dark" : "light"}
      className={
        isDarkMode
          ? "sankey-flow-editor-theme dark h-screen w-full"
          : "sankey-flow-editor-theme h-screen w-full"
      }
    >
      <style>{`
        .sankey-flow-editor-theme[data-theme="dark"] {
          background: #020617;
          color: #e2e8f0;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .bg-white {
          background-color: #0f172a !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .bg-slate-50,
        .sankey-flow-editor-theme[data-theme="dark"] .bg-gray-50,
        .sankey-flow-editor-theme[data-theme="dark"] .bg-gray-100 {
          background-color: #0b1220 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .bg-slate-900 {
          background-color: #0f172a !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .bg-slate-950 {
          background-color: #020617 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .text-slate-900,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-900,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-800,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-700 {
          color: #f8fafc !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .text-slate-500,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-500,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-600 {
          color: #cbd5e1 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .text-slate-400,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-400,
        .sankey-flow-editor-theme[data-theme="dark"] .text-gray-300 {
          color: #94a3b8 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .border-slate-200,
        .sankey-flow-editor-theme[data-theme="dark"] .border-gray-200,
        .sankey-flow-editor-theme[data-theme="dark"] .border-gray-300 {
          border-color: #334155 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] input,
        .sankey-flow-editor-theme[data-theme="dark"] select,
        .sankey-flow-editor-theme[data-theme="dark"] textarea {
          background-color: #020617 !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] input::placeholder,
        .sankey-flow-editor-theme[data-theme="dark"] textarea::placeholder {
          color: #64748b !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] option {
          background-color: #020617;
          color: #f8fafc;
        }

        .sankey-flow-editor-theme[data-theme="dark"] .shadow-sm,
        .sankey-flow-editor-theme[data-theme="dark"] .shadow-xl {
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.28) !important;
        }
      `}</style>

      <div className="flex h-full w-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
      {/* PREVIEW */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white p-5 dark:bg-[#07101f]">
        <div
          className="
            z-20 flex shrink-0
            items-center justify-between
            gap-4 rounded-2xl
            border px-4 py-3
            shadow-lg backdrop-blur-xl
          "
          style={{
            backgroundColor: isDarkMode
              ? "rgba(15, 23, 42, 0.96)"
              : "rgba(255, 255, 255, 0.96)",
            borderColor: isDarkMode
              ? "rgba(71, 85, 105, 0.75)"
              : "rgba(226, 232, 240, 1)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setPage(
                  sankeyWidget?.returnPage ||
                    "builder"
                )
              }
              className="
                inline-flex h-10 w-10
                shrink-0 items-center
                justify-center rounded-xl
                border border-slate-200
                bg-slate-100 text-slate-700
                transition hover:bg-slate-200
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-white
                dark:hover:bg-slate-700
              "
              aria-label="Back to widget settings"
              title="Back to widget settings"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Workflow
                  size={17}
                  className="shrink-0 text-emerald-500"
                />

                <h1
                  className="
                    truncate text-base
                    font-black
                    text-slate-900
                    dark:text-white
                  "
                >
                  Sankey Flow Editor
                </h1>
              </div>

              <p
                className="
                  mt-0.5 truncate text-xs
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Configure the source, outputs, and
                device channels.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="
                hidden rounded-xl
                border px-3 py-2
                text-right sm:block
              "
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(15, 23, 42, 0.9)"
                  : "#f8fafc",
                borderColor: isDarkMode
                  ? "#475569"
                  : "#cbd5e1",
              }}
            >
              <p
                className="
                  text-[9px] font-black
                  uppercase tracking-wider
                "
                style={{
                  color: isDarkMode
                    ? "#93c5fd"
                    : "#2563eb",
                }}
              >
                Data sources
              </p>

              <p
                className="
                  mt-0.5 text-xs
                  font-extrabold
                "
                style={{
                  color: isDarkMode
                    ? "#f8fafc"
                    : "#0f172a",
                }}
              >
                {influxLoading
                  ? "Loading…"
                  : `${influxIds.length} device${
                      influxIds.length === 1
                        ? ""
                        : "s"
                    }`}
              </p>
            </div>

            {typeof toggleTheme === "function" && (
              <button
                type="button"
                onClick={toggleTheme}
                className="
                  inline-flex h-10 w-10
                  items-center justify-center
                  rounded-xl border
                  border-slate-200
                  bg-slate-100
                  text-slate-700
                  transition hover:bg-slate-200
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-100
                  dark:hover:bg-slate-700
                "
                aria-label={
                  isDarkMode
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                title={
                  isDarkMode
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
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
              className="
                inline-flex h-10
                items-center gap-2
                rounded-xl
                bg-emerald-600
                px-4 text-sm
                font-black text-white
                shadow-lg
                shadow-emerald-600/20
                transition
                hover:bg-emerald-700
              "
            >
              <Save size={15} />
              Save
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1">
          <SankeyWidget
            data={previewData}
            item={{
              ...sankeyWidget,
              sankeyConfig: config,
              label: sankeyWidget?.label || "Sankey Flow Preview",
            }}
          />
        </div>
      </div>

      {/* SETTINGS PANEL */}
      <div className="w-[560px] overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0b1220]">
        <div
          className="
            sticky top-0 z-10
            border-b p-5
            backdrop-blur-xl
          "
          style={{
            backgroundColor: isDarkMode
              ? "rgba(15, 23, 42, 0.98)"
              : "rgba(255, 255, 255, 0.98)",
            borderColor: isDarkMode
              ? "#334155"
              : "#e2e8f0",
            boxShadow: isDarkMode
              ? "0 10px 24px rgba(0, 0, 0, 0.18)"
              : "0 8px 20px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-emerald-200
                bg-emerald-50
                text-emerald-600
                dark:border-emerald-900/60
                dark:bg-emerald-500/10
                dark:text-emerald-300
              "
            >
              <Workflow size={19} />
            </div>

            <div className="min-w-0">
              <h2
                className="
                  text-base font-black
                  text-slate-900
                  dark:text-white
                "
              >
                Flow Settings
              </h2>

              <p
                className="
                  mt-1 text-xs leading-5
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Add output cards. Each output automatically becomes a flow from the source.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center shadow-sm dark:border-blue-900/50 dark:bg-blue-500/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                Source
              </p>
              <p className="mt-1 truncate text-sm font-black text-blue-700 dark:text-blue-300">
                {config.sourceName || "Source"}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center shadow-sm dark:border-emerald-900/50 dark:bg-emerald-500/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                Outputs
              </p>
              <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
                {safeOutputs.length}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center shadow-sm dark:border-amber-900/50 dark:bg-amber-500/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                Total
              </p>
              <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-300">
                {totalPreview.toFixed(Number.isInteger(totalPreview) ? 0 : 1)}
              </p>
            </div>
          </div>

          {/* SOURCE */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black">Source</h3>

            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              All output flows will start from this source node.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Source Name
                </label>

                <input
                  type="text"
                  value={config.sourceName || ""}
                  onChange={(event) =>
                    updateConfig({
                      sourceName: event.target.value,
                    })
                  }
                  placeholder="Boiler A"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Unit
                </label>

                <input
                  type="text"
                  list="sankey-unit-options"
                  value={config.unit || ""}
                  onChange={(event) =>
                    updateConfig({
                      unit: event.target.value,
                    })
                  }
                  placeholder="t/h"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />

                <datalist id="sankey-unit-options">
                  {commonUnitOptions.map((unit) => (
                    <option key={unit || "empty"} value={unit} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* METADATA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black">
                  <Database size={16} className="text-emerald-500" />
                  Influx Options
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Device IDs load automatically. Reload here to refresh the available measurements, devices, and channels.
                </p>
              </div>

              <button
                type="button"
                onClick={reloadInfluxOptions}
                disabled={influxLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <RefreshCw
                  size={14}
                  className={influxLoading ? "animate-spin" : ""}
                />
                Reload
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              {influxMeasurements.length} measurement(s) · {influxIds.length} device ID(s) ·{" "}
              {influxChannels.length} channel(s) found
            </p>

            {influxError && (
              <p className="mt-2 text-xs font-semibold text-red-500">
                {influxError}
              </p>
            )}

            <datalist id="sankey-measurement-options">
              {influxMeasurements.map((measurement) => (
                <option key={measurement} value={measurement} />
              ))}
            </datalist>

            <datalist id="sankey-id-options">
              {influxIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>

            <datalist id="sankey-channel-options">
              {influxChannels.map((channel) => (
                <option key={channel} value={channel} />
              ))}
            </datalist>
          </div>

          {/* OUTPUTS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">Outputs</h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Each output automatically creates one Sankey flow.
                </p>
              </div>

              <button
                type="button"
                onClick={addOutput}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Plus size={14} />
                Add Output
              </button>
            </div>

            <div className="space-y-4">
              {safeOutputs.map((output, index) => {
                const dataSource = {
                  ...defaultDataSource,
                  ...(output.dataSource || {}),
                };

                const meta = outputMetadata[output.id] || {};
                const outputChannelOptions = meta.channels?.length
                  ? meta.channels
                  : influxChannels;

                const assignedDeviceIdOptions = assignedDevices.filter(
                  (device) =>
                    !dataSource.bucket ||
                    !dataSource.measurement ||
                    (String(device.bucket_name || "") === String(dataSource.bucket || "") &&
                      String(device.measurement_name || "") === String(dataSource.measurement || ""))
                );

                const allDeviceIdOptions = [
                  ...assignedDeviceIdOptions.map((device) => ({
                    value: device.tag_value || "",
                    label: `${device.device_name || device.tag_value || `Device ${device.id}`} — ${
                      device.bucket_name || "Mill"
                    } / ${device.measurement_name || "PBLR"} (${device.tag_key || "id"}=${
                      device.tag_value || "—"
                    })`,
                    device,
                  })),
                  ...influxIds.map((id) => ({
                    value: id,
                    label: id,
                    device: null,
                  })),
                ].filter((option) => option.value);

                const uniqueDeviceIdOptions = allDeviceIdOptions.filter(
                  (option, optionIndex, source) =>
                    source.findIndex((item) => item.value === option.value) === optionIndex
                );

                const currentDeviceIdExists = uniqueDeviceIdOptions.some(
                  (option) => String(option.value) === String(dataSource.tagValue || "")
                );

                return (
                  <div
                    key={output.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#111827]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                        Output {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeOutput(output.id)}
                        disabled={safeOutputs.length <= 1}
                        className="text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Display Name
                        </label>

                        <input
                          type="text"
                          value={output.name || ""}
                          onChange={(event) =>
                            updateOutput(output.id, {
                              name: event.target.value,
                            })
                          }
                          placeholder={`Sterilizer ${index + 1}`}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Existing Data Key
                        </label>

                        <select
                          value={output.dataKey || ""}
                          onChange={(event) =>
                            updateOutput(output.id, {
                              dataKey: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">Use channel only</option>

                          {allDataOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Bucket
                        </label>

                        <input
                          type="text"
                          value={dataSource.bucket || ""}
                          onChange={(event) =>
                            updateOutputDataSource(output.id, {
                              bucket: event.target.value,
                            })
                          }
                          placeholder="Mill"
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Measurement
                        </label>

                        <input
                          type="text"
                          list="sankey-measurement-options"
                          value={dataSource.measurement || ""}
                          onChange={(event) =>
                            updateOutputDataSource(output.id, {
                              measurement: event.target.value,
                            })
                          }
                          placeholder="PBLR"
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Device ID
                        </label>

                        <select
                          value={dataSource.tagValue || ""}
                          onChange={(event) => {
                            const selectedValue = event.target.value;
                            const selectedOption = uniqueDeviceIdOptions.find(
                              (option) => String(option.value) === String(selectedValue)
                            );

                            if (selectedOption?.device) {
                              updateOutputDataSource(output.id, {
                                bucket: selectedOption.device.bucket_name || dataSource.bucket || "Mill",
                                measurement:
                                  selectedOption.device.measurement_name ||
                                  dataSource.measurement ||
                                  "PBLR",
                                tagKey: selectedOption.device.tag_key || dataSource.tagKey || "id",
                                tagValue: selectedOption.device.tag_value || selectedValue,
                                channel: "",
                              });
                              return;
                            }

                            updateOutputDataSource(output.id, {
                              tagValue: selectedValue,
                            });
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">
                            {uniqueDeviceIdOptions.length
                              ? "Select available ID"
                              : influxLoading
                              ? "Loading available device IDs..."
                              : "No available device IDs found"}
                          </option>

                          {dataSource.tagValue && !currentDeviceIdExists && (
                            <option value={dataSource.tagValue}>
                              {dataSource.tagValue}
                            </option>
                          )}

                          {uniqueDeviceIdOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Influx Channel
                        </label>

                        <input
                          type="text"
                          list={`sankey-channel-options-${output.id}`}
                          value={dataSource.channel || ""}
                          onChange={(event) =>
                            updateOutputDataSource(output.id, {
                              channel: event.target.value,
                            })
                          }
                          placeholder="ch2"
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />

                        <datalist id={`sankey-channel-options-${output.id}`}>
                          {outputChannelOptions.map((channel) => (
                            <option key={channel} value={channel} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-gray-500 dark:text-slate-400">
                          Tag Key
                        </label>

                        <input
                          type="text"
                          value={dataSource.tagKey || "id"}
                          onChange={(event) =>
                            updateOutputDataSource(output.id, {
                              tagKey: event.target.value,
                            })
                          }
                          placeholder="id"
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                        <div>
                          <p className="text-[11px] font-black text-gray-600 dark:text-slate-300">
                            Device-specific channel reload
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            Uses this output's bucket, measurement, tag key, and device ID.
                          </p>
                          {meta.error && (
                            <p className="mt-1 text-[11px] font-semibold text-red-500">
                              {meta.error}
                            </p>
                          )}
                          {meta.channels?.length > 0 && (
                            <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                              {meta.channels.length} channel(s) loaded for this output.
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => reloadOutputChannels(output)}
                          disabled={meta.loading}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                        >
                          <RefreshCw
                            size={13}
                            className={meta.loading ? "animate-spin" : ""}
                          />
                          Reload Channels
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {safeOutputs.length === 0 && (
                <div className="border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400 dark:border-slate-700">
                  No outputs configured yet
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}

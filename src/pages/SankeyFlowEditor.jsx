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
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import SankeyWidget, {
  defaultSankeyConfig,
  normalizeSankeyConfig,
} from "../widgets/SankeyWidget";

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

const SANKEY_COLOR_PRESETS = [
  "#2563eb",
  "#06b6d4",
  "#10b981",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#6366f1",
];

const normalizeHexColor = (value, fallback = "#06b6d4") => {
  const text = String(value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(text)) {
    return text;
  }

  return fallback;
};

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

const readDarkMode = () => {
  if (typeof window === "undefined") return false;

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

const unique = (values = []) =>
  [...new Set(values.filter(Boolean).map(String))];

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
    if (typeof darkMode === "boolean") return undefined;

    const updateTheme = () => setDetectedDarkMode(readDarkMode());

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

  /*
   * IMPORTANT:
   * Data Mapping is now done at Template Designer level first.
   * Sankey Flow Editor inherits that mapping instead of asking the user
   * to choose Bucket / Measurement / Device again for every output.
   */
  const templateMapping =
    sankeyWidget?.designerSnapshot?.influxConfig || {};

  const mappedSource = useMemo(
    () => ({
      bucket: String(templateMapping.bucket || ""),
      measurement: String(templateMapping.measurement || ""),
      tagKey: String(templateMapping.tagKey || "id"),
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

  const createDefaultOutput = (index = 1) => ({
    id: createId("output"),
    name: `Sterilizer ${index}`,
    dataKey: "",
    color:
      SANKEY_COLOR_PRESETS[
        (index - 1) % SANKEY_COLOR_PRESETS.length
      ],
    dataSource: {
      ...mappedSource,
      channel: "",
    },
  });

  const initialConfig = useMemo(() => {
    const normalized = normalizeSankeyConfig(
      sankeyWidget?.sankeyConfig || defaultSankeyConfig
    );

    const outputs =
      Array.isArray(normalized.outputs) &&
      normalized.outputs.length
        ? normalized.outputs
        : [createDefaultOutput(1)];

    return {
      ...normalized,
      sourceName:
        normalized.sourceName ||
        "Process Source",
      sourceColor: normalizeHexColor(
        normalized.sourceColor,
        "#2563eb"
      ),
      unit: normalized.unit || "t/h",
      outputs: outputs.map((output, index) => {
        const previousChannel =
          output?.dataSource?.channel ||
          output?.dataKey ||
          "";

        return {
          ...output,
          id: output.id || createId(`output-${index + 1}`),
          name:
            output.name ||
            `Sterilizer ${index + 1}`,
          dataKey: previousChannel,
          color: normalizeHexColor(
            output.color,
            SANKEY_COLOR_PRESETS[
              index % SANKEY_COLOR_PRESETS.length
            ]
          ),
          dataSource: {
            ...mappedSource,
            channel: previousChannel,
          },
        };
      }),
    };
  }, []);

  const [config, setConfig] = useState(initialConfig);
  const [availableChannels, setAvailableChannels] =
    useState([]);
  const [loadingChannels, setLoadingChannels] =
    useState(false);
  const [channelError, setChannelError] =
    useState("");

  const safeOutputs = Array.isArray(config.outputs)
    ? config.outputs
    : [];

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

  const setOutputChannel = (outputId, channel) => {
    setConfig((current) => ({
      ...current,
      outputs: current.outputs.map((output) =>
        output.id === outputId
          ? {
              ...output,
              // For the new mapping-first architecture, the field/channel
              // itself is also used as the widget dataKey.
              dataKey: channel,
              dataSource: {
                ...mappedSource,
                channel,
              },
            }
          : output
      ),
    }));
  };

  const addOutput = () => {
    setConfig((current) => ({
      ...current,
      outputs: [
        ...(Array.isArray(current.outputs)
          ? current.outputs
          : []),
        createDefaultOutput(
          (current.outputs?.length || 0) + 1
        ),
      ],
    }));
  };

  const removeOutput = (outputId) => {
    setConfig((current) => ({
      ...current,
      outputs: current.outputs.filter(
        (output) => output.id !== outputId
      ),
    }));
  };

  const fetchMappedChannels = async () => {
    if (!mappingReady) {
      setAvailableChannels([]);
      setChannelError(
        "Template Data Mapping is incomplete. Return to Template Designer and complete Data Mapping first."
      );
      return;
    }

    const token = localStorage.getItem("token");

    const query = new URLSearchParams({
      bucket: mappedSource.bucket,
      measurement: mappedSource.measurement,
      tagKey: mappedSource.tagKey || "id",
      tagValue: mappedSource.tagValue,
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to load fields for the mapped device."
        );
      }

      setAvailableChannels(
        unique(result?.channels || result?.fields || [])
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
    // Load once when editor opens with the inherited template mapping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewValues = useMemo(() => {
    const values = { ...previewData };

    availableChannels.forEach((channel, index) => {
      if (values[channel] === undefined) {
        values[channel] = 18 + index * 8;
      }
    });

    return values;
  }, [availableChannels]);

  const totalPreview = safeOutputs.reduce(
    (sum, output, index) => {
      const channel =
        output.dataSource?.channel ||
        output.dataKey;

      const raw = Number(previewValues[channel]);

      const fallback = 22 + index * 7;

      return (
        sum +
        (Number.isFinite(raw) ? Math.max(0, raw) : fallback)
      );
    },
    0
  );

  const configuredOutputCount = safeOutputs.filter(
    (output) =>
      output.name &&
      (output.dataSource?.channel ||
        output.dataKey)
  ).length;

  const handleBack = () => {
    // Preserve the same payload so Template Designer can restore its snapshot.
    setSankeyWidget({
      ...sankeyWidget,
      resumeWidgetSettings: true,
    });

    setPage(
      sankeyWidget?.returnPage || "builder"
    );
  };

  const handleSave = () => {
    const cleanOutputs = safeOutputs.map(
      (output, index) => {
        const channel =
          output.dataSource?.channel ||
          output.dataKey ||
          "";

        return {
          id:
            output.id ||
            createId(`output-${index + 1}`),
          name:
            String(output.name || "").trim() ||
            `Sterilizer ${index + 1}`,
          dataKey: channel,
          color: normalizeHexColor(
            output.color,
            SANKEY_COLOR_PRESETS[
              index % SANKEY_COLOR_PRESETS.length
            ]
          ),
          dataSource: {
            ...mappedSource,
            channel,
          },
        };
      }
    );

    const cleanConfig = normalizeSankeyConfig({
      ...config,
      sourceName:
        String(config.sourceName || "").trim() ||
        "Process Source",
      sourceColor: normalizeHexColor(
        config.sourceColor,
        "#2563eb"
      ),
      unit:
        String(config.unit || "").trim() || "t/h",
      outputs: cleanOutputs,
    });

    const dataKeys = unique(
      cleanOutputs.map((output) => output.dataKey)
    );

    setSankeyWidget({
      ...sankeyWidget,
      sankeyConfig: cleanConfig,
      dataKeys,
      dataKey:
        dataKeys[0] ||
        sankeyWidget?.dataKey ||
        "",
      resumeWidgetSettings: true,
    });

    setPage(
      sankeyWidget?.returnPage || "builder"
    );
  };

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

        .sankey-flow-editor-theme[data-theme="dark"] .bg-slate-50 {
          background-color: #0b1220 !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] input,
        .sankey-flow-editor-theme[data-theme="dark"] select {
          background-color: #020617 !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }

        .sankey-flow-editor-theme[data-theme="dark"] option {
          background-color: #020617;
          color: #f8fafc;
        }
      `}</style>

      <div className="flex h-full w-full bg-slate-50 text-slate-900 dark:bg-[#020617] dark:text-slate-100">
        {/* PREVIEW */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white p-5 dark:bg-[#07101f]">
          <div
            className="
              z-20 flex shrink-0 items-center justify-between
              gap-4 rounded-2xl border border-slate-200
              bg-white/95 px-4 py-3 shadow-lg backdrop-blur-xl
              dark:border-slate-700 dark:bg-slate-900/95
            "
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="
                  inline-flex h-10 w-10 shrink-0
                  items-center justify-center rounded-xl
                  border border-slate-200 bg-slate-100
                  text-slate-700 transition hover:bg-slate-200
                  dark:border-slate-700 dark:bg-slate-800
                  dark:text-white dark:hover:bg-slate-700
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

                  <h1 className="truncate text-base font-black text-slate-900 dark:text-white">
                    Sankey Flow Editor
                  </h1>
                </div>

                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  Uses the Data Mapping already configured in Template Designer.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {typeof toggleTheme === "function" && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="
                    inline-flex h-10 w-10 items-center
                    justify-center rounded-xl border
                    border-slate-200 bg-slate-100
                    text-slate-700 transition hover:bg-slate-200
                    dark:border-slate-700 dark:bg-slate-800
                    dark:text-slate-100 dark:hover:bg-slate-700
                  "
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
                disabled={!mappingReady}
                className="
                  inline-flex h-10 items-center gap-2
                  rounded-xl bg-emerald-600 px-4
                  text-sm font-black text-white shadow-lg
                  shadow-emerald-600/20 transition
                  hover:bg-emerald-700
                  disabled:cursor-not-allowed disabled:opacity-45
                "
              >
                <Save size={15} />
                Save
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1">
            <SankeyWidget
              data={previewValues}
              item={{
                ...sankeyWidget,
                sankeyConfig: config,
                label:
                  sankeyWidget?.label ||
                  "Sankey Flow Preview",
              }}
            />
          </div>
        </div>

        {/* SETTINGS */}
        <div className="w-[520px] overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0b1220]">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-start gap-3">
              <div
                className="
                  flex h-10 w-10 shrink-0 items-center
                  justify-center rounded-xl border
                  border-emerald-200 bg-emerald-50
                  text-emerald-600
                  dark:border-emerald-900/60
                  dark:bg-emerald-500/10
                  dark:text-emerald-300
                "
              >
                <Workflow size={19} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Flow Settings
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Choose the field used by each output. Device mapping is inherited automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* TEMPLATE DATA MAPPING */}
            <div
              className={`
                rounded-2xl border p-4
                ${
                  mappingReady
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Database
                      size={16}
                      className={
                        mappingReady
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                    />

                    <h3 className="text-sm font-black">
                      Template Data Mapping
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    This source was configured before opening Widget Settings.
                  </p>
                </div>

                {mappingReady ? (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                ) : (
                  <AlertCircle
                    size={18}
                    className="text-amber-500"
                  />
                )}
              </div>

              {mappingReady ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white/80 p-2.5 dark:bg-slate-950/60">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Bucket
                    </p>
                    <p className="mt-1 truncate font-mono font-bold">
                      {mappedSource.bucket}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/80 p-2.5 dark:bg-slate-950/60">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Measurement
                    </p>
                    <p className="mt-1 truncate font-mono font-bold">
                      {mappedSource.measurement}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-white/80 p-2.5 dark:bg-slate-950/60">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Device
                    </p>
                    <p className="mt-1 truncate font-mono font-bold">
                      {mappedSource.tagKey}={mappedSource.tagValue}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs font-semibold text-amber-700 dark:bg-slate-950/50 dark:text-amber-300">
                  Mapping is incomplete. Return to Template Designer and complete Data Mapping first.
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {loadingChannels
                    ? "Loading mapped fields..."
                    : `${availableChannels.length} field(s) available`}
                </p>

                <button
                  type="button"
                  onClick={fetchMappedChannels}
                  disabled={loadingChannels || !mappingReady}
                  className="
                    inline-flex items-center gap-1.5 rounded-lg
                    bg-slate-800 px-3 py-2 text-[11px]
                    font-black text-white transition
                    hover:bg-slate-700 disabled:cursor-not-allowed
                    disabled:opacity-45
                    dark:bg-slate-700 dark:hover:bg-slate-600
                  "
                >
                  <RefreshCw
                    size={12}
                    className={
                      loadingChannels
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Refresh Fields
                </button>
              </div>

              {channelError && (
                <p className="mt-2 text-xs font-semibold text-red-500">
                  {channelError}
                </p>
              )}
            </div>

            {/* SUMMARY */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-center dark:border-blue-900/50 dark:bg-blue-500/10">
                <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">
                  Source
                </p>
                <p className="mt-1 truncate text-xs font-black text-blue-700 dark:text-blue-300">
                  {config.sourceName || "Source"}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center dark:border-emerald-900/50 dark:bg-emerald-500/10">
                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
                  Configured
                </p>
                <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {configuredOutputCount}/{safeOutputs.length}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-center dark:border-violet-900/50 dark:bg-violet-500/10">
                <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">
                  Preview
                </p>
                <p className="mt-1 text-lg font-black text-violet-700 dark:text-violet-300">
                  {totalPreview.toFixed(
                    Number.isInteger(totalPreview) ? 0 : 1
                  )}
                </p>
              </div>
            </div>

            {/* SOURCE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-black">
                Source Node
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                    className="
                      mt-2 w-full rounded-xl border
                      border-slate-300 bg-white px-3 py-2.5
                      text-sm text-slate-900 outline-none
                      focus:border-emerald-500
                      dark:border-slate-600 dark:bg-slate-950
                      dark:text-white
                    "
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                    className="
                      mt-2 w-full rounded-xl border
                      border-slate-300 bg-white px-3 py-2.5
                      text-sm text-slate-900 outline-none
                      focus:border-emerald-500
                      dark:border-slate-600 dark:bg-slate-950
                      dark:text-white
                    "
                  />

                  <datalist id="sankey-unit-options">
                    {commonUnitOptions.map((unit) => (
                      <option
                        key={unit || "empty"}
                        value={unit}
                      />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Source Color
                </label>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {SANKEY_COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        updateConfig({
                          sourceColor: color,
                        })
                      }
                      className={`
                        h-7 w-7 rounded-lg border-2 transition
                        ${
                          normalizeHexColor(
                            config.sourceColor,
                            "#2563eb"
                          ) === color
                            ? "scale-110 border-slate-900 shadow-sm dark:border-white"
                            : "border-white/80 hover:scale-105 dark:border-slate-700"
                        }
                      `}
                      style={{ backgroundColor: color }}
                      aria-label={`Use source color ${color}`}
                    />
                  ))}

                  <label
                    className="
                      ml-1 inline-flex items-center gap-2
                      rounded-xl border border-slate-200
                      bg-slate-50 px-2.5 py-1.5
                      text-[10px] font-black uppercase
                      tracking-wider text-slate-500
                      dark:border-slate-700
                      dark:bg-slate-950/60
                      dark:text-slate-300
                    "
                  >
                    Custom
                    <input
                      type="color"
                      value={normalizeHexColor(
                        config.sourceColor,
                        "#2563eb"
                      )}
                      onChange={(event) =>
                        updateConfig({
                          sourceColor:
                            event.target.value,
                        })
                      }
                      className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* OUTPUTS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black">
                    Outputs
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Each output selects one available field from the mapped device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addOutput}
                  disabled={!mappingReady}
                  className="
                    inline-flex items-center gap-1 rounded-xl
                    bg-emerald-600 px-3 py-2
                    text-xs font-black text-white
                    transition hover:bg-emerald-700
                    disabled:cursor-not-allowed disabled:opacity-45
                  "
                >
                  <Plus size={14} />
                  Add Output
                </button>
              </div>

              <div className="space-y-3">
                {safeOutputs.map((output, index) => {
                  const selectedChannel =
                    output.dataSource?.channel ||
                    output.dataKey ||
                    "";

                  return (
                    <div
                      key={output.id}
                      className="
                        rounded-2xl border border-slate-200
                        bg-slate-50 p-4
                        dark:border-slate-700
                        dark:bg-slate-950/60
                      "
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Output {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            removeOutput(output.id)
                          }
                          disabled={
                            safeOutputs.length <= 1
                          }
                          className="text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                            className="
                              mt-2 w-full rounded-xl border
                              border-slate-300 bg-white
                              px-3 py-2.5 text-sm text-slate-900
                              outline-none focus:border-emerald-500
                              dark:border-slate-600
                              dark:bg-slate-950 dark:text-white
                            "
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Process Field
                          </label>

                          <select
                            value={selectedChannel}
                            onChange={(event) =>
                              setOutputChannel(
                                output.id,
                                event.target.value
                              )
                            }
                            disabled={
                              !mappingReady ||
                              loadingChannels
                            }
                            className="
                              mt-2 w-full rounded-xl border
                              border-slate-300 bg-white
                              px-3 py-2.5 text-sm text-slate-900
                              outline-none focus:border-emerald-500
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                              dark:border-slate-600
                              dark:bg-slate-950 dark:text-white
                            "
                          >
                            <option value="">
                              {loadingChannels
                                ? "Loading fields..."
                                : availableChannels.length
                                ? "Select field"
                                : "No fields available"}
                            </option>

                            {selectedChannel &&
                              !availableChannels.includes(
                                selectedChannel
                              ) && (
                                <option
                                  value={selectedChannel}
                                >
                                  {selectedChannel}
                                </option>
                              )}

                            {availableChannels.map(
                              (channel) => (
                                <option
                                  key={channel}
                                  value={channel}
                                >
                                  {channel}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      {selectedChannel && (
                        <div
                          className="
                            mt-3 flex items-center gap-2
                            rounded-xl border border-emerald-100
                            bg-emerald-50 px-3 py-2
                            text-[11px] font-semibold
                            text-emerald-700
                            dark:border-emerald-500/20
                            dark:bg-emerald-500/10
                            dark:text-emerald-300
                          "
                        >
                          <CheckCircle2 size={13} />
                          {mappedSource.measurement} / {mappedSource.tagValue} / {selectedChannel}
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Flow Color
                        </label>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {SANKEY_COLOR_PRESETS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                updateOutput(output.id, {
                                  color,
                                })
                              }
                              className={`
                                h-7 w-7 rounded-lg border-2 transition
                                ${
                                  normalizeHexColor(
                                    output.color,
                                    SANKEY_COLOR_PRESETS[
                                      index % SANKEY_COLOR_PRESETS.length
                                    ]
                                  ) === color
                                    ? "scale-110 border-slate-900 shadow-sm dark:border-white"
                                    : "border-white/80 hover:scale-105 dark:border-slate-700"
                                }
                              `}
                              style={{ backgroundColor: color }}
                              aria-label={`Use flow color ${color}`}
                            />
                          ))}

                          <label
                            className="
                              ml-1 inline-flex items-center gap-2
                              rounded-xl border border-slate-200
                              bg-white px-2.5 py-1.5
                              text-[10px] font-black uppercase
                              tracking-wider text-slate-500
                              dark:border-slate-700
                              dark:bg-slate-900
                              dark:text-slate-300
                            "
                          >
                            Custom
                            <input
                              type="color"
                              value={normalizeHexColor(
                                output.color,
                                SANKEY_COLOR_PRESETS[
                                  index % SANKEY_COLOR_PRESETS.length
                                ]
                              )}
                              onChange={(event) =>
                                updateOutput(output.id, {
                                  color:
                                    event.target.value,
                                })
                              }
                              className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

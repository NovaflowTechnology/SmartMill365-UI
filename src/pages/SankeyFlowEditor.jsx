import { useMemo, useState } from "react";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Workflow,
  Database,
  RefreshCw,
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

export default function SankeyFlowEditor({
  sankeyWidget,
  setSankeyWidget,
  setPage,
}) {
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
    <div className="flex h-screen w-full bg-gray-100 text-gray-900 dark:bg-[#050a1e] dark:text-white">
      {/* PREVIEW */}
      <div className="relative flex-1 overflow-hidden p-6">
        <div className="absolute left-6 right-6 top-6 z-20 flex items-center justify-between border border-white/20 bg-slate-950/60 px-5 py-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage(sankeyWidget?.returnPage || "builder")}
              className="bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-lg font-black text-white">
                Sankey Flow Editor
              </h1>

              <p className="text-xs text-gray-300">
                Configure source, outputs, and Influx data sources.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700"
          >
            <Save size={16} />
            Save
          </button>
        </div>

        <div className="h-full pt-24">
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
      <div className="w-[560px] overflow-y-auto border-l border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Workflow size={20} className="text-emerald-500" />
            Flow Settings
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Add output cards. Each output automatically becomes a flow from the source.
          </p>
        </div>

        <div className="space-y-5 p-5">
          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 text-center dark:bg-blue-900/20">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                Source
              </p>
              <p className="mt-1 truncate text-sm font-black text-blue-700 dark:text-blue-300">
                {config.sourceName || "Source"}
              </p>
            </div>

            <div className="bg-emerald-50 p-3 text-center dark:bg-emerald-900/20">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                Outputs
              </p>
              <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">
                {safeOutputs.length}
              </p>
            </div>

            <div className="bg-amber-50 p-3 text-center dark:bg-amber-900/20">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                Total
              </p>
              <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-300">
                {totalPreview.toFixed(Number.isInteger(totalPreview) ? 0 : 1)}
              </p>
            </div>
          </div>

          {/* SOURCE */}
          <div className="border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
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
                  className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
                  className="mt-2 w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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
          <div className="border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black">
                  <Database size={16} className="text-emerald-500" />
                  Influx Options
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Reload device ID and channel suggestions, then reload each output to get device-specific channels.
                </p>
              </div>

              <button
                type="button"
                onClick={reloadInfluxOptions}
                disabled={influxLoading}
                className="inline-flex items-center gap-2 bg-slate-800 px-4 py-2 text-xs font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
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
                className="inline-flex items-center gap-1 bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
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
                    className="border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">
                            {uniqueDeviceIdOptions.length
                              ? "Select available ID"
                              : "Click Reload to load device IDs"}
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
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
                          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between gap-3 border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
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
                          className="inline-flex items-center gap-2 bg-slate-800 px-3 py-2 text-xs font-black text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            Actual dashboard data requires Bucket, Measurement, Device ID, and Channel to match your InfluxDB device exactly. If actual data is unavailable, this flow will display 0 instead of a backup value.
          </div>
        </div>
      </div>
    </div>
  );
}

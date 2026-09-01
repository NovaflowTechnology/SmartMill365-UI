import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Factory,
  RefreshCw,
} from "lucide-react";
import {
  DEFAULT_PROCESS_VIEW_CONFIG,
  normalizeProcessViewConfig,
} from "./ProcessViewWidget";
import { listProcessFlows } from "../process/processFlowApi";

export default function ProcessViewSettings({
  config,
  onChange,
}) {
  const normalized = useMemo(
    () =>
      normalizeProcessViewConfig(
        config ||
          DEFAULT_PROCESS_VIEW_CONFIG
      ),
    [config]
  );

  const [flows, setFlows] =
    useState([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const loadFlows = async () => {
    try {
      setLoading(true);
      setError("");

      const result =
        await listProcessFlows();

      setFlows(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to load process flows"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const patch = (nextPatch) => {
    onChange?.(
      normalizeProcessViewConfig({
        ...normalized,
        ...nextPatch,
      })
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
            Saved Process Flow
          </label>

          <button
            type="button"
            onClick={loadFlows}
            disabled={loading}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[8px] font-semibold text-slate-500 hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            <RefreshCw
              size={10}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        <select
          value={
            normalized.processFlowId || ""
          }
          onChange={(event) =>
            patch({
              processFlowId:
                event.target.value
                  ? Number(
                      event.target.value
                    )
                  : null,
            })
          }
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <option value="">
            Legacy / latest Plant Simulator save
          </option>
          {flows.map((flow) => (
            <option
              key={flow.id}
              value={flow.id}
            >
              {flow.name}
              {flow.organization_name
                ? ` · ${flow.organization_name}`
                : ""}
            </option>
          ))}
        </select>

        {error ? (
          <p className="mt-1 text-[8px] text-rose-500">
            {error}
          </p>
        ) : (
          <p className="mt-1 text-[8px] leading-4 text-slate-400">
            The widget renders this saved Process Flow directly. Changes saved in Plant Simulator are reflected in the dashboard without copying the topology into the widget.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-[10px] font-bold text-slate-500 dark:text-slate-300">
            Data Mode
          </span>
          <select
            value={normalized.mode}
            onChange={(event) =>
              patch({
                mode:
                  event.target.value,
              })
            }
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="inherit">
              Inherit from process flow
            </option>
            <option value="live">
              Live only
            </option>
            <option value="hybrid">
              Hybrid
            </option>
            <option value="fake">
              Simulation / fake
            </option>
          </select>
        </label>

        <div className="flex items-end">
          <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-[9px] font-semibold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
            <Factory size={13} />
            One saved flow = one source of truth
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["showLabels", "Equipment labels"],
          ["showMetrics", "Data cards"],
          ["showFlowLabels", "Pipe labels"],
          ["showInspector", "Inspector"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <input
              type="checkbox"
              checked={
                normalized[key] !== false
              }
              onChange={(event) =>
                patch({
                  [key]:
                    event.target.checked,
                })
              }
              className="h-3.5 w-3.5 accent-cyan-500"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

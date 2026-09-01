import { ScrollText } from "lucide-react";

export default function EventsAlarmsSettings({
  newLogDisplay,
  setNewLogDisplay,
}) {
  if (!newLogDisplay) return null;

  return (
    <div
      className="
        rounded-xl border
        border-gray-200 bg-gray-50
        p-4
        dark:border-slate-700
        dark:bg-slate-950
      "
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className="
            flex h-10 w-10
            shrink-0 items-center
            justify-center rounded-xl
            bg-blue-100 text-blue-600
            dark:bg-blue-500/15
            dark:text-blue-300
          "
        >
          <ScrollText size={19} />
        </div>

        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">
            Events & Alarms
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Use the same event feed as a chronological Event Log, a four-severity Alarm Summary, or a detailed Alarm List.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
          Display Style
        </label>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              value: "event-log",
              label: "Event Log",
              description: "Chronological activity",
            },
            {
              value: "alarm-summary",
              label: "Alarm Summary",
              description: "High / Medium / Low / Info",
            },
            {
              value: "alarm-list",
              label: "Alarm List",
              description: "Detailed active alarms",
            },
          ].map((mode) => {
            const selected =
              (newLogDisplay.mode || "event-log") ===
              mode.value;

            return (
              <button
                key={mode.value}
                type="button"
                onClick={() =>
                  setNewLogDisplay((previous) => ({
                    ...previous,
                    mode: mode.value,
                  }))
                }
                className={`rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15 dark:border-blue-400 dark:bg-blue-500/10"
                    : "border-gray-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <span className="block text-sm font-bold text-gray-900 dark:text-white">
                  {mode.label}
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-gray-500 dark:text-slate-400">
                  {mode.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(newLogDisplay.mode || "event-log") !==
        "alarm-summary" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              Sort Order
            </label>
            <select
              value={newLogDisplay.sortOrder}
              onChange={(event) =>
                setNewLogDisplay((previous) => ({
                  ...previous,
                  sortOrder: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              Maximum Entries
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={newLogDisplay.maxEntries}
              onChange={(event) =>
                setNewLogDisplay((previous) => ({
                  ...previous,
                  maxEntries: Math.min(
                    500,
                    Math.max(
                      1,
                      Number(event.target.value) || 1
                    )
                  ),
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {(newLogDisplay.mode || "event-log") ===
        "event-log" && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: "showTimestamp", label: "Show Timestamp" },
              { key: "showSource", label: "Show Source" },
              { key: "showLevel", label: "Show Level" },
              { key: "showSearch", label: "Show Search" },
              { key: "compact", label: "Compact Rows" },
            ].map((option) => (
              <label
                key={option.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  {option.label}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(
                    newLogDisplay[option.key]
                  )}
                  onChange={(event) =>
                    setNewLogDisplay((previous) => ({
                      ...previous,
                      [option.key]: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-blue-600"
                />
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              Visible Event Levels
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["info", "success", "warning", "error"].map(
                (level) => {
                  const selected = (
                    newLogDisplay.levelFilter || []
                  ).includes(level);

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setNewLogDisplay((previous) => {
                          const levels =
                            previous.levelFilter || [];

                          return {
                            ...previous,
                            levelFilter: levels.includes(
                              level
                            )
                              ? levels.filter(
                                  (item) => item !== level
                                )
                              : [...levels, level],
                          };
                        })
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-bold capitalize transition ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {level}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </>
      )}

      {(newLogDisplay.mode || "event-log") ===
        "alarm-list" && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { key: "showTimestamp", label: "Show Timestamp" },
            { key: "showSource", label: "Show Equipment / Source" },
            { key: "showSearch", label: "Show Search" },
          ].map((option) => (
            <label
              key={option.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {option.label}
              </span>
              <input
                type="checkbox"
                checked={Boolean(
                  newLogDisplay[option.key]
                )}
                onChange={(event) =>
                  setNewLogDisplay((previous) => ({
                    ...previous,
                    [option.key]: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-blue-600"
              />
            </label>
          ))}
        </div>
      )}

      {(newLogDisplay.mode || "event-log") !==
        "event-log" && (
        <>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-gray-800 dark:text-white">
                Alarm Severity Mapping
              </label>

              {(newLogDisplay.mode || "event-log") ===
                "alarm-summary" && (
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={
                      newLogDisplay.showZeroSeverities !==
                      false
                    }
                    onChange={(event) =>
                      setNewLogDisplay((previous) => ({
                        ...previous,
                        showZeroSeverities:
                          event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-blue-600"
                  />
                  Show zero counts
                </label>
              )}
            </div>

            <p className="mt-1 text-[10px] leading-4 text-gray-500 dark:text-slate-400">
              Enter the incoming event values that should be treated as each alarm severity. Separate values with commas.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {["high", "medium", "low", "info"].map(
                (severity) => (
                  <label key={severity}>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                      {severity}
                    </span>
                    <input
                      type="text"
                      value={(
                        newLogDisplay.severityMap?.[
                          severity
                        ] || []
                      ).join(", ")}
                      onChange={(event) =>
                        setNewLogDisplay((previous) => ({
                          ...previous,
                          severityMap: {
                            ...(previous.severityMap || {}),
                            [severity]: event.target.value
                              .split(",")
                              .map((value) =>
                                value
                                  .trim()
                                  .toLowerCase()
                              )
                              .filter(Boolean),
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </label>
                )
              )}
            </div>
          </div>

          {(newLogDisplay.mode || "event-log") ===
            "alarm-list" && (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                Visible Alarm Severities
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["high", "medium", "low", "info"].map(
                  (severity) => {
                    const selected = (
                      newLogDisplay.severityFilter || []
                    ).includes(severity);

                    return (
                      <button
                        key={severity}
                        type="button"
                        onClick={() =>
                          setNewLogDisplay((previous) => {
                            const levels =
                              previous.severityFilter || [];

                            return {
                              ...previous,
                              severityFilter:
                                levels.includes(severity)
                                  ? levels.filter(
                                      (item) =>
                                        item !== severity
                                    )
                                  : [...levels, severity],
                            };
                          })
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-bold capitalize transition ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {severity}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
        The internal widget type remains <b>logs</b> for backward compatibility. Only the display style changes, so existing saved templates continue to work.
      </div>
    </div>

  );
}

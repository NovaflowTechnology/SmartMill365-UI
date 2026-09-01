export default function RangeThresholdSettings({
  enabled,
  newType,
  newChartDisplay,
  newRangeConfig,
  setNewRangeConfig,
  isThresholdEnabled,
  getDefaultThresholdValue,
}) {
  if (!enabled) return null;

  const updateField = (key, value) => {
    setNewRangeConfig((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const toggleThreshold = (key, nextEnabled) => {
    setNewRangeConfig((previous) => ({
      ...previous,
      [key]: nextEnabled
        ? getDefaultThresholdValue(key, previous)
        : "",
    }));
  };

  const thresholdDefinitions = [
    {
      key: "warning",
      label: "Warning",
      description: "Highlight values approaching an unsafe range.",
      activeClass:
        "border-amber-200 bg-amber-50/60 dark:border-amber-900/70 dark:bg-amber-950/20",
      dotClass: "bg-amber-500",
      toggleClass: "bg-amber-500",
      focusClass: "focus:border-amber-400 focus:ring-amber-400/20",
    },
    {
      key: "danger",
      label: "Danger",
      description: "Highlight values that require immediate attention.",
      activeClass:
        "border-red-200 bg-red-50/60 dark:border-red-900/70 dark:bg-red-950/20",
      dotClass: "bg-red-500",
      toggleClass: "bg-red-500",
      focusClass: "focus:border-red-400 focus:ring-red-400/20",
    },
  ];

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-4">
        <h3 className="font-bold dark:text-white">
          Data Range and Thresholds
        </h3>

        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Configure the unit and expected operating range. Warning and danger
          thresholds are optional.
        </p>

        {newType === "line" && newChartDisplay.yAxisMode === "auto" && (
          <p className="mt-2 text-[10px] font-medium leading-4 text-blue-600 dark:text-blue-300">
            Automatic Y-axis is active: Minimum and Maximum remain saved as the
            widget&apos;s expected range, but they do not control the chart Y-axis
            while live/history data is available.
          </p>
        )}
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        {[
          { key: "min", label: "Minimum" },
          { key: "max", label: "Maximum" },
        ].map((field) => (
          <div key={field.key} className="min-w-0">
            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
              {field.label}
            </label>
            <input
              type="number"
              step="any"
              value={newRangeConfig[field.key] ?? ""}
              onChange={(event) => updateField(field.key, event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>
        ))}
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
          Unit
        </label>
        <input
          type="text"
          placeholder="Example: bar, psi, °C"
          value={newRangeConfig.unit}
          onChange={(event) => updateField("unit", event.target.value)}
          className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="my-4 h-px bg-slate-200 dark:bg-slate-800" />

      <div className="mb-2.5">
        <div className="text-xs font-black text-slate-700 dark:text-slate-200">
          Optional Thresholds
        </div>
        <p className="mt-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          Turn on only the threshold levels you want this widget to use.
        </p>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        }}
      >
        {thresholdDefinitions.map((threshold) => {
          const thresholdEnabled = isThresholdEnabled(
            newRangeConfig[threshold.key]
          );

          return (
            <div
              key={threshold.key}
              className={`min-w-0 rounded-xl border p-3 transition ${
                thresholdEnabled
                  ? threshold.activeClass
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        thresholdEnabled
                          ? threshold.dotClass
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {threshold.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] leading-3.5 text-slate-500 dark:text-slate-400">
                    {threshold.description}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={thresholdEnabled}
                  aria-label={`${threshold.label} threshold`}
                  onClick={() =>
                    toggleThreshold(threshold.key, !thresholdEnabled)
                  }
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
                    thresholdEnabled
                      ? threshold.toggleClass
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      thresholdEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-3">
                <label className="mb-1.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Threshold value
                </label>
                <input
                  type="number"
                  step="any"
                  value={newRangeConfig[threshold.key] ?? ""}
                  disabled={!thresholdEnabled}
                  placeholder={thresholdEnabled ? "Enter value" : "Disabled"}
                  onChange={(event) =>
                    updateField(threshold.key, event.target.value)
                  }
                  className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${
                    thresholdEnabled
                      ? `border-slate-300 dark:border-slate-600 ${threshold.focusClass}`
                      : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        These settings are saved directly with this widget and are used by the
        dashboard at runtime.
      </div>
    </div>
  );
}

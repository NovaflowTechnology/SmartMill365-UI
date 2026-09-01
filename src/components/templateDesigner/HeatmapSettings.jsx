export default function HeatmapSettings({
  newType,
  newHistoryWindow,
  setNewHistoryWindow,
  newChartDisplay,
  setNewChartDisplay,
}) {
  if (newType !== "heatmap") return null;

  return (
    <div
      className="
        mt-4 rounded-xl border
        border-cyan-200/80
        bg-gradient-to-br
        from-cyan-50/70 via-white
        to-blue-50/60 p-4
        dark:border-cyan-500/20
        dark:from-cyan-950/20
        dark:via-slate-950
        dark:to-blue-950/20
      "
    >
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">
          Heatmap Display
        </h3>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
          Best for comparing the same measurement across multiple devices or sources over time. Use sources with comparable units and ranges.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
            Time Window
          </label>
          <select
            value={newHistoryWindow}
            onChange={(event) => setNewHistoryWindow(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="30m">30 minutes</option>
            <option value="1h">1 hour</option>
            <option value="3h">3 hours</option>
            <option value="6h">6 hours</option>
            <option value="12h">12 hours</option>
            <option value="24h">24 hours</option>
            <option value="2d">2 days</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
            Time Columns
          </label>
          <select
            value={newChartDisplay.heatmapColumns || 16}
            onChange={(event) =>
              setNewChartDisplay((previous) => ({
                ...previous,
                heatmapColumns: Number(event.target.value),
              }))
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value={8}>8 · Low density</option>
            <option value={12}>12</option>
            <option value={16}>16 · Recommended</option>
            <option value={24}>24</option>
            <option value={32}>32 · High density</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["heatmapShowLegend", "Range legend"],
          ["heatmapShowTimeLabels", "Time labels"],
          ["heatmapShowValues", "Cell values"],
        ].map(([key, text]) => (
          <label
            key={key}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
          >
            <input
              type="checkbox"
              checked={Boolean(newChartDisplay[key])}
              onChange={(event) =>
                setNewChartDisplay((previous) => ({
                  ...previous,
                  [key]: event.target.checked,
                }))
              }
            />
            <span className="text-xs font-semibold text-gray-700 dark:text-white">
              {text}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-sky-50 px-3 py-2 text-[10px] leading-4 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
        Normal values use blue intensity. If Warning or Danger thresholds are enabled in Data Range below, those cells are highlighted amber or red.
      </div>
    </div>
  );
}

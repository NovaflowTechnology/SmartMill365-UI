import {
  CheckCircle2,
  LayoutGrid,
  Plus,
  X,
} from "lucide-react";

export default function WidgetTypePanel({
  allWidgetOptions = [],
  newWidgetTypeId = "",
  newType = "",
  handleWidgetTypeChange = () => {},
  deleteCustomWidgetType = () => {},
  setShowCustomWidgetModal = () => {},
  newDataKeys = [],
  newDataKey = "",
  newCompositeConfig = {},
  getCompatibleCompositePresets = () => [],
  handleCompositePresetChange = () => {},
  setNewCompositeConfig = () => {},
  getCompositePreset = () => ({
    label: "",
    primaryType: "",
    secondaryType: "",
  }),
  renderCompositePartConfiguration = () => null,
  setWidgetStep = () => {},
  goToNextWidgetStep = () => {},
}) {
  return (
    <>
      <div
        className="
          bg-gray-50 dark:bg-slate-950
          border border-gray-200 dark:border-slate-700
          rounded-xl
          p-4
        "
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold dark:text-white">
              Widget Type
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-300">
              Pick the visualization first. Only settings that apply to it will appear below.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomWidgetModal(true)}
            className="
              inline-flex shrink-0
              items-center justify-center
              gap-1.5 rounded-xl
              border border-slate-200
              bg-white px-2.5 py-2
              text-[11px] font-semibold
              text-slate-600 transition
              hover:border-emerald-300
              hover:text-emerald-700
              dark:border-slate-700
              dark:bg-slate-900
              dark:text-slate-300
            "
            title="Add custom widget type"
          >
            <Plus size={14} />
            <span className="hidden xl:inline">
              Custom
            </span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {allWidgetOptions.map((w) => {
            const Icon = w.icon || LayoutGrid;
            const selected = w.isCustomWidgetType
              ? newWidgetTypeId === w.optionId
              : !newWidgetTypeId && newType === w.type;

            return (
              <button
                key={w.optionId}
                type="button"
                onClick={() =>
                  handleWidgetTypeChange(
                    w.type,
                    w.isCustomWidgetType ? w.optionId : ""
                  )
                }
                className={`
                  relative flex min-h-[68px] min-w-0 flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-colors
                  ${
                    selected
                      ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-500/20"
                      : "bg-white dark:bg-slate-900 hover:bg-gray-100 dark:bg-[#050a1e] dark:hover:bg-gray-800 border-gray-200 dark:border-slate-700 dark:text-white"
                  }
                `}
                title={w.label}
                aria-label={w.label}
              >
                {w.isCustomWidgetType && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCustomWidgetType(w.optionId);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.stopPropagation();
                        deleteCustomWidgetType(w.optionId);
                      }
                    }}
                    className={`absolute right-2 top-2 rounded-lg p-1 transition ${
                      selected
                        ? "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                        : "text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                    }`}
                    title="Delete custom widget type"
                  >
                    <X size={14} />
                  </span>
                )}

                <Icon className="mb-1.5 h-5 w-5 shrink-0" />

                <div className="line-clamp-2 min-w-0 break-words text-[11px] font-semibold leading-[1.15]">
                  {w.label}
                </div>

                <div
                  className={`
                    hidden
                    ${
                      selected
                        ? "text-emerald-50"
                        : "text-gray-400 dark:text-slate-400"
                    }
                  `}
                >
                  {w.isCustomWidgetType
                    ? w.description || `Based on ${w.baseType}`
                    : w.type === "gauge"
                    ? "Circular / linear gauge"
                    : w.type === "line"
                    ? "Trend over time"
                    : w.type === "image"
                    ? "Mimic diagram"
                    : w.type === "bar"
                    ? "Bar comparison"
                    : w.type === "bignumber"
                    ? "KPI number"
                    : w.type === "composite"
                    ? "Two compatible views in one card"
                    : w.type === "alarm"
                    ? "Status warning"
                    : w.type === "pie"
                    ? "Ratio chart"
                    : w.type === "sankey"
                    ? "Flow split diagram"
                    : "Widget"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {newType === "composite" && (
        <div
          className="
            mt-4 rounded-xl border
            border-gray-200 bg-gray-50
            p-4
            dark:border-slate-700
            dark:bg-slate-950
          "
        >
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">
              Composite Layout
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
              Choose the two views to combine. The live preview updates immediately when you select a preset.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {getCompatibleCompositePresets(
              Math.max(
                1,
                newDataKeys.length ||
                  (newDataKey ? 1 : 0)
              )
            ).map((preset) => {
              const selected =
                newCompositeConfig.preset ===
                preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    handleCompositePresetChange(
                      preset
                    )
                  }
                  className={`
                    rounded-xl border p-4
                    text-left transition-all
                    ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-500/10 dark:ring-emerald-500/30"
                        : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {preset.label}
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                        {preset.description}
                      </p>
                    </div>

                    {selected && (
                      <CheckCircle2
                        size={17}
                        className="shrink-0 text-emerald-600 dark:text-emerald-300"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                Arrangement
              </label>

              <select
                value={newCompositeConfig.layout}
                onChange={(event) =>
                  setNewCompositeConfig(
                    (previous) => ({
                      ...previous,
                      layout:
                        event.target.value,
                    })
                  )
                }
                className="
                  w-full rounded-xl
                  border border-gray-300
                  bg-white px-4 py-2.5
                  text-gray-900 outline-none
                  focus:ring-2 focus:ring-emerald-500
                  dark:border-slate-600
                  dark:bg-slate-900
                  dark:text-white
                "
              >
                <option value="horizontal">
                  Side by Side
                </option>
                <option value="vertical">
                  KPI / Chart Stacked
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-white">
                <span>Primary Size</span>
                <span className="text-xs text-gray-400">
                  {newCompositeConfig.ratio}%
                </span>
              </label>

              <input
                type="range"
                min="25"
                max="70"
                step="1"
                value={newCompositeConfig.ratio}
                onChange={(event) =>
                  setNewCompositeConfig(
                    (previous) => ({
                      ...previous,
                      ratio: Number(
                        event.target.value
                      ),
                    })
                  )
                }
                className="w-full accent-emerald-600"
              />
            </div>
          </div>

          <div
            className="
              mt-4 overflow-hidden
              rounded-xl border
              border-gray-200 bg-white
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            <div
              className={
                newCompositeConfig.layout ===
                "horizontal"
                  ? "flex h-28"
                  : "flex h-36 flex-col"
              }
            >
              <div
                className="
                  flex items-center justify-center
                  border-gray-200
                  bg-blue-50 text-xs
                  font-bold text-blue-700
                  dark:bg-blue-500/10
                  dark:text-blue-300
                "
                style={{
                  ...(newCompositeConfig.layout ===
                  "horizontal"
                    ? {
                        width: `${newCompositeConfig.ratio}%`,
                        borderRightWidth: 1,
                      }
                    : {
                        height: `${newCompositeConfig.ratio}%`,
                        borderBottomWidth: 1,
                      }),
                }}
              >
                {
                  getCompositePreset(
                    newCompositeConfig.preset
                  ).label.split(" + ")[0]
                }
              </div>

              <div
                className="
                  flex flex-1 items-center
                  justify-center text-xs
                  font-bold text-slate-500
                  dark:text-slate-300
                "
              >
                {
                  getCompositePreset(
                    newCompositeConfig.preset
                  ).label.split(" + ")[1]
                }
              </div>
            </div>
          </div>

          <div
            className="
              mt-4 rounded-xl
              border border-slate-200
              bg-slate-50/70 p-3
              dark:border-slate-700
              dark:bg-slate-950/60
            "
          >
            <div className="mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Configure Combined Widgets
              </h3>

              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                Configure each child independently. Child labels, source selection, ranges, chart settings, and Pie options are saved with this Composite widget.
              </p>
            </div>

            <div className="space-y-2">
              {renderCompositePartConfiguration(
                "primary",
                getCompositePreset(
                  newCompositeConfig.preset
                ).primaryType
              )}

              {renderCompositePartConfiguration(
                "secondary",
                getCompositePreset(
                  newCompositeConfig.preset
                ).secondaryType
              )}
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <button
          type="button"
          onClick={() => setWidgetStep(1)}
          className="
            rounded-xl border
            border-gray-300 bg-white
            px-5 py-3 font-semibold
            text-gray-700 transition
            hover:bg-gray-100
            dark:border-slate-600
            dark:bg-slate-900
            dark:text-white
            dark:hover:bg-slate-800
          "
        >
          Back
        </button>

        <button
          type="button"
          onClick={goToNextWidgetStep}
          className="
            rounded-xl
            bg-emerald-600 hover:bg-emerald-700
            text-white
            px-6 py-3
            font-semibold
            transition
          "
        >
          Next: Appearance
        </button>
      </div>

    </>
  );
}

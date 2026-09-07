const PIE_STYLES = [
  {
    key: "donut",
    label: "Donut",
    description: "Balanced ring with center total.",
  },
  {
    key: "pie",
    label: "Solid Pie",
    description: "Classic full-circle composition.",
  },
  {
    key: "exploded",
    label: "Exploded",
    description: "Separated slices for stronger emphasis.",
  },
  {
    key: "thinRing",
    label: "Thin Ring",
    description: "Lightweight ring for compact dashboards.",
  },
];

function MiniPie({
  styleType,
}) {
  const inner =
    styleType === "donut"
      ? "28%"
      : styleType === "thinRing"
      ? "38%"
      : "0";

  const gap =
    styleType === "exploded"
      ? "5px"
      : "0";

  return (
    <div
      className="relative h-11 w-11 shrink-0"
      style={{
        filter:
          styleType === "exploded"
            ? "drop-shadow(0 3px 4px rgba(15,23,42,.16))"
            : "none",
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(#0891B2 0 31%, #2F79D3 31% 55%, #7D75E7 55% 76%, #22B8A7 76% 100%)",
          transform:
            styleType === "exploded"
              ? "scale(.88)"
              : "none",
          boxShadow:
            styleType === "exploded"
              ? `0 0 0 ${gap} white`
              : "none",
        }}
      />

      {inner !== "0" && (
        <div
          className="absolute rounded-full bg-white dark:bg-slate-950"
          style={{
            inset: inner,
          }}
        />
      )}

      {styleType === "exploded" && (
        <>
          <div className="absolute left-[2px] top-[14px] h-3 w-3 -translate-x-1 rounded-full bg-[#2F79D3]" />
          <div className="absolute right-[1px] top-[4px] h-3 w-3 translate-x-0.5 rounded-full bg-[#22B8A7]" />
        </>
      )}
    </div>
  );
}

export default function PieDisplaySettings({
  value,
  onChange,
}) {
  const pieDisplay = {
    style: "donut",
    showLegend: true,
    showTotal: true,
    showTooltip: true,
    showSliceLabels: false,
    legendPosition: "auto",
    ...(value || {}),
  };

  const patch = (next) =>
    onChange?.({
      ...pieDisplay,
      ...next,
    });

  const centerTotalAvailable =
    pieDisplay.style === "donut" ||
    pieDisplay.style === "thinRing";

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          Pie Style
        </h3>

        <p className="mt-0.5 text-[10px] text-gray-500 dark:text-slate-400">
          Choose the slice layout and labels.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PIE_STYLES.map((option) => {
          const selected =
            pieDisplay.style ===
            option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                patch({
                  style: option.key,
                  showTotal:
                    option.key ===
                      "donut" ||
                    option.key ===
                      "thinRing"
                      ? pieDisplay.showTotal
                      : false,
                })
              }
              className={`relative min-w-0 rounded-lg border p-2 text-left transition ${
                selected
                  ? "border-[#0891B2] bg-cyan-50/70 ring-1 ring-cyan-200 dark:bg-cyan-500/10 dark:ring-cyan-500/20"
                  : "border-gray-200 bg-gray-50/60 hover:border-cyan-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950/50 dark:hover:bg-slate-900"
              }`}
            >
              {selected && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#0891B2]" />
              )}

              <div className="flex items-center gap-2">
                <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white dark:bg-slate-950">
                  <MiniPie
                    styleType={
                      option.key
                    }
                  />
                </div>

                <div className="min-w-0">
                  <div
                    className={`truncate text-[10px] font-black ${
                      selected
                        ? "text-[#087C99] dark:text-cyan-300"
                        : "text-slate-800 dark:text-white"
                    }`}
                  >
                    {option.label}
                  </div>

                  <div className="mt-0.5 line-clamp-2 text-[8px] leading-3 text-slate-400">
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={
              pieDisplay.showLegend !==
              false
            }
            onChange={(event) =>
              patch({
                showLegend:
                  event.target.checked,
              })
            }
          />
          Legend
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={
              pieDisplay.showSliceLabels ===
              true
            }
            onChange={(event) =>
              patch({
                showSliceLabels:
                  event.target.checked,
              })
            }
          />
          Percentages
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[9px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={
              pieDisplay.showTooltip !==
              false
            }
            onChange={(event) =>
              patch({
                showTooltip:
                  event.target.checked,
              })
            }
          />
          Tooltip
        </label>

        <label
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[9px] font-semibold ${
            centerTotalAvailable
              ? "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              : "cursor-not-allowed border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600"
          }`}
        >
          <input
            type="checkbox"
            disabled={
              !centerTotalAvailable
            }
            checked={
              centerTotalAvailable &&
              pieDisplay.showTotal !==
                false
            }
            onChange={(event) =>
              patch({
                showTotal:
                  event.target.checked,
              })
            }
          />
          Center total
        </label>
      </div>

      {pieDisplay.showLegend !==
        false && (
        <div className="mt-3">
          <label className="mb-1 block text-[9px] font-bold text-slate-500 dark:text-slate-300">
            Legend position
          </label>

          <select
            value={
              pieDisplay.legendPosition ||
              "auto"
            }
            onChange={(event) =>
              patch({
                legendPosition:
                  event.target.value,
              })
            }
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="auto">
              Automatic
            </option>
            <option value="side">
              Side
            </option>
            <option value="bottom">
              Bottom
            </option>
          </select>
        </div>
      )}
    </div>
  );
}

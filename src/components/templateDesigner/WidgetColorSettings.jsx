import { RotateCcw } from "lucide-react";

const DEFAULT_SERIES_COLORS = [
  "#35C9F4",
  "#2F79D3",
  "#7D75E7",
  "#22B8A7",
  "#F2B33D",
  "#EF4653",
  "#A86BDF",
  "#14B8A6",
];

const normalizeHex = (
  value,
  fallback = "#35C9F4"
) => {
  const text = String(value || "").trim();

  return /^#[0-9a-fA-F]{6}$/.test(text)
    ? text.toUpperCase()
    : fallback;
};

const getDataLabel = (
  key,
  dataOptions
) =>
  dataOptions.find(
    (option) => option.key === key
  )?.label || key;

function ColorField({
  label,
  value,
  fallback,
  onChange,
}) {
  const resolved = normalizeHex(
    value,
    fallback
  );

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-950/50">
      <span
        className="min-w-0 truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200"
        title={label}
      >
        {label}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        <input
          type="color"
          value={resolved}
          onChange={(event) =>
            onChange(
              event.target.value.toUpperCase()
            )
          }
          className="h-7 w-8 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
          aria-label={`${label} color`}
        />

        <input
          type="text"
          value={value || ""}
          placeholder={fallback}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          onBlur={(event) =>
            onChange(
              normalizeHex(
                event.target.value,
                fallback
              )
            )
          }
          className="h-7 w-[80px] rounded-md border border-slate-200 bg-white px-2 font-mono text-[9px] uppercase text-slate-600 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        />
      </div>
    </div>
  );
}

export default function WidgetColorSettings({
  newType,
  selectedDataKeys = [],
  dataOptions = [],
  chartDisplay = {},
  setChartDisplay,
  gaugeDisplay = {},
  setGaugeDisplay,
  bigNumberDisplay = {},
  setBigNumberDisplay,
}) {
  const selectedKeys = [
    ...new Set(
      selectedDataKeys.filter(Boolean)
    ),
  ];

  const seriesTypes = [
    "line",
    "bar",
    "pie",
  ];

  const supported =
    seriesTypes.includes(newType) ||
    newType === "heatmap" ||
    newType === "gauge" ||
    newType === "bignumber";

  if (!supported) {
    return null;
  }

  const updateSeriesColor = (
    key,
    color
  ) => {
    setChartDisplay?.(
      (previous) => ({
        ...previous,
        seriesColors: {
          ...(previous.seriesColors ||
            {}),
          [key]: color,
        },
      })
    );
  };

  const resetSeriesColors = () => {
    setChartDisplay?.(
      (previous) => ({
        ...previous,
        seriesColors: {},
      })
    );
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Widget Colors
          </h3>

          <p className="mt-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
            Customize the main visual color without changing the data source.
          </p>
        </div>

        {seriesTypes.includes(
          newType
        ) &&
          selectedKeys.length > 0 && (
            <button
              type="button"
              onClick={resetSeriesColors}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[9px] font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          )}
      </div>

      {seriesTypes.includes(
        newType
      ) && (
        <div className="space-y-1.5">
          {selectedKeys.length ? (
            selectedKeys.map(
              (key, index) => {
                const fallback =
                  DEFAULT_SERIES_COLORS[
                    index %
                      DEFAULT_SERIES_COLORS.length
                  ];

                return (
                  <ColorField
                    key={key}
                    label={getDataLabel(
                      key,
                      dataOptions
                    )}
                    value={
                      chartDisplay
                        .seriesColors?.[
                        key
                      ] || fallback
                    }
                    fallback={fallback}
                    onChange={(color) =>
                      updateSeriesColor(
                        key,
                        color
                      )
                    }
                  />
                );
              }
            )
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-[9px] text-slate-400 dark:border-slate-700">
              Choose a data source first.
            </div>
          )}
        </div>
      )}

      {newType === "gauge" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: "status",
                label: "Default status colors",
              },
              {
                value: "custom",
                label: "Custom status colors",
              },
            ].map((option) => {
              const selected =
                (gaugeDisplay
                  .colorMode ||
                  "status") ===
                option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setGaugeDisplay?.(
                      (previous) => ({
                        ...previous,
                        colorMode:
                          option.value,
                      })
                    )
                  }
                  className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                    selected
                      ? "border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {(gaugeDisplay
            .colorMode ||
            "status") ===
            "custom" && (
            <div className="space-y-1.5">
              <ColorField
                label="Normal"
                value={
                  gaugeDisplay
                    .normalColor ||
                  gaugeDisplay
                    .customColor ||
                  "#3B82F6"
                }
                fallback="#3B82F6"
                onChange={(color) =>
                  setGaugeDisplay?.(
                    (previous) => ({
                      ...previous,
                      normalColor:
                        color,
                      customColor:
                        color,
                    })
                  )
                }
              />

              <ColorField
                label="Warning"
                value={
                  gaugeDisplay
                    .warningColor ||
                  "#F59E0B"
                }
                fallback="#F59E0B"
                onChange={(color) =>
                  setGaugeDisplay?.(
                    (previous) => ({
                      ...previous,
                      warningColor:
                        color,
                    })
                  )
                }
              />

              <ColorField
                label="Danger"
                value={
                  gaugeDisplay
                    .dangerColor ||
                  "#F43F5E"
                }
                fallback="#F43F5E"
                onChange={(color) =>
                  setGaugeDisplay?.(
                    (previous) => ({
                      ...previous,
                      dangerColor:
                        color,
                    })
                  )
                }
              />
            </div>
          )}

          <p className="text-[9px] leading-4 text-slate-400">
            The gauge changes color automatically when its value moves between Normal, Warning, and Danger.
          </p>
        </div>
      )}

      {newType === "heatmap" && (
        <ColorField
          label="Normal heat color"
          value={
            chartDisplay
              .heatmapColor ||
            "#0EA5E9"
          }
          fallback="#0EA5E9"
          onChange={(color) =>
            setChartDisplay?.(
              (previous) => ({
                ...previous,
                heatmapColor:
                  color,
              })
            )
          }
        />
      )}

      {newType ===
        "bignumber" && (
        <ColorField
          label="Value color"
          value={
            bigNumberDisplay
              .customValueColor ||
            "#0F172A"
          }
          fallback="#0F172A"
          onChange={(color) =>
            setBigNumberDisplay?.(
              (previous) => ({
                ...previous,
                valueColor:
                  "custom",
                customValueColor:
                  color,
              })
            )
          }
        />
      )}
    </div>
  );
}

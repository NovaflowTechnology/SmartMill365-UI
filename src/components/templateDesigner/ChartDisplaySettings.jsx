export default function ChartDisplaySettings({
  newType,
  newHistoryWindow,
  setNewHistoryWindow,
  newChartDisplay,
  setNewChartDisplay,
}) {
  if (!["line", "bar"].includes(newType)) return null;

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
          Chart Display
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Configure axes, grid, time labels and chart density. The chart automatically simplifies itself when the widget becomes small.
        </p>
      </div>

      {newType === "line" && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              Chart Style
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  value: "line",
                  label: "Line",
                },
                {
                  value: "area",
                  label: "Area",
                },
              ].map((option) => {
                const selected =
                  (newChartDisplay.chartStyle ||
                    "line") === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setNewChartDisplay(
                        (previous) => ({
                          ...previous,
                          chartStyle:
                            option.value,
                          curveType:
                            previous.curveType ||
                            "linear",
                          lineWeight:
                            previous.lineWeight ||
                            "normal",
                          linePattern:
                            previous.linePattern ||
                            "solid",
                          strokeWidth:
                            previous.strokeWidth ||
                            2.5,
                        })
                      )
                    }
                    className={`
                      rounded-xl border
                      px-3 py-2.5
                      text-sm font-semibold
                      transition-colors
                      ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                          : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }
                    `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              Time Window
            </label>
            <select
              value={
                newHistoryWindow
              }
              onChange={(event) =>
                setNewHistoryWindow(
                  event.target.value
                )
              }
              className="
                w-full rounded-xl border
                border-gray-300 bg-white
                px-4 py-3 dark:text-white
                dark:border-slate-600
                dark:bg-slate-900
              "
            >
              <option value="5m">5 minutes</option>
              <option value="15m">15 minutes</option>
              <option value="1h">1 hour</option>
              <option value="6h">6 hours</option>
              <option value="24h">24 hours</option>
              <option value="2d">2 days</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              X-axis Time Format
            </label>
            <select
              value={
                newChartDisplay.xAxisFormat
              }
              onChange={(event) =>
                setNewChartDisplay(
                  (previous) => ({
                    ...previous,
                    xAxisFormat:
                      event.target.value,
                  })
                )
              }
              className="
                w-full rounded-xl border
                border-gray-300 bg-white
                px-4 py-3 dark:text-white
                dark:border-slate-600
                dark:bg-slate-900
              "
            >
              <option value="auto">Auto</option>
              <option value="time">Time only</option>
              <option value="date">Date only</option>
              <option value="datetime">Date + time</option>
            </select>
          </div>
        </div>
      )}

      {newType === "line" && (
        <div
          className="
            mb-3 rounded-xl
            border border-slate-200
            bg-white p-3
            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          <div
            className="
              flex flex-col gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="min-w-0">
              <div
                className="
                  text-xs font-bold
                  text-slate-800
                  dark:text-slate-100
                "
              >
                Background Grid Lines
              </div>

              <p
                className="
                  mt-0.5 text-[11px]
                  leading-4
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Show faint reference lines behind the trend to make values easier to compare.
              </p>
            </div>

            <div
              className="
                inline-flex shrink-0
                rounded-lg
                border border-slate-200
                bg-slate-50 p-1
                dark:border-slate-700
                dark:bg-slate-950
              "
            >
              {[
                {
                  value: true,
                  label: "Show",
                },
                {
                  value: false,
                  label: "Hide",
                },
              ].map((option) => {
                const selected =
                  (newChartDisplay.showGrid !==
                    false) ===
                  option.value;

                return (
                  <button
                    key={String(
                      option.value
                    )}
                    type="button"
                    onClick={() =>
                      setNewChartDisplay(
                        (previous) => ({
                          ...previous,
                          showGrid:
                            option.value,
                        })
                      )
                    }
                    className={`
                      h-7 rounded-md
                      px-3 text-[11px]
                      font-semibold
                      transition-colors
                      ${
                        selected
                          ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }
                    `}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {newChartDisplay.showGrid !==
            false && (
            <div
              className="
                mt-3 flex
                flex-col gap-2
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div>
                <div
                  className="
                    text-[11px]
                    font-semibold
                    text-slate-700
                    dark:text-slate-200
                  "
                >
                  Grid Density
                </div>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-slate-400
                  "
                >
                  Keep major grid lines clear; add only faint horizontal guides between them.
                </p>
              </div>

              <div
                className="
                  inline-flex shrink-0
                  rounded-lg
                  border border-slate-200
                  bg-slate-50 p-1
                  dark:border-slate-700
                  dark:bg-slate-950
                "
              >
                {[
                  {
                    value: "sparse",
                    label: "Low",
                  },
                  {
                    value: "normal",
                    label: "Balanced",
                  },
                  {
                    value: "dense",
                    label: "Dense",
                  },
                ].map((option) => {
                  const selected =
                    (newChartDisplay.gridDensity ||
                      "dense") ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setNewChartDisplay(
                          (previous) => ({
                            ...previous,
                            gridDensity:
                              option.value,
                          })
                        )
                      }
                      className={`
                        h-7 rounded-md
                        px-2.5 text-[10px]
                        font-semibold
                        transition-colors
                        ${
                          selected
                            ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className="
              mt-3 overflow-hidden
              rounded-lg border
              border-slate-200
              bg-slate-50
              dark:border-slate-700
              dark:bg-slate-950
            "
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 320 54"
              className="h-12 w-full"
              preserveAspectRatio="none"
            >
              {newChartDisplay.showGrid !==
                false && (
                <g
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-700"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                >
                  {(() => {
                    const density =
                      newChartDisplay.gridDensity ||
                      "dense";

                    const horizontalLines =
                      density === "sparse"
                        ? [18, 36]
                        : density === "normal"
                        ? [13, 27, 41]
                        : [9, 18, 27, 36, 45];

                    const verticalLines =
                      density === "sparse"
                        ? [106, 213]
                        : density === "normal"
                        ? [80, 160, 240]
                        : [53, 106, 160, 213, 266];

                    return (
                      <>
                        {horizontalLines.map(
                          (y) => (
                            <line
                              key={`h-${y}`}
                              x1="0"
                              y1={y}
                              x2="320"
                              y2={y}
                            />
                          )
                        )}

                        {verticalLines.map(
                          (x) => (
                            <line
                              key={`v-${x}`}
                              x1={x}
                              y1="0"
                              x2={x}
                              y2="54"
                            />
                          )
                        )}
                      </>
                    );
                  })()}
                </g>
              )}

              <polyline
                points="0,37 38,30 78,33 116,20 155,24 198,15 240,23 280,12 320,18"
                fill="none"
                stroke="#7CB342"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ...(newType === "bar"
            ? [["showGrid", "Grid lines"]]
            : []),
          ["showLegend", "Legend"],
          ["showTooltip", "Tooltip"],
          ["showXAxis", "X-axis"],
          ["showYAxis", "Y-axis"],
          ...(newType !== "bar"
            ? [["showDots", "Data points"]]
            : []),
        ].map(
          ([key, label]) => (
            <label
              key={key}
              className="
                flex items-center gap-2
                rounded-xl border
                border-gray-200 bg-white
                px-3 py-2.5
                dark:border-slate-700
                dark:bg-slate-900
              "
            >
              <input
                type="checkbox"
                checked={
                  newChartDisplay[
                    key
                  ] !== false
                }
                onChange={(event) =>
                  setNewChartDisplay(
                    (previous) => ({
                      ...previous,
                      [key]:
                        event.target.checked,
                    })
                  )
                }
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-white">
                {label}
              </span>
            </label>
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
            Y-axis Range
          </label>
          <select
            value={
              newChartDisplay.yAxisMode
            }
            onChange={(event) =>
              setNewChartDisplay(
                (previous) => ({
                  ...previous,
                  yAxisMode:
                    event.target.value,
                })
              )
            }
            className="
              w-full rounded-xl border
              border-gray-300 bg-white
              px-4 py-3 dark:text-white
              dark:border-slate-600
              dark:bg-slate-900
            "
          >
            <option value="auto">
              Automatic · visible data (recommended)
            </option>
            <option value="range">
              Data Range · widget min/max
            </option>
          </select>

          <div
            className={`
              mt-2 rounded-xl px-3 py-2
              text-[10px] leading-4
              ${
                newChartDisplay.yAxisMode ===
                "auto"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              }
            `}
          >
            {newChartDisplay.yAxisMode ===
            "auto"
              ? "Recommended for trends. The Y-axis focuses on visible values with a small margin, making changes easier to read."
              : "Uses the widget Data Range minimum and maximum below."}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
            Y-axis Tick Count
          </label>
          <input
            type="number"
            min="2"
            max="12"
            value={
              newChartDisplay.yAxisTickCount
            }
            onChange={(event) =>
              setNewChartDisplay(
                (previous) => ({
                  ...previous,
                  yAxisTickCount:
                    event.target.value,
                })
              )
            }
            className="
              w-full rounded-xl border
              border-gray-300 bg-white
              px-4 py-3 dark:text-white
              dark:border-slate-600
              dark:bg-slate-900
            "
          />
        </div>
      </div>

      {newType === "line" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              {newChartDisplay.chartStyle ===
              "area"
                ? "Edge Type"
                : "Line Type"}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: "linear",
                  label: "Normal",
                  description:
                    "Straight",
                  preview:
                    "M2 15 L12 8 L22 12 L34 3",
                },
                {
                  value: "monotone",
                  label: "Smooth",
                  description:
                    "Curved",
                  preview:
                    "M2 15 C8 15 8 8 14 8 C21 8 23 12 28 10 C32 8 32 3 34 3",
                },
                {
                  value: "step",
                  label: "Step",
                  description:
                    "Stepped",
                  preview:
                    "M2 15 H12 V8 H23 V12 H29 V3 H34",
                },
              ].map((option) => {
                const selected =
                  (newChartDisplay.curveType ||
                    "linear") === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setNewChartDisplay(
                        (previous) => ({
                          ...previous,
                          curveType:
                            option.value,
                        })
                      )
                    }
                    className={`
                      rounded-xl border p-2.5
                      text-left transition-colors
                      ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                          : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                      }
                    `}
                  >
                    <svg
                      viewBox="0 0 36 18"
                      className="mb-1.5 h-5 w-full"
                      aria-hidden="true"
                    >
                      <path
                        d={option.preview}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={
                          selected
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-slate-400"
                        }
                      />
                    </svg>

                    <div
                      className={`text-xs font-bold ${
                        selected
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {option.label}
                    </div>

                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
              {newChartDisplay.chartStyle ===
              "area"
                ? "Edge Weight"
                : "Line Weight"}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: "thin",
                  label: "Thin",
                  width: 1.5,
                },
                {
                  value: "normal",
                  label: "Normal",
                  width: 2.5,
                },
                {
                  value: "bold",
                  label: "Bold",
                  width: 4,
                },
              ].map((option) => {
                const selected =
                  (newChartDisplay.lineWeight ||
                    "normal") === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setNewChartDisplay(
                        (previous) => ({
                          ...previous,
                          lineWeight:
                            option.value,
                          strokeWidth:
                            option.width,
                        })
                      )
                    }
                    className={`
                      rounded-xl border
                      px-3 py-2.5
                      transition-colors
                      ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                          : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                      }
                    `}
                  >
                    <div className="mb-2 flex h-4 items-center">
                      <span
                        className={`block w-full rounded-full ${
                          selected
                            ? "bg-emerald-600 dark:bg-emerald-400"
                            : "bg-slate-400 dark:bg-slate-500"
                        }`}
                        style={{
                          height:
                            `${option.width}px`,
                        }}
                      />
                    </div>

                    <div
                      className={`text-xs font-bold ${
                        selected
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {option.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] text-slate-400">
              Normal is the default.
            </p>
          </div>

          {newChartDisplay.chartStyle !==
            "area" && (
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                Line Pattern
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    value: "solid",
                    label: "Solid",
                    dash: "",
                  },
                  {
                    value: "dashed",
                    label: "Dashed",
                    dash: "8 5",
                  },
                  {
                    value: "dotted",
                    label: "Dotted",
                    dash: "2 5",
                  },
                ].map((option) => {
                  const selected =
                    (newChartDisplay.linePattern ||
                      "solid") ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setNewChartDisplay(
                          (previous) => ({
                            ...previous,
                            linePattern:
                              option.value,
                          })
                        )
                      }
                      className={`
                        rounded-xl border
                        px-3 py-2.5
                        transition-colors
                        ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
                            : "border-gray-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
                        }
                      `}
                    >
                      <svg
                        viewBox="0 0 64 12"
                        className="mb-2 h-3 w-full"
                        aria-hidden="true"
                      >
                        <line
                          x1="2"
                          y1="6"
                          x2="62"
                          y2="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={
                            option.dash ||
                            undefined
                          }
                          className={
                            selected
                              ? "text-emerald-600 dark:text-emerald-300"
                              : "text-slate-400"
                          }
                        />
                      </svg>

                      <div
                        className={`text-xs font-bold ${
                          selected
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[10px] text-slate-400">
                Solid is the default.
              </p>
            </div>
          )}

          {newChartDisplay.chartStyle ===
            "area" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                  Area Opacity
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={
                      Number(
                        newChartDisplay.areaOpacity
                      ) || 0.34
                    }
                    onChange={(event) =>
                      setNewChartDisplay(
                        (previous) => ({
                          ...previous,
                          areaOpacity:
                            Number(
                              event.target.value
                            ),
                        })
                      )
                    }
                    className="min-w-0 flex-1 accent-emerald-600"
                  />

                  <span className="w-12 text-right text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {Math.round(
                      (Number(
                        newChartDisplay.areaOpacity
                      ) || 0.34) * 100
                    )}
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                  Fade End
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="0.4"
                    step="0.025"
                    value={
                      Number(
                        newChartDisplay.areaEndOpacity
                      ) || 0.025
                    }
                    onChange={(event) =>
                      setNewChartDisplay(
                        (previous) => ({
                          ...previous,
                          areaEndOpacity:
                            Number(
                              event.target.value
                            ),
                        })
                      )
                    }
                    className="min-w-0 flex-1 accent-emerald-600"
                  />

                  <span className="w-12 text-right text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {Math.round(
                      (Number(
                        newChartDisplay.areaEndOpacity
                      ) || 0.025) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

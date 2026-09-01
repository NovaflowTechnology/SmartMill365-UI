export default function StatSettings({
  newType,
  newBigNumberDisplay,
  setNewBigNumberDisplay,
  newDataKeys,
  newDataKey,
  getDataSourceLabel,
}) {
  if (newType !== "bignumber") return null;

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
                          <div className="mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              Stat Display
                            </h3>

                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              Display a numeric KPI or convert incoming values into readable status text.
                            </p>
                          </div>

                          {/* DISPLAY MODE */}
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                              Display Mode
                            </label>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {[
                                {
                                  value: "number",
                                  label: "Number",
                                  description:
                                    "Show a numeric value, unit, and optional trend.",
                                },
                                {
                                  value: "valueMapping",
                                  label: "Value Mapping",
                                  description:
                                    "Convert raw values such as 0, 1, and 2 into status text.",
                                },
                                {
                                  value: "combined",
                                  label: "Stat + Status",
                                  description:
                                    "Show a live numeric KPI together with machine operating status.",
                                },
                              ].map((option) => {
                                const selected =
                                  newBigNumberDisplay.mode ===
                                  option.value;

                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          mode: option.value,

                                          ...(option.value ===
                                          "valueMapping"
                                            ? {
                                                showTrend: false,
                                                showUnit: false,
                                                statusDataKey: "",
                                              }
                                            : {}),

                                          ...(option.value ===
                                          "combined"
                                            ? {
                                                statusSource: "mapping",
                                                statusDataKey:
                                                  previous.statusDataKey ||
                                                  newDataKeys.find(
                                                    (key) =>
                                                      key &&
                                                      key !==
                                                        (newDataKeys[0] ||
                                                          newDataKey)
                                                  ) ||
                                                  "",
                                              }
                                            : {}),
                                        })
                                      )
                                    }
                                    className={`
                                      rounded-xl border
                                      p-4 text-left
                                      transition-all
                                      ${
                                        selected
                                          ? "border-emerald-600 bg-emerald-600 text-white shadow"
                                          : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                      }
                                    `}
                                  >
                                    <div className="text-sm font-bold">
                                      {option.label}
                                    </div>

                                    <div
                                      className={`
                                        mt-1 text-[11px]
                                        ${
                                          selected
                                            ? "text-emerald-50"
                                            : "text-gray-400 dark:text-slate-400"
                                        }
                                      `}
                                    >
                                      {option.description}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* COMMON STAT SETTINGS */}
                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                Alignment
                              </label>

                              <select
                                value={
                                  newBigNumberDisplay.alignment
                                }
                                onChange={(event) =>
                                  setNewBigNumberDisplay(
                                    (previous) => ({
                                      ...previous,
                                      alignment:
                                        event.target.value,
                                    })
                                  )
                                }
                                className="
                                  w-full rounded-xl
                                  border border-gray-300
                                  bg-white px-4 py-3
                                  text-gray-900 outline-none
                                  focus:ring-2
                                  focus:ring-emerald-500
                                  dark:border-slate-600
                                  dark:bg-slate-900
                                  dark:text-white
                                "
                              >
                                <option value="left">
                                  Left
                                </option>
                                <option value="center">
                                  Center
                                </option>
                                <option value="right">
                                  Right
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                Value Size
                              </label>

                              <select
                                value={
                                  newBigNumberDisplay.valueSize
                                }
                                onChange={(event) =>
                                  setNewBigNumberDisplay(
                                    (previous) => ({
                                      ...previous,
                                      valueSize:
                                        event.target.value,
                                    })
                                  )
                                }
                                className="
                                  w-full rounded-xl
                                  border border-gray-300
                                  bg-white px-4 py-3
                                  text-gray-900 outline-none
                                  focus:ring-2
                                  focus:ring-emerald-500
                                  dark:border-slate-600
                                  dark:bg-slate-900
                                  dark:text-white
                                "
                              >
                                <option value="small">
                                  Small
                                </option>
                                <option value="medium">
                                  Medium
                                </option>
                                <option value="large">
                                  Large
                                </option>
                                <option value="xlarge">
                                  Extra Large
                                </option>
                              </select>
                            </div>
                          </div>

                          <label
                            className="
                              mt-4 flex items-center
                              justify-between gap-3
                              rounded-xl border
                              border-gray-200 bg-white
                              p-4
                              dark:border-slate-700
                              dark:bg-slate-900
                            "
                          >
                            <span className="text-sm font-medium text-gray-800 dark:text-white">
                              Show Label
                            </span>

                            <input
                              type="checkbox"
                              checked={Boolean(
                                newBigNumberDisplay.showLabel
                              )}
                              onChange={(event) =>
                                setNewBigNumberDisplay(
                                  (previous) => ({
                                    ...previous,
                                    showLabel:
                                      event.target.checked,
                                  })
                                )
                              }
                              className="h-5 w-5 accent-emerald-600"
                            />
                          </label>

                          {/* NUMBER MODE */}
                          {newBigNumberDisplay.mode ===
                            "number" && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                  Display Style
                                </label>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  {[
                                    {
                                      value: "modern",
                                      label: "Modern",
                                      description:
                                        "Large KPI with optional trend",
                                    },
                                    {
                                      value: "compact",
                                      label: "Compact",
                                      description:
                                        "Smaller layout for 1×1 cards",
                                    },
                                    {
                                      value: "simple",
                                      label: "Simple",
                                      description:
                                        "Clean value and unit display",
                                    },
                                  ].map((option) => {
                                    const selected =
                                      newBigNumberDisplay.style ===
                                      option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,
                                              style:
                                                option.value,
                                            })
                                          )
                                        }
                                        className={`
                                          rounded-xl border
                                          p-4 text-left
                                          transition-all
                                          ${
                                            selected
                                              ? "border-emerald-600 bg-emerald-600 text-white shadow"
                                              : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                                          }
                                        `}
                                      >
                                        <div className="text-sm font-bold">
                                          {option.label}
                                        </div>

                                        <div
                                          className={`
                                            mt-2 flex h-8
                                            items-center
                                            ${
                                              option.value ===
                                              "compact"
                                                ? "justify-start"
                                                : option.value ===
                                                  "simple"
                                                ? "justify-center"
                                                : "justify-between"
                                            }
                                            rounded-lg px-2
                                            ${
                                              selected
                                                ? "bg-white/10"
                                                : "bg-slate-50 dark:bg-slate-950"
                                            }
                                          `}
                                        >
                                          <span
                                            className={`
                                              font-black
                                              ${
                                                option.value ===
                                                "compact"
                                                  ? "text-base"
                                                  : "text-lg"
                                              }
                                            `}
                                          >
                                            44.1
                                          </span>

                                          {option.value ===
                                            "modern" && (
                                            <span
                                              className={`
                                                h-1 w-10
                                                overflow-hidden
                                                rounded-full
                                                ${
                                                  selected
                                                    ? "bg-white/20"
                                                    : "bg-slate-200 dark:bg-slate-700"
                                                }
                                              `}
                                            >
                                              <span
                                                className="
                                                  block h-full
                                                  w-2/3 rounded-full
                                                  bg-[#7CB342]
                                                "
                                              />
                                            </span>
                                          )}

                                          {option.value ===
                                            "compact" && (
                                            <span
                                              className={`
                                                ml-2 text-[9px]
                                                ${
                                                  selected
                                                    ? "text-emerald-50"
                                                    : "text-slate-400"
                                                }
                                              `}
                                            >
                                              ↗ Rising
                                            </span>
                                          )}

                                          {option.value ===
                                            "simple" && (
                                            <span
                                              className={`
                                                ml-1 text-[9px]
                                                ${
                                                  selected
                                                    ? "text-emerald-50"
                                                    : "text-slate-400"
                                                }
                                              `}
                                            >
                                              psi
                                            </span>
                                          )}
                                        </div>

                                        <div
                                          className={`
                                            mt-1.5 text-[11px]
                                            ${
                                              selected
                                                ? "text-emerald-50"
                                                : "text-gray-400 dark:text-slate-400"
                                            }
                                          `}
                                        >
                                          {option.description}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {[
                                  {
                                    key: "showUnit",
                                    label: "Show Unit",
                                  },
                                  {
                                    key: "showTrend",
                                    label: "Show Trend",
                                  },
                                ].map((option) => (
                                  <label
                                    key={option.key}
                                    className="
                                      flex items-center
                                      justify-between gap-3
                                      rounded-xl border
                                      border-gray-200 bg-white
                                      p-4
                                      dark:border-slate-700
                                      dark:bg-slate-900
                                    "
                                  >
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                                      {option.label}
                                    </span>

                                    <input
                                      type="checkbox"
                                      checked={Boolean(
                                        newBigNumberDisplay[
                                          option.key
                                        ]
                                      )}
                                      onChange={(event) =>
                                        setNewBigNumberDisplay(
                                          (previous) => ({
                                            ...previous,
                                            [option.key]:
                                              event.target
                                                .checked,
                                          })
                                        )
                                      }
                                      className="h-5 w-5 accent-emerald-600"
                                    />
                                  </label>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Decimal Places
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={
                                      newBigNumberDisplay.decimals
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          decimals: Math.min(
                                            6,
                                            Math.max(
                                              0,
                                              Number(
                                                event.target
                                                  .value
                                              ) || 0
                                            )
                                          ),
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Unit Override
                                  </label>

                                  <input
                                    type="text"
                                    placeholder="Example: psi"
                                    value={
                                      newBigNumberDisplay.unit
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          unit: event.target
                                            .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Number Color
                                  </label>

                                  <select
                                    value={
                                      newBigNumberDisplay.valueColor
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          valueColor:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="default">
                                      Default
                                    </option>
                                    <option value="green">
                                      Green
                                    </option>
                                    <option value="blue">
                                      Blue
                                    </option>
                                    <option value="amber">
                                      Amber
                                    </option>
                                    <option value="orange">
                                      Orange
                                    </option>
                                    <option value="red">
                                      Red
                                    </option>
                                    <option value="purple">
                                      Purple
                                    </option>
                                    <option value="gray">
                                      Gray
                                    </option>
                                  </select>
                                </div>

                                {newBigNumberDisplay.showTrend && (
                                  <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                      Stable Threshold
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={
                                        newBigNumberDisplay.trendThreshold
                                      }
                                      onChange={(event) =>
                                        setNewBigNumberDisplay(
                                          (previous) => ({
                                            ...previous,
                                            trendThreshold:
                                              Math.max(
                                                0,
                                                Number(
                                                  event.target
                                                    .value
                                                ) || 0
                                              ),
                                          })
                                        )
                                      }
                                      className="
                                        w-full rounded-xl
                                        border border-gray-300
                                        bg-white px-4 py-3
                                        text-gray-900 outline-none
                                        focus:ring-2
                                        focus:ring-emerald-500
                                        dark:border-slate-600
                                        dark:bg-slate-900
                                        dark:text-white
                                      "
                                    />

                                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-400">
                                      Changes smaller than this value are considered stable.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {newBigNumberDisplay.mode ===
                            "combined" && (
                            <div
                              className="
                                mt-4 rounded-xl border
                                border-emerald-200 bg-emerald-50/60
                                p-4
                                dark:border-emerald-500/25
                                dark:bg-emerald-500/[0.05]
                              "
                            >
                              <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Stat + Status Data
                                </h4>

                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                  This display uses two different data sources: one numeric field for the Stat value and one field for the machine status.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Numeric Stat Data
                                  </label>

                                  <div
                                    className="
                                      min-h-[48px] rounded-xl border
                                      border-gray-200 bg-white
                                      px-4 py-3 text-sm font-semibold
                                      text-gray-800
                                      dark:border-slate-700
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    {newDataKeys[0] || newDataKey
                                      ? getDataSourceLabel(
                                          newDataKeys[0] ||
                                            newDataKey
                                        )
                                      : "No numeric source selected"}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Status Data
                                  </label>

                                  <select
                                    value={
                                      newBigNumberDisplay.statusDataKey ||
                                      ""
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          statusSource: "mapping",
                                          statusDataKey:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 text-gray-900
                                      outline-none focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="">
                                      Select second data source
                                    </option>

                                    {newDataKeys
                                      .filter(
                                        (key) =>
                                          key &&
                                          key !==
                                            (newDataKeys[0] ||
                                              newDataKey)
                                      )
                                      .map((key) => (
                                        <option
                                          key={key}
                                          value={key}
                                        >
                                          {getDataSourceLabel(
                                            key
                                          )}
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Status Label
                                  </label>

                                  <input
                                    type="text"
                                    value={
                                      newBigNumberDisplay.statusLabel ||
                                      ""
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          statusLabel:
                                            event.target.value,
                                        })
                                      )
                                    }
                                    placeholder="Machine Status"
                                    className="
                                      w-full rounded-xl border
                                      border-gray-300 bg-white
                                      px-4 py-3 text-gray-900
                                      outline-none focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>
                              </div>

                              {newDataKeys.length < 2 && (
                                <div
                                  className="
                                    mt-4 rounded-xl border
                                    border-amber-200 bg-amber-50
                                    px-3 py-2 text-xs
                                    text-amber-700
                                    dark:border-amber-500/25
                                    dark:bg-amber-500/10
                                    dark:text-amber-300
                                  "
                                >
                                  Select two data sources in Step 1 to use Stat + Status.
                                </div>
                              )}
                            </div>
                          )}

                          {["valueMapping", "combined"].includes(
                            newBigNumberDisplay.mode
                          ) && (
                            <div className="mt-4 space-y-4">
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Value Mappings
                                </h4>

                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                  Convert incoming values into readable operating states.
                                </p>
                              </div>

                              <div className="space-y-3">
                                {(
                                  newBigNumberDisplay.mappings ||
                                  []
                                ).map(
                                  (mapping, index) => (
                                    <div
                                      key={`${index}-${mapping.value}`}
                                      className="
                                        grid min-w-0
                                        grid-cols-[minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(90px,1fr)_36px]
                                        gap-1.5 rounded-xl
                                        border border-gray-200
                                        bg-white p-2.5
                                        dark:border-slate-700
                                        dark:bg-slate-900
                                      "
                                    >
                                      <input
                                        type="text"
                                        value={
                                          mapping.value ??
                                          ""
                                        }
                                        placeholder="Value"
                                        onChange={(
                                          event
                                        ) =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).map(
                                                (
                                                  item,
                                                  currentIndex
                                                ) =>
                                                  currentIndex ===
                                                  index
                                                    ? {
                                                        ...item,
                                                        value:
                                                          event
                                                            .target
                                                            .value,
                                                      }
                                                    : item
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          min-w-0 rounded-xl border
                                          border-gray-300
                                          bg-white px-3 py-2
                                          text-sm text-gray-900
                                          outline-none
                                          focus:ring-2
                                          focus:ring-emerald-500
                                          dark:border-slate-600
                                          dark:bg-slate-950
                                          dark:text-white
                                        "
                                      />

                                      <input
                                        type="text"
                                        value={
                                          mapping.text ||
                                          ""
                                        }
                                        placeholder="Display text"
                                        onChange={(
                                          event
                                        ) =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).map(
                                                (
                                                  item,
                                                  currentIndex
                                                ) =>
                                                  currentIndex ===
                                                  index
                                                    ? {
                                                        ...item,
                                                        text: event
                                                          .target
                                                          .value,
                                                      }
                                                    : item
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          min-w-0 rounded-xl border
                                          border-gray-300
                                          bg-white px-3 py-2
                                          text-sm text-gray-900
                                          outline-none
                                          focus:ring-2
                                          focus:ring-emerald-500
                                          dark:border-slate-600
                                          dark:bg-slate-950
                                          dark:text-white
                                        "
                                      />

                                      <select
                                        value={
                                          mapping.color ||
                                          "default"
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).map(
                                                (
                                                  item,
                                                  currentIndex
                                                ) =>
                                                  currentIndex ===
                                                  index
                                                    ? {
                                                        ...item,
                                                        color:
                                                          event
                                                            .target
                                                            .value,
                                                      }
                                                    : item
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          min-w-0 rounded-xl border
                                          border-gray-300
                                          bg-white px-3 py-2
                                          text-sm text-gray-900
                                          outline-none
                                          focus:ring-2
                                          focus:ring-emerald-500
                                          dark:border-slate-600
                                          dark:bg-slate-950
                                          dark:text-white
                                        "
                                      >
                                        <option value="default">
                                          Default
                                        </option>
                                        <option value="green">
                                          Green
                                        </option>
                                        <option value="blue">
                                          Blue
                                        </option>
                                        <option value="amber">
                                          Amber
                                        </option>
                                        <option value="orange">
                                          Orange
                                        </option>
                                        <option value="red">
                                          Red
                                        </option>
                                        <option value="purple">
                                          Purple
                                        </option>
                                        <option value="gray">
                                          Gray
                                        </option>
                                      </select>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setNewBigNumberDisplay(
                                            (previous) => ({
                                              ...previous,

                                              mappings: (
                                                previous.mappings ||
                                                []
                                              ).filter(
                                                (
                                                  _,
                                                  currentIndex
                                                ) =>
                                                  currentIndex !==
                                                  index
                                              ),
                                            })
                                          )
                                        }
                                        className="
                                          flex h-10 w-9 shrink-0
                                          items-center justify-center
                                          self-center justify-self-end
                                          rounded-xl text-red-500
                                          transition
                                          hover:bg-red-50
                                          dark:hover:bg-red-500/10
                                        "
                                        aria-label={`Remove mapping ${
                                          index + 1
                                        }`}
                                      >
                                        <Trash2
                                          size={16}
                                        />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setNewBigNumberDisplay(
                                    (previous) => ({
                                      ...previous,

                                      mappings: [
                                        ...(previous.mappings ||
                                          []),

                                        {
                                          value: "",
                                          text: "",
                                          color:
                                            "default",
                                        },
                                      ],
                                    })
                                  )
                                }
                                className="
                                  inline-flex items-center
                                  gap-2 rounded-xl
                                  border border-emerald-300
                                  px-4 py-2.5
                                  text-sm font-bold
                                  text-emerald-700
                                  transition
                                  hover:bg-emerald-50
                                  dark:border-emerald-800
                                  dark:text-emerald-300
                                  dark:hover:bg-emerald-500/10
                                "
                              >
                                <Plus size={15} />
                                Add Mapping
                              </button>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Fallback Text
                                  </label>

                                  <input
                                    type="text"
                                    value={
                                      newBigNumberDisplay.fallbackText ||
                                      ""
                                    }
                                    placeholder="Use raw value when empty"
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          fallbackText:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white">
                                    Fallback Color
                                  </label>

                                  <select
                                    value={
                                      newBigNumberDisplay.fallbackColor ||
                                      "default"
                                    }
                                    onChange={(event) =>
                                      setNewBigNumberDisplay(
                                        (previous) => ({
                                          ...previous,
                                          fallbackColor:
                                            event.target
                                              .value,
                                        })
                                      )
                                    }
                                    className="
                                      w-full rounded-xl
                                      border border-gray-300
                                      bg-white px-4 py-3
                                      text-gray-900 outline-none
                                      focus:ring-2
                                      focus:ring-emerald-500
                                      dark:border-slate-600
                                      dark:bg-slate-900
                                      dark:text-white
                                    "
                                  >
                                    <option value="default">
                                      Default
                                    </option>
                                    <option value="green">
                                      Green
                                    </option>
                                    <option value="blue">
                                      Blue
                                    </option>
                                    <option value="amber">
                                      Amber
                                    </option>
                                    <option value="orange">
                                      Orange
                                    </option>
                                    <option value="red">
                                      Red
                                    </option>
                                    <option value="purple">
                                      Purple
                                    </option>
                                    <option value="gray">
                                      Gray
                                    </option>
                                  </select>
                                </div>
                              </div>

                              <label
                                className="
                                  flex items-center
                                  justify-between gap-3
                                  rounded-xl border
                                  border-gray-200 bg-white
                                  p-4
                                  dark:border-slate-700
                                  dark:bg-slate-900
                                "
                              >
                                <span className="text-sm font-medium text-gray-800 dark:text-white">
                                  Show Raw Value
                                </span>

                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    newBigNumberDisplay.showRawValue
                                  )}
                                  onChange={(event) =>
                                    setNewBigNumberDisplay(
                                      (previous) => ({
                                        ...previous,
                                        showRawValue:
                                          event.target
                                            .checked,
                                      })
                                    )
                                  }
                                  className="h-5 w-5 accent-emerald-600"
                                />
                              </label>
                            </div>
                          )}
                        </div>
  );
}

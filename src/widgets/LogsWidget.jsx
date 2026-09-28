import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle2,
  CircleDot,
  Info,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import {
  TECH_SURFACE_CLASS,
  TechBackdrop,
} from "./widgetTech";

export const DEFAULT_EVENT_DISPLAY = {
  mode: "event-log", // event-log | alarm-summary | alarm-list
  showTimestamp: true,
  showSource: true,
  showLevel: true,
  showSearch: true,
  compact: false,
  maxEntries: 50,
  sortOrder: "newest",
  levelFilter: [
    "info",
    "success",
    "warning",
    "error",
  ],
  severityFilter: [
    "high",
    "medium",
    "low",
    "info",
  ],
  showZeroSeverities: true,
  severityMap: {
    high: [
      "critical",
      "error",
      "high",
      "alarm",
      "trip",
      "danger",
      "fault",
    ],
    medium: [
      "warning",
      "warn",
      "medium",
    ],
    low: [
      "low",
      "success",
      "notice",
    ],
    info: [
      "info",
      "debug",
      "normal",
      "ok",
    ],
  },
};

const levelStyles = {
  info: {
    label: "Info",
    icon: Info,
    badge:
      "bg-cyan-100 text-cyan-700 dark:bg-[#58D7FF]/10 dark:text-[#58D7FF]",
    iconClass:
      "text-cyan-600 dark:text-[#58D7FF]",
  },
  success: {
    label: "Success",
    icon: CheckCircle2,
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-[#70E1C2]/10 dark:text-[#70E1C2]",
    iconClass:
      "text-emerald-600 dark:text-[#70E1C2]",
  },
  warning: {
    label: "Warning",
    icon: TriangleAlert,
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    iconClass:
      "text-amber-500 dark:text-amber-300",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    badge:
      "bg-[#FF6F88]/10 text-[#D95778] dark:bg-[#FF6F88]/15 dark:text-[#FF9AAE]",
    iconClass:
      "text-[#FF6F88] dark:text-[#FF9AAE]",
  },
  default: {
    label: "Event",
    icon: CircleDot,
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    iconClass:
      "text-slate-500 dark:text-slate-300",
  },
};

const severityStyles = {
  high: {
    label: "HIGH",
    icon: ShieldAlert,
    iconClass:
      "text-rose-500 dark:text-[#FF6078]",
    valueClass:
      "text-rose-600 dark:text-[#FF6078]",
    borderClass:
      "border-rose-200 dark:border-rose-500/20",
    bgClass:
      "bg-rose-50/60 dark:bg-rose-500/5",
  },
  medium: {
    label: "MEDIUM",
    icon: BellRing,
    iconClass:
      "text-amber-500 dark:text-amber-300",
    valueClass:
      "text-amber-600 dark:text-amber-300",
    borderClass:
      "border-amber-200 dark:border-amber-500/20",
    bgClass:
      "bg-amber-50/60 dark:bg-amber-500/5",
  },
  low: {
    label: "LOW",
    icon: Bell,
    iconClass:
      "text-sky-500 dark:text-[#58D7FF]",
    valueClass:
      "text-sky-600 dark:text-[#58D7FF]",
    borderClass:
      "border-sky-200 dark:border-sky-500/20",
    bgClass:
      "bg-sky-50/60 dark:bg-sky-500/5",
  },
  info: {
    label: "INFO",
    icon: Bell,
    iconClass:
      "text-slate-400 dark:text-slate-400",
    valueClass:
      "text-slate-500 dark:text-slate-300",
    borderClass:
      "border-slate-200 dark:border-slate-600",
    bgClass:
      "bg-slate-50/70 dark:bg-slate-800/30",
  },
};

const normalizeStringList = (
  value,
  fallback = []
) =>
  Array.isArray(value)
    ? value
        .map((item) =>
          String(item || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    : [...fallback];

const normalizeSeverityMap = (
  value = {}
) => ({
  high: normalizeStringList(
    value?.high,
    DEFAULT_EVENT_DISPLAY.severityMap.high
  ),
  medium: normalizeStringList(
    value?.medium,
    DEFAULT_EVENT_DISPLAY.severityMap.medium
  ),
  low: normalizeStringList(
    value?.low,
    DEFAULT_EVENT_DISPLAY.severityMap.low
  ),
  info: normalizeStringList(
    value?.info,
    DEFAULT_EVENT_DISPLAY.severityMap.info
  ),
});

const normalizeEventLevel = (value) => {
  const raw = String(value || "info")
    .trim()
    .toLowerCase();

  if ([
    "critical",
    "error",
    "high",
    "alarm",
    "trip",
    "danger",
    "fault",
  ].includes(raw)) {
    return "error";
  }

  if ([
    "warning",
    "warn",
    "medium",
  ].includes(raw)) {
    return "warning";
  }

  if ([
    "success",
    "low",
    "notice",
  ].includes(raw)) {
    return "success";
  }

  return "info";
};

const normalizeEvent = (event, index) => {
  const rawLevel = String(
    event?.severity ||
      event?.priority ||
      event?.level ||
      event?.type ||
      "info"
  )
    .trim()
    .toLowerCase();

  return {
    ...event,
    id:
      event?.id ??
      `${event?.timestamp || event?.time || "event"}-${index}`,
    timestamp:
      event?.timestamp ||
      event?.time ||
      new Date().toISOString(),
    level: normalizeEventLevel(
      event?.level || rawLevel
    ),
    rawSeverity: rawLevel,
    source:
      event?.source ||
      event?.device ||
      event?.equipment ||
      event?.category ||
      "System",
    message:
      event?.message ||
      event?.description ||
      event?.text ||
      "No message provided.",
    acknowledged: Boolean(
      event?.acknowledged ||
        event?.acked ||
        event?.isAcknowledged
    ),
  };
};

const resolveSeverity = (
  event,
  severityMap
) => {
  const candidates = [
    event?.rawSeverity,
    event?.level,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);

  for (const severity of [
    "high",
    "medium",
    "low",
    "info",
  ]) {
    if (
      candidates.some((candidate) =>
        severityMap[severity].includes(
          candidate
        )
      )
    ) {
      return severity;
    }
  }

  return "info";
};

const formatTimestamp = (timestamp) => {
  const parsed = new Date(timestamp);

  if (Number.isNaN(parsed.getTime())) {
    return String(timestamp || "—");
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const SearchBox = ({
  value,
  onChange,
  placeholder,
}) => (
  <div className="logs-widget-search relative w-40 max-w-[46%]">
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
    />

    <input
      type="search"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-8 pr-3 text-[11px] text-slate-800 outline-none focus:ring-2 focus:ring-[#58D7FF] dark:border-slate-600 dark:bg-slate-950 dark:text-white"
    />
  </div>
);

const WidgetHeader = ({
  label,
  subtitle,
  showSearch,
  search,
  setSearch,
}) => (
  <div className="logs-widget-header flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 pr-14 dark:border-[#263657] dark:bg-[#111B34]">
    <div className="min-w-0">
      <h3
        className="truncate text-sm font-bold text-slate-900 dark:text-white"
        title={label}
      >
        {label}
      </h3>
      <p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">
        {subtitle}
      </p>
    </div>

    {showSearch && (
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search events"
      />
    )}
  </div>
);

function AlarmSummary({ events, settings }) {
  const [selectedSeverity, setSelectedSeverity] =
    useState("");

  const counts = useMemo(() => {
    const result = {
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    events.forEach((event) => {
      result[event.severity] += 1;
    });

    return result;
  }, [events]);

  const severities = [
    "high",
    "medium",
    "low",
    "info",
  ].filter(
    (severity) =>
      settings.showZeroSeverities ||
      counts[severity] > 0
  );

  // V34.2: Alarm Summary always uses the lower half of the widget.
  // With no severity selected it shows the newest alarm/event records.
  // Selecting a severity card filters this same list instead of creating
  // a separate temporary panel, so the layout remains useful and stable.
  const summaryEvents = selectedSeverity
    ? events.filter(
        (event) =>
          event.severity ===
          selectedSeverity
      )
    : events;

  const summaryTitle = selectedSeverity
    ? `${severityStyles[selectedSeverity].label} alarms`
    : "Recent alarms";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <div
        className="grid shrink-0 gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(
            1,
            severities.length
          )}, minmax(0, 1fr))`,
        }}
      >
        {severities.map((severity) => {
          const style =
            severityStyles[severity];
          const Icon = style.icon;
          const selected =
            selectedSeverity === severity;

          return (
            <button
              key={severity}
              type="button"
              onClick={() =>
                setSelectedSeverity(
                  selected
                    ? ""
                    : severity
                )
              }
              className={`min-w-0 rounded-xl border px-2 py-3 text-center transition ${style.borderClass} ${style.bgClass} ${
                selected
                  ? "ring-2 ring-cyan-400/40"
                  : "hover:-translate-y-0.5 hover:shadow-sm"
              }`}
              title={
                selected
                  ? "Show all recent alarms"
                  : `Show ${style.label.toLowerCase()} alarms`
              }
            >
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-current/10 bg-white/70 dark:bg-slate-950/30">
                <Icon
                  size={20}
                  className={
                    style.iconClass
                  }
                />
              </div>

              <div
                className={`mt-2 text-xl font-black tabular-nums ${style.valueClass}`}
              >
                {counts[severity]}
              </div>

              <div className="mt-0.5 truncate text-[9px] font-black tracking-wide text-slate-500 dark:text-slate-400">
                {style.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#263657] dark:bg-[#0C1529]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 dark:border-[#263657]">
          <div className="min-w-0">
            <div className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {summaryTitle}
            </div>
            <div className="mt-0.5 text-[8px] text-slate-400 dark:text-slate-500">
              {selectedSeverity
                ? "Click the selected severity again to show all recent alarms."
                : "Latest activity from the event feed."}
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {summaryEvents.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {summaryEvents.length === 0 ? (
            <div className="flex h-full min-h-20 flex-col items-center justify-center px-4 py-5 text-center">
              <CheckCircle2
                size={22}
                className="text-emerald-500"
              />
              <p className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {selectedSeverity
                  ? `No ${summaryTitle.toLowerCase()}`
                  : "No recent alarms"}
              </p>
              <p className="mt-0.5 text-[8px] text-slate-400 dark:text-slate-500">
                New event records will appear here.
              </p>
            </div>
          ) : (
            summaryEvents
              .slice(0, 8)
              .map((event) => {
                const style =
                  severityStyles[
                    event.severity
                  ] || severityStyles.info;
                const Icon = style.icon;

                return (
                  <div
                    key={event.id}
                    className="border-b border-slate-100 px-3 py-2.5 last:border-0 dark:border-[#263657]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${style.borderClass} ${style.bgClass}`}
                        title={style.label}
                      >
                        <Icon
                          size={14}
                          className={
                            style.iconClass
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 text-[8px] font-black tracking-wide ${style.valueClass}`}
                            >
                              {style.label}
                            </span>

                            {settings.showSource && (
                              <span className="truncate text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                {event.source}
                              </span>
                            )}
                          </div>

                          {settings.showTimestamp && (
                            <span className="shrink-0 text-[8px] text-slate-400">
                              {formatTimestamp(
                                event.timestamp
                              )}
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 flex items-end justify-between gap-2">
                          <p className="line-clamp-2 min-w-0 flex-1 text-[9px] leading-4 text-slate-500 dark:text-slate-400">
                            {event.message}
                          </p>

                          {event.acknowledged && (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                              ACK
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

function AlarmList({
  events,
  settings,
  search,
}) {
  const keyword =
    search.trim().toLowerCase();

  const filtered = events.filter(
    (event) => {
      if (
        settings.severityFilter
          .length > 0 &&
        !settings.severityFilter.includes(
          event.severity
        )
      ) {
        return false;
      }

      if (!keyword) return true;

      return [
        event.severity,
        event.source,
        event.message,
        formatTimestamp(
          event.timestamp
        ),
      ].some((value) =>
        String(value)
          .toLowerCase()
          .includes(keyword)
      );
    }
  );

  if (!filtered.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
        <Bell
          size={28}
          className="text-slate-400"
        />
        <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          No alarms found
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-2">
      {filtered.map((event) => {
        const style =
          severityStyles[
            event.severity
          ] || severityStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={event.id}
            className={`mb-2 rounded-xl border p-3 last:mb-0 ${style.borderClass} ${style.bgClass}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-950/35">
                <Icon
                  size={17}
                  className={
                    style.iconClass
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`text-[9px] font-black tracking-wide ${style.valueClass}`}
                    >
                      {style.label}
                    </span>
                    {settings.showSource && (
                      <span className="ml-2 truncate text-[10px] font-bold text-slate-700 dark:text-slate-200">
                        {event.source}
                      </span>
                    )}
                  </div>

                  {settings.showTimestamp && (
                    <span className="shrink-0 text-[8px] text-slate-400">
                      {formatTimestamp(
                        event.timestamp
                      )}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
                  {event.message}
                </p>

                {event.acknowledged && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 size={9} />
                    Acknowledged
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventLog({
  events,
  settings,
  search,
}) {
  const keyword =
    search.trim().toLowerCase();

  const filtered = events.filter(
    (event) => {
      const levelAllowed =
        settings.levelFilter
          .length === 0 ||
        settings.levelFilter.includes(
          event.level
        );

      if (!levelAllowed) {
        return false;
      }

      if (!keyword) return true;

      return [
        event.level,
        event.source,
        event.message,
        formatTimestamp(
          event.timestamp
        ),
      ].some((value) =>
        String(value)
          .toLowerCase()
          .includes(keyword)
      );
    }
  );

  if (!filtered.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center">
        <CircleDot
          size={28}
          className="text-[#70E1C2] dark:text-[#58D7FF]"
        />
        <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          No events found
        </p>
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          Events will appear here when data is available.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {filtered.map((event) => {
        const style =
          levelStyles[event.level] ||
          levelStyles.default;
        const Icon = style.icon;

        return (
          <div
            key={event.id}
            className={`border-b border-slate-100 px-4 ${
              settings.compact
                ? "py-2"
                : "py-3"
            } last:border-b-0 dark:border-[#263657]`}
          >
            <div className="flex items-start gap-3">
              <Icon
                size={15}
                className={`mt-0.5 shrink-0 ${style.iconClass}`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {settings.showLevel && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  )}

                  {settings.showSource && (
                    <span className="truncate text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {event.source}
                    </span>
                  )}

                  {settings.showTimestamp && (
                    <span className="ml-auto shrink-0 text-[8px] text-slate-400">
                      {formatTimestamp(
                        event.timestamp
                      )}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
                  {event.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LogsWidget({
  logs = [],
  label = "Events & Alarms",
  display = {},
}) {
  const [search, setSearch] =
    useState("");

  const settings = useMemo(
    () => ({
      ...DEFAULT_EVENT_DISPLAY,
      ...(display || {}),
      mode: [
        "event-log",
        "alarm-summary",
        "alarm-list",
      ].includes(display?.mode)
        ? display.mode
        : "event-log",
      levelFilter:
        normalizeStringList(
          display?.levelFilter,
          DEFAULT_EVENT_DISPLAY.levelFilter
        ),
      severityFilter:
        normalizeStringList(
          display?.severityFilter,
          DEFAULT_EVENT_DISPLAY.severityFilter
        ),
      severityMap:
        normalizeSeverityMap(
          display?.severityMap
        ),
    }),
    [display]
  );

  const preparedEvents = useMemo(() => {
    const normalized = (
      Array.isArray(logs) ? logs : []
    ).map(normalizeEvent);

    const mapped = normalized.map(
      (event) => ({
        ...event,
        severity: resolveSeverity(
          event,
          settings.severityMap
        ),
      })
    );

    mapped.sort((a, b) => {
      const aTime =
        new Date(
          a.timestamp
        ).getTime();
      const bTime =
        new Date(
          b.timestamp
        ).getTime();

      const safeA = Number.isFinite(
        aTime
      )
        ? aTime
        : 0;
      const safeB = Number.isFinite(
        bTime
      )
        ? bTime
        : 0;

      return settings.sortOrder ===
        "oldest"
        ? safeA - safeB
        : safeB - safeA;
    });

    const maxEntries = Math.max(
      1,
      Number(settings.maxEntries) ||
        50
    );

    return mapped.slice(
      0,
      maxEntries
    );
  }, [
    logs,
    settings.maxEntries,
    settings.sortOrder,
    settings.severityMap,
  ]);

  const subtitle =
    settings.mode === "alarm-summary"
      ? `${preparedEvents.length} alarm/event record${
          preparedEvents.length === 1
            ? ""
            : "s"
        }`
      : settings.mode === "alarm-list"
      ? `${preparedEvents.length} alarm record${
          preparedEvents.length === 1
            ? ""
            : "s"
        }`
      : `${preparedEvents.length} event${
          preparedEvents.length === 1
            ? ""
            : "s"
        }`;

  const showSearch =
    settings.showSearch &&
    settings.mode !==
      "alarm-summary";

  return (
    <div
      className={`${TECH_SURFACE_CLASS} logs-widget flex min-h-0 flex-col p-0`}
    >
      <TechBackdrop />

      <WidgetHeader
        label={label}
        subtitle={subtitle}
        showSearch={showSearch}
        search={search}
        setSearch={setSearch}
      />

      {settings.mode ===
      "alarm-summary" ? (
        <AlarmSummary
          events={preparedEvents}
          settings={settings}
        />
      ) : settings.mode ===
        "alarm-list" ? (
        <AlarmList
          events={preparedEvents}
          settings={settings}
          search={search}
        />
      ) : (
        <EventLog
          events={preparedEvents}
          settings={settings}
          search={search}
        />
      )}
    </div>
  );
}

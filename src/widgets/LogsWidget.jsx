import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Info,
  Search,
  TriangleAlert,
} from "lucide-react";
import { TECH_SURFACE_CLASS, TechBackdrop } from "./widgetTech";

const DEFAULT_DISPLAY = {
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
};

const levelStyles = {
  info: {
    label: "Info",
    icon: Info,
    badge:
      "bg-indigo-100 text-indigo-700 dark:bg-[#7D75E7]/12 dark:text-[#A6A1FF]",
    iconClass:
      "text-indigo-600 dark:text-[#A6A1FF]",
  },

  success: {
    label: "Success",
    icon: CheckCircle2,
    badge:
      "bg-cyan-100 text-cyan-700 dark:bg-[#58D7FF]/10 dark:text-[#58D7FF]",
    iconClass:
      "text-cyan-600 dark:text-[#58D7FF]",
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
    label: "Log",
    icon: CircleDot,
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    iconClass:
      "text-slate-500 dark:text-slate-300",
  },
};

const normalizeLog = (log, index) => ({
  id:
    log?.id ??
    `${log?.timestamp || "log"}-${index}`,

  timestamp:
    log?.timestamp ||
    log?.time ||
    new Date().toISOString(),

  level:
    String(log?.level || "info").toLowerCase(),

  source:
    log?.source ||
    log?.device ||
    log?.category ||
    "System",

  message:
    log?.message ||
    log?.description ||
    "No message provided.",
});

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

export default function LogsWidget({
  logs = [],
  label = "System Logs",
  display = {},
}) {
  const [search, setSearch] =
    useState("");

  const settings = {
    ...DEFAULT_DISPLAY,
    ...(display || {}),

    levelFilter: Array.isArray(
      display?.levelFilter
    )
      ? display.levelFilter
      : DEFAULT_DISPLAY.levelFilter,
  };

  const preparedLogs = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    const normalized = (
      Array.isArray(logs) ? logs : []
    ).map(normalizeLog);

    const filtered =
      normalized.filter((log) => {
        const levelAllowed =
          settings.levelFilter.length === 0 ||
          settings.levelFilter.includes(
            log.level
          );

        if (!levelAllowed) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return [
          log.level,
          log.source,
          log.message,
          formatTimestamp(log.timestamp),
        ].some((value) =>
          String(value)
            .toLowerCase()
            .includes(keyword)
        );
      });

    filtered.sort((a, b) => {
      const aTime =
        new Date(a.timestamp).getTime();

      const bTime =
        new Date(b.timestamp).getTime();

      const safeA =
        Number.isFinite(aTime) ? aTime : 0;

      const safeB =
        Number.isFinite(bTime) ? bTime : 0;

      return settings.sortOrder === "oldest"
        ? safeA - safeB
        : safeB - safeA;
    });

    const maxEntries = Math.max(
      1,
      Number(settings.maxEntries) || 50
    );

    return filtered.slice(
      0,
      maxEntries
    );
  }, [
    logs,
    search,
    settings.levelFilter,
    settings.maxEntries,
    settings.sortOrder,
  ]);

  return (
    <div
      className={`${TECH_SURFACE_CLASS} flex min-h-0 flex-col p-0`}
    >
      <TechBackdrop />
      <div
        className="
          flex shrink-0
          items-center justify-between
          gap-3 border-b
          border-slate-100 pr-14
          bg-white
          px-4 py-3
          dark:border-[#263657]
          dark:bg-[#0E172D]
        "
      >
        <div className="min-w-0">
          <h3
            className="
              truncate text-sm
              font-bold text-slate-900
              dark:text-white
            "
            title={label}
          >
            {label}
          </h3>

          <p
            className="
              mt-0.5 text-[9px]
              text-slate-500
              dark:text-slate-400
            "
          >
            {preparedLogs.length} log
            {preparedLogs.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        {settings.showSearch && (
          <div className="relative w-36 max-w-[44%]">
            <Search
              size={14}
              className="
                absolute left-3 top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search logs"
              className="
                w-full rounded-xl
                border border-slate-300
                bg-slate-50
                py-2 pl-8 pr-3
                text-[11px] text-slate-800
                outline-none
                focus:ring-2
                focus:ring-[#58D7FF]
                dark:border-slate-600
                dark:bg-[#081022]
                dark:text-white
              "
            />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {preparedLogs.length === 0 ? (
          <div
            className="
              flex h-full min-h-32
              flex-col items-center
              justify-center px-5
              text-center
            "
          >
            <CircleDot
              size={28}
              className="
                text-[#58D7FF]
                dark:text-[#58D7FF]
              "
            />

            <p
              className="
                mt-3 text-xs font-semibold
                text-slate-600
                dark:text-slate-300
              "
            >
              No logs found
            </p>

            <p
              className="
                mt-1 text-[10px]
                text-slate-400
                dark:text-slate-500
              "
            >
              Logs will appear here when events are available.
            </p>
          </div>
        ) : (
          <div
            className="
              divide-y
              divide-slate-100
              dark:divide-[#263657]
            "
          >
            {preparedLogs.map((log) => {
              const style =
                levelStyles[log.level] ||
                levelStyles.default;

              const LevelIcon =
                style.icon;

              return (
                <div
                  key={log.id}
                  className={`
                    flex gap-3
                    px-4
                    transition
                    hover:bg-[#58D7FF]/8
                    hover:text-slate-900
                    dark:hover:bg-slate-800
                    dark:hover:text-slate-100

                    ${
                      settings.compact
                        ? "py-2"
                        : "py-3"
                    }
                  `}
                >
                  <div
                    className={`
                      mt-0.5 flex h-8 w-8
                      shrink-0 items-center
                      justify-center rounded-xl
                      bg-slate-100
                      dark:bg-slate-800
                      ${style.iconClass}
                    `}
                  >
                    <LevelIcon size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className="
                        flex flex-wrap
                        items-center gap-2
                      "
                    >
                      {settings.showLevel && (
                        <span
                          className={`
                            rounded-full
                            px-2 py-0.5
                            text-[9px]
                            font-black uppercase
                            tracking-wide
                            ${style.badge}
                          `}
                        >
                          {style.label}
                        </span>
                      )}

                      {settings.showSource && (
                        <span
                          className="
                            truncate text-[10px]
                            font-semibold
                            text-slate-600
                            dark:text-slate-300
                          "
                        >
                          {log.source}
                        </span>
                      )}

                      {settings.showTimestamp && (
                        <span
                          className="
                            ml-auto shrink-0
                            text-[9px]
                            text-slate-400
                            dark:text-slate-500
                          "
                        >
                          {formatTimestamp(
                            log.timestamp
                          )}
                        </span>
                      )}
                    </div>

                    <p
                      className={`
                        text-slate-700
                        dark:text-slate-200

                        ${
                          settings.compact
                            ? "mt-1 text-[11px]"
                            : "mt-1.5 text-xs"
                        }
                      `}
                    >
                      {log.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

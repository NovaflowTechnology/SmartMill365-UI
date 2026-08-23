import { useEffect, useRef, useState } from "react";

import WidgetRenderer from "../components/WidgetRenderer";

import {
  Maximize2,
  Minimize2,
  LayoutGrid,
  Activity,
  Pencil,
  Plus,
  FolderOpen,
  RefreshCw,
  CalendarDays,
  ChevronDown,
  X,
} from "lucide-react";

const TIME_RANGE_OPTIONS = [
  { value: "5m", label: "Last 5 minutes" },
  { value: "15m", label: "Last 15 minutes" },
  { value: "30m", label: "Last 30 minutes" },
  { value: "1h", label: "Last 1 hour" },
  { value: "3h", label: "Last 3 hours" },
  { value: "6h", label: "Last 6 hours" },
  { value: "12h", label: "Last 12 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "2d", label: "Last 2 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6mo", label: "Last 6 months" },
  { value: "1y", label: "Last 1 year" },
  { value: "2y", label: "Last 2 years" },
  { value: "5y", label: "Last 5 years" },
];

const CALENDAR_RANGE_OPTIONS = [
  { value: "yesterday", label: "Yesterday" },
  { value: "dayBeforeYesterday", label: "Day before yesterday" },
  { value: "thisDayLastWeek", label: "This day last week" },
  { value: "previousWeek", label: "Previous week" },
  { value: "previousMonth", label: "Previous month" },
  { value: "previousQuarter", label: "Previous quarter" },
  { value: "previousYear", label: "Previous year" },
  { value: "today", label: "Today" },
  { value: "todaySoFar", label: "Today so far" },
  { value: "thisWeek", label: "This week" },
  { value: "thisWeekSoFar", label: "This week so far" },
  { value: "thisMonth", label: "This month" },
  { value: "thisMonthSoFar", label: "This month so far" },
  { value: "thisYear", label: "This year" },
  { value: "thisYearSoFar", label: "This year so far" },
];

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const startOfWeek = (value) => {
  const date = startOfDay(value);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
};

const endOfWeek = (value) => {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
};

const startOfMonth = (value) => {
  const date = startOfDay(value);
  date.setDate(1);
  return date;
};

const endOfMonth = (value) => {
  const date = startOfMonth(value);
  date.setMonth(date.getMonth() + 1);
  date.setMilliseconds(-1);
  return date;
};

const startOfYear = (value) => {
  const date = startOfDay(value);
  date.setMonth(0, 1);
  return date;
};

const endOfYear = (value) => {
  const date = startOfYear(value);
  date.setFullYear(date.getFullYear() + 1);
  date.setMilliseconds(-1);
  return date;
};

const startOfQuarter = (value) => {
  const date = startOfDay(value);
  date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
  return date;
};

const toDateTimeLocalValue = (value) => {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getCalendarRange = (kind) => {
  const now = new Date();
  let from;
  let to;

  switch (kind) {
    case "yesterday": {
      const date = new Date(now);
      date.setDate(date.getDate() - 1);
      from = startOfDay(date);
      to = endOfDay(date);
      break;
    }

    case "dayBeforeYesterday": {
      const date = new Date(now);
      date.setDate(date.getDate() - 2);
      from = startOfDay(date);
      to = endOfDay(date);
      break;
    }

    case "thisDayLastWeek": {
      const date = new Date(now);
      date.setDate(date.getDate() - 7);
      from = startOfDay(date);
      to = endOfDay(date);
      break;
    }

    case "previousWeek": {
      const date = new Date(now);
      date.setDate(date.getDate() - 7);
      from = startOfWeek(date);
      to = endOfWeek(date);
      break;
    }

    case "previousMonth": {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      from = startOfMonth(date);
      to = endOfMonth(date);
      break;
    }

    case "previousQuarter": {
      const currentQuarterStart = startOfQuarter(now);

      from = new Date(currentQuarterStart);
      from.setMonth(from.getMonth() - 3);

      to = new Date(currentQuarterStart);
      to.setMilliseconds(-1);
      break;
    }

    case "previousYear": {
      const date = new Date(now.getFullYear() - 1, 0, 1);
      from = startOfYear(date);
      to = endOfYear(date);
      break;
    }

    // Active calendar periods must not send a future endTime.
    case "today":
    case "todaySoFar":
      from = startOfDay(now);
      to = now;
      break;

    case "thisWeek":
    case "thisWeekSoFar":
      from = startOfWeek(now);
      to = now;
      break;

    case "thisMonth":
    case "thisMonthSoFar":
      from = startOfMonth(now);
      to = now;
      break;

    case "thisYear":
    case "thisYearSoFar":
      from = startOfYear(now);
      to = now;
      break;

    default:
      return null;
  }

  return {
    startTime: from.toISOString(),
    endTime: to.toISOString(),
  };
};

const getTimeRequest = (timeRange, customRange) => {
  if (TIME_RANGE_OPTIONS.some((option) => option.value === timeRange)) {
    return { historyWindow: `-${timeRange}` };
  }

  if (timeRange === "custom") {
    const start = new Date(customRange.from).getTime();
    const end = new Date(customRange.to).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return null;
    }

    return {
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
    };
  }

  return getCalendarRange(timeRange);
};

const getTimeRangeLabel = (timeRange, customRange) => {
  const quick = TIME_RANGE_OPTIONS.find((option) => option.value === timeRange);
  if (quick) return quick.label;

  if (timeRange === "custom" && customRange.from && customRange.to) {
    return `${new Date(customRange.from).toLocaleDateString()} – ${new Date(
      customRange.to
    ).toLocaleDateString()}`;
  }

  return (
    CALENDAR_RANGE_OPTIONS.find((option) => option.value === timeRange)
      ?.label || "Last 15 minutes"
  );
};

export default function Dashboard({
  template,
  setFullscreen,
  setPage,
  dark = false,
}) {
  const currentRole =
    localStorage.getItem("role");

  const canEditTemplate =
    ["superadmin", "admin", "editor"].includes(
      currentRole
    );

  const [data, setData] = useState({});
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [timeRange, setTimeRange] =
    useState("15m");

  const [showTimeRangeMenu, setShowTimeRangeMenu] =
    useState(false);

  const [customRange, setCustomRange] = useState(() => {
    const now = new Date();

    return {
      from: toDateTimeLocalValue(
        new Date(now.getTime() - 60 * 60 * 1000)
      ),
      to: toDateTimeLocalValue(now),
    };
  });
  const [liveStatus, setLiveStatus] =
    useState(null);

  const [sankeyValues, setSankeyValues] =
    useState({});

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  // The dashboard has three practical viewing situations:
  // 1. sidebar open  -> narrower dashboard canvas
  // 2. sidebar closed -> wider dashboard canvas
  // 3. fullscreen -> widest canvas with its own density
  //
  // We observe the ACTUAL dashboard width instead of coupling this
  // component to Layout's sidebar state.
  const dashboardRef = useRef(null);
  const dashboardGridRef = useRef(null);

  // Prevent overlapping /template-live-data requests.
  // This is important when an Influx request takes longer than the normal
  // polling interval.
  const liveRequestInFlightRef =
    useRef(false);

  const [dashboardMode, setDashboardMode] =
    useState("sidebar-open");

  const [
    dashboardAvailableHeight,
    setDashboardAvailableHeight,
  ] = useState(0);

  useEffect(() => {
    const element = dashboardRef.current;
    if (!element) return undefined;

    let frameId = 0;

    const updateMode = () => {
      cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        if (isFullscreen) {
          setDashboardMode((current) =>
            current === "fullscreen"
              ? current
              : "fullscreen"
          );
          return;
        }

        const width =
          element.getBoundingClientRect().width;

        const nextMode =
          width < 1420
            ? "sidebar-open"
            : "sidebar-closed";

        setDashboardMode((current) =>
          current === nextMode
            ? current
            : nextMode
        );
      });
    };

    updateMode();

    const observer =
      new ResizeObserver(updateMode);

    observer.observe(element);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [isFullscreen]);

  // Compact dashboard rows.
  // These are intentionally smaller than the original 225–235px cards.
  // The dashboard will also cap the row height to the remaining viewport
  // space so a normal layout does not overflow the page.
  const preferredDashboardRowHeight =
    dashboardMode === "sidebar-open"
      ? 180
      : dashboardMode === "fullscreen"
      ? 182
      : 188;

  const dashboardGap =
    "gap-2";

  const dashboardGapPx = 8;

  const [items, setItems] = useState(
    template?.layout?.items || []
  );

  const [loadingData, setLoadingData] =
    useState(false);

  const [dataError, setDataError] =
    useState("");

  const layout =
    typeof template?.layout === "string"
      ? JSON.parse(template.layout)
      : template?.layout || {};

  // Dashboard view should only render rows that are actually occupied.
  // The template can still keep a larger configured grid for editing,
  // but empty rows below the last widget should not create scroll space.
  const occupiedDashboardRows =
    items.length > 0
      ? Math.max(
          1,
          ...items.map((item) => {
            const y = Number(item?.y) || 0;
            const h = Math.max(
              1,
              Number(item?.h) || 1
            );

            return y + h;
          })
        )
      : 1;

  // Measure the visible space from the dashboard grid to the bottom
  // of Layout's scrolling <main>. We only SHRINK rows when needed;
  // we do not stretch compact widgets to fill an unusually tall screen.
  useEffect(() => {
    let frameId = 0;

    const measureAvailableHeight =
      () => {
        if (
          !dashboardGridRef.current
        ) {
          return;
        }

        cancelAnimationFrame(
          frameId
        );

        frameId =
          requestAnimationFrame(
            () => {
              const gridRect =
                dashboardGridRef.current?.getBoundingClientRect();

              if (!gridRect) {
                return;
              }

              const main =
                dashboardRef.current?.closest(
                  "main"
                );

              const mainRect =
                main?.getBoundingClientRect();

              const visibleBottom =
                isFullscreen
                  ? window.innerHeight
                  : mainRect?.bottom ||
                    window.innerHeight;

              const bottomSafetyGap =
                isFullscreen
                  ? 6
                  : 4;

              const nextHeight =
                Math.max(
                  180,
                  Math.floor(
                    visibleBottom -
                      gridRect.top -
                      bottomSafetyGap
                  )
                );

              setDashboardAvailableHeight(
                (current) =>
                  Math.abs(
                    current -
                      nextHeight
                  ) < 2
                    ? current
                    : nextHeight
              );
            }
          );
      };

    measureAvailableHeight();

    window.addEventListener(
      "resize",
      measureAvailableHeight
    );

    const observer =
      typeof ResizeObserver !==
      "undefined"
        ? new ResizeObserver(
            measureAvailableHeight
          )
        : null;

    if (
      dashboardRef.current &&
      observer
    ) {
      observer.observe(
        dashboardRef.current
      );
    }

    const main =
      dashboardRef.current?.closest(
        "main"
      );

    if (
      main &&
      observer
    ) {
      observer.observe(main);
    }

    return () => {
      cancelAnimationFrame(
        frameId
      );

      window.removeEventListener(
        "resize",
        measureAvailableHeight
      );

      observer?.disconnect();
    };
  }, [
    isFullscreen,
    dashboardMode,
    occupiedDashboardRows,
    dataError,
    template?.id,
  ]);

  const fitRowHeight =
    dashboardAvailableHeight > 0
      ? Math.floor(
          (
            dashboardAvailableHeight -
            Math.max(
              0,
              occupiedDashboardRows - 1
            ) *
              dashboardGapPx
          ) /
            occupiedDashboardRows
        )
      : preferredDashboardRowHeight;

  /*
   * Let normal dashboards USE the available page height instead of leaving
   * a large empty area underneath the final widget row.
   *
   * 1 row  -> may grow more
   * 2 rows -> moderate growth
   * 3 rows -> fills the page naturally
   * 4+     -> keep the compact baseline and scroll instead of stretching
   */
  const maximumFitRowHeight =
    occupiedDashboardRows === 1
      ? 360
      : occupiedDashboardRows === 2
      ? 280
      : 235;

  const dashboardRowHeight =
    occupiedDashboardRows <= 3
      ? Math.max(
          160,
          Math.min(
            maximumFitRowHeight,
            fitRowHeight
          )
        )
      : preferredDashboardRowHeight;

  const influxConfig =
    layout?.influx || null;

  const channelMap =
    layout?.channelMap || {};

  const dataSources =
    layout?.dataSources &&
    typeof layout.dataSources === "object" &&
    !Array.isArray(layout.dataSources)
      ? layout.dataSources
      : (layout?.customDataOptions || []).reduce(
          (result, option) => {
            const source = option?.source;

            if (
              option?.key &&
              source?.bucket &&
              source?.measurement &&
              (
                source?.tagValue ||
                source?.id
              ) &&
              (
                source?.field ||
                source?.channel
              )
            ) {
              result[option.key] = {
                bucket: source.bucket,
                measurement:
                  source.measurement,
                tagKey:
                  source.tagKey || "id",
                tagValue:
                  source.tagValue ||
                  source.id,
                id:
                  source.tagValue ||
                  source.id,
                field:
                  source.field ||
                  source.channel,
              };
            }

            return result;
          },
          {}
        );

  const hasPerSourceMapping =
    Object.keys(dataSources).length > 0;

  const hasLegacyMapping =
    Boolean(
      influxConfig?.bucket &&
      influxConfig?.measurement &&
      influxConfig?.id &&
      channelMap &&
      Object.keys(channelMap).length > 0
    );

  const templateTitle =
    template?.name ||
    `Template #${template?.id || ""}` ||
    "Dashboard";

  const [detectedDark, setDetectedDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      const bodyHasDark = document.body.classList.contains("dark");
      const storedTheme = localStorage.getItem("theme");
      const storedDarkMode = localStorage.getItem("darkMode");

      setDetectedDark(
        htmlHasDark ||
          bodyHasDark ||
          storedTheme === "dark" ||
          storedDarkMode === "true"
      );
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("storage", checkDarkMode);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", checkDarkMode);
    };
  }, []);

  const isDarkMode = dark || detectedDark;

  // UPDATE TEMPLATE ITEMS WHEN TEMPLATE CHANGES
  useEffect(() => {
    setItems(layout?.items || []);
    setData({});
    setHistory([]);
    setLogs([]);
    setLiveStatus(null);
    setSankeyValues({});
  }, [template]);

  // FETCH TEMPLATE-SPECIFIC LIVE DATA
  const fetchTemplateLiveData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
      return false;
    }

    // If the previous poll is still waiting on InfluxDB, skip this cycle
    // instead of stacking another expensive live + history request.
    if (
      liveRequestInFlightRef.current
    ) {
      return false;
    }

    if (
      !hasPerSourceMapping &&
      !hasLegacyMapping
    ) {
      setDataError(
        "This template has no widget data sources configured."
      );

      setLiveStatus(null);
      setSankeyValues({});
      setLogs([]);
      return false;
    }

    const timeRequest = getTimeRequest(
      timeRange,
      customRange
    );

    if (!timeRequest) {
      setDataError(
        "Choose a valid custom start and end time."
      );
      return false;
    }

    liveRequestInFlightRef.current =
      true;

    try {
      setLoadingData(true);
      setDataError("");

      const res = await fetch(
        "http://localhost:5000/template-live-data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            // Preferred multi-source format.
            dataSources,

            // Legacy format remains included for older templates.
            influx: influxConfig,
            channelMap,

            ...timeRequest,
            items: layout?.items || items || [],
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        const requestError =
          new Error(
            result?.error ||
              "Failed to retrieve template live data"
          );

        requestError.transient =
          Boolean(
            result?.transient ||
            res.status === 503
          );

        throw requestError;
      }

      const incoming = result?.data || {};

      setData(incoming);
      setLiveStatus(result?.liveStatus || null);
      setSankeyValues(result?.sankeyValues || {});

      // Logs should be returned separately by the backend. The widget
      // renderer also supports logs inside data.logs or liveStatus.logs,
      // but keeping a dedicated state prevents them from being mixed with
      // numeric channel values.
      setLogs(
        Array.isArray(result?.logs)
          ? result.logs
          : Array.isArray(result?.liveStatus?.logs)
          ? result.liveStatus.logs
          : Array.isArray(incoming?.logs)
          ? incoming.logs
          : []
      );

      // Use real historical rows returned by InfluxDB. Do not build
      // chart history from the current live reading on the browser.
      setHistory(
        Array.isArray(result?.history)
          ? result.history
          : []
      );

      return true;
    } catch (err) {
      console.error(
        "❌ Template live data error:",
        err
      );

      /*
       * IMPORTANT:
       * Do NOT clear data/history/liveStatus/logs/sankeyValues here.
       *
       * One temporary timeout should not make a monitoring dashboard appear
       * empty. Keep the last successful snapshot until the next request
       * succeeds.
       */
      setDataError(
        err?.transient
          ? "Live connection delayed. Showing the last successful data."
          : err.message ||
            "Unable to retrieve live data."
      );

      return false;
    } finally {
      liveRequestInFlightRef.current =
        false;

      setLoadingData(false);
    }
  };

  // FETCH CURRENT VALUES + REAL INFLUX HISTORY
  //
  // Sequential polling avoids request pile-up:
  // request -> finish -> wait 5s -> next request.
  //
  // With setInterval(), a 10–15 second Influx timeout could otherwise
  // create multiple overlapping /template-live-data requests.
  useEffect(() => {
    if (!template) {
      return;
    }

    let cancelled = false;
    let timer = null;

    const poll =
      async () => {
        await fetchTemplateLiveData();

        if (!cancelled) {
          timer =
            window.setTimeout(
              poll,
              5000
            );
        }
      };

    poll();

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(
          timer
        );
      }
    };
  }, [
    template?.id,
    JSON.stringify(dataSources),
    influxConfig?.bucket,
    influxConfig?.measurement,
    influxConfig?.id,
    JSON.stringify(channelMap),
    timeRange,
    customRange.from,
    customRange.to,
  ]);

  // ESC FULLSCREEN EXIT
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setFullscreen?.(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () =>
      window.removeEventListener(
        "keydown",
        handleEsc
      );
  }, [setFullscreen]);

  const toggleFullscreen = () => {
    const next = !isFullscreen;

    setIsFullscreen(next);
    setFullscreen?.(next);
  };

  if (!template) {
    return (
      <div
        className={`
          dashboard-page
          ${isDarkMode ? "dark dashboard-dark bg-[#050a1e] text-slate-100" : ""}
          min-h-[calc(100vh-3rem)]
          w-full
          flex items-center
          justify-center
          p-6
        `}
      >
        {isDarkMode && (
          <style>{`
            .dashboard-dark {
              color: #e2e8f0;
              background-color: #0b1120 !important;
            }

            .dashboard-dark .text-gray-900,
            .dashboard-dark .text-gray-800,
            .dashboard-dark .text-gray-700 {
              color: #f8fafc !important;
            }

            .dashboard-dark .text-gray-600,
            .dashboard-dark .text-gray-500,
            .dashboard-dark .text-gray-400,
            .dashboard-dark .text-gray-300 {
              color: #cbd5e1 !important;
            }

            .dashboard-dark .bg-gray-100 {
              background-color: #1e293b !important;
            }

            .dashboard-dark .hover\\:bg-gray-200:hover {
              background-color: #334155 !important;
            }
          `}</style>
        )}

        <div
          className={`
            max-w-xl
            w-full
            rounded-3xl
            border
            p-10
            text-center
            shadow-lg
            ${
              isDarkMode
                ? "border-slate-700 bg-slate-900 text-slate-100 shadow-black/30"
                : "border-gray-200 bg-white text-gray-900"
            }
          `}
        >
          <div
            className="
              w-16 h-16
              mx-auto mb-5
              rounded-3xl
              bg-emerald-500/10
              text-emerald-500
              flex items-center
              justify-center
            "
          >
            <LayoutGrid className="w-8 h-8" />
          </div>

          <h2
            className="
              text-2xl
              font-black
              text-gray-900
              dark:text-white
              mb-3
            "
          >
            No Dashboard Template Found
          </h2>

          <p
            className="
              text-gray-500
              dark:text-gray-400
              mb-6
              leading-relaxed
            "
          >
            There is no dashboard template available yet. Please create a new template first, then assign it to an organization if needed.
          </p>

          <div
            className="
              flex flex-col
              sm:flex-row
              gap-3
              justify-center
            "
          >
            <button
              onClick={() => setPage?.("builder")}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-5 py-3
                rounded-[14px]
                bg-blue-600
                hover:bg-emerald-700
                text-white
                font-semibold
                transition
              "
            >
              <Plus size={18} />
              Create Template
            </button>

            <button
              onClick={() => setPage?.("templates")}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-5 py-3
                rounded-[14px]
                bg-gray-100
                hover:bg-gray-200
                dark:bg-gray-700
                dark:hover:bg-gray-600
                text-gray-700
                dark:text-white
                font-semibold
                transition
              "
            >
              <FolderOpen size={18} />
              View Templates
            </button>
          </div>
        </div>
        </div>
    );
  }

  return (
    <div
      ref={dashboardRef}
      data-dashboard-mode={dashboardMode}
      className={`
        dashboard-page
        ${isDarkMode ? "dark dashboard-dark bg-[#0b1120] text-slate-100" : "bg-[#eef1f5] text-slate-900"}
        ${
          isFullscreen
            ? `
              fixed inset-0
              ${isDarkMode ? "bg-[#0b1120]" : "bg-[#eef1f5]"}
              z-50
              flex flex-col
              overflow-y-auto
              p-3
            `
            : `
              min-h-0
              w-full
              flex flex-col
              ${isDarkMode ? "bg-[#0b1120]" : "bg-[#eef1f5]"}
            `
        }
      `}
    >
      {isDarkMode && (
        <style>{`
          .dashboard-dark {
            color: #e2e8f0;
            background-color: #0b1120 !important;
          }

          .dashboard-dark * {
            scrollbar-color: #334155 #020617;
          }

          .dashboard-dark .bg-white {
            background-color: #0f172a !important;
          }

          .dashboard-dark .bg-gray-50,
          .dashboard-dark .bg-gray-100 {
            background-color: #0f172a !important;
          }

          .dashboard-dark .bg-gray-200,
          .dashboard-dark .bg-gray-700 {
            background-color: #1e293b !important;
          }

          .dashboard-dark .bg-gray-800,
          .dashboard-dark .bg-slate-800 {
            background-color: #0f172a !important;
          }

          .dashboard-dark .bg-gray-900,
          .dashboard-dark .bg-slate-900,
          .dashboard-dark .bg-slate-950 {
            background-color: #111827 !important;
          }

          .dashboard-dark .border-gray-200,
          .dashboard-dark .border-gray-300,
          .dashboard-dark .border-gray-600,
          .dashboard-dark .border-gray-700,
          .dashboard-dark .border-slate-700 {
            border-color: #334155 !important;
          }

          .dashboard-dark .text-gray-900,
          .dashboard-dark .text-gray-800,
          .dashboard-dark .text-gray-700 {
            color: #f8fafc !important;
          }

          .dashboard-dark .text-gray-600,
          .dashboard-dark .text-gray-500,
          .dashboard-dark .text-gray-400,
          .dashboard-dark .text-gray-300 {
            color: #cbd5e1 !important;
          }

          .dashboard-dark input,
          .dashboard-dark select,
          .dashboard-dark textarea {
            color: #f8fafc !important;
            background-color: #111827 !important;
            border-color: #334155 !important;
          }

          .dashboard-dark input::placeholder,
          .dashboard-dark textarea::placeholder {
            color: #64748b !important;
          }

          .dashboard-dark option {
            color: #f8fafc !important;
            background-color: #111827 !important;
          }

          .dashboard-dark .hover\:bg-gray-50:hover,
          .dashboard-dark .hover\:bg-gray-100:hover,
          .dashboard-dark .dark\:hover\:bg-gray-700:hover,
          .dashboard-dark .dark\:hover\:bg-gray-800:hover {
            background-color: #1e293b !important;
          }

          .dashboard-dark .recharts-cartesian-axis-tick-value,
          .dashboard-dark .recharts-text,
          .dashboard-dark .recharts-label {
            fill: #cbd5e1 !important;
            color: #cbd5e1 !important;
          }

          .dashboard-dark .recharts-cartesian-grid line {
            stroke: #334155 !important;
          }
        `}</style>
      )}

      <style>{`
        /*
         * Widget hover layering
         * ---------------------
         * Every dashboard cell normally clips its own content so the grid
         * stays tidy. On hover/focus we temporarily lift that cell above
         * neighboring widgets and allow overlays (especially Recharts
         * tooltips) to escape the card boundary.
         */
        .dashboard-widget-cell {
          position: relative;
          z-index: 0;
          isolation: auto;
          overflow: hidden;
        }

        .dashboard-widget-cell:hover,
        .dashboard-widget-cell:focus-within {
          z-index: 80;
          overflow: visible;
        }

        .dashboard-widget-cell:hover .dashboard-widget-surface,
        .dashboard-widget-cell:focus-within .dashboard-widget-surface {
          overflow: visible !important;
        }

        .dashboard-widget-cell:hover .recharts-responsive-container,
        .dashboard-widget-cell:focus-within .recharts-responsive-container,
        .dashboard-widget-cell:hover .recharts-wrapper,
        .dashboard-widget-cell:focus-within .recharts-wrapper {
          overflow: visible !important;
        }

        .dashboard-widget-cell:hover .recharts-tooltip-wrapper,
        .dashboard-widget-cell:focus-within .recharts-tooltip-wrapper {
          z-index: 160 !important;
          overflow: visible !important;
          pointer-events: none;
        }
      `}</style>

      {/* HEADER */}
      <div
        className={`
          flex flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-2
          bg-white
          dark:bg-slate-900
          border border-slate-200
          dark:border-slate-700
          shadow-[0_2px_8px_rgba(15,23,42,0.05)]

          ${
            isFullscreen
              ? `
                mb-1
                rounded-[10px]
                px-2.5 py-1
              `
              : `
                mb-1
                rounded-[10px]
                px-3 py-1.5
              `
          }
        `}
      >
        <div>
          <div
            className="
              flex items-center
              gap-2
            "
          >
            <div
              className={`
                rounded-full
                border border-slate-200
                bg-white
                flex items-center
                justify-center
                text-emerald-600
                shadow-sm
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-emerald-300

                ${
                  isFullscreen
                    ? "w-6 h-6"
                    : "w-7 h-7"
                }
              `}
            >
              <Activity
                size={15}
                strokeWidth={2.25}
              />
            </div>

            <div>
              <h1
                className={`
                  font-black
                  leading-tight
                  text-gray-900
                  dark:text-white

                  ${
                    isFullscreen
                      ? "text-[14px]"
                      : "text-base"
                  }
                `}
              >
                {templateTitle}
              </h1>

              {!isFullscreen &&
                influxConfig?.id && (
                  <p
                    className="
                      text-[9px]
                      leading-none
                      text-gray-500
                      dark:text-gray-400
                      mt-[2px]
                    "
                  >
                    {influxConfig.bucket} /{" "}
                    {influxConfig.measurement} /{" "}
                    {influxConfig.id}
                  </p>
                )}
            </div>
          </div>
        </div>

        <div
          className="
            flex flex-wrap
            items-center
            gap-1.5
          "
        >
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setShowTimeRangeMenu((visible) => !visible)
              }
              className={`
                inline-flex items-center gap-1.5
                rounded-[10px]
                bg-white dark:bg-gray-900
                border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-200
                shadow-sm outline-none
                hover:bg-gray-50 dark:hover:bg-gray-700
                focus:ring-2 focus:ring-emerald-500
                ${
                  isFullscreen
                    ? "h-6 px-2 text-[9px]"
                    : "h-7 px-2 text-[10px]"
                }
              `}
              title="Chart history time range"
            >
              <CalendarDays size={13} />
              <span className="max-w-48 truncate font-semibold">
                {getTimeRangeLabel(timeRange, customRange)}
              </span>
              <ChevronDown
                size={12}
                className={
                  showTimeRangeMenu
                    ? "rotate-180 transition-transform"
                    : "transition-transform"
                }
              />
            </button>

            {showTimeRangeMenu && (
              <div
                className="
                  absolute right-0 top-full z-40 mt-1.5
                  w-[min(760px,calc(100vw-2rem))]
                  overflow-hidden rounded-3xl
                  border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900
                  shadow-2xl
                "
              >
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      Dashboard time range
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      All trend widgets use this same period.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTimeRangeMenu(false)}
                    className="rounded-[14px] p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label="Close time range menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid max-h-[70vh] grid-cols-1 overflow-y-auto md:grid-cols-[1fr_1fr_1.1fr]">
                  <section className="border-b border-gray-200 p-4 dark:border-gray-700 md:border-b-0 md:border-r">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Quick ranges
                    </p>

                    <div className="space-y-1">
                      {TIME_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setTimeRange(option.value);
                            setShowTimeRangeMenu(false);
                          }}
                          className={`
                            w-full rounded-[14px] px-3 py-2 text-left text-sm transition
                            ${
                              timeRange === option.value
                                ? "bg-emerald-600 text-white"
                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="border-b border-gray-200 p-4 dark:border-gray-700 md:border-b-0 md:border-r">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Calendar ranges
                    </p>

                    <div className="space-y-1">
                      {CALENDAR_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setTimeRange(option.value);
                            setShowTimeRangeMenu(false);
                          }}
                          className={`
                            w-full rounded-[14px] px-3 py-2 text-left text-sm transition
                            ${
                              timeRange === option.value
                                ? "bg-emerald-600 text-white"
                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Custom range
                    </p>

                    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                      Select the exact start and end date/time.
                    </p>

                    <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                      From
                    </label>
                    <input
                      type="datetime-local"
                      value={customRange.from}
                      onChange={(event) =>
                        setCustomRange((current) => ({
                          ...current,
                          from: event.target.value,
                        }))
                      }
                      className="mb-4 w-full rounded-[14px] border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />

                    <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                      To
                    </label>
                    <input
                      type="datetime-local"
                      value={customRange.to}
                      onChange={(event) =>
                        setCustomRange((current) => ({
                          ...current,
                          to: event.target.value,
                        }))
                      }
                      className="mb-4 w-full rounded-[14px] border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const request = getTimeRequest(
                          "custom",
                          customRange
                        );

                        if (!request) {
                          setDataError(
                            "Custom end time must be later than the start time."
                          );
                          return;
                        }

                        setDataError("");
                        setTimeRange("custom");
                        setShowTimeRangeMenu(false);
                      }}
                      className="w-full rounded-[14px] bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Apply custom range
                    </button>
                  </section>
                </div>
              </div>
            )}
          </div>

          {canEditTemplate && !isFullscreen && (
            <button
              type="button"
              onClick={() =>
                setPage?.("editor")
              }
              className="
                inline-flex h-7
                items-center
                justify-center gap-1.5
                rounded-[10px]
                border border-emerald-200
                bg-emerald-50 px-2.5
                text-[10px] font-bold
                tracking-wide
                text-emerald-700
                shadow-sm
                transition-colors
                hover:border-emerald-300
                hover:bg-emerald-100
                focus:outline-none
                focus:ring-2
                focus:ring-emerald-500/20
                dark:border-emerald-500/30
                dark:bg-emerald-500/10
                dark:text-emerald-300
                dark:hover:bg-emerald-500/20
              "
              title="Edit this template"
            >
              <Pencil size={12} />
              EDIT
            </button>
          )}

          <button
            onClick={fetchTemplateLiveData}
            disabled={loadingData}
            className={`
              inline-flex items-center
              gap-1.5
              rounded-[10px]
              bg-white
              hover:bg-gray-50
              dark:bg-gray-900
              dark:hover:bg-gray-700
              border border-gray-200
              dark:border-gray-700
              text-gray-700
              dark:text-gray-200
              shadow-sm
              transition
              disabled:opacity-60
              disabled:cursor-not-allowed

              ${
                isFullscreen
                  ? "h-6 px-2"
                  : "h-7 px-2"
              }
            `}
            title="Refresh live data"
          >
            <RefreshCw
              size={13}
              className={
                loadingData
                  ? "animate-spin"
                  : ""
              }
            />

            <span
              className="
                text-[10px]
                font-bold
                tracking-wide
              "
            >
              REFRESH
            </span>
          </button>

          <button
            onClick={toggleFullscreen}
            className={`
              inline-flex items-center
              gap-1.5
              rounded-[10px]
              bg-white
              hover:bg-gray-50
              dark:bg-gray-900
              dark:hover:bg-gray-700
              border border-gray-200
              dark:border-gray-700
              text-gray-700
              dark:text-gray-200
              shadow-sm
              transition

              ${
                isFullscreen
                  ? "h-6 px-2"
                  : "h-7 px-2"
              }
            `}
          >
            {isFullscreen ? (
              <Minimize2 size={13} />
            ) : (
              <Maximize2 size={13} />
            )}

            <span
              className="
                text-[10px]
                font-bold
                tracking-wide
              "
            >
              {isFullscreen
                ? "EXIT FULLSCREEN"
                : "FULLSCREEN"}
            </span>
          </button>
        </div>
      </div>

      {dataError && (
        <div
          className="
            mb-2
            rounded-[10px]
            border border-red-200
            dark:border-red-800
            bg-red-50
            dark:bg-red-950/30
            text-red-600
            dark:text-red-300
            px-3 py-2
            text-xs
          "
        >
          {dataError}
        </div>
      )}

      {/* GRID */}
      <div
        ref={dashboardGridRef}
        className={`
          grid
          flex-none
          h-auto
          min-h-0
          content-start

          ${dashboardGap}
        `}
        style={{
          gridTemplateColumns: `repeat(${
            layout?.cols || 1
          }, minmax(0, 1fr))`,

          gridTemplateRows: `repeat(${
            occupiedDashboardRows
          }, ${dashboardRowHeight}px)`,

          gridAutoFlow: "dense",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="
              dashboard-widget-cell
              min-h-0 min-w-0
              flex flex-col
              overflow-hidden
              transition-[box-shadow]
              duration-150
            "
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
          >
            <div
              className="
                min-h-0 flex-1
                flex items-stretch
                justify-stretch
                p-0
              "
            >
              <WidgetRenderer
                type={item.type}
                value={data[item.dataKey]}
                data={{
                  ...data,
                  logs,
                }}
                history={history}
                historyWindow={timeRange}
                liveStatus={{
                  ...(liveStatus || {}),
                  logs,
                }}
                dataKey={item.dataKey}
                item={{
                  ...item,
                  sankeyRuntimeValues: sankeyValues[item.id] || {},
                }}
                updateItem={(updated) => {
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === updated.id
                        ? updated
                        : it
                    )
                  );
                }}
                editMode={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
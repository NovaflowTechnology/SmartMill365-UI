import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  OctagonAlert,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useRef } from "react";
import {
  TECH_ACCENT,
  TECH_HEADER_CLASS,
  TECH_MUTED_CLASS,
  TECH_SURFACE_CLASS,
  TechBackdrop,
  useWidgetSize,
} from "./widgetTech";

const STATUS_STYLE = {
  online: {
    label: "Online",
    description: "The device is reporting normally.",
    icon: CheckCircle2,
    color: TECH_ACCENT.lime,
    text: "text-[#5F8F25] dark:text-[#A4C65A]",
    soft: "bg-[#A4C65A]/15",
  },
  warning: {
    label: "Warning",
    description: "The device is reporting, but attention may be required.",
    icon: TriangleAlert,
    color: "#D99D30",
    text: "text-amber-600 dark:text-amber-300",
    soft: "bg-amber-500/10",
  },
  critical: {
    label: "Critical",
    description: "The device requires immediate attention.",
    icon: OctagonAlert,
    color: TECH_ACCENT.plum,
    text: "text-[#7D2D58] dark:text-[#D989A7]",
    soft: "bg-[#6D254D]/10",
  },
  offline: {
    label: "Offline",
    description: "No recent data has been received from the device.",
    icon: WifiOff,
    color: "#94A3B8",
    text: "text-slate-500 dark:text-slate-300",
    soft: "bg-slate-100 dark:bg-white/5",
  },
};

const formatDateTime = (value) => {
  if (!value) return "No recent data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid timestamp";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatAge = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n)) return "Unknown";
  const safe = Math.max(0, Math.floor(n));
  if (safe < 60) return `${safe}s ago`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getFreshnessLabel = (statusKey, ageSeconds) => {
  const age = Number(ageSeconds);
  if (statusKey === "offline") return "No connection";
  if (!Number.isFinite(age)) return "Unknown";
  if (age <= 15) return "Live";
  if (age <= 60) return "Recent";
  if (age <= 300) return "Delayed";
  return "Stale";
};

const getHealthScore = ({ statusKey, returnedCount, expectedCount, ageSeconds }) => {
  if (statusKey === "offline") return 0;
  const coverageScore = expectedCount > 0 ? (returnedCount / expectedCount) * 70 : 70;
  const age = Number(ageSeconds);
  let freshnessScore = 30;
  if (Number.isFinite(age)) {
    freshnessScore = age <= 15 ? 30 : age <= 60 ? 24 : age <= 300 ? 14 : 5;
  }
  const penalty = statusKey === "critical" ? 28 : statusKey === "warning" ? 12 : 0;
  return Math.min(100, Math.max(0, Math.round(coverageScore + freshnessScore - penalty)));
};

const getHealthLabel = (score) =>
  score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Degraded" : score > 0 ? "Poor" : "Unavailable";

export default function StatusWidget({ liveStatus, label = "Device Health" }) {
  const rootRef = useRef(null);
  const { compact, tiny } = useWidgetSize(rootRef);

  const rawStatus = String(liveStatus?.status || "offline").toLowerCase();
  const statusKey = STATUS_STYLE[rawStatus] ? rawStatus : "offline";
  const style = STATUS_STYLE[statusKey];
  const StatusIcon = style.icon;

  const returnedFields = Array.isArray(liveStatus?.returnedFields) ? liveStatus.returnedFields : [];
  const missingFields = Array.isArray(liveStatus?.missingFields) ? liveStatus.missingFields : [];
  const returnedCount = returnedFields.length || Number(liveStatus?.returnedFieldCount) || 0;
  const expectedCount = Number(liveStatus?.expectedFieldCount) || returnedCount + missingFields.length;
  const missingCount = Math.max(0, expectedCount - returnedCount);
  const fieldCoverage = expectedCount > 0 ? Math.min(100, Math.max(0, (returnedCount / expectedCount) * 100)) : 0;
  const freshnessLabel = getFreshnessLabel(statusKey, liveStatus?.ageSeconds);
  const healthScore = getHealthScore({
    statusKey,
    returnedCount,
    expectedCount,
    ageSeconds: liveStatus?.ageSeconds,
  });
  const healthLabel = getHealthLabel(healthScore);
  const sourceName = liveStatus?.sourceName || liveStatus?.deviceName || liveStatus?.deviceId || "Connected device";
  const statusMessage = liveStatus?.message || style.description;

  const dotCount = Math.min(14, Math.max(6, expectedCount || 10));
  const activeDots = expectedCount > 0 ? Math.round((fieldCoverage / 100) * dotCount) : 0;

  return (
    <div
      ref={rootRef}
      className={`${TECH_SURFACE_CLASS} ${
        tiny ? "p-2.5" : compact ? "p-3" : "p-4"
      }`}
    >
      <TechBackdrop />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-3 pr-14">
          <div className="min-w-0">
            <div className={`${TECH_HEADER_CLASS} truncate`}>{label}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-lg font-extrabold tracking-[-0.03em] ${style.text}`}>{style.label}</span>
              <span className={`truncate text-[10px] ${TECH_MUTED_CLASS}`}>· {sourceName}</span>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${style.soft} ${style.text}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: style.color }} />
            {freshnessLabel}
          </div>
        </div>

        <div
          className={`
            grid min-h-0 flex-1
            ${
              tiny
                ? "mt-2 grid-cols-[82px_minmax(0,1fr)] gap-2.5"
                : compact
                ? "mt-3 grid-cols-[96px_minmax(0,1fr)] gap-3"
                : "mt-4 grid-cols-[120px_minmax(0,1fr)] gap-4"
            }
          `}
        >
          <div
            className={`
              flex flex-col items-center justify-center
              rounded-[14px] bg-[#F7F8F4]
              dark:bg-white/[0.035]
              ${tiny ? "p-1.5" : compact ? "p-2" : "p-3"}
            `}
          >
            <div
              className={`relative flex items-center justify-center rounded-full ${
                tiny ? "h-14 w-14" : compact ? "h-16 w-16" : "h-20 w-20"
              }`}
              style={{
                background: `conic-gradient(${style.color} ${healthScore * 3.6}deg, #E8ECE5 0deg)`,
              }}
            >
              <div className="absolute inset-[7px] rounded-full bg-white dark:bg-[#121816]" />
              <div className="relative text-center">
                <div className={`${tiny ? "text-lg" : compact ? "text-xl" : "text-2xl"} font-black tracking-[-0.05em] text-slate-950 dark:text-white`}>
                  {healthScore}
                </div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Health</div>
              </div>
            </div>
            <div className={`mt-2 text-[10px] font-bold ${style.text}`}>{healthLabel}</div>
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[#6D254D] dark:text-[#D989A7]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Sensor coverage</span>
              <span className="ml-auto text-sm font-extrabold text-slate-950 dark:text-white">{returnedCount}/{expectedCount}</span>
            </div>

            {!tiny && (
              <div className={`mt-3 grid gap-1.5 ${compact ? "grid-cols-7" : "grid-cols-7"}`}>
                {Array.from({ length: dotCount }).map((_, index) => (
                  <span
                    key={index}
                    className={`${compact ? "h-2 w-2" : "h-2.5 w-2.5"} rounded-full`}
                    style={{
                      background:
                        index < activeDots
                          ? TECH_ACCENT.lime
                          : "#DDE3D8",
                    }}
                  />
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className={TECH_MUTED_CLASS}>Availability</span>
              <span className="font-bold text-slate-900 dark:text-white">{Math.round(fieldCoverage)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E8ECE5] dark:bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${fieldCoverage}%`, background: style.color }} />
            </div>
          </div>
        </div>

        {compact ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-[9px] dark:border-white/10">
            <span className={TECH_MUTED_CLASS}>
              Age{" "}
              <strong className={style.text}>
                {formatAge(liveStatus?.ageSeconds)}
              </strong>
            </span>

            <span className={TECH_MUTED_CLASS}>
              Missing{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {missingCount}
              </strong>
            </span>

            <span className={TECH_MUTED_CLASS}>
              Coverage{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.round(fieldCoverage)}%
              </strong>
            </span>

            {!tiny && (
              <span className={`ml-auto truncate ${TECH_MUTED_CLASS}`}>
                {statusMessage}
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#F7F8F4] px-3 py-2 dark:bg-white/[0.035]">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400">
                  <Clock3 size={11} />
                  Last update
                </div>
                <div
                  className="mt-1 truncate text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                  title={formatDateTime(liveStatus?.sourceTimestamp)}
                >
                  {formatDateTime(liveStatus?.sourceTimestamp)}
                </div>
              </div>

              <div className="rounded-xl bg-[#F7F8F4] px-3 py-2 dark:bg-white/[0.035]">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400">
                  <Activity size={11} />
                  Data age
                </div>
                <div className={`mt-1 text-[10px] font-bold ${style.text}`}>
                  {formatAge(liveStatus?.ageSeconds)}
                </div>
              </div>

              <div className="rounded-xl bg-[#F7F8F4] px-3 py-2 dark:bg-white/[0.035]">
                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                  Missing
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-800 dark:text-slate-200">
                  {missingCount}
                </div>
              </div>
            </div>

            {missingFields.length > 0 && (
              <div
                className="mt-2 truncate text-[9px] text-amber-600 dark:text-amber-300"
                title={missingFields.join(", ")}
              >
                Missing: {missingFields.slice(0, 4).join(", ")}
                {missingFields.length > 4
                  ? ` +${missingFields.length - 4}`
                  : ""}
              </div>
            )}

            <div className={`mt-2 text-[10px] ${TECH_MUTED_CLASS}`}>
              {statusMessage}
            </div>
          </>
        )}


      </div>
    </div>
  );
}

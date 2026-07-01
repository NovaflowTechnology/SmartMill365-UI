import {
  CheckCircle2,
  WifiOff,
  TriangleAlert,
  OctagonAlert,
  Clock3,
  Activity,
} from "lucide-react";

const STATUS_STYLE = {
  online: {
    label: "ONLINE",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800",
    glow:
      "shadow-[0_0_22px_rgba(16,185,129,0.35)]",
    iconGlow:
      "shadow-[0_0_18px_rgba(16,185,129,0.45)]",
    icon: CheckCircle2,
  },

  warning: {
    label: "WARNING",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800",
    glow:
      "shadow-[0_0_22px_rgba(245,158,11,0.35)]",
    iconGlow:
      "shadow-[0_0_18px_rgba(245,158,11,0.45)]",
    icon: TriangleAlert,
  },

  critical: {
    label: "CRITICAL",
    badge:
      "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-500",
    border: "border-red-200 dark:border-red-800",
    glow:
      "shadow-[0_0_24px_rgba(239,68,68,0.42)]",
    iconGlow:
      "shadow-[0_0_20px_rgba(239,68,68,0.55)]",
    icon: OctagonAlert,
  },

  offline: {
    label: "OFFLINE",
    badge:
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    dot: "bg-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    glow:
      "shadow-[0_0_14px_rgba(156,163,175,0.22)]",
    iconGlow:
      "shadow-[0_0_12px_rgba(156,163,175,0.3)]",
    icon: WifiOff,
  },
};

const formatDateTime = (value) => {
  if (!value) return "No recent data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return date.toLocaleString();
};

const formatAge = (seconds) => {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return "Unknown";
  }

  if (seconds < 60) {
    return `${seconds} second${
      seconds === 1 ? "" : "s"
    } ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours} hour${
    hours === 1 ? "" : "s"
  } ago`;
};

export default function StatusWidget({
  liveStatus,
}) {
  const statusKey = liveStatus?.status || "offline";

  const style =
    STATUS_STYLE[statusKey] ||
    STATUS_STYLE.offline;

  const StatusIcon = style.icon;

  const returnedCount =
    liveStatus?.returnedFields?.length ??
    liveStatus?.returnedFieldCount ??
    0;

  const missingCount =
    liveStatus?.missingFields?.length || 0;

  const expectedCount =
    liveStatus?.expectedFieldCount ??
    returnedCount + missingCount;

  return (
    <div
      className={`
        w-full h-full
        rounded-2xl border
        bg-white dark:bg-gray-800
        p-4
        flex flex-col justify-between
        gap-4
        transition-all duration-500
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`
              flex h-11 w-11 items-center justify-center
              rounded-2xl
              ${style.badge}
              ${style.iconGlow}
              transition-all duration-500
            `}
          >
            <StatusIcon size={23} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Device Health
            </p>

            <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">
              {style.label}
            </p>
          </div>
        </div>

        <span
          className={`
            flex items-center gap-2 rounded-full
            px-3 py-1 text-xs font-bold
            ${style.badge}
          `}
        >
          <span className="relative flex h-2.5 w-2.5">
            {statusKey !== "offline" && (
              <span
                className={`
                  absolute inline-flex h-full w-full
                  rounded-full opacity-70 animate-ping
                  ${style.dot}
                `}
              />
            )}

            <span
              className={`
                relative inline-flex h-2.5 w-2.5
                rounded-full
                ${style.dot}
              `}
            />
          </span>

          {style.label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Clock3
            size={16}
            className="text-gray-400"
          />

          <span className="font-medium">
            Last update:
          </span>

          <span className="ml-auto text-right">
            {formatDateTime(
              liveStatus?.sourceTimestamp
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Activity
            size={16}
            className="text-gray-400"
          />

          <span className="font-medium">
            Data age:
          </span>

          <span className="ml-auto font-semibold">
            {formatAge(liveStatus?.ageSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">
            Sensor fields:
          </span>

          <span className="ml-auto font-semibold">
            {returnedCount}/{expectedCount}
          </span>
        </div>
      </div>

      <div
        className={`
          rounded-xl px-3 py-2.5
          text-xs font-medium
          ${style.badge}
        `}
      >
        {liveStatus?.message ||
          "Waiting for sensor data..."}
      </div>
    </div>
  );
}
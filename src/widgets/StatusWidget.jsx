import {
  Activity,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  OctagonAlert,
  Radio,
  TriangleAlert,
  WifiOff,
} from "lucide-react";

const STATUS_STYLE = {
  online: {
    label: "Online",
    description: "The device is reporting normally.",
    icon: CheckCircle2,

    accentText:
      "text-emerald-600 dark:text-emerald-400",

    iconBox:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",

    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",

    dot: "bg-emerald-500",

    progress: "bg-emerald-500",

    border:
      "border-emerald-200 dark:border-emerald-900/70",

    glow:
      "shadow-[0_0_22px_rgba(16,185,129,0.18)]",
  },

  warning: {
    label: "Warning",
    description: "The device is reporting, but attention may be required.",
    icon: TriangleAlert,

    accentText:
      "text-amber-600 dark:text-amber-400",

    iconBox:
      "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",

    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",

    dot: "bg-amber-500",

    progress: "bg-amber-500",

    border:
      "border-amber-200 dark:border-amber-900/70",

    glow:
      "shadow-[0_0_22px_rgba(245,158,11,0.18)]",
  },

  critical: {
    label: "Critical",
    description: "The device requires immediate attention.",
    icon: OctagonAlert,

    accentText:
      "text-red-600 dark:text-red-400",

    iconBox:
      "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",

    badge:
      "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",

    dot: "bg-red-500",

    progress: "bg-red-500",

    border:
      "border-red-200 dark:border-red-900/70",

    glow:
      "shadow-[0_0_24px_rgba(239,68,68,0.2)]",
  },

  offline: {
    label: "Offline",
    description: "No recent data has been received from the device.",
    icon: WifiOff,

    accentText:
      "text-gray-600 dark:text-gray-300",

    iconBox:
      "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300",

    badge:
      "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200",

    dot: "bg-gray-400",

    progress: "bg-gray-400",

    border:
      "border-gray-200 dark:border-slate-700",

    glow: "",
  },
};

const formatDateTime = (value) => {
  if (!value) {
    return "No recent data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatAge = (seconds) => {
  const numericSeconds = Number(seconds);

  if (!Number.isFinite(numericSeconds)) {
    return "Unknown";
  }

  const safeSeconds = Math.max(0, Math.floor(numericSeconds));

  if (safeSeconds < 60) {
    return `${safeSeconds}s ago`;
  }

  const minutes = Math.floor(safeSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
};

const getFreshnessLabel = (statusKey, ageSeconds) => {
  const age = Number(ageSeconds);

  if (statusKey === "offline") {
    return "No connection";
  }

  if (!Number.isFinite(age)) {
    return "Unknown freshness";
  }

  if (age <= 15) {
    return "Live";
  }

  if (age <= 60) {
    return "Recent";
  }

  if (age <= 300) {
    return "Delayed";
  }

  return "Stale";
};

const getHealthScore = ({
  statusKey,
  returnedCount,
  expectedCount,
  ageSeconds,
}) => {
  if (statusKey === "offline") {
    return 0;
  }

  const coverageScore =
    expectedCount > 0
      ? (returnedCount / expectedCount) * 70
      : 70;

  const age = Number(ageSeconds);

  let freshnessScore = 30;

  if (Number.isFinite(age)) {
    if (age <= 15) {
      freshnessScore = 30;
    } else if (age <= 60) {
      freshnessScore = 24;
    } else if (age <= 300) {
      freshnessScore = 14;
    } else {
      freshnessScore = 5;
    }
  }

  let statusPenalty = 0;

  if (statusKey === "warning") {
    statusPenalty = 12;
  }

  if (statusKey === "critical") {
    statusPenalty = 28;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(coverageScore + freshnessScore - statusPenalty)
    )
  );
};

const getHealthLabel = (score) => {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 75) {
    return "Good";
  }

  if (score >= 50) {
    return "Degraded";
  }

  if (score > 0) {
    return "Poor";
  }

  return "Unavailable";
};

export default function StatusWidget({
  liveStatus,
  label = "Device Health",
}) {
  const rawStatus = String(
    liveStatus?.status || "offline"
  ).toLowerCase();

  const statusKey =
    STATUS_STYLE[rawStatus]
      ? rawStatus
      : "offline";

  const style = STATUS_STYLE[statusKey];
  const StatusIcon = style.icon;

  const returnedFields = Array.isArray(
    liveStatus?.returnedFields
  )
    ? liveStatus.returnedFields
    : [];

  const missingFields = Array.isArray(
    liveStatus?.missingFields
  )
    ? liveStatus.missingFields
    : [];

  const returnedCount =
    returnedFields.length ||
    Number(liveStatus?.returnedFieldCount) ||
    0;

  const expectedCount =
    Number(liveStatus?.expectedFieldCount) ||
    returnedCount + missingFields.length;

  const missingCount = Math.max(
    0,
    expectedCount - returnedCount
  );

  const fieldCoverage =
    expectedCount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (returnedCount / expectedCount) * 100
          )
        )
      : 0;

  const freshnessLabel = getFreshnessLabel(
    statusKey,
    liveStatus?.ageSeconds
  );

  const healthScore = getHealthScore({
    statusKey,
    returnedCount,
    expectedCount,
    ageSeconds: liveStatus?.ageSeconds,
  });

  const healthLabel = getHealthLabel(
    healthScore
  );

  const statusMessage =
    liveStatus?.message ||
    style.description;

  const sourceName =
    liveStatus?.sourceName ||
    liveStatus?.deviceName ||
    liveStatus?.deviceId ||
    "Connected device";

  return (
    <div
      className={`
        flex h-full w-full
        flex-col overflow-hidden
        rounded-2xl border
        bg-gradient-to-br
        from-slate-50 via-white to-cyan-50/40
        p-4
        transition-all duration-300
        dark:from-slate-950
        dark:via-slate-900
        dark:to-cyan-950/20
        ${style.border}
        ${style.glow}
      `}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-2xl
              ${style.iconBox}
            `}
          >
            <StatusIcon size={22} />
          </div>

          <div className="min-w-0">
            <p
              className="
                truncate text-[10px]
                font-bold uppercase
                tracking-[0.18em]
                text-gray-400
                dark:text-slate-500
              "
            >
              {label}
            </p>

            <div className="mt-1 flex items-center gap-2">
              <p
                className={`
                  truncate text-lg
                  font-black
                  ${style.accentText}
                `}
              >
                {style.label}
              </p>

              <span
                className="
                  truncate text-xs
                  text-gray-400
                  dark:text-slate-500
                "
              >
                · {sourceName}
              </span>
            </div>
          </div>
        </div>

        <span
          className={`
            flex shrink-0 items-center
            gap-2 rounded-full
            px-3 py-1.5
            text-[10px] font-bold
            uppercase tracking-wide
            ${style.badge}
          `}
        >
          <span className="relative flex h-2 w-2">
            {statusKey !== "offline" && (
              <span
                className={`
                  absolute inline-flex
                  h-full w-full
                  animate-ping rounded-full
                  opacity-70
                  ${style.dot}
                `}
              />
            )}

            <span
              className={`
                relative inline-flex
                h-2 w-2
                rounded-full
                ${style.dot}
              `}
            />
          </span>

          {freshnessLabel}
        </span>
      </div>

      {/* HEALTH SUMMARY */}
      <div
        className="
          mt-4 grid grid-cols-2
          gap-3
        "
      >
        <div
          className="
            rounded-2xl
            border border-gray-100
            bg-gray-50
            px-3 py-3
            dark:border-slate-800
            dark:bg-slate-950/60
          "
        >
          <div className="flex items-center gap-2">
            <Gauge
              size={15}
              className={style.accentText}
            />

            <p
              className="
                text-[10px] font-bold
                uppercase tracking-wide
                text-gray-400
                dark:text-slate-500
              "
            >
              Health score
            </p>
          </div>

          <div className="mt-2 flex items-end gap-2">
            <span
              className={`
                text-2xl font-black
                leading-none
                ${style.accentText}
              `}
            >
              {healthScore}
            </span>

            <span
              className="
                pb-0.5 text-xs
                font-semibold
                text-gray-400
                dark:text-slate-500
              "
            >
              / 100
            </span>
          </div>

          <p
            className="
              mt-1 text-[10px]
              font-semibold
              text-gray-500
              dark:text-slate-400
            "
          >
            {healthLabel}
          </p>
        </div>

        <div
          className="
            rounded-2xl
            border border-gray-100
            bg-gray-50
            px-3 py-3
            dark:border-slate-800
            dark:bg-slate-950/60
          "
        >
          <div className="flex items-center gap-2">
            <Database
              size={15}
              className="text-blue-500"
            />

            <p
              className="
                text-[10px] font-bold
                uppercase tracking-wide
                text-gray-400
                dark:text-slate-500
              "
            >
              Sensor coverage
            </p>
          </div>

          <div className="mt-2 flex items-end gap-2">
            <span
              className="
                text-2xl font-black
                leading-none
                text-gray-900
                dark:text-white
              "
            >
              {returnedCount}
            </span>

            <span
              className="
                pb-0.5 text-xs
                font-semibold
                text-gray-400
                dark:text-slate-500
              "
            >
              / {expectedCount}
            </span>
          </div>

          <p
            className="
              mt-1 text-[10px]
              font-semibold
              text-gray-500
              dark:text-slate-400
            "
          >
            {Math.round(fieldCoverage)}% available
          </p>
        </div>
      </div>

      {/* FIELD COVERAGE BAR */}
      <div className="mt-4">
        <div
          className="
            mb-2 flex items-center
            justify-between gap-3
          "
        >
          <span
            className="
              text-[10px] font-semibold
              text-gray-500
              dark:text-slate-400
            "
          >
            Field availability
          </span>

          <span
            className="
              text-[10px] font-bold
              text-gray-500
              dark:text-slate-400
            "
          >
            {missingCount === 0
              ? "Complete"
              : `${missingCount} missing`}
          </span>
        </div>

        <div
          className="
            h-2 w-full overflow-hidden
            rounded-full
            bg-gray-100
            dark:bg-slate-700
          "
        >
          <div
            className={`
              h-full rounded-full
              transition-all duration-500
              ${style.progress}
            `}
            style={{
              width: `${fieldCoverage}%`,
            }}
          />
        </div>
      </div>

      {/* DEVICE DETAILS */}
      <div
        className="
          mt-4 grid grid-cols-1
          gap-2.5 text-xs
        "
      >
        <div
          className="
            flex items-center gap-2
            text-gray-600
            dark:text-slate-300
          "
        >
          <Clock3
            size={15}
            className="shrink-0 text-gray-400"
          />

          <span className="font-medium">
            Last update
          </span>

          <span
            className="
              ml-auto truncate
              text-right
              text-gray-500
              dark:text-slate-400
            "
            title={formatDateTime(
              liveStatus?.sourceTimestamp
            )}
          >
            {formatDateTime(
              liveStatus?.sourceTimestamp
            )}
          </span>
        </div>

        <div
          className="
            flex items-center gap-2
            text-gray-600
            dark:text-slate-300
          "
        >
          <Activity
            size={15}
            className="shrink-0 text-gray-400"
          />

          <span className="font-medium">
            Data age
          </span>

          <span
            className={`
              ml-auto font-bold
              ${style.accentText}
            `}
          >
            {formatAge(
              liveStatus?.ageSeconds
            )}
          </span>
        </div>

        <div
          className="
            flex items-center gap-2
            text-gray-600
            dark:text-slate-300
          "
        >
          <Radio
            size={15}
            className="shrink-0 text-gray-400"
          />

          <span className="font-medium">
            Data state
          </span>

          <span
            className="
              ml-auto font-semibold
              text-gray-500
              dark:text-slate-400
            "
          >
            {freshnessLabel}
          </span>
        </div>
      </div>

      {/* MISSING FIELD SUMMARY */}
      {missingFields.length > 0 && (
        <div
          className="
            mt-4 rounded-xl
            border border-amber-200
            bg-amber-50
            px-3 py-2.5
            dark:border-amber-900/60
            dark:bg-amber-500/10
          "
        >
          <p
            className="
              text-[10px] font-bold
              uppercase tracking-wide
              text-amber-700
              dark:text-amber-300
            "
          >
            Missing fields
          </p>

          <p
            className="
              mt-1 line-clamp-2
              text-xs text-amber-700
              dark:text-amber-200
            "
            title={missingFields.join(", ")}
          >
            {missingFields
              .slice(0, 4)
              .join(", ")}

            {missingFields.length > 4 &&
              ` +${missingFields.length - 4} more`}
          </p>
        </div>
      )}

      {/* STATUS MESSAGE */}
      <div
        className={`
          mt-auto rounded-xl
          px-3 py-2.5
          text-xs font-medium
          ${style.badge}
        `}
      >
        {statusMessage}
      </div>
    </div>
  );
}
import {
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

export const cx = (...classes) =>
  classes
    .flat(Infinity)
    .filter(Boolean)
    .join(" ");

const metricToneClasses = {
  emerald: {
    icon: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300",
    value: "text-slate-950 dark:text-white",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    value: "text-emerald-600 dark:text-emerald-300",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    value: "text-amber-600 dark:text-amber-300",
  },
  danger: {
    icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
    value: "text-red-600 dark:text-red-300",
  },
  neutral: {
    icon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    value: "text-slate-950 dark:text-white",
  },
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions = null,
  children = null,
  className = "",
}) {
  return (
    <section
      className={cx(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        "dark:border-slate-700 dark:bg-slate-900",
        className
      )}
    >
      <div
        className={cx(
          "flex flex-col gap-2 px-3 py-2.5",
          "sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <div
              className={cx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                "bg-cyan-50 text-cyan-600",
                "dark:bg-cyan-500/10 dark:text-cyan-300"
              )}
            >
              <Icon size={16} strokeWidth={2} />
            </div>
          ) : null}

          <div className="min-w-0">
            <h1
              className={cx(
                "truncate text-lg font-bold tracking-tight",
                "text-slate-950 dark:text-white"
              )}
            >
              {title}
            </h1>

            {description ? (
              <p
                className={cx(
                  "mt-0.5 text-[11px] leading-4",
                  "text-slate-500 dark:text-slate-400"
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {actions}
          </div>
        ) : null}
      </div>

      {children ? (
        <div className="border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  helper = null,
  tone = "emerald",
  className = "",
}) {
  const toneClasses =
    metricToneClasses[tone] ||
    metricToneClasses.emerald;

  return (
    <div
      className={cx(
        "min-h-[72px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        "dark:border-slate-700 dark:bg-slate-900",
        className
      )}
    >
      <div className="flex h-full min-w-0 items-center gap-2.5">
        {Icon ? (
          <div
            className={cx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              toneClasses.icon
            )}
          >
            <Icon size={15} strokeWidth={2} />
          </div>
        ) : null}

        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
            <p
              className={cx(
                "truncate text-lg font-bold leading-none",
                toneClasses.value
              )}
            >
              {value}
            </p>

            {helper ? (
              <span className="truncate text-[10px] text-slate-400">
                {helper}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  actions = null,
  className = "",
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-2",
        "sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

        {description ? (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  className = "",
}) {
  const config = {
    info: {
      Icon: Info,
      classes:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
    },
    success: {
      Icon: CheckCircle2,
      classes:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    warning: {
      Icon: AlertTriangle,
      classes:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    },
    danger: {
      Icon: AlertTriangle,
      classes:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    },
  }[tone];

  const Icon = config.Icon;

  return (
    <div
      className={cx(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        config.classes,
        className
      )}
    >
      <Icon size={14} className="mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export const controlClasses = {
  primary:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
  danger:
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition-colors duration-150 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/20 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
  input:
    "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
  surface:
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
};

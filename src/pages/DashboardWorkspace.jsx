import {
  LayoutDashboard,
  Plus,
  X,
} from "lucide-react";
import Dashboard from "./Dashboard";

export default function DashboardWorkspace({
  template,
  tabs = [],
  onSelectTab,
  onCloseTab,
  onOpenLibrary,
  setFullscreen,
  setPage,
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-[42px] items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-[#2C3C61] dark:bg-[#0E172D]">
        {tabs.map((tab) => {
          const active =
            Number(tab.id) ===
            Number(template?.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                onSelectTab?.(tab)
              }
              className={`group inline-flex h-8 max-w-[230px] shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold transition ${
                active
                  ? "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-[#2C3C61] dark:hover:bg-[#15213D]"
              }`}
            >
              <LayoutDashboard
                size={12}
                className="shrink-0"
              />
              <span className="truncate">
                {tab.name ||
                  `Template #${tab.id}`}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab?.(
                    tab.id
                  );
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.stopPropagation();
                    onCloseTab?.(
                      tab.id
                    );
                  }
                }}
                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-400/10"
              >
                <X size={10} />
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenLibrary}
          title="Open another dashboard"
          className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 text-[9px] font-semibold text-slate-400 transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-600 dark:border-[#3A4B70] dark:hover:bg-cyan-400/10"
        >
          <Plus size={11} />
          Dashboard
        </button>
      </div>

      <Dashboard
        key={template?.id || "no-dashboard"}
        template={template}
        setFullscreen={setFullscreen}
        setPage={setPage}
      />
    </div>
  );
}

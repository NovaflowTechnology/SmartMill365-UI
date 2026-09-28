import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Wrench,
  Folder,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ShieldCheck,
  Settings,
  ChevronDown,
  ServerCog,
  Factory,
} from "lucide-react";

const SETTING_KEYS = [
  "builder",
  "templates",
  "organizations",
  "device-management",
];

export default function Layout({
  children,
  setPage,
  currentPage = "dashboard",
  fullscreen,
  showSidebar = true,
  dark = false,
  toggleTheme,
}) {
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const [compactViewport, setCompactViewport] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1159px)").matches
      : false
  );

  const collapsed = manuallyCollapsed || compactViewport;

  const role = localStorage.getItem("role");
  const orgName = localStorage.getItem("org_name");

  const isSuperadmin = role === "superadmin";
  const isAdmin = role === "admin";
  const isEditor = role === "editor";
  const isViewer = role === "viewer";

  const [settingOpen, setSettingOpen] = useState(
    SETTING_KEYS.includes(currentPage)
  );

  useEffect(() => {
    if (SETTING_KEYS.includes(currentPage)) {
      // Navigation can be changed by the parent, so keep its section expanded.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettingOpen(true);
    }
  }, [currentPage]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1159px)");
    const updateViewportMode = (event) => {
      setCompactViewport(event.matches);
    };

    mediaQuery.addEventListener("change", updateViewportMode);

    return () =>
      mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const mainMenu = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    ...(!isViewer
      ? [
          {
            key: "process-simulator",
            label: "Plant Simulator",
            icon: Factory,
          },
        ]
      : []),
  ];

  const settingMenu = [
    ...(isSuperadmin || isAdmin
      ? [
          {
            key: "builder",
            label: "Template Builder",
            description: "Create layouts",
            icon: Wrench,
          },
        ]
      : []),
    {
      key: "templates",
      label: isSuperadmin
        ? "Template Management"
        : "Templates",
      description: isViewer
        ? "View assigned dashboards"
        : "Manage dashboards",
      icon: Folder,
    },
    ...(isSuperadmin || isAdmin || isEditor || isViewer
      ? [
          {
            key: "device-management",
            label: isViewer
              ? "Devices"
              : "Device Management",
            description: isSuperadmin
              ? "Assign device access"
              : "View assigned devices",
            icon: ServerCog,
          },
        ]
      : []),
    ...(isSuperadmin || isAdmin
      ? [
          {
            key: "organizations",
            label: isSuperadmin
              ? "Organization Management"
              : "User Management",
            description: isSuperadmin
              ? "Manage companies"
              : "Manage users",
            icon: Building2,
          },
        ]
      : []),
  ];

  const isSettingActive = SETTING_KEYS.includes(currentPage);

  const renderMenuButton = (item) => {
    const Icon = item.icon;
    const isActive = currentPage === item.key;

    return (
      <button
        key={item.key}
        onClick={() => setPage(item.key)}
        title={collapsed ? item.label : ""}
        className={`
          group relative flex items-center
          rounded-xl font-medium
          transition-colors duration-150

          ${
            collapsed
              ? "mx-auto h-9 w-9 justify-center p-0"
              : "min-h-[44px] w-full gap-2.5 px-3 py-2"
          }

          ${
            isActive
              ? "bg-[#0D2A49] text-white"
              : `
                  text-slate-300
                  hover:bg-gradient-to-r
                  hover:from-cyan-400/18
                  hover:via-blue-500/16
                  hover:to-blue-600/10
                  hover:text-white
                `
          }
        `}
      >
        {isActive && !collapsed && (
          <span
            className="
              absolute left-0 h-5 w-[3px]
              rounded-r-full bg-cyan-300
            "
          />
        )}

        <div
          className={`
            flex h-4 w-4 shrink-0 items-center justify-center
            ${
              isActive
                ? "text-cyan-300"
                : "text-slate-400 group-hover:text-cyan-300"
            }
          `}
        >
          <Icon size={16} strokeWidth={2} />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[12px] font-semibold leading-tight">
              {item.label}
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      className={`
        app-shell flex h-screen
        ${dark ? "bg-[#061426]" : "bg-[#edf3f8]"}
      `}
    >
      {showSidebar && !fullscreen && (
        <aside
          className={`
            app-sidebar relative flex flex-col overflow-hidden
            border-r border-[#24435f] bg-[#061426]
            transition-[width] duration-300 ease-out
            ${collapsed ? "w-14" : "w-[14.5rem]"}
          `}
        >
          <div
            className={`
              relative z-10 border-b border-[#24435f]
              ${
                collapsed
                  ? "flex flex-col items-center gap-2 px-0 py-3"
                  : "flex items-center justify-between px-3 py-3"
              }
            `}
          >
            {!collapsed ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="
                      flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-xl bg-gradient-to-br from-[#245EC5] to-[#35C9F4] shadow-sm
                    "
                  >
                    <Monitor size={15} strokeWidth={2} className="text-white" />
                  </div>

                  <div className="min-w-0">
                    <h2
                      className="
                        text-[12px] font-black uppercase
                        leading-[1.05] tracking-[0.06em] text-white
                      "
                    >
                      UI Template
                      <span className="text-cyan-300">
                        {" "}System
                      </span>
                    </h2>

                    <p className="mt-1 truncate text-[9px] text-slate-500">
                      Novaflow Technology
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-xl bg-gradient-to-br from-[#245EC5] to-[#35C9F4] shadow-sm
                "
                title="Configurable Web Dashboard"
              >
                <Monitor size={15} strokeWidth={2} className="text-white" />
              </div>
            )}

            <button
              onClick={() => setManuallyCollapsed((current) => !current)}
              disabled={compactViewport}
              className="
                flex h-8 w-8 shrink-0 items-center justify-center
                rounded-lg text-slate-400
                transition-colors hover:bg-[#102B49] hover:text-white
              "
              title={
                compactViewport
                  ? "Sidebar is compact at this viewport width"
                  : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {collapsed ? (
                <ChevronRight size={15} strokeWidth={2} />
              ) : (
                <ChevronLeft size={15} strokeWidth={2} />
              )}
            </button>
          </div>

          {!collapsed && (
            <div
              className="
                relative z-10 mx-3 mt-3
                flex items-center gap-2.5
                rounded-xl border border-[#24435f]
                bg-[#0B1F38] px-3 py-2.5
              "
            >
              <div
                className="
                  flex h-8 w-8 shrink-0 items-center justify-center
                  rounded-lg bg-[#102B49] text-cyan-300
                "
              >
                <Factory size={14} strokeWidth={2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Workspace
                </p>
                <h3 className="mt-0.5 truncate text-[12px] font-bold text-white">
                  Mill Control Center
                </h3>
              </div>
            </div>
          )}

          <nav
            className={`
              relative z-10 mt-3 flex flex-col gap-1
              ${collapsed ? "items-center px-0" : "px-2.5"}
            `}
          >
            {!collapsed && (
              <div className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                Main Menu
              </div>
            )}

            {mainMenu.map(renderMenuButton)}

            {!collapsed ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setSettingOpen(!settingOpen)}
                  className={`
                    group flex min-h-[40px] w-full items-center gap-2.5
                    rounded-xl px-3 py-2
                    text-[12px] font-semibold transition-colors
                    ${
                      isSettingActive
                        ? "bg-[#0D2A49] text-white"
                        : `
                            text-slate-300
                            hover:bg-gradient-to-r
                            hover:from-cyan-500/20
                            hover:via-blue-500/15
                            hover:to-blue-600/10
                            hover:text-white
                          `
                    }
                  `}
                >
                  <div
                    className={`
                      flex h-4 w-4 shrink-0 items-center justify-center
                      ${
                        isSettingActive
                          ? "text-cyan-300"
                          : "text-slate-400 group-hover:text-cyan-300"
                      }
                    `}
                  >
                    <Settings size={15} strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1 truncate text-left">
                    Settings
                  </div>

                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className={`transition-transform ${settingOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {settingOpen && (
                  <div className="sidebar-submenu mt-1 space-y-1 pl-2">
                    {settingMenu.map((item) => renderMenuButton(item))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 flex w-full flex-col items-center space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSettingOpen(!settingOpen)}
                  className={`
                    mx-auto flex h-9 w-9 items-center justify-center
                    rounded-xl transition-colors
                    ${
                      isSettingActive
                        ? "bg-[#102B49] text-cyan-300"
                        : "text-slate-400 hover:bg-[#102B49] hover:text-white"
                    }
                  `}
                  title="Setting"
                >
                  <Settings size={15} strokeWidth={2} />
                </button>

                {settingMenu.map(renderMenuButton)}
              </div>
            )}
          </nav>

          <div className="relative z-10 mt-auto border-t border-[#24435f] p-2.5">
            {!collapsed && (
              <div className="mb-2 flex items-center gap-2.5 px-1 py-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#102B49]">
                  <ShieldCheck
                    size={14}
                    strokeWidth={2}
                    className="text-cyan-300"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold text-white">
                    {orgName || role || "User"}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] capitalize text-slate-500">
                    {role || "User"}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className={`
                flex items-center justify-center gap-2
                rounded-xl border border-[#24435f]
                bg-[#0B1F38] text-[11px] text-slate-200
                transition-colors hover:bg-[#102B49]
                ${
                  collapsed
                    ? "mx-auto mb-2 h-9 w-9 p-0"
                    : "mb-1.5 w-full px-3 py-1.5"
                }
              `}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? (
                <Sun size={14} strokeWidth={2} />
              ) : (
                <Moon size={14} strokeWidth={2} />
              )}

              {!collapsed && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`
                flex items-center justify-center gap-2
                rounded-xl bg-[#E93F4B] text-[11px] text-white
                shadow-sm transition-colors hover:bg-[#D9323E]
                ${
                  collapsed
                    ? "mx-auto h-9 w-9 p-0"
                    : "w-full px-3 py-1.5"
                }
              `}
              title="Logout"
            >
              <LogOut size={14} strokeWidth={2} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>
      )}

      <main
        className={`
          app-main min-w-0 flex-1 overflow-auto transition-colors duration-150
          ${dark ? "bg-[#061426]" : "bg-[#edf3f8]"}
        `}
      >
        <div className="min-h-full p-2.5">
          {children}
        </div>
      </main>
    </div>
  );
}

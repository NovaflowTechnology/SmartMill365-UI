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
  Leaf,
  Settings,
  ChevronDown,
  ServerCog,
  Factory,
} from "lucide-react";

export default function Layout({
  children,
  setPage,
  currentPage = "dashboard",
  fullscreen,
  showSidebar = true,
  dark = false,
  toggleTheme,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const role = localStorage.getItem("role");
  const orgName = localStorage.getItem("org_name");

  const isSuperadmin = role === "superadmin";
  const isAdmin = role === "admin";
  const isEditor = role === "editor";

  const settingKeys = [
    "builder",
    "templates",
    "organizations",
    "device-management",
  ];

  const [settingOpen, setSettingOpen] = useState(
    settingKeys.includes(currentPage)
  );

  useEffect(() => {
    if (settingKeys.includes(currentPage)) {
      setSettingOpen(true);
    }
  }, [currentPage]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const mainMenu = [
    {
      key: "dashboard",
      label: "Dashboard",
      description: "Live monitoring",
      icon: LayoutDashboard,
    },
    {
      key: "process-simulator",
      label: "Plant Simulator",
      description: "Build process topology",
      icon: Factory,
    },
  ];

  const settingMenu = [
    ...(isSuperadmin || isAdmin || isEditor
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
      description: "Manage dashboards",
      icon: Folder,
    },
    ...(isSuperadmin
      ? [
          {
            key: "device-management",
            label: "Device Management",
            description: "Assign device access",
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

  const isSettingActive = settingKeys.includes(currentPage);

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
              ? "bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-sm"
              : "text-slate-300 hover:bg-[#182641] hover:text-white"
          }
        `}
      >
        {isActive && !collapsed && (
          <span
            className="
              absolute left-0 h-6 w-[3px]
              rounded-r-full bg-cyan-300
            "
          />
        )}

        <div
          className={`
            flex h-4 w-4 shrink-0 items-center justify-center
            ${
              isActive
                ? "text-white"
                : "text-slate-400 group-hover:text-cyan-300"
            }
          `}
        >
          <Icon size={16} strokeWidth={2} />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[12px] leading-tight">
              {item.label}
            </div>
            <div
              className={`
                mt-0.5 truncate text-[9px] leading-tight
                ${
                  isActive
                    ? "text-emerald-50"
                    : "text-slate-500 group-hover:text-slate-400"
                }
              `}
            >
              {item.description}
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
        ${dark ? "bg-[#0B1328]" : "bg-[#eef1f5]"}
      `}
    >
      {showSidebar && !fullscreen && (
        <aside
          className={`
            app-sidebar relative flex flex-col overflow-hidden
            border-r border-[#2c3c61] bg-[#081022]
            transition-[width] duration-300 ease-out
            ${collapsed ? "w-14" : "w-[14.5rem]"}
          `}
        >
          <div
            className={`
              relative z-10 border-b border-[#2c3c61]
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
                      rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-sm
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
                  rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-sm
                "
                title="UI Template System"
              >
                <Monitor size={15} strokeWidth={2} className="text-white" />
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="
                flex h-8 w-8 shrink-0 items-center justify-center
                rounded-lg text-slate-400
                transition-colors hover:bg-[#182641] hover:text-white
              "
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                relative z-10 mx-3 mt-3 rounded-2xl
                border border-[#2c3c61] bg-[#111b34]
                p-3 shadow-sm
              "
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Workspace
                  </p>
                  <h3 className="mt-1 truncate text-[12px] font-bold text-white">
                    Mill Control Center
                  </h3>
                </div>

                <div
                  className="
                    flex h-8 w-8 shrink-0 items-center justify-center
                    rounded-xl border border-[#35466e]
                    bg-[#182641] text-cyan-300
                  "
                >
                  <Leaf size={14} strokeWidth={2} />
                </div>
              </div>
            </div>
          )}

          <nav
            className={`
              relative z-10 mt-3.5 flex flex-col gap-1
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
              <div className="mt-2 rounded-2xl border border-[#2c3c61] bg-[#111b34] p-1.5">
                <button
                  type="button"
                  onClick={() => setSettingOpen(!settingOpen)}
                  className={`
                    flex min-h-[44px] w-full items-center gap-2.5
                    rounded-xl px-3 py-2
                    text-[12px] font-semibold transition-colors
                    ${
                      isSettingActive
                        ? "bg-[#182641] text-white"
                        : "text-slate-300 hover:bg-[#182641] hover:text-white"
                    }
                  `}
                >
                  <div
                    className={`
                      flex h-4 w-4 shrink-0 items-center justify-center
                      ${
                        isSettingActive
                          ? "text-cyan-300"
                          : "text-slate-400"
                      }
                    `}
                  >
                    <Settings size={15} strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate leading-tight">Setting</div>
                    <div className="mt-0.5 truncate text-[9px] text-slate-500">
                      Templates and access
                    </div>
                  </div>

                  <ChevronDown
                    size={13}
                    strokeWidth={2}
                    className={`transition-transform ${settingOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {settingOpen && (
                  <div className="sidebar-submenu mt-1.5 space-y-1">
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
                        ? "bg-[#182641] text-cyan-300"
                        : "text-slate-400 hover:bg-[#182641] hover:text-white"
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

          <div className="relative z-10 mt-auto border-t border-[#2c3c61] p-2.5">
            {!collapsed && (
              <div className="mb-2 rounded-2xl border border-[#2c3c61] bg-[#111b34] p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#35466e] bg-[#182641]">
                    <ShieldCheck
                      size={14}
                      strokeWidth={2}
                      className="text-cyan-300"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[8px] uppercase tracking-wide text-slate-500">
                      Account
                    </div>

                    <div className="truncate text-[11px] font-bold text-white">
                      {orgName || role || "User"}
                    </div>

                    {orgName && (
                      <div className="mt-0.5 text-[9px] capitalize text-cyan-300">
                        {role}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className={`
                flex items-center justify-center gap-2
                rounded-xl border border-[#2c3c61]
                bg-[#111b34] text-[11px] text-slate-200
                transition-colors hover:bg-[#182641]
                ${
                  collapsed
                    ? "mx-auto mb-2 h-9 w-9 p-0"
                    : "mb-2 w-full px-3 py-2"
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
                rounded-xl bg-[#ff6f88] text-[11px] text-white
                shadow-sm transition-colors hover:bg-[#ff5c77]
                ${
                  collapsed
                    ? "mx-auto h-9 w-9 p-0"
                    : "w-full px-3 py-2"
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
          ${dark ? "bg-[#0b1328]" : "bg-[#eef1f5]"}
        `}
      >
        <div className="min-h-full p-2.5">
          {children}
        </div>
      </main>
    </div>
  );
}

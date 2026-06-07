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
  // SIDEBAR
  const [collapsed, setCollapsed] =
    useState(false);

  // ROLE / ORG
  const role =
    localStorage.getItem("role");

  const orgName =
    localStorage.getItem("org_name");

  const isSuperadmin =
    role === "superadmin";

  const isAdmin =
    role === "admin";

  const isEditor =
    role === "editor";

  // SETTINGS GROUP
  const settingKeys = [
    "builder",
    "templates",
    "organizations",
  ];

  const [settingOpen, setSettingOpen] =
    useState(
      settingKeys.includes(currentPage)
    );

  useEffect(() => {
    if (settingKeys.includes(currentPage)) {
      setSettingOpen(true);
    }
  }, [currentPage]);

  // LOGOUT
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // MAIN MENU
  const mainMenu = [
    {
      key: "dashboard",
      label: "Dashboard",
      description: "Live monitoring",
      icon: LayoutDashboard,
    },
  ];

  // SETTING MENU
  const settingMenu = [
    ...(isSuperadmin ||
    isAdmin ||
    isEditor
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
      label:
        isSuperadmin
          ? "Template Management"
          : "Templates",
      description: "Manage dashboards",
      icon: Folder,
    },

    ...(isSuperadmin || isAdmin
      ? [
          {
            key: "organizations",
            label:
              isSuperadmin
                ? "Organization Management"
                : "User Management",
            description:
              isSuperadmin
                ? "Manage companies"
                : "Manage users",
            icon: Building2,
          },
        ]
      : []),
  ];

  const isSettingActive =
    settingKeys.includes(currentPage);

  const renderMenuButton = (item) => {
    const Icon = item.icon;

    const isActive =
      currentPage === item.key;

    return (
      <button
        key={item.key}
        onClick={() => {
          setPage(item.key);
        }}
        title={
          collapsed
            ? item.label
            : ""
        }
        className={`
          relative
          flex items-center
          gap-3
          rounded-2xl
          text-sm
          font-medium
          transition-all duration-200
          group

          ${
            collapsed
              ? "justify-center px-3 py-3"
              : "px-4 py-3"
          }

          ${
            isActive
              ? `
                bg-emerald-600
                text-white
                shadow-sm
              `
              : `
                text-slate-300
                hover:bg-slate-800
                hover:text-white
              `
          }
        `}
      >
        {/* ACTIVE SIDE INDICATOR */}
        {isActive && !collapsed && (
          <span
            className="
              absolute left-0
              w-1 h-8
              rounded-r-full
              bg-emerald-300
            "
          />
        )}

        <div
          className={`
            flex items-center
            justify-center
            rounded-xl
            transition

            ${
              isActive
                ? "text-white"
                : "text-slate-400 group-hover:text-emerald-300"
            }
          `}
        >
          <Icon size={18} />
        </div>

        {!collapsed && (
          <div className="flex-1 text-left">
            <div>
              {item.label}
            </div>

            <div
              className={`
                text-[11px]
                mt-0.5

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
        flex h-screen
        ${
          dark
            ? "bg-slate-950"
            : "bg-slate-50"
        }
      `}
    >
      {/* SIDEBAR */}
      {showSidebar && !fullscreen && (
        <aside
          className={`
            relative
            transition-all duration-300 ease-in-out

            ${
              collapsed
                ? "w-20"
                : "w-[19rem]"
            }

            flex flex-col
            border-r
            overflow-hidden

            bg-slate-950
            border-slate-800
          `}
        >
          {/* HEADER */}
          <div
            className={`
              relative z-10
              border-b border-slate-800

              ${
                collapsed
                  ? "flex flex-col items-center gap-3 px-3 py-5"
                  : "flex items-center justify-between px-5 py-5"
              }
            `}
          >
            {!collapsed ? (
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-11 h-11
                      rounded-2xl
                      bg-emerald-600
                      flex items-center
                      justify-center
                      shadow-sm
                    "
                  >
                    <Monitor className="w-6 h-6 text-white" />
                  </div>

                  <div>
                    <h2
                      className="
                        font-black
                        text-sm
                        tracking-wider
                        uppercase
                        text-white
                        leading-tight
                      "
                    >
                      UI Template
                      <span className="text-emerald-300">
                        {" "}
                        System
                      </span>
                    </h2>

                    <p
                      className="
                        text-[11px]
                        text-slate-500
                        mt-1
                      "
                    >
                      Novaflow Technology
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="
                  w-11 h-11
                  rounded-2xl
                  bg-emerald-600
                  flex items-center
                  justify-center
                  shadow-sm
                "
                title="UI Template System"
              >
                <Monitor className="w-6 h-6 text-white" />
              </div>
            )}

            <button
              onClick={() =>
                setCollapsed(!collapsed)
              }
              className="
                w-9 h-9
                rounded-xl
                flex items-center
                justify-center
                text-slate-400
                hover:text-white
                hover:bg-slate-800
                transition
              "
              title={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </div>

          {/* QUICK INFO CARD */}
          {!collapsed && (
            <div
              className="
                relative z-10
                mx-4 mt-5
                rounded-3xl
                bg-slate-900
                border border-slate-800
                p-4
                shadow-sm
              "
            >
              <div
                className="
                  flex items-center
                  justify-between
                  mb-4
                "
              >
                <div>
                  <p
                    className="
                      text-[11px]
                      uppercase
                      tracking-[0.2em]
                      text-slate-500
                      font-bold
                    "
                  >
                    Workspace
                  </p>

                  <h3
                    className="
                      text-sm
                      font-bold
                      text-white
                      mt-1
                    "
                  >
                    Mill Control Center
                  </h3>
                </div>

                <div
                  className="
                    w-10 h-10
                    rounded-2xl
                    bg-slate-800
                    text-emerald-300
                    flex items-center
                    justify-center
                    border border-slate-700
                  "
                >
                  <Leaf className="w-5 h-5" />
                </div>
              </div>

              <div
                className="
                  grid grid-cols-2
                  gap-3
                "
              >
                <div
                  className="
                    rounded-2xl
                    bg-slate-950
                    border border-slate-800
                    p-3
                  "
                >
                  <p
                    className="
                      text-[10px]
                      text-slate-500
                      uppercase
                    "
                  >
                    Mode
                  </p>

                  <p
                    className="
                      text-sm
                      font-bold
                      text-emerald-300
                      mt-1
                    "
                  >
                    Live
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    bg-slate-950
                    border border-slate-800
                    p-3
                  "
                >
                  <p
                    className="
                      text-[10px]
                      text-slate-500
                      uppercase
                    "
                  >
                    Access
                  </p>

                  <p
                    className="
                      text-sm
                      font-bold
                      text-slate-200
                      mt-1
                      capitalize
                      truncate
                    "
                  >
                    {role || "User"}
                  </p>
                </div>
              </div>

              <p
                className="
                  text-xs
                  text-slate-500
                  leading-relaxed
                  mt-4
                "
              >
                Manage live dashboards, sterilizer templates, and organization access.
              </p>
            </div>
          )}

          {/* MENU */}
          <nav
            className="
              relative z-10
              flex flex-col
              mt-6 px-3 gap-2
            "
          >
            {!collapsed && (
              <div
                className="
                  px-4 mb-1
                  text-[11px]
                  uppercase
                  tracking-[0.2em]
                  text-slate-600
                  font-bold
                "
              >
                Main Menu
              </div>
            )}

            {/* DASHBOARD */}
            {mainMenu.map(renderMenuButton)}

            {/* SETTING GROUP */}
            {!collapsed ? (
              <div
                className="
                  mt-3
                  rounded-3xl
                  bg-slate-900
                  border border-slate-800
                  p-2
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setSettingOpen(!settingOpen)
                  }
                  className={`
                    w-full
                    flex items-center
                    gap-3
                    px-4 py-3
                    rounded-2xl
                    text-sm
                    font-semibold
                    transition

                    ${
                      isSettingActive
                        ? "text-white bg-slate-800"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }
                  `}
                >
                  <div
                    className={`
                      ${
                        isSettingActive
                          ? "text-emerald-300"
                          : "text-slate-400"
                      }
                    `}
                  >
                    <Settings size={18} />
                  </div>

                  <div className="flex-1 text-left">
                    <div>Setting</div>

                    <div
                      className="
                        text-[11px]
                        mt-0.5
                        text-slate-500
                      "
                    >
                      Templates and access
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`
                      transition-transform
                      ${
                        settingOpen
                          ? "rotate-180"
                          : ""
                      }
                    `}
                  />
                </button>

                {settingOpen && (
                  <div className="mt-2 space-y-2">
                    {settingMenu.map((item) => {
                      const Icon = item.icon;

                      const isActive =
                        currentPage === item.key;

                      return (
                        <button
                          key={item.key}
                          onClick={() =>
                            setPage(item.key)
                          }
                          className={`
                            relative
                            w-full
                            flex items-center
                            gap-3
                            rounded-2xl
                            text-sm
                            font-medium
                            transition-all duration-200
                            group
                            px-4 py-3

                            ${
                              isActive
                                ? `
                                  bg-emerald-600
                                  text-white
                                  shadow-sm
                                `
                                : `
                                  text-slate-300
                                  hover:bg-slate-800
                                  hover:text-white
                                `
                            }
                          `}
                        >
                          {isActive && (
                            <span
                              className="
                                absolute left-0
                                w-1 h-8
                                rounded-r-full
                                bg-emerald-300
                              "
                            />
                          )}

                          <div
                            className={`
                              ml-3
                              flex items-center
                              justify-center
                              rounded-xl

                              ${
                                isActive
                                  ? "text-white"
                                  : "text-slate-400 group-hover:text-emerald-300"
                              }
                            `}
                          >
                            <Icon size={17} />
                          </div>

                          <div className="flex-1 text-left">
                            <div>
                              {item.label}
                            </div>

                            <div
                              className={`
                                text-[11px]
                                mt-0.5

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
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div
                  className={`
                    w-full
                    flex items-center
                    justify-center
                    px-3 py-3
                    rounded-2xl

                    ${
                      isSettingActive
                        ? "bg-slate-800 text-emerald-300"
                        : "text-slate-400"
                    }
                  `}
                  title="Setting"
                >
                  <Settings size={18} />
                </div>

                {settingMenu.map(renderMenuButton)}
              </div>
            )}
          </nav>

          {/* FOOTER */}
          <div
            className="
              relative z-10
              mt-auto
              p-4
              border-t border-slate-800
            "
          >
            {/* USER CARD */}
            {!collapsed && (
              <div
                className="
                  mb-4
                  rounded-3xl
                  bg-slate-900
                  border border-slate-800
                  p-4
                "
              >
                <div
                  className="
                    flex items-center gap-3
                  "
                >
                  <div
                    className="
                      w-10 h-10
                      rounded-2xl
                      bg-slate-800
                      flex items-center
                      justify-center
                      border border-slate-700
                    "
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  </div>

                  <div className="min-w-0">
                    <div
                      className="
                        text-[11px]
                        text-slate-500
                        uppercase tracking-wide
                      "
                    >
                      Account
                    </div>

                    <div
                      className="
                        text-sm font-bold
                        text-white
                        truncate
                      "
                    >
                      {orgName ||
                        role ||
                        "User"}
                    </div>

                    {orgName && (
                      <div
                        className="
                          text-xs
                          text-emerald-300
                          capitalize
                          mt-0.5
                        "
                      >
                        {role}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* THEME */}
            <button
              onClick={toggleTheme}
              className={`
                w-full
                flex items-center
                justify-center
                gap-2

                bg-slate-900
                hover:bg-slate-800
                border border-slate-800

                text-slate-200

                py-3 mb-3

                rounded-2xl

                transition-all duration-200

                ${
                  collapsed
                    ? "px-0"
                    : "px-4"
                }
              `}
              title={
                dark
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {dark ? (
                <Sun size={16} />
              ) : (
                <Moon size={16} />
              )}

              {!collapsed && (
                <span>
                  {dark
                    ? "Light Mode"
                    : "Dark Mode"}
                </span>
              )}
            </button>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              className={`
                w-full
                flex items-center
                justify-center
                gap-2

                bg-red-500
                hover:bg-red-600

                text-white

                py-3

                rounded-2xl

                transition-all duration-200
                shadow-sm

                ${
                  collapsed
                    ? "px-0"
                    : "px-4"
                }
              `}
              title="Logout"
            >
              <LogOut size={16} />

              {!collapsed && (
                <span>
                  Logout
                </span>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* MAIN */}
      <main
        className={`
          flex-1
          overflow-auto
          transition-colors

          ${
            dark
              ? "bg-slate-950"
              : "bg-slate-50"
          }
        `}
      >
        <div
          className="
            p-6
            min-h-full
          "
        >
          {children}
        </div>
      </main>
    </div>
  );
}
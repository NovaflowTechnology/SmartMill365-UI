import { useState } from "react";

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
  Activity,
  ShieldCheck,
  Leaf,
} from "lucide-react";

export default function Layout({
  children,
  setPage,
  fullscreen,
  showSidebar = true,
  dark = false,
  toggleTheme,
}) {
  // SIDEBAR
  const [collapsed, setCollapsed] =
    useState(false);

  // ACTIVE MENU
  const [active, setActive] =
    useState("dashboard");

  // ROLE / ORG
  const role =
    localStorage.getItem("role");

  const orgName =
    localStorage.getItem("org_name");

  // LOGOUT
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // MENU
  const menu = [
    {
      key: "dashboard",
      label: "Dashboard",
      description: "Live monitoring",
      icon: LayoutDashboard,
    },

    ...(role === "superadmin" ||
    role === "admin"
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
        role === "superadmin"
          ? "Template Management"
          : "Templates",
      description: "Manage dashboards",
      icon: Folder,
    },

    ...(role === "superadmin"
      ? [
          {
            key: "organizations",
            label: "Organizations",
            description: "Manage companies",
            icon: Building2,
          },
        ]
      : []),
  ];

  return (
    <div
      className={`
        flex h-screen
        ${
          dark
            ? "bg-gray-950"
            : "bg-gray-50/40"
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

            bg-[#03130f]
            border-emerald-400/10
          `}
        >
          {/* BACKGROUND GLOW */}
          <div
            className="
              absolute -top-24 -left-24
              w-64 h-64
              bg-emerald-500/20
              rounded-full
              blur-3xl
              pointer-events-none
            "
          />

          <div
            className="
              absolute bottom-20 -right-24
              w-64 h-64
              bg-cyan-500/20
              rounded-full
              blur-3xl
              pointer-events-none
            "
          />

          {/* SUBTLE DECORATION */}
          <div
            className="
              absolute top-36 right-5
              text-[80px]
              opacity-[0.035]
              pointer-events-none
              select-none
            "
          >
            🌴
          </div>

          {/* HEADER */}
          <div
            className={`
              relative z-10
              border-b border-white/10

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
                      bg-gradient-to-br
                      from-emerald-500
                      to-cyan-400
                      flex items-center
                      justify-center
                      shadow-lg shadow-emerald-500/25
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
                        text-emerald-100/60
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
                  bg-gradient-to-br
                  from-emerald-500
                  to-cyan-400
                  flex items-center
                  justify-center
                  shadow-lg shadow-emerald-500/25
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
                text-gray-400
                hover:text-white
                hover:bg-white/10
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
                bg-gradient-to-br
                from-emerald-500/10
                to-cyan-500/10
                border border-emerald-400/20
                p-4
                shadow-lg
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
                      text-emerald-100/50
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
                    bg-emerald-500/10
                    text-emerald-300
                    flex items-center
                    justify-center
                    border border-emerald-500/20
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
                    bg-white/5
                    border border-white/10
                    p-3
                  "
                >
                  <p
                    className="
                      text-[10px]
                      text-gray-400
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
                    bg-white/5
                    border border-white/10
                    p-3
                  "
                >
                  <p
                    className="
                      text-[10px]
                      text-gray-400
                      uppercase
                    "
                  >
                    Access
                  </p>

                  <p
                    className="
                      text-sm
                      font-bold
                      text-cyan-300
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
                  text-gray-400
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
                  text-gray-500
                  font-bold
                "
              >
                Main Menu
              </div>
            )}

            {menu.map((item) => {
              const Icon = item.icon;

              const isActive =
                active === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setPage(item.key);
                    setActive(item.key);
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
                          bg-gradient-to-r
                          from-emerald-600
                          to-cyan-500
                          text-white
                          shadow-lg
                          shadow-emerald-500/20
                        `
                        : `
                          text-gray-300
                          hover:bg-white/10
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
                        bg-emerald-200
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
                          : "text-gray-400 group-hover:text-emerald-300"
                      }
                    `}
                  >
                    <Icon size={18} />
                  </div>

                  {!collapsed && (
                    <div
                      className="
                        flex-1 text-left
                      "
                    >
                      <div>
                        {item.label}
                      </div>

                      <div
                        className={`
                          text-[11px]
                          mt-0.5

                          ${
                            isActive
                              ? "text-emerald-100"
                              : "text-gray-500 group-hover:text-gray-400"
                          }
                        `}
                      >
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* FOOTER */}
          <div
            className="
              relative z-10
              mt-auto
              p-4
              border-t border-white/10
            "
          >
            {/* USER CARD */}
            {!collapsed && (
              <div
                className="
                  mb-4
                  rounded-3xl
                  bg-white/5
                  border border-white/10
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
                      bg-gradient-to-br
                      from-emerald-500
                      to-cyan-500
                      flex items-center
                      justify-center
                      shadow-lg shadow-emerald-500/20
                    "
                  >
                    <ShieldCheck
                      className="
                        w-5 h-5
                        text-white
                      "
                    />
                  </div>

                  <div className="min-w-0">
                    <div
                      className="
                        text-[11px]
                        text-gray-400
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

                bg-white/10
                hover:bg-white/20

                text-white

                py-3 mb-3

                rounded-2xl

                transition-all duration-200
                hover:-translate-y-0.5

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

                bg-gradient-to-r
                from-red-500
                to-rose-600
                hover:from-red-600
                hover:to-rose-700

                text-white

                py-3

                rounded-2xl

                transition-all duration-200
                hover:-translate-y-0.5
                shadow-lg shadow-red-500/20

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
              ? "bg-gray-950"
              : "bg-gray-50/40"
          }
        `}
      >
        {/* TOP BACKGROUND DECORATION */}
        <div
          className="
            sticky top-0 z-10
            h-1
            bg-gradient-to-r
            from-emerald-600
            via-cyan-400
            to-emerald-400
          "
        />

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
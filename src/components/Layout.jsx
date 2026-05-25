import { useState } from "react";

import {
  LayoutDashboard,
  Wrench,
  Folder,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Activity,
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
  const [collapsed,
    setCollapsed] =
    useState(false);

  // ACTIVE MENU
  const [active,
    setActive] =
    useState("dashboard");


  // ROLE
  const role =
    localStorage.getItem("role");

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
      icon: LayoutDashboard,
    },

    ...(role === "superadmin" ||
    role === "admin"

      ? [
          {
            key: "builder",
            label:
              "Template Builder",
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

      icon: Folder,
    },
  ];

  return (

    <div className={`
      flex h-screen

      ${dark

        ? "bg-gray-950"

        : "bg-gray-100"}
    `}>

      {/* SIDEBAR */}
      {showSidebar &&
        !fullscreen && (

        <div
          className={`
            transition-all duration-300

            ${collapsed

              ? "w-20"

              : "w-72"}

            flex flex-col

            border-r

            ${dark

              ? `
                bg-[#020617]
                border-white/10
              `

              : `
                bg-[#0f172a]
                border-black/10
              `}
          `}
        >

          {/* HEADER */}
          <div className="
            flex items-center
            justify-between
            px-5 py-5
            border-b border-white/10
          ">

            {!collapsed && (

              <div>

                <div className="
                  flex items-center gap-2
                ">

                  <Monitor className="
                    w-5 h-5
                    text-cyan-400
                  " />

                  <h2 className="
                    font-bold
                    text-sm
                    tracking-wider
                    uppercase
                    text-white
                  ">
                    Monitoring Kanban
                  </h2>

                </div>

                <p className="
                  text-xs
                  text-gray-400
                  mt-1
                ">
                  by Novaflow Technology Sdn. Bhd.
                </p>

              </div>

            )}

            <button
              onClick={() =>
                setCollapsed(
                  !collapsed
                )
              }

              className="
                text-gray-400
                hover:text-white
                transition
              "
            >

              {collapsed

                ? (
                  <ChevronRight
                    size={18}
                  />
                )

                : (
                  <ChevronLeft
                    size={18}
                  />
                )}

            </button>

          </div>

          {/* STATUS */}
          {!collapsed && (

            <div className="
              mx-4 mt-4
              rounded-2xl
              bg-cyan-500/10
              border border-cyan-500/20
              p-4
            ">

              <div className="
                flex items-center
                gap-2 mb-2
              ">

                <Activity className="
                  w-4 h-4
                  text-green-400
                " />

                <span className="
                  text-xs font-semibold
                  text-green-400
                  tracking-wide
                ">
                  SYSTEM ONLINE
                </span>

              </div>

              <div className="
                text-xs text-gray-400
              ">
                Real-time monitoring active
              </div>

            </div>

          )}

          {/* MENU */}
          <div className="
            flex flex-col
            mt-5 px-3 gap-2
          ">

            {menu.map((item) => {

              const Icon =
                item.icon;

              const isActive =
                active === item.key;

              return (

                <button
                  key={item.key}

                  onClick={() => {

                    setPage(
                      item.key
                    );

                    setActive(
                      item.key
                    );
                  }}

                  className={`
                    flex items-center
                    gap-3
                    px-4 py-3
                    rounded-2xl

                    text-sm
                    font-medium

                    transition-all duration-200

                    ${isActive

                      ? `
                        bg-gradient-to-r
                        from-blue-600
                        to-cyan-500
                        text-white
                        shadow-lg
                      `

                      : `
                        text-gray-300
                        hover:bg-white/10
                        hover:text-white
                      `}
                  `}
                >

                  <Icon
                    size={18}
                  />

                  {!collapsed && (
                    <span>
                      {item.label}
                    </span>
                  )}

                </button>

              );
            })}

          </div>

          {/* FOOTER */}
          <div className="
            mt-auto
            p-4
            border-t border-white/10
          ">

            {/* USER */}
            {!collapsed && (

              <div className="
                mb-4
                rounded-2xl
                bg-white/5
                p-3
              ">

                <div className="
                  text-xs
                  text-gray-400
                  uppercase tracking-wide
                  mb-1
                ">
                  Logged In As
                </div>

                <div className="
                  text-sm font-semibold
                  text-white
                ">
                  {role}
                </div>

              </div>

            )}

            {/* THEME */}
            <button
              onClick={toggleTheme}

              className="
                w-full
                flex items-center
                justify-center
                gap-2

                bg-white/10
                hover:bg-white/20

                text-white

                py-3 mb-3

                rounded-2xl

                transition
              "
            >

              {dark

                ? (
                  <Sun
                    size={16}
                  />
                )

                : (
                  <Moon
                    size={16}
                  />
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
              onClick={
                handleLogout
              }

              className="
                w-full
                flex items-center
                justify-center
                gap-2

                bg-red-500
                hover:bg-red-600

                text-white

                py-3

                rounded-2xl

                transition
              "
            >

              <LogOut
                size={16}
              />

              {!collapsed && (
                <span>
                  Logout
                </span>
              )}

            </button>

          </div>

        </div>

      )}

      {/* MAIN */}
      <div className={`
        flex-1
        overflow-auto

        ${dark

          ? "bg-gray-950"

          : "bg-gray-100"}
      `}>

        <div className="
          p-6
          min-h-full
        ">

          {children}

        </div>

      </div>

    </div>
  );
}
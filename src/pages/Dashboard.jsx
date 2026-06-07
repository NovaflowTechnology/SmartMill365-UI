import { useEffect, useState } from "react";

import WidgetRenderer from "../components/WidgetRenderer";
import { dataOptions } from "../data/dataOptions";

import {
  Maximize2,
  Minimize2,
  LayoutGrid,
  Plus,
  FolderOpen,
} from "lucide-react";

// =====================================
// MILL ONLINE / OFFLINE SETTINGS
// =====================================
const OFFLINE_TIMEOUT_MS = 30000;

const liveDataKeys = [
  "steamPressure",
  "steamFlowrate",
  "steamOutletTemp",

  "inletDraft",
  "outletDraft",
  "furnaceDraft",

  "waterInletTemp",
  "waterFlowrate",
  "waterDrumLevel",

  "vgPressure",
  "vgInletTemp",
  "vgOutletTemp",
];

export default function Dashboard({
  template,
  setFullscreen,
  setPage,
}) {
  // LIVE DATA
  const [data, setData] = useState({});

  // HISTORY STORAGE
  const [history, setHistory] = useState([]);

  // MILL STATUS
  const [millStatus, setMillStatus] =
    useState("offline");

  const [lastActiveAt, setLastActiveAt] =
    useState(null);

  // FULLSCREEN
  const [isFullscreen, setIsFullscreen] =
    useState(false);

  // GRID ITEMS
  const [items, setItems] = useState(
    template?.layout?.items || []
  );

  // TEMPLATE TITLE
  const templateTitle =
    template?.name ||
    `Template #${template?.id || ""}` ||
    "Dashboard";

  // =====================================
  // CHECK WHETHER DATA HAS ANY LIVE VALUE
  // =====================================
  const hasAnyLiveValue = (incomingData) => {
    return liveDataKeys.some((key) => {
      const value = Number(
        incomingData?.[key] ?? 0
      );

      return (
        !Number.isNaN(value) &&
        value !== 0
      );
    });
  };

  // UPDATE TEMPLATE ITEMS
  useEffect(() => {
    setItems(template?.layout?.items || []);
  }, [template]);

  // DEBUG TEMPLATE
  useEffect(() => {
    console.log(
      "📊 DASHBOARD RECEIVED TEMPLATE:",
      template
    );
  }, [template]);

  // =====================================
  // WEBSOCKET
  // =====================================
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connect = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("❌ NO TOKEN");
        window.location.href = "/";
        return;
      }

      console.log("🔌 CONNECTING WS...");

      ws = new WebSocket(
        `ws://localhost:5000?token=${token}`
      );

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const incoming = JSON.parse(event.data);

          console.log("📡 LIVE DATA:", incoming);

          setData(incoming);

          // If any sensor has non-zero value,
          // mark mill online immediately.
          if (hasAnyLiveValue(incoming)) {
            setMillStatus("online");
            setLastActiveAt(Date.now());
          }

          setHistory((prev) => [
            ...prev.slice(-500),

            {
              timestamp: Date.now(),
              time: new Date().toLocaleTimeString(),
              date: new Date().toLocaleDateString(),
              ...incoming,
            },
          ]);
        } catch (err) {
          console.error("❌ WS PARSE ERROR:", err);
        }
      };

      ws.onclose = () => {
        console.warn("⚠️ WS DISCONNECTED");

        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error("❌ WS ERROR:", err);

        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (ws) {
        console.log("🔌 WS CLOSED");
        ws.close();
      }
    };
  }, []);

  // =====================================
  // OFFLINE DETECTION
  // If all values remain 0 for 30 seconds,
  // set mill status to offline.
  // =====================================
  useEffect(() => {
    const timer = setInterval(() => {
      const currentlyHasLiveValue =
        hasAnyLiveValue(data);

      if (currentlyHasLiveValue) {
        setMillStatus("online");
        setLastActiveAt(Date.now());
        return;
      }

      if (!lastActiveAt) {
        setMillStatus("offline");
        return;
      }

      const inactiveDuration =
        Date.now() - lastActiveAt;

      if (
        inactiveDuration >=
        OFFLINE_TIMEOUT_MS
      ) {
        setMillStatus("offline");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data, lastActiveAt]);

  // ESC FULLSCREEN EXIT
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () =>
      window.removeEventListener(
        "keydown",
        handleEsc
      );
  }, [setFullscreen]);

  // TOGGLE FULLSCREEN
  const toggleFullscreen = () => {
    const next = !isFullscreen;

    setIsFullscreen(next);
    setFullscreen(next);
  };

  // LABEL LOOKUP
  const getLabel = (key) =>
    dataOptions.find((d) => d.key === key)?.label ||
    key;

  // WIDGET TITLE
  const getWidgetTitle = (item) => {
    if (item?.label) {
      return item.label;
    }

    if (
      item?.dataKeys &&
      item.dataKeys.length > 1
    ) {
      return item.dataKeys
        .map((key) => getLabel(key))
        .join(" / ");
    }

    if (item?.type === "image") {
      return "System Diagram";
    }

    return getLabel(item.dataKey);
  };

  // NO TEMPLATE FOUND
  if (!template) {
    return (
      <div
        className="
          h-full
          flex items-center
          justify-center
          p-6
        "
      >
        <div
          className="
            max-w-xl
            w-full
            bg-white
            dark:bg-gray-800
            border border-gray-200
            dark:border-gray-700
            rounded-3xl
            shadow-lg
            p-10
            text-center
          "
        >
          <div
            className="
              w-16 h-16
              mx-auto mb-5
              rounded-3xl
              bg-emerald-500/10
              text-emerald-500
              flex items-center
              justify-center
            "
          >
            <LayoutGrid className="w-8 h-8" />
          </div>

          <h2
            className="
              text-2xl
              font-black
              text-gray-900
              dark:text-white
              mb-3
            "
          >
            No Dashboard Template Found
          </h2>

          <p
            className="
              text-gray-500
              dark:text-gray-400
              mb-6
              leading-relaxed
            "
          >
            There is no dashboard template available yet. Please create a new template first, then assign it to an organization if needed.
          </p>

          <div
            className="
              flex flex-col
              sm:flex-row
              gap-3
              justify-center
            "
          >
            <button
              onClick={() => setPage?.("builder")}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-5 py-3
                rounded-2xl
                bg-emerald-600
                hover:bg-emerald-700
                text-white
                font-semibold
                transition
              "
            >
              <Plus size={18} />
              Create Template
            </button>

            <button
              onClick={() => setPage?.("templates")}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-5 py-3
                rounded-2xl
                bg-gray-100
                hover:bg-gray-200
                dark:bg-gray-700
                dark:hover:bg-gray-600
                text-gray-700
                dark:text-white
                font-semibold
                transition
              "
            >
              <FolderOpen size={18} />
              View Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? `
            fixed inset-0
            bg-gray-100
            dark:bg-gray-900
            z-50
            flex flex-col
            p-4
          `
          : `
            h-full
            flex flex-col
          `
      }
    >
      {/* HEADER */}
      <div
        className={`
          flex flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-3
          bg-white
          dark:bg-gray-800
          border border-gray-200
          dark:border-gray-700
          shadow-sm

          ${
            isFullscreen
              ? `
                mb-3
                rounded-2xl
                px-4 py-3
              `
              : `
                mb-6
                rounded-3xl
                p-5
              `
          }
        `}
      >
        {/* TITLE */}
        <div>
          <div
            className="
              flex items-center
              gap-3
            "
          >
            <div
              className={`
                rounded-2xl
                bg-gradient-to-br
                from-emerald-500
                to-cyan-400
                flex items-center
                justify-center
                text-white
                shadow-lg
                shadow-emerald-500/20

                ${
                  isFullscreen
                    ? "w-9 h-9 text-sm"
                    : "w-11 h-11"
                }
              `}
            >
              📊
            </div>

            <div>
              {!isFullscreen && (
                <p
                  className="
                    text-xs
                    uppercase
                    tracking-[0.2em]
                    text-gray-400
                    font-bold
                  "
                >
                  Active Template
                </p>
              )}

              <h1
                className={`
                  font-black
                  text-gray-900
                  dark:text-white

                  ${
                    isFullscreen
                      ? "text-lg"
                      : "text-2xl"
                  }
                `}
              >
                {templateTitle}
              </h1>
            </div>
          </div>
        </div>

        {/* ACTION GROUP */}
        <div
          className="
            flex flex-wrap
            items-center
            gap-3
          "
        >
          {/* MILL STATUS */}
          <div
            className={`
              inline-flex items-center
              gap-2
              rounded-2xl
              bg-white
              dark:bg-gray-900
              border
              shadow-sm

              ${
                millStatus === "online"
                  ? `
                    border-emerald-200
                    dark:border-emerald-800
                    text-emerald-700
                    dark:text-emerald-300
                  `
                  : `
                    border-red-200
                    dark:border-red-800
                    text-red-700
                    dark:text-red-300
                  `
              }

              ${
                isFullscreen
                  ? "h-9 px-3"
                  : "h-11 px-4"
              }
            `}
          >
            <span
              className="
                relative
                flex h-3 w-3
              "
            >
              {millStatus === "online" && (
                <span
                  className="
                    animate-ping
                    absolute inline-flex
                    h-full w-full
                    rounded-full
                    bg-emerald-400
                    opacity-75
                  "
                ></span>
              )}

              <span
                className={`
                  relative inline-flex
                  rounded-full
                  h-3 w-3

                  ${
                    millStatus === "online"
                      ? "bg-emerald-400"
                      : "bg-red-400"
                  }
                `}
              ></span>
            </span>

            <span
              className="
                text-xs
                font-bold
                tracking-wide
              "
            >
              {millStatus === "online"
                ? "ONLINE"
                : "OFFLINE"}
            </span>
          </div>

          {/* FULLSCREEN */}
          <button
            onClick={toggleFullscreen}
            className={`
              inline-flex items-center
              gap-2
              rounded-2xl
              bg-white
              hover:bg-gray-50
              dark:bg-gray-900
              dark:hover:bg-gray-700
              border border-gray-200
              dark:border-gray-700
              text-gray-700
              dark:text-gray-200
              shadow-sm
              transition

              ${
                isFullscreen
                  ? "h-9 px-3"
                  : "h-11 px-4"
              }
            `}
          >
            {isFullscreen ? (
              <Minimize2 size={16} />
            ) : (
              <Maximize2 size={16} />
            )}

            <span
              className="
                text-xs
                font-bold
                tracking-wide
              "
            >
              {isFullscreen
                ? "EXIT FULLSCREEN"
                : "FULLSCREEN"}
            </span>
          </button>
        </div>
      </div>

      {/* GRID */}
      <div
        className={`
          grid
          flex-1
          h-full

          ${
            isFullscreen
              ? "gap-3"
              : "gap-4"
          }
        `}
        style={{
          gridTemplateColumns: `repeat(${
            template.layout?.cols || 1
          }, 1fr)`,

          gridTemplateRows: isFullscreen
            ? `repeat(${
                template.layout?.rows || 1
              }, minmax(0, 1fr))`
            : `repeat(${
                template.layout?.rows || 1
              }, minmax(180px, 1fr))`,

          gridAutoFlow: "dense",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="
              bg-white
              dark:bg-gray-800
              rounded-2xl
              shadow-lg
              border
              border-gray-200
              dark:border-gray-700
              flex flex-col
              overflow-hidden
            "
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
          >
            {/* WIDGET HEADER */}
            <div
              className={`
                border-b
                bg-gray-50
                dark:bg-gray-700
                border-gray-200
                dark:border-gray-600

                ${
                  isFullscreen
                    ? "px-3 py-2"
                    : "px-4 py-3"
                }
              `}
            >
              <span
                className={`
                  font-semibold
                  text-gray-800
                  dark:text-white

                  ${
                    isFullscreen
                      ? "text-xs"
                      : "text-sm"
                  }
                `}
              >
                {getWidgetTitle(item)}
              </span>
            </div>

            {/* BODY */}
            <div
              className={`
                flex-1
                flex items-center
                justify-center

                ${
                  isFullscreen
                    ? "p-2"
                    : "p-3"
                }
              `}
            >
              <WidgetRenderer
                type={item.type}
                value={data[item.dataKey]}
                data={data}
                history={history}
                dataKey={item.dataKey}
                item={item}
                updateItem={(updated) => {
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === updated.id
                        ? updated
                        : it
                    )
                  );
                }}
                editMode={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";

import WidgetRenderer from "../components/WidgetRenderer";
import { dataOptions } from "../data/dataOptions";

export default function Dashboard({
  template,
  setFullscreen,
}) {

  
  // LIVE DATA
  
  const [data, setData] =
    useState({});

  
  // HISTORY STORAGE
  
  const [history, setHistory] =
    useState([]);

  
  // FULLSCREEN
  
  const [isFullscreen,
    setIsFullscreen] =
    useState(false);

  
  // GRID ITEMS
  
  const [items, setItems] =
    useState(
      template?.layout?.items || []
    );

  
  // ROLE
  
  const role =
    localStorage.getItem("role");

  
  // UPDATE TEMPLATE ITEMS
  
  useEffect(() => {

    setItems(
      template?.layout?.items || []
    );

  }, [template]);

  
  // DEBUG TEMPLATE
  
  useEffect(() => {

    console.log(
      "📊 DASHBOARD RECEIVED TEMPLATE:",
      template
    );

  }, [template]);

  
  // WEBSOCKET
  
  useEffect(() => {

    let ws;

    const connect = () => {

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {

        console.warn(
          "❌ NO TOKEN"
        );

        window.location.href = "/";

        return;
      }

      console.log(
        "🔌 CONNECTING WS..."
      );

      ws = new WebSocket(
        `ws://localhost:5000?token=${token}`
      );

      
      // OPEN
      
      ws.onopen = () => {

        console.log(
          "✅ WebSocket connected"
        );
      };

      
      // MESSAGE
      
      ws.onmessage = (event) => {

        try {

          const incoming =
            JSON.parse(
              event.data
            );

          console.log(
            "📡 LIVE DATA:",
            incoming
          );

          // LIVE VALUES
          setData(incoming);

          // HISTORY
          setHistory((prev) => [

            ...prev.slice(-500),

            {
              timestamp:
                Date.now(),

              time:
                new Date()
                .toLocaleTimeString(),

              date:
                new Date()
                .toLocaleDateString(),

              ...incoming,
            },

          ]);

        } catch (err) {

          console.error(
            "❌ WS PARSE ERROR:",
            err
          );
        }
      };

      
      // CLOSE
      
      ws.onclose = () => {

        console.warn(
          "⚠️ WS DISCONNECTED"
        );

        setTimeout(
          connect,
          2000
        );
      };

      
      // ERROR
      
      ws.onerror = (err) => {

        console.error(
          "❌ WS ERROR:",
          err
        );

        ws.close();
      };
    };

    connect();

    return () => {

      if (ws) {

        console.log(
          "🔌 WS CLOSED"
        );

        ws.close();
      }
    };

  }, []);

  
  // ESC FULLSCREEN EXIT
  
  useEffect(() => {

    const handleEsc = (e) => {

      if (
        e.key === "Escape"
      ) {

        setIsFullscreen(false);

        setFullscreen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEsc
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleEsc
      );

  }, [setFullscreen]);

  
  // TOGGLE FULLSCREEN
  
  const toggleFullscreen = () => {

    const next =
      !isFullscreen;

    setIsFullscreen(next);

    setFullscreen(next);
  };

  
  // LABEL LOOKUP
  
  const getLabel = (key) =>

    dataOptions.find(
      (d) => d.key === key
    )?.label || key;

  
  // LOGOUT
  
  const handleLogout = () => {

    localStorage.clear();

    window.location.href = "/";
  };

  
  // LOADING TEMPLATE
  
  if (!template) {

    return (

      <div className="
        flex items-center
        justify-center
        h-full
      ">

        <div className="
          text-center
        ">

          <div className="
            animate-spin
            rounded-full
            h-12 w-12
            border-b-2
            border-blue-500
            mx-auto mb-4
          "></div>

          <p className="
            text-gray-400
          ">
            Loading default dashboard...
          </p>

        </div>

      </div>
    );
  }

  
  // UI
  
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
            p-6
          `

          : `
            h-full
            flex flex-col
          `
      }
    >

      {/* HEADER */}
      <div className="
        flex justify-between
        items-center
        mb-6
      ">

        <div>

          <h1 className="
            text-2xl font-bold
            dark:text-white
          ">
            KANBAN Dashboard
          </h1>

          <p className="
            text-sm text-gray-500
            dark:text-gray-400 mt-1
          ">
            Real-time Industrial Monitoring
          </p>

        </div>

        {/* ACTIONS */}
        <div className="
          flex gap-2
        ">

          {/* LIVE */}
          <button
            className="
              px-4 py-2
              bg-green-600
              text-white
              rounded-xl
              shadow
            "
          >
            ● Live
          </button>

          {/* FULLSCREEN */}
          <button
            onClick={
              toggleFullscreen
            }

            className="
              px-4 py-2
              bg-black
              text-white
              rounded-xl
              shadow
            "
          >

            {isFullscreen

              ? "Exit Fullscreen"

              : "Fullscreen"}

          </button>

          {/* LOGOUT */}
          <button
            onClick={
              handleLogout
            }

            className="
              px-4 py-2
              bg-red-500
              text-white
              rounded-xl
              shadow
            "
          >
            Logout
          </button>

        </div>

      </div>

      {/* GRID */}
      <div
        className="
          grid gap-4
          flex-1 h-full
        "

        style={{

          gridTemplateColumns:
            `repeat(${
              template.layout?.cols || 1
            }, 1fr)`,

          gridTemplateRows:

            isFullscreen

              ? `repeat(${
                  template.layout?.rows || 1
                }, 1fr)`

              : `repeat(${
                  template.layout?.rows || 1
                }, minmax(180px, 1fr))`,

          gridAutoFlow:
            "dense",
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

              gridColumn:
                `${item.x + 1}
                 / span ${item.w}`,

              gridRow:
                `${item.y + 1}
                 / span ${item.h}`,
            }}
          >

            {/* HEADER */}
            <div className="
              px-4 py-3
              border-b
              bg-gray-50
              dark:bg-gray-700
              border-gray-200
              dark:border-gray-600
            ">

              <span className="
                text-sm font-semibold
                text-gray-800
                dark:text-white
              ">

                {getLabel(
                  item.dataKey
                )}

              </span>

            </div>

            {/* BODY */}
            <div className="
              flex-1
              flex items-center
              justify-center
              p-3
            ">

              <WidgetRenderer

                type={item.type}

                value={
                  data[item.dataKey]
                }

                data={data}

                history={history}

                dataKey={
                  item.dataKey
                }

                item={item}

                updateItem={(updated) => {

                  setItems((prev) =>

                    prev.map((it) =>

                      it.id ===
                      updated.id

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
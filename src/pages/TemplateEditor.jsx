import { useState, useEffect } from "react";
import { widgetLibrary } from "../data/widgetLibrary";
import { dataOptions } from "../data/dataOptions";

import {
  Save,
  LayoutGrid,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

const sizeOptions = [
  { label: "1×1", w: 1, h: 1 },
  { label: "2×1", w: 2, h: 1 },
  { label: "1×2", w: 1, h: 2 },
  { label: "2×2", w: 2, h: 2 },
  { label: "3×1", w: 3, h: 1 },
];

export default function TemplateEditor({
  setPage,
  selectedTemplate,
}) {

  
  // GRID SIZE
  
  const [rows] = useState(3);
  const [cols] = useState(4);

  
  // STATES
  
  const [items, setItems] =
    useState([]);

  const [templateName, setTemplateName] =
    useState("");

  const [activeCell, setActiveCell] =
    useState(null);

  const [activeItemId, setActiveItemId] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [newType, setNewType] =
    useState(widgetLibrary[0].type);

  const [newDataKey, setNewDataKey] =
    useState("");

  const [newW, setNewW] =
    useState(1);

  const [newH, setNewH] =
    useState(1);

  
  // LOAD TEMPLATE
  
  useEffect(() => {

    if (!selectedTemplate) return;

    try {

      const layout =
        typeof selectedTemplate.layout ===
        "string"

          ? JSON.parse(
              selectedTemplate.layout
            )

          : selectedTemplate.layout;

      console.log(
        "📦 EDIT TEMPLATE:",
        layout
      );

      setItems(layout?.items || []);

      setTemplateName(
        selectedTemplate.name || ""
      );

    } catch (err) {

      console.error(
        "❌ LOAD ERROR:",
        err
      );
    }

  }, [selectedTemplate]);

  
  // LOAD DEFAULT DATAKEY
  
  useEffect(() => {

    const widget =
      widgetLibrary.find(
        w => w.type === newType
      );

    setNewDataKey(
      widget?.supportedData?.[0] || ""
    );

  }, [newType]);

  
  // CURRENT ITEM
  
  const selectedItem =
    items.find(
      i => i.id === activeItemId
    );

  const isEdit = !!selectedItem;

  
  // LOAD ITEM SETTINGS
  
  useEffect(() => {

    if (!selectedItem) return;

    setNewType(selectedItem.type);

    setNewDataKey(
      selectedItem.dataKey
    );

    setNewW(selectedItem.w);

    setNewH(selectedItem.h);

  }, [activeItemId]);

  
  // CHECK OCCUPIED
  
  const isCellOccupied = (
    row,
    col
  ) =>

    items.some(item =>
      col >= item.x &&
      col < item.x + item.w &&
      row >= item.y &&
      row < item.y + item.h
    );

  
  // ADD / EDIT
  
  const addWidget = () => {

    
    // EDIT EXISTING
    
    if (isEdit) {

      const updated = items.map(
        item =>

          item.id === selectedItem.id

            ? {
                ...item,
                type: newType,
                dataKey: newDataKey,
                w: newW,
                h: newH,
              }

            : item
      );

      setItems(updated);

      setShowModal(false);

      return;
    }

    
    // ADD NEW
    
    if (!activeCell) return;

    const newItem = {

      id: Date.now(),

      type: newType,

      dataKey: newDataKey,

      x: activeCell.col,

      y: activeCell.row,

      w: newW,

      h: newH,

      pins:
        newType === "image"
          ? []
          : undefined,
    };

    if (
      newItem.x + newItem.w > cols ||
      newItem.y + newItem.h > rows
    ) {

      alert(
        "❌ Widget exceeds grid"
      );

      return;
    }

    const updated = [
      ...items,
      newItem,
    ];

    setItems(updated);

    setShowModal(false);
  };

  
  // REMOVE WIDGET
  
  const removeWidget = (id) => {

    const updated =
      items.filter(i => i.id !== id);

    setItems(updated);

    setShowModal(false);
  };

  
  // UPDATE TEMPLATE
  
  const updateTemplate = async () => {

    const token =
      localStorage.getItem("token");

    try {

      const res = await fetch(
        `http://localhost:5000/templates/${selectedTemplate.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: token,
          },

          body: JSON.stringify({

            name:
              templateName ||
              `Template ${Date.now()}`,

            layout: {
              rows,
              cols,
              items,
            },
          }),
        }
      );

      const text =
        await res.text();

      console.log(
        "✅ UPDATE RESPONSE:",
        text
      );

      if (!res.ok)
        throw new Error(text);

      alert(
        "✅ Template Updated"
      );

      setPage("templates");

    } catch (err) {

      console.error(
        "❌ UPDATE ERROR:",
        err
      );

      alert(
        "❌ Failed to update"
      );
    }
  };

  
  // BASE
  
  const base = isEdit

    ? selectedItem

    : activeCell

    ? {
        type: newType,
        dataKey: newDataKey,
        w: newW,
        h: newH,
      }

    : null;

  const currentWidget =
    widgetLibrary.find(
      w => w.type === base?.type
    );

  
  // NO TEMPLATE
  
  if (!selectedTemplate) {

    return (

      <div className="
        h-full flex items-center justify-center
        text-gray-400 text-xl
      ">

        No template selected

      </div>
    );
  }

  
  // UI
  
  return (

    <div className="
      relative h-full overflow-auto
      bg-gray-100 dark:bg-gray-900
      p-6
    ">

      {/* GRID BG */}
      <div className="
        absolute inset-0
        bg-[linear-gradient(to_right,#d1d5db_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db_1px,transparent_1px)]
        bg-[size:40px_40px]
        opacity-10
        pointer-events-none
      " />

      {/* HEADER */}
      <div className="
        sticky top-0 z-20
        bg-white/80 dark:bg-gray-900/80
        backdrop-blur-xl
        rounded-3xl
        border border-gray-200 dark:border-gray-700
        p-6 mb-6
        shadow-lg
      ">

        <div className="
          flex justify-between items-center
        ">

          <div>

            <h1 className="
              text-3xl font-bold
              dark:text-white
              flex items-center gap-3
            ">
              <LayoutGrid className="
                w-8 h-8 text-yellow-500
              " />

              Template Editor
            </h1>

            <p className="
              text-gray-500 dark:text-gray-400 mt-1
            ">
              Edit dashboard layouts
            </p>

          </div>

          <button
            onClick={updateTemplate}
            className="
              flex items-center gap-2
              bg-yellow-500 hover:bg-yellow-600
              text-white
              px-5 py-3
              rounded-2xl
              shadow-lg
              transition-all duration-200
            "
          >
            <Save size={18} />
            Update Template
          </button>

        </div>

        {/* NAME */}
        <div className="mt-5">

          <input
            type="text"
            value={templateName}
            onChange={(e) =>
              setTemplateName(e.target.value)
            }
            className="
              w-full rounded-2xl
              border border-gray-300
              dark:border-gray-700
              bg-white dark:bg-gray-800
              dark:text-white
              px-4 py-3
              outline-none
            "
          />

        </div>

      </div>

      {/* GRID */}
      <div
        className="
          grid gap-3 relative z-10
        "
        style={{
          gridTemplateColumns:
            `repeat(${cols}, 1fr)`,

          gridTemplateRows:
            `repeat(${rows}, minmax(180px, 1fr))`,
        }}
      >

        {/* EMPTY */}
        {Array.from({
          length: rows * cols
        }).map((_, i) => {

          const r =
            Math.floor(i / cols);

          const c =
            i % cols;

          if (
            isCellOccupied(r, c)
          ) return null;

          return (

            <div
              key={i}

              onClick={() => {

                setActiveCell({
                  row: r,
                  col: c,
                });

                setActiveItemId(null);

                setShowModal(true);

              }}

              className="
                rounded-3xl
                border-2 border-dashed
                border-gray-300 dark:border-gray-700
                bg-white/40 dark:bg-gray-800/30
                flex items-center justify-center
                cursor-pointer
              "
            >

              <div className="text-center">

                <Plus className="
                  mx-auto mb-2 text-gray-400
                " />

                <p className="
                  text-sm text-gray-400
                ">
                  Add Widget
                </p>

              </div>

            </div>
          );
        })}

        {/* WIDGETS */}
        {items.map(item => {

          const widgetInfo =
            widgetLibrary.find(
              w => w.type === item.type
            );

          const Icon =
            widgetInfo?.icon;

          return (

            <div
              key={item.id}

              onClick={(e) => {

                e.stopPropagation();

                setActiveItemId(
                  item.id
                );

                setActiveCell(null);

                setShowModal(true);

              }}

              className="
                group
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-3xl
                shadow-lg
                hover:shadow-2xl
                transition-all duration-300
                overflow-hidden
                p-4
              "

              style={{
                gridColumn:
                  `${item.x + 1} / span ${item.w}`,

                gridRow:
                  `${item.y + 1} / span ${item.h}`,
              }}
            >

              <div className="
                flex flex-col h-full
              ">

                <div className="mb-3">

                  <div className="
                    w-12 h-12
                    rounded-2xl
                    bg-yellow-100 dark:bg-yellow-900/30
                    flex items-center justify-center
                  ">

                    {Icon && (
                      <Icon className="
                        w-6 h-6 text-yellow-500
                      " />
                    )}

                  </div>

                </div>

                <div className="flex-1">

                  <h3 className="
                    font-bold text-lg
                    dark:text-white capitalize
                  ">
                    {item.type}
                  </h3>

                  <p className="
                    text-sm text-blue-500 mt-1
                  ">
                    {item.dataKey}
                  </p>

                </div>

                <div className="
                  flex justify-between items-center mt-4
                ">

                  <div className="
                    text-xs text-gray-400
                  ">
                    {item.w}×{item.h}
                  </div>

                  <Pencil className="
                    w-4 h-4 text-gray-400
                  " />

                </div>

              </div>

            </div>
          );
        })}

      </div>

      {/* MODAL */}
      {showModal && base && (

        <div
          className="
            fixed inset-0
            bg-black/50
            backdrop-blur-sm
            flex items-center justify-center
            z-50
          "

          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="
              bg-white dark:bg-gray-900
              w-[1100px]
              max-w-[96vw]
              rounded-3xl
              shadow-2xl
              overflow-hidden
              border border-gray-200 dark:border-gray-700
            "

            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}
            <div className="
              flex justify-between items-center
              border-b border-gray-200 dark:border-gray-700
              px-8 py-6
            ">

              <div>

                <h2 className="text-2xl font-bold dark:text-white">
                  Widget Settings
                </h2>

                <p className="text-gray-500 mt-1">
                  Configure widget appearance
                </p>

              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="
                  w-10 h-10
                  rounded-xl
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  flex items-center justify-center
                "
              >
                <X />
              </button>

            </div>

            {/* BODY */}
            <div className="
              grid grid-cols-2
              min-h-[650px]
            ">

              {/* LEFT */}
              <div className="
                bg-gray-100 dark:bg-gray-800
                p-10
                border-r border-gray-200 dark:border-gray-700
              ">

                <div className="
                  h-full
                  rounded-3xl
                  border border-dashed border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-900
                  flex items-center justify-center
                ">

                  <div className="text-center">

                    <div className="text-6xl mb-4">
                      📊
                    </div>

                    <h3 className="text-xl font-bold dark:text-white capitalize">
                      {newType}
                    </h3>

                    <p className="text-blue-500 mt-2">
                      {newDataKey}
                    </p>

                    <div className="mt-4 text-sm text-gray-400">
                      Size: {newW}×{newH}
                    </div>

                  </div>

                </div>

              </div>

              {/* RIGHT */}
              <div className="p-8 overflow-auto">

                {/* TYPE */}
                <div className="mb-10">

                  <h3 className="font-bold mb-4 dark:text-white">
                    Widget Type
                  </h3>

                  <div className="grid grid-cols-3 gap-4">

                    {widgetLibrary.map(w => {

                      const Icon = w.icon;

                      return (

                        <button
                          key={w.type}

                          onClick={() =>
                            setNewType(w.type)
                          }

                          className={`
                            p-5 rounded-2xl border transition-all

                            ${
                              newType === w.type

                                ? "bg-blue-600 text-white border-blue-600 scale-105 shadow-xl"

                                : "hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                            }
                          `}
                        >

                          <Icon className="mx-auto mb-2 w-6 h-6" />

                          <div className="text-sm">
                            {w.label}
                          </div>

                        </button>
                      );
                    })}

                  </div>

                </div>

                {/* DATA */}
                {currentWidget?.supportedData
                  ?.length > 0 &&

                  newType !== "image" && (

                  <div className="mb-10">

                    <h3 className="font-bold mb-4 dark:text-white">
                      Data Source
                    </h3>

                    <div className="flex flex-wrap gap-3">

                      {dataOptions

                        .filter(d =>
                          currentWidget.supportedData.includes(
                            d.key
                          )
                        )

                        .map(d => (

                          <button
                            key={d.key}

                            onClick={() =>
                              setNewDataKey(d.key)
                            }

                            className={`
                              px-4 py-2 rounded-full text-sm transition-all

                              ${
                                newDataKey === d.key

                                  ? "bg-green-600 text-white"

                                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white"
                              }
                            `}
                          >

                            {d.label}

                          </button>
                        ))}

                    </div>

                  </div>
                )}

                {/* SIZE */}
                <div className="mb-10">

                  <h3 className="font-bold mb-4 dark:text-white">
                    Widget Size
                  </h3>

                  <div className="grid grid-cols-3 gap-3">

                    {sizeOptions.map((s, i) => (

                      <button
                        key={i}

                        onClick={() => {

                          setNewW(s.w);

                          setNewH(s.h);

                        }}

                        className={`
                          py-4 rounded-2xl border transition-all

                          ${
                            newW === s.w &&
                            newH === s.h

                              ? "bg-blue-600 text-white"

                              : "hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white"
                          }
                        `}
                      >

                        {s.label}

                      </button>
                    ))}

                  </div>

                </div>

                {/* ACTIONS */}
                <div className="space-y-4">

                  <button
                    onClick={addWidget}
                    className="
                      w-full
                      bg-blue-600 hover:bg-blue-700
                      text-white
                      py-4
                      rounded-2xl
                      font-semibold
                    "
                  >
                    Add Widget
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
import { useState, useEffect } from "react";
import { widgetLibrary } from "../data/widgetLibrary";
import { dataOptions } from "../data/dataOptions";
import WidgetRenderer from "../components/WidgetRenderer";

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

// SAMPLE DATA FOR EDITOR PREVIEW
const previewData = {
  steamPressure: 31.2,
  steamFlowrate: 44.1,
  steamOutletTemp: 0,
  inletDraft: -36.6,
  outletDraft: 999.9,
  furnaceDraft: -4.3,
  waterInletTemp: 102,
  waterFlowrate: 33,
  waterDrumLevel: 51,
  vgPressure: 999.9,
  vgInletTemp: 0,
  vgOutletTemp: 0,
};

// SAMPLE HISTORY FOR LINE / AREA CHART PREVIEW
const previewHistory = Array.from({ length: 20 }, (_, i) => ({
  timestamp: Date.now() - (20 - i) * 2000,
  time: new Date(Date.now() - (20 - i) * 2000).toLocaleTimeString(),
  date: new Date().toLocaleDateString(),

  steamPressure: 28 + Math.random() * 6,
  steamFlowrate: 40 + Math.random() * 8,
  steamOutletTemp: Math.random() * 5,
  inletDraft: -38 + Math.random() * 4,
  outletDraft: 960 + Math.random() * 40,
  furnaceDraft: -6 + Math.random() * 4,
  waterInletTemp: 98 + Math.random() * 8,
  waterFlowrate: 30 + Math.random() * 6,
  waterDrumLevel: 48 + Math.random() * 6,
  vgPressure: 960 + Math.random() * 40,
  vgInletTemp: Math.random() * 5,
  vgOutletTemp: Math.random() * 5,
}));

export default function TemplateEditor({
  setPage,
  selectedTemplate,
  editingImageWidget,
  setEditingImageWidget,
}) {
  // GRID SIZE
  const [rows] = useState(3);
  const [cols] = useState(4);

  // STATES
  const [items, setItems] = useState([]);
  const [templateName, setTemplateName] = useState("");

  const [activeCell, setActiveCell] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [newType, setNewType] = useState(widgetLibrary[0].type);
  const [newDataKey, setNewDataKey] = useState("");
  const [newDataKeys, setNewDataKeys] = useState([]);

  const [newOrientation, setNewOrientation] = useState("vertical");

  const [newW, setNewW] = useState(1);
  const [newH, setNewH] = useState(1);

  // CURRENT ITEM
  const selectedItem = items.find((i) => i.id === activeItemId);
  const isEdit = !!selectedItem;

  // MULTI-DATA WIDGETS
  const isMultiDataWidget =
    newType === "line" ||
    newType === "area" ||
    newType === "bar";

  // LOAD TEMPLATE
  useEffect(() => {
    if (!selectedTemplate) return;

    try {
      const layout =
        typeof selectedTemplate.layout === "string"
          ? JSON.parse(selectedTemplate.layout)
          : selectedTemplate.layout;

      console.log("📦 EDIT TEMPLATE:", layout);

      setItems(layout?.items || []);
      setTemplateName(selectedTemplate.name || "");
    } catch (err) {
      console.error("❌ LOAD ERROR:", err);
    }
  }, [selectedTemplate]);

  // LOAD DEFAULT DATAKEY WHEN TYPE CHANGES
  useEffect(() => {
    const widget = widgetLibrary.find((w) => w.type === newType);
    const firstKey = widget?.supportedData?.[0] || "";

    if (
      newType === "line" ||
      newType === "area" ||
      newType === "bar"
    ) {
      setNewDataKey(firstKey);
      setNewDataKeys(firstKey ? [firstKey] : []);
    } else {
      setNewDataKey(firstKey);
      setNewDataKeys([]);
    }

    if (newType !== "bar") {
      setNewOrientation("vertical");
    }
  }, [newType]);

  // SYNC IMAGE EDITOR BACK INTO EDITOR
  useEffect(() => {
    if (!editingImageWidget) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === editingImageWidget.id ? editingImageWidget : it
      )
    );
  }, [editingImageWidget]);

  // LOAD ITEM SETTINGS
  useEffect(() => {
    if (!selectedItem) return;

    setNewType(selectedItem.type);
    setNewDataKey(selectedItem.dataKey || "");

    setNewDataKeys(
      selectedItem.type === "line" ||
        selectedItem.type === "area" ||
        selectedItem.type === "bar"
        ? selectedItem.dataKeys?.length
          ? selectedItem.dataKeys
          : selectedItem.dataKey
          ? [selectedItem.dataKey]
          : []
        : []
    );

    setNewOrientation(selectedItem.orientation || "vertical");

    setNewW(selectedItem.w);
    setNewH(selectedItem.h);
  }, [activeItemId, selectedItem]);

  // CHECK OCCUPIED
  const isCellOccupied = (row, col) =>
    items.some(
      (item) =>
        col >= item.x &&
        col < item.x + item.w &&
        row >= item.y &&
        row < item.y + item.h
    );

  // CHECK COLLISION
  const hasCollision = (newItem) => {
    for (let r = newItem.y; r < newItem.y + newItem.h; r++) {
      for (let c = newItem.x; c < newItem.x + newItem.w; c++) {
        if (isCellOccupied(r, c)) {
          return true;
        }
      }
    }

    return false;
  };

  // TOGGLE MULTIPLE DATA FOR LINE / AREA / BAR CHART
  const toggleMultiDataKey = (key) => {
    setNewDataKeys((prev) => {
      if (prev.includes(key)) {
        const updated = prev.filter((k) => k !== key);

        setNewDataKey(updated[0] || "");

        return updated;
      }

      const updated = [...prev, key];

      setNewDataKey(updated[0] || key);

      return updated;
    });
  };

  // ADD WIDGET
  const addWidget = () => {
    if (!activeCell) return;

    if (isMultiDataWidget && newDataKeys.length === 0) {
      alert("❌ Please select at least one data source");
      return;
    }

    const newItem = {
      id: Date.now(),

      type: newType,

      dataKey: isMultiDataWidget
        ? newDataKeys[0] || newDataKey
        : newDataKey,

      dataKeys: isMultiDataWidget ? newDataKeys : undefined,

      orientation:
        newType === "bar"
          ? newOrientation
          : undefined,

      x: activeCell.col,
      y: activeCell.row,

      w: newW,
      h: newH,

      pins: newType === "image" ? editingImageWidget?.pins || [] : undefined,
    };

    if (newItem.x + newItem.w > cols || newItem.y + newItem.h > rows) {
      alert("❌ Widget exceeds grid");
      return;
    }

    if (hasCollision(newItem)) {
      alert("❌ Space occupied");
      return;
    }

    setItems((prev) => [...prev, newItem]);

    setShowModal(false);
    setActiveCell(null);
  };

  // UPDATE WIDGET
  const updateWidget = () => {
    if (!selectedItem) return;

    if (isMultiDataWidget && newDataKeys.length === 0) {
      alert("❌ Please select at least one data source");
      return;
    }

    const updatedItems = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,

            type: newType,

            dataKey: isMultiDataWidget
              ? newDataKeys[0] || newDataKey
              : newDataKey,

            dataKeys: isMultiDataWidget ? newDataKeys : undefined,

            orientation:
              newType === "bar"
                ? newOrientation
                : undefined,

            w: newW,
            h: newH,

            pins: selectedItem.pins || [],
          }
        : item
    );

    setItems(updatedItems);

    setShowModal(false);
    setActiveItemId(null);
  };

  // REMOVE WIDGET
  const removeWidget = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));

    setShowModal(false);
    setActiveItemId(null);
  };

  // UPDATE TEMPLATE
  const updateTemplate = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:5000/templates/${selectedTemplate.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            name: templateName || `Template ${Date.now()}`,

            layout: {
              rows,
              cols,
              items,
            },
          }),
        }
      );

      const text = await res.text();

      console.log("✅ UPDATE RESPONSE:", text);

      if (!res.ok) throw new Error(text);

      alert("✅ Template Updated");

      setPage("templates");
    } catch (err) {
      console.error("❌ UPDATE ERROR:", err);

      alert("❌ Failed to update");
    }
  };

  // BASE
  const base = isEdit
    ? selectedItem
    : activeCell
    ? {
        type: newType,

        dataKey: isMultiDataWidget
          ? newDataKeys[0] || newDataKey
          : newDataKey,

        dataKeys: isMultiDataWidget ? newDataKeys : undefined,

        orientation:
          newType === "bar"
            ? newOrientation
            : undefined,

        w: newW,
        h: newH,
      }
    : null;

  const currentWidget = widgetLibrary.find((w) => w.type === base?.type);

  if (!selectedTemplate) {
    return (
      <div
        className="
          h-full flex items-center justify-center
          text-gray-400 text-xl
        "
      >
        No template selected
      </div>
    );
  }

  return (
    <div
      className="
        relative h-full overflow-auto
        bg-gray-100 dark:bg-gray-900
        p-6
      "
    >
      {/* GRID BG */}
      <div
        className="
          absolute inset-0
          bg-[linear-gradient(to_right,#d1d5db_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db_1px,transparent_1px)]
          bg-[size:40px_40px]
          opacity-10
          pointer-events-none
        "
      />

      {/* HEADER */}
      <div
        className="
          sticky top-0 z-20
          bg-white/80 dark:bg-gray-900/80
          backdrop-blur-xl
          rounded-3xl
          border border-gray-200 dark:border-gray-700
          p-6 mb-6
          shadow-lg
        "
      >
        <div className="flex justify-between items-center">
          <div>
            <h1
              className="
                text-3xl font-bold
                dark:text-white
                flex items-center gap-3
              "
            >
              <LayoutGrid className="w-8 h-8 text-yellow-500" />
              Template Editor
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mt-1">
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
            onChange={(e) => setTemplateName(e.target.value)}
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
        className="grid gap-3 relative z-10"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, minmax(180px, 1fr))`,
          minHeight: "75vh",
        }}
      >
        {/* EMPTY */}
        {Array.from({
          length: rows * cols,
        }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;

          if (isCellOccupied(r, c)) return null;

          return (
            <div
              key={i}
              onClick={() => {
                setActiveCell({
                  row: r,
                  col: c,
                });

                setActiveItemId(null);

                setNewType(widgetLibrary[0].type);
                setNewW(1);
                setNewH(1);

                setShowModal(true);
              }}
              className="
                rounded-3xl
                border-2 border-dashed
                border-gray-300 dark:border-gray-700
                bg-white/40 dark:bg-gray-800/30
                flex items-center justify-center
                cursor-pointer
                hover:border-yellow-500
                hover:bg-yellow-50 dark:hover:bg-yellow-900/20
                transition-all
              "
            >
              <div className="text-center">
                <Plus className="mx-auto mb-2 text-gray-400" />

                <p className="text-sm text-gray-400">Add Widget</p>
              </div>
            </div>
          );
        })}

        {/* WIDGETS */}
        {items.map((item) => (
          <div
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();

              setActiveItemId(item.id);
              setActiveCell(null);
              setShowModal(true);
            }}
            className="
              group
              relative
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-3xl
              shadow-lg
              hover:shadow-2xl
              transition-all duration-300
              overflow-hidden
              p-4
              cursor-pointer
            "
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
          >
            {/* ACTUAL WIDGET PREVIEW */}
            <div className="absolute inset-0 p-4 pointer-events-none">
              <WidgetRenderer
                type={item.type}
                value={previewData[item.dataKey]}
                data={previewData}
                history={previewHistory}
                dataKey={item.dataKey}
                item={item}
                updateItem={() => {}}
                editMode={false}
              />
            </div>

            {/* EDIT ICON */}
            <div
              className="
                absolute bottom-3 right-3
                w-8 h-8
                rounded-full
                bg-white/90 dark:bg-gray-900/90
                border border-gray-200 dark:border-gray-700
                shadow
                flex items-center justify-center
                opacity-70 group-hover:opacity-100
              "
            >
              <Pencil className="w-4 h-4 text-gray-500 group-hover:text-yellow-500" />
            </div>

            {/* SIZE BADGE */}
            <div
              className="
                absolute bottom-3 left-3
                text-xs
                text-gray-400
                bg-white/80 dark:bg-gray-900/80
                px-2 py-1
                rounded-lg
              "
            >
              {item.w}×{item.h}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && base && (
        <div
          className="
            fixed inset-0
            bg-black/60
            backdrop-blur-sm
            flex items-center justify-center
            z-50
            p-6
          "
          onClick={() => setShowModal(false)}
        >
          <div
            className="
              bg-white dark:bg-gray-900
              w-[1450px]
              max-w-[96vw]
              max-h-[92vh]
              rounded-3xl
              shadow-2xl
              overflow-hidden
              border border-gray-200 dark:border-gray-700
              flex flex-col
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div
              className="
                flex justify-between items-center
                border-b border-gray-200 dark:border-gray-700
                px-8 py-6
                bg-white dark:bg-gray-900
              "
            >
              <div>
                <h2 className="text-2xl font-bold dark:text-white">
                  {isEdit ? "Edit Widget" : "Widget Settings"}
                </h2>

                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Configure widget type, data source, size and appearance
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="
                  w-10 h-10
                  rounded-xl
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  flex items-center justify-center
                  dark:text-white
                "
              >
                <X />
              </button>
            </div>

            {/* BODY */}
            <div className="grid grid-cols-[1fr_520px] flex-1 overflow-hidden">
              {/* LEFT PREVIEW */}
              <div
                className="
                  bg-gray-100 dark:bg-gray-950
                  p-8
                  border-r border-gray-200 dark:border-gray-700
                  overflow-hidden
                "
              >
                <div
                  className="
                    h-full
                    rounded-3xl
                    border border-dashed
                    border-gray-300 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    overflow-hidden
                    p-6
                    pointer-events-none
                    flex flex-col
                  "
                >
                  {/* PREVIEW HEADER */}
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400">
                      Live Preview
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <h3 className="text-sm font-semibold dark:text-white capitalize">
                        {newType}
                      </h3>

                      {isMultiDataWidget && newDataKeys.length > 0 ? (
                        <span
                          className="
                            text-xs
                            text-yellow-600
                            bg-yellow-50 dark:bg-yellow-900/30
                            px-2 py-1
                            rounded-lg
                          "
                        >
                          {newDataKeys.length} selected
                        </span>
                      ) : (
                        newDataKey && (
                          <span
                            className="
                              text-xs
                              text-yellow-600
                              bg-yellow-50 dark:bg-yellow-900/30
                              px-2 py-1
                              rounded-lg
                            "
                          >
                            {newDataKey}
                          </span>
                        )
                      )}

                      {newType === "bar" && (
                        <span
                          className="
                            text-xs
                            text-purple-500
                            bg-purple-50 dark:bg-purple-900/30
                            px-2 py-1
                            rounded-lg
                          "
                        >
                          {newOrientation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW BODY */}
                  <div
                    className="
                      flex-1
                      flex items-center justify-center
                      rounded-2xl
                      bg-gray-50 dark:bg-gray-950
                      overflow-hidden
                    "
                  >
                    <WidgetRenderer
                      type={newType}
                      value={previewData[newDataKey]}
                      data={previewData}
                      history={previewHistory}
                      dataKey={
                        isMultiDataWidget
                          ? newDataKeys[0] || newDataKey
                          : newDataKey
                      }
                      item={{
                        id: selectedItem?.id || 999,
                        type: newType,

                        dataKey: isMultiDataWidget
                          ? newDataKeys[0] || newDataKey
                          : newDataKey,

                        dataKeys: isMultiDataWidget
                          ? newDataKeys
                          : undefined,

                        orientation:
                          newType === "bar"
                            ? newOrientation
                            : undefined,

                        w: newW,
                        h: newH,

                        pins: selectedItem?.pins || base?.pins || [],
                      }}
                      updateItem={() => {}}
                      editMode={false}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT SETTINGS */}
              <div
                className="
                  p-8
                  overflow-y-auto
                  bg-white dark:bg-gray-900
                "
              >
                {/* WIDGET TYPE CARD */}
                <div
                  className="
                    bg-gray-50 dark:bg-gray-800/70
                    border border-gray-200 dark:border-gray-700
                    rounded-3xl
                    p-5
                    mb-6
                  "
                >
                  <h3 className="font-bold mb-4 dark:text-white">
                    Widget Type
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    {widgetLibrary.map((w) => {
                      const TypeIcon = w.icon;

                      return (
                        <button
                          key={w.type}
                          onClick={() => setNewType(w.type)}
                          className={`
                            p-5 rounded-2xl border transition-all text-center

                            ${
                              newType === w.type
                                ? "bg-yellow-500 text-white border-yellow-500 scale-105 shadow-xl"
                                : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                            }
                          `}
                        >
                          <TypeIcon className="mx-auto mb-2 w-6 h-6" />

                          <div className="text-sm font-semibold">
                            {w.label}
                          </div>

                          <div
                            className={`
                              text-[11px] mt-1
                              ${
                                newType === w.type
                                  ? "text-yellow-100"
                                  : "text-gray-400"
                              }
                            `}
                          >
                            {w.type === "gauge" && "Semi-circle meter"}
                            {w.type === "linearGauge" && "Progress meter"}
                            {w.type === "line" && "Trend over time"}
                            {w.type === "area" && "Filled trend chart"}
                            {w.type === "image" && "Mimic diagram"}
                            {w.type === "bar" && "Bar comparison"}
                            {w.type === "bignumber" && "KPI number"}
                            {w.type === "alarm" && "Status warning"}
                            {w.type === "pie" && "Ratio chart"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DATA SOURCE CARD */}
                {currentWidget?.supportedData?.length > 0 &&
                  newType !== "image" && (
                    <div
                      className="
                        bg-gray-50 dark:bg-gray-800/70
                        border border-gray-200 dark:border-gray-700
                        rounded-3xl
                        p-5
                        mb-6
                      "
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold dark:text-white">
                          Data Source
                        </h3>

                        {isMultiDataWidget && (
                          <span className="text-xs text-gray-400">
                            Select multiple
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {dataOptions
                          .filter((d) =>
                            currentWidget.supportedData.includes(d.key)
                          )
                          .map((d) => {
                            const selected = isMultiDataWidget
                              ? newDataKeys.includes(d.key)
                              : newDataKey === d.key;

                            return (
                              <button
                                key={d.key}
                                onClick={() => {
                                  if (isMultiDataWidget) {
                                    toggleMultiDataKey(d.key);
                                  } else {
                                    setNewDataKey(d.key);
                                  }
                                }}
                                className={`
                                  px-4 py-2 rounded-xl text-xs font-medium transition-all
                                  border

                                  ${
                                    selected
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow"
                                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:text-white"
                                  }
                                `}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                      </div>

                      {isMultiDataWidget && (
                        <p className="text-xs text-gray-400 mt-3">
                          Selected:{" "}
                          {newDataKeys.length
                            ? newDataKeys.join(", ")
                            : "None"}
                        </p>
                      )}
                    </div>
                  )}

                {/* BAR ORIENTATION CARD */}
                {newType === "bar" && (
                  <div
                    className="
                      bg-gray-50 dark:bg-gray-800/70
                      border border-gray-200 dark:border-gray-700
                      rounded-3xl
                      p-5
                      mb-6
                    "
                  >
                    <h3 className="font-bold mb-4 dark:text-white">
                      Bar Direction
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setNewOrientation("vertical")}
                        className={`
                          py-4 rounded-2xl border transition-all font-medium

                          ${
                            newOrientation === "vertical"
                              ? "bg-yellow-500 text-white border-yellow-500 shadow"
                              : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                          }
                        `}
                      >
                        Vertical
                      </button>

                      <button
                        onClick={() => setNewOrientation("horizontal")}
                        className={`
                          py-4 rounded-2xl border transition-all font-medium

                          ${
                            newOrientation === "horizontal"
                              ? "bg-yellow-500 text-white border-yellow-500 shadow"
                              : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                          }
                        `}
                      >
                        Horizontal
                      </button>
                    </div>
                  </div>
                )}

                {/* SIZE CARD */}
                <div
                  className="
                    bg-gray-50 dark:bg-gray-800/70
                    border border-gray-200 dark:border-gray-700
                    rounded-3xl
                    p-5
                    mb-6
                  "
                >
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
                          py-4 rounded-2xl border transition-all font-medium

                          ${
                            newW === s.w && newH === s.h
                              ? "bg-yellow-500 text-white border-yellow-500 shadow"
                              : "bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white"
                          }
                        `}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* IMAGE CONFIG CARD */}
                {newType === "image" && (
                  <div
                    className="
                      bg-purple-50 dark:bg-purple-900/20
                      border border-purple-200 dark:border-purple-800
                      rounded-3xl
                      p-5
                      mb-6
                    "
                  >
                    <h3 className="font-bold mb-2 dark:text-white">
                      Configure Image Widget
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Open the image editor to place pins and connect live data.
                    </p>

                    <button
                      onClick={() => {
                        if (typeof setEditingImageWidget !== "function") {
                          alert(
                            "❌ setEditingImageWidget is not connected in App.jsx"
                          );
                          return;
                        }

                        const target = isEdit
                          ? selectedItem
                          : {
                              id: Date.now(),
                              type: "image",
                              dataKey: newDataKey,
                              x: activeCell?.col || 0,
                              y: activeCell?.row || 0,
                              w: newW,
                              h: newH,
                              pins: editingImageWidget?.pins || [],
                            };

                        setEditingImageWidget({
                          ...target,
                          dataKey: newDataKey,
                        });

                        setShowModal(false);
                        setPage("image-editor");
                      }}
                      className="
                        w-full
                        bg-purple-600
                        hover:bg-purple-700
                        text-white
                        py-4
                        rounded-2xl
                        font-semibold
                        transition-all
                      "
                    >
                      Configure
                    </button>
                  </div>
                )}

                {/* ACTIONS CARD */}
                <div
                  className="
                    bg-gray-50 dark:bg-gray-800/70
                    border border-gray-200 dark:border-gray-700
                    rounded-3xl
                    p-5
                    mt-6
                    space-y-4
                  "
                >
                  <h3 className="font-bold mb-4 dark:text-white">
                    Actions
                  </h3>

                  <button
                    onClick={isEdit ? updateWidget : addWidget}
                    className="
                      w-full
                      bg-yellow-500
                      hover:bg-yellow-600
                      text-white
                      py-4
                      rounded-2xl
                      font-semibold
                      shadow-lg
                      transition-all
                    "
                  >
                    {isEdit ? "Update Widget" : "Add Widget"}
                  </button>

                  {isEdit && (
                    <button
                      onClick={() => removeWidget(selectedItem.id)}
                      className="
                        w-full
                        bg-red-500
                        hover:bg-red-600
                        text-white
                        py-4
                        rounded-2xl
                        font-semibold
                        flex items-center
                        justify-center
                        gap-2
                        transition-all
                      "
                    >
                      <Trash2 size={18} />
                      Delete Widget
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
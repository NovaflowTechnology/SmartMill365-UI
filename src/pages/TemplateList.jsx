import { useEffect, useState } from "react";

import {
  LayoutGrid,
  Pencil,
  Trash2,
  Play,
  Link,
  FolderOpen,
  Building2,
  Search,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Star,
  List,
} from "lucide-react";

export default function TemplateList({
  setPage,
  setSelectedTemplate,
  fetchDefaultTemplate,
  dark = false,
}) {
  // =====================================
  // STATES
  // =====================================
  const [templates, setTemplates] =
    useState([]);

  const [orgs, setOrgs] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [showAssign, setShowAssign] =
    useState(false);

  const [
    selectedTemplateLocal,
    setSelectedTemplateLocal,
  ] = useState(null);

  const [selectedOrg, setSelectedOrg] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [viewMode, setViewMode] =
    useState(() => {
      const savedView =
        localStorage.getItem(
          "template_library_view"
        );

      return savedView === "list"
        ? "list"
        : "grid";
    });

  const [loading, setLoading] =
    useState(true);

  const [
    favoriteTemplateId,
    setFavoriteTemplateId,
  ] = useState(
    localStorage.getItem("favorite_template_id") || ""
  );

  const [
    settingFavoriteId,
    setSettingFavoriteId,
  ] = useState(null);

  // =====================================
  // AUTH
  // =====================================
  const token =
    localStorage.getItem("token");

  const role =
    localStorage.getItem("role");

  const isSuperadmin =
    role === "superadmin";

  const canCreateOrEdit =
    role === "superadmin" ||
    role === "admin";

  const [detectedDark, setDetectedDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const htmlHasDark = document.documentElement.classList.contains("dark");
      const bodyHasDark = document.body.classList.contains("dark");
      const storedTheme = localStorage.getItem("theme");
      const storedDarkMode = localStorage.getItem("darkMode");

      setDetectedDark(
        htmlHasDark ||
          bodyHasDark ||
          storedTheme === "dark" ||
          storedDarkMode === "true"
      );
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("storage", checkDarkMode);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", checkDarkMode);
    };
  }, []);

  const isDark = dark || detectedDark;

  useEffect(() => {
    localStorage.setItem(
      "template_library_view",
      viewMode
    );
  }, [viewMode]);

  // =====================================
  // SAFE JSON PARSER
  // =====================================
  const parseResponse = async (res) => {
    const text = await res.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        "Server did not return JSON. Please check backend route and restart server."
      );
    }

    if (!res.ok) {
      throw new Error(
        data?.error || "Request failed"
      );
    }

    return data;
  };

  // =====================================
  // FETCH TEMPLATES
  // =====================================
  const fetchTemplates = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/templates",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const data = await parseResponse(res);

      console.log("📦 TEMPLATES:", data);

      setTemplates(data || []);
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // =====================================
  // FETCH ORGANIZATIONS
  // =====================================
  const fetchOrganizations = async () => {
    if (!isSuperadmin) return;

    try {
      const res = await fetch(
        "http://localhost:5000/organizations",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const data = await parseResponse(res);

      console.log("🏢 ORGS:", data);

      setOrgs(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // =====================================
  // FETCH TEMPLATE ASSIGNMENTS
  // =====================================
  const fetchAssignments = async () => {
    if (!isSuperadmin) return;

    try {
      const res = await fetch(
        "http://localhost:5000/template-assignments",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const data = await parseResponse(res);

      console.log(
        "🔗 TEMPLATE ASSIGNMENTS:",
        data
      );

      setAssignments(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // =====================================
  // USE TEMPLATE
  // =====================================
  const selectTemplate = (t) => {
    console.log("📊 USING TEMPLATE:", t);

    setSelectedTemplate(t);
    setPage("dashboard");
  };

  // =====================================
  // SET FAVORITE TEMPLATE
  // =====================================
  const setFavoriteTemplate = async (template) => {
    const confirmFavorite =
      window.confirm(
        `Set "${
          template.name || `Template #${template.id}`
        }" as your favourite dashboard template?`
      );

    if (!confirmFavorite) return;

    try {
      setSettingFavoriteId(template.id);

      const res = await fetch(
        "http://localhost:5000/users/favorite-template",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            template_id: template.id,
          }),
        }
      );

      await parseResponse(res);

      localStorage.setItem(
        "favorite_template_id",
        template.id
      );

      setFavoriteTemplateId(String(template.id));

      alert("⭐ Favourite template updated");

      await fetchDefaultTemplate?.();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setSettingFavoriteId(null);
    }
  };

  // =====================================
  // DELETE TEMPLATE
  // =====================================
  const deleteTemplate = async (id) => {
    const confirmDelete =
      window.confirm(
        "Delete this template?"
      );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `http://localhost:5000/templates/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();

        throw new Error(
          text || "Failed to delete template"
        );
      }

      setTemplates((prev) =>
        prev.filter((x) => x.id !== id)
      );

      setAssignments((prev) =>
        prev.filter(
          (a) => a.template_id !== id
        )
      );

      if (
        Number(favoriteTemplateId) ===
        Number(id)
      ) {
        localStorage.removeItem(
          "favorite_template_id"
        );

        setFavoriteTemplateId("");
      }

      console.log("🗑 TEMPLATE DELETED:", id);
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    }
  };

  // =====================================
  // ASSIGN TEMPLATE
  // =====================================
  const handleAssign = async () => {
    if (!selectedOrg) {
      return alert(
        "Please select organization"
      );
    }

    if (!selectedTemplateLocal) {
      return alert("No template selected");
    }

    const alreadyAssigned =
      assignments.some(
        (a) =>
          Number(a.org_id) ===
            Number(selectedOrg) &&
          Number(a.template_id) ===
            Number(selectedTemplateLocal.id)
      );

    if (alreadyAssigned) {
      return alert(
        "⚠️ This template is already assigned to this organization."
      );
    }

    try {
      const res = await fetch(
        "http://localhost:5000/assign-template",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            org_id: selectedOrg,
            template_id:
              selectedTemplateLocal.id,
          }),
        }
      );

      const data = await parseResponse(res);

      console.log("✅ ASSIGN RESULT:", data);

      alert("✅ Template Assigned");

      setShowAssign(false);
      setSelectedOrg("");
      setSelectedTemplateLocal(null);

      fetchAssignments();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    }
  };

  // =====================================
  // REMOVE TEMPLATE ASSIGNMENT
  // =====================================
  const removeAssignment = async (
    orgId,
    templateId
  ) => {
    const confirmRemove =
      window.confirm(
        "Remove this organization assignment?"
      );

    if (!confirmRemove) return;

    try {
      const res = await fetch(
        "http://localhost:5000/template-assignments",
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            org_id: orgId,
            template_id: templateId,
          }),
        }
      );

      await parseResponse(res);

      alert("✅ Assignment removed");

      setAssignments((prev) =>
        prev.filter(
          (a) =>
            !(
              Number(a.org_id) ===
                Number(orgId) &&
              Number(a.template_id) ===
                Number(templateId)
            )
        )
      );
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    }
  };

  // =====================================
  // SUMMARY DATA
  // =====================================
  const assignedTemplateIds = [
    ...new Set(
      assignments.map((a) =>
        Number(a.template_id)
      )
    ),
  ];

  const assignedTemplateCount =
    templates.filter((t) =>
      assignedTemplateIds.includes(
        Number(t.id)
      )
    ).length;

  const unassignedTemplateCount =
    templates.length - assignedTemplateCount;

  const filteredTemplates =
    templates.filter((t) =>
      (t.name || `Template #${t.id}`)
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const favoriteTemplateName =
    templates.find(
      (t) =>
        Number(t.id) ===
        Number(favoriteTemplateId)
    )?.name;

  // =====================================
  // TEMPLATE MINI PREVIEW HELPERS
  // =====================================
  const getPreviewWidgetLabel = (item) => {
    const configuredLabel =
      String(item?.label || "").trim();

    if (configuredLabel) {
      return configuredLabel;
    }

    const labels = {
      bignumber: "Stat",
      gauge: "Gauge",
      linearGauge: "Linear Gauge",
      line: "Line",
      area: "Area",
      bar: "Bar",
      pie: "Pie",
      image: "Image",
      status: "Data Status",
      logs: "Logs",
      sankey: "Sankey",
      composite: "Composite",
    };

    return (
      labels[item?.type] ||
      "Widget"
    );
  };

  const renderPreviewWidgetVisual = (
    item
  ) => {
    switch (item?.type) {
      case "bignumber":
        return (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="text-[13px] font-black leading-none text-slate-800 dark:text-slate-100">
              123.4
            </div>
            <div className="mt-1 h-1 w-8 rounded-full bg-emerald-500/70" />
          </div>
        );

      case "gauge":
        return (
          <div className="relative mx-auto h-8 w-12 overflow-hidden">
            <div className="absolute inset-x-0 top-1 h-10 rounded-full border-[5px] border-emerald-500/70 border-b-transparent" />
            <div className="absolute bottom-0 left-1/2 h-[2px] w-4 origin-left -rotate-[24deg] bg-[#6D254D]" />
          </div>
        );

      case "linearGauge":
        return (
          <div className="flex h-full items-center px-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full w-[72%] rounded-full bg-emerald-500" />
            </div>
          </div>
        );

      case "line":
      case "area":
        return (
          <svg
            viewBox="0 0 100 34"
            className="h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {item?.chartDisplay
              ?.chartStyle === "area" ||
            item?.type === "area" ? (
              <path
                d="M2 27 C16 25 20 10 37 15 C52 20 61 5 76 11 C87 14 91 7 98 8 L98 34 L2 34 Z"
                fill="rgba(124,179,66,0.18)"
              />
            ) : null}
            <path
              d="M2 27 C16 25 20 10 37 15 C52 20 61 5 76 11 C87 14 91 7 98 8"
              fill="none"
              stroke="#7CB342"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case "bar":
        return (
          <div className="flex h-full items-end justify-center gap-1.5 px-2 pb-1">
            {[44, 72, 56, 84].map(
              (height, index) => (
                <span
                  key={index}
                  className="w-2 rounded-t bg-emerald-500/80"
                  style={{
                    height: `${height}%`,
                  }}
                />
              )
            )}
          </div>
        );

      case "pie":
        return (
          <div className="flex h-full items-center justify-center">
            <div
              className="
                h-9 w-9 rounded-full
                border-[7px]
                border-emerald-600
                border-r-[#A4C65A]
                border-b-[#C5D98B]
              "
            />
          </div>
        );

      case "status":
        return (
          <div className="flex h-full items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-300">
              LIVE
            </span>
          </div>
        );

      case "logs":
        return (
          <div className="flex h-full flex-col justify-center gap-1 px-2">
            {[78, 58, 88].map(
              (width, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80" />
                  <span
                    className="h-1 rounded-full bg-slate-300 dark:bg-slate-600"
                    style={{
                      width: `${width}%`,
                    }}
                  />
                </div>
              )
            )}
          </div>
        );

      case "image":
        return (
          <div className="relative flex h-full items-center justify-center overflow-hidden rounded">
            <div className="absolute inset-2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="relative h-2 w-2 rounded-full border-2 border-white bg-emerald-500 shadow" />
          </div>
        );

      case "sankey":
        return (
          <svg
            viewBox="0 0 100 34"
            className="h-full w-full"
            aria-hidden="true"
          >
            <circle
              cx="15"
              cy="17"
              r="4"
              fill="#2E7D32"
            />
            <circle
              cx="84"
              cy="8"
              r="3"
              fill="#7CB342"
            />
            <circle
              cx="84"
              cy="26"
              r="3"
              fill="#A4C65A"
            />
            <path
              d="M19 17 C45 17 55 8 81 8"
              fill="none"
              stroke="#7CB342"
              strokeWidth="4"
              opacity="0.65"
            />
            <path
              d="M19 17 C45 17 55 26 81 26"
              fill="none"
              stroke="#A4C65A"
              strokeWidth="3"
              opacity="0.55"
            />
          </svg>
        );

      case "composite":
        return (
          <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-1 p-1.5">
            <div className="flex items-center justify-center rounded bg-emerald-50 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              88
            </div>
            <div className="flex items-center rounded bg-slate-50 p-1 dark:bg-slate-800">
              <svg
                viewBox="0 0 50 20"
                className="h-full w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M1 16 C10 15 14 5 22 9 C31 13 34 3 49 6"
                  fill="none"
                  stroke="#7CB342"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex h-full items-center justify-center">
            <LayoutGrid
              size={17}
              className="text-emerald-500"
            />
          </div>
        );
    }
  };

  // =====================================
  // LOADING
  // =====================================
  if (loading) {
    return (
      <div
        className={`h-full flex items-center justify-center ${isDark ? "bg-[#050a1e] text-slate-100" : ""}`}
      >
        <div className="text-center">
          <div
            className="
              animate-spin rounded-full
              h-14 w-14
              border-b-2 border-emerald-500
              mx-auto mb-4
            "
          ></div>

          <p
            className="
              text-gray-500 dark:text-gray-300
            "
          >
            Loading templates...
          </p>
        </div>
      </div>
    );
  }

  // =====================================
  // UI
  // =====================================
  return (
    <div
      className={`template-list-page min-h-full w-full overflow-auto p-3 ${
        isDark ? "template-list-dark bg-[#050a1e] text-slate-100" : "bg-transparent"
      }`}
    >
      {isDark && (
        <style>{`
          .template-list-dark {
            color: #e2e8f0;
          }

          .template-list-dark .bg-white {
            background-color: #0f172a !important;
          }

          .template-list-dark .bg-gray-50 {
            background-color: #020617 !important;
          }

          .template-list-dark .bg-gray-100 {
            background-color: #1e293b !important;
          }

          .template-list-dark .bg-gray-200 {
            background-color: #334155 !important;
          }

          .template-list-dark .bg-gray-700,
          .template-list-dark .bg-gray-800,
          .template-list-dark .bg-gray-900 {
            background-color: #0f172a !important;
          }

          .template-list-dark .border-gray-200,
          .template-list-dark .border-gray-300,
          .template-list-dark .border-gray-600,
          .template-list-dark .border-gray-700 {
            border-color: #334155 !important;
          }

          .template-list-dark .text-gray-900,
          .template-list-dark .text-gray-800,
          .template-list-dark .text-gray-700 {
            color: #f8fafc !important;
          }

          .template-list-dark .text-gray-600,
          .template-list-dark .text-gray-500 {
            color: #cbd5e1 !important;
          }

          .template-list-dark .text-gray-400,
          .template-list-dark .text-gray-300 {
            color: #94a3b8 !important;
          }

          .template-list-dark input,
          .template-list-dark select,
          .template-list-dark textarea {
            color: #f8fafc !important;
            background-color: #020617 !important;
            border-color: #334155 !important;
          }

          .template-list-dark input::placeholder,
          .template-list-dark textarea::placeholder {
            color: #64748b !important;
          }

          .template-list-dark option {
            color: #f8fafc !important;
            background-color: #020617 !important;
          }

          .template-list-dark .from-gray-100 {
            --tw-gradient-from: #111827 var(--tw-gradient-from-position) !important;
            --tw-gradient-to: rgb(17 24 39 / 0) var(--tw-gradient-to-position) !important;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
          }

          .template-list-dark .to-gray-200 {
            --tw-gradient-to: #334155 var(--tw-gradient-to-position) !important;
          }

          .template-list-dark .hover\:shadow-2xl:hover {
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.45) !important;
          }

          .template-list-dark .bg-emerald-50 {
            background-color: rgba(6, 78, 59, 0.28) !important;
          }

          .template-list-dark .border-emerald-200,
          .template-list-dark .border-emerald-800 {
            border-color: rgba(16, 185, 129, 0.35) !important;
          }

          .template-list-dark .text-emerald-700 {
            color: #6ee7b7 !important;
          }

          .template-list-dark .bg-yellow-100 {
            background-color: rgba(113, 63, 18, 0.55) !important;
          }

          .template-list-dark .text-yellow-700 {
            color: #fde68a !important;
          }

          .template-list-dark .border-yellow-300,
          .template-list-dark .border-yellow-600 {
            border-color: rgba(250, 204, 21, 0.55) !important;
          }

          .template-list-dark .bg-yellow-50 {
            background-color: rgba(113, 63, 18, 0.3) !important;
          }

          .template-list-dark .bg-emerald-100 {
            background-color: rgba(6, 78, 59, 0.55) !important;
          }

          .template-list-dark .text-emerald-600 {
            color: #34d399 !important;
          }

          .template-list-dark .shadow-lg,
          .template-list-dark .shadow-xl,
          .template-list-dark .shadow-2xl {
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.28) !important;
          }
        `}</style>
      )}
      {/* HEADER */}
      <div
        className="
          flex flex-col md:flex-row
          md:items-center
          md:justify-between
          gap-3 mb-4
        "
      >
        <div>
          <h1
            className="
              text-xl font-bold
              dark:text-white
              flex items-center gap-3
            "
          >
            <FolderOpen
              className="
                w-6 h-6 text-emerald-500
              "
            />

            Template Management
          </h1>

          <p
            className="
              text-gray-500 dark:text-gray-400 mt-1
            "
          >
            {isSuperadmin
              ? "Manage dashboard templates, organization assignments, and favourite dashboard templates."
              : "View assigned dashboard templates and choose your favourite default dashboard."}
          </p>
        </div>

        {canCreateOrEdit && (
          <button
            onClick={() => setPage("builder")}
            className="
              flex items-center gap-2
              bg-emerald-600
              hover:bg-emerald-700
              transition
              text-white
              px-4 py-2.5
              rounded-xl
              shadow-sm
            "
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      {isSuperadmin ? (
        <div
          className="
            grid grid-cols-1
            md:grid-cols-3
            gap-3
            mb-4
          "
        >
          {/* TOTAL */}
          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-2xl
              p-4
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-emerald-500/10
                  text-emerald-500
                  flex items-center justify-center
                "
              >
                <LayoutGrid size={24} />
              </div>

              <div>
                <p
                  className="
                    text-sm text-gray-500
                    dark:text-gray-400
                  "
                >
                  Total Templates
                </p>

                <p
                  className="
                    text-xl font-bold
                    dark:text-white
                  "
                >
                  {templates.length}
                </p>
              </div>
            </div>
          </div>

          {/* ASSIGNED */}
          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-2xl
              p-4
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-emerald-500/10
                  text-emerald-500
                  flex items-center justify-center
                "
              >
                <CheckCircle2 size={24} />
              </div>

              <div>
                <p
                  className="
                    text-sm text-gray-500
                    dark:text-gray-400
                  "
                >
                  Assigned Templates
                </p>

                <p
                  className="
                    text-xl font-bold
                    text-emerald-500
                  "
                >
                  {assignedTemplateCount}
                </p>
              </div>
            </div>
          </div>

          {/* UNASSIGNED */}
          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-2xl
              p-4
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-yellow-500/10
                  text-yellow-500
                  flex items-center justify-center
                "
              >
                <AlertCircle size={24} />
              </div>

              <div>
                <p
                  className="
                    text-sm text-gray-500
                    dark:text-gray-400
                  "
                >
                  Unassigned Templates
                </p>

                <p
                  className="
                    text-xl font-bold
                    text-yellow-500
                  "
                >
                  {unassignedTemplateCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="
            grid grid-cols-1
            md:grid-cols-2
            gap-3
            mb-4
          "
        >
          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-2xl
              p-4
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-emerald-500/10
                  text-emerald-500
                  flex items-center justify-center
                "
              >
                <LayoutGrid size={24} />
              </div>

              <div>
                <p
                  className="
                    text-sm text-gray-500
                    dark:text-gray-400
                  "
                >
                  Available Templates
                </p>

                <p
                  className="
                    text-xl font-bold
                    dark:text-white
                  "
                >
                  {templates.length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-2xl
              p-4
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-yellow-500/10
                  text-yellow-500
                  flex items-center justify-center
                "
              >
                <Star size={24} />
              </div>

              <div>
                <p
                  className="
                    text-sm text-gray-500
                    dark:text-gray-400
                  "
                >
                  Favourite Template
                </p>

                <p
                  className="
                    text-lg font-bold
                    text-yellow-500
                    truncate
                  "
                >
                  {favoriteTemplateName ||
                    (favoriteTemplateId
                      ? `#${favoriteTemplateId}`
                      : "Not Set")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200
          dark:border-gray-700
          rounded-2xl
          p-5
          shadow-lg
          mb-8
        "
      >
        <div
          className="
            flex flex-col md:flex-row
            md:items-center
            md:justify-between
            gap-4
          "
        >
          <div>
            <h2
              className="
                text-lg font-bold
                dark:text-white
              "
            >
              Template Library
            </h2>

            <p
              className="
                text-sm text-gray-500
                dark:text-gray-400
              "
            >
              {isSuperadmin
                ? "Search, assign, edit, set favourite, or use saved dashboard templates."
                : "Search, use, or set your favourite dashboard template."}
            </p>
          </div>

          <div
            className="
              flex w-full flex-col
              gap-2 sm:flex-row
              sm:items-center
              md:w-auto
            "
          >
            <div
              className="
                relative
                w-full sm:w-72
              "
            >
              <Search
                size={17}
                className="
                  absolute left-3.5 top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="
                  h-10 w-full rounded-xl
                  border border-gray-300
                  bg-gray-50 pl-10 pr-3
                  text-sm outline-none
                  transition
                  focus:border-emerald-500
                  focus:ring-2
                  focus:ring-emerald-500/15
                  dark:border-gray-700
                  dark:bg-gray-900
                  dark:text-white
                "
              />
            </div>

            <div
              className="
                inline-flex h-10 shrink-0
                items-center rounded-xl
                border border-gray-200
                bg-gray-50 p-1
                dark:border-gray-700
                dark:bg-gray-900
              "
              aria-label="Template display mode"
            >
              <button
                type="button"
                onClick={() =>
                  setViewMode("grid")
                }
                className={`
                  inline-flex h-8
                  items-center justify-center
                  gap-1.5 rounded-lg
                  px-3 text-xs
                  font-semibold transition
                  ${
                    viewMode === "grid"
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }
                `}
                title="Grid view"
                aria-pressed={
                  viewMode === "grid"
                }
              >
                <LayoutGrid size={14} />
                <span className="hidden lg:inline">
                  Grid
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode("list")
                }
                className={`
                  inline-flex h-8
                  items-center justify-center
                  gap-1.5 rounded-lg
                  px-3 text-xs
                  font-semibold transition
                  ${
                    viewMode === "list"
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }
                `}
                title="List view"
                aria-pressed={
                  viewMode === "list"
                }
              >
                <List size={14} />
                <span className="hidden lg:inline">
                  List
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EMPTY */}
      {!filteredTemplates.length ? (
        <div
          className="
            bg-white dark:bg-gray-800
            rounded-2xl
            p-12
            shadow-xl
            text-center
            border border-gray-200
            dark:border-gray-700
          "
        >
          <LayoutGrid
            className="
              w-16 h-16
              mx-auto
              text-gray-400 mb-4
            "
          />

          <h2
            className="
              text-xl font-bold
              dark:text-white mb-2
            "
          >
            No Templates Found
          </h2>

          <p
            className="
              text-gray-500 dark:text-gray-400
            "
          >
            Try another search keyword or
            create your first dashboard
            template.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? `
                  grid grid-cols-1
                  xl:grid-cols-2
                  gap-5
                `
              : `
                  flex flex-col
                  gap-4
                `
          }
        >
          {filteredTemplates.map((t) => {
            let layout = {};

            try {
              layout =
                typeof t.layout === "string"
                  ? JSON.parse(t.layout)
                  : t.layout || {};
            } catch {
              layout = {};
            }

            const assignedOrgs =
              assignments.filter(
                (a) =>
                  Number(a.template_id) ===
                  Number(t.id)
              );

            const isAssigned =
              assignedOrgs.length > 0;

            const isFavorite =
              Number(favoriteTemplateId) ===
              Number(t.id);

            const previewItems =
              Array.isArray(layout?.items)
                ? layout.items
                : [];

            const derivedPreviewCols =
              previewItems.length
                ? Math.max(
                    ...previewItems.map(
                      (item) =>
                        (Number(item?.x) || 0) +
                        Math.max(
                          1,
                          Number(item?.w) || 1
                        )
                    )
                  )
                : 1;

            const derivedPreviewRows =
              previewItems.length
                ? Math.max(
                    ...previewItems.map(
                      (item) =>
                        (Number(item?.y) || 0) +
                        Math.max(
                          1,
                          Number(item?.h) || 1
                        )
                    )
                  )
                : 1;

            const previewCols = Math.max(
              1,
              Math.min(
                12,
                Number(layout?.cols) ||
                  derivedPreviewCols ||
                  4
              )
            );

            const previewRows = Math.max(
              1,
              Math.min(
                12,
                Number(layout?.rows) ||
                  derivedPreviewRows ||
                  3
              )
            );

            const previewCells =
              Array.from({
                length:
                  previewCols *
                  previewRows,
              });

            /*
             * Adaptive thumbnail scale
             * ------------------------
             * The preview box itself stays the SAME size for every template.
             *
             * For larger layouts we render an enlarged virtual dashboard
             * and scale the entire dashboard down uniformly. This gives
             * individual widgets enough logical space to render properly
             * before being miniaturized.
             *
             * Examples:
             * 4 × 3  -> ~0.80
             * 4 × 8  -> ~0.30
             * 12 × 3 -> ~0.38
             * 12 × 12 -> ~0.20
             */
            const previewScale =
              Math.max(
                0.18,
                Math.min(
                  1,
                  2.4 / previewRows,
                  4.5 / previewCols
                )
              );

            const previewInverseScale =
              1 / previewScale;

            const previewLogicalGap =
              previewScale < 0.3
                ? 10
                : previewScale < 0.55
                ? 8
                : 6;

            const previewDense =
              previewScale < 0.42;

            return (
              <div
                key={t.id}
                className={`
                  group relative
                  bg-white dark:bg-gray-800
                  border rounded-2xl
                  shadow-lg
                  transition-all duration-200
                  ${
                    viewMode === "grid"
                      ? "p-5 hover:-translate-y-0.5 hover:shadow-xl"
                      : "p-4 hover:shadow-xl"
                  }

                  ${
                    isFavorite
                      ? `
                        border-yellow-300
                        dark:border-yellow-600
                        ring-2 ring-yellow-400/30
                      `
                      : `
                        border-gray-200
                        dark:border-gray-700
                        hover:border-emerald-300
                        dark:hover:border-emerald-700
                      `
                  }
                `}
              >
                {/* TOP */}
                <div
                  className={`
                    flex items-start
                    justify-between gap-4
                    ${
                      viewMode === "grid"
                        ? "mb-4"
                        : "mb-3"
                    }
                  `}
                >
                  <div className="min-w-0">
                    <h2
                      className="
                        text-xl font-bold
                        dark:text-white
                        flex items-center gap-2
                      "
                    >
                      <LayoutGrid
                        className="
                          w-5 h-5 text-emerald-500
                          shrink-0
                        "
                      />

                      <span className="truncate">
                        {t.name ||
                          `Template #${t.id}`}
                      </span>
                    </h2>

                    <p
                      className="
                        text-sm text-gray-400 mt-2
                      "
                    >
                      Template ID: {t.id}
                    </p>
                  </div>

                  <div
                    className="
                      flex items-center
                      gap-2
                      shrink-0
                    "
                  >
                    {isSuperadmin && (
                      <div
                        className={`
                          px-3 py-1
                          rounded-full
                          text-xs font-semibold

                          ${
                            isAssigned
                              ? `
                                bg-emerald-100
                                text-emerald-700
                                dark:bg-emerald-900/30
                                dark:text-emerald-300
                              `
                              : `
                                bg-yellow-100
                                text-yellow-700
                                dark:bg-yellow-900/30
                                dark:text-yellow-300
                              `
                          }
                        `}
                      >
                        {isAssigned
                          ? "ASSIGNED"
                          : "UNASSIGNED"}
                      </div>
                    )}

                    {/* FAVOURITE STAR BUTTON */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isFavorite) {
                          setFavoriteTemplate(t);
                        }
                      }}
                      disabled={
                        settingFavoriteId === t.id ||
                        isFavorite
                      }
                      className={`
                        w-10 h-10
                        rounded-2xl
                        flex items-center justify-center
                        border
                        transition-all
                        shadow-sm

                        ${
                          isFavorite
                            ? `
                              bg-yellow-100
                              border-yellow-300
                              text-yellow-600
                              dark:bg-yellow-900/30
                              dark:border-yellow-700
                              dark:text-yellow-300
                              cursor-default
                            `
                            : `
                              bg-white
                              border-gray-200
                              text-gray-400
                              hover:text-yellow-500
                              hover:border-yellow-300
                              hover:bg-yellow-50
                              dark:bg-gray-900
                              dark:border-gray-700
                              dark:hover:bg-yellow-900/20
                            `
                        }

                        ${
                          settingFavoriteId === t.id
                            ? "opacity-60 cursor-wait"
                            : ""
                        }
                      `}
                      title={
                        isFavorite
                          ? "Favourite template"
                          : "Set as favourite template"
                      }
                    >
                      <Star
                        size={19}
                        fill={
                          isFavorite
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>
                </div>

                <div
                  className={
                    viewMode === "list"
                      ? `
                          grid grid-cols-1 gap-4
                          lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1.14fr)]
                          lg:items-start
                        `
                      : ""
                  }
                >
                  <div className="min-w-0">
                {/* TEMPLATE LAYOUT PREVIEW */}
                <div
                  className={`
                    overflow-hidden
                    rounded-2xl border
                    border-gray-200 bg-slate-100
                    dark:border-gray-700
                    dark:bg-slate-950
                    ${
                      viewMode === "grid"
                        ? "mb-5"
                        : "mb-0"
                    }
                  `}
                >
                  <div
                    className="
                      flex items-center
                      justify-between gap-3
                      border-b border-gray-200
                      bg-white/80
                      px-3 py-2
                      dark:border-gray-700
                      dark:bg-slate-900/90
                    "
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <LayoutGrid
                        size={14}
                        className="shrink-0 text-emerald-500"
                      />

                      <span className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Dashboard Preview
                      </span>
                    </div>

                    <span
                      className="
                        shrink-0 rounded-full
                        bg-slate-100
                        px-2 py-0.5
                        text-[9px] font-bold
                        text-slate-500
                        dark:bg-slate-800
                        dark:text-slate-300
                      "
                    >
                      {previewRows} ×{" "}
                      {previewCols}
                    </span>
                  </div>

                  <div
                    className={`
                      relative overflow-hidden
                      ${
                        viewMode === "grid"
                          ? "h-52"
                          : "h-44"
                      }
                    `}
                  >
                    <div
                      className="
                        absolute inset-2
                        overflow-hidden
                        rounded-lg
                      "
                    >
                      {/*
                        Virtual dashboard stage.

                        Instead of forcing 8 or 12 rows directly into a
                        208px thumbnail, this stage becomes proportionally
                        larger and is scaled back down as one piece.
                      */}
                      <div
                        className="
                          absolute left-0 top-0
                          origin-top-left
                        "
                        style={{
                          width:
                            `${previewInverseScale * 100}%`,
                          height:
                            `${previewInverseScale * 100}%`,
                          transform:
                            `scale(${previewScale})`,
                        }}
                      >
                        {/* Empty grid cells */}
                        <div
                          className="
                            absolute inset-0 grid
                          "
                          style={{
                            gap:
                              `${previewLogicalGap}px`,
                            gridTemplateColumns:
                              `repeat(${previewCols}, minmax(0, 1fr))`,
                            gridTemplateRows:
                              `repeat(${previewRows}, minmax(0, 1fr))`,
                          }}
                        >
                          {previewCells.map(
                            (_, index) => (
                              <div
                                key={`cell-${index}`}
                                className="
                                  min-h-0 min-w-0
                                  rounded-lg border
                                  border-dashed
                                  border-slate-300/80
                                  bg-white/30
                                  dark:border-slate-700
                                  dark:bg-slate-900/35
                                "
                              />
                            )
                          )}
                        </div>

                        {/* Saved widget positions / spans */}
                        <div
                          className="
                            absolute inset-0 grid
                          "
                          style={{
                            gap:
                              `${previewLogicalGap}px`,
                            gridTemplateColumns:
                              `repeat(${previewCols}, minmax(0, 1fr))`,
                            gridTemplateRows:
                              `repeat(${previewRows}, minmax(0, 1fr))`,
                          }}
                        >
                          {previewItems.map(
                            (item, index) => {
                              const itemX =
                                Math.max(
                                  0,
                                  Number(item?.x) || 0
                                );

                              const itemY =
                                Math.max(
                                  0,
                                  Number(item?.y) || 0
                                );

                              if (
                                itemX >= previewCols ||
                                itemY >= previewRows
                              ) {
                                return null;
                              }

                              const itemW =
                                Math.max(
                                  1,
                                  Math.min(
                                    previewCols -
                                      itemX,
                                    Number(item?.w) ||
                                      1
                                  )
                                );

                              const itemH =
                                Math.max(
                                  1,
                                  Math.min(
                                    previewRows -
                                      itemY,
                                    Number(item?.h) ||
                                      1
                                  )
                                );

                              const showPreviewTitle =
                                !previewDense ||
                                itemW >= 2 ||
                                itemH >= 2;

                              return (
                                <div
                                  key={
                                    item?.id ||
                                    `preview-widget-${index}`
                                  }
                                  className="
                                    group/preview
                                    relative min-h-0
                                    min-w-0 overflow-hidden
                                    rounded-xl border
                                    border-slate-200
                                    bg-white
                                    shadow-[0_2px_8px_rgba(15,23,42,0.08)]
                                    dark:border-slate-700
                                    dark:bg-slate-900
                                  "
                                  style={{
                                    gridColumn:
                                      `${itemX + 1} / span ${itemW}`,
                                    gridRow:
                                      `${itemY + 1} / span ${itemH}`,
                                  }}
                                  title={`${getPreviewWidgetLabel(
                                    item
                                  )} · ${itemW}×${itemH}`}
                                >
                                  {showPreviewTitle && (
                                    <div
                                      className="
                                        absolute inset-x-0
                                        top-0 z-10 flex
                                        min-w-0 items-center
                                        justify-between
                                        gap-2 px-2.5 pt-2
                                      "
                                    >
                                      <span
                                        className="
                                          min-w-0 truncate
                                          text-[11px]
                                          font-bold
                                          leading-none
                                          text-slate-600
                                          dark:text-slate-300
                                        "
                                      >
                                        {getPreviewWidgetLabel(
                                          item
                                        )}
                                      </span>

                                      <span className="flex shrink-0 gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#A4C65A]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#C5D98B]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#B65C7A]" />
                                      </span>
                                    </div>
                                  )}

                                  <div
                                    className={
                                      showPreviewTitle
                                        ? "absolute inset-x-2 bottom-2 top-7"
                                        : "absolute inset-2"
                                    }
                                  >
                                    {renderPreviewWidgetVisual(
                                      item
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}

                          {previewItems.length ===
                            0 && (
                            <div
                              className="
                                pointer-events-none
                                absolute inset-0
                                flex items-center
                                justify-center
                              "
                            >
                              <div
                                className="
                                  rounded-xl
                                  border border-dashed
                                  border-slate-300
                                  bg-white/80
                                  px-4 py-3
                                  text-center
                                  text-sm
                                  text-slate-400
                                  shadow-sm
                                  dark:border-slate-700
                                  dark:bg-slate-900/80
                                "
                              >
                                Empty template grid
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subtle density indicator for very large layouts */}
                    {previewDense && (
                      <div
                        className="
                          pointer-events-none
                          absolute bottom-2 right-2
                          rounded-md
                          border border-slate-200
                          bg-white/90 px-1.5 py-0.5
                          text-[8px] font-semibold
                          text-slate-400
                          shadow-sm
                          backdrop-blur
                          dark:border-slate-700
                          dark:bg-slate-900/90
                          dark:text-slate-500
                        "
                      >
                        Scaled preview
                      </div>
                    )}
                  </div>
                </div>

                  </div>

                  <div className="min-w-0">
                {/* STATS */}
                <div
                  className={`
                    grid grid-cols-3 gap-2
                    ${
                      viewMode === "grid"
                        ? "mb-4"
                        : "mb-3"
                    }
                  `}
                >
                  <div
                    className="
                      bg-gray-100
                      dark:bg-gray-700
                      rounded-2xl
                      p-3
                      text-center
                    "
                  >
                    <p
                      className="
                        text-xs text-gray-500
                        dark:text-gray-300
                      "
                    >
                      Columns
                    </p>

                    <p
                      className="
                        text-lg font-bold
                        dark:text-white
                      "
                    >
                      {layout?.cols || 0}
                    </p>
                  </div>

                  <div
                    className="
                      bg-gray-100
                      dark:bg-gray-700
                      rounded-2xl
                      p-3
                      text-center
                    "
                  >
                    <p
                      className="
                        text-xs text-gray-500
                        dark:text-gray-300
                      "
                    >
                      Rows
                    </p>

                    <p
                      className="
                        text-lg font-bold
                        dark:text-white
                      "
                    >
                      {layout?.rows || 0}
                    </p>
                  </div>

                  <div
                    className="
                      bg-gray-100
                      dark:bg-gray-700
                      rounded-2xl
                      p-3
                      text-center
                    "
                  >
                    <p
                      className="
                        text-xs text-gray-500
                        dark:text-gray-300
                      "
                    >
                      Widgets
                    </p>

                    <p
                      className="
                        text-lg font-bold
                        dark:text-white
                      "
                    >
                      {
                        (layout?.items || [])
                          .length
                      }
                    </p>
                  </div>
                </div>

                {/* ASSIGNED ORGANIZATIONS */}
                {isSuperadmin && (
                  <div
                    className="
                      mb-4
                      bg-emerald-50
                      dark:bg-emerald-900/20
                      border border-emerald-200
                      dark:border-emerald-800
                      rounded-2xl
                      p-4
                    "
                  >
                    <div
                      className="
                        flex items-center
                        justify-between
                        gap-2
                        mb-3
                      "
                    >
                      <div
                        className="
                          flex items-center gap-2
                          text-emerald-700
                          dark:text-emerald-300
                          font-semibold
                          text-sm
                        "
                      >
                        <Building2
                          className="
                            w-4 h-4
                          "
                        />

                        Assigned Organizations
                      </div>

                      <span
                        className="
                          inline-flex items-center
                          gap-1
                          text-xs
                          text-emerald-600
                          dark:text-emerald-300
                        "
                      >
                        <Layers size={13} />
                        {assignedOrgs.length}
                      </span>
                    </div>

                    {assignedOrgs.length > 0 ? (
                      <div
                        className="
                          flex flex-wrap gap-2
                        "
                      >
                        {assignedOrgs.map((a) => (
                          <div
                            key={`${a.template_id}-${a.org_id}`}
                            className="
                              flex items-center gap-2
                              text-xs
                              bg-emerald-600
                              text-white
                              px-3 py-1
                              rounded-full
                            "
                          >
                            <span>
                              {a.org_name}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();

                                removeAssignment(
                                  a.org_id,
                                  a.template_id
                                );
                              }}
                              className="
                                w-4 h-4
                                rounded-full
                                bg-white/20
                                hover:bg-white/40
                                flex items-center
                                justify-center
                                text-[10px]
                                leading-none
                              "
                              title="Remove assignment"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="
                          text-xs
                          text-gray-500
                          dark:text-gray-400
                        "
                      >
                        Not assigned to any
                        organization yet.
                      </p>
                    )}
                  </div>
                )}

                {/* ACTIONS */}
                <div
                  className={`
                    flex flex-wrap gap-2.5
                    ${
                      viewMode === "list"
                        ? "lg:justify-end"
                        : ""
                    }
                  `}
                >
                  {/* USE */}
                  <button
                    onClick={() => selectTemplate(t)}
                    className="
                      flex-1
                      min-w-[130px]
                      bg-emerald-500
                      hover:bg-emerald-600
                      transition
                      text-white
                      px-3 py-2.5
                      rounded-2xl
                      font-medium
                      flex items-center
                      justify-center gap-2
                    "
                  >
                    <Play className="w-4 h-4" />
                    Use Template
                  </button>

                  {/* EDIT */}
                  {canCreateOrEdit && (
                    <button
                      onClick={() => {
                        console.log(
                          "✏️ EDITING TEMPLATE:",
                          t
                        );

                        setSelectedTemplate(t);
                        setPage("editor");
                      }}
                      className="
                        flex-1
                        min-w-[110px]
                        bg-yellow-500
                        hover:bg-yellow-600
                        transition
                        text-white
                        px-3 py-2.5
                        rounded-2xl
                        flex items-center
                        justify-center gap-2
                        font-medium
                      "
                      title="Edit template"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}

                  {/* DELETE */}
                  {canCreateOrEdit && (
                    <button
                      onClick={() =>
                        deleteTemplate(t.id)
                      }
                      className="
                        flex-1
                        min-w-[110px]
                        bg-red-500
                        hover:bg-red-600
                        transition
                        text-white
                        px-3 py-2.5
                        rounded-2xl
                        flex items-center
                        justify-center gap-2
                        font-medium
                      "
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}

                  {/* ASSIGN */}
                  {isSuperadmin && (
                    <button
                      onClick={() => {
                        setSelectedTemplateLocal(t);
                        setShowAssign(true);
                      }}
                      className="
                        flex-1
                        min-w-[110px]
                        bg-emerald-600
                        hover:bg-emerald-700
                        transition
                        text-white
                        px-3 py-2.5
                        rounded-2xl
                        flex items-center
                        justify-center gap-2
                        font-medium
                      "
                      title="Assign template"
                    >
                      <Link className="w-4 h-4" />
                      Assign
                    </button>
                  )}
                </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssign && isSuperadmin && (
        <div
          className="
            fixed inset-0
            bg-black/60
            backdrop-blur-sm
            flex items-center justify-center
            z-50
            p-6
          "
          onClick={() => {
            setShowAssign(false);
            setSelectedOrg("");
            setSelectedTemplateLocal(null);
          }}
        >
          <div
            className="
              bg-white dark:bg-gray-800
              rounded-2xl
              p-5
              w-[420px]
              max-w-[95vw]
              shadow-2xl
              border border-gray-200
              dark:border-gray-700
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              className="
                flex items-center gap-3
                mb-6
              "
            >
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-emerald-500/10
                  text-emerald-500
                  flex items-center justify-center
                "
              >
                <Building2 className="w-6 h-6" />
              </div>

              <div>
                <h2
                  className="
                    text-xl font-bold
                    dark:text-white
                  "
                >
                  Assign Template
                </h2>

                <p
                  className="
                    text-sm text-gray-500
                    dark:text-gray-400
                  "
                >
                  Link this template to an
                  organization.
                </p>
              </div>
            </div>

            {selectedTemplateLocal && (
              <div
                className="
                  mb-5
                  bg-emerald-50
                  dark:bg-emerald-900/20
                  border border-emerald-200
                  dark:border-emerald-800
                  rounded-2xl
                  p-4
                "
              >
                <p
                  className="
                    text-xs text-gray-500
                    dark:text-gray-400
                    mb-1
                  "
                >
                  Selected Template
                </p>

                <p
                  className="
                    font-bold
                    text-emerald-700
                    dark:text-emerald-300
                  "
                >
                  {selectedTemplateLocal.name ||
                    `Template #${selectedTemplateLocal.id}`}
                </p>
              </div>
            )}

            <label
              className="
                block
                text-sm font-semibold
                dark:text-white
                mb-2
              "
            >
              Organization
            </label>

            <select
              value={selectedOrg}
              className="
                w-full border
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
                p-3 rounded-2xl
                mb-6
                outline-none
                focus:ring-2
                focus:ring-emerald-500
              "
              onChange={(e) =>
                setSelectedOrg(e.target.value)
              }
            >
              <option value="">
                Select Organization
              </option>

              {orgs.map((o) => (
                <option
                  key={o.id}
                  value={o.id}
                >
                  {o.name}
                </option>
              ))}
            </select>

            <div
              className="
                flex justify-end gap-3
              "
            >
              <button
                onClick={() => {
                  setShowAssign(false);
                  setSelectedOrg("");
                  setSelectedTemplateLocal(null);
                }}
                className="
                  px-5 py-3
                  bg-gray-300
                  hover:bg-gray-400
                  dark:bg-gray-600
                  dark:hover:bg-gray-500
                  dark:text-white
                  rounded-2xl
                  transition
                "
              >
                Cancel
              </button>

              <button
                onClick={handleAssign}
                className="
                  px-5 py-3
                  bg-emerald-600
                  hover:bg-emerald-700
                  transition
                  text-white
                  rounded-2xl
                "
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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

import {
  MetricCard,
  PageHeader,
  SectionHeading,
  controlClasses,
} from "../components/ControlCenterUI";

import {
  DEFAULT_COMPOSITE_CONFIG,
  getCompositePreset,
} from "../data/compositeWidgets";

import { confirmAction, notify } from "../utils/feedback";

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
      notify(`❌ ${err.message}`);
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
      await confirmAction({
        title: "Set favourite template?",
        message: `Use "${
          template.name || `Template #${template.id}`
        }" as your favourite dashboard template?`,
        confirmLabel: "Set Favourite",
      });

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

      notify("⭐ Favourite template updated");

      await fetchDefaultTemplate?.();
    } catch (err) {
      console.error(err);
      notify(`❌ ${err.message}`);
    } finally {
      setSettingFavoriteId(null);
    }
  };

  // =====================================
  // DELETE TEMPLATE
  // =====================================
  const deleteTemplate = async (id) => {
    const confirmDelete =
      await confirmAction({
        title: "Delete template?",
        message: "This template will be permanently removed.",
        confirmLabel: "Delete",
        tone: "danger",
      });

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
      notify(`❌ ${err.message}`);
    }
  };

  // =====================================
  // ASSIGN TEMPLATE
  // =====================================
  const handleAssign = async () => {
    if (!selectedOrg) {
      return notify(
        "Please select organization"
      );
    }

    if (!selectedTemplateLocal) {
      return notify("No template selected");
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
      return notify(
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

      notify("✅ Template Assigned");

      setShowAssign(false);
      setSelectedOrg("");
      setSelectedTemplateLocal(null);

      fetchAssignments();
    } catch (err) {
      console.error(err);
      notify(`❌ ${err.message}`);
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
      await confirmAction({
        title: "Remove assignment?",
        message: "Remove this organization from the template assignment?",
        confirmLabel: "Remove",
        tone: "danger",
      });

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

      notify("✅ Assignment removed");

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
      notify(`❌ ${err.message}`);
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
            <div className="mt-1 h-1 w-8 rounded-full bg-cyan-500/75" />
          </div>
        );

      case "gauge":
        return (
          <div className="relative mx-auto h-8 w-12 overflow-hidden">
            <div className="absolute inset-x-0 top-1 h-10 rounded-full border-[5px] border-cyan-500/75 border-b-transparent" />
            <div className="absolute bottom-0 left-1/2 h-[2px] w-4 origin-left -rotate-[24deg] bg-[#FF6F88]" />
          </div>
        );

      case "linearGauge":
        return (
          <div className="flex h-full items-center px-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full w-[72%] rounded-full bg-cyan-500" />
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
                fill="rgba(88,215,255,0.16)"
              />
            ) : null}
            <path
              d="M2 27 C16 25 20 10 37 15 C52 20 61 5 76 11 C87 14 91 7 98 8"
              fill="none"
              stroke="#58D7FF"
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
                  className="w-2 rounded-t bg-cyan-500/80"
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
          <div
            className="
              grid h-full
              grid-cols-[minmax(0,1fr)_auto]
              items-center gap-2 px-2
            "
          >
            <div className="flex items-center justify-center">
              <div
                className="
                  relative h-10 w-10
                  rounded-full
                  border-[7px]
                  border-indigo-600
                  border-r-[#58D7FF]
                "
              >
                <div
                  className="
                    absolute inset-[5px]
                    rounded-full
                    bg-white
                    dark:bg-slate-900
                  "
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-1 w-8 rounded bg-[#58D7FF]" />
              <div className="h-1 w-6 rounded bg-[#7D75E7]" />
            </div>
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
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500/80" />
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
            <div className="relative h-2 w-2 rounded-full border-2 border-slate-100 bg-cyan-500 shadow dark:border-[#2C3C61]" />
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
              fill="#7D75E7"
            />
            <circle
              cx="84"
              cy="8"
              r="3"
              fill="#58D7FF"
            />
            <circle
              cx="84"
              cy="26"
              r="3"
              fill="#A86BDF"
            />
            <path
              d="M19 17 C45 17 55 8 81 8"
              fill="none"
              stroke="#58D7FF"
              strokeWidth="4"
              opacity="0.65"
            />
            <path
              d="M19 17 C45 17 55 26 81 26"
              fill="none"
              stroke="#A86BDF"
              strokeWidth="3"
              opacity="0.55"
            />
          </svg>
        );

      case "composite": {
        const config = {
          ...DEFAULT_COMPOSITE_CONFIG,
          ...(item?.compositeConfig ||
            {}),
        };

        const preset =
          getCompositePreset(
            config.preset
          );

        const ratio = Math.min(
          70,
          Math.max(
            25,
            Number(
              config.ratio
            ) || 34
          )
        );

        const horizontal =
          config.layout ===
          "horizontal";

        const primaryVisual =
          renderPreviewWidgetVisual({
            ...item,
            type:
              preset.primaryType,
            label: "",
          });

        const secondaryVisual =
          renderPreviewWidgetVisual({
            ...item,
            type:
              preset.secondaryType,
            label: "",
            chartDisplay: {
              ...(item?.chartDisplay ||
                {}),
              ...(preset.secondaryType ===
              "area"
                ? {
                    chartStyle:
                      "area",
                  }
                : {}),
            },
          });

        return (
          <div
            className={`
              grid h-full min-h-0
              overflow-hidden
              rounded-md
              border border-slate-200
              dark:border-slate-700
              ${
                horizontal
                  ? "grid-cols-[var(--primary)_minmax(0,1fr)]"
                  : "grid-rows-[var(--primary)_minmax(0,1fr)]"
              }
            `}
            style={{
              "--primary":
                `${ratio}%`,
            }}
          >
            <div
              className={`
                min-h-0 min-w-0
                overflow-hidden
                bg-white
                dark:bg-slate-900
                ${
                  horizontal
                    ? "border-r"
                    : "border-b"
                }
                border-slate-200
                dark:border-slate-700
              `}
            >
              {primaryVisual}
            </div>

            <div
              className="
                min-h-0 min-w-0
                overflow-hidden
                bg-white
                dark:bg-slate-900
              "
            >
              {secondaryVisual}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="flex h-full items-center justify-center">
            <LayoutGrid
              size={14}
              className="text-cyan-500"
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
        className={`h-full flex items-center justify-center ${isDark ? "bg-[#081022] text-slate-100" : ""}`}
      >
        <div className="text-center">
          <div
            className="
              animate-spin rounded-full
              h-14 w-14
              border-b-2 border-cyan-500
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
        isDark ? "template-list-dark bg-[#081022] text-slate-100" : "bg-transparent"
      }`}
    >
      {isDark && (
        <style>{`
          .template-list-dark {
            color: #e2e8f0;
          }

          .template-list-dark .bg-white {
            background-color: #111B34 !important;
          }

          .template-list-dark .bg-gray-50 {
            background-color: #081022 !important;
          }

          .template-list-dark .bg-gray-100 {
            background-color: #1B2948 !important;
          }

          .template-list-dark .bg-gray-200 {
            background-color: #2C3C61 !important;
          }

          .template-list-dark .bg-gray-700,
          .template-list-dark .bg-gray-800,
          .template-list-dark .bg-gray-900 {
            background-color: #111B34 !important;
          }

          .template-list-dark .border-gray-200,
          .template-list-dark .border-gray-300,
          .template-list-dark .border-gray-600,
          .template-list-dark .border-gray-700 {
            border-color: #2C3C61 !important;
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
            background-color: #081022 !important;
            border-color: #2C3C61 !important;
          }

          .template-list-dark input::placeholder,
          .template-list-dark textarea::placeholder {
            color: #64748b !important;
          }

          .template-list-dark option {
            color: #f8fafc !important;
            background-color: #081022 !important;
          }

          .template-list-dark .from-gray-100 {
            --tw-gradient-from: #111B34 var(--tw-gradient-from-position) !important;
            --tw-gradient-to: rgb(17 24 39 / 0) var(--tw-gradient-to-position) !important;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
          }

          .template-list-dark .to-gray-200 {
            --tw-gradient-to: #2C3C61 var(--tw-gradient-to-position) !important;
          }

          .template-list-dark .hover\:shadow-2xl:hover {
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.45) !important;
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

          .template-list-dark .shadow-sm,
          .template-list-dark .shadow-xl,
          .template-list-dark .shadow-2xl {
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.28) !important;
          }


          /* Template cards: real dark surfaces, not dimmed light surfaces */
          .template-list-dark .template-card {
            background: linear-gradient(
              145deg,
              #111B34 0%,
              #151A38 52%,
              #10182F 100%
            ) !important;
            border-color: #343B68 !important;
            color: #E8EDFF !important;
          }

          .template-list-dark .template-card:hover {
            background: linear-gradient(
              145deg,
              #15213D 0%,
              #1A1F45 52%,
              #131D37 100%
            ) !important;
            border-color: #4A4F82 !important;
          }

          .template-list-dark .template-card-favourite {
            border-color: rgba(125, 117, 231, 0.62) !important;
            box-shadow:
              0 0 0 1px rgba(125, 117, 231, 0.18),
              0 18px 38px rgba(2, 6, 23, 0.36) !important;
          }

          .template-list-dark .template-metric-tile {
            background-color: rgba(11, 19, 40, 0.72) !important;
            border-color: #303A62 !important;
          }

          .template-list-dark .template-org-panel {
            background-color: rgba(11, 19, 40, 0.66) !important;
            border-color: #303A62 !important;
          }

          .template-list-dark .template-org-panel.has-assignments {
            background: linear-gradient(
              135deg,
              rgba(88, 215, 255, 0.08),
              rgba(125, 117, 231, 0.08)
            ) !important;
            border-color: rgba(88, 215, 255, 0.24) !important;
          }

          .template-list-dark .template-org-title {
            color: #C8D1EA !important;
          }

          .template-list-dark .template-org-panel.has-assignments .template-org-title,
          .template-list-dark .template-org-panel.has-assignments .template-org-count {
            color: #7DDFFF !important;
          }

          .template-list-dark .template-org-count {
            color: #93A2C7 !important;
          }

          .template-list-dark .template-org-chip {
            background: linear-gradient(
              90deg,
              rgba(88, 215, 255, 0.22),
              rgba(125, 117, 231, 0.24)
            ) !important;
            color: #E8EDFF !important;
            border: 1px solid rgba(88, 215, 255, 0.24);
          }

          .template-list-dark .template-action-use {
            background: linear-gradient(
              90deg,
              rgba(88, 215, 255, 0.22),
              rgba(125, 117, 231, 0.28)
            ) !important;
            color: #EAF8FF !important;
            border-color: rgba(88, 215, 255, 0.30) !important;
          }

          .template-list-dark .template-action-use:hover {
            background: linear-gradient(
              90deg,
              rgba(88, 215, 255, 0.30),
              rgba(125, 117, 231, 0.38)
            ) !important;
          }

          .template-list-dark .template-action-edit,
          .template-list-dark .template-action-delete,
          .template-list-dark .template-action-assign {
            background-color: #15213D !important;
          }

          .template-list-dark .template-action-edit {
            border-color: rgba(255, 214, 107, 0.22) !important;
            color: #FFD66B !important;
          }

          .template-list-dark .template-action-delete {
            border-color: rgba(255, 111, 136, 0.22) !important;
            color: #FF9AAE !important;
          }

          .template-list-dark .template-action-assign {
            border-color: rgba(88, 215, 255, 0.22) !important;
            color: #7DDFFF !important;
          }

          .template-list-dark .template-status-assigned {
            background-color: rgba(88, 215, 255, 0.12) !important;
            color: #7DDFFF !important;
          }

          .template-list-dark .template-status-unassigned {
            background-color: rgba(168, 107, 223, 0.13) !important;
            color: #D6B7F4 !important;
          }
        `}</style>
      )}
      {/* HEADER */}
      <PageHeader
        icon={FolderOpen}
        title="Template Management"
        description={
          isSuperadmin
            ? "Manage templates, organization assignments, and favourite dashboards."
            : "Choose from assigned templates and set your favourite default dashboard."
        }
        className="mb-3"
        actions={
          canCreateOrEdit ? (
            <button
              type="button"
              onClick={() =>
                setPage("builder")
              }
              className={controlClasses.primary}
            >
              <Plus size={14} />
              Create Template
            </button>
          ) : null
        }
      />

      {/* SUMMARY CARDS */}
      {isSuperadmin ? (
        <div
          className="
            mb-3 grid grid-cols-1
            gap-2 md:grid-cols-3
          "
        >
          <MetricCard
            icon={LayoutGrid}
            label="Total Templates"
            value={templates.length}
            tone="neutral"
          />

          <MetricCard
            icon={CheckCircle2}
            label="Assigned Templates"
            value={assignedTemplateCount}
            tone="success"
          />

          <MetricCard
            icon={AlertCircle}
            label="Unassigned Templates"
            value={unassignedTemplateCount}
            tone="warning"
          />
        </div>
      ) : (
        <div
          className="
            mb-3 grid grid-cols-1
            gap-2 md:grid-cols-2
          "
        >
          <MetricCard
            icon={LayoutGrid}
            label="Available Templates"
            value={templates.length}
            tone="neutral"
          />

          <MetricCard
            icon={Star}
            label="Favourite Template"
            value={
              favoriteTemplateName ||
              (favoriteTemplateId
                ? `#${favoriteTemplateId}`
                : "Not Set")
            }
            tone={
              favoriteTemplateId
                ? "warning"
                : "neutral"
            }
          />
        </div>
      )}

      {/* TEMPLATE LIBRARY TOOLBAR */}
      <div
        className="
          mb-3 rounded-xl
          border border-slate-200
          bg-white p-3 shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
        "
      >
        <div
          className="
            flex flex-col gap-2
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <SectionHeading
            title="Template Library"
            description={
              isSuperadmin
                ? "Search, assign, edit, favourite, or open saved dashboards."
                : "Search, open, or favourite an assigned dashboard."
            }
          />

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
                  absolute left-3 top-1/2
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
                  h-9 w-full rounded-lg
                  border border-slate-300
                  bg-white pl-9 pr-3
                  text-xs outline-none
                  transition
                  focus:border-cyan-500
                  focus:ring-2
                  focus:ring-cyan-500/15
                  dark:border-gray-700
                  dark:bg-gray-900
                  dark:text-white
                "
              />
            </div>

            <div
              className="
                inline-flex h-9 shrink-0
                items-center rounded-lg
                border border-slate-200
                bg-slate-50 p-1
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
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-[#15213D] dark:text-cyan-200"
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
                      ? "bg-white text-cyan-700 shadow-sm dark:bg-[#15213D] dark:text-cyan-200"
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
            rounded-xl
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
              text-base font-bold
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
                ? layout.items.filter(
                    (item) => item?.type !== "status"
                  )
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
              previewCols <= 4 &&
              previewRows <= 3
                ? 1
                : Math.max(
                    0.18,
                    Math.min(
                      1,
                      3 / previewRows,
                      5 / previewCols
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
                  template-card
                  ${isFavorite ? "template-card-favourite" : ""}
                  group relative
                  border rounded-xl
                  shadow-sm
                  p-3
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:shadow-md

                  bg-gradient-to-br
                  from-indigo-50/95
                  via-violet-50/70
                  to-slate-50/90
                  border-indigo-200/80
                  hover:from-indigo-100/90
                  hover:via-violet-50/90
                  hover:to-white
                  hover:border-indigo-300


                  ${
                    isFavorite
                      ? `
                        ring-2 ring-violet-300/50
                        border-violet-300
                        dark:ring-violet-400/20
                      `
                      : ""
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
                        ? "mb-2.5"
                        : "mb-2"
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
                          w-4 h-4 text-cyan-500
                          dark:text-[#58D7FF]
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
                        text-[10px] text-gray-400 mt-1
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
                          px-2.5 py-0.5
                          rounded-full
                          text-[10px] font-semibold

                          ${
                            isAssigned
                              ? `
                                template-status-assigned
                                bg-cyan-100
                                text-cyan-700
                                dark:bg-cyan-400/10
                                dark:text-cyan-200
                              `
                              : `
                                template-status-unassigned
                                bg-violet-100
                                text-violet-700
                                dark:bg-violet-400/10
                                dark:text-violet-200
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
                        w-8 h-8
                        rounded-lg
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
                        size={15}
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
                    rounded-xl border
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
                        className="shrink-0 text-cyan-500"
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
                                item?.type ===
                                "composite"
                                  ? false
                                  : !previewDense ||
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
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#58D7FF]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#A86BDF]" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6F88]" />
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
                      template-metric-tile
                      rounded-xl
                      border border-indigo-100/80
                      bg-white/45
                      p-3
                      text-center
                      backdrop-blur-sm
                      dark:border-[#303A62]
                      dark:bg-[#0B1328]/55
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
                      template-metric-tile
                      rounded-xl
                      border border-indigo-100/80
                      bg-white/45
                      p-3
                      text-center
                      backdrop-blur-sm
                      dark:border-[#303A62]
                      dark:bg-[#0B1328]/55
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
                      template-metric-tile
                      rounded-xl
                      border border-indigo-100/80
                      bg-white/45
                      p-3
                      text-center
                      backdrop-blur-sm
                      dark:border-[#303A62]
                      dark:bg-[#0B1328]/55
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
                        (layout?.items || []).filter(
                          (item) => item?.type !== "status"
                        ).length
                      }
                    </p>
                  </div>
                </div>

                {/* ASSIGNED ORGANIZATIONS */}
                {isSuperadmin && (
                  <div
                    className={`
                      template-org-panel
                      ${assignedOrgs.length > 0 ? "has-assignments" : ""}
                      mb-4
                      rounded-xl
                      border
                      p-4
                      ${
                        assignedOrgs.length > 0
                          ? `
                              bg-indigo-50/65
                              border-indigo-200
                            `
                          : `
                              bg-slate-50/70
                              border-slate-200
                            `
                      }
                    `}
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
                          template-org-title
                          flex items-center gap-2
                          font-semibold
                          text-sm
                          text-indigo-700
                          dark:text-slate-200
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
                          template-org-count
                          inline-flex items-center
                          gap-1
                          text-xs
                          text-indigo-600
                          dark:text-slate-400
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
                              template-org-chip
                              flex items-center gap-2
                              text-xs
                              bg-gradient-to-r
                              from-cyan-500
                              to-indigo-500
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
                    flex flex-wrap items-center gap-1.5
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
                    className={`
                      inline-flex h-8 items-center
                      justify-center gap-1.5
                      rounded-lg px-2.5
                      template-action-use
                      text-[11px] font-semibold
                      text-white
                      border border-cyan-400/20
                      bg-gradient-to-r
                      from-cyan-500
                      to-indigo-500
                      hover:from-cyan-400
                      hover:to-indigo-400
                      shadow-sm
                      transition-colors
                      ${
                        viewMode === "grid"
                          ? "flex-1 min-w-[96px]"
                          : "min-w-[92px]"
                      }
                    `}
                  >
                    <Play size={13} />
                    Use
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
                      className={`
                        template-action-edit
                        inline-flex h-8 items-center
                        justify-center gap-1.5
                        rounded-lg border
                        border-amber-200
                        bg-amber-50 px-2.5
                        text-[11px] font-semibold
                        text-amber-700
                        hover:border-amber-300
                        hover:bg-amber-100
                        dark:border-amber-700/50
                        dark:bg-amber-500/10
                        dark:text-amber-300
                        dark:hover:bg-amber-500/15
                        transition-colors
                        ${
                          viewMode === "grid"
                            ? "flex-1 min-w-[82px]"
                            : "min-w-[78px]"
                        }
                      `}
                      title="Edit template"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  )}

                  {/* DELETE */}
                  {canCreateOrEdit && (
                    <button
                      onClick={() =>
                        deleteTemplate(t.id)
                      }
                      className={`
                        template-action-delete
                        inline-flex h-8 items-center
                        justify-center gap-1.5
                        rounded-lg border
                        border-rose-200
                        bg-rose-50 px-2.5
                        text-[11px] font-semibold
                        text-rose-700
                        hover:border-rose-300
                        hover:bg-rose-100
                        dark:border-rose-700/50
                        dark:bg-rose-500/10
                        dark:text-rose-300
                        dark:hover:bg-rose-500/15
                        transition-colors
                        ${
                          viewMode === "grid"
                            ? "flex-1 min-w-[82px]"
                            : "min-w-[78px]"
                        }
                      `}
                      title="Delete template"
                    >
                      <Trash2 size={13} />
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
                      className={`
                        template-action-assign
                        inline-flex h-8 items-center
                        justify-center gap-1.5
                        rounded-lg border
                        border-cyan-200
                        bg-cyan-50 px-2.5
                        text-[11px] font-semibold
                        text-cyan-700
                        hover:border-cyan-300
                        hover:bg-cyan-100
                        dark:border-cyan-400/20
                        dark:bg-[#15213D]
                        dark:text-cyan-200
                        dark:hover:bg-cyan-400/10
                        transition-colors
                        ${
                          viewMode === "grid"
                            ? "flex-1 min-w-[82px]"
                            : "min-w-[78px]"
                        }
                      `}
                      title="Assign template"
                    >
                      <Link size={13} />
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
                  bg-cyan-500/10
                  text-cyan-500
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
                  bg-indigo-50
                  dark:bg-[#151A38]
                  border border-indigo-200
                  dark:border-[#343B68]
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
                    text-indigo-700
                    dark:text-cyan-200
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
                focus:ring-cyan-500
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
                  bg-cyan-600
                  hover:bg-cyan-700
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
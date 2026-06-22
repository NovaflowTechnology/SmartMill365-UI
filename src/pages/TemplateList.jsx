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
} from "lucide-react";

export default function TemplateList({
  setPage,
  setSelectedTemplate,
  fetchDefaultTemplate,
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
  // LOADING
  // =====================================
  if (loading) {
    return (
      <div
        className="
          h-full flex items-center justify-center
        "
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
    <div className="p-6">
      {/* HEADER */}
      <div
        className="
          flex flex-col md:flex-row
          md:items-center
          md:justify-between
          gap-4 mb-8
        "
      >
        <div>
          <h1
            className="
              text-3xl font-bold
              dark:text-white
              flex items-center gap-3
            "
          >
            <FolderOpen
              className="
                w-8 h-8 text-emerald-500
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
              px-5 py-3
              rounded-2xl
              shadow-lg
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
            gap-5
            mb-8
          "
        >
          {/* TOTAL */}
          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-3xl
              p-6
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-12 h-12
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
                    text-2xl font-bold
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
              rounded-3xl
              p-6
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-12 h-12
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
                    text-2xl font-bold
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
              rounded-3xl
              p-6
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-12 h-12
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
                    text-2xl font-bold
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
            gap-5
            mb-8
          "
        >
          <div
            className="
              bg-white dark:bg-gray-800
              border border-gray-200
              dark:border-gray-700
              rounded-3xl
              p-6
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-12 h-12
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
                    text-2xl font-bold
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
              rounded-3xl
              p-6
              shadow-lg
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-12 h-12
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
          rounded-3xl
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
              relative
              w-full md:w-80
            "
          >
            <Search
              size={18}
              className="
                absolute left-4 top-1/2
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
                w-full
                rounded-2xl
                border border-gray-300
                dark:border-gray-700
                bg-gray-50 dark:bg-gray-900
                dark:text-white
                pl-11 pr-4 py-3
                outline-none
                focus:ring-2 focus:ring-emerald-500
              "
            />
          </div>
        </div>
      </div>

      {/* EMPTY */}
      {!filteredTemplates.length ? (
        <div
          className="
            bg-white dark:bg-gray-800
            rounded-3xl
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
              text-2xl font-bold
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
          className="
            grid grid-cols-1
            xl:grid-cols-2
            gap-6
          "
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

            return (
              <div
                key={t.id}
                className={`
                  group
                  relative
                  bg-white dark:bg-gray-800
                  border
                  rounded-3xl
                  p-6
                  shadow-lg
                  hover:shadow-2xl
                  hover:-translate-y-1
                  transition-all duration-300

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
                      `
                  }
                `}
              >
                {/* TOP */}
                <div
                  className="
                    flex items-start justify-between
                    gap-4 mb-5
                  "
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

                {/* PREVIEW */}
                <div
                  className="
                    rounded-2xl
                    bg-gradient-to-br
                    from-gray-100 to-gray-200
                    dark:from-gray-900
                    dark:to-gray-700
                    h-44 mb-6
                    flex items-center justify-center
                    overflow-hidden
                    border border-gray-200
                    dark:border-gray-700
                    p-4
                  "
                >
                  {(layout?.items || []).length >
                  0 ? (
                    <div
                      className="
                        grid grid-cols-4 gap-2
                        w-full h-full
                        opacity-90
                      "
                    >
                      {(layout?.items || [])
                        .slice(0, 8)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="
                              bg-emerald-500/80
                              rounded-xl
                              text-[9px]
                              text-white
                              flex items-center
                              justify-center
                              uppercase
                              tracking-wide
                              px-1
                              text-center
                            "
                          >
                            {item.type}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      className="
                        text-sm text-gray-400
                        text-center
                      "
                    >
                      No widgets in this
                      template
                    </div>
                  )}
                </div>

                {/* STATS */}
                <div
                  className="
                    grid grid-cols-3 gap-3
                    mb-6
                  "
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
                      mb-6
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
                  className="
                    flex flex-wrap
                    gap-3
                  "
                >
                  {/* USE */}
                  <button
                    onClick={() => selectTemplate(t)}
                    className="
                      flex-1
                      min-w-[160px]
                      bg-emerald-500
                      hover:bg-emerald-600
                      transition
                      text-white
                      px-4 py-3
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
                        min-w-[130px]
                        bg-yellow-500
                        hover:bg-yellow-600
                        transition
                        text-white
                        px-4 py-3
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
                        min-w-[130px]
                        bg-red-500
                        hover:bg-red-600
                        transition
                        text-white
                        px-4 py-3
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
                        min-w-[130px]
                        bg-emerald-600
                        hover:bg-emerald-700
                        transition
                        text-white
                        px-4 py-3
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
              rounded-3xl
              p-8
              w-[460px]
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
                  w-12 h-12
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
                    text-2xl font-bold
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
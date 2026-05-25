import { useEffect, useState } from "react";

import {
  LayoutGrid,
  Pencil,
  Trash2,
  Play,
  Link,
  FolderOpen,
  Building2,
} from "lucide-react";

export default function TemplateList({
  setPage,
  setSelectedTemplate,
}) {

  
  // STATES
  
  const [templates, setTemplates] =
    useState([]);

  const [orgs, setOrgs] =
    useState([]);

  const [showAssign, setShowAssign] =
    useState(false);

  const [
    selectedTemplateLocal,
    setSelectedTemplateLocal,
  ] = useState(null);

  const [selectedOrg, setSelectedOrg] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  
  // AUTH
  
  const token =
    localStorage.getItem("token");

  const role =
    localStorage.getItem("role");

  
  // FETCH TEMPLATES
  
  useEffect(() => {

    fetch(
      "http://localhost:5000/templates",
      {
        headers: {
          Authorization: token,
        },
      }
    )
      .then((res) => res.json())

      .then((data) => {

        console.log(
          "📦 TEMPLATES:",
          data
        );

        setTemplates(data || []);

        setLoading(false);

      })

      .catch((err) => {

        console.error(err);

        setLoading(false);

      });

  }, []);

  
  // FETCH ORGANIZATIONS
  
  useEffect(() => {

    if (role !== "superadmin")
      return;

    fetch(
      "http://localhost:5000/organizations",
      {
        headers: {
          Authorization: token,
        },
      }
    )
      .then((res) => res.json())

      .then((data) => {

        console.log(
          "🏢 ORGS:",
          data
        );

        setOrgs(data);

      })

      .catch(console.error);

  }, []);

  
  // USE TEMPLATE
  
  const selectTemplate = (t) => {

    console.log(
      "📊 USING TEMPLATE:",
      t
    );

    setSelectedTemplate(t);

    setPage("dashboard");
  };

  
  // DELETE TEMPLATE
  
  const deleteTemplate =
    async (id) => {

      const confirmDelete =
        window.confirm(
          "Delete this template?"
        );

      if (!confirmDelete)
        return;

      try {

        await fetch(
          `http://localhost:5000/templates/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization: token,
            },
          }
        );

        setTemplates((prev) =>
          prev.filter(
            (x) => x.id !== id
          )
        );

        console.log(
          "🗑 TEMPLATE DELETED:",
          id
        );

      } catch (err) {

        console.error(err);

        alert(
          "❌ Failed to delete"
        );
      }
    };

  
  // ASSIGN TEMPLATE
  
  const handleAssign =
    async () => {

      if (!selectedOrg)
        return alert(
          "Please select organization"
        );

      try {

        await fetch(
          "http://localhost:5000/assign-template",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization: token,
            },

            body: JSON.stringify({
              org_id:
                selectedOrg,

              template_id:
                selectedTemplateLocal.id,
            }),
          }
        );

        alert(
          "✅ Template Assigned"
        );

        setShowAssign(false);

      } catch (err) {

        console.error(err);

        alert(
          "❌ Failed"
        );
      }
    };

  
  // LOADING
  
  if (loading) {

    return (

      <div className="
        h-full flex items-center justify-center
      ">

        <div className="text-center">

          <div className="
            animate-spin rounded-full
            h-14 w-14
            border-b-2 border-blue-500
            mx-auto mb-4
          "></div>

          <p className="
            text-gray-500 dark:text-gray-300
          ">
            Loading templates...
          </p>

        </div>

      </div>
    );
  }

  
  // UI
  
  return (

    <div className="p-6">

      {/* HEADER */}
      <div className="
        flex flex-col md:flex-row
        md:items-center
        md:justify-between
        gap-4 mb-8
      ">

        <div>

          <h1 className="
            text-3xl font-bold
            dark:text-white
            flex items-center gap-3
          ">
            <FolderOpen className="
              w-8 h-8 text-blue-500
            " />

            Template Management
          </h1>

          <p className="
            text-gray-500 dark:text-gray-400 mt-1
          ">
            Manage dashboard templates
            and assignments
          </p>

          <p className="
            text-sm text-blue-500 mt-2
          ">
            {templates.length}
            {" "}
            templates available
          </p>

        </div>

        {[
          "admin",
          "superadmin",
        ].includes(role) && (

          <button
            onClick={() =>
              setPage("builder")
            }

            className="
              bg-blue-600
              hover:bg-blue-700
              transition
              text-white
              px-5 py-3
              rounded-xl
              shadow-lg
            "
          >
            + Create Template
          </button>

        )}

      </div>

      {/* EMPTY */}
      {!templates.length ? (

        <div className="
          bg-white dark:bg-gray-800
          rounded-3xl
          p-12
          shadow-xl
          text-center
          border border-gray-200
          dark:border-gray-700
        ">

          <LayoutGrid className="
            w-16 h-16
            mx-auto
            text-gray-400 mb-4
          " />

          <h2 className="
            text-2xl font-bold
            dark:text-white mb-2
          ">
            No Templates Found
          </h2>

          <p className="
            text-gray-500 dark:text-gray-400
          ">
            Start by creating your
            first dashboard template.
          </p>

        </div>

      ) : (

        <div className="
          grid grid-cols-1
          xl:grid-cols-2
          gap-6
        ">

          {templates.map((t) => {

            
            // SAFE LAYOUT PARSE
            
            const layout =

              typeof t.layout ===
              "string"

                ? JSON.parse(
                    t.layout
                  )

                : t.layout;

            return (

              <div
                key={t.id}

                className="
                  group
                  bg-white dark:bg-gray-800
                  border border-gray-200
                  dark:border-gray-700
                  rounded-3xl
                  p-6
                  shadow-lg
                  hover:shadow-2xl
                  transition-all duration-300
                "
              >

                {/* TOP */}
                <div className="
                  flex items-start justify-between
                  mb-5
                ">

                  <div>

                    <h2 className="
                      text-xl font-bold
                      dark:text-white
                      flex items-center gap-2
                    ">

                      <LayoutGrid className="
                        w-5 h-5 text-blue-500
                      " />

                      {t.name ||
                        `Template #${t.id}`}

                    </h2>

                    <p className="
                      text-sm text-gray-400 mt-2
                    ">
                      Template ID:
                      {" "}
                      {t.id}
                    </p>

                  </div>

                  <div className="
                    bg-blue-100
                    dark:bg-blue-900/30
                    px-3 py-1
                    rounded-full
                    text-xs font-semibold
                    text-blue-700
                    dark:text-blue-300
                  ">

                    ACTIVE

                  </div>

                </div>

                {/* PREVIEW */}
                <div className="
                  rounded-2xl
                  bg-gradient-to-br
                  from-gray-100 to-gray-200
                  dark:from-gray-900
                  dark:to-gray-700
                  h-40 mb-6
                  flex items-center justify-center
                  overflow-hidden
                  border border-gray-200
                  dark:border-gray-700
                ">

                  <div className="
                    grid grid-cols-4 gap-2
                    w-[80%] h-[70%]
                    opacity-70
                  ">

                    {(layout?.items || [])
                      .slice(0, 8)
                      .map((item) => (

                        <div
                          key={item.id}
                          className="
                            bg-blue-500/80
                            rounded-lg
                          "
                        ></div>

                    ))}

                  </div>

                </div>

                {/* STATS */}
                <div className="
                  grid grid-cols-3 gap-3
                  mb-6
                ">

                  <div className="
                    bg-gray-100 dark:bg-gray-700
                    rounded-2xl p-3 text-center
                  ">

                    <p className="
                      text-xs text-gray-500
                      dark:text-gray-300
                    ">
                      Columns
                    </p>

                    <p className="
                      text-lg font-bold
                      dark:text-white
                    ">
                      {layout?.cols || 0}
                    </p>

                  </div>

                  <div className="
                    bg-gray-100 dark:bg-gray-700
                    rounded-2xl p-3 text-center
                  ">

                    <p className="
                      text-xs text-gray-500
                      dark:text-gray-300
                    ">
                      Rows
                    </p>

                    <p className="
                      text-lg font-bold
                      dark:text-white
                    ">
                      {layout?.rows || 0}
                    </p>

                  </div>

                  <div className="
                    bg-gray-100 dark:bg-gray-700
                    rounded-2xl p-3 text-center
                  ">

                    <p className="
                      text-xs text-gray-500
                      dark:text-gray-300
                    ">
                      Widgets
                    </p>

                    <p className="
                      text-lg font-bold
                      dark:text-white
                    ">
                      {
                        (
                          layout?.items || []
                        ).length
                      }
                    </p>

                  </div>

                </div>

                {/* ACTIONS */}
                <div className="
                  flex flex-wrap gap-3
                ">

                  {/* USE */}
                  <button
                    onClick={() =>
                      selectTemplate(t)
                    }

                    className="
                      flex-1
                      bg-green-500
                      hover:bg-green-600
                      transition
                      text-white
                      px-4 py-3
                      rounded-2xl
                      font-medium
                      flex items-center
                      justify-center gap-2
                    "
                  >

                    <Play className="
                      w-4 h-4
                    " />

                    Use

                  </button>

                  {/* EDIT */}
                  {[
                    "admin",
                    "superadmin",
                  ].includes(role) && (

                    <button
                      onClick={() => {

                        console.log(
                          "✏️ EDITING TEMPLATE:",
                          t
                        );

                        setSelectedTemplate(
                          t
                        );

                        setPage(
                          "editor"
                        );

                      }}

                      className="
                        bg-yellow-500
                        hover:bg-yellow-600
                        transition
                        text-white
                        px-4 py-3
                        rounded-2xl
                        flex items-center
                        justify-center gap-2
                      "
                    >

                      <Pencil className="
                        w-4 h-4
                      " />

                      Edit

                    </button>

                  )}

                  {/* DELETE */}
                  {[
                    "admin",
                    "superadmin",
                  ].includes(role) && (

                    <button
                      onClick={() =>
                        deleteTemplate(
                          t.id
                        )
                      }

                      className="
                        bg-red-500
                        hover:bg-red-600
                        transition
                        text-white
                        px-4 py-3
                        rounded-2xl
                        flex items-center
                        justify-center gap-2
                      "
                    >

                      <Trash2 className="
                        w-4 h-4
                      " />

                      Delete

                    </button>

                  )}

                  {/* ASSIGN */}
                  {role ===
                    "superadmin" && (

                    <button
                      onClick={() => {

                        setSelectedTemplateLocal(
                          t
                        );

                        setShowAssign(
                          true
                        );

                      }}

                      className="
                        bg-indigo-500
                        hover:bg-indigo-600
                        transition
                        text-white
                        px-4 py-3
                        rounded-2xl
                        flex items-center
                        justify-center gap-2
                      "
                    >

                      <Link className="
                        w-4 h-4
                      " />

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
      {showAssign && (

        <div className="
          fixed inset-0
          bg-black/60
          backdrop-blur-sm
          flex items-center justify-center
          z-50
        ">

          <div className="
            bg-white dark:bg-gray-800
            rounded-3xl
            p-8
            w-[420px]
            shadow-2xl
            border border-gray-200
            dark:border-gray-700
          ">

            <div className="
              flex items-center gap-3
              mb-6
            ">

              <Building2 className="
                w-6 h-6 text-indigo-500
              " />

              <h2 className="
                text-2xl font-bold
                dark:text-white
              ">
                Assign Template
              </h2>

            </div>

            <select
              className="
                w-full border
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
                p-3 rounded-2xl
                mb-6
              "

              onChange={(e) =>
                setSelectedOrg(
                  e.target.value
                )
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

            <div className="
              flex justify-end gap-3
            ">

              <button
                onClick={() =>
                  setShowAssign(
                    false
                  )
                }

                className="
                  px-5 py-3
                  bg-gray-300
                  dark:bg-gray-600
                  dark:text-white
                  rounded-2xl
                "
              >
                Cancel
              </button>

              <button
                onClick={handleAssign}

                className="
                  px-5 py-3
                  bg-blue-600
                  hover:bg-blue-700
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
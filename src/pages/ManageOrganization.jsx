import { useEffect, useState } from "react";

import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function OrganizationManagement() {
  const [orgs, setOrgs] = useState([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");

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
      throw new Error(data?.error || "Request failed");
    }

    return data;
  };

  // =====================================
  // FETCH ORGANIZATIONS
  // =====================================
  const fetchOrganizations = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/organizations",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const data = await parseResponse(res);

      setOrgs(data || []);
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // =====================================
  // ADD ORGANIZATION
  // =====================================
  const addOrganization = async () => {
    if (!name.trim()) {
      alert("Please enter organization name");
      return;
    }

    const duplicate = orgs.some(
      (org) =>
        org.name.toLowerCase() ===
        name.trim().toLowerCase()
    );

    if (duplicate) {
      alert("⚠️ Organization already exists");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        "http://localhost:5000/organizations",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            name,
          }),
        }
      );

      await parseResponse(res);

      setName("");

      alert("✅ Organization created");

      fetchOrganizations();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // FILTERED ORGANIZATIONS
  // =====================================
  const filteredOrgs = orgs.filter((org) =>
    org.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalAssignedTemplates = orgs.reduce(
    (sum, org) =>
      sum + Number(org.assigned_template_count || 0),
    0
  );

  return (
    <div className="p-6">
      {/* HEADER */}
      <div
        className="
          flex flex-col md:flex-row
          md:items-center md:justify-between
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
            <Building2 className="w-8 h-8 text-cyan-500" />
            Organization Management
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Add organizations and monitor their assigned templates.
          </p>
        </div>

        <button
          onClick={fetchOrganizations}
          className="
            flex items-center gap-2
            bg-cyan-600 hover:bg-cyan-700
            text-white
            px-5 py-3
            rounded-2xl
            shadow-lg
            transition
          "
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div
        className="
          grid grid-cols-1
          md:grid-cols-3
          gap-5
          mb-8
        "
      >
        <div
          className="
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
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
                bg-cyan-500/10
                text-cyan-500
                flex items-center justify-center
              "
            >
              <Building2 size={24} />
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Organizations
              </p>

              <p className="text-2xl font-bold dark:text-white">
                {orgs.length}
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
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
              <Layers size={24} />
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Template Assignments
              </p>

              <p className="text-2xl font-bold  text-emerald-500 dark:text-white">
                {totalAssignedTemplates}
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Without Template
              </p>

              <p className="text-2xl font-bold text-yellow-500 dark:text-white">
                {
                  orgs.filter(
                    (org) =>
                      Number(org.assigned_template_count || 0) === 0
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ADD ORGANIZATION CARD */}
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-3xl
          p-6
          shadow-lg
          mb-8
        "
      >
        <h2
          className="
            text-xl font-bold
            dark:text-white
            mb-4
          "
        >
          Add New Organization
        </h2>

        <div
          className="
            flex flex-col md:flex-row
            gap-4
          "
        >
          <input
            type="text"
            placeholder="Organization name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addOrganization();
              }
            }}
            className="
              flex-1
              rounded-2xl
              border border-gray-300
              dark:border-gray-700
              bg-white dark:bg-gray-900
              dark:text-white
              px-4 py-3
              outline-none
              focus:ring-2 focus:ring-cyan-500
            "
          />

          <button
            onClick={addOrganization}
            disabled={saving}
            className="
              flex items-center justify-center gap-2
              bg-cyan-600
              hover:bg-cyan-700
              disabled:opacity-50
              text-white
              px-6 py-3
              rounded-2xl
              font-semibold
              transition
            "
          >
            <Plus size={18} />
            {saving ? "Adding..." : "Add Organization"}
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-3xl
          shadow-lg
          overflow-hidden
        "
      >
        {/* TABLE HEADER */}
        <div
          className="
            flex flex-col md:flex-row
            md:items-center md:justify-between
            gap-4
            p-6
            border-b border-gray-200 dark:border-gray-700
          "
        >
          <div>
            <h2 className="text-xl font-bold dark:text-white">
              Organization List
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View organizations and their template assignment status.
            </p>
          </div>

          <div
            className="
              relative
              w-full md:w-80
            "
          >
            <Search
              className="
                absolute left-4 top-1/2
                -translate-y-1/2
                text-gray-400
              "
              size={18}
            />

            <input
              type="text"
              placeholder="Search organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full
                rounded-2xl
                border border-gray-300
                dark:border-gray-700
                bg-gray-50 dark:bg-gray-900
                dark:text-white
                pl-11 pr-4 py-3
                outline-none
                focus:ring-2 focus:ring-cyan-500
              "
            />
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">
            Loading organizations...
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">
            No organizations found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead
                className="
                  bg-gray-100 dark:bg-gray-900
                  text-gray-500 dark:text-gray-400
                  uppercase text-xs
                "
              >
                <tr>
                  <th className="text-left px-6 py-4">
                    ID
                  </th>

                  <th className="text-left px-6 py-4">
                    Organization
                  </th>

                  <th className="text-left px-6 py-4">
                    Assigned Templates
                  </th>

                  <th className="text-left px-6 py-4">
                    Template Names
                  </th>

                  <th className="text-left px-6 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y divide-gray-200
                  dark:divide-gray-700
                "
              >
                {filteredOrgs.map((org) => {
                  const assignedCount = Number(
                    org.assigned_template_count || 0
                  );

                  const hasTemplate = assignedCount > 0;

                  return (
                    <tr
                      key={org.id}
                      className="
                        hover:bg-gray-50
                        dark:hover:bg-gray-900/70
                        transition
                      "
                    >
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        #{org.id}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="
                              w-10 h-10
                              rounded-xl
                              bg-cyan-500/10
                              text-cyan-500
                              flex items-center justify-center
                            "
                          >
                            <Building2 size={18} />
                          </div>

                          <div>
                            <div className="font-semibold dark:text-white">
                              {org.name}
                            </div>

                            <div className="text-xs text-gray-400">
                              Organization Account
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className="
                            inline-flex items-center gap-2
                            px-3 py-1
                            rounded-full
                            text-xs font-semibold
                            bg-blue-100 text-blue-700
                            dark:bg-blue-900/30
                            dark:text-blue-300
                          "
                        >
                          <Layers size={13} />
                          {assignedCount}
                        </span>
                      </td>

                      <td className="px-6 py-4 max-w-[360px]">
                        {org.assigned_templates ? (
                          <div className="flex flex-wrap gap-2">
                            {org.assigned_templates
                              .split(", ")
                              .map((templateName, index) => (
                                <span
                                  key={index}
                                  className="
                                    px-3 py-1
                                    rounded-full
                                    text-xs
                                    bg-gray-100
                                    dark:bg-gray-900
                                    text-gray-600
                                    dark:text-gray-300
                                    border border-gray-200
                                    dark:border-gray-700
                                  "
                                >
                                  {templateName}
                                </span>
                              ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            No template assigned
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {hasTemplate ? (
                          <span
                            className="
                              inline-flex items-center gap-2
                              px-3 py-1
                              rounded-full
                              text-xs font-semibold
                              bg-emerald-100 text-emerald-700
                              dark:bg-emerald-900/30
                              dark:text-emerald-300
                            "
                          >
                            <CheckCircle2 size={13} />
                            Ready
                          </span>
                        ) : (
                          <span
                            className="
                              inline-flex items-center gap-2
                              px-3 py-1
                              rounded-full
                              text-xs font-semibold
                              bg-yellow-100 text-yellow-700
                              dark:bg-yellow-900/30
                              dark:text-yellow-300
                            "
                          >
                            <AlertCircle size={13} />
                            Need Template
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
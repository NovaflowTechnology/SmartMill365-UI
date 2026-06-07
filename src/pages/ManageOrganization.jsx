import { useEffect, useState } from "react";

import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Layers,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Save,
  X,
  Users,
  ShieldCheck,
  UserPlus,
  UserMinus,
} from "lucide-react";

export default function OrganizationManagement() {
  const currentRole = localStorage.getItem("role");
  const currentOrgId = localStorage.getItem("org_id");
  const currentOrgName = localStorage.getItem("org_name");

  const isSuperadmin = currentRole === "superadmin";
  const isAdmin = currentRole === "admin";

  const availableRoles = isSuperadmin
    ? ["admin", "editor", "viewer"]
    : ["editor", "viewer"];

  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeAction, setActiveAction] =
    useState(isSuperadmin ? "organization" : "user");

  const [editingOrgId, setEditingOrgId] =
    useState(null);

  const [editingOrgName, setEditingOrgName] =
    useState("");

  const [
    selectedManageOrgId,
    setSelectedManageOrgId,
  ] = useState(null);

  const [selectedUserId, setSelectedUserId] =
    useState("");

  const [selectedRole, setSelectedRole] =
    useState("viewer");

  const [selectedOrgId, setSelectedOrgId] =
    useState("");

  const [newUsername, setNewUsername] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [newUserRole, setNewUserRole] =
    useState("viewer");

  const [newUserOrgId, setNewUserOrgId] =
    useState("");

  const [creatingUser, setCreatingUser] =
    useState(false);

  const [updatingUserId, setUpdatingUserId] =
    useState(null);

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
      throw new Error(
        data?.error || "Request failed"
      );
    }

    return data;
  };

  // =====================================
  // FETCH ORGANIZATIONS
  // =====================================
  const fetchOrganizations = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        if (!currentOrgId) {
          setOrgs([]);
          setSelectedManageOrgId(null);
          return;
        }

        const adminOrg = {
          id: currentOrgId,
          name: currentOrgName || "My Organization",
          assigned_template_count: 0,
          assigned_templates: "",
        };

        setOrgs([adminOrg]);
        setSelectedManageOrgId(currentOrgId);
        return;
      }

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

      if (
        !selectedManageOrgId &&
        data?.length > 0
      ) {
        setSelectedManageOrgId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // FETCH USERS
  // =====================================
  const fetchUsers = async () => {
    try {
      setUserLoading(true);

      const res = await fetch(
        "http://localhost:5000/users",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const data = await parseResponse(res);

      setUsers(data || []);
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      if (activeAction === "organization") {
        setActiveAction("user");
      }

      if (selectedRole === "admin") {
        setSelectedRole("viewer");
      }

      if (newUserRole === "admin") {
        setNewUserRole("viewer");
      }

      if (currentOrgId) {
        setSelectedOrgId(currentOrgId);
        setNewUserOrgId(currentOrgId);
        setSelectedManageOrgId(currentOrgId);
      }
    }
  }, [
    activeAction,
    currentOrgId,
    isAdmin,
    newUserRole,
    selectedRole,
  ]);

  // =====================================
  // REFRESH ALL
  // =====================================
  const refreshAll = () => {
    fetchOrganizations();
    fetchUsers();
  };

  // =====================================
  // ADD ORGANIZATION
  // =====================================
  const addOrganization = async () => {
    if (!isSuperadmin) {
      alert("Only superadmin can add organizations");
      return;
    }

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
            name: name.trim(),
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
  // START EDIT ORGANIZATION
  // =====================================
  const startEditOrg = (org) => {
    setEditingOrgId(org.id);
    setEditingOrgName(org.name || "");
  };

  // =====================================
  // CANCEL EDIT ORGANIZATION
  // =====================================
  const cancelEditOrg = () => {
    setEditingOrgId(null);
    setEditingOrgName("");
  };

  // =====================================
  // UPDATE ORGANIZATION
  // =====================================
  const updateOrganization = async (orgId) => {
    if (!isSuperadmin) {
      alert("Only superadmin can update organizations");
      return;
    }

    if (!editingOrgName.trim()) {
      alert("Organization name cannot be empty");
      return;
    }

    const duplicate = orgs.some(
      (org) =>
        Number(org.id) !== Number(orgId) &&
        org.name.toLowerCase() ===
          editingOrgName.trim().toLowerCase()
    );

    if (duplicate) {
      alert("⚠️ Organization name already exists");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5000/organizations/${orgId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            name: editingOrgName.trim(),
          }),
        }
      );

      await parseResponse(res);

      alert("✅ Organization updated");

      cancelEditOrg();
      fetchOrganizations();
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    }
  };

  // =====================================
  // DELETE ORGANIZATION
  // =====================================
  const deleteOrganization = async (org) => {
    if (!isSuperadmin) {
      alert("Only superadmin can delete organizations");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete organization "${org.name}"?\n\nThis will remove its template assignments and unlink users from this organization.`
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `http://localhost:5000/organizations/${org.id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: token,
          },
        }
      );

      await parseResponse(res);

      alert("✅ Organization deleted");

      if (
        Number(selectedManageOrgId) ===
        Number(org.id)
      ) {
        setSelectedManageOrgId(null);
      }

      fetchOrganizations();
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    }
  };

  // =====================================
  // UPDATE USER ROLE / ORGANIZATION
  // =====================================
  const updateUserRole = async (
    userId,
    role,
    orgId
  ) => {
    if (isAdmin && role === "admin") {
      alert("Admin cannot assign admin role");
      return;
    }

    const finalOrgId = isAdmin
      ? currentOrgId
      : orgId || null;

    if (isAdmin && !finalOrgId) {
      alert("Your admin account has no organization assigned");
      return;
    }

    try {
      setUpdatingUserId(userId);

      const res = await fetch(
        `http://localhost:5000/users/${userId}/role`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            role,
            org_id: finalOrgId,
          }),
        }
      );

      await parseResponse(res);

      alert("✅ User authorization updated");

      setSelectedUserId("");
      setSelectedRole("viewer");
      setSelectedOrgId(
        isAdmin ? currentOrgId || "" : ""
      );

      if (finalOrgId) {
        setSelectedManageOrgId(finalOrgId);
      }

      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // =====================================
  // CREATE NEW USER
  // =====================================
  const createUser = async () => {
    if (!newUsername.trim()) {
      alert("Please enter username");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (isAdmin && newUserRole === "admin") {
      alert("Admin cannot create another admin");
      return;
    }

    const finalOrgId = isAdmin
      ? currentOrgId
      : newUserOrgId || null;

    if (isAdmin && !finalOrgId) {
      alert("Your admin account has no organization assigned");
      return;
    }

    try {
      setCreatingUser(true);

      const res = await fetch(
        "http://localhost:5000/users",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            username: newUsername.trim(),
            password: newPassword,
            role: newUserRole,
            org_id: finalOrgId,
          }),
        }
      );

      await parseResponse(res);

      alert("✅ User created successfully");

      setNewUsername("");
      setNewPassword("");
      setNewUserRole("viewer");
      setNewUserOrgId(
        isAdmin ? currentOrgId || "" : ""
      );

      if (finalOrgId) {
        setSelectedManageOrgId(finalOrgId);
      }

      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // =====================================
  // ADD USER TO ORGANIZATION
  // =====================================
  const addUserToOrganization = async () => {
    if (!selectedUserId) {
      alert("Please select a user");
      return;
    }

    const finalOrgId = isAdmin
      ? currentOrgId
      : selectedOrgId;

    if (!finalOrgId) {
      alert("Please select an organization");
      return;
    }

    await updateUserRole(
      selectedUserId,
      selectedRole,
      finalOrgId
    );

    setSelectedManageOrgId(finalOrgId);
  };

  // =====================================
  // REMOVE USER FROM ORGANIZATION
  // =====================================
  const removeUserFromOrganization = async (
    user
  ) => {
    if (isAdmin) {
      alert("Admin cannot remove users from the organization");
      return;
    }

    const confirmRemove = window.confirm(
      `Remove "${user.username}" from this organization?`
    );

    if (!confirmRemove) return;

    await updateUserRole(user.id, user.role, null);
  };

  // =====================================
  // LOCAL ROLE CHANGE
  // =====================================
  const changeUserDraftRole = (
    userId,
    role
  ) => {
    setUsers((prev) =>
      prev.map((u) =>
        Number(u.id) === Number(userId)
          ? {
              ...u,
              draftRole: role,
            }
          : u
      )
    );
  };

  // =====================================
  // FILTERED ORGANIZATIONS
  // =====================================
  const filteredOrgs = orgs.filter((org) =>
    org.name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  // =====================================
  // USERS BY ORGANIZATION
  // =====================================
  const getUsersByOrg = (orgId) =>
    users.filter(
      (user) =>
        Number(user.org_id) === Number(orgId) &&
        user.role !== "superadmin"
    );

  const selectedOrg = orgs.find(
    (org) =>
      Number(org.id) ===
      Number(selectedManageOrgId)
  );

  const selectedOrgUsers = getUsersByOrg(
    selectedManageOrgId
  ).filter((user) => {
    const keyword = userSearch.toLowerCase();

    return (
      user.username
        ?.toLowerCase()
        .includes(keyword) ||
      user.role
        ?.toLowerCase()
        .includes(keyword)
    );
  });

  const assignableUsers = users.filter((user) => {
    if (user.role === "superadmin") {
      return false;
    }

    if (isAdmin) {
      return (
        Number(user.org_id) === Number(currentOrgId) &&
        user.role !== "admin"
      );
    }

    return true;
  });

  const totalAssignedTemplates = orgs.reduce(
    (sum, org) =>
      sum +
      Number(org.assigned_template_count || 0),
    0
  );

  const totalUsers = users.filter(
    (u) => u.role !== "superadmin"
  ).length;

  const adminCount = users.filter(
    (u) => u.role === "admin"
  ).length;

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
            {isSuperadmin
              ? "Organization Management"
              : "User Management"}
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isSuperadmin
              ? "Manage organizations, template assignments, and users by selected organization."
              : `Manage users within ${currentOrgName || "your organization"}.`}
          </p>
        </div>

        <button
          onClick={refreshAll}
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
          md:grid-cols-4
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
                Template Assignments
              </p>

              <p className="text-2xl font-bold text-emerald-500">
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
                bg-purple-500/10
                text-purple-500
                flex items-center justify-center
              "
            >
              <Users size={24} />
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Users
              </p>

              <p className="text-2xl font-bold text-purple-500">
                {totalUsers}
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
              <ShieldCheck size={24} />
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Admin Users
              </p>

              <p className="text-2xl font-bold text-yellow-500">
                {adminCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ADMINISTRATION ACTIONS */}
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-3xl
          shadow-lg
          mb-8
          overflow-hidden
        "
      >
        {/* SECTION HEADER */}
        <div
          className="
            p-6
            border-b border-gray-200 dark:border-gray-700
            bg-gradient-to-r
            from-cyan-50
            via-purple-50
            to-white
            dark:from-cyan-900/20
            dark:via-purple-900/20
            dark:to-gray-800
          "
        >
          <div
            className="
              flex flex-col xl:flex-row
              xl:items-center xl:justify-between
              gap-5
            "
          >
            <div>
              <h2
                className="
                  text-xl font-bold
                  dark:text-white
                  flex items-center gap-2
                "
              >
                <ShieldCheck className="w-5 h-5 text-purple-500" />
                Administration Actions
              </h2>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control Panel
              </p>
            </div>

            {/* ACTION TABS */}
            <div
              className="
                flex flex-col
                sm:flex-row
                gap-2
                w-full xl:w-auto
                rounded-3xl
                bg-white/70
                dark:bg-gray-900/60
                p-2
                border border-white/70
                dark:border-gray-700
              "
            >
              {isSuperadmin && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveAction("organization")
                  }
                  className={`
                    flex items-center justify-center gap-2
                    px-4 py-3
                    rounded-2xl
                    text-sm font-semibold
                    transition

                    ${
                      activeAction === "organization"
                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  <Building2 size={17} />
                  Add Org
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setActiveAction("user")
                }
                className={`
                  flex items-center justify-center gap-2
                  px-4 py-3
                  rounded-2xl
                  text-sm font-semibold
                  transition

                  ${
                    activeAction === "user"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
              >
                <UserPlus size={17} />
                New User
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveAction("assignment")
                }
                className={`
                  flex items-center justify-center gap-2
                  px-4 py-3
                  rounded-2xl
                  text-sm font-semibold
                  transition

                  ${
                    activeAction === "assignment"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
              >
                <Users size={17} />
                Assignment
              </button>
            </div>
          </div>
        </div>

        {/* ACTION CONTENT */}
        <div className="p-6">
          {/* ADD ORGANIZATION */}
          {isSuperadmin &&
            activeAction === "organization" && (
            <div
              className="
                rounded-3xl
                border border-cyan-100
                dark:border-cyan-900/60
                bg-cyan-50/60
                dark:bg-cyan-900/10
                p-5
              "
            >
              <div
                className="
                  flex flex-col lg:flex-row
                  lg:items-center lg:justify-between
                  gap-5
                  mb-5
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-11 h-11
                      rounded-2xl
                      bg-cyan-600
                      text-white
                      flex items-center justify-center
                      shadow-lg shadow-cyan-500/20
                    "
                  >
                    <Building2 size={21} />
                  </div>

                  <div>
                    <h3 className="font-bold dark:text-white">
                      Add New Organization
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create an organization profile before assigning templates or users.
                    </p>
                  </div>
                </div>

                <span
                  className="
                    px-4 py-2
                    rounded-2xl
                    bg-cyan-100
                    dark:bg-cyan-900/30
                    text-cyan-700
                    dark:text-cyan-300
                    text-xs font-semibold
                    w-fit
                  "
                >
                  Organization Setup
                </span>
              </div>

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
                  onChange={(e) =>
                    setName(e.target.value)
                  }
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
                  type="button"
                  onClick={addOrganization}
                  disabled={saving}
                  className="
                    flex items-center justify-center gap-2
                    bg-cyan-600
                    hover:bg-cyan-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    px-6 py-3
                    rounded-2xl
                    font-semibold
                    transition
                    shadow-lg shadow-cyan-500/20
                  "
                >
                  <Plus size={18} />
                  {saving
                    ? "Adding..."
                    : "Add Organization"}
                </button>
              </div>
            </div>
          )}

          {/* CREATE NEW USER */}
          {activeAction === "user" && (
            <div
              className="
                rounded-3xl
                border border-emerald-100
                dark:border-emerald-900/60
                bg-emerald-50/60
                dark:bg-emerald-900/10
                p-5
              "
            >
              <div
                className="
                  flex flex-col lg:flex-row
                  lg:items-center lg:justify-between
                  gap-5
                  mb-5
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-11 h-11
                      rounded-2xl
                      bg-emerald-600
                      text-white
                      flex items-center justify-center
                      shadow-lg shadow-emerald-500/20
                    "
                  >
                    <UserPlus size={21} />
                  </div>

                  <div>
                    <h3 className="font-bold dark:text-white">
                      Create New User
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create a login account, choose a role, and optionally assign an organization.
                    </p>
                  </div>
                </div>

                <span
                  className="
                    px-4 py-2
                    rounded-2xl
                    bg-emerald-100
                    dark:bg-emerald-900/30
                    text-emerald-700
                    dark:text-emerald-300
                    text-xs font-semibold
                    w-fit
                  "
                >
                  New Account
                </span>
              </div>

              <div
                className="
                  grid grid-cols-1
                  lg:grid-cols-5
                  gap-4
                "
              >
                <input
                  type="text"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) =>
                    setNewUsername(e.target.value)
                  }
                  className="
                    rounded-2xl
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-4 py-3
                    outline-none
                    focus:ring-2 focus:ring-emerald-500
                  "
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      createUser();
                    }
                  }}
                  className="
                    rounded-2xl
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-4 py-3
                    outline-none
                    focus:ring-2 focus:ring-emerald-500
                  "
                />

                <select
                  value={newUserRole}
                  onChange={(e) =>
                    setNewUserRole(e.target.value)
                  }
                  className="
                    rounded-2xl
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-4 py-3
                    outline-none
                    focus:ring-2 focus:ring-emerald-500
                  "
                >
                  {availableRoles.map((role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  ))}
                </select>

                {isSuperadmin ? (
                  <select
                    value={newUserOrgId}
                    onChange={(e) =>
                      setNewUserOrgId(e.target.value)
                    }
                    className="
                      rounded-2xl
                      border border-gray-300
                      dark:border-gray-700
                      bg-white dark:bg-gray-900
                      dark:text-white
                      px-4 py-3
                      outline-none
                      focus:ring-2 focus:ring-emerald-500
                    "
                  >
                    <option value="">
                      No Organization
                    </option>

                    {orgs.map((org) => (
                      <option
                        key={org.id}
                        value={org.id}
                      >
                        {org.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className="
                      rounded-2xl
                      border border-gray-300
                      dark:border-gray-700
                      bg-white dark:bg-gray-900
                      dark:text-white
                      px-4 py-3
                      text-sm
                      flex items-center
                    "
                  >
                    {currentOrgName || "My Organization"}
                  </div>
                )}

                <button
                  type="button"
                  onClick={createUser}
                  disabled={creatingUser}
                  className="
                    inline-flex
                    items-center justify-center
                    gap-2
                    rounded-2xl
                    bg-emerald-600
                    hover:bg-emerald-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    font-semibold
                    px-5 py-3
                    transition
                    shadow-lg shadow-emerald-500/20
                  "
                >
                  <UserPlus size={18} />
                  {creatingUser
                    ? "Creating..."
                    : "Create User"}
                </button>
              </div>

              <div
                className="
                  mt-4
                  rounded-2xl
                  bg-white/70
                  dark:bg-gray-900/50
                  border border-emerald-100
                  dark:border-emerald-900/50
                  px-4 py-3
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Password must be at least 6 characters. Superadmin accounts should still be created manually in the database for safety.
              </div>
            </div>
          )}

          {/* UPDATE ASSIGNMENT */}
          {activeAction === "assignment" && (
            <div
              className="
                rounded-3xl
                border border-purple-100
                dark:border-purple-900/60
                bg-purple-50/60
                dark:bg-purple-900/10
                p-5
              "
            >
              <div
                className="
                  flex flex-col lg:flex-row
                  lg:items-center lg:justify-between
                  gap-5
                  mb-5
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-11 h-11
                      rounded-2xl
                      bg-purple-600
                      text-white
                      flex items-center justify-center
                      shadow-lg shadow-purple-500/20
                    "
                  >
                    <Users size={21} />
                  </div>

                  <div>
                    <h3 className="font-bold dark:text-white">
                      Add / Update User Assignment
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Assign an existing user to an organization and update their role.
                    </p>
                  </div>
                </div>

                <span
                  className="
                    px-4 py-2
                    rounded-2xl
                    bg-purple-100
                    dark:bg-purple-900/30
                    text-purple-700
                    dark:text-purple-300
                    text-xs font-semibold
                    w-fit
                  "
                >
                  Access Control
                </span>
              </div>

              <div
                className="
                  grid grid-cols-1
                  lg:grid-cols-3
                  gap-5
                  mb-6
                "
              >
                {/* USER */}
                <div
                  className="
                    rounded-3xl
                    border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    p-5
                  "
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="
                        w-9 h-9
                        rounded-2xl
                        bg-purple-500
                        text-white
                        flex items-center justify-center
                        text-sm font-bold
                      "
                    >
                      1
                    </div>

                    <div>
                      <h4 className="font-bold dark:text-white">
                        Select User
                      </h4>

                      <p className="text-xs text-gray-400">
                        Choose the account to update
                      </p>
                    </div>
                  </div>

                  <select
                    value={selectedUserId}
                    onChange={(e) =>
                      setSelectedUserId(e.target.value)
                    }
                    className="
                      w-full
                      rounded-2xl
                      border border-gray-300
                      dark:border-gray-700
                      bg-white dark:bg-gray-800
                      dark:text-white
                      px-4 py-3
                      outline-none
                      focus:ring-2 focus:ring-purple-500
                    "
                  >
                    <option value="">
                      Select User
                    </option>

                    {assignableUsers.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.username} — {user.role}
                        {user.org_name
                          ? ` — ${user.org_name}`
                          : " — No Organization"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ROLE */}
                <div
                  className="
                    rounded-3xl
                    border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    p-5
                  "
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="
                        w-9 h-9
                        rounded-2xl
                        bg-purple-500
                        text-white
                        flex items-center justify-center
                        text-sm font-bold
                      "
                    >
                      2
                    </div>

                    <div>
                      <h4 className="font-bold dark:text-white">
                        Select Role
                      </h4>

                      <p className="text-xs text-gray-400">
                        Set authorization level
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() =>
                          setSelectedRole(role)
                        }
                        className={`
                          py-3
                          rounded-2xl
                          border
                          text-sm
                          font-semibold
                          capitalize
                          transition

                          ${
                            selectedRole === role
                              ? "bg-purple-600 text-white border-purple-600 shadow"
                              : "bg-white dark:bg-gray-800 dark:text-white border-gray-200 dark:border-gray-700 hover:border-purple-400"
                          }
                        `}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                    Admin can manage templates, editor can edit templates, and viewer can only view dashboards.
                  </p>
                </div>

                {/* ORGANIZATION */}
                <div
                  className="
                    rounded-3xl
                    border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-900
                    p-5
                  "
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="
                        w-9 h-9
                        rounded-2xl
                        bg-purple-500
                        text-white
                        flex items-center justify-center
                        text-sm font-bold
                      "
                    >
                      3
                    </div>

                    <div>
                      <h4 className="font-bold dark:text-white">
                        Select Organization
                      </h4>

                      <p className="text-xs text-gray-400">
                        Link user to an organization
                      </p>
                    </div>
                  </div>

                  {isSuperadmin ? (
                    <select
                      value={selectedOrgId}
                      onChange={(e) =>
                        setSelectedOrgId(e.target.value)
                      }
                      className="
                        w-full
                        rounded-2xl
                        border border-gray-300
                        dark:border-gray-700
                        bg-white dark:bg-gray-800
                        dark:text-white
                        px-4 py-3
                        outline-none
                        focus:ring-2 focus:ring-purple-500
                      "
                    >
                      <option value="">
                        Select Organization
                      </option>

                      {orgs.map((org) => (
                        <option
                          key={org.id}
                          value={org.id}
                        >
                          {org.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      className="
                        w-full
                        rounded-2xl
                        border border-gray-300
                        dark:border-gray-700
                        bg-white dark:bg-gray-800
                        dark:text-white
                        px-4 py-3
                        text-sm
                      "
                    >
                      {currentOrgName || "My Organization"}
                    </div>
                  )}
                </div>
              </div>

              {/* PREVIEW */}
              {selectedUserId && (
                <div
                  className="
                    mb-6
                    rounded-3xl
                    border border-purple-200
                    dark:border-purple-800
                    bg-white
                    dark:bg-gray-900/70
                    p-5
                  "
                >
                  {(() => {
                    const selectedUser = users.find(
                      (user) =>
                        Number(user.id) ===
                        Number(selectedUserId)
                    );

                    const targetOrgId = isAdmin
                      ? currentOrgId
                      : selectedOrgId;

                    const targetOrg = orgs.find(
                      (org) =>
                        Number(org.id) ===
                        Number(targetOrgId)
                    );

                    return (
                      <div
                        className="
                          flex flex-col lg:flex-row
                          lg:items-center lg:justify-between
                          gap-4
                        "
                      >
                        <div>
                          <p
                            className="
                              text-xs
                              uppercase
                              tracking-widest
                              text-purple-500
                              font-bold
                              mb-2
                            "
                          >
                            Assignment Preview
                          </p>

                          <h3
                            className="
                              text-lg
                              font-bold
                              dark:text-white
                            "
                          >
                            {selectedUser?.username ||
                              "Selected User"}
                          </h3>

                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Current: {" "}
                            <span className="font-semibold capitalize">
                              {selectedUser?.role || "-"}
                            </span>{" "}
                            in {" "}
                            <span className="font-semibold">
                              {selectedUser?.org_name ||
                                "No Organization"}
                            </span>
                          </p>
                        </div>

                        <div
                          className="
                            flex flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <span
                            className="
                              px-3 py-1
                              rounded-full
                              text-xs
                              font-semibold
                              bg-purple-50
                              dark:bg-purple-900/30
                              text-purple-600
                              border border-purple-200
                              dark:border-purple-800
                              capitalize
                            "
                          >
                            New Role: {selectedRole}
                          </span>

                          <span
                            className="
                              px-3 py-1
                              rounded-full
                              text-xs
                              font-semibold
                              bg-purple-50
                              dark:bg-purple-900/30
                              text-purple-600
                              border border-purple-200
                              dark:border-purple-800
                            "
                          >
                            New Org: {" "}
                            {targetOrg?.name ||
                              "Not selected"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div
                className="
                  flex flex-col md:flex-row
                  md:items-center md:justify-end
                  gap-3
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId("");
                    setSelectedRole("viewer");
                    setSelectedOrgId("");
                  }}
                  className="
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
                  Clear
                </button>

                <button
                  type="button"
                  onClick={addUserToOrganization}
                  disabled={
                    updatingUserId !== null ||
                    !selectedUserId ||
                    (!isAdmin && !selectedOrgId)
                  }
                  className="
                    inline-flex
                    items-center justify-center
                    gap-2
                    rounded-2xl
                    bg-purple-600
                    hover:bg-purple-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    font-semibold
                    px-6 py-3
                    transition
                    shadow-lg
                    shadow-purple-500/20
                  "
                >
                  <UserPlus size={18} />

                  {updatingUserId !== null
                    ? "Updating..."
                    : "Confirm Assignment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ORGANIZATION TABLE CARD */}
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-3xl
          shadow-lg
          overflow-hidden
          mb-8
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
              Select an organization to view and manage its users below.
            </p>
          </div>

          <div className="relative w-full md:w-80">
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
                focus:ring-2 focus:ring-cyan-500
              "
            />
          </div>
        </div>

        {/* TABLE */}
        {loading || userLoading ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">
            Loading organizations and users...
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
                    Users
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
                  <th className="text-right px-6 py-4">
                    Actions
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
                    org.assigned_template_count ||
                      0
                  );

                  const hasTemplate =
                    assignedCount > 0;

                  const orgUsers = getUsersByOrg(
                    org.id
                  );

                  const isSelected =
                    Number(selectedManageOrgId) ===
                    Number(org.id);

                  const isEditing =
                    Number(editingOrgId) ===
                    Number(org.id);

                  return (
                    <tr
                      key={org.id}
                      onClick={() =>
                        setSelectedManageOrgId(org.id)
                      }
                      className={`
                        cursor-pointer
                        transition

                        ${
                          isSelected
                            ? "bg-purple-50 dark:bg-purple-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-900/70"
                        }
                      `}
                    >
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        #{org.id}
                      </td>

                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            value={editingOrgName}
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                            onChange={(e) =>
                              setEditingOrgName(
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateOrganization(
                                  org.id
                                );
                              }

                              if (e.key === "Escape") {
                                cancelEditOrg();
                              }
                            }}
                            className="
                              w-full
                              rounded-xl
                              border border-gray-300
                              dark:border-gray-700
                              bg-white dark:bg-gray-900
                              dark:text-white
                              px-3 py-2
                              outline-none
                              focus:ring-2 focus:ring-cyan-500
                            "
                          />
                        ) : (
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
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className="
                            inline-flex items-center gap-2
                            px-3 py-1
                            rounded-full
                            text-xs font-semibold
                            bg-purple-100 text-purple-700
                            dark:bg-purple-900/30
                            dark:text-purple-300
                          "
                        >
                          <Users size={13} />
                          {orgUsers.length}
                        </span>
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
                              .map(
                                (
                                  templateName,
                                  index
                                ) => (
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
                                )
                              )}
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

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrganization(
                                    org.id
                                  );
                                }}
                                className="
                                  w-9 h-9
                                  rounded-xl
                                  bg-emerald-500
                                  hover:bg-emerald-600
                                  text-white
                                  flex items-center justify-center
                                "
                                title="Save"
                              >
                                <Save size={16} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditOrg();
                                }}
                                className="
                                  w-9 h-9
                                  rounded-xl
                                  bg-gray-200
                                  hover:bg-gray-300
                                  dark:bg-gray-700
                                  dark:hover:bg-gray-600
                                  dark:text-white
                                  flex items-center justify-center
                                "
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedManageOrgId(
                                    org.id
                                  );
                                }}
                                className={`
                                  h-9
                                  px-3
                                  rounded-xl
                                  text-white
                                  flex items-center justify-center
                                  text-xs font-semibold
                                  gap-1

                                  ${
                                    isSelected
                                      ? "bg-purple-700"
                                      : "bg-purple-600 hover:bg-purple-700"
                                  }
                                `}
                                title="View users"
                              >
                                <Users size={15} />
                                Manage Users
                              </button>

                              {isSuperadmin && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditOrg(org);
                                    }}
                                    className="
                                      w-9 h-9
                                      rounded-xl
                                      bg-yellow-500
                                      hover:bg-yellow-600
                                      text-white
                                      flex items-center justify-center
                                    "
                                    title="Edit organization"
                                  >
                                    <Pencil size={16} />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteOrganization(
                                        org
                                      );
                                    }}
                                    className="
                                      w-9 h-9
                                      rounded-xl
                                      bg-red-500
                                      hover:bg-red-600
                                      text-white
                                      flex items-center justify-center
                                    "
                                    title="Delete organization"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SELECTED ORGANIZATION USER LIST */}
      <div
        className="
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-3xl
          shadow-lg
          overflow-hidden
        "
      >
        <div
          className="
            p-6
            border-b
            border-gray-200
            dark:border-gray-700
            flex flex-col md:flex-row
            md:items-center md:justify-between
            gap-4
          "
        >
          <div>
            <h2
              className="
                text-xl font-bold
                dark:text-white
                flex items-center gap-2
              "
            >
              <Users className="w-5 h-5 text-purple-500" />

              {selectedOrg
                ? `Users in ${selectedOrg.name}`
                : "Selected Organization Users"}
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select an organization above to view, edit, or remove its users.
            </p>
          </div>

          <div className="relative w-full md:w-80">
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
              placeholder="Search user in selected organization..."
              value={userSearch}
              onChange={(e) =>
                setUserSearch(e.target.value)
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
                focus:ring-2 focus:ring-purple-500
              "
            />
          </div>
        </div>

        {!selectedOrg ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">
            Please select an organization from the list above.
          </div>
        ) : selectedOrgUsers.length === 0 ? (
          <div className="p-6 text-gray-500 dark:text-gray-400">
            No users found in this organization.
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
                    User
                  </th>
                  <th className="text-left px-6 py-4">
                    Current Role
                  </th>
                  <th className="text-left px-6 py-4">
                    Change Role
                  </th>
                  <th className="text-right px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody
                className="
                  divide-y
                  divide-gray-200
                  dark:divide-gray-700
                "
              >
                {selectedOrgUsers.map((user) => {
                  const draftRole =
                    user.draftRole || user.role;

                  const isChanged =
                    draftRole !== user.role;

                  const isProtectedAdmin =
                    isAdmin && user.role === "admin";

                  return (
                    <tr
                      key={user.id}
                      className="
                        hover:bg-gray-50
                        dark:hover:bg-gray-900/70
                      "
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold dark:text-white">
                          {user.username}
                        </div>

                        <div className="text-xs text-gray-400">
                          User ID: #{user.id}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`
                            inline-flex items-center gap-2
                            px-3 py-1
                            rounded-full
                            text-xs font-semibold
                            capitalize

                            ${
                              user.role === "admin"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : user.role === "editor"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            }
                          `}
                        >
                          <ShieldCheck size={13} />
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={draftRole}
                          disabled={isProtectedAdmin}
                          onChange={(e) =>
                            changeUserDraftRole(
                              user.id,
                              e.target.value
                            )
                          }
                          className="
                            rounded-xl
                            border border-gray-300
                            dark:border-gray-700
                            bg-white dark:bg-gray-900
                            dark:text-white
                            px-3 py-2
                            outline-none
                          "
                        >
                          {availableRoles.map((role) => (
                            <option
                              key={role}
                              value={role}
                            >
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={
                              isProtectedAdmin ||
                              !isChanged ||
                              updatingUserId === user.id
                            }
                            onClick={() =>
                              updateUserRole(
                                user.id,
                                draftRole,
                                selectedOrg.id
                              )
                            }
                            className="
                              inline-flex
                              items-center
                              justify-center
                              gap-2
                              px-4 py-2
                              rounded-xl
                              bg-purple-600
                              hover:bg-purple-700
                              disabled:opacity-50
                              disabled:cursor-not-allowed
                              text-white
                              font-semibold
                              transition
                            "
                          >
                            <Save size={15} />
                            {updatingUserId === user.id
                              ? "Saving..."
                              : "Save"}
                          </button>

                          {isSuperadmin && (
                            <button
                              onClick={() =>
                                removeUserFromOrganization(
                                  user
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                px-4 py-2
                                rounded-xl
                                bg-red-500
                                hover:bg-red-600
                                text-white
                                font-semibold
                                transition
                              "
                            >
                              <UserMinus size={15} />
                              Remove
                            </button>
                          )}
                        </div>
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
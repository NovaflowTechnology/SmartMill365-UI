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

import {
  MetricCard,
  PageHeader,
  controlClasses,
} from "../components/ControlCenterUI";

import { confirmAction, notify } from "../utils/feedback";

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
      notify(`❌ ${err.message}`);
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
      notify(`❌ ${err.message}`);
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
      notify("Only superadmin can add organizations");
      return;
    }

    if (!name.trim()) {
      notify("Please enter organization name");
      return;
    }

    const duplicate = orgs.some(
      (org) =>
        org.name.toLowerCase() ===
        name.trim().toLowerCase()
    );

    if (duplicate) {
      notify("⚠️ Organization already exists");
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

      notify("✅ Organization created");

      fetchOrganizations();
    } catch (err) {
      console.error(err);
      notify(`❌ ${err.message}`);
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
      notify("Only superadmin can update organizations");
      return;
    }

    if (!editingOrgName.trim()) {
      notify("Organization name cannot be empty");
      return;
    }

    const duplicate = orgs.some(
      (org) =>
        Number(org.id) !== Number(orgId) &&
        org.name.toLowerCase() ===
          editingOrgName.trim().toLowerCase()
    );

    if (duplicate) {
      notify("⚠️ Organization name already exists");
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

      notify("✅ Organization updated");

      cancelEditOrg();
      fetchOrganizations();
      fetchUsers();
    } catch (err) {
      console.error(err);
      notify(`❌ ${err.message}`);
    }
  };

  // =====================================
  // DELETE ORGANIZATION
  // =====================================
  const deleteOrganization = async (org) => {
    if (!isSuperadmin) {
      notify("Only superadmin can delete organizations");
      return;
    }

    const confirmDelete = await confirmAction({
      title: "Delete organization?",
      message: `Delete "${org.name}"?\n\nThis will remove its template assignments and unlink users from this organization.`,
      confirmLabel: "Delete Organization",
      tone: "danger",
    });

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

      notify("✅ Organization deleted");

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
      notify(`❌ ${err.message}`);
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
      notify("Admin cannot assign admin role");
      return;
    }

    const finalOrgId = isAdmin
      ? currentOrgId
      : orgId || null;

    if (isAdmin && !finalOrgId) {
      notify("Your admin account has no organization assigned");
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

      notify("✅ User authorization updated");

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
      notify(`❌ ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // =====================================
  // CREATE NEW USER
  // =====================================
  const createUser = async () => {
    if (!newUsername.trim()) {
      notify("Please enter username");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      notify("Password must be at least 6 characters");
      return;
    }

    if (isAdmin && newUserRole === "admin") {
      notify("Admin cannot create another admin");
      return;
    }

    const finalOrgId = isAdmin
      ? currentOrgId
      : newUserOrgId || null;

    if (isAdmin && !finalOrgId) {
      notify("Your admin account has no organization assigned");
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

      notify("✅ User created successfully");

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
      notify(`❌ ${err.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // =====================================
  // ADD USER TO ORGANIZATION
  // =====================================
  const addUserToOrganization = async () => {
    if (!selectedUserId) {
      notify("Please select a user");
      return;
    }

    const finalOrgId = isAdmin
      ? currentOrgId
      : selectedOrgId;

    if (!finalOrgId) {
      notify("Please select an organization");
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
      notify("Admin cannot remove users from the organization");
      return;
    }

    const confirmRemove = await confirmAction({
      title: "Remove user?",
      message: `Remove "${user.username}" from this organization?`,
      confirmLabel: "Remove User",
      tone: "danger",
    });

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
    <div
      className={`
        organization-management-page
        w-full
        bg-transparent
        p-3
        text-[13px]
        text-gray-900
        dark:bg-transparent
        dark:text-slate-100
        ${
          isAdmin
            ? "flex h-[calc(100vh-1.25rem)] min-h-0 flex-col overflow-hidden"
            : "min-h-full overflow-auto"
        }
      `}
    >
      <style>{`
          .dark .organization-management-page {
            color: #edf2ff;
          }

          .dark .organization-management-page .bg-white {
            background-color: #111B34 !important;
          }

          .dark .organization-management-page .bg-gray-50,
          .dark .organization-management-page .bg-gray-100 {
            background-color: #0B1328 !important;
          }

          .dark .organization-management-page .bg-gray-200 {
            background-color: #1B2948 !important;
          }

          .dark .organization-management-page .bg-gray-800,
          .dark .organization-management-page .bg-gray-900 {
            background-color: #111B34 !important;
          }

          .dark .organization-management-page .bg-white\\/70 {
            background-color: rgba(15, 23, 42, 0.7) !important;
          }

          .dark .organization-management-page .from-cyan-50 {
            --tw-gradient-from: rgba(14, 116, 144, 0.18) var(--tw-gradient-from-position) !important;
            --tw-gradient-to: rgba(14, 116, 144, 0) var(--tw-gradient-to-position) !important;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
          }

          .dark .organization-management-page .via-purple-50 {
            --tw-gradient-to: rgba(88, 28, 135, 0) var(--tw-gradient-to-position) !important;
            --tw-gradient-stops: var(--tw-gradient-from), rgba(88, 28, 135, 0.18) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;
          }

          .dark .organization-management-page .to-white {
            --tw-gradient-to: #111B34 var(--tw-gradient-to-position) !important;
          }

          .dark .organization-management-page .border-gray-200,
          .dark .organization-management-page .border-gray-300,
          .dark .organization-management-page .border-gray-700,
          .dark .organization-management-page .border-white\\/70 {
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page .text-gray-900,
          .dark .organization-management-page .text-gray-800,
          .dark .organization-management-page .text-gray-700 {
            color: #f8fafc !important;
          }

          .dark .organization-management-page .text-gray-700,
          .dark .organization-management-page .text-gray-600,
          .dark .organization-management-page .text-gray-500,
          .dark .organization-management-page .text-slate-700,
          .dark .organization-management-page .text-slate-600 {
            color: #d7e0f5 !important;
          }

          .dark .organization-management-page .text-gray-400,
          .dark .organization-management-page .text-gray-300,
          .dark .organization-management-page .text-slate-500,
          .dark .organization-management-page .text-slate-400 {
            color: #b7c4e2 !important;
          }

          .dark .organization-management-page .text-slate-300,
          .dark .organization-management-page .text-slate-200 {
            color: #dce5f8 !important;
          }

          .dark .organization-management-page input,
          .dark .organization-management-page select,
          .dark .organization-management-page textarea {
            color: #f8fafc !important;
            background-color: #081022 !important;
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page input::placeholder,
          .dark .organization-management-page textarea::placeholder {
            color: #64748b !important;
          }

          .dark .organization-management-page option {
            color: #f8fafc !important;
            background-color: #081022 !important;
          }

          .dark .organization-management-page .bg-cyan-50\\/60,
          .dark .organization-management-page .bg-emerald-50\\/60,
          .dark .organization-management-page .bg-purple-50\\/60 {
            background-color: rgba(15, 23, 42, 0.92) !important;
          }

          .dark .organization-management-page .border-cyan-100,
          .dark .organization-management-page .border-emerald-100,
          .dark .organization-management-page .border-purple-100 {
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page thead {
            background-color: #081022 !important;
            color: #bfdbfe !important;
          }

          .dark .organization-management-page tbody {
            background-color: #111B34;
          }

          .dark .organization-management-page tbody tr {
            color: #e2e8f0 !important;
          }

          /* Slight alternating row contrast in dark mode */
          .dark .organization-management-page tbody tr:nth-child(odd) {
            background-color: #111B34;
          }

          .dark .organization-management-page tbody tr:nth-child(even) {
            background-color: #111c30;
          }

          .dark .organization-management-page tbody td {
            background-color: transparent !important;
          }

          .dark .organization-management-page tbody tr:hover {
            background-color: #1B2948 !important;
          }

          .dark .organization-management-page tbody tr.bg-purple-50 {
            background-color: rgba(88, 28, 135, 0.3) !important;
          }

          .dark .organization-management-page .divide-gray-200 > :not([hidden]) ~ :not([hidden]) {
            border-color: #1B2948 !important;
          }

          .dark .organization-management-page .shadow-lg {
            box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3) !important;
          }

          .dark .organization-management-page .bg-white,
          .dark .organization-management-page .bg-white\\/70,
          .dark .organization-management-page .bg-white\\/85 {
            background-color: #111B34 !important;
          }

          .dark .organization-management-page table,
          .dark .organization-management-page tbody {
            background-color: #111B34;
            color: #e2e8f0;
          }

          .dark .organization-management-page tr:hover,
          .dark .organization-management-page .hover\\:bg-gray-50:hover,
          .dark .organization-management-page .hover\\:bg-gray-100:hover {
            background-color: #1B2948 !important;
          }

          .dark .organization-management-page h1,
          .dark .organization-management-page h2,
          .dark .organization-management-page h3,
          .dark .organization-management-page h4 {
            color: #f8fafc !important;
          }

          /* Do not force every .font-bold / .font-semibold to white.
             Badges use font-semibold too, so forcing white makes labels such as
             Need Template, Organization Setup, and count pills unreadable. */
          .dark .organization-management-page .bg-yellow-100.text-yellow-700,
          .dark .organization-management-page .bg-yellow-100 .text-yellow-700 {
            color: #92400e !important;
          }

          .dark .organization-management-page .bg-cyan-100.text-cyan-700,
          .dark .organization-management-page .bg-cyan-100 .text-cyan-700 {
            color: #155e75 !important;
          }

          .dark .organization-management-page .bg-purple-100.text-purple-700,
          .dark .organization-management-page .bg-purple-100 .text-purple-700 {
            color: #6b21a8 !important;
          }

          .dark .organization-management-page .bg-blue-100.text-blue-700,
          .dark .organization-management-page .bg-blue-100 .text-blue-700 {
            color: #1d4ed8 !important;
          }

          .dark .organization-management-page .bg-emerald-100.text-emerald-700,
          .dark .organization-management-page .bg-emerald-100 .text-emerald-700 {
            color: #047857 !important;
          }

          .dark .organization-management-page .text-emerald-600,
          .dark .organization-management-page .text-emerald-500,
          .dark .organization-management-page .text-slate-600,
          .dark .organization-management-page .text-yellow-500,
          .dark .organization-management-page .text-blue-500,
          .dark .organization-management-page .text-red-500 {
            color: inherit;
          }

          .dark .organization-management-page .text-emerald-600 {
            color: #22d3ee !important;
          }

          .dark .organization-management-page .text-emerald-500 {
            color: #34d399 !important;
          }

          .dark .organization-management-page .text-yellow-500 {
            color: #facc15 !important;
          }

          .dark .organization-management-page .text-blue-500 {
            color: #58D7FF !important;
          }

          .dark .organization-management-page .text-red-500 {
            color: #f87171 !important;
          }

          /* Dark badges should stay dark; color belongs to the text/accent, not a pale fill. */
          .dark .organization-management-page .access-control-badge {
            background-color: rgba(168, 85, 247, 0.15) !important;
            color: #c084fc !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .dark .organization-management-page .access-control-badge:hover {
            background-color: rgba(168, 85, 247, 0.2) !important;
            color: #d8b4fe !important;
          }

          /* Three administration action panels only */
          .organization-management-page .organization-action-panel {
            background:
              linear-gradient(
                135deg,
                rgba(207, 250, 254, 0.98),
                rgba(224, 242, 254, 0.96)
              );
            }

          .organization-management-page .new-user-action-panel {
            background:
              linear-gradient(
                135deg,
                rgba(209, 250, 229, 0.98),
                rgba(204, 251, 241, 0.96)
              );
            }

          .organization-management-page .assignment-action-panel {
            background:
              linear-gradient(
                135deg,
                rgba(237, 233, 254, 0.98),
                rgba(243, 232, 255, 0.96)
              );
            }

          .dark .organization-management-page .organization-action-panel {
            background:
              linear-gradient(
                135deg,
                rgba(8, 47, 73, 0.96),
                rgba(15, 23, 42, 0.98)
              ) !important;
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page .new-user-action-panel {
            background:
              linear-gradient(
                135deg,
                rgba(6, 78, 59, 0.94),
                rgba(15, 23, 42, 0.98)
              ) !important;
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page .assignment-action-panel {
            background:
              linear-gradient(
                135deg,
                rgba(76, 29, 149, 0.9),
                rgba(15, 23, 42, 0.98)
              ) !important;
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page .organization-action-panel,
          .dark .organization-management-page .new-user-action-panel,
          .dark .organization-management-page .assignment-action-panel {
            box-shadow:
              0 18px 36px rgba(2, 6, 23, 0.28);
          }

          .organization-management-page .password-guidance {
            background-color: rgba(255, 255, 255, 0.82);
            border-color: #a7f3d0;
            color: #475569;
          }

          .dark .organization-management-page .password-guidance {
            background-color: rgba(2, 6, 23, 0.58) !important;
            border-color: #2C3C61 !important;
            color: #cbd5e1 !important;
          }

          /* Shared design-system normalization */
          .organization-management-page .shadow-lg,
          .organization-management-page .shadow-xl,
          .organization-management-page .shadow-2xl {
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06) !important;
          }

          .dark .organization-management-page .shadow-lg,
          .dark .organization-management-page .shadow-xl,
          .dark .organization-management-page .shadow-2xl {
            box-shadow: 0 3px 12px rgba(0, 0, 0, 0.22) !important;
          }

          .organization-management-page .organization-action-panel,
          .organization-management-page .new-user-action-panel,
          .organization-management-page .assignment-action-panel {
            background-image: none !important;
          }

          /* Match Device Management border system across this page */
          .organization-management-page .org-surface {
            border-color: #e2e8f0;
          }

          .dark .organization-management-page .org-surface {
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page .administration-tabs-shell {
            background-color: rgba(15, 23, 42, 0.96) !important;
            border-color: #475569 !important;
          }

          .dark .organization-management-page .administration-tabs-shell button {
            color: #cbd5e1 !important;
          }

          .dark .organization-management-page .administration-tabs-shell button:hover {
            background-color: #1B2948 !important;
            color: #f8fafc !important;
          }

          .dark .organization-management-page .administration-tabs-shell button.bg-cyan-600,
          .dark .organization-management-page .administration-tabs-shell button.bg-emerald-600,
          .dark .organization-management-page .administration-tabs-shell button.bg-purple-600 {
            color: #ffffff !important;
          }

          .dark .organization-management-page .administration-tabs-shell button:disabled {
            color: #64748b !important;
            opacity: 1 !important;
          }

          .dark .organization-management-page .summary-card,
          .dark .organization-management-page .table-card,
          .dark .organization-management-page .user-list-card,
          .dark .organization-management-page .administration-card {
            background-color: #111B34 !important;
            border-color: #2C3C61 !important;
          }

          .dark .organization-management-page .summary-card,
          .dark .organization-management-page .table-card,
          .dark .organization-management-page .user-list-card,
          .dark .organization-management-page .administration-card,
          .dark .organization-management-page .organization-action-panel,
          .dark .organization-management-page .new-user-action-panel,
          .dark .organization-management-page .assignment-action-panel {
            box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3) !important;
          }

          .dark .organization-management-page .assignment-step-card,
          .dark .organization-management-page .assignment-preview-card {
            background-color: #0B1328 !important;
            border-color: #2C3C61 !important;
          }
        `}</style>
      {/* HEADER */}
      <PageHeader
        icon={
          isSuperadmin
            ? Building2
            : Users
        }
        title={
          isSuperadmin
            ? "Organization Management"
            : "User Management"
        }
        description={
          isSuperadmin
            ? "Manage organizations, template assignments, and users."
            : `Manage users within ${currentOrgName || "your organization"}.`
        }
        className="mb-3 shrink-0"
        actions={
          <button
            type="button"
            onClick={refreshAll}
            className={controlClasses.secondary}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      {/* SUMMARY CARDS */}
      {!isAdmin && (
        <div
          className="
            mb-3 grid grid-cols-1
            gap-2 md:grid-cols-4
          "
        >
          <MetricCard
            icon={Building2}
            label="Organizations"
            value={orgs.length}
            tone="neutral"
          />

          <MetricCard
            icon={Layers}
            label="Template Assignments"
            value={totalAssignedTemplates}
            tone="success"
          />

          <MetricCard
            icon={Users}
            label="Users"
            value={totalUsers}
            tone="neutral"
          />

          <MetricCard
            icon={ShieldCheck}
            label="Admin Users"
            value={adminCount}
            tone="warning"
          />
        </div>
      )}

      {/* ADMINISTRATION ACTIONS */}
      <div
        className={`
          administration-card org-surface
          bg-white
          border
          rounded-lg
          shadow-sm
          mb-3
          overflow-hidden
          ${isAdmin ? "shrink-0" : ""}
        `}
      >
        {/* SECTION HEADER */}
        <div
          className="
            px-3 py-2.5
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
              gap-3
            "
          >
            <div>
              <h2
                className="
                  text-base font-bold
                  dark:text-white
                  flex items-center gap-2
                "
              >
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                {isSuperadmin ? "Administration Actions" : "Create User"}
              </h2>

              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                {isSuperadmin
                  ? "Control Panel"
                  : `Add users directly into ${currentOrgName || "your organization"}.`}
              </p>
            </div>

            {/* ACTION TABS */}
            <div
              className="
                administration-tabs-shell
                org-surface
                flex flex-col
                sm:flex-row
                gap-1
                w-full xl:w-auto
                rounded-lg
                p-1
                border
              "
            >
              {isSuperadmin && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveAction("organization")
                  }
                  className={`
                    flex h-8 items-center justify-center gap-1.5
                    px-3
                    rounded-lg
                    text-xs font-semibold
                    transition

                    ${
                      activeAction === "organization"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }
                  `}
                >
                  <Building2 size={14} />
                  Add Org
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setActiveAction("user")
                }
                className={`
                  flex h-8 items-center justify-center gap-1.5
                  px-3
                  rounded-lg
                  text-xs font-semibold
                  transition

                  ${
                    activeAction === "user"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                <UserPlus size={14} />
                New User
              </button>

              {isSuperadmin && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveAction("assignment")
                  }
                  className={`
                    flex h-8 items-center justify-center gap-1.5
                    px-3
                    rounded-lg
                    text-xs font-semibold
                    transition

                    ${
                      activeAction === "assignment"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }
                  `}
                >
                  <Users size={14} />
                  Assignment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACTION CONTENT */}
        <div className="p-3">
          {/* ADD ORGANIZATION */}
          {isSuperadmin &&
            activeAction === "organization" && (
            <div
              className="
                organization-action-panel
                rounded-2xl
                p-5
              "
            >
              <div
                className="
                  flex flex-col lg:flex-row
                  lg:items-center lg:justify-between
                  gap-2.5
                  mb-3
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-8 h-8
                      rounded-lg
                      bg-cyan-600
                      text-white
                      flex items-center justify-center
                      shadow-lg shadow-cyan-500/20
                    "
                  >
                    <Building2 size={17} />
                  </div>

                  <div>
                    <h3 className="font-bold dark:text-white">
                      Add New Organization
                    </h3>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Create an organization profile before assigning templates or users.
                    </p>
                  </div>
                </div>

                <span
                  className="
                    px-2.5 py-1
                    rounded-lg
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
                    h-10
                    rounded-lg
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-3 py-2
                    text-sm
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
                    h-10
                    px-4
                    rounded-lg
                    text-sm font-semibold
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
                new-user-action-panel
                rounded-2xl
                p-5
              "
            >
              <div
                className="
                  flex flex-col lg:flex-row
                  lg:items-center lg:justify-between
                  gap-2.5
                  mb-3
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-8 h-8
                      rounded-lg
                      bg-emerald-600
                      text-white
                      flex items-center justify-center
                      shadow-lg shadow-emerald-500/20
                    "
                  >
                    <UserPlus size={17} />
                  </div>

                  <div>
                    <h3 className="font-bold dark:text-white">
                      Create New User
                    </h3>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Create a login account, choose a role, and optionally assign an organization.
                    </p>
                  </div>
                </div>

                <span
                  className="
                    px-2.5 py-1
                    rounded-lg
                    bg-emerald-100
                    dark:bg-emerald-400/15
                    text-emerald-700
                    dark:text-emerald-200
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
                    h-10
                    rounded-lg
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-3 py-2
                    text-sm
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
                    h-10
                    rounded-lg
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-3 py-2
                    text-sm
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
                    h-10
                    rounded-lg
                    border border-gray-300
                    dark:border-gray-700
                    bg-white dark:bg-gray-900
                    dark:text-white
                    px-3 py-2
                    text-sm
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
                      h-10
                      rounded-lg
                      border border-gray-300
                      dark:border-gray-700
                      bg-white dark:bg-gray-900
                      dark:text-white
                      px-3 py-2
                      text-sm
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
                      h-10
                      rounded-lg
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
                    rounded-lg
                    bg-emerald-600
                    hover:bg-emerald-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    font-semibold
                    px-4 py-2.5
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
                  password-guidance
                  mt-3
                  rounded-lg
                  border
                  px-3 py-2
                  text-xs
                  font-medium
                  leading-relaxed
                "
              >
                Password must be at least 6 characters. Superadmin accounts should still be created manually in the database for safety.
              </div>
            </div>
          )}

          {/* UPDNewTE ASSIGNMENT */}
          {isSuperadmin && activeAction === "assignment" && (
            <div
              className="
                assignment-action-panel
                rounded-2xl
                p-5
              "
            >
              <div
                className="
                  flex flex-col lg:flex-row
                  lg:items-center lg:justify-between
                  gap-2.5
                  mb-3
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-8 h-8
                      rounded-lg
                      bg-purple-600
                      text-white
                      flex items-center justify-center
                      shadow-lg shadow-purple-500/20
                    "
                  >
                    <Users size={17} />
                  </div>

                  <div>
                    <h3 className="font-bold dark:text-white">
                      Add / Update User Assignment
                    </h3>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Assign an existing user to an organization and update their role.
                    </p>
                  </div>
                </div>

                <span
                  className="
                    access-control-badge
                    px-2.5 py-1
                    rounded-lg
                    bg-purple-100
                    dark:bg-purple-500/15
                    text-purple-700
                    dark:text-purple-200
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
                  gap-2
                  mb-3
                "
              >
                {/* USER */}
                <div
                  className="
                    assignment-step-card org-surface
                    rounded-xl
                    border
                    bg-white
                    p-3
                  "
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="
                        w-8 h-8
                        rounded-lg
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
                      h-10
                      rounded-lg
                      border border-gray-300
                      dark:border-gray-700
                      bg-white dark:bg-gray-800
                      dark:text-white
                      px-3 py-2
                      text-sm
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
                    assignment-step-card org-surface
                    rounded-xl
                    border
                    bg-white
                    p-3
                  "
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="
                        w-8 h-8
                        rounded-lg
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
                          rounded-lg
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
                    assignment-step-card org-surface
                    rounded-xl
                    border
                    bg-white
                    p-3
                  "
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="
                        w-8 h-8
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
                    assignment-preview-card org-surface
                    mb-6
                    rounded-2xl
                    border
                    bg-white
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
                              text-slate-600
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
                    px-4 py-2.5
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
                    rounded-lg
                    bg-purple-600
                    hover:bg-purple-700
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    text-white
                    font-semibold
                    h-10 px-4
                    text-sm
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
        className={`
          table-card org-surface
          bg-white
          border
          rounded-xl
          shadow-sm
          overflow-hidden
          mb-3
          ${isAdmin ? "hidden" : ""}
        `}
      >
        {/* TABLE HEADER */}
        <div
          className="
            flex flex-col md:flex-row
            md:items-center md:justify-between
            gap-2
            px-3 py-2.5
            border-b border-gray-200 dark:border-gray-700
          "
        >
          <div>
            <h2 className="text-base font-bold dark:text-white">
              Organization List
            </h2>

            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Click a row or Manage Users to select an organization. Up to 5 rows are shown at once.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="
                absolute left-3 top-1/2
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
                h-9
                rounded-lg
                border border-gray-300
                dark:border-gray-700
                bg-gray-50 dark:bg-gray-900
                dark:text-white
                pl-9 pr-3
                text-xs
                outline-none
                focus:ring-2 focus:ring-cyan-500
              "
            />
          </div>
        </div>

        {/* TABLE */}
        {loading || userLoading ? (
          <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
            Loading organizations and users...
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
            No organizations found.
          </div>
        ) : (
          <div
            className={
              isAdmin
                ? "min-h-0 flex-1 overflow-auto overscroll-contain"
                : "max-h-[360px] overflow-auto overscroll-contain"
            }
          >
            <table className="w-full text-xs">
              <thead
                className="
                  organization-table-head
                  sticky top-0 z-20
                  bg-[#f7f9fc]
                  dark:bg-[#0B1328]
                  uppercase text-[10px]
                "
              >
                <tr>
                  <th className="text-left px-4 py-3">
                    ID
                  </th>
                  <th className="text-left px-4 py-3">
                    Organization
                  </th>
                  <th className="text-left px-4 py-3">
                    Users
                  </th>
                  <th className="text-left px-4 py-3">
                    Assigned Templates
                  </th>
                  <th className="text-left px-4 py-3">
                    Template Names
                  </th>
                  <th className="text-left px-4 py-3">
                    Status
                  </th>
                  <th className="text-right px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
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
                        h-16
                        cursor-pointer
                        transition-all duration-150
                        ${
                          isSelected
                            ? "bg-cyan-50/80 dark:bg-cyan-500/10 shadow-[inset_4px_0_0_#06b6d4]"
                            : "bg-white dark:bg-[#111B34] hover:bg-slate-50 dark:hover:bg-[#15213D]"
                        }
                      `}
                      title={
                        isSelected
                          ? "Selected organization"
                          : `Select ${org.name}`
                      }
                    >
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        #{org.id}
                      </td>

                      <td className="px-4 py-3">
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
                                w-8 h-8
                                rounded-lg
                                bg-cyan-500/10
                                text-cyan-600
                                dark:bg-cyan-400/10
                                dark:text-cyan-300
                                flex items-center justify-center
                              "
                            >
                              <Building2 size={15} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`
                                    font-semibold
                                    ${
                                      isSelected
                                        ? "text-cyan-700 dark:text-cyan-300"
                                        : "text-slate-900 dark:text-slate-100"
                                    }
                                  `}
                                >
                                  {org.name}
                                </span>

                                {isSelected && (
                                  <span
                                    className="
                                      inline-flex items-center gap-1
                                      rounded-md
                                      bg-cyan-100
                                      px-1.5 py-0.5
                                      text-[9px] font-bold
                                      uppercase tracking-wide
                                      text-cyan-700
                                      dark:bg-cyan-400/15
                                      dark:text-cyan-200
                                    "
                                  >
                                    <CheckCircle2 size={10} />
                                    Selected
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-gray-400 dark:text-slate-400">
                                Organization Account
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className="
                            inline-flex items-center gap-1.5
                            rounded-lg
                            border border-slate-200
                            bg-slate-50
                            px-2.5 py-1
                            text-xs font-semibold
                            text-slate-600
                            dark:border-[#2C3C61]
                            dark:bg-[#17233F]
                            dark:text-slate-200
                          "
                        >
                          <Users
                            size={13}
                            className="text-purple-500 dark:text-purple-300"
                          />
                          {orgUsers.length}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className="
                            inline-flex items-center gap-1.5
                            rounded-lg
                            border border-slate-200
                            bg-slate-50
                            px-2.5 py-1
                            text-xs font-semibold
                            text-slate-600
                            dark:border-[#2C3C61]
                            dark:bg-[#17233F]
                            dark:text-slate-200
                          "
                        >
                          <Layers
                            size={13}
                            className="text-cyan-600 dark:text-cyan-300"
                          />
                          {assignedCount}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-[360px]">
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
                                      inline-flex
                                      rounded-lg
                                      border border-slate-200
                                      bg-slate-50
                                      px-2.5 py-1
                                      text-xs font-medium
                                      text-slate-600
                                      dark:border-[#2C3C61]
                                      dark:bg-[#0F1A31]
                                      dark:text-slate-300
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

                      <td className="px-4 py-3">
                        {hasTemplate ? (
                          <span
                            className="
                              inline-flex items-center gap-1.5
                              rounded-lg
                              bg-emerald-100
                              px-2.5 py-1
                              text-xs font-semibold
                              text-emerald-700
                              dark:bg-emerald-400/15
                              dark:text-emerald-200
                            "
                          >
                            <CheckCircle2 size={13} />
                            Ready
                          </span>
                        ) : (
                          <span
                            className="
                              inline-flex items-center gap-1.5
                              rounded-lg
                              bg-amber-100
                              px-2.5 py-1
                              text-xs font-semibold
                              text-amber-700
                              dark:bg-amber-400/15
                              dark:text-amber-200
                            "
                          >
                            <AlertCircle size={13} />
                            Need Template
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
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
                                  w-8 h-8
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
                                  w-8 h-8
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
                                  h-8
                                  px-3
                                  rounded-lg
                                  inline-flex items-center justify-center
                                  text-xs font-semibold
                                  gap-1.5
                                  border
                                  transition-all duration-150
                                  ${
                                    isSelected
                                      ? "border-cyan-500 bg-cyan-600 text-white shadow-sm dark:border-cyan-400/50 dark:bg-cyan-400/15 dark:text-cyan-100"
                                      : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 dark:border-[#24506A] dark:bg-[#123047] dark:text-cyan-200 dark:hover:border-[#3B7188] dark:hover:bg-[#173A50]"
                                  }
                                `}
                                title={
                                  isSelected
                                    ? "Currently viewing users in this organization"
                                    : "Select this organization and view its users"
                                }
                              >
                                {isSelected ? (
                                  <CheckCircle2 size={14} />
                                ) : (
                                  <Users size={15} />
                                )}
                                {isSelected
                                  ? "Viewing Users"
                                  : "Manage Users"}
                              </button>

                              {isSuperadmin && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditOrg(org);
                                    }}
                                    className="
                                      w-8 h-8
                                      rounded-lg
                                      border border-slate-200
                                      bg-slate-50
                                      text-slate-600
                                      flex items-center justify-center
                                      transition-all duration-150
                                      hover:border-amber-300
                                      hover:bg-amber-50
                                      hover:text-amber-700
                                      dark:border-[#2C3C61]
                                      dark:bg-[#17233F]
                                      dark:text-slate-300
                                      dark:hover:border-amber-400/40
                                      dark:hover:bg-amber-400/10
                                      dark:hover:text-amber-200
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
                                      w-8 h-8
                                      rounded-lg
                                      border border-rose-200
                                      bg-rose-50
                                      text-rose-600
                                      flex items-center justify-center
                                      transition-all duration-150
                                      hover:border-rose-300
                                      hover:bg-rose-100
                                      hover:text-rose-700
                                      dark:border-rose-400/20
                                      dark:bg-rose-400/10
                                      dark:text-rose-300
                                      dark:hover:border-rose-400/35
                                      dark:hover:bg-rose-400/15
                                      dark:hover:text-rose-200
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
        className={`
          user-list-card org-surface
          bg-white
          border
          rounded-xl
          shadow-sm
          overflow-hidden
          ${
            isAdmin
              ? "flex min-h-0 flex-1 flex-col"
              : ""
          }
        `}
      >
        <div
          className="
            shrink-0
            px-3 py-2.5
            border-b
            border-gray-200
            dark:border-gray-700
            flex flex-col md:flex-row
            md:items-center md:justify-between
            gap-2
          "
        >
          <div>
            <h2
              className="
                text-base font-bold
                dark:text-white
                flex items-center gap-2
              "
            >
              <Users className="w-4 h-4 text-slate-600" />

              {selectedOrg
                ? `Users in ${selectedOrg.name}`
                : "Selected Organization Users"}

              {selectedOrg && (
                <span
                  className="
                    ml-1 rounded-md
                    bg-slate-100 px-1.5 py-0.5
                    text-[9px] font-bold
                    text-slate-500
                    dark:bg-[#17233F]
                    dark:text-slate-300
                  "
                >
                  {selectedOrgUsers.length}
                </span>
              )}
            </h2>

            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {isSuperadmin
                ? "Manage roles for the selected organization. Up to 5 users are shown at once."
                : "View users in your organization and update their roles. Up to 5 users are shown at once."}
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="
                absolute left-3 top-1/2
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
                h-9
                rounded-lg
                border border-gray-300
                dark:border-gray-700
                bg-gray-50 dark:bg-gray-900
                dark:text-white
                pl-9 pr-3
                text-xs
                outline-none
                focus:ring-2 focus:ring-purple-500
              "
            />
          </div>
        </div>

        {!selectedOrg ? (
          <div
            className={`p-4 text-xs text-gray-500 dark:text-gray-400 ${
              isAdmin
                ? "flex min-h-0 flex-1 items-center justify-center text-center"
                : ""
            }`}
          >
            Please select an organization from the list above.
          </div>
        ) : selectedOrgUsers.length === 0 ? (
          <div
            className={`p-4 text-xs text-gray-500 dark:text-gray-400 ${
              isAdmin
                ? "flex min-h-0 flex-1 items-center justify-center text-center"
                : ""
            }`}
          >
            No users found in this organization.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-auto overscroll-contain">
            <table className="w-full text-xs">
              <thead
                className="
                  sticky top-0 z-20
                  bg-[#f7f9fc]
                  text-slate-500
                  dark:bg-[#0B1328]
                  dark:text-[#93A2C7]
                  uppercase text-[10px]
                "
              >
                <tr>
                  <th className="text-left px-4 py-3">
                    User
                  </th>
                  <th className="text-left px-4 py-3">
                    Current Role
                  </th>
                  <th className="text-left px-4 py-3">
                    Change Role
                  </th>
                  <th className="text-right px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
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
                        h-16
                        border-t border-slate-100
                        bg-white
                        transition-colors duration-150
                        hover:bg-cyan-50/40
                        dark:border-[#1F2D4D]
                        dark:bg-[#111B34]
                        dark:hover:bg-[#15213D]
                      "
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="
                              flex h-8 w-8 shrink-0
                              items-center justify-center
                              rounded-lg
                              bg-cyan-50
                              text-[11px] font-bold uppercase
                              text-cyan-700
                              dark:bg-cyan-400/10
                              dark:text-cyan-200
                            "
                          >
                            {String(user.username || "U")
                              .slice(0, 1)}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {user.username}
                            </div>

                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              User ID: #{user.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <span
                          className={`
                            inline-flex items-center gap-1.5
                            rounded-lg
                            border
                            px-2.5 py-1
                            text-xs font-semibold capitalize
                            ${
                              user.role === "admin"
                                ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-200"
                                : user.role === "editor"
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"
                                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-[#2C3C61] dark:bg-[#17233F] dark:text-slate-200"
                            }
                          `}
                        >
                          <ShieldCheck size={12} />
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
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
                              h-9 min-w-[118px]
                              rounded-lg
                              border border-slate-300
                              bg-white
                              px-2.5
                              text-xs font-medium
                              text-slate-700
                              outline-none
                              transition
                              focus:border-cyan-400
                              focus:ring-2 focus:ring-cyan-500/20
                              disabled:cursor-not-allowed
                              disabled:opacity-60
                              dark:border-[#2C3C61]
                              dark:bg-[#0B1328]
                              dark:text-slate-100
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

                          {isChanged && (
                            <span
                              className="
                                rounded-md
                                bg-amber-100
                                px-1.5 py-0.5
                                text-[9px] font-bold uppercase
                                tracking-wide text-amber-700
                                dark:bg-amber-400/10
                                dark:text-amber-200
                              "
                            >
                              Unsaved
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
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
                            className={`
                              inline-flex h-9
                              items-center justify-center
                              gap-1.5 rounded-lg
                              border px-3
                              text-xs font-semibold
                              transition-all duration-150
                              ${
                                isChanged && !isProtectedAdmin
                                  ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-400/15 dark:text-cyan-100 dark:hover:bg-cyan-400/20"
                                  : "border-slate-200 bg-slate-100 text-slate-400 dark:border-[#2C3C61] dark:bg-[#17233F] dark:text-slate-500"
                              }
                              disabled:cursor-not-allowed
                            `}
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
                                inline-flex h-9
                                items-center justify-center
                                gap-1.5 rounded-lg
                                border border-rose-200
                                bg-rose-50 px-3
                                text-xs font-semibold
                                text-rose-600
                                transition-all duration-150
                                hover:border-rose-300
                                hover:bg-rose-100
                                hover:text-rose-700
                                dark:border-rose-400/20
                                dark:bg-rose-400/10
                                dark:text-rose-300
                                dark:hover:border-rose-400/35
                                dark:hover:bg-rose-400/15
                                dark:hover:text-rose-200
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

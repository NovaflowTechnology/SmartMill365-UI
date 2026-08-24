import { notify } from "../utils/feedback";

export default function ProtectedRoute({ children, roles = [] }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    window.location.href = "/";
    return null;
  }

  if (roles.length && !roles.includes(role)) {
    notify("No permission", "error");
    return null;
  }

  return children;
}
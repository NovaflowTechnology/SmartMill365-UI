export default function ProtectedRoute({ children, roles = [] }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    window.location.href = "/";
    return null;
  }

  if (roles.length && !roles.includes(role)) {
    alert("No permission");
    return null;
  }

  return children;
}
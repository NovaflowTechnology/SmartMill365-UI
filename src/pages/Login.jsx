import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Login({ setPage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  //AUTO LOGIN
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setPage("dashboard");
    }
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid username or password");
      }

      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      setPage("dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT SIDE (BRANDING) */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex-col justify-center items-center p-12">
        <h1 className="text-4xl font-bold mb-4 tracking-wide">
          Sterillizer Process Monitoring System
        </h1>
        <p className="text-lg opacity-80 text-center max-w-sm">
          The real-time industrial monitoring dashboard with secure role-based access.
        </p>
      </div>

      {/* RIGHT SIDE (LOGIN) */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-100">

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-10 w-[420px]">

          {/* TITLE */}
          <h2 className="text-2xl font-semibold text-center mb-6">
            Sign in to your account
          </h2>

          {/* ERROR */}
          {error && (
            <div className="mb-4 text-sm text-red-500 text-center bg-red-100 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* USERNAME */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Username"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div className="mb-6 relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* 👁️ Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition font-medium"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {loading ? "Signing in..." : "Login"}
          </button>

          {/* FOOTER */}
          <div className="text-xs text-gray-400 text-center mt-6">
            © Novaflow Engineering Sdn. Bhd.
          </div>

        </div>

      </div>
    </div>
  );
}
import { useEffect, useState } from "react";

import {
  Eye,
  EyeOff,
  Monitor,
  Lock,
  User,
  Activity,
  Factory,
  Leaf,
} from "lucide-react";

export default function Login({
  setPage,
  fetchDefaultTemplate,
}) {
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  // AUTO LOGIN
  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (token) {
      fetchDefaultTemplate?.();
      setPage("dashboard");
    }
  }, [setPage, fetchDefaultTemplate]);

  // LOGIN
  const handleLogin = async () => {
    setError("");

    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const text = await res.text();

      let data = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "Server did not return JSON. Please check backend server."
        );
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Invalid username or password"
        );
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "role",
        data.role
      );

      localStorage.setItem(
        "org_id",
        data.org_id || ""
      );

      if (data.org_name) {
        localStorage.setItem(
          "org_name",
          data.org_name
        );
      } else {
        localStorage.removeItem(
          "org_name"
        );
      }

      localStorage.setItem(
        "favorite_template_id",
        data.favorite_template_id || ""
      );

      // IMPORTANT:
      // Fetch user's favourite/default template before opening dashboard
      await fetchDefaultTemplate?.();

      setPage("dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ENTER KEY LOGIN
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const loginDisabled =
    loading ||
    !username.trim() ||
    !password.trim();

  return (
    <div
      className="
        min-h-screen
        flex
        bg-slate-950
        overflow-hidden
      "
    >
      {/* LEFT BRANDING */}
      <div
        className="
          hidden lg:flex
          w-1/2
          relative
          text-white
          flex-col
          justify-between
          p-12
          bg-gradient-to-br
          from-slate-950
          via-emerald-950
          to-cyan-950
        "
      >
        {/* BACKGROUND DECORATION */}
        <div
          className="
            absolute -top-32 -left-32
            w-96 h-96
            rounded-full
            bg-emerald-500/20
            blur-3xl
          "
        />

        <div
          className="
            absolute bottom-10 right-10
            w-80 h-80
            rounded-full
            bg-cyan-600/20
            blur-3xl
          "
        />

        {/* SUBTLE PALM / INDUSTRIAL DECORATION */}
        <div
          className="
            absolute top-24 right-12
            text-[120px]
            opacity-[0.04]
            select-none
            pointer-events-none
          "
        >
          🌴
        </div>

        <div
          className="
            relative z-10
          "
        >
          <div
            className="
              flex items-center gap-3
              mb-10
            "
          >
            <div
              className="
                w-12 h-12
                rounded-2xl
                bg-gradient-to-br
                from-emerald-500
                to-cyan-400
                flex items-center
                justify-center
                shadow-lg shadow-emerald-500/30
              "
            >
              <Monitor className="w-7 h-7" />
            </div>

            <div>
              <h2
                className="
                  text-lg
                  font-black
                  tracking-wider
                  uppercase
                "
              >
                UI Template
                <span className="text-cyan-300">
                  {" "}
                  System
                </span>
              </h2>

              <p
                className="
                  text-xs
                  text-cyan-200/70
                "
              >
                Novaflow Technology
              </p>
            </div>
          </div>

          {/* CONTEXT BADGES */}
          <div
            className="
              flex flex-wrap gap-2
              mb-6
            "
          >
            <span
              className="
                inline-flex items-center gap-2
                text-xs font-bold
                px-3 py-1.5
                rounded-full
                bg-emerald-400/10
                text-emerald-300
                border border-emerald-400/20
              "
            >
              <Leaf size={14} />
              Palm Oil Mill
            </span>

            <span
              className="
                inline-flex items-center gap-2
                text-xs font-bold
                px-3 py-1.5
                rounded-full
                bg-cyan-400/10
                text-cyan-300
                border border-cyan-400/20
              "
            >
              <Activity size={14} />
              Smart Monitoring
            </span>

            <span
              className="
                inline-flex items-center gap-2
                text-xs font-bold
                px-3 py-1.5
                rounded-full
                bg-orange-400/10
                text-orange-300
                border border-orange-400/20
              "
            >
              <Factory size={14} />
              Sterilizer Line
            </span>
          </div>

          <h1
            className="
              text-5xl
              font-black
              leading-tight
              max-w-xl
            "
          >
            Palm Oil Mill
            <span
              className="
                block
                text-cyan-300
              "
            >
              Sterilizer Monitoring
            </span>
          </h1>

          <p
            className="
              text-base
              text-gray-300
              mt-6
              max-w-md
              leading-relaxed
            "
          >
            Real-time dashboard for monitoring sterilizer process data in palm oil mill operations, with secure role-based access and customizable UI templates.
          </p>
        </div>

        {/* FEATURE CARDS */}
        <div
          className="
            relative z-10
            grid grid-cols-3
            gap-4
          "
        >
          <div
            className="
              rounded-3xl
              bg-white/10
              border border-white/10
              backdrop-blur-xl
              p-4
            "
          >
            <Factory
              className="
                w-6 h-6
                text-orange-300
                mb-3
              "
            />

            <p
              className="
                text-sm font-bold
              "
            >
              Sterilizer
            </p>

            <p
              className="
                text-xs
                text-gray-400
                mt-1
              "
            >
              Process line
            </p>
          </div>

          <div
            className="
              rounded-3xl
              bg-white/10
              border border-white/10
              backdrop-blur-xl
              p-4
            "
          >
            <Leaf
              className="
                w-6 h-6
                text-emerald-300
                mb-3
              "
            />

            <p
              className="
                text-sm font-bold
              "
            >
              Palm Oil
            </p>

            <p
              className="
                text-xs
                text-gray-400
                mt-1
              "
            >
              Mill operation
            </p>
          </div>

          <div
            className="
              rounded-3xl
              bg-white/10
              border border-white/10
              backdrop-blur-xl
              p-4
            "
          >
            <Activity
              className="
                w-6 h-6
                text-cyan-300
                mb-3
              "
            />

            <p
              className="
                text-sm font-bold
              "
            >
              Monitoring
            </p>

            <p
              className="
                text-xs
                text-gray-400
                mt-1
              "
            >
              Live dashboard
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT LOGIN */}
      <div
        className="
          flex
          w-full lg:w-1/2
          items-center
          justify-center
          bg-gray-100
          dark:bg-gray-950
          p-6
          relative
        "
      >
        {/* MOBILE BACKGROUND */}
        <div
          className="
            lg:hidden
            absolute inset-0
            bg-gradient-to-br
            from-slate-950
            via-emerald-950
            to-cyan-950
          "
        />

        <div
          className="
            relative z-10
            w-full
            max-w-[450px]
          "
        >
          {/* MOBILE LOGO */}
          <div
            className="
              lg:hidden
              flex items-center
              justify-center
              gap-3
              mb-8
              text-white
            "
          >
            <div
              className="
                w-12 h-12
                rounded-2xl
                bg-gradient-to-br
                from-emerald-500
                to-cyan-400
                flex items-center
                justify-center
              "
            >
              <Monitor className="w-7 h-7" />
            </div>

            <div>
              <h1
                className="
                  font-black
                  uppercase
                  tracking-wide
                "
              >
                UI Template System
              </h1>

              <p
                className="
                  text-xs
                  text-gray-300
                "
              >
                Palm Oil Mill · Sterilizer System
              </p>
            </div>
          </div>

          <div
            className="
              bg-white/90
              dark:bg-gray-900/90
              backdrop-blur-xl
              rounded-[2rem]
              shadow-2xl
              border border-white/50
              dark:border-gray-800
              p-8 md:p-10
            "
          >
            {/* TITLE */}
            <div
              className="
                text-center
                mb-8
              "
            >
              <div
                className="
                  mx-auto
                  w-14 h-14
                  rounded-2xl
                  bg-emerald-600/10
                  text-emerald-600
                  flex items-center
                  justify-center
                  mb-4
                "
              >
                <Lock className="w-7 h-7" />
              </div>

              <h2
                className="
                  text-2xl
                  font-black
                  text-gray-900
                  dark:text-white
                "
              >
                Welcome Back
              </h2>

              <p
                className="
                  text-sm
                  text-gray-500
                  dark:text-gray-400
                  mt-2
                "
              >
                Sign in to access your palm oil mill monitoring dashboard
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div
                className="
                  mb-5
                  text-sm
                  text-red-600
                  bg-red-50
                  border border-red-200
                  dark:bg-red-900/20
                  dark:border-red-800
                  dark:text-red-300
                  px-4 py-3
                  rounded-2xl
                  text-center
                "
              >
                {error}
              </div>
            )}

            {/* USERNAME */}
            <div className="mb-4">
              <label
                className="
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                  dark:text-gray-300
                  mb-2
                "
              >
                Username
              </label>

              <div className="relative">
                <User
                  className="
                    absolute left-4 top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                  size={18}
                />

                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className="
                    w-full
                    pl-11 pr-4 py-3
                    border border-gray-300
                    dark:border-gray-700
                    rounded-2xl
                    bg-white
                    dark:bg-gray-950
                    text-gray-900
                    dark:text-white
                    focus:ring-2
                    focus:ring-emerald-500
                    outline-none
                  "
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="mb-6">
              <label
                className="
                  block
                  text-sm
                  font-semibold
                  text-gray-700
                  dark:text-gray-300
                  mb-2
                "
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  className="
                    absolute left-4 top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                  size={18}
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className="
                    w-full
                    pl-11 pr-12 py-3
                    border border-gray-300
                    dark:border-gray-700
                    rounded-2xl
                    bg-white
                    dark:bg-gray-950
                    text-gray-900
                    dark:text-white
                    focus:ring-2
                    focus:ring-emerald-500
                    outline-none
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="
                    absolute right-4 top-1/2
                    -translate-y-1/2
                    text-gray-400
                    hover:text-gray-700
                    dark:hover:text-white
                    transition
                  "
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* BUTTON */}
            <button
              onClick={handleLogin}
              disabled={loginDisabled}
              className="
                w-full
                flex items-center
                justify-center
                gap-2
                bg-gradient-to-r
                from-emerald-600
                to-cyan-500
                hover:from-emerald-700
                hover:to-cyan-600
                disabled:opacity-50
                disabled:cursor-not-allowed
                text-white
                py-3.5
                rounded-2xl
                transition-all
                font-bold
                shadow-lg
                shadow-emerald-500/25
              "
            >
              {loading && (
                <div
                  className="
                    w-4 h-4
                    border-2
                    border-white
                    border-t-transparent
                    rounded-full
                    animate-spin
                  "
                ></div>
              )}

              {loading
                ? "Signing in..."
                : "Login"}
            </button>

            {/* FOOTER */}
            <div
              className="
                text-xs
                text-gray-400
                text-center
                mt-8
              "
            >
              © Novaflow Engineering Sdn. Bhd.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
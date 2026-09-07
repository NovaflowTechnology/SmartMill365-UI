import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  LayoutDashboard,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  User,
  Workflow,
} from "lucide-react";
import heroVideo from "../assets/hero-video.mp4";

export default function Login({
  setPage,
  fetchDefaultTemplate,
  dark = false,
  toggleTheme,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      fetchDefaultTemplate?.();
      setPage("dashboard");
    }
  }, [setPage, fetchDefaultTemplate]);

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
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "Server did not return JSON. Please check backend server."
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Invalid username or password");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("org_id", data.org_id || "");

      if (data.org_name) {
        localStorage.setItem("org_name", data.org_name);
      } else {
        localStorage.removeItem("org_name");
      }

      localStorage.setItem(
        "favorite_template_id",
        data.favorite_template_id || ""
      );

      await fetchDefaultTemplate?.();
      setPage("dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  const loginDisabled =
    loading || !username.trim() || !password.trim();

  const featureItems = [
    {
      icon: Activity,
      label: "Real-time monitoring",
      detail: "Live industrial process data",
    },
    {
      icon: Workflow,
      label: "Process visualisation",
      detail: "Equipment and flow relationships",
    },
    {
      icon: LayoutDashboard,
      label: "Configurable dashboards",
      detail: "Reusable layouts and widgets",
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#061426] lg:grid lg:grid-cols-[minmax(0,1.38fr)_minmax(420px,0.82fr)]">
      {/* Industrial hero */}
      <section className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,16,32,0.94)_0%,rgba(5,24,48,0.72)_46%,rgba(5,24,48,0.22)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(4,16,32,0.86)_0%,transparent_52%,rgba(4,16,32,0.36)_100%)]" />

        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(55,198,239,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(55,198,239,.09) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,.72), transparent 78%)",
          }}
        />

        <div className="relative z-10 flex items-center justify-between px-10 py-8 xl:px-14">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-[#0A2747]/80 shadow-[0_0_28px_rgba(53,201,244,0.14)] backdrop-blur-md">
              <Factory size={21} className="text-cyan-300" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#071426] bg-[#EF4653]" />
            </div>

            <div>
              <p className="text-[15px] font-black uppercase tracking-[0.17em] text-white">
                Nova<span className="text-cyan-300">Flow</span>
              </p>
              <p className="mt-0.5 text-[10px] font-semibold tracking-[0.08em] text-slate-300/75">
                INDUSTRIAL MONITORING PLATFORM
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-[#071A31]/60 px-3 py-1.5 text-[10px] font-bold text-cyan-100 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(83,215,255,.8)]" />
            Smart Palm Oil Mill
          </div>
        </div>

        <div className="relative z-10 max-w-3xl px-10 pb-12 xl:px-14 xl:pb-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-9 bg-[#EF4653]" />
            <span className="h-[2px] w-9 bg-cyan-300" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Engineering intelligence into operations
            </p>
          </div>

          <h1 className="max-w-2xl text-[44px] font-black leading-[1.03] tracking-[-0.035em] text-white xl:text-[58px]">
            Smarter monitoring for
            <span className="block bg-gradient-to-r from-[#5AD9FF] to-[#5F8DFF] bg-clip-text text-transparent">
              industrial sterilizer processes.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[14px] leading-6 text-slate-200/80 xl:text-[15px]">
            Configure dashboards, connect industrial measurements and understand
            process relationships from one operational workspace.
          </p>

          <div className="mt-8 grid max-w-3xl grid-cols-3 gap-3">
            {featureItems.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="rounded-2xl border border-cyan-200/15 bg-[#071A31]/58 p-3.5 backdrop-blur-md"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <p className="text-[11px] font-black text-white">{label}</p>
                <p className="mt-1 text-[9px] leading-4 text-slate-300/65">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login panel */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EFF4F8] px-5 py-8 dark:bg-[#071426] sm:px-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-400/8" />
        <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/8" />

        <div className="relative z-10 w-full max-w-[430px]">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#235EC5] to-[#35C9F4] text-white shadow-[0_8px_24px_rgba(37,99,196,.22)]">
                <Factory size={19} />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#09264A] dark:text-white">
                  Nova<span className="text-[#1C9FD1]">Flow</span>
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Monitoring Platform
                </p>
              </div>
            </div>

            {toggleTheme && (
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-[#294764] dark:bg-[#0B2039] dark:text-slate-300"
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
          </div>

          <div className="rounded-[22px] border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_rgba(15,54,87,0.14)] backdrop-blur-xl dark:border-[#294764] dark:bg-[#0B1F38]/96 dark:shadow-[0_24px_70px_rgba(0,0,0,.35)] sm:p-9">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#A9DFF0] bg-[#E9F8FC] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#086987] dark:border-[#8ADDF4]/40 dark:bg-[#E9F8FC] dark:text-[#086987]">
                  <ShieldCheck size={13} strokeWidth={2.4} />
                  Secure access
                </div>

                <h2 className="text-[28px] font-black tracking-[-0.03em] text-[#08264A] dark:text-white">
                  Welcome back
                </h2>
                <p className="mt-2 max-w-sm text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                  Sign in to access your industrial monitoring workspace.
                </p>
              </div>

              {toggleTheme && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-[#F7FAFC] text-slate-500 hover:border-cyan-300 hover:text-[#178CB7] dark:border-[#294764] dark:bg-[#102944] dark:text-slate-300 dark:hover:text-cyan-200 lg:flex"
                  title={dark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {dark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-[#52677F] dark:text-slate-400">
                Username
              </label>

              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 w-full rounded-xl border border-[#CAD8E4] bg-[#F8FBFD] pl-10 pr-4 text-[13px] font-semibold text-[#10243D] outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[#28B8E4] focus:bg-white focus:ring-4 focus:ring-cyan-400/10 dark:border-[#294764] dark:bg-[#07182C] dark:text-white dark:focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-[#52677F] dark:text-slate-400">
                Password
              </label>

              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />

                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 w-full rounded-xl border border-[#CAD8E4] bg-[#F8FBFD] pl-10 pr-11 text-[13px] font-semibold text-[#10243D] outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-[#28B8E4] focus:bg-white focus:ring-4 focus:ring-cyan-400/10 dark:border-[#294764] dark:bg-[#07182C] dark:text-white dark:focus:border-cyan-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#177FA8] dark:hover:bg-[#17334F] dark:hover:text-cyan-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loginDisabled}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1F5DBF] via-[#247FD0] to-[#26B9E4] px-4 text-[12px] font-black text-white shadow-[0_12px_28px_rgba(31,93,191,.23)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/90 border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to dashboard
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>

            <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5 text-[9px] font-semibold text-slate-400 dark:border-[#203B58]">
              <span>NovaFlow Engineering Sdn. Bhd.</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Industrial system
              </span>
            </div>
          </div>

          <p className="mt-4 text-center text-[9px] leading-4 text-slate-400 dark:text-slate-500">
            Authorized users only · Session access is protected by role-based authentication.
          </p>
        </div>
      </section>
    </div>
  );
}

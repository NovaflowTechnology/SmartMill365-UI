import { useEffect, useState } from "react";
import { LogIn, LogOut, Monitor, ShieldAlert } from "lucide-react";
import {
  SESSION_EXPIRED_EVENT,
  clearAuthenticatedSession,
  finishReauthentication,
  hasPendingReauthentication,
  saveAuthenticatedSession,
} from "../utils/sessionAuth";

const LOGIN_URL = "http://localhost:5000/login";

export default function SessionExpiryModal({ onExitToLogin }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const showModal = () => {
      setError("");
      setPassword("");
      setOpen(true);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, showModal);

    if (hasPendingReauthentication()) {
      showModal();
    }

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, showModal);
    };
  }, []);

  const handleContinue = async (event) => {
    event.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const text = await response.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Server did not return a valid login response.");
      }

      if (!response.ok) {
        throw new Error(data?.error || "Invalid username or password.");
      }

      saveAuthenticatedSession(data);
      finishReauthentication(true);

      setPassword("");
      setError("");
      setOpen(false);
    } catch (err) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    clearAuthenticatedSession();
    finishReauthentication(false);

    setPassword("");
    setError("");
    setOpen(false);

    onExitToLogin?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#041426]/92 p-4 backdrop-blur-sm">
      <div className="absolute left-5 top-5 z-20 flex items-center gap-3 sm:left-7 sm:top-7">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_8px_24px_rgba(53,201,244,0.16)]">
          <Monitor size={19} strokeWidth={2} />
        </div>

        <div>
          <div className="text-[13px] font-black uppercase leading-[1.05] tracking-[0.04em] text-white">
            UI Template
            <span className="text-cyan-300"> System</span>
          </div>
          <div className="mt-1 text-[9px] font-medium tracking-wide text-slate-400">
            Novaflow Technology
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(53,201,244,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(53,201,244,0.055) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 22%, rgba(47,121,211,0.18), transparent 32%), radial-gradient(circle at 82% 76%, rgba(53,201,244,0.12), transparent 30%), linear-gradient(135deg, rgba(6,20,38,0.2), rgba(11,31,56,0.7))",
          }}
        />

        <div className="absolute left-[8%] top-[16%] h-40 w-40 rounded-full border border-cyan-300/10" />
        <div className="absolute left-[11%] top-[19%] h-28 w-28 rounded-full border border-cyan-300/[0.06]" />
        <div className="absolute bottom-[13%] right-[9%] h-52 w-52 rounded-full border border-blue-300/[0.07]" />

        <div className="absolute left-[14%] top-[48%] h-px w-[22%] bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent" />
        <div className="absolute right-[12%] top-[34%] h-px w-[18%] bg-gradient-to-r from-transparent via-blue-300/10 to-transparent" />

        <div className="absolute left-[16%] top-[47.5%] h-2 w-2 rounded-full bg-cyan-300/20 shadow-[0_0_22px_rgba(53,201,244,0.22)]" />
        <div className="absolute right-[17%] top-[33.5%] h-2 w-2 rounded-full bg-blue-300/15 shadow-[0_0_22px_rgba(47,121,211,0.2)]" />
      </div>

      <div className="relative z-10 flex min-h-full items-center justify-center">
        <div
          className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#294764] dark:bg-[#0B1F38]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
      >
        <div className="border-b border-slate-200 px-5 py-5 dark:border-[#24435F]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#168BB4] dark:bg-cyan-300/10 dark:text-cyan-200">
              <ShieldAlert size={20} />
            </div>

            <div>
              <h2
                id="session-expired-title"
                className="text-base font-black text-slate-900 dark:text-white"
              >
                Session expired
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Sign in again to continue on this page. Your current page will
                remain open while you re-authenticate.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleContinue} className="space-y-4 p-5">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Username
            </span>
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-[#294764] dark:bg-[#07182C] dark:text-white"
              placeholder="Enter username"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-[#294764] dark:bg-[#07182C] dark:text-white"
              placeholder="Enter password"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleExit}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-[#294764] dark:text-slate-300 dark:hover:bg-[#123452]"
            >
              <LogOut size={15} />
              Exit to Login
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#245EC5] to-[#35C9F4] px-4 text-xs font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={15} />
              {loading ? "Signing in..." : "Sign In & Continue"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import {
  consumePendingToasts,
  TOAST_DURATION_MS,
  TOAST_FADE_MS,
} from "../utils/feedback";

const TYPE_STYLE = {
  success: {
    icon: CheckCircle2,
    accent:
      "text-cyan-600 dark:text-[#58D7FF]",
    border:
      "border-cyan-200 dark:border-[#58D7FF]/25",
  },
  warning: {
    icon: AlertTriangle,
    accent:
      "text-amber-600 dark:text-[#FFD66B]",
    border:
      "border-amber-200 dark:border-[#FFD66B]/25",
  },
  error: {
    icon: XCircle,
    accent:
      "text-rose-600 dark:text-[#FF9AAE]",
    border:
      "border-rose-200 dark:border-[#FF6F88]/25",
  },
  info: {
    icon: Info,
    accent:
      "text-indigo-600 dark:text-[#7D75E7]",
    border:
      "border-indigo-200 dark:border-[#7D75E7]/25",
  },
};

export default function AppFeedback() {
  const [toasts, setToasts] = useState(
    consumePendingToasts
  );
  const [exitingToastIds, setExitingToastIds] = useState(() => new Set());
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    window.__appFeedbackReady = true;

    const onToast = (event) => {
      const toast = event.detail;
      if (!toast?.id) return;

      setToasts((current) => [
        ...current,
        toast,
      ]);
    };

    const onConfirm = (event) => {
      if (!event.detail) return;
      setConfirmation(event.detail);
    };

    window.addEventListener("app:toast", onToast);
    window.addEventListener("app:confirm", onConfirm);

    return () => {
      window.__appFeedbackReady = false;
      window.removeEventListener("app:toast", onToast);
      window.removeEventListener("app:confirm", onConfirm);
    };
  }, []);

  useEffect(() => {
    if (!toasts.length) return undefined;

    const now = Date.now();
    const timers = [];

    toasts.forEach((toast) => {
      const createdAt = Number(toast.createdAt) || now;
      const duration = Number(toast.duration) || TOAST_DURATION_MS;
      const fadeAt = createdAt + Math.max(0, duration - TOAST_FADE_MS);
      const removeAt = createdAt + duration;

      timers.push(
        window.setTimeout(() => {
          setExitingToastIds((current) => {
            const next = new Set(current);
            next.add(toast.id);
            return next;
          });
        }, Math.max(0, fadeAt - Date.now()))
      );

      timers.push(
        window.setTimeout(() => {
          setToasts((current) =>
            current.filter((item) => item.id !== toast.id)
          );

          setExitingToastIds((current) => {
            const next = new Set(current);
            next.delete(toast.id);
            return next;
          });
        }, Math.max(0, removeAt - Date.now()))
      );
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  useEffect(() => {
    if (!confirmation) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;

      confirmation.resolve?.(false);
      setConfirmation(null);
    };

    window.addEventListener("keydown", onKeyDown);

    return () =>
      window.removeEventListener("keydown", onKeyDown);
  }, [confirmation]);

  const confirmTone = useMemo(() => {
    if (confirmation?.tone === "danger") {
      return {
        button:
          "bg-rose-600 hover:bg-rose-700 dark:bg-[#FF6F88]/90 dark:hover:bg-[#FF6F88]",
        icon:
          "text-rose-600 dark:text-[#FF9AAE]",
      };
    }

    return {
      button:
        "bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400",
      icon:
        "text-cyan-600 dark:text-[#58D7FF]",
    };
  }, [confirmation?.tone]);

  const finishConfirmation = (result) => {
    confirmation?.resolve?.(result);
    setConfirmation(null);
  };

  const dismissToast = (toastId) => {
    setExitingToastIds((current) => {
      const next = new Set(current);
      next.add(toastId);
      return next;
    });

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((item) => item.id !== toastId)
      );

      setExitingToastIds((current) => {
        const next = new Set(current);
        next.delete(toastId);
        return next;
      });
    }, TOAST_FADE_MS);
  };

  return (
    <>
      <style>{`
        .app-feedback-toast {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition:
            opacity ${TOAST_FADE_MS}ms ease,
            transform ${TOAST_FADE_MS}ms ease;
          animation: app-feedback-toast-in 180ms ease-out;
        }

        .app-feedback-toast.is-exiting {
          opacity: 0;
          transform: translateY(-8px) scale(0.985);
        }

        @keyframes app-feedback-toast-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .app-feedback-toast {
            animation: none;
            transition: opacity ${TOAST_FADE_MS}ms linear;
          }
        }
      `}</style>

      <div
        className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const style =
            TYPE_STYLE[toast.type] || TYPE_STYLE.info;
          const ToastIcon = style.icon;

          return (
            <div
              key={toast.id}
              className={`
                app-feedback-toast
                ${exitingToastIds.has(toast.id) ? "is-exiting" : ""}
                pointer-events-auto
                flex items-start gap-3
                rounded-xl border
                bg-white/95 p-3
                shadow-[0_16px_38px_rgba(15,23,42,0.16)]
                backdrop-blur-xl
                dark:bg-[#111B34]/96
                dark:shadow-[0_18px_42px_rgba(2,6,23,0.48)]
                ${style.border}
              `}
            >
              <div
                className={`mt-0.5 shrink-0 ${style.accent}`}
              >
                <ToastIcon size={17} />
              </div>

              <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-slate-700 dark:text-[#D7E0F5]">
                {toast.message}
              </p>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#1B2948] dark:hover:text-slate-100"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {confirmation && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              finishConfirmation(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#2C3C61] dark:bg-[#111B34] dark:text-[#E8EDFF]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#17233F] ${confirmTone.icon}`}
              >
                <AlertTriangle size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  id="app-confirm-title"
                  className="text-sm font-black text-slate-900 dark:text-[#E8EDFF]"
                >
                  {confirmation.title}
                </h3>

                <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-slate-500 dark:text-[#AAB7D4]">
                  {confirmation.message}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => finishConfirmation(false)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-[#2C3C61] dark:bg-[#15213D] dark:text-[#C8D1EA] dark:hover:bg-[#1B2948]"
              >
                {confirmation.cancelLabel}
              </button>

              <button
                type="button"
                onClick={() => finishConfirmation(true)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-sm transition ${confirmTone.button}`}
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

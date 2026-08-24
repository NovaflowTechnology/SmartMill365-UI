let legacyAlertInstalled = false;
const pendingToasts = [];

const inferType = (message = "") => {
  const text = String(message).toLowerCase();

  if (
    text.includes("❌") ||
    text.includes("error") ||
    text.includes("failed") ||
    text.includes("cannot") ||
    text.includes("no permission")
  ) {
    return "error";
  }

  if (
    text.includes("⚠") ||
    text.includes("warning") ||
    text.includes("already") ||
    text.includes("please select") ||
    text.includes("required")
  ) {
    return "warning";
  }

  if (
    text.includes("✅") ||
    text.includes("success") ||
    text.includes("updated") ||
    text.includes("created") ||
    text.includes("assigned") ||
    text.includes("removed")
  ) {
    return "success";
  }

  return "info";
};

const cleanMessage = (message) =>
  String(message ?? "")
    .replace(/^[\s⭐✅❌⚠️]+/u, "")
    .trim();

export const notify = (message, type = null) => {
  if (typeof window === "undefined") return;

  const detail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: cleanMessage(message) || "Notification",
    type: type || inferType(message),
  };

  if (window.__appFeedbackReady) {
    window.dispatchEvent(
      new CustomEvent("app:toast", {
        detail,
      })
    );
  } else {
    pendingToasts.push(detail);
  }
};

export const consumePendingToasts = () => pendingToasts.splice(0);

export const installLegacyAlertBridge = () => {
  if (
    typeof window === "undefined" ||
    legacyAlertInstalled
  ) {
    return;
  }

  legacyAlertInstalled = true;

  // Preserve the native function only for debugging. The app deliberately
  // does not use it for user feedback so the browser never shows
  // "localhost says..." dialogs.
  if (!window.__nativeAlert) {
    window.__nativeAlert = window.alert?.bind(window);
  }

  window.alert = (message) => {
    notify(message);
  };
};

export const confirmAction = ({
  title = "Confirm action",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
} = {}) =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const detail = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      confirmLabel,
      cancelLabel,
      tone,
      resolve,
    };

    window.dispatchEvent(
      new CustomEvent("app:confirm", {
        detail,
      })
    );
  });

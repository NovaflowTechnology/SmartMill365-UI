let legacyAlertInstalled = false;
const pendingToasts = [];

export const TOAST_DURATION_MS = 5000;
export const TOAST_FADE_MS = 300;

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
    .replace(/^(?:\s|⭐|✅|❌|⚠️)+/u, "")
    .trim();

export const notify = (message, type = null) => {
  if (typeof window === "undefined") return;

  const detail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: cleanMessage(message) || "Notification",
    type: type || inferType(message),
    createdAt: Date.now(),
    duration: TOAST_DURATION_MS,
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

export const installLegacyDialogGuards = () => {
  if (
    typeof window === "undefined" ||
    legacyAlertInstalled
  ) {
    return;
  }

  legacyAlertInstalled = true;

  // Last-resort safety net. All known source usages are migrated to notify()
  // and confirmAction(), but these guards prevent a future legacy call from
  // reopening a browser "localhost says..." dialog.
  window.alert = (message) => {
    notify(message);
  };

  window.confirm = (message) => {
    console.error(
      "Native window.confirm() was blocked. Use confirmAction() instead.",
      message
    );

    notify(
      "A legacy browser confirmation was blocked. This action needs confirmAction().",
      "warning"
    );

    // Returning false is the safest fallback for an unmigrated destructive
    // action. It prevents the action from continuing silently.
    return false;
  };

  window.prompt = (message) => {
    console.error(
      "Native window.prompt() was blocked. Use an in-app form instead.",
      message
    );

    notify(
      "A legacy browser prompt was blocked. Use an in-app input instead.",
      "warning"
    );

    return null;
  };
};

// Backward-compatible name used by older App.jsx versions.
export const installLegacyAlertBridge = installLegacyDialogGuards;

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

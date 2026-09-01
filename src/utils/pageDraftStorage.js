const DRAFT_PREFIX = "gridlayout:draft:v1";

const getLocalStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const buildPageDraftKey = (pageName, identity = "default") =>
  `${DRAFT_PREFIX}:${String(pageName || "page")}:${String(identity || "default")}`;

const parseDraft = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed.data && typeof parsed.data === "object" ? parsed.data : null;
  } catch {
    return null;
  }
};

export const readPageDraft = (key) => {
  const local = getLocalStorage();
  const session = getSessionStorage();

  const localDraft = parseDraft(local?.getItem(key));
  if (localDraft) return localDraft;

  return parseDraft(session?.getItem(key));
};

export const writePageDraft = (key, data) => {
  if (!key || !data || typeof data !== "object") return false;

  const payload = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    data,
  });

  const local = getLocalStorage();
  const session = getSessionStorage();

  try {
    local?.setItem(key, payload);
    // If a previous quota fallback exists, keep only the persistent copy.
    try {
      session?.removeItem(key);
    } catch {
      // ignore
    }
    return true;
  } catch (error) {
    // Large image/widget drafts can exceed localStorage quota. Falling back to
    // sessionStorage still preserves the draft across SPA navigation + refresh.
    try {
      session?.setItem(key, payload);
      console.warn("Draft stored in sessionStorage because localStorage was unavailable/quota-limited.", error);
      return true;
    } catch (sessionError) {
      console.warn("Unable to persist page draft.", sessionError);
      return false;
    }
  }
};

export const clearPageDraft = (key) => {
  const local = getLocalStorage();
  const session = getSessionStorage();

  try {
    local?.removeItem(key);
  } catch {
    // ignore
  }

  try {
    session?.removeItem(key);
  } catch {
    // ignore
  }
};

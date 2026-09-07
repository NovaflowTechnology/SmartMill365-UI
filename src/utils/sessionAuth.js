export const SESSION_EXPIRED_EVENT = "gridlayout:session-expired";
export const SESSION_UPDATED_EVENT = "gridlayout:session-updated";

let installed = false;
let nativeFetch = null;
let pendingReauthentication = null;
let resolvePendingReauthentication = null;
let expiryTimer = null;

const AUTH_STORAGE_KEYS = [
  "token",
  "role",
  "org_id",
  "org_name",
  "favorite_template_id",
];

const getRequestUrl = (input) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }
  return "";
};

const isLoginRequest = (input) => {
  const url = getRequestUrl(input);

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname === "/login";
  } catch {
    return /(^|\/)login(?:\?|#|$)/i.test(url);
  }
};

const getCombinedHeaders = (input, init) => {
  const headers = new Headers();

  if (typeof Request !== "undefined" && input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
};

const hasAuthorizationHeader = (input, init) =>
  getCombinedHeaders(input, init).has("Authorization");

const applyLatestToken = (input, init) => {
  const token = localStorage.getItem("token");
  const headers = getCombinedHeaders(input, init);

  if (token) {
    headers.set("Authorization", token);
  }

  return {
    input,
    init: {
      ...(init || {}),
      headers,
    },
  };
};

const makeSessionEndedResponse = () =>
  new Response(
    JSON.stringify({
      error: "Session ended. Please sign in again.",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

export const getTokenExpiryTime = (token = localStorage.getItem("token")) => {
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const normalized = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    const payload = JSON.parse(atob(padded));

    if (!Number.isFinite(Number(payload?.exp))) {
      return null;
    }

    return Number(payload.exp) * 1000;
  } catch {
    return null;
  }
};

export const isTokenExpired = (
  token = localStorage.getItem("token"),
  leewayMs = 500
) => {
  const expiryTime = getTokenExpiryTime(token);

  if (!token) return true;
  if (!expiryTime) return false;

  return Date.now() >= expiryTime - leewayMs;
};

export const hasPendingReauthentication = () =>
  Boolean(pendingReauthentication);

const scheduleSessionExpiry = () => {
  if (expiryTimer) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  const token = localStorage.getItem("token");
  const expiryTime = getTokenExpiryTime(token);

  if (!token || !expiryTime) {
    return;
  }

  const delay = expiryTime - Date.now();

  expiryTimer = window.setTimeout(() => {
    requestReauthentication("expired");
  }, Math.max(0, delay + 100));
};

export const requestReauthentication = (reason = "expired") => {
  if (pendingReauthentication) {
    return pendingReauthentication;
  }

  pendingReauthentication = new Promise((resolve) => {
    resolvePendingReauthentication = resolve;
  });

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { reason },
    })
  );

  return pendingReauthentication;
};

export const finishReauthentication = (success) => {
  const resolver = resolvePendingReauthentication;

  pendingReauthentication = null;
  resolvePendingReauthentication = null;

  resolver?.(Boolean(success));

  if (success) {
    scheduleSessionExpiry();
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
};

export const saveAuthenticatedSession = (data) => {
  if (!data?.token) {
    throw new Error("Login response did not include an authentication token.");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role || "");
  localStorage.setItem("org_id", data.org_id || "");
  localStorage.setItem(
    "favorite_template_id",
    data.favorite_template_id || ""
  );

  if (data.org_name) {
    localStorage.setItem("org_name", data.org_name);
  } else {
    localStorage.removeItem("org_name");
  }
};

export const clearAuthenticatedSession = () => {
  if (expiryTimer) {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const installAuthFetchInterceptor = () => {
  if (installed || typeof window === "undefined" || !window.fetch) {
    return;
  }

  installed = true;
  nativeFetch = window.fetch.bind(window);
  scheduleSessionExpiry();

  window.fetch = async (input, init) => {
    const protectedRequest =
      !isLoginRequest(input) && hasAuthorizationHeader(input, init);

    if (!protectedRequest) {
      return nativeFetch(input, init);
    }

    scheduleSessionExpiry();

    const token = localStorage.getItem("token");

    if (token && isTokenExpired(token)) {
      const reauthenticated = await requestReauthentication("expired");

      if (!reauthenticated) {
        return makeSessionEndedResponse();
      }
    }

    const retryInput =
      typeof Request !== "undefined" && input instanceof Request
        ? input.clone()
        : input;

    const firstRequest = applyLatestToken(input, init);
    const response = await nativeFetch(firstRequest.input, firstRequest.init);

    if (response.status !== 401) {
      return response;
    }

    const reauthenticated = await requestReauthentication("unauthorized");

    if (!reauthenticated) {
      return response;
    }

    const retryRequest = applyLatestToken(retryInput, init);
    return nativeFetch(retryRequest.input, retryRequest.init);
  };
};

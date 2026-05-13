const TOKEN_KEY = "token";
const USER_KEY = "user";
const LAST_ACTIVITY_KEY = "lastActivityAt";
const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000;

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);

export const saveSession = ({ token, user } = {}) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  markActivity();
};

export const decodeToken = (token = getToken()) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

export const markActivity = () => {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};

export const clearSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

export const hasActiveSession = (role) => {
  const token = getToken();
  const payload = decodeToken(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
  if (role && payload.role !== role) return false;

  const lastActivity = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
  if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) return false;
  return true;
};

export const authHeaders = () => {
  if (getToken()) markActivity();
  return {
    headers: { Authorization: `Bearer ${getToken()}` },
  };
};

export const authFetchOptions = (options = {}) => {
  if (getToken()) markActivity();
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${getToken()}`,
    },
  };
};

export const isAuthExpiredResponse = (errorOrResponse) => {
  const status = errorOrResponse?.response?.status ?? errorOrResponse?.status;
  return status === 401;
};

export const installActivityTracker = (onInactive, role) => {
  const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
  const onActivity = () => markActivity();
  events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
  const interval = window.setInterval(() => {
    if (!hasActiveSession(role)) onInactive?.();
  }, 60 * 1000);

  markActivity();

  return () => {
    events.forEach((event) => window.removeEventListener(event, onActivity));
    window.clearInterval(interval);
  };
};

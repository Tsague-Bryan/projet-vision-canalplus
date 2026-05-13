export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const SERVER_URL = API_URL.endsWith("/api")
  ? API_URL.slice(0, -4)
  : API_URL;

export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || SERVER_URL).replace(/\/$/, "");

export const apiUrl = (path = "") => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const serverUrl = (path = "") => `${SERVER_URL}${path.startsWith("/") ? path : `/${path}`}`;

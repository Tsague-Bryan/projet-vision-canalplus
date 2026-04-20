import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
 
export function useAuth() {
  const navigate = useNavigate();
 
  // Décoder le token JWT sans librairie
  const decodeToken = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64    = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(base64));
    } catch {
      return null;
    }
  };
 
  const isTokenValid = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    const decoded = decodeToken(token);
    if (!decoded) return false;
    // exp est en secondes, Date.now() en ms
    return decoded.exp * 1000 > Date.now();
  }, []);
 
  const logout = useCallback((message = "") => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (message) alert(message);
    navigate("/LoginForm");
  }, [navigate]);
 
  // Vérifier au montage
  useEffect(() => {
    if (!isTokenValid()) {
      logout();
    }
  }, [isTokenValid, logout]);
 
  // Wrapper fetch qui gère l'expiration automatiquement
  const apiCall = useCallback(async (url, options = {}) => {
    if (!isTokenValid()) {
      logout("Votre session a expiré. Veuillez vous reconnecter.");
      throw new Error("Token expiré");
    }
 
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
 
    if (res.status === 401) {
      logout("Votre session a expiré. Veuillez vous reconnecter.");
      throw new Error("Non autorisé");
    }
 
    return res;
  }, [isTokenValid, logout]);
 
  // Wrapper axios-compatible (retourne les data directement)
  const apiFetch = useCallback(async (url, options = {}) => {
    const res  = await apiCall(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Erreur ${res.status}`);
    return data;
  }, [apiCall]);
 
  return { apiCall, apiFetch, logout, isTokenValid };
}
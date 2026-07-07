import { useState, useEffect, useRef } from "react";
import { FaBell, FaBars } from "react-icons/fa";
import { createAppSocket } from "../lib/socket";
import { API_URL } from "../lib/api";
import { authFetchOptions } from "../lib/session";
import { notifyUser, requestNotificationPermission } from "../lib/notifications";

function AdminNavbar({ pageTitle, toggleSidebar }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/notifications`, authFetchOptions());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur fetch notifications :", error);
    }
  };

  const clearNotifications = async () => {
    try {
      await fetch(`${API_URL}/admin/notifications`, {
        method: "DELETE",
        ...authFetchOptions(),
      });
      setNotifications([]);
      setShowDropdown(false);
    } catch (error) {
      console.error("Erreur suppression notifications :", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    socketRef.current = createAppSocket();
    socketRef.current.on("connect", () => {
      console.log("Socket connecté :", socketRef.current.id);
    });
    socketRef.current.on("new_notification", () => {
      fetchNotifications();
      notifyUser({ title: "Vision Canal+ Admin", body: "Nouvelle notification admin" });
    });
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 sticky top-0 z-20 shadow-sm">
      <button
        onClick={toggleSidebar}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <FaBars size={20} />
      </button>

      <h1 className="text-sm font-bold text-foreground flex-1">{pageTitle}</h1>

      <div className="relative">
        <button
          className="relative text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { requestNotificationPermission(); setShowDropdown((v) => !v); }}
        >
          <FaBell size={20} />
          {notifications.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-card shadow-xl rounded-lg overflow-hidden z-50 border border-border">
            <div className="px-4 py-3 font-semibold text-sm border-b border-border flex items-center justify-between">
              <span className="text-foreground">Notifications</span>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold">
                    {notifications.length} nouvelle{notifications.length > 1 ? "s" : ""}
                  </span>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Aucune notification
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif, index) => (
                  <div
                    key={notif.id ?? index}
                    className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                  >
                    <div className="text-sm text-foreground">{notif.message}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleString("fr-FR")
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default AdminNavbar;

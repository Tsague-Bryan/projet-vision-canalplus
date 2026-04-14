import { useState, useEffect, useRef } from "react";
import { FaBell, FaBars } from "react-icons/fa";
import { io } from "socket.io-client";

function AdminNavbar({ pageTitle, toggleSidebar }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  // Le socket est créé UNE seule fois via useRef, pas au niveau module
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/notifications");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur fetch notifications :", error);
    }
  };

  const clearNotifications = async () => {
    try {
      await fetch("http://localhost:5000/api/admin/notifications", {
        method: "DELETE",
      });
      setNotifications([]);
      setShowDropdown(false);
    } catch (error) {
      console.error("Erreur suppression notifications :", error);
    }
  };

  useEffect(() => {
    // Chargement immédiat
    fetchNotifications();

    // Polling toutes les 15 secondes
    const interval = setInterval(fetchNotifications, 15000);

    // Créer le socket une seule fois
    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connecté :", socketRef.current.id);
    });

    // À la réception d'une notif socket : on re-fetch la BDD
    // pour avoir les données complètes (id, created_at, message)
    socketRef.current.on("new_notification", () => {
      fetchNotifications();
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
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-20 shadow-sm">
      <button
        onClick={toggleSidebar}
        className="text-gray-500 hover:text-gray-800 transition-colors"
      >
        <FaBars size={20} />
      </button>

      <h1 className="text-sm font-bold text-gray-900 flex-1">{pageTitle}</h1>

      <div className="relative">
        <button
          className="relative text-gray-500 hover:text-gray-800 transition-colors"
          onClick={() => setShowDropdown((v) => !v)}
        >
          <FaBell size={20} />
          {notifications.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-2xl overflow-hidden z-50 border border-gray-100">
            <div className="px-4 py-3 font-semibold text-sm border-b border-gray-50 flex items-center justify-between">
              <span>Notifications</span>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                    {notifications.length} nouvelle{notifications.length > 1 ? "s" : ""}
                  </span>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">
                Aucune notification
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif, index) => (
                  <div
                    key={notif.id ?? index}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <div className="text-sm text-gray-800">{notif.message}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleString("fr-FR")
                        : "—"}
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
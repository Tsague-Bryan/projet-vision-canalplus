import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

// Liste mise à jour avec "Décodeurs"
const navItems = [
  { id: "accueil",      label: "retour a l'acceuil",      path: "/partner/dashboard" },
];

const IconHome   = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
);
const IconTrans  = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M13 4l-2 16" />
  </svg>
);
const IconStats  = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15" rx="2" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);
// ✅ AJOUT DE L'ICONE DÉCODEUR
const IconDecoder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);
const IconCog    = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9" />
  </svg>
);

// Liste des icônes alignée avec navItems
const navIcons = [IconHome, IconTrans, IconStats, IconWallet, IconDecoder, IconCog];

export default function PartnerLayout({ children }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/LoginForm");
  };
  return (
    <div className="min-h-screen bg-background flex" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-card border-r border-border sticky top-0 shadow-sm">
        <div className="flex flex-col items-center py-8 px-4 border-b border-border">
          <button onClick={() => navigate("/partner/dashboard")} className="hover:opacity-80 transition-opacity">
            <img src={logo} alt="Vision Canal" className="h-16 w-16 rounded-2xl object-contain" />
          </button>
          <p className="mt-3 font-semibold text-foreground text-sm">Partenaire</p>
          <p className="text-xs text-muted-foreground mt-0.5">Vision Canal+</p>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ id, label, path }, i) => {
            const Icon = navIcons[i];
            return (
              <button key={id} onClick={() => navigate(path)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all text-left">
                <Icon />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border sticky bottom-0 bg-card">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-card border-b border-border shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <button onClick={() => navigate("/partner/dashboard")}>
              <img src={logo} alt="Vision Canal" className="h-9 w-9 rounded-xl object-contain" />
            </button>
            <p className="font-semibold text-foreground text-sm flex-1">Vision Canal+</p>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8 pb-24 lg:pb-8">
          {children}
        </main>

        {/* Barre de navigation mobile : Statistiques excluses pour garder l'écran aéré */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around bg-card border-t border-border pt-2.5 pb-5">
          {navItems.filter(({ id }) => id !== "statistiques").map(({ id, label, path }, i) => {
            // Trouver l'index correct pour l'icône car le filtre peut décaler les index
            const originalIndex = navItems.findIndex(item => item.id === id);
            const Icon = navIcons[originalIndex];
            
            return (
              <button key={id} onClick={() => navigate(path)} className="flex flex-col items-center gap-1 flex-1">
                {Icon()}
                <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
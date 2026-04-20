// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home              from "./pages/Home";
import About             from "./pages/About";
import InscriptionPartenaire from "./pages/Inscription";
import LoginForm         from "./pages/LoginForm";
import Services          from "./pages/Services";
import Dashboard         from "./components/Dashboard";
import PartnersDashboard from "./pages/PartnersDashboard";
import AdminDashboard    from "./pages/AdminDashboard";
import Boutique          from "./pages/Boutique";
import Reabonnements     from "./pages/Reabonnements";
import Abonnements       from "./pages/Abonnements";
import PartnerLayout     from "./components/PartnerLayout";

// ── Garde de route : redirige si pas connecté ─────────────────────────────────
function RequireAuth({ children, role }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/LoginForm" replace />;

  // Décoder le rôle depuis le JWT
  try {
    const payload = JSON.parse(window.atob(token.split(".")[1]));
    // Token expiré ?
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return <Navigate to="/LoginForm" replace />;
    }
    // Mauvais rôle ?
    if (role && payload.role !== role) {
      return <Navigate to="/LoginForm" replace />;
    }
  } catch {
    localStorage.removeItem("token");
    return <Navigate to="/LoginForm" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"            element={<LoginForm />} />
        <Route path="/LoginForm"   element={<LoginForm />} />
        <Route path="/Inscription" element={<InscriptionPartenaire />} />
        <Route path="/about"       element={<About />} />
        <Route path="/services"    element={<Services />} />
        <Route path="/Dashboard"   element={<Dashboard />} />

        {/* ── Admin ── */}
        <Route path="/admin/dashboard" element={
          <RequireAuth role="admin"><AdminDashboard /></RequireAuth>
        } />

        {/* ── Partenaire ── */}
        <Route path="/partner/dashboard" element={
          <RequireAuth role="partner"><PartnersDashboard /></RequireAuth>
        } />

        {/* ── Pages partenaire avec sidebar ── */}
        <Route path="/reabonnement" element={
          <RequireAuth role="partner">
            <PartnerLayout><Reabonnements /></PartnerLayout>
          </RequireAuth>
        } />
        <Route path="/abonnements" element={
          <RequireAuth role="partner">
            <PartnerLayout><Abonnements /></PartnerLayout>
          </RequireAuth>
        } />
        {/*  Boutique aussi dans PartnerLayout */}
        <Route path="/boutique" element={
          <RequireAuth role="partner">
            <PartnerLayout><Boutique /></PartnerLayout>
          </RequireAuth>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/LoginForm" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
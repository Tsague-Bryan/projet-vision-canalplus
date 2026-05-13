import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import InscriptionPartenaire from "./pages/Inscription";
import LoginForm from "./pages/LoginForm";
import Services from "./pages/Services";
import Dashboard from "./components/Dashboard";
import PartnersDashboard from "./pages/PartnersDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Boutique from "./pages/Boutique";
import Reabonnements from "./pages/Reabonnements";
import Abonnements from "./pages/Abonnements";
import PartnerLayout from "./components/PartnerLayout";
import { clearSession, hasActiveSession } from "./lib/session";

function RequireAuth({ children, role }) {
  if (!hasActiveSession(role)) {
    clearSession();
    return <Navigate to="/LoginForm" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/LoginForm" element={<LoginForm />} />
        <Route path="/Inscription" element={<InscriptionPartenaire />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/Dashboard" element={<Dashboard />} />

        <Route path="/admin/dashboard" element={
          <RequireAuth role="admin"><AdminDashboard /></RequireAuth>
        } />

        <Route path="/partner/dashboard" element={
          <RequireAuth role="partner"><PartnersDashboard /></RequireAuth>
        } />

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
        <Route path="/boutique" element={
          <RequireAuth role="partner">
            <PartnerLayout><Boutique /></PartnerLayout>
          </RequireAuth>
        } />

        <Route path="*" element={<Navigate to="/LoginForm" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
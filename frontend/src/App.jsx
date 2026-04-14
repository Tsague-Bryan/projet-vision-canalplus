import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import About from "./pages/About"
import InscriptionPartenaire from "./pages/Inscription"
import LoginForm from "./pages/LoginForm";
import Services from "./pages/Services";
import Dashboard from "./components/Dashboard";
import PartnersDashboard from "./pages/PartnersDashboard"
import AdminDashboard from "./pages/AdminDashboard";
import Boutique from "./pages/Boutique";
import Reabonnements from "./pages/Reabonnements";
import Abonnements from "./pages/Abonnements"; // ✅ AJOUT

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/about" element={<About />} />
        <Route path="/Inscription" element={<InscriptionPartenaire />} />
        <Route path="/LoginForm" element={<LoginForm />} />
        <Route path="/services" element={<Services />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/boutique" element={<Boutique />} />
        <Route path="/partner/dashboard" element={<PartnersDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/reabonnement" element={<Reabonnements />} />

        {/* ✅ NOUVELLE ROUTE */}
        <Route path="/abonnements" element={<Abonnements />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
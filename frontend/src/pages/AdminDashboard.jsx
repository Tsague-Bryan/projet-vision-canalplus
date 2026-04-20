import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminNavbar from "../components/AdminNavbar";
import CommissionChart from "../components/CommissionChart";

const API        = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

// ── Helpers token ─────────────────────────────────────────────────────────────
const getToken  = () => localStorage.getItem("token");
const authHdr   = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });
const isExpired = () => {
  const t = getToken(); if (!t) return true;
  try { return JSON.parse(window.atob(t.split(".")[1])).exp * 1000 < Date.now(); }
  catch { return true; }
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons = {
  dashboard:  ["M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"],
  partners:   ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  stats:      ["M18 20V10","M12 20V4","M6 20v-6"],
  wallet:     ["M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z","M1 10h22"],
  logout:     ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"],
  plus:       ["M12 5v14","M5 12h14"],
  search:     ["M21 21l-4.35-4.35","M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"],
  edit:       ["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7","M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"],
  trash:      ["M3 6h18","M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6","M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"],
  check:      ["M20 6L9 17l-5-5"],
  x:          ["M18 6L6 18","M6 6l12 12"],
  refresh:    ["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"],
  creditcard: ["M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z","M1 10h22"],
  bell:       ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"],
  chevronL:   ["M15 18l-6-6 6-6"],
  chevronR:   ["M9 18l6-6-6-6"],
  close:      ["M18 6L6 18","M6 6l12 12"],
  recharges:  ["M12 2v20","M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  commission: ["M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z","M12 6v2","M12 16v2","M8.5 8.5l1.5 1.5","M14 14l1.5 1.5","M6 12h2","M16 12h2","M8.5 15.5l1.5-1.5","M14 10l1.5-1.5"],
};
const Icon = ({ name, size=18, className="" }) => {
  const d = icons[name]; if (!d) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{d.map((pd,i)=><path key={i} d={pd}/>)}</svg>;
};

// ── UI Components ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    approved:   { label:"Validé",     cls:"bg-green-100 text-green-700 border-green-200"  },
    pending:    { label:"En attente", cls:"bg-amber-100 text-amber-700 border-amber-200"  },
    rejected:   { label:"Rejeté",     cls:"bg-red-100 text-red-600 border-red-200"        },
    en_attente: { label:"En attente", cls:"bg-amber-100 text-amber-700 border-amber-200"  },
    validee:    { label:"Validée",    cls:"bg-green-100 text-green-700 border-green-200"  },
    rejetee:    { label:"Rejetée",    cls:"bg-red-100 text-red-600 border-red-200"        },
  };
  const { label, cls } = cfg[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{label}</span>;
};

const KpiCard = ({ label, value, sub, color, icon }) => (
  <div className={`rounded-2xl p-5 flex items-start gap-4 border shadow-sm ${color}`}>
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon name={icon} size={18}/></div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-gray-700">
      <p className="font-semibold text-gray-300 mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}} className="font-bold">{Number(p.value).toLocaleString()}</p>)}
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}>
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><Icon name="close" size={15}/></button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, value, onChange, type="text", placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder||label}
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 transition-all"/>
  </div>
);

const Toggle = ({ checked, onChange, loading }) => (
  <button onClick={onChange} disabled={loading}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked?"bg-green-500":"bg-gray-300"} ${loading?"opacity-50 cursor-not-allowed":"cursor-pointer"}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked?"translate-x-6":"translate-x-1"}`}/>
  </button>
);

const ActionBtn = ({ onClick, color="gray", icon, title, label }) => {
  const cls = { green:"bg-green-50 text-green-700 hover:bg-green-100 border-green-200", red:"bg-red-50 text-red-600 hover:bg-red-100 border-red-200", blue:"bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200", gray:"bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200", indigo:"bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200", purple:"bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" };
  return <button onClick={onClick} title={title} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors ${cls[color]}`}><Icon name={icon} size={12}/>{label&&<span>{label}</span>}</button>;
};

// ── Nav ───────────────────────────────────────────────────────────────────────
const navItems = [
  { id:"dashboard",   label:"Tableau de bord", icon:"dashboard"  },
  { id:"partners",    label:"Partenaires",     icon:"partners"   },
  { id:"stats",       label:"Statistiques",    icon:"stats"      },
  { id:"wallets",     label:"Portefeuilles",   icon:"wallet"     },
  { id:"recharges",   label:"Recharges",       icon:"recharges"  },
  { id:"commissions", label:"Commissions",     icon:"commission" },
  { id:"retraits",    label:"Retraits",        icon:"logout"     },
  { id:"decoders",    label:"Décodeurs",       icon:"creditcard" },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();

  // ── Redirection si token expiré ───────────────────────────────────────────
  useEffect(() => {
    if (isExpired()) { localStorage.removeItem("token"); navigate("/LoginForm"); }
  }, [navigate]);

  const [activePage, setActivePage]   = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [partners, setPartners]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [reabonnementTotal, setReabonnementTotal] = useState(0);
  const [chartData, setChartData]     = useState([]);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const partnersPerPage = 5;

  const [decodeurs, setDecodeurs]               = useState([]);
  const [loadingDecoders, setLoadingDecoders]   = useState(false);
  const [showAddDecoderModal, setShowAddDecoderModal] = useState(false);
  const emptyDecoder = { numero:"", partner_id:"" };
  const [newDecoder, setNewDecoder]             = useState(emptyDecoder);
  const [addDecoderError, setAddDecoderError]   = useState("");

  const [recharges, setRecharges]               = useState([]);
  const [loadingRecharges, setLoadingRecharges] = useState(false);

  const [retraits, setRetraits]                 = useState([]);
  const [loadingRetraits, setLoadingRetraits]   = useState(false);

  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId]               = useState(null);

  // Commissions
  const [commissionsData, setCommissionsData]       = useState([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [statsFormules, setStatsFormules]           = useState([]);
  const [commissionRules, setCommissionRules]       = useState([]);
  const [totalCommissionsAdmin, setTotalCommissionsAdmin] = useState(0);
  const [balanceGlobal, setBalanceGlobal]           = useState(false);
  const [togglingGlobal, setTogglingGlobal]         = useState(false);
  const [togglingId, setTogglingId]                 = useState(null);

  const emptyPartner = { name:"",prenom:"",structure:"",pays:"",ville:"",quartier:"",telephone:"",email:"",password:"",codePromo:"",wallet_balance:"" };
  const [newPartner, setNewPartner] = useState(emptyPartner);
  const [editData, setEditData]     = useState({ name:"",email:"",structure:"",pays:"",ville:"",quartier:"",telephone:"",codePromo:"" });

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports:["websocket","polling"] });
    socket.on("new_notification", (data) => { if (data.type==="recharge") fetchRecharges(); });
    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/LoginForm");
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/partners/stats`);
      setReabonnementTotal(res.data.abonnements || 0);
      setCommissionTotal(Number(res.data.commissions) || 0);
      const moisNoms = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
      setChartData((res.data.reabonnementsMois||[]).map(r => ({ month: moisNoms[(r.mois||1)-1], abonnements: r.total })));
    } catch (e) { console.error("fetchStats:", e); }
  }, []);

  const fetchPartners = useCallback(async () => {
    try { const res = await axios.get(`${API}/partners`); setPartners(res.data); }
    catch (e) { console.error("fetchPartners:", e); }
    finally { setLoading(false); }
  }, []);

  const fetchDecoders = useCallback(async () => {
    setLoadingDecoders(true);
    try { const res = await axios.get(`http://localhost:5000/api/decodeurs/all`); setDecodeurs(res.data); }
    catch (e) { console.error("fetchDecoders:", e); }
    finally { setLoadingDecoders(false); }
  }, []);

  const fetchRecharges = useCallback(async () => {
    setLoadingRecharges(true);
    try { const res = await axios.get(`${API}/admin/recharges`); setRecharges(res.data); }
    catch (e) { console.error("fetchRecharges:", e); }
    finally { setLoadingRecharges(false); }
  }, []);

  const fetchRetraits = useCallback(async () => {
    setLoadingRetraits(true);
    try { const res = await axios.get(`${API}/admin/retraits-wallet`, authHdr()); setRetraits(res.data || []); }
    catch (e) { console.error("fetchRetraits:", e); }
    finally { setLoadingRetraits(false); }
  }, []);

  // ✅ fetchCommissions corrigé : token récupéré au moment de l'appel
  const fetchCommissions = useCallback(async () => {
    if (isExpired()) { navigate("/LoginForm"); return; }
    setLoadingCommissions(true);
    try {
      const [summaryRes, statusRes, rulesRes] = await Promise.all([
        axios.get(`${API}/admin/commissions-summary`, authHdr()),
        axios.get(`${API}/admin/balance-status`,      authHdr()),
        axios.get(`${API}/admin/commission-rules`,    authHdr()),
      ]);
      setCommissionsData(summaryRes.data.partenaires    || []);
      setStatsFormules(summaryRes.data.stats_formules   || []);
      setTotalCommissionsAdmin(Number(summaryRes.data.total_commissions || 0));
      setBalanceGlobal(statusRes.data.balance_enabled === 1 || statusRes.data.final_actif === true);
      setCommissionRules(rulesRes.data || []);
    } catch (e) {
      console.error("fetchCommissions:", e);
      if (e.response?.status === 401 || e.response?.status === 403) navigate("/LoginForm");
    }
    finally { setLoadingCommissions(false); }
  }, [navigate]);

  useEffect(() => { fetchPartners(); fetchStats(); fetchDecoders(); fetchRecharges(); fetchRetraits(); }, [fetchPartners, fetchStats, fetchDecoders, fetchRecharges, fetchRetraits]);
  useEffect(() => { if (activePage === "commissions") fetchCommissions(); }, [activePage, fetchCommissions]);
  useEffect(() => { if (activePage === "retraits") fetchRetraits(); }, [activePage, fetchRetraits]);

  const approvePartner  = async (id) => { await axios.put(`${API}/partners/${id}/approve`); fetchPartners(); };
  const rejectPartner   = async (id) => { await axios.put(`${API}/partners/${id}/reject`);  fetchPartners(); };
  const deletePartner   = async (id) => { if (!window.confirm("Supprimer ?")) return; await axios.delete(`${API}/partners/${id}`); fetchPartners(); };

  const addPartner = async () => {
    try { await axios.post(`${API}/partners`, newPartner); setShowAddModal(false); setNewPartner(emptyPartner); fetchPartners(); }
    catch (e) { alert("Erreur : "+e.message); }
  };
  const openEdit = (p) => { setEditId(p.id); setEditData({ name:p.name, email:p.email, structure:p.structure, pays:p.pays, ville:p.ville, quartier:p.quartier, telephone:p.telephone, codePromo:p.codePromo }); setShowEditModal(true); };
  const saveEdit = async () => { await axios.put(`${API}/partners/${editId}`, editData); setShowEditModal(false); fetchPartners(); };

  const validateReabonnement = async (id) => {
    try { const res = await axios.post(`${API}/partners/${id}/validate-reabonnement`, { formulePrix:10000 }); setCommissionTotal(p => p + res.data.commission); fetchPartners(); }
    catch (e) { alert("Erreur réabonnement"); }
  };
  const creditWallet = async (id) => {
    const amount = prompt("Montant à créditer (FCFA) :"); if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Montant invalide");
    try { const res = await axios.post(`${API}/partners/${id}/credit`, { amount: Number(amount) }); alert(`Crédité ! Solde : ${res.data.wallet_balance} FCFA`); fetchPartners(); }
    catch (e) { alert("Erreur crédit"); }
  };

  const validerRecharge = async (id) => {
    if (!window.confirm("Valider cette demande ?")) return;
    try { await axios.post(`${API}/admin/recharges/${id}/valider`); alert("Recharge validée !"); fetchRecharges(); fetchPartners(); }
    catch (e) { alert(e.response?.data?.error || "Erreur"); }
  };
  const rejeterRecharge = async (id) => {
    if (!window.confirm("Rejeter ?")) return;
    try { await axios.post(`${API}/admin/recharges/${id}/rejeter`); fetchRecharges(); }
    catch (e) { alert("Erreur"); }
  };

  const addDecoder = async () => {
    setAddDecoderError("");
    if (!newDecoder.numero.trim()) return setAddDecoderError("Numéro requis.");
    if (!newDecoder.partner_id)    return setAddDecoderError("Sélectionnez un partenaire.");
    try { await axios.post(`${API}/decodeurs`, { numero: newDecoder.numero.trim(), partner_id: Number(newDecoder.partner_id) }); setShowAddDecoderModal(false); setNewDecoder(emptyDecoder); fetchDecoders(); }
    catch (e) { setAddDecoderError(e.response?.data?.message || e.message); }
  };

  // ✅ Toggle global — token récupéré au moment de l'appel
  const toggleBalanceGlobal = async () => {
    if (isExpired()) { navigate("/LoginForm"); return; }
    setTogglingGlobal(true);
    try {
      const newVal = !balanceGlobal;
      await axios.post(`${API}/admin/balance-toggle`, { enabled: newVal }, authHdr());
      setBalanceGlobal(newVal);
    } catch (e) { alert("Erreur lors du changement de statut : " + (e.response?.data?.error || e.message)); }
    finally { setTogglingGlobal(false); }
  };

  // ✅ Toggle individuel — token récupéré au moment de l'appel
  const togglePartnerBalance = async (partner) => {
    if (isExpired()) { navigate("/LoginForm"); return; }
    if (!window.confirm(`${partner.balance_actif ? "Désactiver" : "Activer"} le retrait pour ${partner.prenom} ${partner.name} ?`)) return;
    setTogglingId(partner.id);
    try {
      await axios.post(`${API}/admin/balance-toggle-partner/${partner.id}`, { enabled: !partner.balance_actif }, authHdr());
      setCommissionsData(prev => prev.map(p => p.id === partner.id ? { ...p, balance_actif: !p.balance_actif } : p));
    } catch (e) { alert("Erreur : " + (e.response?.data?.error || e.message)); }
    finally { setTogglingId(null); }
  };

  // ✅ Mise à jour commission manuelle
  const handleCommissionUpdate = async (code, val) => {
    if (isExpired()) { navigate("/LoginForm"); return; }
    try {
      await axios.put(`${API}/admin/commission-rules/${code}`, { commission_actuelle: val }, authHdr());
      setCommissionRules(prev => prev.map(r => r.formule_code === code ? { ...r, commission_actuelle: val } : r));
    } catch (e) { console.error("Erreur update commission:", e); }
  };

  const validerRetrait = async (id) => {
    if (!window.confirm("Valider ce retrait ?")) return;
    try { await axios.post(`${API}/admin/retraits-wallet/${id}/valider`, {}, authHdr()); alert("Retrait validé !"); fetchRetraits(); fetchPartners(); }
    catch (e) { alert(e.response?.data?.error || "Erreur"); }
  };
  const rejeterRetrait = async (id) => {
    if (!window.confirm("Rejeter ?")) return;
    try { await axios.post(`${API}/admin/retraits-wallet/${id}/rejeter`, {}, authHdr()); fetchRetraits(); }
    catch (e) { alert("Erreur"); }
  };

  // Filtres partenaires
  const filtered   = partners.filter(p => { const q=search.toLowerCase(); return (p.name?.toLowerCase().includes(q)||p.email?.toLowerCase().includes(q)) && (filter==="all"||p.status===filter); });
  const total      = partners.length;
  const approved   = partners.filter(p=>p.status==="approved").length;
  const pending    = partners.filter(p=>p.status==="pending").length;
  const rejected   = partners.filter(p=>p.status==="rejected").length;
  const totalWallet = partners.reduce((s,p)=>s+(Number(p.wallet_balance)||0),0);
  const totalPages = Math.ceil(filtered.length / partnersPerPage);
  const paginated  = filtered.slice((currentPage-1)*partnersPerPage, currentPage*partnersPerPage);

  // ── RENDERS ───────────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Partenaires"   value={total}    sub="au total"                color="bg-gray-900 text-white"    icon="partners"   />
        <KpiCard label="Validés"       value={approved} sub={`${pending} en attente`} color="bg-green-600 text-white"   icon="check"      />
        <KpiCard label="Réabonnements" value={reabonnementTotal} sub="validés"        color="bg-red-600 text-white"     icon="refresh"    />
        <KpiCard label="Commissions"   value={`${commissionTotal.toLocaleString()} F`} sub="générées" color="bg-amber-500 text-white" icon="creditcard"/>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-gray-50"><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Tendance</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Abonnements mensuels</h2></div>
          <div className="px-4 pb-5 pt-3">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid stroke="#f3f4f6" vertical={false}/><XAxis dataKey="month" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>
                <Line type="monotone" dataKey="abonnements" stroke="#e53935" strokeWidth={2.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-gray-50"><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Statuts</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Répartition partenaires</h2></div>
          <div className="px-4 pb-5 pt-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{label:"Validés",value:approved},{label:"En attente",value:pending},{label:"Rejetés",value:rejected}]} margin={{top:5,right:10,left:0,bottom:5}} barSize={40}>
                <XAxis dataKey="label" tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="value" radius={[8,8,0,0]} fill="#e53935"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <div><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Récents</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Derniers partenaires inscrits</h2></div>
          <button onClick={() => setActivePage("partners")} className="text-xs font-semibold text-red-600 hover:text-red-700">Voir tout →</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-50">{["Partenaire","Ville","Code Promo","Portefeuille","Statut"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {partners.slice(0,5).map((p,i) => (
              <tr key={p.id} className={`hover:bg-gray-50 ${i!==0?"border-t border-gray-50":""}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-gray-900 text-sm">{p.name} {p.prenom}</p><p className="text-xs text-gray-400">{p.email}</p></div></div></td>
                <td className="px-5 py-3 text-gray-600">{p.ville||"—"}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono text-xs">{p.codePromo||"—"}</span></td>
                <td className="px-5 py-3 font-semibold text-green-700">{(Number(p.wallet_balance)||0).toLocaleString()} FCFA</td>
                <td className="px-5 py-3"><StatusBadge status={p.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {recharges.filter(r=>r.statut==="en_attente").length>0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-sm font-bold text-amber-800">🔔 {recharges.filter(r=>r.statut==="en_attente").length} demande(s) de recharge en attente</p>
          <button onClick={()=>setActivePage("recharges")} className="text-xs font-semibold text-amber-700 hover:text-amber-900">Voir tout →</button>
        </div>
      )}
    </div>
  );

  // ── PAGE COMMISSIONS ──────────────────────────────────────────────────────────
  const renderCommissions = () => {
    const totalEnAttente = commissionsData.reduce((s,p)=>s+Number(p.commissions_en_attente||0),0);
    const totalHisto     = commissionsData.reduce((s,p)=>s+Number(p.commissions_totales||0),0);
    return (
      <div className="flex flex-col gap-5">
        {/* ✅ Diagramme en haut */}
        <CommissionChart
          commissionsParFormule={statsFormules}
          isAdmin={true}
          commissionsAdmin={commissionRules}
          adminTotal={totalCommissionsAdmin}
          seuilAdmin={50000}
          onUpdate={handleCommissionUpdate}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <KpiCard label="Total commissions générées" value={`${totalHisto.toLocaleString()} FCFA`} color="bg-gray-900 text-white" icon="commission"/>
          <KpiCard label="Commissions en attente"     value={`${totalEnAttente.toLocaleString()} FCFA`} sub="Non encore retirées" color="bg-amber-500 text-white" icon="bell"/>
          <KpiCard label="Partenaires actifs"         value={commissionsData.length} color="bg-green-600 text-white" icon="partners"/>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-bold text-gray-900">Fenêtre de retrait des commissions</h2><p className="text-xs text-gray-400 mt-1">Active automatiquement du 28 au 2 de chaque mois.</p></div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${balanceGlobal?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{balanceGlobal?"✅ Activée":"🔒 Désactivée"}</span>
              <Toggle checked={balanceGlobal} onChange={toggleBalanceGlobal} loading={togglingGlobal}/>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50 flex items-center justify-between">
            <div><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Détail</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Commissions par partenaire</h2></div>
            <button onClick={fetchCommissions} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"><Icon name="refresh" size={13}/> Actualiser</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{["Partenaire","Structure","Commissions en attente","Total historique","Portefeuille","Retrait actif"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {loadingCommissions ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chargement…</td></tr>
                 : commissionsData.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-400">Aucun partenaire</td></tr>
                 : commissionsData.map((p,i) => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${i!==0?"border-t border-gray-50":""}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><p className="font-semibold text-gray-900">{p.prenom} {p.name}</p></div></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.structure||"—"}</td>
                    <td className="px-4 py-3 font-bold text-amber-600">{Number(p.commissions_en_attente||0).toLocaleString()} FCFA</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{Number(p.commissions_totales||0).toLocaleString()} FCFA</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{Number(p.wallet_balance||0).toLocaleString()} FCFA</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Toggle checked={!!p.balance_actif} onChange={() => togglePartnerBalance(p)} loading={togglingId===p.id}/><span className={`text-xs font-medium ${p.balance_actif?"text-green-600":"text-gray-400"}`}>{p.balance_actif?"Activé":"Désactivé"}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRetraits = () => (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <KpiCard label="Total demandes" value={retraits.length} color="bg-gray-900 text-white" icon="recharges"/>
        <KpiCard label="En attente"     value={retraits.filter(r=>r.statut==="pending").length} color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Validés"        value={retraits.filter(r=>r.statut==="approved").length} color="bg-green-600 text-white" icon="check"/>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <div><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Demandes</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Retraits de portefeuille</h2></div>
          <button onClick={fetchRetraits} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"><Icon name="refresh" size={13}/> Actualiser</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">{["Partenaire","Structure","Téléphone","Montant","Date","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loadingRetraits ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chargement…</td></tr>
               : retraits.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Aucune demande</td></tr>
               : retraits.map((r,i) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${i!==0?"border-t border-gray-50":""}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">{(r.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-gray-900">{r.prenom} {r.name}</p><p className="text-xs text-gray-400">{r.email}</p></div></div></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.structure||"—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.telephone||"—"}</td>
                  <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">{Number(r.montant).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.statut}/></td>
                  <td className="px-4 py-3">{r.statut==="pending"&&<div className="flex gap-1.5"><ActionBtn onClick={()=>validerRetrait(r.id)} color="green" icon="check" label="Valider"/><ActionBtn onClick={()=>rejeterRetrait(r.id)} color="red" icon="x" label="Rejeter"/></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPartners = () => (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" placeholder="Rechercher un partenaire…" value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"/></div>
        <select value={filter} onChange={e=>{setFilter(e.target.value);setCurrentPage(1);}} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-700">
          <option value="all">Tous les statuts</option><option value="approved">Validés</option><option value="pending">En attente</option><option value="rejected">Rejetés</option>
        </select>
        <button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"><Icon name="plus" size={15}/> Ajouter</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">{["Partenaire","Structure","Localisation","Téléphone","Code Promo","Portefeuille","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">Chargement…</td></tr>
               : paginated.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">Aucun partenaire</td></tr>
               : paginated.map((p,i) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${i!==0?"border-t border-gray-50":""}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-gray-900">{p.name} {p.prenom}</p><p className="text-xs text-gray-400">{p.email}</p></div></div></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.structure||"—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{[p.ville,p.pays].filter(Boolean).join(", ")||"—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.telephone||"—"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono text-xs">{p.codePromo||"—"}</span></td>
                  <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">{(Number(p.wallet_balance)||0).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 flex-wrap"><ActionBtn onClick={()=>approvePartner(p.id)} color="green" icon="check" title="Valider"/><ActionBtn onClick={()=>rejectPartner(p.id)} color="red" icon="x" title="Rejeter"/><ActionBtn onClick={()=>openEdit(p)} color="blue" icon="edit" title="Modifier"/><ActionBtn onClick={()=>deletePartner(p.id)} color="gray" icon="trash" title="Supprimer"/><ActionBtn onClick={()=>validateReabonnement(p.id)} color="indigo" icon="refresh" label="Réab."/><ActionBtn onClick={()=>creditWallet(p.id)} color="purple" icon="creditcard" label="Crédit"/></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">{filtered.length} partenaire{filtered.length!==1?"s":""} · page {currentPage}/{totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"><Icon name="chevronL" size={14}/></button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n=><button key={n} onClick={()=>setCurrentPage(n)} className={`w-8 h-8 rounded-xl text-xs font-semibold ${n===currentPage?"bg-red-600 text-white":"border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{n}</button>)}
              <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"><Icon name="chevronR" size={14}/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total partenaires" value={total}    color="bg-gray-900 text-white"  icon="partners"/>
        <KpiCard label="Validés"           value={approved} color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="En attente"        value={pending}  color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Rejetés"           value={rejected} color="bg-red-600 text-white"   icon="x"/>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-2 border-b border-gray-50"><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Évolution</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Abonnements mensuels</h2></div>
        <div className="px-4 pb-6 pt-3">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{top:10,right:20,left:0,bottom:10}}>
              <CartesianGrid stroke="#f3f4f6" vertical={false}/><XAxis dataKey="month" tick={{fontSize:12,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:12,fill:"#9ca3af"}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>
              <Line type="monotone" dataKey="abonnements" stroke="#e53935" strokeWidth={3} dot={{fill:"#e53935",r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderWallets = () => (
    <div className="flex flex-col gap-5">
      <KpiCard label="Total portefeuilles" value={`${totalWallet.toLocaleString()} FCFA`} sub={`${approved} partenaires validés`} color="bg-green-600 text-white" icon="wallet"/>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50"><p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Soldes</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">Portefeuilles partenaires</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-50 bg-gray-50">{["Partenaire","Code Promo","Statut","Solde","Action"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {partners.map((p,i) => (
              <tr key={p.id} className={`hover:bg-gray-50 ${i!==0?"border-t border-gray-50":""}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-gray-900">{p.name} {p.prenom}</p><p className="text-xs text-gray-400">{p.email}</p></div></div></td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono text-xs">{p.codePromo||"—"}</span></td>
                <td className="px-5 py-3"><StatusBadge status={p.status}/></td>
                <td className="px-5 py-3"><span className="text-lg font-bold text-green-700">{(Number(p.wallet_balance)||0).toLocaleString()}</span><span className="text-xs text-gray-400 ml-1">FCFA</span></td>
                <td className="px-5 py-3"><ActionBtn onClick={()=>creditWallet(p.id)} color="green" icon="creditcard" label="Créditer"/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRecharges = () => (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <KpiCard label="Total demandes" value={recharges.length} color="bg-gray-900 text-white" icon="recharges"/>
        <KpiCard label="En attente"     value={recharges.filter(r=>r.statut==="en_attente").length} color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Validées"       value={recharges.filter(r=>r.statut==="validee").length} color="bg-green-600 text-white" icon="check"/>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Demandes de recharge</h2>
          <button onClick={fetchRecharges} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"><Icon name="refresh" size={13}/> Actualiser</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">{["Partenaire","Opérateur","N° Transaction","Montant","Capture","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loadingRecharges ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chargement…</td></tr>
               : recharges.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Aucune demande</td></tr>
               : recharges.map((r,i) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${i!==0?"border-t border-gray-50":""}`}>
                  <td className="px-4 py-3"><p className="font-semibold text-gray-900">{r.prenom} {r.name}</p><p className="text-xs text-gray-400">{r.email}</p></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.moyen_paiement}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.numero_paiement}</td>
                  <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">{Number(r.montant).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">{r.capture?<a href={`http://localhost:5000/uploads/recharges/${r.capture}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Voir</a>:<span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.statut}/></td>
                  <td className="px-4 py-3">{r.statut==="en_attente"&&<div className="flex gap-1.5"><ActionBtn onClick={()=>validerRecharge(r.id)} color="green" icon="check" label="Valider"/><ActionBtn onClick={()=>rejeterRecharge(r.id)} color="red" icon="x" label="Rejeter"/></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDecoders = () => (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <KpiCard label="Total décodeurs" value={decodeurs.length} color="bg-gray-900 text-white" icon="creditcard"/>
        <KpiCard label="Disponibles"     value={decodeurs.filter(d=>d.status==="free").length} color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="Utilisés"        value={decodeurs.filter(d=>d.status==="used").length} color="bg-red-600 text-white" icon="refresh"/>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Liste des décodeurs</h2>
          <button onClick={()=>setShowAddDecoderModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"><Icon name="plus" size={13}/> Ajouter</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">{["Numéro","Statut","Partenaire attribué"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {loadingDecoders ? <tr><td colSpan={3} className="text-center py-10 text-gray-400">Chargement…</td></tr>
             : decodeurs.length === 0 ? <tr><td colSpan={3} className="text-center py-10 text-gray-400">Aucun décodeur</td></tr>
             : decodeurs.map(d => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="px-5 py-3 font-mono font-semibold text-gray-900">{d.numero}</td>
                <td className="px-5 py-3"><span className={`px-2 py-1 text-xs rounded font-semibold ${d.status==="free"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{d.status==="free"?"Disponible":"Utilisé"}</span></td>
                <td className="px-5 py-3">{d.name?<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center">{(d.name[0]||"?").toUpperCase()}</div><span className="text-gray-700 font-medium">{d.prenom} {d.name}</span></div>:<span className="text-gray-400 text-xs italic">Non attribué</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {showAddDecoderModal && (
          <Modal title="Ajouter un décodeur" onClose={()=>setShowAddDecoderModal(false)}>
            <div className="flex flex-col gap-4">
              <Field label="Numéro du décodeur" placeholder="Ex: 4512001234" value={newDecoder.numero} onChange={e=>setNewDecoder({...newDecoder,numero:e.target.value})}/>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Partenaire</label>
                <select value={newDecoder.partner_id} onChange={e=>setNewDecoder({...newDecoder,partner_id:e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50">
                  <option value="">— Sélectionner —</option>
                  {partners.filter(p=>p.status==="approved").map(p=><option key={p.id} value={p.id}>{p.prenom} {p.name}{p.codePromo?` — ${p.codePromo}`:""}</option>)}
                </select>
              </div>
              {addDecoderError && <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"><Icon name="x" size={13}/> {addDecoderError}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowAddDecoderModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={addDecoder} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Ajouter</button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );

  const pageMap    = { dashboard:renderDashboard, partners:renderPartners, stats:renderStats, wallets:renderWallets, recharges:renderRecharges, commissions:renderCommissions, retraits:renderRetraits, decoders:renderDecoders };
  const pageTitles = { dashboard:"Tableau de bord", partners:"Partenaires", stats:"Statistiques", wallets:"Portefeuilles", recharges:"Demandes de recharge", commissions:"Commissions", retraits:"Retraits", decoders:"Décodeurs" };

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{fontFamily:"'DM Sans', sans-serif"}}>
      {/* SIDEBAR */}
      <aside className={`flex flex-col bg-gray-900 text-white transition-all duration-300 flex-shrink-0 ${sidebarOpen?"w-64":"w-16"} min-h-screen sticky top-0 z-30`}
        style={{height:"100vh"}}>
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-800 ${sidebarOpen?"":"justify-center"}`}>
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-md"><span className="text-white font-black text-sm">VC</span></div>
          {sidebarOpen && <div><p className="text-sm font-bold leading-none">Vision Canal<span className="text-red-500">+</span></p><p className="text-[10px] text-gray-400 mt-0.5">Administration</p></div>}
        </div>
        {/* ✅ nav scrollable, logout sticky */}
        <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
          {navItems.map(({ id, label, icon }) => {
            const active = activePage === id;
            const badge  = id==="recharges" ? recharges.filter(r=>r.statut==="en_attente").length : id==="retraits" ? retraits.filter(r=>r.statut==="pending").length : 0;
            return (
              <button key={id} onClick={()=>setActivePage(id)} title={!sidebarOpen?label:undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${active?"bg-red-600 text-white shadow-md":"text-gray-400 hover:bg-gray-800 hover:text-white"} ${!sidebarOpen?"justify-center":""}`}>
                <Icon name={icon} size={18} className="flex-shrink-0"/>
                {sidebarOpen && <span className="flex-1">{label}</span>}
                {sidebarOpen && badge > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
              </button>
            );
          })}
        </nav>
        {/* ✅ Logout toujours visible */}
        <div className="p-3 border-t border-gray-800 flex-shrink-0 bg-gray-900">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">A</div>
              <div><p className="text-xs font-semibold text-white">Admin</p><p className="text-[10px] text-gray-400">Vision Canal+</p></div>
            </div>
          )}
          <button onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 w-full transition-all ${!sidebarOpen?"justify-center":""}`}
            title={!sidebarOpen?"Se déconnecter":undefined}>
            <Icon name="logout" size={18} className="flex-shrink-0"/>
            {sidebarOpen && <span>Se déconnecter</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminNavbar activePage={activePage} pageTitle={pageTitles[activePage]} toggleSidebar={()=>setSidebarOpen(o=>!o)}/>
        <main className="flex-1 p-6"><div className="max-w-7xl mx-auto">{(pageMap[activePage]||renderDashboard)()}</div></main>
      </div>

      {/* MODAL AJOUTER PARTENAIRE */}
      {showAddModal && (
        <Modal title="Ajouter un partenaire" onClose={()=>setShowAddModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            {[{label:"Nom",key:"name"},{label:"Prénom",key:"prenom"},{label:"Email",key:"email",type:"email"},{label:"Mot de passe",key:"password",type:"password"},{label:"Structure",key:"structure"},{label:"Pays",key:"pays"},{label:"Ville",key:"ville"},{label:"Quartier",key:"quartier"},{label:"Téléphone",key:"telephone"},{label:"Code Promo",key:"codePromo"}].map(({label,key,type})=>(
              <Field key={key} label={label} type={type} value={newPartner[key]} onChange={e=>setNewPartner({...newPartner,[key]:e.target.value})}/>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={()=>setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button onClick={addPartner} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Ajouter</button>
          </div>
        </Modal>
      )}

      {/* MODAL MODIFIER PARTENAIRE */}
      {showEditModal && (
        <Modal title="Modifier le partenaire" onClose={()=>setShowEditModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            {[{label:"Nom",key:"name"},{label:"Email",key:"email",type:"email"},{label:"Structure",key:"structure"},{label:"Pays",key:"pays"},{label:"Ville",key:"ville"},{label:"Quartier",key:"quartier"},{label:"Téléphone",key:"telephone"},{label:"Code Promo",key:"codePromo"}].map(({label,key,type})=>(
              <Field key={key} label={label} type={type} value={editData[key]} onChange={e=>setEditData({...editData,[key]:e.target.value})}/>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={()=>setShowEditModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button onClick={saveEdit} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Enregistrer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
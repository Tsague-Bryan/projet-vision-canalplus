import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { createAppSocket } from "../lib/socket";
import AiAssistant from "../components/AiAssistant";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminNavbar from "../components/AdminNavbar";
import CommissionChart from "../components/CommissionChart";
import { API_URL, serverUrl } from "../lib/api";
import { authFetchOptions, authHeaders, clearSession, hasActiveSession, installActivityTracker, isAuthExpiredResponse } from "../lib/session";
import logo from "../assets/logo.png";

const API        = API_URL;
const authHdr    = authHeaders;
const isExpired  = () => !hasActiveSession("admin");
const isDisabledFormule = (item = {}) => {
  const code = String(item.formule_code || item.code || item.formule || "").toUpperCase();
  const name = String(item.formule_name || item.name || item.label || "").toLowerCase();
  return code === "EVPDD" || name.includes("evasion+") || name.includes("evasion +") || name.includes("vasion+") || name.includes("vasion +");
};

//  Icons 
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
  commission: ["M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z","M12 6v2","M12 16v2","M8.5 8.5l1.5 1.5","M14 14l1.5 1.5","M6 12h2","M16 12h2"],
  save:       ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z","M17 21v-8H7v8","M7 3v5h8"],
  technicien: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
  eye:        ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"],
  eyeOff:     ["M3 3l18 18","M10.6 10.6A3 3 0 0 0 14 14","M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-3.17 4.22","M6.61 6.61A18.27 18.27 0 0 0 1 12s4 8 11 8a10.8 10.8 0 0 0 5.39-1.39"],
  settings:   ["M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z","M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
};

const Icon = ({ name, size=18, className="" }) => {
  const d = icons[name]; if(!d) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{d.map((pd,i)=><path key={i} d={pd}/>)}</svg>;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "";
const fmtDateTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const StatusBadge = ({ status }) => {
  const cfg = {
    approved:{label:"Validé",cls:"bg-green-100 text-green-700 border-green-200"},
    pending:{label:"En attente",cls:"bg-amber-100 text-amber-700 border-amber-200"},
    rejected:{label:"Rejeté",cls:"bg-red-100 text-red-600 border-red-200"},
    en_attente:{label:"En attente",cls:"bg-amber-100 text-amber-700 border-amber-200"},
    validee:{label:"Validée",cls:"bg-green-100 text-green-700 border-green-200"},
    rejetee:{label:"Rejetée",cls:"bg-red-100 text-red-600 border-red-200"},
    en_cours:{label:"En cours",cls:"bg-blue-100 text-blue-700 border-blue-200"},
    terminee:{label:"Terminée",cls:"bg-green-100 text-green-700 border-green-200"},
    annulee:{label:"Annulée",cls:"bg-red-100 text-red-600 border-red-200"},
  };
  const {label,cls} = cfg[status]||{label:status,cls:"bg-muted text-muted-foreground"};
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{label}</span>;
};

const KpiCard = ({ label, value, sub, color = "", icon }) => {
  const tone = color.includes("green") ? "text-emerald-600 bg-emerald-50 border-emerald-100"
    : color.includes("amber") || color.includes("orange") ? "text-amber-600 bg-amber-50 border-amber-100"
    : color.includes("red") ? "text-rose-600 bg-rose-50 border-rose-100"
    : color.includes("purple") ? "text-violet-600 bg-violet-50 border-violet-100"
    : color.includes("blue") ? "text-sky-600 bg-sky-50 border-sky-100"
    : "text-slate-700 bg-slate-50 border-slate-100";
  return (
    <div className="rounded-lg p-4 sm:p-5 flex items-start gap-3 sm:gap-4 border border-border bg-card text-card-foreground shadow-sm min-w-0">
      <div className={["flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center", tone].join(" ")}><Icon name={icon} size={18}/></div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 break-words">{label}</p>
        <p className="text-2xl font-bold leading-none text-foreground break-words">{value}</p>
        {sub&&<p className="text-xs text-muted-foreground mt-1 break-words">{sub}</p>}
      </div>
    </div>
  );
};
const ChartTooltip = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return <div className="bg-card text-card-foreground text-xs px-3 py-2 rounded-xl shadow-xl border border-border"><p className="font-semibold text-muted-foreground mb-1">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color}} className="font-bold">{Number(p.value).toLocaleString()}</p>)}</div>;
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}}>
    <div className="bg-card rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <h2 className="text-base font-bold text-card-foreground">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground"><Icon name="close" size={15}/></button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

//  Lightbox pour les captures de recharge
const Lightbox = ({ src, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)"}} onClick={onClose}>
    <div className="relative max-w-2xl w-full mx-4" onClick={e=>e.stopPropagation()}>
      <button onClick={onClose} className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
        <Icon name="close" size={16}/>
      </button>
      <img src={src} alt="Capture" className="w-full max-h-[80vh] object-contain rounded-xl border border-white/10 shadow-2xl"/>
    </div>
  </div>
);

const FieldInput = ({ label, value, onChange, type="text", placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder||label}
      className="w-full px-4 py-2.5 rounded-lg border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-background"/>
  </div>
);

const Toggle = ({ checked, onChange, loading }) => (
  <button onClick={onChange} disabled={loading}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked?"bg-green-500":"bg-muted"} ${loading?"opacity-50 cursor-not-allowed":"cursor-pointer"}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform duration-200 ${checked?"translate-x-6":"translate-x-1"}`}/>
  </button>
);

const ActionBtn = ({ onClick, color="gray", icon, title, label }) => {
  const cls = {
    green:"bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    red:"bg-red-50 text-red-600 hover:bg-red-100 border-red-200",
    blue:"bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    gray:"bg-muted text-muted-foreground hover:bg-muted/80 border-border",
    purple:"bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
    amber:"bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
    indigo:"bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
  };
  return <button onClick={onClick} title={title} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors ${cls[color]}`}><Icon name={icon} size={12}/>{label&&<span>{label}</span>}</button>;
};

const navItems = [
  { id:"dashboard",   label:"Tableau de bord", icon:"dashboard"  },
  { id:"partners",    label:"Partenaires",      icon:"partners"   },
  { id:"stats",       label:"Statistiques",     icon:"stats"      },
  { id:"recharges",   label:"Recharges",        icon:"recharges"  },
  { id:"commissions", label:"Commissions",      icon:"commission" },
  { id:"formules",    label:"Formules",         icon:"save"       },
  { id:"techniciens", label:"Techniciens",      icon:"technicien" },
  { id:"decoders",    label:"Décodeurs",        icon:"creditcard" },
  { id:"settings",    label:"Paramètres",       icon:"settings"   },
];

//  Pagination 
const PaginationBar = ({ currentPage, totalPages, onPageChange }) => {
  if(totalPages<=1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-border">
      <p className="text-xs text-muted-foreground">Page {currentPage}/{totalPages}</p>
      <div className="flex items-center gap-2">
        <button onClick={()=>onPageChange(Math.max(1,currentPage-1))} disabled={currentPage===1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/30 disabled:opacity-30"><Icon name="chevronL" size={14}/></button>
        {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
          let page = i+1;
          if(totalPages>5){
            if(currentPage<=3) page=i+1;
            else if(currentPage>=totalPages-2) page=totalPages-4+i;
            else page=currentPage-2+i;
          }
          return <button key={page} onClick={()=>onPageChange(page)} className={`w-8 h-8 rounded-lg text-xs font-semibold ${page===currentPage?"bg-primary text-primary-foreground":"border border-border text-foreground hover:bg-muted/30"}`}>{page}</button>;
        })}
        <button onClick={()=>onPageChange(Math.min(totalPages,currentPage+1))} disabled={currentPage===totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/30 disabled:opacity-30"><Icon name="chevronR" size={14}/></button>
      </div>
    </div>
  );
};

const buildAdminSearchParams = (page, rechargePage = 1, rechargeDate = "") => {
  const params = {};
  if (page && page !== "dashboard") params.page = page;
  if (page === "recharges") {
    if (rechargePage > 1) params.rechargePage = String(rechargePage);
    if (rechargeDate) params.rechargeDate = rechargeDate;
  }
  return params;
};

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if(isExpired()){clearSession();navigate("/LoginForm");return undefined;}
    return installActivityTracker(()=>{clearSession();navigate("/LoginForm");},"admin");
  },[navigate]);

  const [activePage,    setActivePage]   = useState(searchParams.get("page") || "dashboard");
  const [sidebarOpen,   setSidebarOpen]  = useState(true);
  //  Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [partners,      setPartners]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [commissionTotal,   setCommissionTotal]   = useState(0);
  const [adminGains,        setAdminGains]        = useState(0);
  const [adminGainRate,     setAdminGainRate]     = useState(6);
  const [totalAdminRecharges, setTotalAdminRecharges] = useState(0);
  const [reabonnementTotal, setReabonnementTotal] = useState(0);
  const [chartData,         setChartData]         = useState([]);
  const [search,            setSearch]            = useState("");
  const [filter,            setFilter]            = useState("all");
  const [currentPage,       setCurrentPage]       = useState(1);
  const partnersPerPage = 10;

  const [decodeurs,           setDecodeurs]           = useState([]);
  const [loadingDecoders,     setLoadingDecoders]     = useState(false);
  const [showAddDecoderModal, setShowAddDecoderModal] = useState(false);
  const [newDecoder,          setNewDecoder]          = useState({ numero:"", partner_id:"" });
  const [addDecoderError,     setAddDecoderError]     = useState("");
  const [decoderPage,         setDecoderPage]         = useState(1);
  const decodersPerPage = 10;

  const [recharges,           setRecharges]           = useState([]);
  const [loadingRecharges,    setLoadingRecharges]    = useState(false);
  const [rechargeTotalCount,  setRechargeTotalCount]  = useState(0);
  const [rechargeTotalPages,  setRechargeTotalPages]  = useState(1);
  const [rechargeCurrentPage, setRechargeCurrentPage] = useState(() =>
    Math.max(1, parseInt(searchParams.get("rechargePage") || "1", 10) || 1)
  );
  const [rechargeDateFilter, setRechargeDateFilter] = useState(
    () => searchParams.get("rechargeDate") || ""
  );
  const [rechargeSearchDate, setRechargeSearchDate] = useState(
    () => searchParams.get("rechargeDate") || ""
  );
  const [rejectedCount,       setRejectedCount]       = useState(0);
  const [lightboxSrc,         setLightboxSrc]         = useState(null);

  const [showAddModal,  setShowAddModal]  = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId,        setEditId]        = useState(null);

  const [commissionsData,       setCommissionsData]       = useState([]);
  const [loadingCommissions,    setLoadingCommissions]    = useState(false);
  const [statsFormules,         setStatsFormules]         = useState([]);
  const [commissionRules,       setCommissionRules]       = useState([]);
  const [commissionRulesEdit,   setCommissionRulesEdit]   = useState({});
  const [savingRule,            setSavingRule]            = useState(null);
  const [totalCommissionsAdmin, setTotalCommissionsAdmin] = useState(0);
  const [commissionsPage,       setCommissionsPage]       = useState(1);
  const [balanceGlobal,         setBalanceGlobal]         = useState(false);
  const [togglingGlobal,        setTogglingGlobal]        = useState(false);
  const [togglingId,            setTogglingId]            = useState(null);
  const [commissionHistory,     setCommissionHistory]     = useState([]);
  const [commissionDate,        setCommissionDate]        = useState(()=>new Date().toISOString().slice(0,10));
  const [cashboxHistory,        setCashboxHistory]        = useState([]);
  const [cashboxTotals,         setCashboxTotals]         = useState({ total_added:0, total_removed:0 });
  const [formules,              setFormules]              = useState([]);
  const [formuleEdits,          setFormuleEdits]          = useState({});
  const [savingFormule,         setSavingFormule]         = useState(null);

  // Commission sur abonnement
  const [abonnementCommission,     setAbonnementCommission]     = useState(2000);
  const [abonnementCommissionEdit, setAbonnementCommissionEdit] = useState(2000);
  const [savingAbonnement,         setSavingAbonnement]         = useState(false);
  const [abonnementMsg,            setAbonnementMsg]            = useState("");

  // Configuration Générale (WhatsApp assistance & Fujisat)
  const [adminWhatsappSetting,     setAdminWhatsappSetting]     = useState("");
  const [fujisatUserSetting,       setFujisatUserSetting]       = useState("");
  const [fujisatPassSetting,       setFujisatPassSetting]       = useState("");
  const [fujisatTestModeSetting,   setFujisatTestModeSetting]   = useState(true);
  const [savingSettings,           setSavingSettings]           = useState(false);
  const [settingsMsg,              setSettingsMsg]              = useState("");
  const [showFujisatPass,         setShowFujisatPass]         = useState(false);

  // Demandes technicien
  const [demandeTech,        setDemandeTech]        = useState([]);
  const [loadingTech,        setLoadingTech]        = useState(false);
  const [techPage,           setTechPage]           = useState(1);
  const [techTotalPages,     setTechTotalPages]     = useState(1);

  const emptyPartner = {name:"",prenom:"",structure:"",pays:"",ville:"",quartier:"",telephone:"",email:"",password:"",codePromo:"",wallet_balance:""};
  const [newPartner, setNewPartner] = useState(emptyPartner);
  const [editData,   setEditData]   = useState({name:"",email:"",structure:"",pays:"",ville:"",quartier:"",telephone:"",codePromo:"",password:""});

  const goAdminPage = useCallback((page) => {
    setActivePage(page);
    setSearchParams(
      buildAdminSearchParams(
        page,
        page === "recharges" ? rechargeCurrentPage : 1,
        page === "recharges" ? rechargeDateFilter : ""
      )
    );
  }, [rechargeCurrentPage, rechargeDateFilter, setSearchParams]);

  const updateRechargeFilters = useCallback((page, date) => {
    setRechargeCurrentPage(page);
    setRechargeDateFilter(date);
    setRechargeSearchDate(date);
    if (activePage === "recharges") {
      setSearchParams(buildAdminSearchParams("recharges", page, date), { replace: true });
    }
  }, [activePage, setSearchParams]);

  const handleLogout = async()=>{
    const confirmResult = await Swal.fire({
      title: "Déconnexion",
      text: "Voulez-vous vraiment vous déconnecter ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui, déconnexion",
      cancelButtonText: "Annuler"
    });
    if(!confirmResult.isConfirmed) return;
    clearSession(); navigate("/LoginForm");
  };

  // "" FETCH """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  const fetchStats = useCallback(async()=>{
    try{
      const res = await axios.get(`${API}/partners/stats`, authHdr());
      setReabonnementTotal(res.data.abonnements||0);
      setCommissionTotal(Number(res.data.commissions)||0);
      setAdminGains(Number(res.data.admin_gains)||0);
      setAdminGainRate(Number(res.data.admin_gain_rate)||6);
      setTotalAdminRecharges(Number(res.data.total_recharges)||0);
      const mois=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
      const byMonth = new Map((res.data.reabonnementsMois||[]).map(r=>[Number(r.mois), Number(r.total)||0]));
      setChartData(mois.map((month,index)=>({month,abonnements:byMonth.get(index+1)||0})));
    }catch(e){console.error(e);}
  },[]);

  const fetchPartners = useCallback(async()=>{
    try{const res=await axios.get(`${API}/partners`, authHdr());setPartners(res.data);}
    catch(e){console.error(e);}
    finally{setLoading(false);}
  },[]);

  const fetchDecoders = useCallback(async()=>{
    setLoadingDecoders(true);
    try{const res=await axios.get(`${API}/decodeurs/all`, authHdr());setDecodeurs(res.data);}
    catch(e){console.error(e);}
    finally{setLoadingDecoders(false);}
  },[]);

  const fetchSettings = useCallback(async()=>{
    try{
      const res = await axios.get(`${API}/admin/config/settings`, authHdr());
      setAdminWhatsappSetting(res.data.admin_whatsapp || "");
      setFujisatUserSetting(res.data.fujisat_user || "");
      setFujisatPassSetting(res.data.fujisat_pass || "");
      setFujisatTestModeSetting(String(res.data.fujisat_test_mode).toLowerCase() === "true");
      setAdminGainRate(Number(res.data.admin_gain_rate) || 6);
    }catch(e){
      console.error("fetchSettings:", e);
    }
  }, []);

  const saveSettings = async()=>{
    setSavingSettings(true);
    setSettingsMsg("");
    try{
      await axios.put(`${API}/admin/config/settings`, {
        admin_whatsapp: adminWhatsappSetting,
        fujisat_user: fujisatUserSetting,
        fujisat_pass: fujisatPassSetting,
        fujisat_test_mode: fujisatTestModeSetting,
        admin_gain_rate: adminGainRate
      }, authHdr());
      setSettingsMsg("Paramètres enregistrés avec succès !");
    }catch(e){
      setSettingsMsg(" Erreur : " + (e.response?.data?.error || e.message));
    }finally{
      setSavingSettings(false);
    }
  };

  const downloadOperationsReport = async () => {
    const year = new Date().getFullYear();
    const res = await fetch(`${API}/admin/reports/operations.csv?year=${year}`, authFetchOptions());
    if (!res.ok) {
      Swal.fire({ title: "Erreur", text: "Impossible de télécharger le rapport.", icon: "error", confirmButtonColor: "#e53935" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_operations_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const decoderTotalPages = Math.max(1, Math.ceil(decodeurs.length / decodersPerPage));
  const decoderSafePage = Math.min(decoderPage, decoderTotalPages);
  const paginatedDecodeurs = useMemo(() => {
    const start = (decoderSafePage - 1) * decodersPerPage;
    return decodeurs.slice(start, start + decodersPerPage);
  }, [decodeurs, decoderSafePage]);

  useEffect(() => {
    if(decoderPage > decoderTotalPages) setDecoderPage(decoderTotalPages);
  }, [decoderPage, decoderTotalPages]);

  const fetchRecharges = useCallback(async(page=rechargeCurrentPage, date=rechargeDateFilter)=>{
    setLoadingRecharges(true);
    try{
      const res = await axios.get(`${API}/admin/recharges?page=${page}&date=${date||""}`,authHdr());
      setRecharges(res.data.recharges||[]);
      setRechargeTotalCount(res.data.total||0);
      setRechargeCurrentPage(res.data.page||1);
      setRechargeTotalPages(res.data.totalPages||1);
      setRejectedCount(res.data.rejected_count||0);
    }catch(e){
      console.error("fetchRecharges:",e);
      if(isAuthExpiredResponse(e)){clearSession();navigate("/LoginForm");}
    }finally{setLoadingRecharges(false);}
  },[navigate, rechargeCurrentPage, rechargeDateFilter]);

  const fetchCommissions = useCallback(async()=>{
    if(isExpired()){navigate("/LoginForm");return;}
    setLoadingCommissions(true);
    try{
      const [summaryRes,statusRes,rulesRes,historyRes,configRes,cashboxRes,formulesRes] = await Promise.all([
        axios.get(`${API}/admin/commissions-summary`,                         authHdr()),
        axios.get(`${API}/admin/balance-status`,                              authHdr()),
        axios.get(`${API}/admin/commission-rules`,                            authHdr()),
        axios.get(`${API}/admin/commission-operations?date=${commissionDate}`,authHdr()),
        axios.get(`${API}/admin/config/commission-abonnement`,                 authHdr()),
        axios.get(`${API}/admin/commission-cashbox-movements?date=${commissionDate}`,authHdr()),
        axios.get(`${API}/formules`,                                           authHdr()),
      ]);
      setCommissionsData(summaryRes.data.partenaires    ||[]);
      setStatsFormules((summaryRes.data.stats_formules || []).filter(item => !isDisabledFormule(item)));
      setTotalCommissionsAdmin(Number(summaryRes.data.total_commissions||0));
      setAdminGains(Number(summaryRes.data.total_commissions||0));
      setBalanceGlobal(statusRes.data.balance_enabled===1);
      const rules = rulesRes.data||[];
      setCommissionRules(rules);
      setCommissionHistory(historyRes.data||[]);
      setCashboxHistory(cashboxRes.data?.rows || []);
      setCashboxTotals(cashboxRes.data?.totals || { total_added:0, total_removed:0 });
      setFormules(formulesRes.data || []);
      setFormuleEdits(Object.fromEntries((formulesRes.data || []).map(f=>[f.code, f.price])));
      const editMap={};
      rules.forEach(r=>{editMap[r.formule_code]="";});
      setCommissionRulesEdit(editMap);

      //  Charger la commission abonnement depuis localStorage (ou valeur par défaut)
      const saved = localStorage.getItem("abonnement_commission_fixe");
      if(saved){setAbonnementCommission(Number(saved));setAbonnementCommissionEdit(Number(saved));}
      if(configRes.data?.valeur !== undefined){
        setAbonnementCommission(Number(configRes.data.valeur));
        setAbonnementCommissionEdit(Number(configRes.data.valeur));
      }
    }catch(e){
      console.error("fetchCommissions:",e);
      if(isAuthExpiredResponse(e)){clearSession();navigate("/LoginForm");}
    }finally{setLoadingCommissions(false);}
  },[navigate, commissionDate]);

  const fetchDemandeTech = useCallback(async(page=techPage)=>{
    setLoadingTech(true);
    try {
      const res = await axios.get(`${API}/admin/demandes-technicien?page=${page}`, authHdr());
      setDemandeTech(res.data.demandes || []);
      setTechPage(res.data.page || page);
      setTechTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error("fetchDemandeTech:", e);
      if(isAuthExpiredResponse(e)){clearSession();navigate("/LoginForm");}
    }
    finally{setLoadingTech(false);}
  },[techPage, navigate]);

  const callbacksRef = useRef();
  callbacksRef.current = {
    fetchPartners,
    fetchStats,
    fetchRecharges,
    fetchCommissions,
    fetchDemandeTech,
    setPartners
  };

  useEffect(()=>{
    const socket = createAppSocket();
    socket.on("connect", () => {
      console.log("Socket admin connecté :", socket.id);
    });
    const onNewNotification = (data) => {
      console.log("Socket new_notification reçue :", data);
      if(data.type==="recharge"||data.type==="demande_retrait") callbacksRef.current.fetchRecharges();
      if(data.type==="demande_technicien") callbacksRef.current.fetchDemandeTech();
      if(data.type==="inscription") callbacksRef.current.fetchPartners();
    };
    const onCommissionRules = () => {
      console.log("Socket commission_rules_update reçue");
      callbacksRef.current.fetchCommissions();
      callbacksRef.current.fetchStats();
    };
    const onAdminUpdate = (data) => {
      console.log("Socket admin_dashboard_update reçue :", data);
      callbacksRef.current.fetchPartners();
      callbacksRef.current.fetchStats();
      callbacksRef.current.fetchRecharges();
      callbacksRef.current.fetchCommissions();
    };
    const onPartnerCreated = (partner) => {
      console.log("Socket partners:created reçue :", partner);
      if(!partner) return;
      callbacksRef.current.setPartners(prev => {
        if(prev.find(p=>p.id===partner.id)) return prev;
        return [partner, ...prev];
      });
    };
    const onPartnerUpdated = (partner) => {
      console.log("Socket partners:updated reçue :", partner);
      if(!partner) return;
      callbacksRef.current.setPartners(prev => prev.map(p=>p.id===partner.id?partner:p));
    };

    socket.on("new_notification", onNewNotification);
    socket.on("commission_rules_update", onCommissionRules);
    socket.on("admin_dashboard_update", onAdminUpdate);
    socket.on("partners:created", onPartnerCreated);
    socket.on("partners:updated", onPartnerUpdated);

    return ()=>{
      socket.off("new_notification", onNewNotification);
      socket.off("commission_rules_update", onCommissionRules);
      socket.off("admin_dashboard_update", onAdminUpdate);
      socket.off("partners:created", onPartnerCreated);
      socket.off("partners:updated", onPartnerUpdated);
      socket.disconnect();
    };
  },[]);

  useEffect(() => {
    if (activePage !== "dashboard") return undefined;
    const interval = window.setInterval(fetchStats, 10000);
    return () => window.clearInterval(interval);
  }, [activePage, fetchStats]);

  useEffect(()=>{fetchPartners();fetchStats();fetchDecoders();},[fetchPartners,fetchStats,fetchDecoders]);

  useEffect(() => {
    fetchRecharges(rechargeCurrentPage, rechargeDateFilter);
  }, [rechargeCurrentPage, rechargeDateFilter, fetchRecharges]);

  useEffect(() => {
    const page = searchParams.get("page") || "dashboard";
    const rechargePage = Math.max(1, parseInt(searchParams.get("rechargePage") || "1", 10) || 1);
    const rechargeDate = searchParams.get("rechargeDate") || "";
    if (page !== activePage) setActivePage(page);
    if (rechargePage !== rechargeCurrentPage) setRechargeCurrentPage(rechargePage);
    if (rechargeDate !== rechargeDateFilter) {
      setRechargeDateFilter(rechargeDate);
      setRechargeSearchDate(rechargeDate);
    }
  }, [searchParams]);

  useEffect(()=>{if(activePage==="dashboard"||activePage==="commissions"||activePage==="formules")fetchCommissions();},[activePage,fetchCommissions]);
  useEffect(()=>{if(activePage==="techniciens")fetchDemandeTech(techPage);},[activePage,techPage,fetchDemandeTech]);
  useEffect(()=>{if(activePage==="settings")fetchSettings();},[activePage,fetchSettings]);

  // "" ACTIONS """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  const approvePartner = async(id)=>{
    try {
      await axios.put(`${API}/partners/${id}/approve`,{},authHdr());
      Swal.fire({ title: "Validé !", text: "Le compte partenaire a été validé.", icon: "success", confirmButtonColor: "#e53935" });
      fetchPartners();
    } catch(e) {
      Swal.fire({ title: "Erreur", text: e.response?.data?.error || "Erreur de validation", icon: "error", confirmButtonColor: "#e53935" });
    }
  };
  const rejectPartner  = async(id)=>{
    try {
      await axios.put(`${API}/partners/${id}/reject`,{},authHdr());
      Swal.fire({ title: "Rejeté !", text: "La demande a été rejetée.", icon: "success", confirmButtonColor: "#e53935" });
      fetchPartners();
    } catch(e) {
      Swal.fire({ title: "Erreur", text: e.response?.data?.error || "Erreur", icon: "error", confirmButtonColor: "#e53935" });
    }
  };
  const deletePartner  = async(id)=>{
    const res = await Swal.fire({
      title: "Supprimer ?",
      text: "Voulez-vous supprimer ce partenaire ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#9ca3af"
    });
    if(!res.isConfirmed) return;
    try {
      await axios.delete(`${API}/partners/${id}`,authHdr());
      Swal.fire({ title: "Supprimé !", text: "Le partenaire a été supprimé.", icon: "success", confirmButtonColor: "#e53935" });
      fetchPartners();
    } catch(e) {
      Swal.fire({ title: "Erreur", text: e.response?.data?.error || "Impossible de supprimer", icon: "error", confirmButtonColor: "#e53935" });
    }
  };
  const addPartner     = async()=>{
    try{
      await axios.post(`${API}/partners`,newPartner,authHdr());
      setShowAddModal(false);
      setNewPartner(emptyPartner);
      Swal.fire({ title: "Ajouté !", text: "Le partenaire a été ajouté avec succès.", icon: "success", confirmButtonColor: "#e53935" });
      fetchPartners();
    } catch(e){
      Swal.fire({ title: "Erreur", text: e.response?.data?.error || e.message, icon: "error", confirmButtonColor: "#e53935" });
    }
  };
  const openEdit = (p)=>{setEditId(p.id);setEditData({name:p.name,email:p.email,structure:p.structure,pays:p.pays,ville:p.ville,quartier:p.quartier,telephone:p.telephone,codePromo:p.codePromo,password:""});setShowEditModal(true);};
  const saveEdit = async()=>{
    try{
      const payload = {...editData};
      if(!payload.password?.trim()) delete payload.password;
      await axios.put(`${API}/partners/${editId}`,payload,authHdr());
      setShowEditModal(false);
      Swal.fire({ title: "Modifié !", text: "Informations mises à jour.", icon: "success", confirmButtonColor: "#e53935" });
      fetchPartners();
    }catch(e){
      Swal.fire({ title: "Erreur", text: e.response?.data?.error || "Erreur lors de la modification", icon: "error", confirmButtonColor: "#e53935" });
    }
  };
  const creditWallet = async(id)=>{
    const { value: amount } = await Swal.fire({
      title: "Créditer le portefeuille",
      input: "number",
      inputLabel: "Montant à créditer (FCFA) :",
      inputPlaceholder: "Ex: 5000",
      showCancelButton: true,
      confirmButtonText: "Créditer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#9ca3af",
      inputValidator: (value) => {
        if (!value || isNaN(value) || Number(value) <= 0) {
          return "Veuillez entrer un montant valide supérieur à 0";
        }
      }
    });
    if(!amount) return;
    try{
      const res=await axios.post(`${API}/partners/${id}/credit`,{amount:Number(amount)},authHdr());
      Swal.fire({ title: "Crédité !", text: `Le portefeuille a été crédité. Nouveau solde : ${res.data.wallet_balance.toLocaleString()} FCFA`, icon: "success", confirmButtonColor: "#e53935" });
      fetchPartners();
    }catch(e){
      const msg=e.response?.data?.message||e.response?.data?.error||e.message||"Erreur crédit";
      Swal.fire({ title: "Erreur", text: `Erreur crédit : ${msg}`, icon: "error", confirmButtonColor: "#e53935" });
    }
  };

  const validerRecharge = async(id)=>{
    const res = await Swal.fire({
      title: "Valider cette demande ?",
      text: "Voulez-vous valider cette demande de recharge ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, valider",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#9ca3af"
    });
    if(!res.isConfirmed) return;
    try{
      await axios.post(`${API}/admin/recharges/${id}/valider`,{},authHdr());
      Swal.fire({ title: "Succès !", text: "Recharge validée !", icon: "success", confirmButtonColor: "#e53935" });
      fetchRecharges();
      fetchPartners();
    } catch(e){
      Swal.fire({ title: "Erreur", text: e.response?.data?.error||"Erreur", icon: "error", confirmButtonColor: "#e53935" });
    }
  };
  const rejeterRecharge = async(id)=>{
    const res = await Swal.fire({
      title: "Rejeter cette demande ?",
      text: "Voulez-vous rejeter cette demande de recharge ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, rejeter",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#9ca3af"
    });
    if(!res.isConfirmed) return;
    try{
      await axios.post(`${API}/admin/recharges/${id}/rejeter`,{},authHdr());
      Swal.fire({ title: "Rejetée !", text: "La recharge a été rejetée.", icon: "success", confirmButtonColor: "#e53935" });
      fetchRecharges();
    } catch{
      Swal.fire({ title: "Erreur", text: "Erreur lors du rejet", icon: "error", confirmButtonColor: "#e53935" });
    }
  };

  const addDecoder = async()=>{
    setAddDecoderError("");
    if(!newDecoder.numero.trim())return setAddDecoderError("Numéro requis.");
    if(!newDecoder.partner_id)   return setAddDecoderError("Sélectionnez un partenaire.");
    try{await axios.post(`${API}/decodeurs`,{numero:newDecoder.numero.trim(),partner_id:Number(newDecoder.partner_id)},authHdr());setShowAddDecoderModal(false);setNewDecoder({numero:"",partner_id:""});fetchDecoders();}
    catch(e){setAddDecoderError(e.response?.data?.message||e.message);}
  };

  const toggleBalanceGlobal = async()=>{
    if(isExpired()){navigate("/LoginForm");return;}
    setTogglingGlobal(true);
    try{await axios.post(`${API}/admin/balance-toggle`,{enabled:!balanceGlobal},authHdr());await fetchCommissions();}
    catch(e){Swal.fire({ title: "Erreur", text: "Erreur : "+(e.response?.data?.error||e.message), icon: "error", confirmButtonColor: "#e53935" });}
    finally{setTogglingGlobal(false);}
  };

  const togglePartnerBalance = async(partner)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    const confirmResult = await Swal.fire({
      title: "Confirmer l'action",
      text: `${partner.balance_actif?"Désactiver":"Activer"} le retrait pour ${partner.prenom} ${partner.name} ?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui",
      cancelButtonText: "Annuler"
    });
    if(!confirmResult.isConfirmed) return;
    setTogglingId(partner.id);
    try{
      await axios.post(`${API}/admin/balance-toggle-partner/${partner.id}`,{enabled:!partner.balance_actif},authHdr());
      setCommissionsData(prev=>prev.map(p=>p.id===partner.id?{...p,balance_actif:!p.balance_actif}:p));
      Swal.fire({ title: "Succès !", text: `Retrait ${partner.balance_actif?"désactivé":"activé"} avec succès.`, icon: "success", confirmButtonColor: "#e53935" });
    }catch(e){Swal.fire({ title: "Erreur", text: "Erreur : "+(e.response?.data?.error||e.message), icon: "error", confirmButtonColor: "#e53935" });}
    finally{setTogglingId(null);}
  };

  const saveCommissionRule = async(code)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    const rule = commissionRules.find(r=>r.formule_code===code);
    const val  = Number(commissionRulesEdit[code]);
    if(!val||val<=0){Swal.fire({ title: "Erreur", text: "Montant de caisse invalide", icon: "error", confirmButtonColor: "#e53935" });return;}
    setSavingRule(code);
    try{
      const res = await axios.post(`${API}/admin/commission-rules/${code}/cashbox`,{type:"add",amount:val},authHdr());
      const updated = res.data?.rule||{...rule,cashbox_amount:Number(rule?.cashbox_amount||0)+val};
      setCommissionRules(prev=>prev.map(r=>r.formule_code===code?{...r,...updated}:r));
      setCommissionRulesEdit(prev=>({...prev,[code]:""}));
      Swal.fire({ title: "Succès !", text: `Commission ${code} mise à jour à ${val.toLocaleString()} FCFA`, icon: "success", confirmButtonColor: "#e53935" });
    }catch(e){Swal.fire({ title: "Erreur", text: "Erreur : "+(e.response?.data?.error||e.message), icon: "error", confirmButtonColor: "#e53935" });}
    finally{setSavingRule(null);}
  };

  const handleCommissionUpdate = async(code,val)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    try{
      await axios.put(`${API}/admin/commission-rules/${code}`,{cashbox_amount:val},authHdr());
      setCommissionRules(prev=>prev.map(r=>r.formule_code===code?{...r,cashbox_amount:Number(r.cashbox_amount||0)+Number(val)}:r));
    }catch(e){console.error(e);}
  };

  const withdrawCommissionCashbox = async(code)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    const val  = Number(commissionRulesEdit[code]);
    if(!val||val<=0){Swal.fire({ title: "Erreur", text: "Montant de retrait invalide", icon: "error", confirmButtonColor: "#e53935" });return;}
    setSavingRule(code);
    try{
      await axios.post(`${API}/admin/commission-rules/${code}/cashbox`,{type:"withdraw",amount:val},authHdr());
      setCommissionRulesEdit(prev=>({...prev,[code]:""}));
      await fetchCommissions();
      Swal.fire({ title: "Succès !", text: `Retrait de ${val.toLocaleString()} FCFA effectué`, icon: "success", confirmButtonColor: "#e53935" });
    }catch(e){Swal.fire({ title: "Erreur", text: "Erreur : "+(e.response?.data?.error||e.message), icon: "error", confirmButtonColor: "#e53935" });}
    finally{setSavingRule(null);}
  };

  const saveFormulePrice = async(code)=>{
    const price = Number(formuleEdits[code]);
    if(!price || price <= 0){Swal.fire({ title: "Erreur", text: "Prix invalide", icon: "error", confirmButtonColor: "#e53935" });return;}
    setSavingFormule(code);
    try{
      await axios.put(`${API}/admin/formules/${code}`,{price},authHdr());
      await fetchCommissions();
      Swal.fire({ title: "Succès !", text: "Prix de formule mis à jour", icon: "success", confirmButtonColor: "#e53935" });
    }catch(e){Swal.fire({ title: "Erreur", text: "Erreur : "+(e.response?.data?.error||e.message), icon: "error", confirmButtonColor: "#e53935" });}
    finally{setSavingFormule(null);}
  };

  //  Sauvegarder la commission sur abonnement
 const saveAbonnementCommission = async () => {
  const val = Number(abonnementCommissionEdit);
  if (!val || val < 0) { setAbonnementMsg("Valeur invalide"); return; }
  setSavingAbonnement(true); setAbonnementMsg("");
  try {
    await axios.put(
      `${API}/admin/config/commission-abonnement`,
      { valeur: val },
      authHdr()
    );
    setAbonnementCommission(val);
    setAbonnementMsg(` Commission abonnement fixée à ${val.toLocaleString()} FCFA`);
  } catch (e) {
    setAbonnementMsg("Erreur : " + (e.response?.data?.error || e.message));
  } finally {
    setSavingAbonnement(false);
  }
};

  // Techniciens
  const updateStatutTech = async(id,statut)=>{
    const confirmResult = await Swal.fire({
      title: "Confirmer l'action",
      text: `Mettre le statut à "${statut}" ?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#d33",
      confirmButtonText: "Oui",
      cancelButtonText: "Annuler"
    });
    if(!confirmResult.isConfirmed) return;
    try{await axios.put(`${API}/admin/demandes-technicien/${id}/statut`,{statut},authHdr());fetchDemandeTech(techPage);}
    catch{Swal.fire({ title: "Erreur", text: "Erreur lors de la modification", icon: "error", confirmButtonColor: "#e53935" });}
  };
  const deleteTech = async(id)=>{
    const confirmResult = await Swal.fire({
      title: "Confirmer la suppression",
      text: "Supprimer cette demande ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#d33",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler"
    });
    if(!confirmResult.isConfirmed) return;
    try{await axios.delete(`${API}/admin/demandes-technicien/${id}`,authHdr());fetchDemandeTech(techPage);}
    catch{Swal.fire({ title: "Erreur", text: "Erreur lors de la suppression", icon: "error", confirmButtonColor: "#e53935" });}
  };
  const cleanupTech = async()=>{
    const confirmResult = await Swal.fire({
      title: "Confirmer le nettoyage",
      text: "Supprimer toutes les demandes traitées (terminées/annulées) ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e53935",
      cancelButtonColor: "#d33",
      confirmButtonText: "Nettoyer",
      cancelButtonText: "Annuler"
    });
    if(!confirmResult.isConfirmed) return;
    try{await axios.delete(`${API}/admin/demandes-technicien-cleanup`,authHdr());fetchDemandeTech(1);}
    catch{Swal.fire({ title: "Erreur", text: "Erreur lors du nettoyage", icon: "error", confirmButtonColor: "#e53935" });}
  };

  const filtered   = partners.filter(p=>{const q=search.toLowerCase();return(p.name?.toLowerCase().includes(q)||p.email?.toLowerCase().includes(q))&&(filter==="all"||p.status===filter);});
  const total      = partners.length;
  const approved   = partners.filter(p=>p.status==="approved").length;
  const pending    = partners.filter(p=>p.status==="pending").length;
  const rejected   = partners.filter(p=>p.status==="rejected").length;
  const totalPages  = Math.ceil(filtered.length/partnersPerPage);
  const paginated   = filtered.slice((currentPage-1)*partnersPerPage,currentPage*partnersPerPage);
  const commissionsPerPage = 10;
  const commissionsTotalPages = Math.max(1, Math.ceil(commissionsData.length / commissionsPerPage));
  const commissionsSafePage = Math.min(commissionsPage, commissionsTotalPages);
  const paginatedCommissionsData = commissionsData.slice((commissionsSafePage - 1) * commissionsPerPage, commissionsSafePage * commissionsPerPage);

  // "" RENDERS """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  const renderDashboard = ()=>(
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard label="Partenaires"    value={total}    sub="au total"                color="bg-gray-900 text-white"    icon="partners"/>
        <KpiCard label="Validés"        value={approved} sub={`${pending} en attente`} color="bg-green-600 text-white"   icon="check"/>
        <KpiCard label="Réabonnements"  value={reabonnementTotal} sub="validés"        color="bg-red-600 text-white"     icon="refresh"/>
        <KpiCard label="Recharges partenaires" value={`${Number(totalAdminRecharges || 0).toLocaleString()} F`} sub="recharges + créditations" color="bg-blue-600 text-white" icon="wallet"/>
        {/*  Carte orange = 6% admin sur tous les réabonnements */}
        <KpiCard label={`Mes gains (${Number(adminGainRate || 0).toLocaleString("fr-FR")}%)`} value={`${Number(adminGains || 0).toLocaleString()} F`} sub="taux réglable" color="bg-amber-500 text-white" icon="commission"/>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-border"><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Tendance</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Abonnements mensuels</h2></div>
          <div className="px-4 pb-5 pt-3">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="month" tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>
                <Line type="monotone" dataKey="abonnements" stroke="#e53935" strokeWidth={2.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-2 border-b border-border"><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Statuts</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Répartition partenaires</h2></div>
          <div className="px-4 pb-5 pt-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{label:"Validés",value:approved},{label:"En attente",value:pending},{label:"Rejetés",value:rejected}]} barSize={40}>
                <XAxis dataKey="label" tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="value" radius={[8,8,0,0]} fill="#e53935"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Historique journalier</p>
            <h2 className="text-sm font-bold text-card-foreground mt-0.5">Réabonnements et bonus gagnés</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={commissionDate}
              onChange={(e) => setCommissionDate(e.target.value)}
              className="px-3 py-1.5 border border-input rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={fetchCommissions}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/30 whitespace-nowrap"
            >
              <Icon name="refresh" size={13} /> Rechercher
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">{["Date","Partenaire","Abonné","Forfait","Type","Commission","Statut"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {commissionHistory.length===0
                ?<tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Aucune opération pour cette date</td></tr>
                :commissionHistory.slice(0, 8).map((h,i)=>(
                  <tr key={h.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(h.created_at).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3"><p className="font-semibold text-foreground">{h.prenom} {h.name}</p><p className="text-xs text-muted-foreground">{h.structure||""}</p></td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.numero_abonne||""}</td>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{h.formule_name}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{h.operation_type}</td>
                    <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">{Number(h.commission_amount).toLocaleString()} FCFA</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${Number(h.is_bonus)===1?"bg-green-50 text-green-700 border-green-200":"bg-muted text-muted-foreground border-border"}`}>{Number(h.is_bonus)===1?"Bonus":"Base"}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {/* Derniers partenaires */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <div><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Récents</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Derniers partenaires inscrits</h2></div>
          <button onClick={()=>goAdminPage("partners")} className="text-xs font-semibold text-primary hover:text-primary/80">Voir tout  </button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">{["Partenaire","Ville","Code Promo","Portefeuille","Statut"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {partners.slice(0,5).map((p,i)=>(
              <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-card-foreground text-sm">{p.name} {p.prenom}</p><p className="text-xs text-muted-foreground">{p.email}</p></div></div></td>
                <td className="px-5 py-3 text-muted-foreground">{p.ville||""}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono text-xs">{p.codePromo||""}</span></td>
                <td className="px-5 py-3 font-semibold text-green-700">{(Number(p.wallet_balance)||0).toLocaleString()} FCFA</td>
                <td className="px-5 py-3"><StatusBadge status={p.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        {recharges.filter(r=>r.statut==="en_attente").length>0&&(
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{recharges.filter(r=>r.statut==="en_attente").length} recharge(s) en attente</p>
            <button onClick={()=>goAdminPage("recharges")} className="text-xs font-semibold text-amber-700">Voir tout  </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCommissions = ()=>{
    const totalEnAttente = commissionsData.reduce((s,p)=>s+Number(p.commissions_en_attente||0),0);
    const totalHisto     = commissionsData.reduce((s,p)=>s+Number(p.commissions_totales||0),0);
    return (
      <div className="flex flex-col gap-5">
        <CommissionChart commissionsParFormule={statsFormules} isAdmin={true} commissionsAdmin={commissionRules} adminTotal={totalCommissionsAdmin} seuilAdmin={50000} onUpdate={handleCommissionUpdate}/>

        {/*  SECTION COMMISSION ABONNEMENT */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-card-foreground flex items-center gap-2">
              <Icon name="plus" size={15} className="text-primary"/>
              Commission sur Abonnement (nouveau client)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Définissez la commission fixe gagnée par un partenaire lorsqu'il effectue un <strong>nouvel abonnement</strong>.
              Cette commission s'additionne à la commission du forfait souscrit.
            </p>
          </div>
          <div className="p-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Commission fixe actuelle par abonnement</p>
                  <p className="text-2xl font-bold text-amber-800">{abonnementCommission.toLocaleString()} FCFA</p>
                  <p className="text-xs text-amber-600 mt-1">+ commission du forfait choisi</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min="0"
                    value={abonnementCommissionEdit}
                    onChange={e=>setAbonnementCommissionEdit(e.target.value)}
                    className="w-36 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    placeholder="Ex: 2000"
                  />
                  <button
                    onClick={saveAbonnementCommission}
                    disabled={savingAbonnement}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap">
                    {savingAbonnement
                      ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      : <Icon name="save" size={13}/>}
                    Valider
                  </button>
                </div>
              </div>
              {abonnementMsg && <p className={`text-xs mt-2 font-medium ${abonnementMsg.includes("")?"text-green-700":"text-red-600"}`}>{abonnementMsg}</p>}
              {Number(abonnementCommissionEdit)!==abonnementCommission && !abonnementMsg && (
                <p className="text-xs text-amber-600 mt-2">a Modification non sauvegardée</p>
              )}
            </div>
          </div>
        </div>

        {/* Paramétrage des commissions réabonnement */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-card-foreground">Paramétrage des commissions  Réabonnements</h2>
            <p className="text-xs text-muted-foreground mt-1">Commission gagnée par le partenaire à chaque réabonnement d'un client sur ce forfait.</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {commissionRules.map(rule=>(
              <div key={rule.formule_code} className="bg-muted/50 border border-border rounded-xl p-4 w-full">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <p className="text-sm font-semibold text-foreground">{rule.formule_name}</p>
                  <span className="text-xs text-muted-foreground">
                    {rule.fixed_commission!==null&&rule.fixed_commission!==undefined?"Fixe":`${Number(rule.current_rate||4).toLocaleString("fr-FR")}%`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-[11px] text-muted-foreground">
                  <div><span className="block font-semibold text-foreground">{Number(rule.price||0).toLocaleString()} F</span>Prix</div>
                  <div><span className="block font-semibold text-foreground">{Number(rule.base_progress_count||0)}/{Number(rule.required_base_count||1)}</span>Progression</div>
                  <div><span className="block font-semibold text-foreground">{Number(rule.activation_count||0)}</span>Réab.</div>
                </div>
                <div className="mb-3 rounded-lg bg-card border border-border px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Caisse actuelle</p>
                  <p className="text-lg font-bold text-foreground">{Number(rule.cashbox_amount||0).toLocaleString()} FCFA</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="number" min="0"
                    value={commissionRulesEdit[rule.formule_code]??""}
                    onChange={e=>setCommissionRulesEdit(prev=>({...prev,[rule.formule_code]:e.target.value}))}
                    className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    placeholder="Montant"/>
                  <button onClick={()=>saveCommissionRule(rule.formule_code)} disabled={savingRule===rule.formule_code}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap">
                    {savingRule===rule.formule_code
                      ?<svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      :<Icon name="save" size={13}/>}
                    Ajouter
                  </button>
                  <button onClick={()=>withdrawCommissionCashbox(rule.formule_code)} disabled={savingRule===rule.formule_code}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap">
                    <Icon name="x" size={13}/>
                    Retirer
                  </button>
                </div>
                {Number(commissionRulesEdit[rule.formule_code]||0)>0&&(
                  <p className="text-xs text-amber-600 mt-1">a Non sauvegardé</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Traçabilité caisse</p>
              <h2 className="text-sm font-bold text-card-foreground mt-0.5">Ajouts, retraits et restes remis à zéro</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Ajouté : {Number(cashboxTotals.total_added||0).toLocaleString()} FCFA · Retiré + reste reset : {Number(cashboxTotals.total_removed||0).toLocaleString()} FCFA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={commissionDate} onChange={e=>setCommissionDate(e.target.value)}
                     className="px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"/>
              <button onClick={fetchCommissions} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/30">
                <Icon name="refresh" size={13}/> Rechercher
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b border-border">{["Date","Formule","Type","Montant","Avant","Après"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {cashboxHistory.length===0
                  ?<tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Aucun mouvement de caisse pour cette date</td></tr>
                  :cashboxHistory.map((m,i)=>(
                    <tr key={m.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-foreground">{m.formule_name}</p><p className="text-xs text-muted-foreground">{m.formule_code}</p></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${m.movement_type==="add"?"bg-green-50 text-green-700 border-green-200":"bg-red-50 text-red-600 border-red-200"}`}>{m.movement_type==="add"?"Ajout":m.movement_type==="reset"?"Reset":"Retrait"}</span></td>
                      <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{Number(m.amount||0).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{Number(m.balance_before||0).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{Number(m.balance_after||0).toLocaleString()} FCFA</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Total commissions partenaires" value={`${totalHisto.toLocaleString()} FCFA`}       color="bg-gray-900 text-white"    icon="commission"/>
          <KpiCard label="Commissions en attente"        value={`${totalEnAttente.toLocaleString()} FCFA`}  sub="Non encore retirées" color="bg-amber-500 text-white" icon="bell"/>
          <KpiCard label="Partenaires actifs"            value={commissionsData.length}                      color="bg-green-600 text-white"   icon="partners"/>
        </div>

        {/* Toggle global balance */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Paiement des commissions</h2>
              <p className="text-xs text-muted-foreground mt-1">{"Activation manuelle par l'admin. Le global ouvre ou ferme le paiement pour tous."}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${balanceGlobal?"bg-green-100 text-green-700":"bg-muted text-muted-foreground"}`}>{balanceGlobal?"Activée":"Désactivée"}</span>
              <Toggle checked={balanceGlobal} onChange={toggleBalanceGlobal} loading={togglingGlobal}/>
            </div>
          </div>
        </div>

        {/* Commissions par partenaire */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Détail</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Commissions par partenaire</h2></div>
            <button onClick={fetchCommissions} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Icon name="refresh" size={13}/> Actualiser</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b border-border">{["N","Partenaire","Structure","Commissions en attente","Total historique","Portefeuille","Retrait actif"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {loadingCommissions
                  ?<tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chargement⬦</td></tr>
                  :commissionsData.length===0
                    ?<tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucun partenaire</td></tr>
                    :paginatedCommissionsData.map((p,i)=>(
                      <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                        <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{(commissionsSafePage - 1) * commissionsPerPage + i + 1}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><p className="font-semibold text-foreground">{p.prenom} {p.name}</p></div></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{p.structure||""}</td>
                        <td className="px-4 py-3 font-bold text-amber-600">{Number(p.commissions_en_attente||0).toLocaleString()} FCFA</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{Number(p.commissions_totales||0).toLocaleString()} FCFA</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{Number(p.wallet_balance||0).toLocaleString()} FCFA</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Toggle checked={balanceGlobal&&!!p.balance_actif} onChange={()=>togglePartnerBalance(p)} loading={togglingId===p.id||!balanceGlobal}/>
                            <span className={`text-xs font-medium ${balanceGlobal&&p.balance_actif?"text-green-600":"text-muted-foreground"}`}>{balanceGlobal&&p.balance_actif?"Activé":"Désactivé"}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          <PaginationBar currentPage={commissionsSafePage} totalPages={commissionsTotalPages} onPageChange={setCommissionsPage}/>
        </div>
      </div>
    );
  };

  const renderPartners = ()=>(
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total partenaires" value={total} color="bg-gray-900 text-white" icon="partners"/>
        <KpiCard label="Valides" value={approved} color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="En attente" value={pending} color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Rejetes" value={rejected} color="bg-red-600 text-white" icon="x"/>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="text" placeholder="Rechercher un partenaire⬦" value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"/></div>
        <select value={filter} onChange={e=>{setFilter(e.target.value);setCurrentPage(1);}} className="px-4 py-2.5 rounded-lg border border-input text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Tous les statuts</option><option value="approved">Validés</option><option value="pending">En attente</option><option value="rejected">Rejetés</option>
        </select>
        <button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg shadow-sm hover:bg-primary/90"><Icon name="plus" size={15}/> Ajouter</button>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">{["N","Partenaire","Structure","Localisation","Date Inscription","Téléphone","Code Promo","Portefeuille","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?<tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Chargement⬦</td></tr>
               :paginated.length===0?<tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Aucun partenaire trouvé</td></tr>
               :paginated.map((p,i)=>(
                <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{(currentPage - 1) * partnersPerPage + i + 1}</td><td className="px-4 py-3"><div className="flex items-center gap-3">{p.photo_url?<img src={serverUrl(p.photo_url)} alt={p.name} className="w-8 h-8 rounded-full object-cover"/>:<div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div>}<div><p className="font-semibold text-foreground">{p.name} {p.prenom}</p><p className="text-xs text-muted-foreground">{p.email}</p></div></div></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.structure||""}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{[p.ville,p.pays].filter(Boolean).join(", ")||""}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.created_at ? fmtDateTime(p.created_at) : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.telephone||""}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono text-xs">{p.codePromo||""}</span></td>
                  <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">{(Number(p.wallet_balance)||0).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 flex-wrap"><ActionBtn onClick={()=>approvePartner(p.id)} color="green" icon="check" title="Valider"/><ActionBtn onClick={()=>rejectPartner(p.id)} color="red" icon="x" title="Rejeter"/><ActionBtn onClick={()=>openEdit(p)} color="blue" icon="edit" title="Modifier"/><ActionBtn onClick={()=>deletePartner(p.id)} color="gray" icon="trash" title="Supprimer"/><ActionBtn onClick={()=>creditWallet(p.id)} color="purple" icon="creditcard" label="Crédit"/></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}/>
      </div>
    </div>
  );

  const renderStats = ()=>(
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
          <KpiCard label="Reabonnements valides" value={reabonnementTotal} sub="operations confirmees" color="bg-green-600 text-white" icon="refresh"/>
        </div>
        <button onClick={downloadOperationsReport} className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
          <Icon name="save" size={15}/> Tlcharger Excel
        </button>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-2 border-b border-border"><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">0volution</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Abonnements mensuels</h2></div>
        <div className="px-4 pb-6 pt-3">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{top:10,right:20,left:0,bottom:10}}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="month" tick={{fontSize:12,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:12,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false}/><Tooltip content={<ChartTooltip/>}/>
              <Line type="monotone" dataKey="abonnements" stroke="#e53935" strokeWidth={3} dot={{fill:"#e53935",r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderFormules = ()=>(
    <div className="flex flex-col gap-5">
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Tarifs</p>
          <h2 className="text-sm font-bold text-card-foreground mt-0.5">Prix des formules et options</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">{["Formule","Type","Prix actuel","Nouveau prix","Action"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {formules.map(f=>(
                <tr key={f.code} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{f.name}</p><p className="text-xs text-muted-foreground">{f.code}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{f.type}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{Number(f.price||0).toLocaleString()} FCFA</td>
                  <td className="px-4 py-3">
                    <input type="number" min="1" value={formuleEdits[f.code]??""} onChange={e=>setFormuleEdits(prev=>({...prev,[f.code]:e.target.value}))}
                      className="w-36 px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"/>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={()=>saveFormulePrice(f.code)} disabled={savingFormule===f.code}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50">
                      <Icon name="save" size={13}/> Enregistrer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-sm font-bold text-card-foreground flex items-center gap-2">
            <Icon name="settings" size={15} className="text-primary"/>
            Configuration Générale
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Gérez les paramètres globaux de l'application (numéro d'assistance WhatsApp et identifiants Fujisat).
          </p>
        </div>
        <div className="p-5 flex flex-col gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Numéro d'assistance WhatsApp</label>
            <input
              type="text"
              value={adminWhatsappSetting}
              onChange={e => setAdminWhatsappSetting(e.target.value)}
              placeholder="Ex : 237695225823"
              className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Format recommandé : indicatif pays suivi du numéro (ex: 237695225823 pour le Cameroun).</p>
          </div>

          <div className="h-px bg-border my-2"/>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">FUJISAT USER</label>
            <input
              type="text"
              value={fujisatUserSetting}
              onChange={e => setFujisatUserSetting(e.target.value)}
              placeholder="Nom d'utilisateur API Fujisat"
              className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">FUJISAT PASS</label>
            <div className="relative">
              <input
                type={showFujisatPass ? "text" : "password"}
                value={fujisatPassSetting}
                onChange={e => setFujisatPassSetting(e.target.value)}
                placeholder="Mot de passe API Fujisat"
                className="w-full border border-input rounded-lg pl-4 pr-12 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowFujisatPass(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors"
                title={showFujisatPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-label={showFujisatPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <Icon name={showFujisatPass ? "eyeOff" : "eye"} size={18}/>
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">FUJISAT TEST MODE</p>
              <p className="text-xs text-muted-foreground mt-1">{fujisatTestModeSetting ? "Mode test actif" : "Mode production actif"}</p>
            </div>
            <Toggle checked={fujisatTestModeSetting} onChange={() => setFujisatTestModeSetting(v => !v)} loading={savingSettings}/>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Taux de gain admin (%)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={adminGainRate}
              onChange={e => setAdminGainRate(e.target.value)}
              className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Ce taux remplace le 6% dans les KPI de gains admin.</p>
          </div>
          {settingsMsg && (
            <p className={`text-xs font-medium ${settingsMsg.includes("") ? "text-green-700" : "text-red-600"}`}>
              {settingsMsg}
            </p>
          )}

          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {savingSettings ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
            ) : (
              <Icon name="save" size={14}/>
            )}
            Sauvegarder les paramètres
          </button>
        </div>
      </div>
    </div>
  );

  const renderRecharges = ()=>(
    <div className="flex flex-col gap-5">
      {/*  KPI avec rejetées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total demandes" value={rechargeTotalCount||recharges.length} color="bg-gray-900 text-white"  icon="recharges"/>
        <KpiCard label="En attente"     value={recharges.filter(r=>r.statut==="en_attente").length} color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Validées"       value={recharges.filter(r=>r.statut==="validee").length}    color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="Rejetées"       value={rejectedCount} color="bg-red-600 text-white" icon="x"/>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-card-foreground">Demandes de recharge</h2>
          {/*  Barre de recherche par date */}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={rechargeSearchDate} onChange={e=>setRechargeSearchDate(e.target.value)}
                   className="px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"/>
            <button onClick={() => updateRechargeFilters(1, rechargeSearchDate)}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
              <Icon name="search" size={12}/> Filtrer
            </button>
            {rechargeDateFilter&&(
              <button onClick={() => updateRechargeFilters(1, "")}
                      className="flex items-center gap-1 px-3 py-2 border border-border text-xs font-semibold rounded-lg hover:bg-muted/30 text-muted-foreground">
                <Icon name="x" size={12}/> Effacer
              </button>
            )}
            <button onClick={()=>fetchRecharges(rechargeCurrentPage,rechargeDateFilter)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Icon name="refresh" size={13}/> Actualiser
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30 border-b border-border">{["N","Partenaire","Date","Oprateur","N Transaction","Montant","Capture","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loadingRecharges?<tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Chargement⬦</td></tr>
               :recharges.length===0?<tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Aucune demande{rechargeDateFilter?` pour le ${rechargeDateFilter}`:""}</td></tr>
               :recharges.map((r,i)=>(
                <tr key={r.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{(rechargeCurrentPage - 1) * 10 + i + 1}</td><td className="px-4 py-3"><p className="font-semibold text-foreground">{r.prenom} {r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.date_operation||r.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.moyen_paiement}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{r.numero_paiement}</td>
                  <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">{Number(r.montant).toLocaleString()} FCFA</td>
                  {/*  Capture ouvre une Lightbox au lieu d'un nouvel onglet */}
                  <td className="px-4 py-3">
                    {r.capture
                      ?<button onClick={()=>setLightboxSrc(serverUrl(`/uploads/recharges/${r.capture}`))}
                               className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline">
                          <Icon name="eye" size={12}/> Voir
                        </button>
                      :<span className="text-muted-foreground text-xs"></span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.statut}/></td>
                  <td className="px-4 py-3">{r.statut==="en_attente"&&<div className="flex gap-1.5"><ActionBtn onClick={()=>validerRecharge(r.id)} color="green" icon="check" label="Valider"/><ActionBtn onClick={()=>rejeterRecharge(r.id)} color="red" icon="x" label="Rejeter"/></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/*  Pagination sur les recharges */}
        <PaginationBar currentPage={rechargeCurrentPage} totalPages={rechargeTotalPages} onPageChange={(p) => updateRechargeFilters(p, rechargeDateFilter)}/>
      </div>
      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={()=>setLightboxSrc(null)}/>}
    </div>
  );

  //  Onglet Techniciens complet avec pagination + bouton nettoyage
  const renderTechniciens = ()=>(
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <KpiCard label="Total" value={demandeTech.length} color="bg-gray-900 text-white" icon="technicien"/>
          <KpiCard label="En attente" value={demandeTech.filter(d=>d.statut==="en_attente").length} color="bg-amber-500 text-white" icon="bell"/>
          <KpiCard label="En cours" value={demandeTech.filter(d=>d.statut==="en_cours").length} color="bg-blue-600 text-white" icon="refresh"/>
          <KpiCard label="Terminées" value={demandeTech.filter(d=>d.statut==="terminee").length} color="bg-green-600 text-white" icon="check"/>
        </div>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-card-foreground">Demandes techniciens</h2>
          <div className="flex gap-2">
            <button onClick={()=>fetchDemandeTech(techPage)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Icon name="refresh" size={13}/> Actualiser</button>
            <button onClick={cleanupTech} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100">
              <Icon name="trash" size={12}/> Nettoyer traitées
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30 border-b border-border">{["Partenaire","Client","Ville/Quartier","Téléphone","Problème","Date","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loadingTech?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Chargement⬦</td></tr>
               :demandeTech.length===0?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Aucune demande</td></tr>
               :demandeTech.map((d,i)=>(
                <tr key={d.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{d.prenom} {d.name}</p><p className="text-xs text-muted-foreground">{d.structure||""}</p></td>
                  <td className="px-4 py-3 font-medium text-foreground">{d.nom_client}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{d.ville}, {d.quartier}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{d.telephone}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs"><p className="line-clamp-2 text-xs">{d.probleme}</p></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(d.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.statut}/></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {d.statut==="en_attente"&&<ActionBtn onClick={()=>updateStatutTech(d.id,"en_cours")} color="blue" icon="refresh" label="En cours"/>}
                      {(d.statut==="en_attente"||d.statut==="en_cours")&&<ActionBtn onClick={()=>updateStatutTech(d.id,"terminee")} color="green" icon="check" label="Terminée"/>}
                      {d.statut!=="annulee"&&d.statut!=="terminee"&&<ActionBtn onClick={()=>updateStatutTech(d.id,"annulee")} color="amber" icon="x" label="Annuler"/>}
                      <ActionBtn onClick={()=>deleteTech(d.id)} color="red" icon="trash" title="Supprimer"/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar currentPage={techPage} totalPages={techTotalPages} onPageChange={setTechPage}/>
      </div>
    </div>
  );

  const renderDecoders = ()=>(
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <KpiCard label="Total décodeurs" value={decodeurs.length}                              color="bg-gray-900 text-white"  icon="creditcard"/>
        <KpiCard label="Disponibles"     value={decodeurs.filter(d=>d.status==="free").length} color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="Utilisés"        value={decodeurs.filter(d=>d.status==="used").length} color="bg-red-600 text-white"   icon="refresh"/>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-card-foreground">Liste des décodeurs</h2>
          <button onClick={()=>setShowAddDecoderModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"><Icon name="plus" size={13}/> Ajouter</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/30 border-b border-border">{["Numéro","Statut","Partenaire attribué"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {loadingDecoders?<tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Chargement⬦</td></tr>
             :decodeurs.length===0?<tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Aucun décodeur</td></tr>
             :paginatedDecodeurs.map(d=>(
              <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3 font-mono font-semibold text-foreground">{d.numero}</td>
                <td className="px-5 py-3"><span className={`px-2 py-1 text-xs rounded font-semibold ${d.status==="free"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{d.status==="free"?"Disponible":"Utilisé"}</span></td>
                <td className="px-5 py-3">{d.name?<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{(d.name[0]||"?").toUpperCase()}</div><span className="text-foreground font-medium">{d.prenom} {d.name}</span></div>:<span className="text-muted-foreground text-xs italic">Non attribué</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar currentPage={decoderSafePage} totalPages={decoderTotalPages} onPageChange={setDecoderPage}/>
      </div>
      {showAddDecoderModal&&(
        <Modal title="Ajouter un décodeur" onClose={()=>setShowAddDecoderModal(false)}>
          <div className="flex flex-col gap-4">
            <FieldInput label="Numéro du décodeur" placeholder="Ex: 4512001234" value={newDecoder.numero} onChange={e=>setNewDecoder({...newDecoder,numero:e.target.value})}/>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Partenaire</label>
              <select value={newDecoder.partner_id} onChange={e=>setNewDecoder({...newDecoder,partner_id:e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value=""> Sélectionner </option>
                {partners.filter(p=>p.status==="approved").map(p=><option key={p.id} value={p.id}>{p.prenom} {p.name}{p.codePromo?`  ${p.codePromo}`:""}</option>)}
              </select>
            </div>
            {addDecoderError&&<div className="flex items-center gap-2 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive"><Icon name="x" size={13}/> {addDecoderError}</div>}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={()=>setShowAddDecoderModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/30">Annuler</button>
            <button onClick={addDecoder} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Ajouter</button>
          </div>
        </Modal>
      )}
    </div>
  );

  const pageMap    = { dashboard:renderDashboard, partners:renderPartners, stats:renderStats, recharges:renderRecharges, commissions:renderCommissions, formules:renderFormules, techniciens:renderTechniciens, decoders:renderDecoders, settings:renderSettings };
  const pageTitles = { dashboard:"Tableau de bord", partners:"Partenaires", stats:"Statistiques", recharges:"Demandes de recharge", commissions:"Commissions", formules:"Formules", techniciens:"Demandes techniciens", decoders:"Décodeurs", settings:"Paramètres" };

  //  Sidebar content 
  const SidebarContent = ()=>(
    <>
      {/*  Logo de l'application dans la sidebar */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-border ${sidebarOpen?"":"justify-center"}`}>
        <button onClick={()=>goAdminPage("dashboard")} className="hover:opacity-80 transition-opacity flex-shrink-0">
          <img src={logo} alt="Vision Canal+" className={`object-contain rounded-xl ${sidebarOpen?"h-10 w-auto":"h-9 w-9"}`}/>
        </button>
        {sidebarOpen&&<div><p className="text-sm font-bold leading-none">Vision Canal<span className="text-destructive">+</span></p><p className="text-[10px] text-muted-foreground mt-0.5">Administration</p></div>}
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {navItems.map(({id,label,icon})=>{
          const active = activePage===id;
          const badge  = id==="recharges" ? recharges.filter(r=>r.statut==="en_attente").length : id==="techniciens" ? demandeTech.filter(d=>d.statut==="en_attente").length : 0;
          return (
            <button key={id} onClick={()=>{goAdminPage(id);setMobileSidebarOpen(false);}} title={!sidebarOpen?label:undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${active?"bg-primary text-primary-foreground shadow-md":"text-muted-foreground hover:bg-muted hover:text-foreground"} ${!sidebarOpen?"justify-center":""}`}>
              <Icon name={icon} size={18} className="flex-shrink-0"/>
              {sidebarOpen&&<span className="flex-1">{label}</span>}
              {sidebarOpen&&badge>0&&<span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border flex-shrink-0 bg-card">
        {sidebarOpen&&<div className="flex items-center gap-3 px-3 py-2 mb-2"><div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">A</div><div><p className="text-xs font-semibold text-foreground">Admin</p><p className="text-[10px] text-muted-foreground">Vision Canal+</p></div></div>}
        <button onClick={handleLogout} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-all ${!sidebarOpen?"justify-center":""}`} title={!sidebarOpen?"Se déconnecter":undefined}>
          <Icon name="logout" size={18} className="flex-shrink-0"/>{sidebarOpen&&<span>Se déconnecter</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{fontFamily:"'DM Sans', sans-serif"}}>
      <div className="flex flex-1 overflow-hidden">

        {/*  SIDEBAR DESKTOP */}
        <aside className={`hidden lg:flex flex-col bg-card transition-all duration-300 flex-shrink-0 ${sidebarOpen?"w-64":"w-16"} border-r border-border`}
               style={{height:"100vh",position:"fixed",top:0,left:0,bottom:0,zIndex:30,overflowY:"auto"}}>
          <SidebarContent/>
        </aside>

        {/*  SIDEBAR MOBILE  overlay, disparaît en mobile par défaut */}
        {mobileSidebarOpen&&(
          <>
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={()=>setMobileSidebarOpen(false)}/>
            <aside className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border shadow-2xl flex flex-col lg:hidden"
                   style={{animation:"slideIn .25s ease"}}>
              <style>{`@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold">Menu Admin</p>
                <button onClick={()=>setMobileSidebarOpen(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <Icon name="close" size={15}/>
                </button>
              </div>
              <div className="flex-1 flex flex-col overflow-y-auto"><SidebarContent/></div>
            </aside>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0 lg:ml-0"
     style={{
       marginLeft: window.innerWidth >= 1024 ? (sidebarOpen ? 256 : 64) : 0,
       transition: "margin-left 0.3s"
     }}>
          {/*  AdminNavbar avec bouton hamburger en mobile */}
          <AdminNavbar
            activePage={activePage}
            pageTitle={pageTitles[activePage]}
            toggleSidebar={()=>{
              if(window.innerWidth<1024) setMobileSidebarOpen(o=>!o);
              else setSidebarOpen(o=>!o);
            }}
          />
          <main className="flex-1 p-6"><div className="max-w-7xl mx-auto">{(pageMap[activePage]||renderDashboard)()}</div></main>
        </div>
      </div>

      {/* Modals */}
      {showAddModal&&(
        <Modal title="Ajouter un partenaire" onClose={()=>setShowAddModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            {[{label:"Nom",key:"name"},{label:"Prénom",key:"prenom"},{label:"Email",key:"email",type:"email"},{label:"Mot de passe",key:"password",type:"password"},{label:"Structure",key:"structure"},{label:"Pays",key:"pays"},{label:"Ville",key:"ville"},{label:"Quartier",key:"quartier"},{label:"Téléphone",key:"telephone"},{label:"Code Promo",key:"codePromo"}].map(({label,key,type})=>(
              <FieldInput key={key} label={label} type={type} value={newPartner[key]} onChange={e=>setNewPartner({...newPartner,[key]:e.target.value})}/>
            ))}
          </div>
          <div className="flex gap-3 mt-6"><button onClick={()=>setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/30">Annuler</button><button onClick={addPartner} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Ajouter</button></div>
        </Modal>
      )}
      {showEditModal&&(
        <Modal title="Modifier le partenaire" onClose={()=>setShowEditModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            {[{label:"Nom",key:"name"},{label:"Email",key:"email",type:"email"},{label:"Structure",key:"structure"},{label:"Pays",key:"pays"},{label:"Ville",key:"ville"},{label:"Quartier",key:"quartier"},{label:"Téléphone",key:"telephone"},{label:"Code Promo",key:"codePromo"}].map(({label,key,type})=>(
              <FieldInput key={key} label={label} type={type} value={editData[key]} onChange={e=>setEditData({...editData,[key]:e.target.value})}/>
            ))}
            <FieldInput label="Nouveau mot de passe" type="password" value={editData.password} onChange={e=>setEditData({...editData,password:e.target.value})}/>
          </div>
          <div className="flex gap-3 mt-6"><button onClick={()=>setShowEditModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/30">Annuler</button><button onClick={saveEdit} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Enregistrer</button></div>
        </Modal>
      )}
      <AiAssistant />
    </div>
  );
}

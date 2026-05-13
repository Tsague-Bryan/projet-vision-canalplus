import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminNavbar from "../components/AdminNavbar";
import CommissionChart from "../components/CommissionChart";
import { API_URL, SOCKET_URL, serverUrl } from "../lib/api";
import { authHeaders, clearSession, hasActiveSession, installActivityTracker, isAuthExpiredResponse } from "../lib/session";
import logo from "../assets/logo.png";

const API        = API_URL;
const authHdr    = authHeaders;
const isExpired  = () => !hasActiveSession("admin");

// ── Icons ──────────────────────────────────────────────────────────────────────
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
};

const Icon = ({ name, size=18, className="" }) => {
  const d = icons[name]; if(!d) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{d.map((pd,i)=><path key={i} d={pd}/>)}</svg>;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";

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

const KpiCard = ({ label, value, sub, color, icon }) => (
  <div className={`rounded-lg p-5 flex items-start gap-4 border shadow-sm ${color}`}>
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon name={icon} size={18}/></div>
    <div><p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-0.5">{label}</p><p className="text-2xl font-bold leading-none">{value}</p>{sub&&<p className="text-xs opacity-60 mt-1">{sub}</p>}</div>
  </div>
);

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

// ✅ Lightbox pour les captures de recharge
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
  { id:"wallets",     label:"Portefeuilles",    icon:"wallet"     },
  { id:"recharges",   label:"Recharges",        icon:"recharges"  },
  { id:"commissions", label:"Commissions",      icon:"commission" },
  { id:"techniciens", label:"Techniciens",      icon:"technicien" },
  { id:"decoders",    label:"Décodeurs",        icon:"creditcard" },
];

// ── Pagination ─────────────────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if(isExpired()){clearSession();navigate("/LoginForm");return undefined;}
    return installActivityTracker(()=>{clearSession();navigate("/LoginForm");},"admin");
  },[navigate]);

  const [activePage,    setActivePage]   = useState("dashboard");
  const [sidebarOpen,   setSidebarOpen]  = useState(true);
  // ✅ Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [partners,      setPartners]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [commissionTotal,   setCommissionTotal]   = useState(0);
  const [adminGains,        setAdminGains]        = useState(0);
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

  const [recharges,           setRecharges]           = useState([]);
  const [loadingRecharges,    setLoadingRecharges]    = useState(false);
  const [rechargeTotalCount,  setRechargeTotalCount]  = useState(0);
  const [rechargeTotalPages,  setRechargeTotalPages]  = useState(1);
  const [rechargeCurrentPage, setRechargeCurrentPage] = useState(1);
  const [rechargeDateFilter,  setRechargeDateFilter]  = useState("");
  const [rechargeSearchDate,  setRechargeSearchDate]  = useState("");
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
  const [balanceGlobal,         setBalanceGlobal]         = useState(false);
  const [togglingGlobal,        setTogglingGlobal]        = useState(false);
  const [togglingId,            setTogglingId]            = useState(null);
  const [commissionHistory,     setCommissionHistory]     = useState([]);
  const [commissionDate,        setCommissionDate]        = useState(()=>new Date().toISOString().slice(0,10));

  // Commission sur abonnement
  const [abonnementCommission,     setAbonnementCommission]     = useState(2000);
  const [abonnementCommissionEdit, setAbonnementCommissionEdit] = useState(2000);
  const [savingAbonnement,         setSavingAbonnement]         = useState(false);
  const [abonnementMsg,            setAbonnementMsg]            = useState("");

  // Demandes technicien
  const [demandeTech,        setDemandeTech]        = useState([]);
  const [loadingTech,        setLoadingTech]        = useState(false);
  const [techPage,           setTechPage]           = useState(1);
  const [techTotalPages,     setTechTotalPages]     = useState(1);

  const emptyPartner = {name:"",prenom:"",structure:"",pays:"",ville:"",quartier:"",telephone:"",email:"",password:"",codePromo:"",wallet_balance:""};
  const [newPartner, setNewPartner] = useState(emptyPartner);
  const [editData,   setEditData]   = useState({name:"",email:"",structure:"",pays:"",ville:"",quartier:"",telephone:"",codePromo:"",password:""});

  useEffect(()=>{
    const socket = io(SOCKET_URL,{transports:["websocket","polling"]});
    socket.on("new_notification",(data)=>{if(data.type==="recharge"||data.type==="demande_retrait")fetchRecharges();if(data.type==="demande_technicien")fetchDemandeTech();});
    socket.on("commission_rules_update",()=>fetchCommissions());
    socket.on("admin_dashboard_update", ()=>{fetchPartners();fetchStats();fetchRecharges();fetchCommissions();});
    return ()=>socket.disconnect();
  },[]);

  const handleLogout = ()=>{
    if(!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    clearSession(); navigate("/LoginForm");
  };

  // ══ FETCH ══════════════════════════════════════════════════════════════════

  const fetchStats = useCallback(async()=>{
    try{
      const res = await axios.get(`${API}/partners/stats`, authHdr());
      setReabonnementTotal(res.data.abonnements||0);
      setCommissionTotal(Number(res.data.commissions)||0);
      setAdminGains(Number(res.data.admin_gains)||0);
      const mois=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
      setChartData((res.data.reabonnementsMois||[]).map(r=>({month:mois[(r.mois||1)-1],abonnements:r.total})));
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
      const [summaryRes,statusRes,rulesRes,historyRes,configRes] = await Promise.all([
        axios.get(`${API}/admin/commissions-summary`,                         authHdr()),
        axios.get(`${API}/admin/balance-status`,                              authHdr()),
        axios.get(`${API}/admin/commission-rules`,                            authHdr()),
        axios.get(`${API}/admin/commission-operations?date=${commissionDate}`,authHdr()),
        axios.get(`${API}/admin/config/commission-abonnement`,                 authHdr()),
      ]);
      setCommissionsData(summaryRes.data.partenaires    ||[]);
      setStatsFormules(summaryRes.data.stats_formules   ||[]);
      setTotalCommissionsAdmin(Number(summaryRes.data.total_commissions||0));
      setAdminGains(Number(summaryRes.data.total_commissions||0));
      setBalanceGlobal(statusRes.data.balance_enabled===1);
      const rules = rulesRes.data||[];
      setCommissionRules(rules);
      setCommissionHistory(historyRes.data||[]);
      const editMap={};
      rules.forEach(r=>{editMap[r.formule_code]="";});
      setCommissionRulesEdit(editMap);

      // ✅ Charger la commission abonnement depuis localStorage (ou valeur par défaut)
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

  useEffect(()=>{fetchPartners();fetchStats();fetchDecoders();},[fetchPartners,fetchStats,fetchDecoders]);

  useEffect(()=>{
    const params={};
    if(rechargeCurrentPage>1) params.rechargePage=rechargeCurrentPage.toString();
    if(rechargeDateFilter)    params.rechargeDate=rechargeDateFilter;
    setSearchParams(params);
    fetchRecharges(rechargeCurrentPage,rechargeDateFilter);
  },[rechargeCurrentPage,rechargeDateFilter,setSearchParams,fetchRecharges]);

  useEffect(()=>{if(activePage==="commissions")fetchCommissions();},[activePage,fetchCommissions]);
  useEffect(()=>{if(activePage==="techniciens")fetchDemandeTech(techPage);},[activePage,techPage,fetchDemandeTech]);

  // ══ ACTIONS ════════════════════════════════════════════════════════════════

  const approvePartner = async(id)=>{await axios.put(`${API}/partners/${id}/approve`,{},authHdr());fetchPartners();};
  const rejectPartner  = async(id)=>{await axios.put(`${API}/partners/${id}/reject`,{},authHdr()); fetchPartners();};
  const deletePartner  = async(id)=>{if(!window.confirm("Supprimer ?"))return;await axios.delete(`${API}/partners/${id}`,authHdr());fetchPartners();};
  const addPartner     = async()=>{
    try{await axios.post(`${API}/partners`,newPartner,authHdr());setShowAddModal(false);setNewPartner(emptyPartner);fetchPartners();}
    catch(e){alert("Erreur : "+e.message);}
  };
  const openEdit = (p)=>{setEditId(p.id);setEditData({name:p.name,email:p.email,structure:p.structure,pays:p.pays,ville:p.ville,quartier:p.quartier,telephone:p.telephone,codePromo:p.codePromo,password:""});setShowEditModal(true);};
  const saveEdit = async()=>{
    try{
      const payload = {...editData};
      if(!payload.password?.trim()) delete payload.password;
      await axios.put(`${API}/partners/${editId}`,payload,authHdr());
      setShowEditModal(false);
      fetchPartners();
    }catch(e){
      alert(e.response?.data?.error || "Erreur lors de la modification");
    }
  };
  const creditWallet = async(id)=>{
    const amount=prompt("Montant à créditer (FCFA) :");if(!amount||isNaN(amount)||Number(amount)<=0)return alert("Montant invalide");
    try{const res=await axios.post(`${API}/partners/${id}/credit`,{amount:Number(amount)},authHdr());alert(`Crédité ! Solde : ${res.data.wallet_balance} FCFA`);fetchPartners();}
    catch(e){alert("Erreur crédit");}
  };

  const validerRecharge = async(id)=>{
    if(!window.confirm("Valider cette demande ?"))return;
    try{await axios.post(`${API}/admin/recharges/${id}/valider`,{},authHdr());alert("Recharge validée !");fetchRecharges();fetchPartners();}
    catch(e){alert(e.response?.data?.error||"Erreur");}
  };
  const rejeterRecharge = async(id)=>{
    if(!window.confirm("Rejeter ?"))return;
    try{await axios.post(`${API}/admin/recharges/${id}/rejeter`,{},authHdr());fetchRecharges();}
    catch(e){alert("Erreur");}
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
    catch(e){alert("Erreur : "+(e.response?.data?.error||e.message));}
    finally{setTogglingGlobal(false);}
  };

  const togglePartnerBalance = async(partner)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    if(!window.confirm(`${partner.balance_actif?"Désactiver":"Activer"} le retrait pour ${partner.prenom} ${partner.name} ?`))return;
    setTogglingId(partner.id);
    try{
      await axios.post(`${API}/admin/balance-toggle-partner/${partner.id}`,{enabled:!partner.balance_actif},authHdr());
      setCommissionsData(prev=>prev.map(p=>p.id===partner.id?{...p,balance_actif:!p.balance_actif}:p));
    }catch(e){alert("Erreur : "+(e.response?.data?.error||e.message));}
    finally{setTogglingId(null);}
  };

  const saveCommissionRule = async(code)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    const rule = commissionRules.find(r=>r.formule_code===code);
    const val  = Number(commissionRulesEdit[code]);
    if(!val||val<=0){alert("Montant de caisse invalide");return;}
    setSavingRule(code);
    try{
      const body = {cashbox_amount:val};
      const res = await axios.put(`${API}/admin/commission-rules/${code}`,body,authHdr());
      const updated = res.data?.rule||{...rule,cashbox_amount:Number(rule?.cashbox_amount||0)+val};
      setCommissionRules(prev=>prev.map(r=>r.formule_code===code?{...r,...updated}:r));
      setCommissionRulesEdit(prev=>({...prev,[code]:""}));
      alert(`Commission ${code} mise à jour à ${val.toLocaleString()} FCFA`);
    }catch(e){alert("Erreur : "+(e.response?.data?.error||e.message));}
    finally{setSavingRule(null);}
  };

  const handleCommissionUpdate = async(code,val)=>{
    if(isExpired()){navigate("/LoginForm");return;}
    try{
      await axios.put(`${API}/admin/commission-rules/${code}`,{cashbox_amount:val},authHdr());
      setCommissionRules(prev=>prev.map(r=>r.formule_code===code?{...r,cashbox_amount:Number(r.cashbox_amount||0)+Number(val)}:r));
    }catch(e){console.error(e);}
  };

  // ✅ Sauvegarder la commission sur abonnement
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
    setAbonnementMsg(`✅ Commission abonnement fixée à ${val.toLocaleString()} FCFA`);
  } catch (e) {
    setAbonnementMsg("Erreur : " + (e.response?.data?.error || e.message));
  } finally {
    setSavingAbonnement(false);
  }
};

  // Techniciens
  const updateStatutTech = async(id,statut)=>{
    if(!window.confirm(`Mettre le statut à "${statut}" ?`))return;
    try{await axios.put(`${API}/admin/demandes-technicien/${id}/statut`,{statut},authHdr());fetchDemandeTech(techPage);}
    catch(e){alert("Erreur");}
  };
  const deleteTech = async(id)=>{
    if(!window.confirm("Supprimer cette demande ?"))return;
    try{await axios.delete(`${API}/admin/demandes-technicien/${id}`,authHdr());fetchDemandeTech(techPage);}
    catch(e){alert("Erreur");}
  };
  const cleanupTech = async()=>{
    if(!window.confirm("Supprimer toutes les demandes traitées (terminées/annulées) ?"))return;
    try{await axios.delete(`${API}/admin/demandes-technicien-cleanup`,authHdr());fetchDemandeTech(1);}
    catch(e){alert("Erreur");}
  };

  const filtered   = partners.filter(p=>{const q=search.toLowerCase();return(p.name?.toLowerCase().includes(q)||p.email?.toLowerCase().includes(q))&&(filter==="all"||p.status===filter);});
  const total      = partners.length;
  const approved   = partners.filter(p=>p.status==="approved").length;
  const pending    = partners.filter(p=>p.status==="pending").length;
  const rejected   = partners.filter(p=>p.status==="rejected").length;
  const totalWallet = partners.reduce((s,p)=>s+(Number(p.wallet_balance)||0),0);
  const totalPages  = Math.ceil(filtered.length/partnersPerPage);
  const paginated   = filtered.slice((currentPage-1)*partnersPerPage,currentPage*partnersPerPage);

  // ══ RENDERS ════════════════════════════════════════════════════════════════

  const renderDashboard = ()=>(
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Partenaires"    value={total}    sub="au total"                color="bg-gray-900 text-white"    icon="partners"/>
        <KpiCard label="Validés"        value={approved} sub={`${pending} en attente`} color="bg-green-600 text-white"   icon="check"/>
        <KpiCard label="Réabonnements"  value={reabonnementTotal} sub="validés"        color="bg-red-600 text-white"     icon="refresh"/>
        {/* ✅ Carte orange = 6% admin sur tous les réabonnements */}
        <KpiCard label="Mes gains (6%)" value={`${(adminGains||commissionTotal).toLocaleString()} F`} sub="6% sur réabonnements" color="bg-amber-500 text-white" icon="commission"/>
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
      {/* Derniers partenaires */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <div><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Récents</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Derniers partenaires inscrits</h2></div>
          <button onClick={()=>setActivePage("partners")} className="text-xs font-semibold text-primary hover:text-primary/80">Voir tout →</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">{["Partenaire","Ville","Code Promo","Portefeuille","Statut"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {partners.slice(0,5).map((p,i)=>(
              <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-card-foreground text-sm">{p.name} {p.prenom}</p><p className="text-xs text-muted-foreground">{p.email}</p></div></div></td>
                <td className="px-5 py-3 text-muted-foreground">{p.ville||"—"}</td>
                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono text-xs">{p.codePromo||"—"}</span></td>
                <td className="px-5 py-3 font-semibold text-green-700">{(Number(p.wallet_balance)||0).toLocaleString()} FCFA</td>
                <td className="px-5 py-3"><StatusBadge status={p.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        {recharges.filter(r=>r.statut==="en_attente").length>0&&(
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{recharges.filter(r=>r.statut==="en_attente").length} recharge(s) en attente</p>
            <button onClick={()=>setActivePage("recharges")} className="text-xs font-semibold text-amber-700">Voir tout →</button>
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

        {/* ✅ SECTION COMMISSION ABONNEMENT */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-card-foreground flex items-center gap-2">
              <Icon name="plus" size={15} className="text-primary"/>
              Commission sur Abonnement (nouveau client)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Définissez la commission fixe gagnée par un partenaire lorsqu'il effectue un <strong>nouvel abonnement</strong>.
              Cette commission s'additionne à la commission du forfait souscrit.
              <br/>Exemple : Abonnement Access (5 000 F) → Commission = <strong>{abonnementCommission.toLocaleString()} F + commission du forfait</strong>
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
              {abonnementMsg && <p className={`text-xs mt-2 font-medium ${abonnementMsg.includes("✅")?"text-green-700":"text-red-600"}`}>{abonnementMsg}</p>}
              {Number(abonnementCommissionEdit)!==abonnementCommission && !abonnementMsg && (
                <p className="text-xs text-amber-600 mt-2">⚠ Modification non sauvegardée</p>
              )}
            </div>
            {/* Exemple de calcul */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Exemple de calcul</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {formule:"Access",prix:5000,comm:200},
                  {formule:"Évasion",prix:10500,comm:420},
                  {formule:"Tout Canal+",prix:28000,comm:1120},
                ].map(({formule,prix,comm})=>(
                  <div key={formule} className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className="text-xs font-semibold text-foreground mb-1">{formule}</p>
                    <p className="text-[10px] text-muted-foreground">{prix.toLocaleString()} FCFA</p>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground">Commission totale</p>
                      <p className="text-sm font-bold text-green-700">{(abonnementCommission+comm).toLocaleString()} F</p>
                      <p className="text-[10px] text-muted-foreground">{abonnementCommission.toLocaleString()} + {comm.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Paramétrage des commissions réabonnement */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-card-foreground">Paramétrage des commissions — Réabonnements</h2>
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="number" min="0"
                    value={commissionRulesEdit[rule.formule_code]??""}
                    onChange={e=>setCommissionRulesEdit(prev=>({...prev,[rule.formule_code]:e.target.value}))}
                    className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    placeholder="Alimenter la caisse"/>
                  <button onClick={()=>saveCommissionRule(rule.formule_code)} disabled={savingRule===rule.formule_code}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap">
                    {savingRule===rule.formule_code
                      ?<svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      :<Icon name="save" size={13}/>}
                    Valider
                  </button>
                </div>
                {Number(commissionRulesEdit[rule.formule_code]||0)>0&&(
                  <p className="text-xs text-amber-600 mt-1">⚠ Non sauvegardé</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Total commissions partenaires" value={`${totalHisto.toLocaleString()} FCFA`}       color="bg-gray-900 text-white"    icon="commission"/>
          <KpiCard label="Commissions en attente"        value={`${totalEnAttente.toLocaleString()} FCFA`}  sub="Non encore retirées" color="bg-amber-500 text-white" icon="bell"/>
          <KpiCard label="Partenaires actifs"            value={commissionsData.length}                      color="bg-green-600 text-white"   icon="partners"/>
        </div>

        {/* Historique journalier */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Historique journalier</p>
              <h2 className="text-sm font-bold text-card-foreground mt-0.5">Réabonnements et bonus gagnés</h2>
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
              <thead><tr className="bg-muted/50 border-b border-border">{["Date","Partenaire","Abonné","Forfait","Type","Taux","Commission","Statut"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {commissionHistory.length===0
                  ?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Aucune opération pour cette date</td></tr>
                  :commissionHistory.map((h,i)=>(
                    <tr key={h.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(h.created_at).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-foreground">{h.prenom} {h.name}</p><p className="text-xs text-muted-foreground">{h.structure||"—"}</p></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.numero_abonne||"—"}</td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{h.formule_name}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{h.operation_type}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{Number(h.rate_applied).toLocaleString("fr-FR")}%</td>
                      <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">{Number(h.commission_amount).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${Number(h.is_bonus)===1?"bg-green-50 text-green-700 border-green-200":"bg-muted text-muted-foreground border-border"}`}>{Number(h.is_bonus)===1?"Bonus":"Base"}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Toggle global balance */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Paiement des commissions</h2>
              <p className="text-xs text-muted-foreground mt-1">{"Activation manuelle par l'admin. Le global ouvre ou ferme le paiement pour tous."}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${balanceGlobal?"bg-green-100 text-green-700":"bg-muted text-muted-foreground"}`}>{balanceGlobal?"✅ Activée":"🔒 Désactivée"}</span>
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
              <thead><tr className="bg-muted/50 border-b border-border">{["Partenaire","Structure","Commissions en attente","Total historique","Portefeuille","Retrait actif"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {loadingCommissions
                  ?<tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement…</td></tr>
                  :commissionsData.length===0
                    ?<tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun partenaire</td></tr>
                    :commissionsData.map((p,i)=>(
                      <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><p className="font-semibold text-foreground">{p.prenom} {p.name}</p></div></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{p.structure||"—"}</td>
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
        </div>
      </div>
    );
  };

  const renderPartners = ()=>(
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52"><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="text" placeholder="Rechercher un partenaire…" value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"/></div>
        <select value={filter} onChange={e=>{setFilter(e.target.value);setCurrentPage(1);}} className="px-4 py-2.5 rounded-lg border border-input text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Tous les statuts</option><option value="approved">Validés</option><option value="pending">En attente</option><option value="rejected">Rejetés</option>
        </select>
        <button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg shadow-sm hover:bg-primary/90"><Icon name="plus" size={15}/> Ajouter</button>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">{["Partenaire","Structure","Localisation","Téléphone","Code Promo","Portefeuille","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loading?<tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Chargement…</td></tr>
               :paginated.length===0?<tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Aucun partenaire trouvé</td></tr>
               :paginated.map((p,i)=>(
                <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3">{p.photo_url?<img src={serverUrl(p.photo_url)} alt={p.name} className="w-8 h-8 rounded-full object-cover"/>:<div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div>}<div><p className="font-semibold text-foreground">{p.name} {p.prenom}</p><p className="text-xs text-muted-foreground">{p.email}</p></div></div></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.structure||"—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{[p.ville,p.pays].filter(Boolean).join(", ")||"—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.telephone||"—"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono text-xs">{p.codePromo||"—"}</span></td>
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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total partenaires" value={total}    color="bg-gray-900 text-white"  icon="partners"/>
        <KpiCard label="Validés"           value={approved} color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="En attente"        value={pending}  color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Rejetés"           value={rejected} color="bg-red-600 text-white"   icon="x"/>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-2 border-b border-border"><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Évolution</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Abonnements mensuels</h2></div>
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

  const renderWallets = ()=>(
    <div className="flex flex-col gap-5">
      <KpiCard label="Total portefeuilles" value={`${totalWallet.toLocaleString()} FCFA`} sub={`${approved} partenaires validés`} color="bg-green-600 text-white" icon="wallet"/>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border"><p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Soldes</p><h2 className="text-sm font-bold text-card-foreground mt-0.5">Portefeuilles partenaires</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">{["Partenaire","Code Promo","Statut","Solde","Action"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {partners.map((p,i)=>(
                <tr key={p.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">{(p.name?.[0]||"?").toUpperCase()}</div><div><p className="font-semibold text-foreground">{p.name} {p.prenom}</p><p className="text-xs text-muted-foreground">{p.email}</p></div></div></td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 bg-muted text-muted-foreground rounded font-mono text-xs">{p.codePromo||"—"}</span></td>
                  <td className="px-5 py-3"><StatusBadge status={p.status}/></td>
                  <td className="px-5 py-3"><span className="text-lg font-bold text-green-700">{(Number(p.wallet_balance)||0).toLocaleString()}</span><span className="text-xs text-muted-foreground ml-1">FCFA</span></td>
                  <td className="px-5 py-3"><ActionBtn onClick={()=>creditWallet(p.id)} color="green" icon="creditcard" label="Créditer"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRecharges = ()=>(
    <div className="flex flex-col gap-5">
      {/* ✅ KPI avec rejetées */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total demandes" value={rechargeTotalCount||recharges.length} color="bg-gray-900 text-white"  icon="recharges"/>
        <KpiCard label="En attente"     value={recharges.filter(r=>r.statut==="en_attente").length} color="bg-amber-500 text-white" icon="bell"/>
        <KpiCard label="Validées"       value={recharges.filter(r=>r.statut==="validee").length}    color="bg-green-600 text-white" icon="check"/>
        <KpiCard label="Rejetées"       value={rejectedCount} color="bg-red-600 text-white" icon="x"/>
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-card-foreground">Demandes de recharge</h2>
          {/* ✅ Barre de recherche par date */}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={rechargeSearchDate} onChange={e=>setRechargeSearchDate(e.target.value)}
                   className="px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"/>
            <button onClick={()=>{setRechargeDateFilter(rechargeSearchDate);setRechargeCurrentPage(1);}}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
              <Icon name="search" size={12}/> Filtrer
            </button>
            {rechargeDateFilter&&(
              <button onClick={()=>{setRechargeDateFilter("");setRechargeSearchDate("");setRechargeCurrentPage(1);}}
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
            <thead><tr className="bg-muted/30 border-b border-border">{["Partenaire","Date","Opérateur","N° Transaction","Montant","Capture","Statut","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {loadingRecharges?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Chargement…</td></tr>
               :recharges.length===0?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Aucune demande{rechargeDateFilter?` pour le ${rechargeDateFilter}`:""}</td></tr>
               :recharges.map((r,i)=>(
                <tr key={r.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{r.prenom} {r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.date_operation||r.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.moyen_paiement}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{r.numero_paiement}</td>
                  <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">{Number(r.montant).toLocaleString()} FCFA</td>
                  {/* ✅ Capture ouvre une Lightbox au lieu d'un nouvel onglet */}
                  <td className="px-4 py-3">
                    {r.capture
                      ?<button onClick={()=>setLightboxSrc(serverUrl(`/uploads/recharges/${r.capture}`))}
                               className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline">
                          <Icon name="eye" size={12}/> Voir
                        </button>
                      :<span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.statut}/></td>
                  <td className="px-4 py-3">{r.statut==="en_attente"&&<div className="flex gap-1.5"><ActionBtn onClick={()=>validerRecharge(r.id)} color="green" icon="check" label="Valider"/><ActionBtn onClick={()=>rejeterRecharge(r.id)} color="red" icon="x" label="Rejeter"/></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* ✅ Pagination sur les recharges */}
        <PaginationBar currentPage={rechargeCurrentPage} totalPages={rechargeTotalPages} onPageChange={setRechargeCurrentPage}/>
      </div>
      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={()=>setLightboxSrc(null)}/>}
    </div>
  );

  // ✅ Onglet Techniciens complet avec pagination + bouton nettoyage
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
              {loadingTech?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Chargement…</td></tr>
               :demandeTech.length===0?<tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Aucune demande</td></tr>
               :demandeTech.map((d,i)=>(
                <tr key={d.id} className={`hover:bg-muted/30 ${i!==0?"border-t border-border":""}`}>
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{d.prenom} {d.name}</p><p className="text-xs text-muted-foreground">{d.structure||"—"}</p></td>
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
            {loadingDecoders?<tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Chargement…</td></tr>
             :decodeurs.length===0?<tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Aucun décodeur</td></tr>
             :decodeurs.map(d=>(
              <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3 font-mono font-semibold text-foreground">{d.numero}</td>
                <td className="px-5 py-3"><span className={`px-2 py-1 text-xs rounded font-semibold ${d.status==="free"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{d.status==="free"?"Disponible":"Utilisé"}</span></td>
                <td className="px-5 py-3">{d.name?<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">{(d.name[0]||"?").toUpperCase()}</div><span className="text-foreground font-medium">{d.prenom} {d.name}</span></div>:<span className="text-muted-foreground text-xs italic">Non attribué</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAddDecoderModal&&(
        <Modal title="Ajouter un décodeur" onClose={()=>setShowAddDecoderModal(false)}>
          <div className="flex flex-col gap-4">
            <FieldInput label="Numéro du décodeur" placeholder="Ex: 4512001234" value={newDecoder.numero} onChange={e=>setNewDecoder({...newDecoder,numero:e.target.value})}/>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Partenaire</label>
              <select value={newDecoder.partner_id} onChange={e=>setNewDecoder({...newDecoder,partner_id:e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value="">— Sélectionner —</option>
                {partners.filter(p=>p.status==="approved").map(p=><option key={p.id} value={p.id}>{p.prenom} {p.name}{p.codePromo?` — ${p.codePromo}`:""}</option>)}
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

  const pageMap    = { dashboard:renderDashboard, partners:renderPartners, stats:renderStats, wallets:renderWallets, recharges:renderRecharges, commissions:renderCommissions, techniciens:renderTechniciens, decoders:renderDecoders };
  const pageTitles = { dashboard:"Tableau de bord", partners:"Partenaires", stats:"Statistiques", wallets:"Portefeuilles", recharges:"Demandes de recharge", commissions:"Commissions", techniciens:"Demandes techniciens", decoders:"Décodeurs" };

  // ── Sidebar content ─────────────────────────────────────────────────────────
  const SidebarContent = ()=>(
    <>
      {/* ✅ Logo de l'application dans la sidebar */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-border ${sidebarOpen?"":"justify-center"}`}>
        <button onClick={()=>setActivePage("dashboard")} className="hover:opacity-80 transition-opacity flex-shrink-0">
          <img src={logo} alt="Vision Canal+" className={`object-contain rounded-xl ${sidebarOpen?"h-10 w-auto":"h-9 w-9"}`}/>
        </button>
        {sidebarOpen&&<div><p className="text-sm font-bold leading-none">Vision Canal<span className="text-destructive">+</span></p><p className="text-[10px] text-muted-foreground mt-0.5">Administration</p></div>}
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {navItems.map(({id,label,icon})=>{
          const active = activePage===id;
          const badge  = id==="recharges" ? recharges.filter(r=>r.statut==="en_attente").length : id==="techniciens" ? demandeTech.filter(d=>d.statut==="en_attente").length : 0;
          return (
            <button key={id} onClick={()=>{setActivePage(id);setMobileSidebarOpen(false);}} title={!sidebarOpen?label:undefined}
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

        {/* ✅ SIDEBAR DESKTOP */}
        <aside className={`hidden lg:flex flex-col bg-card transition-all duration-300 flex-shrink-0 ${sidebarOpen?"w-64":"w-16"} border-r border-border`}
               style={{height:"100vh",position:"fixed",top:0,left:0,bottom:0,zIndex:30,overflowY:"auto"}}>
          <SidebarContent/>
        </aside>

        {/* ✅ SIDEBAR MOBILE — overlay, disparaît en mobile par défaut */}
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
          {/* ✅ AdminNavbar avec bouton hamburger en mobile */}
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
    </div>
  );
}

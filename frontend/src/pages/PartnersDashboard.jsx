import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import InvoiceViewer from "../components/InvoiceViewer";
import logo from "../assets/logo.png";
import cfgImg from "../assets/cfg.jpg";
import abonnementsImg from "../assets/abonnements.png";
import accessoiresImg from "../assets/Dcodeur.png";
import technicienImg from "../assets/inst.jpg";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import CommissionChart from "../components/CommissionChart";
import AiAssistant from "../components/AiAssistant";
import { usePagination } from "../components/Pagination";
import { API_URL, serverUrl } from "../lib/api";
import { createAppSocket } from "../lib/socket";
import { notifyUser, requestNotificationPermission } from "../lib/notifications";
import { clearSession, decodeToken, getToken, hasActiveSession, installActivityTracker } from "../lib/session";

const API        = API_URL;

const tokenValid = () => hasActiveSession("partner");
const getUserId  = () => decodeToken(getToken())?.id || null;
const isDisabledFormule = (item = {}) => {
  const code = String(item.formule_code || item.code || item.formule || "").toUpperCase();
  const name = String(item.formule_name || item.name || item.label || item.formule || "").toLowerCase();
  return code === "EVPDD" || name.includes("evasion+") || name.includes("evasion +") || name.includes("vasion+") || name.includes("vasion +");
};
const activeFormules = (items = []) => items.filter((item) => !isDisabledFormule(item));

//  Icons 
const IconHome     = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={active?"#e53935":"none"} stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/></svg>;
const IconTrans    = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16l-4-4 4-4M17 8l4 4-4 4M13 4l-2 16"/></svg>;
const IconStats    = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const IconWallet   = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><circle cx="12" cy="14" r="2"/></svg>;
const IconSettings = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconDecoder  = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const IconOffers   = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4"/><path d="M20 12H4"/><path d="M20 17H4"/><path d="M7 4v16"/></svg>;
const IconBell     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconChevron  = ({ open }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>;
const IconChevronR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>;
const IconMenu     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconClose    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IconCamera   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;

const fmt     = (n) => Number(n||0).toLocaleString("fr-FR");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "";

const inputCls = (err) =>
  `w-full border rounded-lg px-4 py-3 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${err?"border-destructive":"border-input"}`;

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

const Spinner = () => <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>;

//  Avatar partenaire 
const Avatar = ({ photoUrl, name, size = 40 }) => {
  const initiale = (name || "?")[0].toUpperCase();
  if (photoUrl) {
    return <img src={serverUrl(photoUrl)} alt={name} className="rounded-full object-cover border-2 border-white/20" style={{ width: size, height: size }}/>;
  }
  return (
    <div className="rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center border-2 border-primary/30"
         style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initiale}
    </div>
  );
};

//  Modal 
const Modal = ({ onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
       style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
       onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-card w-full sm:max-w-lg sm:rounded-lg rounded-t-3xl px-6 pt-5 pb-10 sm:pb-8 overflow-y-auto max-h-[92vh] border border-border"
         style={{ animation:"modalIn .28s cubic-bezier(.4,0,.2,1)" }}>
      <style>{`@keyframes modalIn{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5 sm:hidden"/>
      {children}
    </div>
  </div>
);

const ModalHeader = ({ icon, title, subtitle, onClose }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:icon.bg }}>{icon.el}</div>
    <div><p className="text-base font-bold text-foreground">{title}</p><p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p></div>
    <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:bg-muted/80 flex-shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
);

const SuccessScreen = ({ title, message, onClose }) => (
  <div className="flex flex-col items-center py-8 text-center gap-4">
    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <p className="text-lg font-bold text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    <button onClick={onClose} className="mt-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all">Fermer</button>
  </div>
);

//  Modal Recharger 
const OPERATEURS = ["MTN Mobile Money","Orange Money","Express Union","Autre"];

const ModalRecharger = ({ onClose, onSuccess }) => {
  const [form, setForm]       = useState({ numero:"", operateur:"", id_transaction:"", montant:"", date_operation:new Date().toISOString().slice(0,10) });
  const [capture, setCapture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = k => e => { setForm(p=>({...p,[k]:e.target.value})); setErrors(p=>({...p,[k]:undefined})); };
  const handleFile = e => { const f=e.target.files[0]; if(!f)return; setCapture(f); const r=new FileReader(); r.onload=ev=>setPreview(ev.target.result); r.readAsDataURL(f); };

  const validate = () => {
    const e={};
    if(!form.numero.trim())         e.numero="Champ obligatoire";
    if(!form.operateur)             e.operateur="Sélectionnez un opérateur";
    if(!form.date_operation)        e.date_operation="Date obligatoire";
    if(!form.id_transaction.trim()) e.id_transaction="Champ obligatoire";
    if(!form.montant||isNaN(Number(form.montant))||Number(form.montant)<=0) e.montant="Montant invalide";
    if(!capture)                    e.capture="Veuillez joindre une capture";
    return e;
  };

  const handleSubmit = async () => {
    const e=validate(); if(Object.keys(e).length){setErrors(e);return;}
    setLoading(true);
    try {
      const body=new FormData();
      body.append("numero",form.numero); body.append("moyen_paiement",form.operateur);
      body.append("numero_paiement",form.id_transaction); body.append("montant",form.montant);
      body.append("date_operation",form.date_operation); body.append("capture",capture);
      const res=await fetch(`${API}/admin/notifications`,{method:"POST",headers:{Authorization:`Bearer ${getToken()}`},body});
      if(!res.ok){const d=await res.json().catch(()=>{});throw new Error(d?.error||`Erreur ${res.status}`);}
      onSuccess?.();
      setSuccess(true);
    } catch(err){setErrors(p=>({...p,global:err.message||"Erreur lors de l'envoi."}));}
    finally{setLoading(false);}
  };

  if(success) return <Modal onClose={onClose}><SuccessScreen title="Demande envoyée !" message="L'admin validera votre recharge sous peu." onClose={onClose}/></Modal>;

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={{bg:"#eff6ff",el:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 12v6M9 15l3-3 3 3"/></svg>}}
                 title="Recharger le portefeuille" subtitle="Remplissez le formulaire après votre dépôt mobile" onClose={onClose}/>
      <div className="flex flex-col gap-4 mb-6">
        <Field label="Numéro de téléphone" error={errors.numero}><input type="text" value={form.numero} onChange={set("numero")} placeholder="Ex : 659026548" className={inputCls(errors.numero)}/></Field>
        <Field label="Opérateur mobile" error={errors.operateur}>
          <select value={form.operateur} onChange={set("operateur")} className={inputCls(errors.operateur)+" cursor-pointer"}>
            <option value="">-- Sélectionner --</option>{OPERATEURS.map(op=><option key={op} value={op}>{op}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date de l'opération" error={errors.date_operation}><input type="date" value={form.date_operation} onChange={set("date_operation")} className={inputCls(errors.date_operation)}/></Field>
          <Field label="ID transaction" error={errors.id_transaction}><input type="text" value={form.id_transaction} onChange={set("id_transaction")} placeholder="Ex : TXN123456" className={inputCls(errors.id_transaction)}/></Field>
        </div>
        <Field label="Montant (FCFA)" error={errors.montant}><input type="number" value={form.montant} onChange={set("montant")} placeholder="Ex : 5000" min="1" className={inputCls(errors.montant)}/></Field>
        <Field label="Capture d'écran" error={errors.capture}>
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer py-5 px-4 ${errors.capture?"border-destructive bg-destructive/10":"border-input bg-muted/30 hover:bg-muted/50"}`}>
            {preview
              ? <div className="w-full flex flex-col items-center gap-2"><img src={preview} alt="aperçu" className="max-h-40 rounded-lg object-contain border border-border"/><p className="text-xs text-primary font-medium">Changer l'image</p></div>
              : <div className="flex flex-col items-center gap-2 text-muted-foreground"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p className="text-sm font-medium text-foreground">Cliquer pour ajouter</p><p className="text-xs text-muted-foreground">PNG, JPG · Max 5 Mo</p></div>}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden"/>
          </label>
        </Field>
        {errors.global && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{errors.global}</p>}
      </div>
      <button onClick={handleSubmit} disabled={loading} className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-lg text-sm disabled:opacity-60 hover:bg-primary/90">
        {loading ? <Spinner /> : null}{loading ? "Envoi..." : "Valider la demande"}
      </button>
    </Modal>
  );
};

//  Modal Confirm Balance 
const ModalConfirmBalance = ({ commissionBalance, onClose, onConfirm, loading }) => (
  <Modal onClose={onClose}>
    <ModalHeader icon={{bg:"#f0fdf4",el:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}}
               title="Confirmer le transfert" subtitle="Vos commissions vont être ajoutées à votre portefeuille" onClose={onClose}/>
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 text-center">
      <p className="text-xs text-green-600 uppercase tracking-widest mb-1">Montant à transférer</p>
      <p className="text-3xl font-bold text-green-700">{fmt(commissionBalance)} FCFA</p>
    </div>
    <p className="text-sm text-muted-foreground text-center mb-6">Voulez-vous vraiment transférer vos commissions vers votre portefeuille ?</p>
    <div className="flex gap-3">
      <button onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/30">Annuler</button>
      <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <Spinner /> : null}{loading ? "Transfert..." : "Oui, transférer"}
      </button>
    </div>
  </Modal>
);

//  Modal Technicien 
const ModalTechnicien = ({ onClose }) => {
  const [form, setForm]     = useState({ nom:"", telephone:"", ville:"", quartier:"", probleme:"" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = e => { setForm(p=>({...p,[e.target.name]:e.target.value})); setErrors(p=>({...p,[e.target.name]:undefined})); };

  const validate = () => {
    const e={};
    if(!form.nom.trim())       e.nom="Champ obligatoire";
    if(!form.telephone.trim()) e.telephone="Champ obligatoire";
    if(!form.ville.trim())     e.ville="Champ obligatoire";
    if(!form.quartier.trim())  e.quartier="Champ obligatoire";
    if(!form.probleme.trim())  e.probleme="Champ obligatoire";
    return e;
  };

  const handleSubmit = async () => {
    const e=validate(); if(Object.keys(e).length){setErrors(e);return;}
    setLoading(true);
    try {
      const res=await fetch(`${API}/partner/demande-technicien`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify(form)});
      if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Erreur lors de l'envoi");}
      setSuccess(true);
    } catch(err){setErrors(p=>({...p,global:err.message||"Erreur lors de l'envoi"}));}
    finally{setLoading(false);}
  };

  if(success) return (
    <Modal onClose={onClose}>
      <SuccessScreen title="Demande envoyée !" message="Notre équipe technique vous contactera sous 24h." onClose={onClose}/>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={{bg:"#eff6ff",el:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}}
        title="Contacter un technicien" subtitle="Décrivez votre problème d'installation ou de dépannage" onClose={onClose}/>
      <div className="flex flex-col gap-4 mb-6">
        <Field label="Nom complet" error={errors.nom}><input type="text" name="nom" value={form.nom} onChange={handleChange} placeholder="Ex: Jean Dupont" className={inputCls(errors.nom)}/></Field>
        <Field label="Téléphone" error={errors.telephone}><input type="tel" name="telephone" value={form.telephone} onChange={handleChange} placeholder="Ex: 659026548" className={inputCls(errors.telephone)}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville" error={errors.ville}><input type="text" name="ville" value={form.ville} onChange={handleChange} placeholder="Ex: Douala" className={inputCls(errors.ville)}/></Field>
          <Field label="Quartier" error={errors.quartier}><input type="text" name="quartier" value={form.quartier} onChange={handleChange} placeholder="Ex: Akwa" className={inputCls(errors.quartier)}/></Field>
        </div>
        <Field label="Description du problème" error={errors.probleme}>
          <textarea name="probleme" value={form.probleme} onChange={handleChange} placeholder="Décrivez votre problème..." rows="4" className={inputCls(errors.probleme)+" resize-none"}/>
        </Field>
        {errors.global && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{errors.global}</p>}
      </div>
      <button onClick={handleSubmit} disabled={loading} className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-lg text-sm disabled:opacity-60 hover:bg-primary/90">
        {loading?<Spinner/>:null}{loading?"Envoi en cours...":"Envoyer la demande"}
      </button>
    </Modal>
  );
};

//  Nav items 
const navItems = [
  { id:"accueil",      label:"Accueil",      Icon:IconHome     },
  { id:"transactions", label:"Transactions", Icon:IconTrans    },
  { id:"statistiques", label:"Statistiques", Icon:IconStats    },
  { id:"portefeuille", label:"Portefeuille", Icon:IconWallet   },
  { id:"offres",       label:"Offres",       Icon:IconOffers   },
  { id:"decodeurs",    label:"Décodeurs",    Icon:IconDecoder  },
  { id:"parametres",   label:"Paramètres",   Icon:IconSettings },
];

const navMobileFixed = ["accueil","transactions","portefeuille","parametres"];
const navMobileExtra = ["statistiques","offres","decodeurs"];

//  Bouton Réabonnement vient EN PREMIER avant Abonnement
const services = [
  { id:"reabonnement", label:"Réabonnement", image:abonnementsImg, route:"/reabonnement"  },
  { id:"abonnement",   label:"Abonnement",   image:cfgImg,         route:"/abonnements"   },
  { id:"technicien",   label:"Technicien",   image:technicienImg,  route:null             },
  { id:"accessoire",   label:"Accessoire",   image:accessoiresImg, route:"/boutique"      },
];

//  PAGE ACCUEIL 
const PageAccueil = ({ message, wallet, commissionBalance, commissionsParFormule, commissionRules, navigate, adminWhatsapp }) => {
  const [showTech, setShowTech] = useState(false);

  // Couleurs moins agressives pour les cartes portefeuille et commissions
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-primary rounded-lg px-6 py-5">
        <p className="text-primary-foreground/70 text-xs uppercase tracking-widest mb-1">Bienvenue</p>
        <h1 className="text-primary-foreground text-xl font-semibold">{message}</h1>
      </div>

      <CommissionChart commissionsParFormule={commissionsParFormule} isAdmin={false} commissionsAdmin={commissionRules}/>

      {/*  Couleurs moins agressives : slate au lieu de black/dark */}
      <div className="grid gap-4 grid-cols-2">
        <div className="bg-slate-700 rounded-xl px-4 py-5 flex items-center justify-between shadow border border-slate-600/40">
          <div>
            <p className="text-slate-300 text-[10px] uppercase tracking-wider mb-1">Portefeuille</p>
            <p className="text-white text-xl font-bold">{fmt(wallet)} <span className="text-[10px] font-normal opacity-70">F</span></p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"><rect x="2" y="7" width="20" height="15" rx="2"/><circle cx="12" cy="14" r="2"/></svg>
        </div>
        <div className="bg-slate-500 rounded-xl px-4 py-5 flex items-center justify-between shadow border border-slate-400/40">
          <div>
            <p className="text-slate-200 text-[10px] uppercase tracking-wider mb-1">Commissions</p>
            <p className="text-white text-xl font-bold">{fmt(commissionBalance)} <span className="text-[10px] font-normal opacity-70">F</span></p>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
        </div>
      </div>

      {/*  "Nos services" plus visible */}
      <div className="flex items-center gap-3 my-1">
        <div className="h-px flex-1 bg-border"/>
        <p className="text-sm font-bold text-foreground tracking-wide uppercase">Nos Services</p>
        <div className="h-px flex-1 bg-border"/>
      </div>

      {/*  Images non étirées : object-contain dans un conteneur fixe */}
      <div className="grid grid-cols-2 gap-3">
        {services.map(({id,label,image,route})=>(
          <button key={id}
                  onClick={()=>{ if(id==="technicien"){setShowTech(true);return;} route&&navigate(route); }}
                  className="flex flex-col rounded-xl overflow-hidden border border-border bg-card active:scale-95 hover:-translate-y-1 transition-transform duration-150 shadow-sm">
            <div className="bg-white h-28 w-full flex items-center justify-center p-3">
              {/*  object-contain pour que les images ne soient pas étirées */}
              <img src={image} alt={label} className="h-full w-full object-contain"/>
            </div>
            <div className="bg-slate-800 text-white text-[11px] uppercase tracking-tight font-bold py-3 text-center w-full">{label}</div>
          </button>
        ))}
      </div>

      <a href={`https://wa.me/${adminWhatsapp||"237695225823"}`} target="_blank" rel="noreferrer"
         className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-lg transition-all shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a2.79 2.79 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.845L.057 23.428a.5.5 0 0 0 .515.572l5.76-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.385l-.362-.214-3.755.984.999-3.648-.235-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Assistance WhatsApp
      </a>

      {showTech && <ModalTechnicien onClose={()=>setShowTech(false)}/>}
    </div>
  );
};

//  PAGE TRANSACTIONS 
const PageTransactions = ({ transactions = [] }) => {
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType] = useState("tous");
  const [expanded, setExpanded]   = useState(null);
  const [invoiceView, setInvoiceView] = useState(null);

  const filtered = useMemo(()=>transactions.filter(t=>{
    const q  = search.toLowerCase();
    const ms = !q || String(t.numero_abonne||"").toLowerCase().includes(q) || String(t.formule||"").toLowerCase().includes(q);
    const mt = filterType==="tous" || (t.type_operation||"reabonnement")===filterType;
    return ms && mt;
  }),[transactions,search,filterType]);

  const { paginated, PaginationBar } = usePagination(filtered, 10);
  const totalMontant = useMemo(()=>filtered.reduce((s,t)=>s+Number(t.montant||0),0),[filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-primary rounded-lg px-6 py-5">
        <p className="text-primary-foreground/70 text-xs uppercase tracking-widest mb-1">Historique</p>
        <h1 className="text-primary-foreground text-xl font-semibold">Transactions</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{label:"Total",value:transactions.length},{label:"Filtrés",value:filtered.length},{label:"Montant",value:`${fmt(totalMontant)} F`}].map(({label,value})=>(
          <div key={label} className="bg-card rounded-lg px-3 py-3 shadow-sm border border-border text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold mt-0.5 text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
               className="flex-1 border border-input rounded-lg px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"/>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
                className="border border-input rounded-lg px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="tous">Tous</option>
          <option value="reabonnement">Réabonnement</option>
          <option value="upgrade">Upgrade</option>
        </select>
      </div>
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {paginated.length===0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground text-center">Aucune transaction trouvée</div>
        ) : paginated.map((t,i)=>{
          const isOpen = expanded===i;
          return (
            <div key={t.id??i} className={i!==0?"border-t border-border":""}>
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30" onClick={()=>setExpanded(isOpen?null:i)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.type_operation==="upgrade"?"Upgrade":"Réabonnement"}  {t.formule||""}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.numero_abonne} · {fmtDate(t.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600 block">+{fmt(t.montant)} FCFA</span>
                    {t.commission>0 && <span className="text-xs text-amber-600">Comm. : {fmt(t.commission)} FCFA</span>}
                  </div>
                  <IconChevron open={isOpen}/>
                </div>
              </div>
              {isOpen && (
                <div className="px-5 pb-4 flex items-center gap-3 bg-muted/30 border-t border-border flex-wrap">
                  {t.facture_url ? (
                    <>
                      <button type="button" onClick={() => setInvoiceView({ url: t.facture_url, print: false })}
                         className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/20">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Voir facture
                      </button>
                      <button onClick={() => setInvoiceView({ url: t.facture_url, print: true })}
                              className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted/30">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Imprimer
                      </button>
                    </>
                  ) : <span className="text-xs text-muted-foreground italic">Facture non disponible</span>}
                </div>
              )}
            </div>
          );
        })}
        <PaginationBar/>
      </div>
      {invoiceView && (
        <InvoiceViewer
          invoiceUrl={invoiceView.url}
          autoPrint={invoiceView.print}
          onClose={() => setInvoiceView(null)}
        />
      )}
    </div>
  );
};

//  PAGE STATISTIQUES 
const PageStatistiques = ({ stats, commissionsParFormule }) => (
  <div className="flex flex-col gap-5">
    <div className="bg-primary rounded-lg px-6 py-5">
      <p className="text-primary-foreground/70 text-xs uppercase tracking-widest mb-1">Vue d'ensemble</p>
      <h1 className="text-primary-foreground text-xl font-semibold">Statistiques</h1>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[{label:"Clients",value:stats.clients},{label:"Réabonnements",value:stats.reabonnements},{label:"Revenus",value:`${fmt(stats.revenus)} FCFA`}].map(({label,value})=>(
        <div key={label} className="bg-card rounded-lg px-4 py-4 shadow-sm border border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold mt-1 text-foreground">{value}</p>
        </div>
      ))}
    </div>
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Statistiques</p>
        <h2 className="text-base font-semibold text-foreground mt-0.5">Commissions par formule</h2>
      </div>
      {commissionsParFormule.length===0
        ? <div className="px-5 pb-8 pt-4 text-sm text-muted-foreground text-center">Aucune donnée</div>
        : <div className="px-4 pb-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={commissionsParFormule} margin={{top:10,right:16,left:0,bottom:30}} barSize={36}>
                <XAxis dataKey="formule" tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} angle={-20} textAnchor="end" interval={0} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip cursor={{fill:"hsl(var(--muted)/0.5)"}}/>
                <Bar dataKey="commissions" fill="#16a34a" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
      }
    </div>
  </div>
);


const offerCards = [
  { name: "Tout Canal+", price: 28000, headline: "L'offre complète Canal+", channels: "Plus de 350 chaînes TV et radio", image: "/toutcanal+.png", featured: true },
  { name: "Access+", price: 15000, headline: "Le meilleur d'Access+", channels: "Plus de 280 chaînes TV et radio", image: "/access+.png" },
  { name: "Évasion", price: 10500, headline: "Le meilleur d'Évasion", channels: "Plus de 300 chaînes TV et radio", image: "/evasion.png" },
  { name: "Access", price: 5000, headline: "Le meilleur d'Access", channels: "Plus de 260 chaînes TV et radio", image: "/access.png" },
];

const PageOffres = () => (
  <div className="flex flex-col gap-5">
    <div className="rounded-lg bg-[#050505] text-white border border-black px-6 py-5 shadow-sm">
      <p className="text-white/55 text-xs uppercase tracking-widest mb-1">Canal+ Cameroun</p>
      <h1 className="text-2xl font-black italic tracking-wide">Catalogue des offres</h1>
      <p className="text-sm text-white/70 mt-2 max-w-2xl">Les visuels des formules sont intégrés pour présenter clairement les chaînes et avantages à vos clients.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {offerCards.map((offer) => (
        <article key={offer.name} className={`rounded-lg overflow-hidden bg-[#111] text-white border shadow-sm ${offer.featured ? "border-red-500/70" : "border-white/10"}`}>
          <div className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-white/10">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/55">{offer.headline}</p>
              <h2 className="mt-1 text-3xl font-black italic tracking-wide">{offer.name.toUpperCase()}</h2>
              <p className="mt-2 text-sm font-semibold text-white/82">{offer.channels}</p>
            </div>
            <div className="sm:text-right flex-shrink-0">
              <p className="text-4xl font-black tracking-wide">{offer.price.toLocaleString("fr-FR")}</p>
              <p className="text-xs font-bold text-white/70 uppercase">FCFA / mois</p>
            </div>
          </div>
          <div className="w-full">
            <img
              src={offer.image}
              alt={`Formule ${offer.name}`}
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        </article>
      ))}
    </div>
  </div>
);

const PagePortefeuille = ({ wallet, setWallet, commissionBalance, setCommissionBalance, totalRecharges, totalCommissionsGagnees, operationsWallet, boutonBalanceActif, refreshWalletData }) => {
  const [showRecharger, setShowRecharger]         = useState(false);
  const [showConfirmBalance, setShowConfirmBalance] = useState(false);
  const [isBalancing, setIsBalancing]             = useState(false);
  const [balanceMessage, setBalanceMessage]       = useState("");
  const [balanceSuccess, setBalanceSuccess]       = useState(false);

  const handleClickBalance = () => {
    if (!boutonBalanceActif) { setBalanceMessage("Le paiement de vos commissions n'est pas encore activé par l'admin."); setBalanceSuccess(false); return; }
    if (commissionBalance <= 0) { setBalanceMessage("Vous n'avez aucune commission à retirer."); setBalanceSuccess(false); return; }
    setShowConfirmBalance(true);
  };

  const handleConfirmBalance = async () => {
    setIsBalancing(true); setBalanceMessage("");
    try {
      const res  = await fetch(`${API}/partner/transfer-commission`,{method:"POST",headers:{Authorization:`Bearer ${getToken()}`}});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||data.message||"Erreur");
      setWallet(data.wallet_balance ?? wallet);
      setCommissionBalance(data.commission_balance ?? 0);
      setBalanceMessage(data.message||`${fmt(commissionBalance)} FCFA transférés dans votre portefeuille !`);
      setBalanceSuccess(true);
      await refreshWalletData?.();
    } catch(err){setBalanceMessage(err.message||"Impossible de transférer.");setBalanceSuccess(false);}
    finally{setIsBalancing(false);setShowConfirmBalance(false);}
  };

  const { paginated:opsPage, PaginationBar } = usePagination(operationsWallet, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-primary rounded-lg px-6 py-5">
        <p className="text-primary-foreground/70 text-xs uppercase tracking-widest mb-1">Mon compte</p>
        <h1 className="text-primary-foreground text-xl font-semibold">Portefeuille</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 text-white shadow-sm p-5">
          <p className="text-xs font-bold text-white/65 uppercase tracking-widest mb-2">Total recharges reçues</p>
          <p className="text-3xl font-bold">{fmt(totalRecharges)} <span className="text-sm font-normal text-white/65">FCFA</span></p>
          <p className="text-xs text-white/65 mt-1">Recharges validées + créditations admin</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 text-white shadow-sm p-5">
          <p className="text-xs font-bold text-white/65 uppercase tracking-widest mb-2">Commissions gagnées au total</p>
          <p className="text-3xl font-bold">{fmt(totalCommissionsGagnees)} <span className="text-sm font-normal text-white/65">FCFA</span></p>
          <p className="text-xs text-white/65 mt-1">Historique complet des gains</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Solde disponible dans mon portefeuille</p>
          <p className="text-4xl font-bold text-foreground">{fmt(wallet)} <span className="text-base font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Commissions cumulées</p>
          <p className="text-4xl font-bold text-foreground">{fmt(commissionBalance)} <span className="text-base font-normal text-muted-foreground">FCFA</span></p>
        </div>
      </div>
      {/*  3. Deux boutons sur la même ligne */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bouton gauche : Recharger portefeuille */}
        <button onClick={()=>setShowRecharger(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-4 px-3 text-sm font-semibold transition-all active:scale-95 flex flex-col items-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          <span className="text-[11px] text-center leading-tight">Recharger portefeuille</span>
        </button>
        {/* Bouton droit : Balance commissions */}
        <button onClick={handleClickBalance} disabled={isBalancing}
                className={`rounded-xl py-4 px-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 flex flex-col items-center gap-1.5 ${
                  boutonBalanceActif ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
          <span className="text-[11px] text-center leading-tight">{isBalancing ? "Transfert..." : boutonBalanceActif ? "Virer commissions" : "Non disponible"}</span>
        </button>
      </div>

      {balanceMessage && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium border ${balanceSuccess?"bg-green-50 border-green-200 text-green-700":"bg-destructive/10 border-destructive/20 text-destructive"}`}>
          {balanceMessage}
        </div>
      )}

      {/* Historique recharges */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Dernières opérations</p>
        </div>
        {opsPage.length===0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground text-center">Aucune opération</div>
        ) : opsPage.map((op,i)=>(
          <div key={op.id??i} className={`flex items-center justify-between px-5 py-4 ${i!==0?"border-t border-border":""}`}>
            <div>
              <p className="text-sm font-medium text-foreground">
                {op.type === "admin_credit"
                  ? "Crédit admin"
                  : op.type === "commission_transfer"
                    ? "Transfert commissions"
                    : `Recharge${op.moyen_paiement ? ` · ${op.moyen_paiement}` : ""}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(op.date_operation||op.created_at)}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-green-600 block">+{fmt(op.montant)} FCFA</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${op.statut==="validee"||op.statut==="approved"?"bg-green-100 text-green-700":op.statut==="en_attente"||op.statut==="pending"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-600"}`}>
                {op.statut==="validee"||op.statut==="approved"?"Validée":op.statut==="en_attente"||op.statut==="pending"?"En attente":"Rejetée"}
              </span>
            </div>
          </div>
        ))}
        <PaginationBar/>
      </div>

      {showRecharger && <ModalRecharger onClose={()=>setShowRecharger(false)} onSuccess={refreshWalletData}/>}
      {showConfirmBalance && <ModalConfirmBalance commissionBalance={commissionBalance} onClose={()=>setShowConfirmBalance(false)} onConfirm={handleConfirmBalance} loading={isBalancing}/>}
    </div>
  );
};

//  PAGE D0CODEURS 
const PageDecodeurs = ({ decodeurs, loadingDecoders }) => {
  const { paginated:paginatedDecodeurs, PaginationBar } = usePagination(decodeurs, 10);

  return (
  <div className="flex flex-col gap-5">
    <div className="bg-primary rounded-lg px-6 py-5">
      <p className="text-primary-foreground/70 text-xs uppercase tracking-widest mb-1">Mes équipements</p>
      <h1 className="text-primary-foreground text-xl font-semibold">Décodeurs</h1>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-slate-700 text-white rounded-lg p-5"><p className="text-xs font-semibold uppercase tracking-widest opacity-70">Total</p><p className="text-2xl font-bold mt-1">{decodeurs.length}</p></div>
      <div className="bg-green-600 text-white rounded-lg p-5"><p className="text-xs font-semibold uppercase tracking-widest opacity-70">Disponibles</p><p className="text-2xl font-bold mt-1">{decodeurs.filter(d=>d.status==="free").length}</p></div>
    </div>
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-border"><h2 className="text-sm font-bold text-foreground">Décodeurs attribués</h2></div>
      <table className="w-full text-sm">
        <thead><tr className="bg-muted/30 border-b border-border">{["Numéro","Statut"].map(h=><th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
        <tbody>
          {loadingDecoders ? <tr><td colSpan={2} className="text-center py-10 text-muted-foreground">Chargement...</td></tr>
           : decodeurs.length===0 ? <tr><td colSpan={2} className="text-center py-10 text-muted-foreground">Aucun décodeur attribué</td></tr>
           : paginatedDecodeurs.map(d=>(
            <tr key={d.id} className="border-t border-border hover:bg-muted/30">
              <td className="px-5 py-3 font-semibold text-foreground font-mono">{d.numero}</td>
              <td className="px-5 py-3"><span className={`px-2 py-1 text-xs rounded font-semibold ${d.status==="free"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{d.status==="free"?"Disponible":"Utilisé"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationBar/>
    </div>
  </div>
  );
};

//  PAGE PARAMTRES 
//  Photo de profil ajoutée
const PageParametres = ({ onLogout, userData, onSaveProfile, onChangePassword, onAvatarUpload }) => {
  const [activeSection, setActiveSection] = useState(null);
  const [profile, setProfile]   = useState({ name:userData?.name||"", prenom:userData?.prenom||"", email:userData?.email||"", telephone:userData?.telephone||"" });
  const [passwords, setPasswords] = useState({ current:"", nouveau:"", confirm:"" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd]         = useState(false);
  const [msgProfile, setMsgProfile]       = useState("");
  const [msgPwd, setMsgPwd]               = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);

  const saveProfile = async () => {
    setSavingProfile(true); setMsgProfile("");
    try { await onSaveProfile(profile); setMsgProfile("Profil mis à jour avec succès"); }
    catch(e){ setMsgProfile("Erreur : "+e.message); }
    finally{ setSavingProfile(false); }
  };

  const savePwd = async () => {
    if(passwords.nouveau!==passwords.confirm){setMsgPwd("Les mots de passe ne correspondent pas.");return;}
    if(passwords.nouveau.length<6){setMsgPwd("Mot de passe trop court (min 6 caractères).");return;}
    setSavingPwd(true); setMsgPwd("");
    try{ await onChangePassword(passwords.current,passwords.nouveau); setMsgPwd("Mot de passe changé"); setPasswords({current:"",nouveau:"",confirm:""}); }
    catch(e){ setMsgPwd("Erreur : "+e.message); }
    finally{ setSavingPwd(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData(); fd.append("avatar", file);
      const res = await fetch(`${API}/partner/upload-avatar`,{method:"POST",headers:{Authorization:`Bearer ${getToken()}`},body:fd});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Erreur upload");
      onAvatarUpload(data.photo_url);
    } catch(err){ Swal.fire({ title: "Erreur", text: "Erreur upload : "+err.message, icon: "error", confirmButtonColor: "#e53935" }); }
    finally{ setUploadingAvatar(false); }
  };

  const menuItems = [
    { id:"profil",   label:"Mon profil" },
    { id:"password", label:"Changer mot de passe" },
    { id:"sociaux",  label:"Liens sociaux" },
    { id:"notifs",   label:"Notifications" },
    { id:"langue",   label:"Langue" },
    { id:"cgu",      label:"Conditions d'utilisation" },
    { id:"logout",   label:"Se déconnecter", danger:true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-primary rounded-lg px-6 py-5">
        <p className="text-primary-foreground/70 text-xs uppercase tracking-widest mb-1">Compte</p>
        <h1 className="text-primary-foreground text-xl font-semibold">Paramètres</h1>
      </div>

      {/*  Photo de profil */}
      <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
        <div className="relative">
          <Avatar photoUrl={userData?.photo_url} name={userData?.name} size={64}/>
          <button onClick={()=>fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90">
            {uploadingAvatar ? <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> : <IconCamera/>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden"/>
        </div>
        <div>
          <p className="font-semibold text-foreground">{userData?.prenom} {userData?.name}</p>
          <p className="text-xs text-muted-foreground">{userData?.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{userData?.telephone}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {menuItems.map((item,i)=>(
          <div key={item.id}>
            {i!==0 && <div className="border-t border-border"/>}
            <button
              onClick={item.id==="logout"?onLogout:()=>setActiveSection(activeSection===item.id?null:item.id)}
              className={`w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium ${item.danger?"text-destructive":"text-foreground"} hover:bg-muted/30 transition-colors`}>
              <span>{item.label}</span>
              {!item.danger && <IconChevronR/>}
            </button>
            {activeSection===item.id && (
              <div className="px-5 pb-5 bg-muted/30 border-t border-border">
                {item.id==="profil" && (
                  <div className="flex flex-col gap-3 pt-4">
                    <Field label="Nom"><input type="text" value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} className={inputCls()}/></Field>
                    <Field label="Prénom"><input type="text" value={profile.prenom} onChange={e=>setProfile(p=>({...p,prenom:e.target.value}))} className={inputCls()}/></Field>
                    <Field label="Email"><input type="email" value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))} className={inputCls()}/></Field>
                    <Field label="Téléphone"><input type="tel" value={profile.telephone} onChange={e=>setProfile(p=>({...p,telephone:e.target.value}))} className={inputCls()}/></Field>
                    {msgProfile && <p className={`text-xs ${msgProfile.includes("succ?s")?"text-green-600":"text-destructive"}`}>{msgProfile}</p>}
                    <button onClick={saveProfile} disabled={savingProfile} className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                      {savingProfile ? <Spinner /> : null}{savingProfile ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                  </div>
                )}
                {item.id==="password" && (
                  <div className="flex flex-col gap-3 pt-4">
                    <Field label="Mot de passe actuel"><input type="password" value={passwords.current} onChange={e=>setPasswords(p=>({...p,current:e.target.value}))} className={inputCls()}/></Field>
                    <Field label="Nouveau mot de passe"><input type="password" value={passwords.nouveau} onChange={e=>setPasswords(p=>({...p,nouveau:e.target.value}))} className={inputCls()}/></Field>
                    <Field label="Confirmer le nouveau mot de passe"><input type="password" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} className={inputCls()}/></Field>
                    {msgPwd && <p className={`text-xs ${msgPwd.includes("chang?")?"text-green-600":"text-destructive"}`}>{msgPwd}</p>}
                    <button onClick={savePwd} disabled={savingPwd} className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                      {savingPwd ? <Spinner /> : null}{savingPwd ? "Changement..." : "Changer le mot de passe"}
                    </button>
                  </div>
                )}
                {item.id==="sociaux" && (
                  <div className="flex flex-col gap-3 pt-4">
                    <a href="https://wa.me/237695225823" target="_blank" rel="noreferrer" className="w-full px-4 py-3 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2">WhatsApp</a>
                    <a href="https://facebook.com/visioncanalplus" target="_blank" rel="noreferrer" className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">Facebook</a>
                    <a href="https://instagram.com/visioncanalplus" target="_blank" rel="noreferrer" className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2">Instagram</a>
                  </div>
                )}
                {item.id==="notifs" && <p className="pt-4 text-sm text-muted-foreground">Les notifications sont gérées en temps réel via l'icône cloche en haut de l'écran.</p>}
                {item.id==="langue" && <p className="pt-4 text-sm text-muted-foreground">Langue actuelle : <strong>Français</strong>. D'autres langues seront disponibles prochainement.</p>}
                {item.id==="cgu" && <p className="pt-4 text-sm text-muted-foreground leading-relaxed"><strong>Vision Canal+</strong>  En utilisant cette application, vous acceptez nos conditions générales. Contact : +237 656 253 864.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// MAIN COMPONENT
// """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
export default function PartnerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeNav, setActiveNav]               = useState(searchParams.get("page") || "accueil");
  const [showExtraNav, setShowExtraNav]         = useState(false);
  //  Sidebar mobile : cachée par défaut, apparaît seulement sur clic bouton menu
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [message, setMessage]                   = useState("Tableau de bord partenaire");
  const [wallet, setWallet]                     = useState(0);
  const [commissionBalance, setCommissionBalance] = useState(0);
  const [totalRecharges, setTotalRecharges]     = useState(0);
  const [totalCommissionsGagnees, setTotalCommissionsGagnees] = useState(0);
  const [commissionsParFormule, setCommissions] = useState([]);
  const [commissionRules, setCommissionRules]   = useState([]);
  const [operationsWallet, setOperationsWallet] = useState([]);
  const [boutonBalanceActif, setBoutonBalanceActif] = useState(false);
  const [stats, setStats]                       = useState({ clients:0, reabonnements:0, revenus:0 });
  const [transactions, setTransactions]         = useState([]);
  const [adminWhatsapp, setAdminWhatsapp]       = useState("237695225823");
  const [decodeurs, setDecodeurs]               = useState([]);
  const [loadingDecoders, setLoadingDecoders]   = useState(false);
  const [notifications, setNotifications]       = useState([]);
  const [showNotifPopup, setShowNotifPopup]     = useState(false);
  const [userData, setUserData]                 = useState(null);

  const navigate = useNavigate();
  const goNav = useCallback((page) => {
    setActiveNav(page);
    setSearchParams(page === "accueil" ? {} : { page });
  }, [setSearchParams]);

  useEffect(() => {
    const page = searchParams.get("page") || "accueil";
    if (page !== activeNav) setActiveNav(page);
  }, [searchParams]);

  const handleLogout = useCallback(async () => {
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
  }, [navigate]);

  const redirectIfExpired = useCallback(() => {
    if(!tokenValid()){clearSession();navigate("/LoginForm");return true;}
    return false;
  }, [navigate]);

  const fetchDashboard = useCallback(async () => {
    if(redirectIfExpired()) return;
    try {
      const [rulesRes, dashRes] = await Promise.all([
        fetch(`${API}/partner/commission-rules`,{headers:{Authorization:`Bearer ${getToken()}`}}),
        fetch(`${API}/partner/dashboard`,       {headers:{Authorization:`Bearer ${getToken()}`}}),
      ]);
      if(rulesRes.ok) setCommissionRules(activeFormules(await rulesRes.json()));
      if(!dashRes.ok){ if(dashRes.status===401){clearSession();navigate("/LoginForm");} return; }
      const data = await dashRes.json();
      setMessage(data.message||"Tableau de bord partenaire");
      setWallet(data.wallet_balance||0);
      setCommissionBalance(data.commission_balance||0);
      setTotalRecharges(data.total_recharges||0);
      setTotalCommissionsGagnees(data.total_commissions_gagnees||data.commission_total||0);
      setBoutonBalanceActif(data.bouton_balance_actif||false);
      setStats(data.stats||{clients:0,reabonnements:0,revenus:0});
      setCommissions(activeFormules(data.commissions_par_formule || []));
      setTransactions(data.transactions||[]);
      if(data.admin_whatsapp) setAdminWhatsapp(data.admin_whatsapp);
      if(data.user) setUserData(data.user);
    } catch(e){ console.error(e); }
  }, [navigate, redirectIfExpired]);

  const fetchOperationsWallet = useCallback(async () => {
  try {
    const res = await fetch(`${API}/partner/mes-recharges`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const recharges = res.ok ? await res.json() : [];
    setOperationsWallet(
      recharges
        .map(r => ({ ...r, _type: "recharge" }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    );
  } catch (e) { console.error(e); }
}, []);

  const refreshWalletData = useCallback(async () => {
    await Promise.all([fetchDashboard(), fetchOperationsWallet()]);
  }, [fetchDashboard, fetchOperationsWallet]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/partner/notifications`,{headers:{Authorization:`Bearer ${getToken()}`}});
      if(res.ok) setNotifications(await res.json());
    } catch(e){ console.error(e); }
  }, []);

  const markNotifsRead = async () => {
    try {
      await fetch(`${API}/partner/notifications/read`,{method:"PUT",headers:{Authorization:`Bearer ${getToken()}`}});
      setNotifications(prev=>prev.map(n=>({...n,is_read:1})));
    } catch(e){ console.error(e); }
  };
  const clearNotifications = async () => {
  try {
    await fetch(`${API}/partner/notifications/clear`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    setNotifications([]);
  } catch (e) { console.error(e); }
};

  const fetchDecodeurs = useCallback(async () => {
    setLoadingDecoders(true);
    try {
      const res = await fetch(`${API}/partner/decodeurs`,{headers:{Authorization:`Bearer ${getToken()}`}});
      if(res.ok) setDecodeurs(await res.json());
    } catch(e){ console.error(e); }
    finally{ setLoadingDecoders(false); }
  }, []);

  // Socket.IO
  useEffect(() => {
    const socket = createAppSocket();
    socket.on("balance_toggle_update", fetchDashboard);
    const uid = getUserId();
    if(uid){
      socket.on(`partner_balance_update_${uid}`, fetchDashboard);
      socket.on(`partner_notification_${uid}`,   (data)=>{
        fetchNotifications();
        notifyUser({ title: "Vision Canal+", body: data?.message || "Nouvelle notification partenaire" });
      });
      socket.on(`partner_dashboard_update_${uid}`, (data)=>{
        refreshWalletData();
        if(data?.type==="nouveau_decodeur" || data?.type==="decodeur_update") fetchDecodeurs();
      });
    }
    socket.on("partner_dashboard_update", (data)=>{
      refreshWalletData();
      if(data?.type==="nouveau_decodeur" || data?.type==="decodeur_update") fetchDecodeurs();
    });
    socket.on("commission_rules_update",  ()=>{
      fetch(`${API}/partner/commission-rules`,{headers:{Authorization:`Bearer ${getToken()}`}})
        .then(r=>r.ok?r.json():[]).then(rules=>setCommissionRules(activeFormules(rules))).catch(()=>{});
    });
    return ()=>socket.disconnect();
  }, [fetchDashboard, fetchNotifications, fetchDecodeurs, refreshWalletData]);

  useEffect(() => {
    const cleanupActivity = installActivityTracker(()=>{clearSession();navigate("/LoginForm");},"partner");
    fetchDashboard(); fetchOperationsWallet(); fetchDecodeurs(); fetchNotifications();
    const interval = setInterval(fetchDashboard, 30000);
    return ()=>{ clearInterval(interval); cleanupActivity(); };
  }, [fetchDashboard, fetchOperationsWallet, fetchDecodeurs, navigate]);

  const handleSaveProfile = async (profile) => {
    const res = await fetch(`${API}/partner/profile`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify(profile)});
    if(!res.ok) throw new Error("Erreur lors de la sauvegarde");
    fetchDashboard();
  };

  const handleChangePassword = async (current, nouveau) => {
    const res = await fetch(`${API}/partner/change-password`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify({ancien:current,nouveau})});
    if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Erreur");}
  };

  const handleAvatarUpload = (photoUrl) => {
    setUserData(prev => prev ? {...prev, photo_url: photoUrl} : prev);
  };

  const renderPage = () => {
    switch(activeNav){
      case "transactions":  return <PageTransactions transactions={transactions}/>;
      case "statistiques":  return <PageStatistiques stats={stats} commissionsParFormule={commissionsParFormule}/>;
      case "portefeuille":  return <PagePortefeuille wallet={wallet} setWallet={setWallet} commissionBalance={commissionBalance} setCommissionBalance={setCommissionBalance} totalRecharges={totalRecharges} totalCommissionsGagnees={totalCommissionsGagnees} operationsWallet={operationsWallet} boutonBalanceActif={boutonBalanceActif} refreshWalletData={refreshWalletData}/>;
      case "offres":        return <PageOffres/>;
      case "parametres":    return <PageParametres onLogout={handleLogout} userData={userData} onSaveProfile={handleSaveProfile} onChangePassword={handleChangePassword} onAvatarUpload={handleAvatarUpload}/>;
      case "decodeurs":     return <PageDecodeurs decodeurs={decodeurs} loadingDecoders={loadingDecoders}/>;
      default:              return <PageAccueil message={message} wallet={wallet} commissionBalance={commissionBalance} commissionsParFormule={commissionsParFormule} commissionRules={commissionRules} navigate={navigate} adminWhatsapp={adminWhatsapp} userData={userData}/>;
    }
  };

  const unreadCount = useMemo(()=>notifications.filter(n=>!n.is_read).length,[notifications]);

  //  Sidebar contenu réutilisé desktop + mobile
  const SidebarContent = () => (
    <>
      {/*  Logo de l'application dans la sidebar (pas VC) */}
      <div className="flex flex-col items-center py-8 px-4 border-b border-border">
        <button onClick={()=>{goNav("accueil");setMobileSidebarOpen(false);}} className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="Vision Canal+" className="h-16 w-auto rounded-xl object-contain"/>
        </button>
        <p className="mt-3 font-semibold text-foreground text-sm">Partenaire</p>


      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {navItems.map(({id,label,Icon})=>{
          const isActive = activeNav===id;
          return (
            <button key={id} onClick={()=>{goNav(id);setMobileSidebarOpen(false);}}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive?"bg-primary/10 text-primary":"text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}>
              {Icon({ active: isActive })}{label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border flex-shrink-0 bg-card">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Se déconnecter
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background" style={{fontFamily:"'Poppins', sans-serif"}}>

      {/* "" HEADER "" */}
      <header className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            {/*  Bouton hamburger visible seulement en mobile */}
            <button className="lg:hidden w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={()=>setMobileSidebarOpen(o=>!o)}>
              <IconMenu/>
            </button>
            <button onClick={()=>goNav("accueil")} className="hover:opacity-80 transition-opacity flex items-center gap-3">
              {userData && <Avatar photoUrl={userData.photo_url} name={userData.name} size={42}/>}
              <div className="lg:hidden leading-tight text-left">
                <p className="text-[15px] font-extrabold tracking-tight text-foreground">Vision Canal<span className="text-primary">+</span></p>
                {userData && <p className="text-[11px] text-muted-foreground font-medium truncate max-w-[150px]">{userData.prenom} {userData.name}</p>}
              </div>
              <div className="hidden lg:block w-auto rounded-xl object-contain">
                {userData && <p className="text-xs text-muted-foreground font-medium">{userData.name}{userData.prenom}</p>}
              </div>
            </button>
          </div>
          {/* Notifications */}
          <div className="relative">
            <button onClick={()=>{requestNotificationPermission();setShowNotifPopup(!showNotifPopup);if(!showNotifPopup&&unreadCount>0)markNotifsRead();}}
                    className="relative w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-muted/50 rounded-full transition-colors">
              <IconBell/>
              {unreadCount>0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-destructive text-[10px] text-white font-bold flex items-center justify-center rounded-full border-2 border-card">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifPopup && (
              <>
                <div className="fixed inset-0 z-30" onClick={()=>setShowNotifPopup(false)}/>
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-40 overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider">Alertes</h3>
                    <span className="text-[10px] text-muted-foreground">{notifications.length} reçues</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length===0
                      ? <div className="px-4 py-10 text-center text-xs text-muted-foreground italic">Aucune alerte</div>
                      : notifications.map(n=>(
                          <div key={n.id} className={`px-4 py-3 border-b border-border/50 hover:bg-muted/30 ${!n.is_read?"bg-primary/5":""}`}>
                            <div className="flex gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read?"bg-primary animate-pulse":"bg-transparent"}`}/>
                              <div className="flex-1">
                                <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">{fmtDate(n.created_at)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                <div className="px-4 py-2 bg-muted/20 border-t border-border flex items-center justify-between">
  <button
    onClick={()=>{ clearNotifications(); setShowNotifPopup(false); }}
    className="text-[10px] font-bold text-red-500 hover:underline">
    Tout effacer
  </button>
  <button
    onClick={()=>{ goNav("accueil"); setShowNotifPopup(false); }}
    className="text-[10px] font-bold text-primary hover:underline">
    Fermer
  </button>
</div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/*  SIDEBAR DESKTOP  toujours visible sur grand écran */}
        <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border shadow-sm"
               style={{height:"calc(100vh - 57px)",position:"sticky",top:"57px"}}>
          <SidebarContent/>
        </aside>

        {/*  SIDEBAR MOBILE  overlay, visible seulement sur clic hamburger */}
        {mobileSidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={()=>setMobileSidebarOpen(false)}/>
            <aside className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-card border-r border-border shadow-2xl flex flex-col"
                   style={{animation:"slideIn .25s ease"}}>
              <style>{`@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">Menu</p>
                <button onClick={()=>setMobileSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground">
                  <IconClose/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col">
                <SidebarContent/>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8 pb-24 lg:pb-8 min-w-0">
          <div className="max-w-2xl mx-auto lg:max-w-4xl">{renderPage()}</div>
        </main>
      </div>

      {/*  NAV MOBILE BAS  toujours visible en mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-[0_-8px_24px_rgba(15,23,42,0.08)]" style={{paddingBottom:"env(safe-area-inset-bottom, 8px)"}}>
        <div className="flex items-center justify-around pt-2 pb-1">
          {navMobileFixed.map(id=>{
            const item = navItems.find(n=>n.id===id); if(!item) return null;
            const {Icon,label} = item; const isActive = activeNav===id;
            return (
              <button key={id} onClick={()=>{goNav(id);setShowExtraNav(false);}} className="flex flex-col items-center gap-0.5 flex-1 py-1">
                <Icon active={isActive}/>
                <span className={`text-[10px] font-medium ${isActive?"text-primary":"text-muted-foreground"}`}>{label}</span>
                {isActive && <span className="block w-4 h-0.5 bg-primary rounded-full"/>}
              </button>
            );
          })}
          {/* Bouton "..." pour les extras */}
          <div className="relative flex-1 flex flex-col items-center py-1">
            <button onClick={()=>setShowExtraNav(o=>!o)} className="flex flex-col items-center gap-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={showExtraNav||navMobileExtra.includes(activeNav)?"#e53935":"#9ca3af"} strokeWidth="2"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
              <span className={`text-[10px] font-medium ${showExtraNav||navMobileExtra.includes(activeNav)?"text-primary":"text-muted-foreground"}`}>Plus</span>
            </button>
            {showExtraNav && (
              <div className="absolute bottom-12 right-0 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-40 z-30">
                {navMobileExtra.map(id=>{
                  const item = navItems.find(n=>n.id===id); if(!item) return null;
                  const {Icon,label} = item; const isActive = activeNav===id;
                  return (
                    <button key={id} onClick={()=>{goNav(id);setShowExtraNav(false);}}
                            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${isActive?"text-primary bg-primary/10":"text-foreground hover:bg-muted/30"}`}>
                      {Icon({ active: isActive })}{label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>

      <AiAssistant />
    </div>
  );
}
import React, { useEffect, useState, useCallback } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import cfgImg from "../assets/cfg.jpg";
import abonnementsImg from "../assets/abonnements.png";
import accessoiresImg from "../assets/Dcodeur.png";
import technicienImg from "../assets/inst.jpg";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { generateInvoicePDF, printInvoicePDF, findLocalInvoice, buildInvoiceFromApiTransaction } from "./invoiceUtils";



// ── ICONS ─────────────────────────────────────────────────────────────────────

const IconBell = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconHome         = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={active?"#e53935":"none"} stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/></svg>;
const IconTransactions = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16l-4-4 4-4M17 8l4 4-4 4M13 4l-2 16"/></svg>;
const IconStats        = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const IconWallet       = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><circle cx="12" cy="14" r="2"/></svg>;
const IconSettings     = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active?"#e53935":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

const IconRenew     = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="10" width="32" height="22" rx="3" stroke="#888" strokeWidth="2.5"/><path d="M16 32v4M32 32v4M12 36h24" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 21l4 4 8-8" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconSubscribe = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="10" width="32" height="22" rx="3" stroke="#888" strokeWidth="2.5"/><path d="M16 32v4M32 32v4M12 36h24" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="21" r="5" stroke="#888" strokeWidth="2.5"/><path d="M24 16v-3M24 26v3M19 21h-3M29 21h3" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>;
const IconAccessory = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="10" y="18" width="28" height="16" rx="2" stroke="#888" strokeWidth="2.5"/><path d="M18 18v-5a6 6 0 0 1 12 0v5" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="26" r="3" stroke="#888" strokeWidth="2.5"/></svg>;
const IconTechnicianSvc = () => <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="18" r="7" stroke="#888" strokeWidth="2.5"/><path d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/></svg>;

// ── HELPERS ───────────────────────────────────────────────────────────────────

const Avatar = ({ size = 40 }) => (
  <div style={{ width: size, height: size }} className="rounded-full border-2 border-gray-500 overflow-hidden flex-shrink-0">
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <circle cx="20" cy="20" r="20" fill="#3d2b1f"/>
      <circle cx="20" cy="15" r="7" fill="#c8956a"/>
      <ellipse cx="20" cy="34" rx="11" ry="8" fill="#1a3a5c"/>
    </svg>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-gray-700">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-green-400">{Number(payload[0].value).toLocaleString()} FCFA</p>
    </div>
  );
};

const fmt     = (n) => Number(n || 0).toLocaleString("fr-FR");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── SHARED UI ─────────────────────────────────────────────────────────────────

const inputCls = (err) =>
  `w-full border rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50
   focus:outline-none focus:bg-white transition-colors
   ${err ? "border-red-400" : "border-gray-200 focus:border-gray-900"}`;

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Spinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/>
  </svg>
);

// ── MODAL WRAPPER ─────────────────────────────────────────────────────────────

const Modal = ({ onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl px-6 pt-5 pb-10 sm:pb-8 overflow-y-auto max-h-[92vh]"
      style={{ animation: "modalIn .28s cubic-bezier(.4,0,.2,1)" }}
    >
      <style>{`@keyframes modalIn{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"/>
      {children}
    </div>
  </div>
);

const ModalHeader = ({ icon, title, subtitle, onClose }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: icon.bg }}>
      {icon.el}
    </div>
    <div>
      <p className="text-base font-bold text-gray-900">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
    <button onClick={onClose}
      className="ml-auto w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition flex-shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
);

const SuccessScreen = ({ title, message, onClose }) => (
  <div className="flex flex-col items-center py-8 text-center gap-4">
    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <p className="text-lg font-bold text-gray-900">{title}</p>
    <p className="text-sm text-gray-500 max-w-xs">{message}</p>
    <button onClick={onClose}
      className="mt-2 bg-gray-900 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all">
      Fermer
    </button>
  </div>
);

// ── MODAL RECHARGER ───────────────────────────────────────────────────────────

const OPERATEURS = ["MTN Mobile Money", "Orange Money", "Express Union", "Autre"];

const ModalRecharger = ({ onClose }) => {
  const [form, setForm]     = useState({ numero: "", entreprise: "", operateur: "", id_transaction: "", montant: "" });
  const [capture, setCapture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => { setForm((p) => ({ ...p, [k]: e.target.value })); setErrors((p) => ({ ...p, [k]: undefined })); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCapture(file);
    setErrors((p) => ({ ...p, capture: undefined }));
    const r = new FileReader();
    r.onload = (ev) => setPreview(ev.target.result);
    r.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.numero.trim())         e.numero         = "Champ obligatoire";
    if (!form.operateur)             e.operateur      = "Sélectionnez un opérateur";
    if (!form.id_transaction.trim()) e.id_transaction = "Champ obligatoire";
    if (!form.montant || isNaN(Number(form.montant)) || Number(form.montant) <= 0) e.montant = "Montant invalide";
    if (!capture)                    e.capture        = "Veuillez joindre une capture d'écran";
    return e;
  };

const handleSubmit = async () => {
  const e = validate();
  if (Object.keys(e).length) { setErrors(e); return; }
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const body = new FormData();

body.append("numero", form.numero);


// 🔥 mapping backend
body.append("moyen_paiement", form.operateur);
body.append("numero_paiement", form.id_transaction);

body.append("montant", form.montant);
body.append("capture", capture);

    // ✅ URL corrigée : ajout de /api
    const res = await fetch("http://localhost:5000/api/admin/notifications", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    // ✅ Meilleure gestion : affiche le message d'erreur serveur si disponible
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }

    setSuccess(true);
  } catch (err) {
    setErrors((p) => ({ ...p, global: err.message || "Erreur lors de l'envoi. Veuillez réessayer." }));
  } finally {
    setLoading(false);
  }
};

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={{ bg: "#eff6ff", el: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 12v6M9 15l3-3 3 3"/></svg> }}
        title="Recharger le portefeuille"
        subtitle="Remplissez le formulaire après votre dépôt mobile"
        onClose={onClose}
      />

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Informations du dépôt</p>

      <div className="flex flex-col gap-4 mb-6">
        <Field label="Numéro de téléphone" error={errors.numero}>
          <input type="text" value={form.numero} onChange={set("numero")} placeholder="Ex : 659026548" className={inputCls(errors.numero)}/>
        </Field>

        <Field label="Opérateur mobile" error={errors.operateur}>
          <select value={form.operateur} onChange={set("operateur")} className={inputCls(errors.operateur) + " cursor-pointer"}>
            <option value="">-- Sélectionner --</option>
            {OPERATEURS.map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ID transaction" error={errors.id_transaction}>
            <input type="text" value={form.id_transaction} onChange={set("id_transaction")} placeholder="Ex : TXN123456" className={inputCls(errors.id_transaction)}/>
          </Field>
          <Field label="Montant (FCFA)" error={errors.montant}>
            <input type="number" value={form.montant} onChange={set("montant")} placeholder="Ex : 5000" min="1" className={inputCls(errors.montant)}/>
          </Field>
        </div>

        <Field label="Capture d'écran de la transaction" error={errors.capture}>
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors py-5 px-4
            ${errors.capture ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"}`}>
            {preview ? (
              <div className="w-full flex flex-col items-center gap-2">
                <img src={preview} alt="aperçu" className="max-h-40 rounded-lg object-contain border border-gray-200"/>
                <p className="text-xs text-gray-500 truncate max-w-full">{capture?.name}</p>
                <p className="text-xs text-blue-600 font-medium">Changer l'image</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="text-sm font-medium text-gray-600">Cliquer pour ajouter</p>
                <p className="text-xs text-gray-400">PNG, JPG, JPEG · Max 5 Mo</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden"/>
          </label>
        </Field>

        {errors.global && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errors.global}</p>}
      </div>

      <button onClick={handleSubmit} disabled={loading}
        className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 active:scale-95
                   text-white font-semibold py-4 rounded-xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? <Spinner/> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        {loading ? "Envoi en cours…" : "Valider la demande"}
      </button>
    </Modal>
  );
};

// ── MODAL RETIRER ─────────────────────────────────────────────────────────────

const MOYENS_RETRAIT = ["MTN Mobile Money", "Orange Money", "Express Union"];

const ModalRetirer = ({ wallet, onClose, onSuccess }) => {
  const [montant, setMontant] = useState("");
  const [date,    setDate]    = useState("");
  const [numero,  setNumero]  = useState("");
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e = {};
    const m = Number(montant);
    if (!montant || isNaN(m) || m <= 0) e.montant = "Montant invalide";
    else if (m > wallet)                e.montant = `Solde insuffisant (max ${fmt(wallet)} FCFA)`;
    if (!date)                         e.date    = "Sélectionnez la date de retrait";
    if (!numero.trim())                e.numero  = "Champ obligatoire";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch("http://localhost:5000/api/partner/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ montant: Number(montant), date }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      onSuccess && onSuccess(Number(montant));
    } catch {
      setErrors((p) => ({ ...p, global: "Erreur lors du retrait. Veuillez réessayer." }));
    } finally { setLoading(false); }
  };

  if (success) return (
    <Modal onClose={onClose}>
      <SuccessScreen
        title="Retrait effectué !"
        message={`Votre retrait de ${fmt(montant)} FCFA a été traité. Votre portefeuille a été mis à jour.`}
        onClose={onClose}
      />
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={{ bg: "#fff7ed", el: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 18v-6M9 15l3 3 3-3"/></svg> }}
        title="Retirer mes commissions"
        subtitle={<>Solde disponible : <span className="text-green-600 font-semibold">{fmt(wallet)} FCFA</span></>}
        onClose={onClose}
      />

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Informations du retrait</p>

      <div className="flex flex-col gap-4 mb-6">
        <Field label="Montant à retirer (FCFA)" error={errors.montant}>
          <input type="number" value={montant}
            onChange={(e) => { setMontant(e.target.value); setErrors((p) => ({ ...p, montant: undefined })); }}
            placeholder={`Max : ${fmt(wallet)} FCFA`} min="1" max={wallet}
            className={inputCls(errors.montant)}/>
        </Field>

        <Field label="Date de retrait souhaitée" error={errors.date}>
          <input type="date" value={date}
            onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
            className={inputCls(errors.date)} />
        </Field>

        <Field label="Numéro de réception" error={errors.numero}>
          <input type="tel" value={numero}
            onChange={(e) => { setNumero(e.target.value); setErrors((p) => ({ ...p, numero: undefined })); }}
            placeholder="Ex : +237 6XX XXX XXX"
            className={inputCls(errors.numero)}/>
        </Field>

        <div className="flex gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-xs text-orange-700 leading-relaxed">
            Le montant sera déduit immédiatement de votre solde et envoyé sur le numéro indiqué.
          </p>
        </div>

        {errors.global && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errors.global}</p>}
      </div>

      <button onClick={handleSubmit} disabled={loading}
        className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 active:scale-95
                   text-white font-semibold py-4 rounded-xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? <Spinner/> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>}
        {loading ? "Traitement…" : "Confirmer le retrait"}
      </button>
    </Modal>
  );
};

// ── MODAL TECHNICIEN ──────────────────────────────────────────────────────────

const TechnicienModal = ({ onClose, adminWhatsapp }) => {
  const [form, setForm]     = useState({ nom: "", telephone: "", description: "", ville: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => { setForm((p) => ({ ...p, [k]: e.target.value })); setErrors((p) => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())         e.nom         = "Champ obligatoire";
    if (!form.telephone.trim())   e.telephone   = "Champ obligatoire";
    if (!form.description.trim()) e.description = "Champ obligatoire";
     if (!form.ville.trim()) e.ville = "Champ obligatoire";
    return e;
  };

const handleSubmit = async () => {
  const e = validate();
  if (Object.keys(e).length) {
    setErrors(e);
    return;
  }

  setLoading(true);

  try {
    const token = localStorage.getItem("token");

    // 🔥 Notification admin (on ajoute bien ville ici)
    await fetch("http://localhost:5000/api/admin/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: "technicien",
        titre: `Demande technicien – ${form.nom}`,
        message: `Téléphone : ${form.telephone} | Ville : ${form.ville} | Problème : ${form.description}`,
      }),
    });
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }

  // 🔥 WhatsApp (ville ajoutée clairement)
  const msg = encodeURIComponent(
    `🔧 *Demande Technicien*\n\n👤 Nom : ${form.nom}\n📞 Téléphone : ${form.telephone}\n🏙️ Ville : ${form.ville}\n\n📝 Problème :\n${form.description}`
  );

  window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, "_blank");

  onClose();
};
  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={{ bg: "#fef2f2", el: <svg width="22" height="22" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="18" r="7" stroke="#e53935" strokeWidth="2.5"/><path d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#e53935" strokeWidth="2.5" strokeLinecap="round"/></svg> }}
        title="Demande Technicien"
        subtitle="Décrivez votre problème, nous vous rappelons"
        onClose={onClose}
      />
      <div className="flex flex-col gap-4 mb-6">
        <Field label="Nom du partenaire" error={errors.nom}>
          <input type="text" value={form.nom} onChange={set("nom")} placeholder="Ex : Jean Dupont" className={inputCls(errors.nom)}/>
        </Field>
        <Field label="Numéro de téléphone" error={errors.telephone}>
          <input type="tel" value={form.telephone} onChange={set("telephone")} placeholder="Ex : +237 6XX XXX XXX" className={inputCls(errors.telephone)}/>
        </Field>
         <Field label="Ville" error={errors.ville}>
          <input type="tel" value={form.ville} onChange={set("ville")} placeholder="Ex : Douala" className={inputCls(errors.ville)}/>
        </Field>
        <Field label="Description du problème" error={errors.description}>
          <textarea value={form.description} onChange={set("description")} placeholder="Décrivez le problème rencontré..." rows={4} className={inputCls(errors.description) + " resize-none"}/>
        </Field>
      </div>
      <button onClick={handleSubmit} disabled={loading}
        className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold py-4 rounded-xl transition-all text-sm disabled:opacity-60">
        {loading ? <Spinner/> : <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.845L.057 23.428a.5.5 0 0 0 .515.572l5.76-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.385l-.362-.214-3.755.984.999-3.648-.235-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>}
        {loading ? "Envoi…" : "Envoyer via WhatsApp"}
      </button>
    </Modal>
  );
};

// ── NAV / SERVICES ────────────────────────────────────────────────────────────

const navItems = [
  { id: "accueil",      label: "Accueil",      Icon: IconHome         },
  { id: "transactions", label: "Transactions", Icon: IconTransactions },
  { id: "statistiques", label: "Statistiques", Icon: IconStats        },
  { id: "portefeuille", label: "Portefeuille", Icon: IconWallet       },
  { id: "parametres",   label: "Paramètres",   Icon: IconSettings     },

];

const services = [
  { id: "abonnement",   label: "Abonnement",   image: cfgImg,         route: "/abonnements"  },
  { id: "reabonnement", label: "Réabonnement", image: abonnementsImg, route: "/reabonnement"},
  { id: "accessoire",   label: "Accessoire",   image: accessoiresImg, route: "/boutique"    },
  { id: "technicien",   label: "Technicien",   image: technicienImg,  route: null          },
];

// ── PAGES ─────────────────────────────────────────────────────────────────────

const PageAccueil = ({ message, wallet, commissionTotal, navigate, adminWhatsapp }) => {
  const [showTechnicien, setShowTechnicien] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gray-900 rounded-2xl px-6 py-5">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Bienvenue</p>
        <h1 className="text-white text-xl font-semibold">{message}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-green-600 rounded-xl px-5 py-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-green-100 text-xs uppercase tracking-widest mb-1">Portefeuille</p>
            <p className="text-white text-2xl font-bold">{fmt(wallet)} FCFA</p>
          </div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><circle cx="12" cy="14" r="2"/>
          </svg>
        </div>

        <div className="bg-blue-600 rounded-xl px-5 py-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-blue-100 text-xs uppercase tracking-widest mb-1">Commissions gagnées</p>
            <p className="text-white text-2xl font-bold">{fmt(commissionTotal)} FCFA</p>
          </div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <p className="text-center text-base font-semibold text-gray-700">Nos services</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map(({ id, label, image, route }) => (
          <button key={id} onClick={() => { if (id === "technicien") { setShowTechnicien(true); return; } route && navigate(route); }}
            className="flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white active:scale-95 hover:-translate-y-1 transition-transform duration-150 shadow-sm">
            <div className="relative overflow-hidden bg-[#ece9e2] h-28 w-full">
              <img src={image} alt={label} className="absolute inset-0 h-full w-full object-cover object-center" />
            </div>
            <div className="bg-gray-900 text-white text-sm font-medium py-2.5 text-center w-full">{label}</div>
          </button>
        ))}
      </div>
      <a href={`https://wa.me/${adminWhatsapp}`} target="_blank" rel="noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.845L.057 23.428a.5.5 0 0 0 .515.572l5.76-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.385l-.362-.214-3.755.984.999-3.648-.235-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Assistance WhatsApp
      </a>
      {showTechnicien && <TechnicienModal onClose={() => setShowTechnicien(false)} adminWhatsapp={adminWhatsapp}/>}
    </div>
  );
};

const PageStatistiques = ({ stats, commissionsParFormule }) => (
  <div className="flex flex-col gap-5">
    <div className="bg-gray-900 rounded-2xl px-6 py-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Vue d'ensemble</p>
      <h1 className="text-white text-xl font-semibold">Statistiques</h1>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: "Clients",       value: stats.clients                },
        { label: "Réabonnements", value: stats.reabonnements          },
        { label: "Revenus",       value: `${fmt(stats.revenus)} FCFA` },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
          <p className="text-lg font-bold mt-1 text-gray-900">{value}</p>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs text-gray-400 uppercase tracking-widest">Statistiques</p>
        <h2 className="text-base font-semibold text-gray-900 mt-0.5">Commissions par formule Canal+</h2>
      </div>
      {commissionsParFormule.length === 0 ? (
        <div className="px-5 pb-8 pt-4 text-sm text-gray-400 text-center">Aucune donnée disponible</div>
      ) : (
        <div className="px-4 pb-6">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={commissionsParFormule} margin={{ top: 10, right: 16, left: 0, bottom: 30 }} barSize={36}>
              <XAxis dataKey="formule" tick={{ fontSize: 11, fill: "#6b7280" }} angle={-20} textAnchor="end" interval={0} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip/>} cursor={{ fill: "#f3f4f6" }}/>
              <Bar dataKey="commissions" fill="#16a34a" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </div>
);

// ── ICONS TRANSACTIONS ────────────────────────────────────────────────────────

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const IconChevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── PAGE TRANSACTIONS ─────────────────────────────────────────────────────────

const PageTransactions = ({ transactions = [] }) => {
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("tous");
  const [expanded,   setExpanded]   = useState(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const abonne  = String(t.numero_abonne || "").toLowerCase();
      const formule = String(t.formule || "").toLowerCase();
      const q       = search.toLowerCase();
      const matchSearch = !q || abonne.includes(q) || formule.includes(q);
      const matchType   = filterType === "tous" || (t.type_operation || "reabonnement") === filterType;
      return matchSearch && matchType;
    });
  }, [transactions, search, filterType]);

  const totalMontant = useMemo(
    () => filtered.reduce((sum, t) => sum + Number(t.montant || 0), 0),
    [filtered]
  );

  const resolveInvoice = (t) => findLocalInvoice(t) || buildInvoiceFromApiTransaction(t);

  const handleDownload = (e, t) => { e.stopPropagation(); generateInvoicePDF(resolveInvoice(t)); };
  const handlePrint    = (e, t) => { e.stopPropagation(); printInvoicePDF(resolveInvoice(t)); };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-900 rounded-2xl px-6 py-5">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Historique</p>
        <h1 className="text-white text-xl font-semibold">Transactions</h1>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: transactions.length               },
          { label: "Filtrés",  value: filtered.length                   },
          { label: "Montant",  value: `${fmt(totalMontant)} FCFA`       },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl px-3 py-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold mt-0.5 text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Barre de recherche + filtre */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Rechercher (abonné, formule…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-gray-900 transition-colors"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:bg-white focus:border-gray-900 transition-colors cursor-pointer"
        >
          <option value="tous">Tous</option>
          <option value="reabonnement">Réabonnement</option>
          <option value="upgrade">Upgrade</option>
          <option value="addOption">Options</option>
        </select>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-sm text-gray-400 text-center">Aucune transaction trouvée</div>
        ) : (
          filtered.map((t, i) => {
            const isOpen = expanded === i;
            return (
              <div key={t.id ?? i} className={i !== 0 ? "border-t border-gray-100" : ""}>
                {/* Ligne principale */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Réabonnement – {t.formule || "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.numero_abonne} · {fmtDate(t.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">+{fmt(t.montant)} FCFA</span>
                    <IconChevron open={isOpen}/>
                  </div>
                </div>

                {/* Panneau déroulant */}
                {isOpen && (
                  <div className="px-5 pb-4 flex items-center gap-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={(e) => handleDownload(e, t)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      <IconDownload/> Télécharger
                    </button>
                    <button
                      onClick={(e) => handlePrint(e, t)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      <IconPrint/> Imprimer
                    </button>
                    {t.invoice_url && (
                      <a
                        href={t.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline ml-auto"
                      >
                        Voir facture
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ── PAGE PORTEFEUILLE ─────────────────────────────────────────────────────────

const PagePortefeuille = ({ wallet, setWallet, commissionBalance, setCommissionBalance, commissionTotal, transactions }) => {
  const [showRecharger, setShowRecharger] = useState(false);
  const [showRetirer,   setShowRetirer]   = useState(false);
  const [isBalancing,   setIsBalancing]   = useState(false);
  const [balanceMessage, setBalanceMessage] = useState("");

  const handleBalance = async () => {
    setIsBalancing(true);
    setBalanceMessage("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/partner/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Erreur de transfert");
      setWallet(data.wallet_balance ?? wallet);
      setCommissionBalance(data.commission_balance ?? 0);
      setBalanceMessage(data.message || "Commissions transférées avec succès.");
    } catch (err) {
      setBalanceMessage(err.message || "Impossible de balancer les commissions.");
      console.error("Erreur balance :", err);
    } finally {
      setIsBalancing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gray-900 rounded-2xl px-6 py-5">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Mon solde</p>
        <h1 className="text-white text-xl font-semibold">Portefeuille</h1>
      </div>

      <div className="bg-green-600 rounded-2xl px-6 py-8 flex flex-col items-center shadow-md">
        <p className="text-green-100 text-sm uppercase tracking-widest mb-2">Solde disponible dans le portefeuille</p>
        <p className="text-white text-4xl font-bold">{fmt(wallet)} FCFA</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setShowRecharger(true)}
          className="bg-white border border-gray-200 rounded-xl py-4 text-sm font-semibold text-gray-800
                     hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          Recharger
        </button>
        <button onClick={() => setShowRetirer(true)}
          className="bg-gray-900 rounded-xl py-4 text-sm font-semibold text-white
                     hover:bg-gray-800 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
          Retirer
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl px-6 py-5">
        <p className="text-gray-300 text-xs uppercase tracking-widest">Mon solde commission</p>
      </div>

      <div className="bg-green-600 rounded-2xl px-6 py-8 text-center">
        <p className="text-green-100 text-xs uppercase tracking-widest mb-2">Commissions cumulées</p>
        <p className="text-white text-4xl font-bold">{fmt(commissionBalance)} FCFA</p>
      </div>

      <button
        onClick={handleBalance}
        disabled={isBalancing}
        className="w-full bg-gray-900 text-white rounded-2xl py-4 text-sm font-semibold transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBalancing ? "Paiement..." : "Paiement"}
      </button>

      {balanceMessage && (
        <div className="px-2">
          <p className="text-sm text-gray-600">{balanceMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Dernières opérations</p>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-400 text-center">Aucune opération</div>
        ) : (
          transactions.slice(0, 5).map((t, i) => (
            <div key={t.id ?? i} className={`flex items-center justify-between px-5 py-4 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
              <div>
                <p className="text-sm font-medium text-gray-900">Réabonnement – {t.formule}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-green-600">+{fmt(t.montant)} FCFA</span>
                {t.invoice_url && (
                  <a href={t.invoice_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                    Facture
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showRecharger && <ModalRecharger onClose={() => setShowRecharger(false)}/>}
      {showRetirer   && <ModalRetirer wallet={wallet} onClose={() => setShowRetirer(false)} onSuccess={(m) => setWallet((w) => Math.max(0, w - m))}/>}
    </div>
  );
};

// ── PAGE PARAMÈTRES ───────────────────────────────────────────────────────────

const PageParametres = ({ onLogout }) => (
  <div className="flex flex-col gap-4">
    <div className="bg-gray-900 rounded-2xl px-6 py-5">
      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Compte</p>
      <h1 className="text-white text-xl font-semibold">Paramètres</h1>
    </div>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {["Mon profil","Changer mot de passe","Notifications","Langue","Conditions d'utilisation","Se déconnecter"].map((item, i) => (
        <button key={i} onClick={item === "Se déconnecter" ? onLogout : undefined}
          className={`w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium
                      ${item === "Se déconnecter" ? "text-red-600" : "text-gray-800"}
                      hover:bg-gray-50 active:bg-gray-100 transition-colors ${i !== 0 ? "border-t border-gray-100" : ""}`}>
          {item}
          {item !== "Se déconnecter" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
        </button>
      ))}
    </div>
  </div>
);

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function PartnerDashboard() {
  const [activeNav, setActiveNav]           = useState("accueil");
  const [message,         setMessage]          = useState("Tableau de bord partenaire");
  const [wallet,            setWallet]             = useState(0);
  const [commissionBalance, setCommissionBalance]  = useState(0);
  const [commissionTotal,   setCommissionTotal]    = useState(0);
  const [stats,             setStats]              = useState({ clients: 0, reabonnements: 0, revenus: 0 });
  const [commissionsParFormule, setCommissions]   = useState([]);
  const [transactions,      setTransactions]        = useState([]);
  const [adminWhatsapp,     setAdminWhatsapp]      = useState("");

  const navigate = useNavigate();

  const handleLogout = () => {
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/LoginForm");
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch("http://localhost:5000/api/partner/dashboard", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setMessage(data.message                    || "Tableau de bord partenaire");
      setWallet(data.wallet_balance              || 0);
      setCommissionBalance(data.commission_balance || 0);
      setStats(data.stats                        || { clients: 0, reabonnements: 0, revenus: 0 });
      setCommissionTotal(data.commission_total   || 0);
      setCommissions(data.commissions_par_formule || []);
      setTransactions(data.transactions          || []);
      setAdminWhatsapp(data.admin_whatsapp       || "");
       setDecodeurs(data.decodeurs          || []);
    } catch (e) { console.error("Erreur dashboard :", e); }
  }, []);

 
const [decodeurs, setDecodeurs] = useState([]);
const [loadingDecoders, setLoadingDecoders] = useState(false);

const fetchDecodeurs = useCallback(async () => {
  try {
    setLoadingDecoders(true);
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/partner/decodeurs", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Erreur API");

    const data = await res.json();
    setDecodeurs(data || []);
  } catch (e) {
    console.error("Erreur decodeurs :", e);
  } finally {
    setLoadingDecoders(false);
  }
}, []);

// ✅ CORRECTION ICI
useEffect(() => {
  fetchDashboard();
  fetchDecodeurs();

  const interval = setInterval(fetchDashboard, 10000);

  return () => clearInterval(interval);
}, [fetchDashboard, fetchDecodeurs]);

const PageDecodeurs = ({ decodeurs, loadingDecoders }) => (
  <div className="flex flex-col gap-5">
    
    {/* KPI */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <KpiCard
        label="Total décodeurs"
        value={decodeurs.length}
        color="bg-gray-900 text-white"
      />
      <KpiCard
        label="Disponibles"
        value={decodeurs.filter(d => d.status === "free").length}
        color="bg-green-600 text-white"
      />
      <KpiCard
        label="Utilisés"
        value={decodeurs.filter(d => d.status === "used").length}
        color="bg-red-600 text-white"
      />
    </div>

    {/* TABLE */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-gray-50">
        <h2 className="text-sm font-bold text-gray-900">
          Mes décodeurs attribués
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-5 py-3 text-left text-xs text-gray-400 uppercase">
                Numéro
              </th>
              <th className="px-5 py-3 text-left text-xs text-gray-400 uppercase">
                Statut
              </th>
            </tr>
          </thead>

          <tbody>
            {loadingDecoders ? (
              <tr>
                <td colSpan={2} className="text-center py-10 text-gray-400">
                  Chargement…
                </td>
              </tr>
            ) : decodeurs.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-10 text-gray-400">
                  Aucun décodeur attribué
                </td>
              </tr>
            ) : (
              decodeurs.map((d) => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    {d.numero}
                  </td>

                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded font-semibold ${
                        d.status === "free"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {d.status === "free" ? "Disponible" : "Utilisé"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
 
const renderPage = () => {
  switch (activeNav) {

    case "transactions":
      return <PageTransactions transactions={transactions} />;

    case "statistiques":
      return <PageStatistiques stats={stats} commissionsParFormule={commissionsParFormule} />;

    case "portefeuille":
      return <PagePortefeuille
        wallet={wallet}
        setWallet={setWallet}
        commissionBalance={commissionBalance}
        setCommissionBalance={setCommissionBalance}
        commissionTotal={commissionTotal}
        transactions={transactions}
      />;

    case "parametres":
      return <PageParametres onLogout={handleLogout} />;

    case "decodeurs":
      return (
        <PageDecodeurs
          decodeurs={decodeurs}
          loadingDecoders={loadingDecoders}
        />
      );

    default:
      return (
        <PageAccueil
          message={message}
          wallet={wallet}
          commissionTotal={commissionTotal}
          navigate={navigate}
          adminWhatsapp={adminWhatsapp}
        />
      );
  }
};

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden"><Avatar size={38}/></div>
            <button onClick={() => setActiveNav("accueil")} className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="Vision Canal" className="h-9 w-9 rounded-xl object-contain"/>
            </button>
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center text-gray-700">
            <IconBell/>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border-2 border-white"/>
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:flex flex-col w-60 min-h-[calc(100vh-57px)] bg-white border-r border-gray-100 sticky top-[57px] shadow-sm">
          <div className="flex flex-col items-center py-8 px-4 border-b border-gray-100">
            <button onClick={() => setActiveNav("accueil")} className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="Vision Canal" className="h-16 w-16 rounded-2xl object-contain"/>
            </button>
            <p className="mt-3 font-semibold text-gray-900 text-sm">Partenaire</p>
            <p className="text-xs text-gray-400 mt-0.5">Vision Canal+</p>
          </div>
          <nav className="flex flex-col gap-1 p-3 flex-1">
            {navItems.map(({ id, label, Icon }) => {
              const isActive = activeNav === id;
              return (
                <button key={id} onClick={() => setActiveNav(id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                              ${isActive ? "bg-red-50 text-red-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}>
                  <Icon active={isActive}/>{label}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-100">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Se déconnecter
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8 pb-28 lg:pb-8">
          <div className="max-w-4xl mx-auto">{renderPage()}</div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around bg-white border-t border-gray-200 pt-2.5 pb-5">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = activeNav === id;
          return (
            <button key={id} onClick={() => setActiveNav(id)} className="flex flex-col items-center gap-1 flex-1">
              <Icon active={isActive}/>
              <span className={`text-[10px] font-medium ${isActive ? "text-red-600" : "text-gray-400"}`}>{label}</span>
              {isActive && <span className="block w-5 h-0.5 bg-red-600 rounded-full"/>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
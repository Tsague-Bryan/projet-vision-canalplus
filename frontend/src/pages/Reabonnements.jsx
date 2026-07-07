import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Wrench } from "lucide-react";
import InvoiceViewer from "../components/InvoiceViewer";
import { apiUrl } from "../lib/api";
import { getToken } from "../lib/session";

const offres = [
  { name: "Access", price: 5000 },
  { name: "Evasion", price: 10500 },
  { name: "Access+", price: 15000 },
  { name: "Tout Canal+", price: 28000 },
];

const upgradeOnlyOffres = [
  { name: "ENGLISH PLUS DD", price: 5000 },
  { name: "CHARME", price: 7000 },
];

const optionsList = [
  { code: "NETFLIX", name: "NETFLIX BASIC ( 1S )", price: 3000 },
  { code: "NETFLIX STANDARD", name: "NETFLIX STANDARD ( 2S )", price: 5500 },
  { code: "NETFLIX PREMIUM", name: "NETFLIX PREMIUM ( 4S )", price: 7000 },
];

const resolveFormuleName = (raw) => {
  if (!raw) return "";
  const map = {
    "ACDD": "Access", "EVDD": "Evasion", "ACPDD": "Access+", "TCADD": "Tout Canal+",
    "ENGLISH PLUS DD": "ENGLISH PLUS DD", "ENGLISH+": "ENGLISH PLUS DD", "ENGLISH +": "ENGLISH PLUS DD",
    "CHARME": "CHARME",
    "ACCESS": "Access", "ACCES": "Access", "EVASION": "Evasion", "ACCESS+": "Access+",
    "ACCES+": "Access+", "TOUT CANAL+": "Tout Canal+",
    "TOUTCANAL+": "Tout Canal+", "TOUT_CANAL+": "Tout Canal+", "TOUT CANAL": "Tout Canal+",
    "Access": "Access", "Evasion": "Evasion", "Access+": "Access+",
 "Tout Canal+": "Tout Canal+",
    "Essentiel": "Access+",
  };
  return map[raw] || map[raw.toUpperCase()] || raw;
};

const getFormulePrice = (raw) => {
  const name = resolveFormuleName(raw);
  return [...offres, ...upgradeOnlyOffres].find(o => o.name === name)?.price || 0;
};

const priceFallbackByCode = {
  ACDD: 5000,
  EVDD: 10500,
  ACPDD: 15000,
  TCADD: 28000,
  "ENGLISH PLUS DD": 5000,
  CHARME: 7000,
  NETFLIX: 3000,
  "NETFLIX STANDARD": 5500,
  "NETFLIX PREMIUM": 7000,
};

const getCatalogPrice = (item) => {
  const rawPrice = item?.price ?? item?.prix ?? item?.montant ?? item?.amount;
  const parsed = Number(rawPrice);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return priceFallbackByCode[item?.code] || getFormulePrice(item?.name) || 0;
};

const mapFormule = (name) => {
  const map = { "Access": "ACDD", "Evasion": "EVDD", "Access+": "ACPDD", "Tout Canal+": "TCADD" };
  return map[name] || name;
};

const formatPhone = (phone) => {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("237") && clean.length === 12) clean = "00" + clean;
  if (clean.startsWith("00237") && clean.length === 14) return clean;
  if (clean.length === 9) return "00237" + clean;
  return "";
};

const formatDate = (d) => d || "-";
const SEARCH_HISTORY_KEY = "vision_search_identifiers_v1";

const loadSearchHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
};

const saveSearchIdentifier = (type, value) => {
  const clean = String(value || "").trim();
  if (!type || !clean) return;
  const current = loadSearchHistory();
  const next = [clean, ...(current[type] || []).filter((item) => item !== clean)].slice(0, 20);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify({ ...current, [type]: next }));
};

const Spinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity=".25" /><path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

const SuccessScreen = ({ result, operationType, client, onClose }) => {
  const label = operationType === "upgrade" ? "Upgrade" : operationType === "addOption" ? "Ajout d'options" : "Réabonnement";
  const factureUrl = result?.facture_url || null;
  const [invoiceView, setInvoiceView] = useState(null);

  return (
    <div className="flex flex-col items-center py-8 gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground">{label} réussi !</h3>
        {client && <p className="text-sm text-muted-foreground mt-1">Abonné <strong>{client?.name}</strong>  {client?.numabo}</p>}
      </div>
      {result?.commission > 0 && (
        <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <p className="text-green-700 font-semibold">Commission gagnée : +{Number(result.commission).toLocaleString()} FCFA</p>
          {result.wallet_balance !== undefined && (
            <p className="text-muted-foreground text-xs mt-1">Solde portefeuille : {Number(result.wallet_balance).toLocaleString()} FCFA</p>
          )}
        </div>
      )}
      {result?.test_mode && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 font-medium">a MODE TEST  Aucune opération réelle effectuée</div>
      )}
      <div className="w-full flex flex-col gap-3">
        {factureUrl ? (
          <>
            <button type="button" onClick={() => setInvoiceView({ url: factureUrl, print: false })}
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg transition-all hover:bg-primary/90">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Voir la facture
            </button>
            <button type="button" onClick={() => setInvoiceView({ url: factureUrl, print: true })}
              className="flex items-center justify-center gap-2 w-full bg-muted text-foreground font-semibold py-3 rounded-lg transition-all hover:bg-muted/80">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
              Imprimer la facture
            </button>
          </>
        ) : <p className="text-xs text-muted-foreground">Facture en cours de génération⬦</p>}
        {result?.whatsappLink && (
          <a href={result.whatsappLink} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.845L.057 23.428a.5.5 0 0 0 .515.572l5.76-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.385l-.362-.214-3.755.984.999-3.648-.235-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
            Notifier WhatsApp
          </a>
        )}
        <button onClick={onClose} className="w-full border border-border text-muted-foreground font-semibold py-3 rounded-lg hover:bg-muted/30 transition-all">
          Nouvelle opération
        </button>
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

export default function Reabonnement() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const numabo = params.get("numabo");
    if (numabo) {
      setSearchValue(numabo);
      setSearchType("numabo");
    }
  }, []);

  const [step, setStep] = useState(1);
  const [isUpgradeMode, setIsUpgradeMode] = useState(false);
  const [isAddOptionMode, setIsAddOptionMode] = useState(false);
  const [operationType, setOperationType] = useState("reabonnement");
  const [searchType, setSearchType] = useState("numabo");
  const [searchValue, setSearchValue] = useState("");
  const [client, setClient] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [formule, setFormule] = useState("");
  const [duree, setDuree] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [montant, setMontant] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory);

  const currentClientFormule = resolveFormuleName(client?.bouquet || client?.previousFormule || "");
  const mainOffres = catalog.length
    ? catalog.filter(f => f.type === "formule").map(f => ({ name: resolveFormuleName(f.name || f.code), code: f.code, price: getCatalogPrice(f) }))
    : offres;
  const upgradeOffres = catalog.length
    ? catalog.filter(f => ["ENGLISH PLUS DD","CHARME"].includes(f.code)).map(f => ({ name: resolveFormuleName(f.name || f.code), code: f.code, price: getCatalogPrice(f) }))
    : upgradeOnlyOffres;
  const optionOffres = catalog.length
    ? catalog.filter(f => f.type === "option" && !["ENGLISH PLUS DD","CHARME"].includes(f.code)).map(f => ({ code: f.code, name: f.name, price: getCatalogPrice(f) }))
    : optionsList;

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    axios.get(apiUrl("/formules"), { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalog(res.data || []))
      .catch(() => setCatalog([]));
  }, []);

  const getFormulePriceLocal = (raw) => {
    const name = resolveFormuleName(raw);
    const code = mapFormule(raw);
    return [...mainOffres, ...upgradeOffres].find(o => o.name === name || o.code === code)?.price || 0;
  };
  const getOptionsTotalLocal = (codes) =>
    optionOffres.reduce((sum, o) => codes.includes(o.code) ? sum + o.price : sum, 0);
  const isUpgradeOnlyFormuleLocal = (raw) =>
    upgradeOffres.some(o => o.name === resolveFormuleName(raw) || o.code === raw);
  const mapFormuleLocal = (name) => {
    const found = [...mainOffres, ...upgradeOffres].find(o => o.name === name || o.code === name);
    return found?.code || mapFormule(name);
  };

  const recalcMontant = ({
    nextFormule = formule,
    nextDuree = duree,
    nextOptions = selectedOptions,
    nextIsUpgrade = isUpgradeMode,
    nextIsAddOption = isAddOptionMode,
  } = {}) => {
    const optionsTotal = getOptionsTotalLocal(nextOptions);
    const d = Number(nextDuree) || 1;

    if (nextIsUpgrade) {
      const prixNouvelle = getFormulePriceLocal(nextFormule);
      const prixActuelle = getFormulePriceLocal(currentClientFormule);
      const delta = isUpgradeOnlyFormuleLocal(nextFormule) ? prixNouvelle : Math.max(0, prixNouvelle - prixActuelle);
      return delta + optionsTotal;
    }
    if (nextIsAddOption) return optionsTotal;
    return (getFormulePriceLocal(nextFormule) + optionsTotal) * d;
  };

  const handleOptionToggle = (code) => {
    const next = selectedOptions.includes(code)
      ? selectedOptions.filter(c => c !== code)
      : [...selectedOptions, code];
    setSelectedOptions(next);
    setMontant(recalcMontant({ nextOptions: next }));
    setOptionsOpen(false);
  };

  const handleFormuleChange = (value) => {
    setFormule(value);
    setMontant(recalcMontant({ nextFormule: value }));
  };

  const handleDureeChange = (value) => {
    setDuree(value);
    setMontant(recalcMontant({ nextDuree: value }));
  };

  const handleOperationTypeChange = (type) => {
    const upgrade = type === "upgrade";
    const addOption = type === "addOption";
    setOperationType(type);
    setIsUpgradeMode(upgrade);
    setIsAddOptionMode(addOption);
    if (addOption) setFormule(currentClientFormule);
    setMontant(recalcMontant({ nextIsUpgrade: upgrade, nextIsAddOption: addOption, nextFormule: addOption ? currentClientFormule : formule }));
  };

  const searchClient = async () => {
    if (!searchValue.trim()) { Swal.fire({ title: "Recherche", text: "Entrez une valeur de recherche", icon: "warning", confirmButtonColor: "#e53935" }); return; }
    setLoading(true);
    try {
      const payload = {};
      if (searchType === "numabo") payload.numabo = searchValue.trim();
      if (searchType === "decodeur") payload.numdecabo = searchValue.trim();
      if (searchType === "telephone") payload.telephone = searchValue.trim();
      if (searchType === "email") payload.email = searchValue.trim();

      const res = await axios.post(apiUrl("/abonne/search"), payload);
      const results = res.data?.abonnes || (res.data?.abonne ? [res.data.abonne] : []);

      if (results.length > 0) {
        saveSearchIdentifier(searchType, searchValue);
        setSearchHistory(loadSearchHistory());
        setSearchResults(results);
        setClient(results.length === 1 ? results[0] : null);
      } else {
        Swal.fire({ title: "Non trouvé", text: "Abonné introuvable", icon: "info", confirmButtonColor: "#e53935" });
        setClient(null); setSearchResults([]);
      }
    } catch (err) {
      Swal.fire({ title: "Erreur", text: err.response?.data?.message || "Erreur lors de la recherche.", icon: "error", confirmButtonColor: "#e53935" });
      setClient(null); setSearchResults([]);
    } finally { setLoading(false); }
  };

  const selectSearchResult = (result) => {
    const bouquet = resolveFormuleName(result?.bouquet || result?.previousFormule || "");
    const prixFormule = getFormulePriceLocal(bouquet);
    setClient(result);
    setStep(2);
    setOperationType("reabonnement");
    setIsUpgradeMode(false);
    setIsAddOptionMode(false);
    setFormule(bouquet);
    setSelectedOptions([]);
    setDuree(1);
    setMontant(prixFormule);
  };

  const resetAll = () => {
    setSearchValue(""); setClient(null); setSearchResults([]);
    setFormule(""); setSelectedOptions([]); setDuree(1); setMontant(0);
    setIsUpgradeMode(false); setIsAddOptionMode(false);
    setOperationType("reabonnement"); setStep(1);
    setSuccessResult(null); setShowSuccess(false);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) { Swal.fire({ title: "Erreur", text: "Utilisateur non connecté", icon: "error", confirmButtonColor: "#e53935" }); return; }

    const numeroContrat = client?.numeroContrat || 1;
    let payload, url;

    if (isUpgradeMode) {
      if (!formule) { Swal.fire({ title: "Formule", text: "Veuillez sélectionner la nouvelle formule", icon: "warning", confirmButtonColor: "#e53935" }); return; }
      payload = {
        numero_abonne: client?.numabo || "",
        formule: mapFormuleLocal(formule),
        formuleActuelle: mapFormuleLocal(currentClientFormule),
        materialNumber: client?.numdecabo,
        numeroContrat: Number(numeroContrat),
        montant,
        options: selectedOptions,
        nomAbonne: client?.name || "",
      };
      url = apiUrl("/reabonnement/upgrade");

    } else if (isAddOptionMode) {
      payload = {
        numero_abonne: client?.numabo || "",
        formule: mapFormuleLocal(currentClientFormule),
        materialNumber: client?.numdecabo,
        numeroContrat: Number(numeroContrat),
        montant,
        options: selectedOptions,
        nomAbonne: client?.name || "",
      };
      url = apiUrl("/reabonnement/upgrade");

    } else {
      if (!formule) { Swal.fire({ title: "Formule", text: "Veuillez sélectionner une formule", icon: "warning", confirmButtonColor: "#e53935" }); return; }
      const tel = formatPhone(client?.manualPhone || client?.telephone || "");
      if (!tel || tel.length !== 14) {
        Swal.fire({ title: "Téléphone", text: "Téléphone invalide. Format attendu: 00237xxxxxxxxx", icon: "warning", confirmButtonColor: "#e53935" }); return;
      }
      payload = {
        numero_abonne: client?.numabo || "",
        formule: mapFormuleLocal(formule),
        duree: Number(duree),
        montant,
        telephoneAbonne: tel,
        materialNumber: client?.numdecabo,
        numeroContrat: Number(numeroContrat),
        options: selectedOptions,
        nomAbonne: client?.name || "",
      };
      url = apiUrl("/reabonnement");
    }

    setLoading(true);
    try {
      const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setSuccessResult(res.data);
        setShowSuccess(true);
      } else {
        Swal.fire({ title: "Erreur", text: res.data.message || res.data.error || "Erreur lors de l'opération", icon: "error", confirmButtonColor: "#e53935" });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        Swal.fire({ title: "Session expirée", text: "Session expirée, veuillez vous reconnecter.", icon: "warning", confirmButtonColor: "#e53935" });
        navigate("/LoginForm");
      } else {
        Swal.fire({ title: "Erreur", text: err.response?.data?.error || err.response?.data?.message || "Erreur lors de l'opération", icon: "error", confirmButtonColor: "#e53935" });
      }
    } finally { setLoading(false); }
  };

  const prixActuelle = getFormulePriceLocal(currentClientFormule);
  const prixNouvelle = getFormulePriceLocal(formule);
  const deltaUpgrade = isUpgradeOnlyFormuleLocal(formule) ? prixNouvelle : Math.max(0, prixNouvelle - prixActuelle);
  const optionsTotal = getOptionsTotalLocal(selectedOptions);

  if (showSuccess) {
    return (
      <div className="w-full max-w-full flex justify-center items-start bg-background px-0 py-0 sm:p-6">
        <div className="bg-card shadow-lg rounded-lg p-4 sm:p-6 w-full max-w-lg border border-border">
          <SuccessScreen result={successResult} operationType={operationType} client={client} onClose={resetAll} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full flex justify-center items-start bg-background px-0 py-0 sm:p-6 overflow-x-hidden">
      <div className="bg-card shadow-lg rounded-lg p-4 sm:p-6 w-full max-w-lg border border-border">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-foreground">Réabonnement Canal+ Cameroun</h2>

        {/* Barre de progression */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">Etape {step} sur 2</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / 2) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${(step / 2) * 100}%` }} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Etape 1 : Rechercher l'abonné</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Chercher par :</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: "numabo", label: "Nº Abonné" }, { id: "decodeur", label: "Nº Décodeur" }, { id: "telephone", label: "Téléphone" }, { id: "email", label: "Email" }].map(({ id, label }) => (
                  <button key={id} onClick={() => { setSearchType(id); setSearchValue(""); }}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition ${searchType === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/50"}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text"
                list={`reabonnement-history-${searchType}`}
                placeholder={{ numabo: "Nº abonné", decodeur: "Nº décodeur", telephone: "Téléphone", email: "Email" }[searchType]}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyPress={e => e.key === "Enter" && searchClient()}
                className="w-full min-w-0 sm:flex-1 p-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <datalist id={`reabonnement-history-${searchType}`}>{(searchHistory[searchType] || []).map((item) => <option key={item} value={item} />)}</datalist>
              <button onClick={searchClient} disabled={loading || !searchValue.trim()}
                className="w-full sm:w-auto sm:flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                {loading ? <Spinner /> : "Chercher"}
              </button>
            </div>
            {loading && <p className="text-primary text-center text-sm">Recherche en cours⬦</p>}
            {searchResults.length > 1 && (
              <div className="bg-card p-4 rounded-lg border border-border">
                <p className="text-sm font-semibold text-foreground mb-3">Choisissez le décodeur :</p>
                <div className="space-y-2">
                  {searchResults.map((r, i) => (
                    <button key={`${r.numabo}-${r.numdecabo}-${i}`} type="button" onClick={() => selectSearchResult(r)}
                      className={`w-full text-left p-3 rounded-lg border transition ${client?.numdecabo === r.numdecabo ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div><p className="font-semibold text-foreground">{r.name}</p><p className="text-sm text-muted-foreground">Nº abonné : {r.numabo}</p></div>
                        <div className="sm:text-right text-sm text-muted-foreground"><p>Décodeur : {r.numdecabo || "-"}</p><p>Status : {r.status}</p></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {client && (
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                <p className="font-semibold text-green-700">Abonné sélectionné</p>
                <p className="text-sm mt-2"><strong>Nom :</strong> {client.name}</p>
                <p className="text-sm"><strong>Nº abonné :</strong> {client.numabo}</p>
                <p className="text-sm"><strong>Nº décodeur :</strong> {client.numdecabo}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button disabled className="flex-1 bg-muted text-muted-foreground py-2 rounded-lg cursor-not-allowed">Précédent</button>
              <button onClick={() => setStep(2)} disabled={!client}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">Suivant</button>
            </div>
          </div>
        )}

        {step === 2 && client && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Etape 2 : Vérifier et valider</h3>
            <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm border border-border">
              <p><strong>Nom :</strong> {client.name}</p>
              <p><strong>Statut :</strong> {String(client.status)}</p>
              <p><strong>Nº abonné :</strong> {client.numabo}</p>
              <p><strong>Nº décodeur :</strong> {client.numdecabo}</p>
              <p><strong>Adresse :</strong> {client.address}</p>
              <p><strong>Téléphone :</strong> {client.telephone || "Non renseigné"}</p>
              <p><strong>Formule actuelle :</strong> {currentClientFormule || "Non renseigné"} {currentClientFormule && `(${prixActuelle.toLocaleString()} FCFA)`}</p>
              <p><strong>Début :</strong> {formatDate(client.debutAbonnement)}</p>
              <p><strong>Fin :</strong> {formatDate(client.finAbonnement)}</p>
              <p><strong>Nº de contrat :</strong> {client.numeroContrat || "1"}</p>
            </div>

            <form onSubmit={handleFinalSubmit} className="bg-card border border-border rounded-lg p-4 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Type d'opération</label>
               <select value={operationType} onChange={e => handleOperationTypeChange(e.target.value)}
        className="w-full p-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
  <option value="reabonnement">Réabonnement</option>
  <option value="upgrade">Upgrade formule / Ajout d'option</option>
</select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {isUpgradeMode ? "Nouvelle formule (upgrade vers)" : "Formule"}
                </label>
                {isAddOptionMode ? (
                  <input type="text" value={currentClientFormule || "Non spécifiée"} disabled
                    className="w-full p-2 border border-input rounded-lg bg-muted/30 text-muted-foreground" />
                ) : (
                  <select value={formule} onChange={e => handleFormuleChange(e.target.value)}
                    className="w-full p-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required>
                    <option value="">-- Sélectionner une formule --</option>
                    {[
                      ...mainOffres,
                      ...(isUpgradeMode ? upgradeOffres : []),
                    ]
                      .filter(o => !isUpgradeMode || o.name !== currentClientFormule)
                      .map(o => (
                        <option key={o.name} value={o.name}>
                          {o.name}  {o.price.toLocaleString()} FCFA/mois
                        </option>
                      ))}
                  </select>
                )}
                {isUpgradeMode && formule && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                    <p>Formule actuelle : <strong>{currentClientFormule}</strong>  {prixActuelle.toLocaleString()} FCFA</p>
                    <p> Nouvelle formule : <strong>{formule}</strong>  {prixNouvelle.toLocaleString()} FCFA</p>
                    <p className="border-t border-blue-200 pt-1"> Complément : {prixNouvelle.toLocaleString()}  {prixActuelle.toLocaleString()} = <strong>{deltaUpgrade.toLocaleString()} FCFA</strong></p>
                    {selectedOptions.length > 0 && (
                      <p className="inline-flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" />
                        Options : +{optionsTotal.toLocaleString()} FCFA
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!isUpgradeMode && !isAddOptionMode && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Durée (mois)</label>
                  <input type="number" min="1" max="12" value={duree} onChange={e => handleDureeChange(e.target.value)} className="w-full p-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}

              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-foreground">Options Canal+ additionnelles</label>
                <button type="button" onClick={() => setOptionsOpen(o => !o)}
                  className="w-full flex justify-between items-center p-3 border border-input rounded-lg bg-background text-left text-foreground hover:border-primary/50">
                  <span>{selectedOptions.length > 0 ? `${selectedOptions.length} option(s) sélectionnée(s)` : "Choisir des options"}</span>
                  <span className="text-sm text-muted-foreground">{optionsOpen ? "" : ""}</span>
                </button>
                {optionsOpen && (
                  <div className="absolute left-0 right-0 mt-2 border border-border rounded-lg bg-card shadow-lg z-20 max-h-64 overflow-y-auto p-3">
                    {optionOffres.map(option => (
                      <label key={option.code} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/30 cursor-pointer">
                        <input type="checkbox" checked={selectedOptions.includes(option.code)} onChange={() => handleOptionToggle(option.code)} className="h-4 w-4 text-primary rounded border-input" />
                        <span className="flex-1 text-sm text-foreground">{option.name}</span>
                        <span className="text-sm text-muted-foreground">+{option.price.toLocaleString()} FCFA/mois</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">Montant à facturer</p>
                <p className="text-2xl font-semibold text-foreground">{montant.toLocaleString()} FCFA</p>
                {isUpgradeMode && formule && (
                  <p className="text-xs text-muted-foreground mt-1">= {deltaUpgrade.toLocaleString()} FCFA (complément upgrade){selectedOptions.length > 0 && ` + ${optionsTotal.toLocaleString()} FCFA options`}</p>
                )}
                {!isUpgradeMode && !isAddOptionMode && formule && (
                  <p className="text-xs text-muted-foreground mt-1">= {getFormulePriceLocal(formule).toLocaleString()} FCFA  {duree} mois{selectedOptions.length > 0 && ` + ${optionsTotal.toLocaleString()} FCFA options`}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-muted text-foreground py-2 rounded-lg hover:bg-muted/80">Précédent</button>
                <button type="submit" disabled={loading || (!formule && !isAddOptionMode)}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading && <Spinner />}
                  {loading ? "Traitement⬦" : isUpgradeMode ? "Valider l'upgrade" : isAddOptionMode ? "Valider l'ajout d'option" : "Valider réabonnement"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

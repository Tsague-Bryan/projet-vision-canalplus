import { useEffect, useState } from "react";
import axios from "axios";
import InvoiceViewer from "../components/InvoiceViewer";
import { apiUrl } from "../lib/api";
import { getToken } from "../lib/session";

const ABONNEMENT_HISTORY_KEY = "vision_abonnement_identifiers_v1";
const loadAbonnementHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ABONNEMENT_HISTORY_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
};
const saveAbonnementHistory = (form) => {
  const current = loadAbonnementHistory();
  const next = { ...current };
  ["nom", "telephone", "decodeur"].forEach((field) => {
    const value = String(form[field] || "").trim();
    if (!value) return;
    next[field] = [value, ...(next[field] || []).filter((item) => item !== value)].slice(0, 20);
  });
  localStorage.setItem(ABONNEMENT_HISTORY_KEY, JSON.stringify(next));
  return next;
};

export default function Abonnements() {
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    decodeur: "",
    formule: "ACDD",
    duree: 1,
    adresse: "",
    ville: "",
    quartier: "",
  });

  const [decodeurs, setDecodeurs] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [invoiceView, setInvoiceView] = useState(null);
  const [history, setHistory] = useState(loadAbonnementHistory);
  const [formules, setFormules] = useState([
    { code: "ACDD", name: "Access", price: 5000 },
    { code: "EVDD", name: "Evasion", price: 10500 },
    { code: "ACPDD", name: "Access+", price: 15000 },
    { code: "EVPDD", name: "Evasion+", price: 20000 },
    { code: "TCADD", name: "Tout Canal+", price: 28000 },
  ]);

  useEffect(() => {
    const fetchDecodeurs = async () => {
      const token = getToken();
      if (!token) {
        setMessage("Utilisateur non connecté");
        return;
      }
      try {
        const res = await axios.get(apiUrl("/decodeurs"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDecodeurs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDecodeurs();
    const fetchFormules = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await axios.get(apiUrl("/formules?includeOptions=0"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFormules((res.data || []).filter(f => f.type === "formule"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchFormules();
  }, []);

  const textOnlyFields = new Set(["nom", "ville", "quartier"]);
  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "telephone") value = value.replace(/\D/g, "").slice(0, 9);
    if (textOnlyFields.has(name)) value = value.replace(/[0-9]/g, "");
    setForm({ ...form, [name]: value });
  };

  const validateForm = () => {
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/.test(form.nom.trim())) return "Nom invalide.";
    if (!/^\d{9}$/.test(form.telephone)) return "Le téléphone doit contenir exactement 9 chiffres.";
    if (!form.decodeur) return "Sélectionnez un décodeur.";
    if (!/^\d+$/.test(String(form.decodeur))) return "Numéro de décodeur invalide.";
    if (Number(form.duree) < 1 || Number(form.duree) > 12) return "La durée doit être comprise entre 1 et 12 mois.";
    if (form.ville && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/.test(form.ville.trim())) return "Ville invalide.";
    if (form.quartier && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/.test(form.quartier.trim())) return "Quartier invalide.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setMessage("Utilisateur non connecté");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        apiUrl("/abonnements"),
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(res.data.message);
      setSuccessResult(res.data);
      setHistory(saveAbonnementHistory(form));
      setForm({ nom: "", telephone: "", decodeur: "", formule: "ACDD", duree: 1, adresse: "", ville: "", quartier: "" });

      const refresh = await axios.get(apiUrl("/decodeurs"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDecodeurs(refresh.data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  if (successResult?.success) {
    const factureUrl = successResult.facture_url || null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card p-6 rounded-lg shadow-md w-full max-w-lg space-y-4 border border-border text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-3xl">✓</div>
          <h2 className="text-xl font-bold text-foreground">Abonnement réussi !</h2>
          {successResult.commission > 0 && (
            <p className="text-sm font-semibold text-green-700">Commission gagnée : +{Number(successResult.commission).toLocaleString()} FCFA</p>
          )}
          {factureUrl ? (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => setInvoiceView({ url: factureUrl, print: false })} className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 font-semibold">
                Voir la facture
              </button>
              <button type="button" onClick={() => setInvoiceView({ url: factureUrl, print: true })} className="w-full bg-muted text-foreground p-3 rounded-lg hover:bg-muted/80 font-semibold">
                Imprimer la facture
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Facture en cours de generation...</p>
          )}
          <button type="button" onClick={() => { setSuccessResult(null); setMessage(""); }} className="w-full border border-border text-muted-foreground p-3 rounded-lg hover:bg-muted/30 font-semibold">
            Nouvel abonnement
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-md w-full max-w-lg space-y-4 border border-border">
        <h2 className="text-xl font-bold text-center text-foreground">Abonnement Décodeur</h2>

        <input
          name="nom"
          list="abonnement-history-nom"
          placeholder="Nom complet"
          value={form.nom}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <datalist id="abonnement-history-nom">{(history.nom || []).map((item) => <option key={item} value={item} />)}</datalist>

        <input
          name="telephone"
          list="abonnement-history-telephone"
          placeholder="Numéro de téléphone"
          value={form.telephone}
          onChange={handleChange}
          inputMode="numeric"
          maxLength={9}
          pattern="[0-9]{9}"
          title="Le numéro doit contenir exactement 9 chiffres"
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <datalist id="abonnement-history-telephone">{(history.telephone || []).map((item) => <option key={item} value={item} />)}</datalist>

        <select
          name="decodeur"
          value={form.decodeur}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">-- Sélectionner un décodeur --</option>
          {decodeurs.map((d) => (
            <option key={d.id} value={d.numero}>
              {d.numero}
            </option>
          ))}
        </select>

        <select
          name="formule"
          value={form.formule}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {formules.map((f) => (
            <option key={f.code} value={f.code}>
              {f.name} — {Number(f.price || 0).toLocaleString()} FCFA
            </option>
          ))}
        </select>

        <input
          name="duree"
          type="number"
          min="1"
          max="12"
          placeholder="Durée en mois"
          value={form.duree}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <input
          name="adresse"
          placeholder="Adresse"
          value={form.adresse}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          name="ville"
          placeholder="Ville"
          value={form.ville}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          name="quartier"
          placeholder="Quartier"
          value={form.quartier}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90">
          {loading ? "Traitement..." : "S'abonner"}
        </button>

        {message && <p className="text-center text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}

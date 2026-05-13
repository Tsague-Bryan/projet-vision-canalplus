import { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl, serverUrl } from "../lib/api";
import { getToken } from "../lib/session";

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
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setMessage("Utilisateur non connecté");
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
    const factureUrl = successResult.facture_url ? serverUrl(successResult.facture_url) : null;
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
              <a href={factureUrl} target="_blank" rel="noreferrer" className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 font-semibold">
                Voir la facture
              </a>
              <button type="button" onClick={() => { const w = window.open(factureUrl, "_blank"); if (w) { w.focus(); setTimeout(() => w.print(), 800); } }} className="w-full bg-muted text-foreground p-3 rounded-lg hover:bg-muted/80 font-semibold">
                Imprimer la facture
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Facture en cours de génération...</p>
          )}
          <button type="button" onClick={() => { setSuccessResult(null); setMessage(""); }} className="w-full border border-border text-muted-foreground p-3 rounded-lg hover:bg-muted/30 font-semibold">
            Nouvel abonnement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-md w-full max-w-lg space-y-4 border border-border">
        <h2 className="text-xl font-bold text-center text-foreground">Abonnement Décodeur</h2>

        <input
          name="nom"
          placeholder="Nom complet"
          value={form.nom}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <input
          name="telephone"
          placeholder="Numéro de téléphone"
          value={form.telephone}
          onChange={handleChange}
          className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

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
          <option value="ACDD">Access — 5 000 FCFA</option>
          <option value="EVDD">Evasion — 10 500 FCFA</option>
          <option value="ACPDD">Access+ — 15 000 FCFA</option>
          <option value="EVPDD">Evasion+ — 20 000 FCFA</option>
          <option value="TCADD">Tout Canal+ — 28 000 FCFA</option>
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

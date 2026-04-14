
import { useEffect, useState } from "react";
import axios from "axios";

export default function Abonnements() {
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    decodeur: "",
    adresse: "",
    ville: "",
    quartier: "",
  });

  const [decodeurs, setDecodeurs] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  // 🔥 Charger les décodeurs du partenaire
  useEffect(() => {
    const fetchDecodeurs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/decodeurs", {
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
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/abonnements",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(res.data.message);

      setForm({ nom: "", telephone: "", decodeur: "", adresse: "", ville: "", quartier: "" });

      // 🔥 refresh decodeurs après utilisation
      const refresh = await axios.get("http://localhost:5000/api/decodeurs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDecodeurs(refresh.data);

    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md w-full max-w-lg space-y-4">

        <h2 className="text-xl font-bold text-center">Abonnement Décodeur</h2>

        <input name="nom" placeholder="Nom complet" value={form.nom} onChange={handleChange} className="w-full p-3 border rounded" />

        <input name="telephone" placeholder="Numéro de téléphone" value={form.telephone} onChange={handleChange} className="w-full p-3 border rounded" />

        {/* 🔥 SELECT DÉCODEUR */}
        <select
          name="decodeur"
          value={form.decodeur}
          onChange={handleChange}
          className="w-full p-3 border rounded"
        >
          <option value="">-- Sélectionner un décodeur --</option>
          {decodeurs.map((d) => (
            <option key={d.id} value={d.numero}>
              {d.numero}
            </option>
          ))}
        </select>

        <input name="adresse" placeholder="Adresse" value={form.adresse} onChange={handleChange} className="w-full p-3 border rounded" />
        <input name="ville" placeholder="Ville" value={form.ville} onChange={handleChange} className="w-full p-3 border rounded" />
        <input name="quartier" placeholder="Quartier" value={form.quartier} onChange={handleChange} className="w-full p-3 border rounded" />

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700">
          {loading ? "Traitement..." : "Réabonner"}
        </button>

        {message && <p className="text-center text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}




   



















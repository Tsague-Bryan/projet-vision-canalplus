import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import telecommandeImg from "../assets/tlc.jpg";
import chargeurImg from "../assets/chargeur.jpg";
import hdmiImg from "../assets/hdmi.jpg";
import lnbImg from "../assets/lnb.jpg";
import cableImg from "../assets/cable.jpg";
import parafoudreImg from "../assets/paraf.jpg";
import KitCanal from "../assets/Kita.png";
import Decodeur from "../assets/Dcd.png";

// ── MODAL COMMANDE KIT CANAL+ ─────────────────────────────────────────────────

const CommandeModal = ({ produit, onClose }) => {
  const [form, setForm]     = useState({ nom: "", telephone: "", ville: "", quantite: "1" });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())       e.nom       = "Champ obligatoire";
    if (!form.telephone.trim()) e.telephone = "Champ obligatoire";
    if (!form.ville.trim())     e.ville     = "Champ obligatoire";
    if (!form.quantite || Number(form.quantite) < 1) e.quantite = "Minimum 1";
    return e;
  };

  const handleCommander = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const msg = encodeURIComponent(
      `🛒 *Commande – ${produit.title}*\n\n` +
      `👤 Nom : ${form.nom}\n` +
      `📞 Téléphone : ${form.telephone}\n` +
      `📍 Ville : ${form.ville}\n` +
      `🔢 Quantité : ${form.quantite}\n` +
      `💰 Prix unitaire : ${produit.price}\n\n` +
      `Je souhaite passer commande, merci de me contacter.`
    );

    const base = produit.whatsapp.split("?")[0];
    window.open(`${base}?text=${msg}`, "_blank");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl px-6 pt-5 pb-10 sm:pb-8"
        style={{ animation: "modalIn .28s cubic-bezier(.4,0,.2,1)" }}
      >
        <style>{`
          @keyframes modalIn {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center gap-3 mb-6">
          <img
            src={produit.image}
            alt={produit.title}
            className="w-14 h-14 object-contain rounded-xl bg-gray-100 border border-gray-200 p-1 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{produit.title}</p>
            <p className="text-sm text-green-600 font-semibold">{produit.price}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Informations de commande
        </p>

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nom complet</label>
            <input
              type="text" name="nom" value={form.nom} onChange={handleChange}
              placeholder="Ex : Jean Dupont"
              className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50
                          focus:outline-none focus:bg-white transition-colors
                          ${errors.nom ? "border-red-400" : "border-gray-200 focus:border-gray-900"}`}
            />
            {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Numéro de téléphone</label>
            <input
              type="tel" name="telephone" value={form.telephone} onChange={handleChange}
              placeholder="Ex : +237 6XX XXX XXX"
              className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50
                          focus:outline-none focus:bg-white transition-colors
                          ${errors.telephone ? "border-red-400" : "border-gray-200 focus:border-gray-900"}`}
            />
            {errors.telephone && <p className="text-xs text-red-500 mt-1">{errors.telephone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ville</label>
              <input
                type="text" name="ville" value={form.ville} onChange={handleChange}
                placeholder="Ex : Douala"
                className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50
                            focus:outline-none focus:bg-white transition-colors
                            ${errors.ville ? "border-red-400" : "border-gray-200 focus:border-gray-900"}`}
              />
              {errors.ville && <p className="text-xs text-red-500 mt-1">{errors.ville}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quantité</label>
              <input
                type="number" name="quantite" value={form.quantite} onChange={handleChange}
                min="1" step="1"
                className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50
                            focus:outline-none focus:bg-white transition-colors
                            ${errors.quantite ? "border-red-400" : "border-gray-200 focus:border-gray-900"}`}
              />
              {errors.quantite && <p className="text-xs text-red-500 mt-1">{errors.quantite}</p>}
            </div>
          </div>
        </div>

        <button
          onClick={handleCommander}
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700
                     active:scale-95 text-white font-semibold py-4 rounded-xl transition-all text-sm shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.845L.057 23.428a.5.5 0 0 0 .515.572l5.76-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.385l-.362-.214-3.755.984.999-3.648-.235-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          Commander via WhatsApp
        </button>
      </div>
    </div>
  );
};

// ── BOUTIQUE ──────────────────────────────────────────────────────────────────

export default function Boutique() {
  const [produitSelectionne, setProduitSelectionne] = useState(null);

  const produits = [
    {
      title: "Télécommande",
      description: "Télécommande Canal+ universelle.",
      price: "2 000 FCFA",
      image: telecommandeImg,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20une%20Télécommande",
      formulaire: false,
    },
    {
      title: "Chargeur",
      description: "Chargeur officiel pour décodeur Canal+.",
      price: "5 000 FCFA",
      image: chargeurImg,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20un%20Chargeur",
      formulaire: false,
    },
    {
      title: "Cordon HDMI",
      description: "Câble HDMI haute qualité pour décodeur.",
      price: "1 000 FCFA",
      image: hdmiImg,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20un%20Cordon%20HDMI",
      formulaire: false,
    },
    {
      title: "Tête LNB",
      description: "Tête LNB pour parabole Canal+.",
      price: "5 000 FCFA",
      image: lnbImg,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20une%20Tête%20LNB",
      formulaire: false,
    },
    {
      title: "Câble",
      description: "Câble coaxial pour installation Canal+.",
      price: "5 000 FCFA",
      image: cableImg,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20un%20Câble",
      formulaire: false,
    },
    {
      title: "Parafoudre",
      description: "Protection électrique pour décodeur Canal+.",
      price: "3 000 FCFA",
      image: parafoudreImg,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20un%20Parafoudre",
      formulaire: false,
    },
    {
      title: "Kit Canal+",
      description: "Kit complet d'installation Canal+.",
      price: "3 000 FCFA",
      image: KitCanal,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20un%20Kit%20Canal%2B",
      formulaire: true, // ← formulaire uniquement pour ce produit
    },
    {
      title: "Décodeur Canal+",
      description: "Decodeur HD.",
      price: "3 000 FCFA",
      image: Decodeur,
      whatsapp: "https://wa.me/237656253864?text=Je%20veux%20acheter%20un%20Kit%20Canal%2B",
    },
  ];

  const handleAchat = (produit) => {
    if (produit.formulaire) {
      setProduitSelectionne(produit); // ouvre le modal
    } else {
      window.open(produit.whatsapp, "_blank"); // redirection directe
    }
  };

  return (
    <>

      <div className="bg-gray-100 min-h-screen pt-16 px-6 pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Boutique Canal+
        </h1>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {produits.map((produit, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-2"
            >
              <img
                src={produit.image}
                alt={produit.title}
                className="w-full h-36 object-contain bg-gray-100"
              />
              <div className="p-6 text-center">
                <h2 className="text-xl font-semibold mb-2 text-gray-900">{produit.title}</h2>
                <p className="text-gray-600 text-sm">{produit.description}</p>
                <p className="text-lg font-bold text-gray-900 mt-2">{produit.price}</p>

                <button
                  onClick={() => handleAchat(produit)}
                  className="mt-4 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600
                             active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-semibold
                             transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.845L.057 23.428a.5.5 0 0 0 .515.572l5.76-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.956 9.956 0 0 1-5.073-1.385l-.362-.214-3.755.984.999-3.648-.235-.374A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                  </svg>
                  Achat via WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>

        <Footer />
      </div>

      {/* Modal — uniquement Kit Canal+ */}
      {produitSelectionne && (
        <CommandeModal
          produit={produitSelectionne}
          onClose={() => setProduitSelectionne(null)}
        />
      )}
    </>
  );
}
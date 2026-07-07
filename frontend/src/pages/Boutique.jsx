import { useState } from "react";
import { Banknote, MessageCircle } from "lucide-react";
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
      `Prix unitaire : ${produit.price}\n\n` +
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
        className="bg-card w-full sm:max-w-md sm:rounded-lg rounded-t-3xl px-6 pt-5 pb-10 sm:pb-8 border border-border"
        style={{ animation: "modalIn .28s cubic-bezier(.4,0,.2,1)" }}
      >
        <style>{`
          @keyframes modalIn {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center gap-3 mb-6">
          <img
            src={produit.image}
            alt={produit.title}
            className="w-14 h-14 object-contain rounded-lg bg-muted border border-border p-1 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">{produit.title}</p>
            <p className="text-sm text-green-600 font-semibold">{produit.price}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Informations de commande
        </p>

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nom complet</label>
            <input
              type="text" name="nom" value={form.nom} onChange={handleChange}
              placeholder="Ex : Jean Dupont"
              className={`w-full border rounded-lg px-4 py-3 text-sm text-foreground bg-background
                          focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring transition-colors
                          ${errors.nom ? "border-destructive" : "border-input focus:border-ring"}`}
            />
            {errors.nom && <p className="text-xs text-destructive mt-1">{errors.nom}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Numéro de téléphone</label>
            <input
              type="tel" name="telephone" value={form.telephone} onChange={handleChange}
              placeholder="Ex : +237 6XX XXX XXX"
              className={`w-full border rounded-lg px-4 py-3 text-sm text-foreground bg-background
                          focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring transition-colors
                          ${errors.telephone ? "border-destructive" : "border-input focus:border-ring"}`}
            />
            {errors.telephone && <p className="text-xs text-destructive mt-1">{errors.telephone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Ville</label>
              <input
                type="text" name="ville" value={form.ville} onChange={handleChange}
                placeholder="Ex : Douala"
                className={`w-full border rounded-lg px-4 py-3 text-sm text-foreground bg-background
                            focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring transition-colors
                            ${errors.ville ? "border-destructive" : "border-input focus:border-ring"}`}
              />
              {errors.ville && <p className="text-xs text-destructive mt-1">{errors.ville}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Quantité</label>
              <input
                type="number" name="quantite" value={form.quantite} onChange={handleChange}
                min="1" step="1"
                className={`w-full border rounded-lg px-4 py-3 text-sm text-foreground bg-background
                            focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring transition-colors
                            ${errors.quantite ? "border-destructive" : "border-input focus:border-ring"}`}
              />
              {errors.quantite && <p className="text-xs text-destructive mt-1">{errors.quantite}</p>}
            </div>
          </div>
        </div>

        <button
          onClick={handleCommander}
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground
                     active:scale-95 font-semibold py-4 rounded-lg transition-all text-sm shadow-sm hover:bg-primary/90"
        >
          <MessageCircle className="h-4 w-4" />
          Commander via WhatsApp
        </button>
      </div>
    </div>
  );
};

export default function Boutique() {
  const [produitSelectionne, setProduitSelectionne] = useState(null);

  const produits = [
    {
      title: "Télécommande",
      description: "Télécommande Canal+ universelle.",
      price: "2 000 FCFA",
      image: telecommandeImg,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20une%20Télécommande",
      formulaire: false,
    },
    {
      title: "Chargeur",
      description: "Chargeur officiel pour décodeur Canal+.",
      price: "5 000 FCFA",
      image: chargeurImg,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20un%20Chargeur",
      formulaire: false,
    },
    {
      title: "Cordon HDMI",
      description: "Câble HDMI haute qualité pour décodeur.",
      price: "1 000 FCFA",
      image: hdmiImg,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20un%20Cordon%20HDMI",
      formulaire: false,
    },
    {
      title: "Tête LNB",
      description: "Tête LNB pour parabole Canal+.",
      price: "5 000 FCFA",
      image: lnbImg,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20une%20Tête%20LNB",
      formulaire: false,
    },
    {
      title: "Câble",
      description: "Câble coaxial pour installation Canal+.",
      price: "5 000 FCFA",
      image: cableImg,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20un%20Câble",
      formulaire: false,
    },
    {
      title: "Parafoudre",
      description: "Protection électrique pour décodeur Canal+.",
      price: "3 000 FCFA",
      image: parafoudreImg,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20un%20Parafoudre",
      formulaire: false,
    },
    {
      title: "Kit Canal+",
      description: "Kit complet d'installation Canal+.",
      price: "3 000 FCFA",
      image: KitCanal,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20un%20Kit%20Canal%2B",
      formulaire: true,
    },
    {
      title: "Décodeur Canal+",
      description: "Decodeur HD.",
      price: "3 000 FCFA",
      image: Decodeur,
      whatsapp: "https://wa.me/237695225823?text=Je%20veux%20acheter%20un%20Kit%20Canal%2B",
      formulaire: false,
    },
  ];

  const handleAchat = (produit) => {
    if (produit.formulaire) {
      setProduitSelectionne(produit);
    } else {
      window.open(produit.whatsapp, "_blank");
    }
  };

  return (
    <>
   
      <div className="bg-background min-h-screen pt-16 px-6 pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <h1 className="text-4xl font-bold text-center text-foreground mb-12">
          Boutique Canal+
        </h1>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {produits.map((produit, index) => (
            <div
              key={index}
              className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-2 border border-border"
            >
              <img
                src={produit.image}
                alt={produit.title}
                className="w-full h-36 object-contain bg-muted"
              />
              <div className="p-6 text-center">
                <h2 className="text-xl font-semibold mb-2 text-foreground">{produit.title}</h2>
                <p className="text-muted-foreground text-sm">{produit.description}</p>
                <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-lg font-bold text-foreground">
                  <Banknote className="h-5 w-5 text-primary" />
                  {produit.price}
                </p>

                <button
                  onClick={() => handleAchat(produit)}
                  className="mt-4 inline-flex items-center gap-2 bg-primary hover:bg-primary/90
                             active:scale-95 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold
                             transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  Achat via WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>

       
      </div>

      {produitSelectionne && (
        <CommandeModal
          produit={produitSelectionne}
          onClose={() => setProduitSelectionne(null)}
        />
      )}
    </>
  );
}

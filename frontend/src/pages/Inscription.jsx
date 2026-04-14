import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ pour redirection
import logo from "../assets/logo.png";

export default function InscriptionPartenaire() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prenom: "",
    structure: "",
    pays: "",
    ville: "",
    quartier: "",
    telephone: "",
    password: "",
    email: "",   
    codePromo: ""    
  });

  const [envoye, setEnvoye] = useState(false);
  const navigate = useNavigate(); // ✅ hook pour naviguer

  const champsObligatoires = [
    "name", "prenom", "structure", "pays",
    "ville", "quartier", "telephone", "password"
  ];
  const champsRemplis = champsObligatoires.filter(
    (champ) => formData[champ].trim() !== ""
  ).length;

  const progression = Math.round(
    (champsRemplis / champsObligatoires.length) * 100
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:5000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      // ✅ si le backend renvoie une erreur
      const text = await response.text();
      throw new Error(text || "Erreur serveur");
    }

    const data = await response.json(); // ✅ seulement si c’est du JSON
    alert(data.message);
    setEnvoye(true);

    
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    alert("Échec de l'inscription : " + error.message);
  }
};


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">

        {/* Titre */}
        <img src={logo} alt="Logo Canal Vision" className="mx-auto mb-4 h-16" />
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Inscription Partenaire — Canal Visionplus
        </h1>

        {/* ---- BARRE DE PROGRESSION ---- */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progression</span>
            <span>{progression}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progression}%` }}
            />
          </div>
        </div>

        {/* ---- MESSAGE DE SUCCÈS (affiché après envoi) ---- */}
        {envoye && (
          <div className="bg-green-100 border border-green-400 text-green-700 rounded-lg p-4 mb-6 text-center">
            Vos informations ont bien été enregistrées !
          </div>
        )}

        {/* ---- LE FORMULAIRE ---- */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Dupont"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              required
              placeholder="Ex: Jean"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Nom de la structure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la structure <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="structure"
              value={formData.structure}
              onChange={handleChange}
              required
              placeholder="Ex: Agence Vision Pro"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pays + Ville sur la même ligne */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pays"
                value={formData.pays}
                onChange={handleChange}
                required
                placeholder="Ex: Cameroun"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                placeholder="Ex: Douala"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quartier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quartier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="quartier"
              value={formData.quartier}
              onChange={handleChange}
              required
              placeholder="Ex: Akwa"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              required
              placeholder="Ex: +237 6XX XXX XXX"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mot de passe */}
         <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Mot de passe <span className="text-red-500">*</span>
  </label>
  <div className="flex items-center">
    <input
      type={showPassword ? "text" : "password"}   // <-- bascule entre visible et masqué
      name="password"
      value={formData.password}
      onChange={handleChange}
      required
      placeholder="Minimum 8 caractères"
      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)} // <-- change l’état
      className="ml-2 text-sm text-blue-600 hover:underline"
    >
      {showPassword ? "Masquer" : "Afficher"}
    </button>
  </div>
           
          </div>

          {/* Email (facultatif) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse e-mail{" "}
              <span className="text-gray-400 text-xs">(facultatif)</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ex: jean@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
{/* Code promo (facultatif) */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Code promo <span className="text-gray-400 text-xs">(facultatif)</span>
  </label>
  <input
    type="text"
    name="codePromo"
    value={formData.codePromo}
    onChange={handleChange}
    placeholder="Ex: CANAL2026"
    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
          {/* Bouton Envoyer */}
          <button
            type="submit"
            disabled={progression < 100}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${progression === 100
                ? "bg-gray-600 hover:bg-blue-700 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
              }`}
          >
            {progression === 100 ? "Envoyer" : `Complétez le formulaire (${progression}%)`}
          </button>

        </form>

        {/* Légende champs obligatoires */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          <span className="text-red-500">*</span> Champs obligatoires
        </p>

      </div>
    </div>
  );
}
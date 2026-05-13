import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { serverUrl } from "../lib/api";

const initialFormData = {
  name: "",
  prenom: "",
  structure: "",
  pays: "",
  ville: "",
  quartier: "",
  telephone: "",
  password: "",
  email: "",
  codePromo: "",
};

export default function InscriptionPartenaire() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [envoye, setEnvoye] = useState(false);
  const navigate = useNavigate();

  const champsObligatoires = [
    "name",
    "prenom",
    "structure",
    "pays",
    "ville",
    "quartier",
    "telephone",
    "password",
  ];

  const champsRemplis = champsObligatoires.filter(
    (champ) => formData[champ].trim() !== ""
  ).length;

  const progression = Math.round(
    (champsRemplis / champsObligatoires.length) * 100
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(serverUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(async () => ({
        message: await response.text(),
      }));

      if (!response.ok) {
        throw new Error(data.message || data.error || "Erreur serveur");
      }

      setFormData(initialFormData);
      setEnvoye(true);
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);
      alert("Echec de l'inscription : " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (envoye) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-lg p-8 w-full max-w-xl border border-border text-center">
          <img src={logo} alt="Vision Canal+" className="mx-auto mb-5 h-16" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Inscription recue
          </h1>
          <p className="text-muted-foreground leading-7 mb-6">
            Merci de votre inscription, elle a bien ete prise en charge. Veuillez
            patienter pendant sa validation, qui peut prendre 30 minutes a 1
            heure. Vous pouvez ensuite retourner vers le login pour tenter de
            vous connecter et voir si votre inscription a deja ete approuvee.
            Dans le cas contraire, patientez encore quelques instants.
          </p>
          <button
            type="button"
            onClick={() => navigate("/LoginForm")}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Aller au login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg p-8 w-full max-w-lg border border-border">
        <img src={logo} alt="Vision Canal+" className="mx-auto mb-4 h-16" />
        <h1 className="text-2xl font-bold text-center text-foreground mb-6">
          Inscription Partenaire - Vision Canal+
        </h1>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Progression</span>
            <span>{progression}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${progression}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nom <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Dupont"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Prenom <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              required
              placeholder="Ex: Jean"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nom de la structure <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="structure"
              value={formData.structure}
              onChange={handleChange}
              required
              placeholder="Ex: Agence Vision Pro"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Pays <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="pays"
                value={formData.pays}
                onChange={handleChange}
                required
                placeholder="Ex: Cameroun"
                className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Ville <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                placeholder="Ex: Douala"
                className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Quartier <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="quartier"
              value={formData.quartier}
              onChange={handleChange}
              required
              placeholder="Ex: Akwa"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Numero de telephone <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              required
              placeholder="Ex: +237 6XX XXX XXX"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Mot de passe <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Minimum 8 caracteres"
                className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-sm text-primary hover:underline"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Adresse e-mail{" "}
              <span className="text-muted-foreground text-xs">(facultatif)</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ex: jean@example.com"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Code promo{" "}
              <span className="text-muted-foreground text-xs">(facultatif)</span>
            </label>
            <input
              type="text"
              name="codePromo"
              value={formData.codePromo}
              onChange={handleChange}
              placeholder="Ex: CANAL2026"
              className="w-full border border-input rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={progression < 100 || submitting}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
              progression === 100 && !submitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                : "bg-muted cursor-not-allowed text-muted-foreground"
            }`}
          >
            {submitting
              ? "Envoi en cours..."
              : progression === 100
                ? "Envoyer"
                : `Completez le formulaire (${progression}%)`}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          <span className="text-destructive">*</span> Champs obligatoires
        </p>
      </div>
    </div>
  );
}

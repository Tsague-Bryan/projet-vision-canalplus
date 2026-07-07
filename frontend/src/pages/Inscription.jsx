import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Globe2,
  Home,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Send,
  Ticket,
  User,
  UserPlus,
} from "lucide-react";
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

const inputClass =
  "min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400";

const Field = ({ icon, label, required, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    <div className="flex items-center gap-3 border-l-4 border-l-slate-950 bg-white px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 transition focus-within:ring-2 focus-within:ring-slate-950">
      {icon}
      {children}
    </div>
  </label>
);

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
  const passwordIsValid = formData.password.length >= 8;
  const phoneIsValid = /^\d{9}$/.test(formData.telephone);
  const alphaFields = new Set(["name", "prenom", "pays", "ville", "quartier"]);
  const alphaPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/;
  const alphaFieldsAreValid = [...alphaFields].every((field) => alphaPattern.test(formData[field].trim()));
  const formIsReady = progression === 100 && passwordIsValid && phoneIsValid && alphaFieldsAreValid;

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;
    if (name === "telephone") value = value.replace(/\D/g, "").slice(0, 9);
    if (alphaFields.has(name)) value = value.replace(/[0-9]/g, "");
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phoneIsValid) {
      Swal.fire({ title: "Validation", text: "Le numéro de téléphone doit contenir exactement 9 chiffres.", icon: "warning", confirmButtonColor: "#e53935" });
      return;
    }
    if (!alphaFieldsAreValid) {
      Swal.fire({ title: "Validation", text: "Nom, prénom, pays, ville et quartier ne doivent pas contenir de chiffres.", icon: "warning", confirmButtonColor: "#e53935" });
      return;
    }
    if (!passwordIsValid) {
      Swal.fire({ title: "Validation", text: "Le mot de passe doit contenir au moins 8 caractères.", icon: "warning", confirmButtonColor: "#e53935" });
      return;
    }
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
      Swal.fire({ title: "Erreur", text: "Échec de l'inscription : " + error.message, icon: "error", confirmButtonColor: "#e53935" });
    } finally {
      setSubmitting(false);
    }
  };

  if (envoye) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] p-4">
        <div className="absolute -left-12 -top-10 h-40 w-40 rounded-full bg-slate-950/95" />
        <div className="absolute -right-10 bottom-8 h-32 w-32 rounded-full bg-slate-800/90" />
        <div className="relative z-10 w-full max-w-xl rounded-[1.4rem] bg-white p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.15)]">
          <img src={logo} alt="Vision Canal+" className="mx-auto mb-5 h-16" />
          <h1 className="mb-4 text-2xl font-extrabold text-slate-800">
            Inscription recue
          </h1>
          <p className="mb-6 leading-7 text-slate-600">
            Merci de votre inscription, elle a bien ete prise en charge. Veuillez
            patienter pendant sa validation, qui peut prendre 30 minutes a 1
            heure. Vous pouvez ensuite retourner vers le login pour tenter de
            vous connecter et voir si votre inscription a deja ete approuvee.
            Dans le cas contraire, patientez encore quelques instants.
          </p>
          <button
            type="button"
            onClick={() => navigate("/LoginForm")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[3px] bg-slate-950 px-6 py-3 text-sm font-extrabold text-white shadow-[0_14px_24px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_32px_rgba(15,23,42,0.30)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Aller au login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute -left-16 top-12 h-36 w-36 rounded-full bg-slate-950" />
      <div className="pointer-events-none absolute left-7 top-28 h-8 w-8 rounded-md bg-rose-900/15" />
      <div className="pointer-events-none absolute -right-11 bottom-10 h-32 w-32 rounded-full bg-slate-800" />

      <main className="relative z-10 mx-auto grid w-full max-w-[1080px] overflow-hidden rounded-[1.4rem] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.15)] lg:grid-cols-[0.86fr_1.14fr]">
        <section className="relative hidden min-h-[650px] items-center justify-center overflow-hidden bg-slate-950 p-10 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.10),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_72%_78%,rgba(0,29,92,0.30),transparent_34%)]" />
          <div className="absolute -right-16 -top-14 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -left-20 top-40 h-44 w-44 rounded-full bg-black/25" />
          <div className="absolute -bottom-20 left-24 h-56 w-56 rounded-full bg-black/30" />

          <button
            type="button"
            onClick={() => navigate("/LoginForm")}
            className="absolute left-8 top-8 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
            aria-label="Retour au login"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="relative z-10 max-w-sm text-center">
            <img src={logo} alt="Vision Canal+" className="mx-auto mb-7 h-20 w-auto rounded-xl bg-white/95 p-2 shadow-xl" />
            <p className="mb-3 text-2xl font-extrabold uppercase tracking-wide">Join us!</p>
            <p className="mx-auto mb-8 max-w-xs text-sm font-semibold leading-relaxed text-white/90">
              Creez votre espace partenaire et commencez votre parcours avec Vision Canal+
            </p>
            <button
              type="button"
              onClick={() => navigate("/LoginForm")}
              className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-white bg-white px-8 py-4 text-xs font-extrabold uppercase text-slate-950 shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white hover:shadow-[0_18px_34px_rgba(0,0,0,0.35)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Login
            </button>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => navigate("/LoginForm")}
            className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 lg:hidden"
            aria-label="Retour au login"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="mb-7 text-center">
            <img src={logo} alt="Vision Canal+" className="mx-auto mb-3 h-14 w-auto" />
            <h1 className="text-2xl font-extrabold text-slate-800">
              Inscription partenaire
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Completez les informations pour demander votre acces
            </p>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Progression</span>
              <span>{progression}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-950 transition-all duration-500"
                style={{ width: `${progression}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field icon={<User className="h-5 w-5 shrink-0 text-slate-500" />} label="Nom" required>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ex: Dupont"
                className={inputClass}
              />
            </Field>

            <Field icon={<UserPlus className="h-5 w-5 shrink-0 text-slate-500" />} label="Prenom" required>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                required
                placeholder="Ex: Jean"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field icon={<Building2 className="h-5 w-5 shrink-0 text-slate-500" />} label="Nom de la structure" required>
                <input
                  type="text"
                  name="structure"
                  value={formData.structure}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Agence Vision Pro"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field icon={<Globe2 className="h-5 w-5 shrink-0 text-slate-500" />} label="Pays" required>
              <input
                type="text"
                name="pays"
                value={formData.pays}
                onChange={handleChange}
                required
                placeholder="Ex: Cameroun"
                className={inputClass}
              />
            </Field>

            <Field icon={<MapPin className="h-5 w-5 shrink-0 text-slate-500" />} label="Ville" required>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                placeholder="Ex: Douala"
                className={inputClass}
              />
            </Field>

            <Field icon={<Home className="h-5 w-5 shrink-0 text-slate-500" />} label="Quartier" required>
              <input
                type="text"
                name="quartier"
                value={formData.quartier}
                onChange={handleChange}
                required
                placeholder="Ex: Akwa"
                className={inputClass}
              />
            </Field>

            <Field icon={<Phone className="h-5 w-5 shrink-0 text-slate-500" />} label="Numéro de téléphone" required>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                required
                placeholder="Ex: 699123456"
                inputMode="numeric"
                maxLength={9}
                pattern="[0-9]{9}"
                title="Le numéro doit contenir exactement 9 chiffres"
                className={inputClass}
              />
            </Field>
            {formData.telephone && !phoneIsValid && (
              <p className="-mt-2 text-xs font-semibold text-red-600 sm:col-span-2">
                Le numéro doit contenir exactement 9 chiffres.
              </p>
            )}

            <div className="sm:col-span-2">
              <Field icon={<LockKeyhole className="h-5 w-5 shrink-0 text-slate-500" />} label="Mot de passe" required>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="Minimum 8 caractères"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-slate-400 transition hover:text-slate-700"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              </Field>
              {formData.password && !passwordIsValid && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Le mot de passe doit contenir au moins 8 caractères.
                </p>
              )}
            </div>

            <Field icon={<Mail className="h-5 w-5 shrink-0 text-slate-500" />} label="Adresse e-mail">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ex: jean@example.com"
                className={inputClass}
              />
            </Field>

            <Field icon={<Ticket className="h-5 w-5 shrink-0 text-slate-500" />} label="Code promo">
              <input
                type="text"
                name="codePromo"
                value={formData.codePromo}
                onChange={handleChange}
                placeholder="Ex: CANAL2026"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!formIsReady || submitting}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-[3px] px-7 py-3 text-xs font-extrabold uppercase tracking-wide shadow-[0_14px_24px_rgba(15,23,42,0.22)] transition ${
                  formIsReady && !submitting
                    ? "bg-slate-950 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_32px_rgba(15,23,42,0.30)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                    : "cursor-not-allowed bg-slate-100 text-slate-400 shadow-none"
                }`}
              >
                <Send className="h-4 w-4" />
                {submitting
                  ? "Envoi en cours..."
                  : !passwordIsValid && progression === 100
                    ? "Mot de passe trop court"
                    : formIsReady
                      ? "Envoyer"
                      : `Completez le formulaire (${progression}%)`}
              </button>
              <p className="mt-4 text-center text-xs text-slate-500">
                <span className="text-red-500">*</span> Champs obligatoires
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

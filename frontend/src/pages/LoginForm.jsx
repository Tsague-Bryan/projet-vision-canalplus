import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { serverUrl } from "../lib/api";
import { saveSession } from "../lib/session";

// ── Icônes œil ────────────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const Spinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
    <path d="M12 2a10 10 0 0 1 10 10"/>
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT FORGOT PASSWORD (3 étapes)
// ══════════════════════════════════════════════════════════════════════════════
function ForgotPassword({ onBack }) {
  const [step,        setStep]        = useState(1);
  const [identifier,  setIdentifier]  = useState("");
  const [code,        setCode]        = useState("");
  const [resetToken,  setResetToken]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Étape 1 : demander le code
  const requestCode = async () => {
    if (!identifier.trim()) { setError("Entrez votre email ou téléphone"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(serverUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data.dev_code) setError(`[DEV] Code : ${data.dev_code}`);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Étape 2 : vérifier le code
  const verifyCode = async () => {
    if (code.length !== 6) { setError("Le code doit contenir 6 chiffres"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(serverUrl("/auth/verify-reset-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code invalide");
      setResetToken(data.reset_token);
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // Étape 3 : nouveau mot de passe
  const resetPassword = async () => {
    if (newPwd.length < 6)       { setError("Mot de passe trop court (min 6 caractères)"); return; }
    if (newPwd !== confirmPwd)   { setError("Les mots de passe ne correspondent pas");     return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(serverUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, nouveau_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setSuccess("Mot de passe réinitialisé avec succès ! Redirection…");
      setTimeout(() => onBack(), 2500);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const stepTitles = ["", "Récupération du compte", "Vérification du code", "Nouveau mot de passe"];

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button
          onClick={step === 1 ? onBack : () => { setStep(s => s - 1); setError(""); }}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Étape {step}/3</p>
          <h2 className="text-base font-bold text-foreground">{stepTitles[step]}</h2>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all duration-500"
             style={{ width: `${(step / 3) * 100}%` }}/>
      </div>

      {/* Succès global */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold text-sm">✅ {success}</p>
        </div>
      )}

      {/* ── Étape 1 : saisie identifiant ── */}
      {step === 1 && !success && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Entrez votre email ou numéro de téléphone enregistré. Vous recevrez un code de vérification.
          </p>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Email ou téléphone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError(""); }}
              placeholder="Ex: exemple@mail.com ou 656253864"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
          </div>
          {error && (
            <p className={`text-xs px-3 py-2 rounded-lg border ${
              error.includes("[DEV]")
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}>{error}</p>
          )}
          <button onClick={requestCode} disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60 hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors">
            {loading && <Spinner/>}
            {loading ? "Envoi en cours…" : "Recevoir le code"}
          </button>
        </div>
      )}

      {/* ── Étape 2 : saisie du code ── */}
      {step === 2 && !success && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Un code à 6 chiffres a été envoyé à <strong>{identifier}</strong>. Saisissez-le ci-dessous.
          </p>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Code de vérification
            </label>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm text-center tracking-[0.6em] text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-ring"/>
          </div>
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg border bg-destructive/10 border-destructive/20 text-destructive">{error}</p>
          )}
          <button onClick={verifyCode} disabled={loading || code.length !== 6}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60 hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors">
            {loading && <Spinner/>}
            {loading ? "Vérification…" : "Vérifier le code"}
          </button>
          <button onClick={requestCode} disabled={loading}
                  className="text-xs text-primary hover:underline text-center disabled:opacity-50 transition-colors">
            Renvoyer le code
          </button>
        </div>
      )}

      {/* ── Étape 3 : nouveau mot de passe ── */}
      {step === 3 && !success && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Choisissez votre nouveau mot de passe (minimum 6 caractères).</p>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setError(""); }}
                placeholder="Minimum 6 caractères"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
              <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPwd ? <EyeOpen/> : <EyeOff/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setError(""); }}
                placeholder="Répétez le mot de passe"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"/>
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOpen/> : <EyeOff/>}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg border bg-destructive/10 border-destructive/20 text-destructive">{error}</p>
          )}
          <button onClick={resetPassword} disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60 hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors">
            {loading && <Spinner/>}
            {loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function LoginForm() {
  const [contact,       setContact]      = useState("");
  const [password,      setPassword]     = useState("");
  const [errors,        setErrors]       = useState({});
  const [showPassword,  setShowPassword] = useState(false);
  const [loadingLogin,  setLoadingLogin] = useState(false);
  const [loadingMessage,setLoadingMessage] = useState("");
  const [showForgot,    setShowForgot]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!contact.trim()) nextErrors.contact  = true;
    if (!password)       nextErrors.password = true;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setLoadingLogin(true);
      setLoadingMessage("Connexion à Vision Canal+...");
      const response = await fetch(serverUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token) {
        setLoadingLogin(false);
        alert(data.message || data.error || "Connexion impossible");
        return;
      }

      saveSession({ token: data.token, user: { role: data.role } });
      setLoadingMessage("Préparation de votre espace...");
      await new Promise(resolve => setTimeout(resolve, 900));

      if      (data.role === "partner") navigate("/partner/dashboard");
      else if (data.role === "admin")   navigate("/admin/dashboard");
      else { setLoadingLogin(false); alert("Rôle utilisateur inconnu"); }
    } catch (error) {
      console.error("Erreur connexion :", error);
      setLoadingLogin(false);
      alert("Impossible de se connecter au serveur. Vérifiez que le backend est lancé.");
    }
  };

  // ── Affichage page Forgot Password ────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="bg-card w-full max-w-md rounded-2xl p-8 border border-border shadow-2xl">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Vision Canal+" className="h-16 w-auto"/>
          </div>
          <ForgotPassword onBack={() => setShowForgot(false)}/>
        </div>
      </div>
    );
  }

  // ── Affichage formulaire de connexion ─────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">

      {/* Overlay chargement */}
      {loadingLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="h-24 w-24 rounded-3xl bg-card border border-border shadow-xl flex items-center justify-center"
                 style={{ animation:"visionLogoPulse 1.2s ease-in-out infinite" }}>
              <img src={logo} alt="Vision Canal+" className="h-16 w-16 object-contain"/>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">Vision Canal+</p>
              <p className="text-sm text-muted-foreground mt-1">{loadingMessage || "Chargement..."}</p>
            </div>
            <div className="w-56 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-24 rounded-full bg-primary"
                   style={{ animation:"visionProgress 1.1s ease-in-out infinite" }}/>
            </div>
          </div>
        </div>
      )}

      <form className="bg-card p-8 sm:p-10 rounded-lg shadow-2xl w-full max-w-md border border-border"
            onSubmit={handleSubmit}>

        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-20 w-auto"/>
        </div>
        <h2 className="text-2xl font-bold text-center text-primary mb-2">Vision Canal+</h2>
        <p className="text-center text-muted-foreground mb-6">Connectez-vous pour continuer</p>

        {/* Champ Contact */}
        <input
          type="text"
          placeholder="Email ou téléphone"
          value={contact}
          onChange={e => setContact(e.target.value)}
          className={`w-full mb-4 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground ${errors.contact ? "border-destructive" : "border-input"}`}
        />

        {/* Champ Mot de passe avec icône œil */}
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground ${errors.password ? "border-destructive" : "border-input"}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showPassword ? <EyeOpen/> : <EyeOff/>}
          </button>
        </div>

        {/* Lien mot de passe oublié */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-xs text-primary hover:underline transition-colors">
            Mot de passe oublié ?
          </button>
        </div>

        {/* Bouton connexion */}
        <button
          type="submit"
          disabled={loadingLogin}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg hover:bg-primary/90 transition-colors duration-200 mb-4 font-semibold disabled:opacity-60">
          {loadingLogin ? "Connexion..." : "Se connecter"}
        </button>

        {/* Lien inscription */}
        <p className="text-center text-muted-foreground text-sm">
          Vous n'avez pas encore de compte ?{" "}
          <button type="button" onClick={() => navigate("/inscription")}
                  className="text-primary font-semibold hover:underline">
            S'inscrire
          </button>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;

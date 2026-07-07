import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { LockKeyhole, LogIn, Mail, UserPlus } from "lucide-react";
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
          <p className="text-green-700 font-semibold text-sm"> {success}</p>
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
        Swal.fire({ title: "Erreur de connexion", text: data.message || data.error || "Connexion impossible", icon: "error", confirmButtonColor: "#e53935" });
        return;
      }

      saveSession({ token: data.token, user: { role: data.role } });
      setLoadingMessage("Préparation de votre espace...");
      await new Promise(resolve => setTimeout(resolve, 900));

      if      (data.role === "partner") navigate("/partner/dashboard", { replace: true });
      else if (data.role === "admin")   navigate("/admin/dashboard", { replace: true });
      else { setLoadingLogin(false); Swal.fire({ title: "Erreur", text: "Rôle utilisateur inconnu", icon: "error", confirmButtonColor: "#e53935" }); }
    } catch (error) {
      console.error("Erreur connexion :", error);
      setLoadingLogin(false);
      Swal.fire({ title: "Erreur réseau", text: "Veuillez vérifier votre connexion et réessayer", icon: "error", confirmButtonColor: "#e53935" });
    }
  };

  // ── Affichage page Forgot Password ────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-4 py-10">
        <div className="absolute -left-12 -top-10 h-40 w-40 rounded-full bg-slate-950/95" />
        <div className="absolute -right-10 bottom-8 h-32 w-32 rounded-full bg-slate-800/90" />
        <div className="absolute left-10 bottom-16 h-8 w-8 rounded-md bg-rose-900/15" />
        <div className="relative z-10 w-full max-w-md rounded-[1.5rem] bg-white p-8 shadow-[0_22px_70px_rgba(15,23,42,0.16)]">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Vision Canal+" className="h-16 w-auto"/>
          </div>
          <ForgotPassword onBack={() => setShowForgot(false)}/>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center">

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

      <div className="pointer-events-none absolute -left-16 top-12 h-36 w-36 rounded-full bg-slate-950" />
      <div className="pointer-events-none absolute left-7 top-28 h-8 w-8 rounded-md bg-rose-900/15" />
      <div className="pointer-events-none absolute -right-11 bottom-10 h-32 w-32 rounded-full bg-slate-800" />

      <main className="relative z-10 mx-auto grid w-full max-w-[980px] overflow-hidden rounded-[1.4rem] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.15)] lg:min-h-[560px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:py-12">
          <form
            className="w-full max-w-[370px] rounded-xl bg-white px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.18)] sm:px-8"
            onSubmit={handleSubmit}
          >
            <div className="mb-7 flex flex-col items-center text-center">
              <img src={logo} alt="Vision Canal+" className="mb-4 h-14 w-auto" />
              <h2 className="text-xl font-extrabold text-slate-800">Connectez vous!</h2>
              <div className="mt-2 h-0.5 w-20 rounded-full bg-slate-800/80" />
            </div>

            <label className="mb-4 block">
              <span className="sr-only">Email ou telephone</span>
              <div className={[
                "flex items-center gap-3 border-l-4 bg-white px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 transition focus-within:ring-2 focus-within:ring-slate-950",
                errors.contact ? "border-l-red-500" : "border-l-slate-950"
              ].join(" ")}>
                <Mail className="h-5 w-5 shrink-0 text-slate-500" />
                <input
                  type="text"
                  placeholder="Entrez votre email ou téléphone"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="mb-4 block">
              <span className="sr-only">Mot de passe</span>
              <div className={[
                "flex items-center gap-3 border-l-4 bg-white px-4 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 transition focus-within:ring-2 focus-within:ring-slate-950",
                errors.password ? "border-l-red-500" : "border-l-slate-950"
              ].join(" ")}>
                <LockKeyhole className="h-5 w-5 shrink-0 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-400 transition hover:text-slate-700"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOpen/> : <EyeOff/>}
                </button>
              </div>
            </label>

            <div className="mb-6 flex items-center justify-between gap-3 text-xs text-slate-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-3.5 w-3.5 accent-slate-950" defaultChecked />
                <span>Rappellez moi</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="font-semibold text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
              >
                Mot de passe oublié?
              </button>
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="mx-auto flex items-center justify-center gap-2 rounded-[3px] bg-slate-950 px-7 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-[0_14px_24px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_32px_rgba(15,23,42,0.30)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {loadingLogin ? <Spinner/> : <LogIn className="h-4 w-4" />}
              {loadingLogin ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </section>

        <section className="relative hidden min-h-[520px] items-center justify-center overflow-hidden bg-slate-950 p-10 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.10),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_72%_78%,rgba(0,29,92,0.30),transparent_34%)]" />
          <div className="absolute -right-16 -top-14 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -left-20 top-40 h-44 w-44 rounded-full bg-black/25" />
          <div className="absolute -bottom-20 left-24 h-56 w-56 rounded-full bg-black/30" />
          <div className="absolute right-[-38px] top-[43%] h-28 w-28 rounded-full bg-white/12" />

          <div className="relative z-10 max-w-sm text-center">
            <p className="mb-3 text-2xl font-extrabold uppercase tracking-wide">Bienvenue sur vision Canal+ </p>
            <p className="mx-auto mb-8 max-w-xs text-sm font-semibold leading-relaxed text-white/90">
              Vous n'avez pas encore de compte?
            </p>
            <button
              type="button"
              onClick={() => navigate("/Inscription")}
              className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-white bg-white px-8 py-4 text-xs font-extrabold uppercase text-slate-950 shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white hover:shadow-[0_18px_34px_rgba(0,0,0,0.35)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <UserPlus className="h-4 w-4" />
              S'inscrire
            </button>
          </div>
        </section>

        <div className="border-t border-slate-100 px-6 pb-8 text-center text-sm text-slate-500 lg:hidden">
          Vous n'avez pas encore de compte ?{" "}
          <button type="button" onClick={() => navigate("/Inscription")}
                  className="font-bold text-slate-950 hover:underline">
            S'inscrire
          </button>
        </div>
      </main>
    </div>
  );
}

export default LoginForm;

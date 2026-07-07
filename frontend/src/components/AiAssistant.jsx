import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiUrl } from "../lib/api";
import { authFetchOptions } from "../lib/session";

const WELCOME =
  "Bonjour ! Je suis l'assistant Black'Art Vision Canal+. Posez-moi une question sur les réabonnements, le portefeuille, les recharges ou les factures.";

export default function AiAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
  
  // Audio Recording States
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(apiUrl("ai/status"), authFetchOptions())
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setConfigured(Boolean(d?.configured)))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        apiUrl("ai/assist"),
        authFetchOptions({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: history.slice(-10),
          }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur assistant");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Pas de réponse." },
      ]);
      if (data.configured === false) setConfigured(false);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e.message.includes("Failed to fetch") || e.message.includes("NetworkError") || e.message.includes("assistant")
            ? "Votre assistant Vision Canal+ est indisponible pour le moment. Réessayez plus tard."
            : e.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  // Speech-To-Text: Audio Recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const fd = new FormData();
        fd.append("audio", audioBlob, "audio.webm");

        try {
          setLoading(true);
          const res = await fetch(apiUrl("ai/transcribe"), authFetchOptions({
            method: "POST",
            body: fd,
          }));
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Erreur de transcription");
          if (data.text) {
            setInput((prev) => (prev ? prev + " " + data.text : data.text));
          } else {
            Swal.fire({ title: "Micro", text: "Aucune voix détectée.", icon: "info", confirmButtonColor: "#e53935" });
          }
        } catch (e) {
          console.error(e);
          Swal.fire({ title: "Erreur audio", text: e.message, icon: "error", confirmButtonColor: "#e53935" });
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start(250);
      setRecording(true);
    } catch (e) {
      console.error(e);
      Swal.fire({ title: "Micro", text: "Accès micro refusé ou non supporté.", icon: "error", confirmButtonColor: "#e53935" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Text-To-Speech
  const speakText = (text) => {
    if (!window.speechSynthesis) {
      Swal.fire({ title: "Audio", text: "La synthèse vocale n'est pas supportée par votre navigateur.", icon: "info", confirmButtonColor: "#e53935" });
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.split("[ACTION_TRIGGER]")[0].trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "fr-FR";
    window.speechSynthesis.speak(utterance);
  };

  // Actions
  const handleRechargeAction = async (montant, moyen_paiement) => {
    const { value: paymentNum } = await Swal.fire({
      title: "Numéro de paiement",
      text: `Saisissez le numéro utilisé pour le paiement de la recharge de ${Number(montant).toLocaleString()} FCFA par ${moyen_paiement} :`,
      input: "text",
      inputPlaceholder: "Ex: 6xxxxxxx (9 chiffres)",
      showCancelButton: true,
      confirmButtonColor: "#e53935",
      confirmButtonText: "Soumettre la demande",
      cancelButtonText: "Annuler",
      inputValidator: (value) => {
        if (!value) return "Le numéro est requis !";
        if (!/^\d{9}$/.test(value.replace(/\s+/g, ""))) return "Format invalide (9 chiffres attendus) !";
      }
    });

    if (!paymentNum) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(apiUrl("admin/notifications"), authFetchOptions({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montant: Number(montant),
          moyen_paiement,
          numero_paiement: paymentNum,
          date_operation: today
        })
      }));

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      Swal.fire({
        title: "Soumis !",
        text: "Votre demande de recharge a été soumise avec succès.",
        icon: "success",
        confirmButtonColor: "#e53935"
      });
    } catch (e) {
      Swal.fire({
        title: "Erreur",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#e53935"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper template for messages rendering
  const renderMessageContent = (m, idx) => {
    if (m.role === "user") {
      return <div className="bg-primary/10 text-foreground ml-6 rounded-xl px-3 py-2">{m.content}</div>;
    }

    // Assistant role
    const parts = m.content.split("[ACTION_TRIGGER]");
    const visibleText = parts[0].trim();
    const actionJson = parts[1] ? parts[1].trim() : null;

    let action = null;
    if (actionJson) {
      try {
        action = JSON.parse(actionJson);
      } catch (e) {
        console.error("Failed to parse action metadata:", e);
      }
    }

    return (
      <div className="bg-muted/50 text-foreground mr-4 rounded-xl px-3 py-2 relative group flex flex-col">
        <div>{visibleText}</div>
        
        <div className="flex items-center gap-2 mt-1 border-t border-border/20 pt-1 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => speakText(visibleText)}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            🔊 Écouter la réponse
          </button>
        </div>

        {action && (
          <div className="mt-2 pt-2 border-t border-dashed border-border/40">
            {action.action === "request_recharge" && (
              <button
                type="button"
                onClick={() => handleRechargeAction(action.montant, action.moyen_paiement)}
                className="w-full text-center bg-primary text-primary-foreground font-semibold py-1.5 px-3 rounded-lg text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
              >
                ⚡ Confirmer la recharge de {Number(action.montant).toLocaleString()} FCFA ({action.moyen_paiement})
              </button>
            )}
            {action.action === "request_reabonnement" && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(`/reabonnement?numabo=${action.numero_abonne || ""}`);
                }}
                className="w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer shadow-sm"
              >
                📺 Finaliser le réabonnement de {action.numero_abonne}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed z-40 bottom-20 right-4 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-105"
        title="Assistant Vision Canal+"
        aria-label="Ouvrir l'assistant IA"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.2 4.7-3 6.1V19a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2.9A7 7 0 0 1 5 10a7 7 0 0 1 7-7z" />
          <path d="M9 21h6M10 17h4" />
        </svg>
      </button>

      {open && (
        <div className="fixed z-50 inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "min(85vh, 560px)" }}
          >
            <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Assistant Vision Canal+</p>
                <p className="text-[10px] opacity-80">
                  {configured === false
                    ? "Mode aide (aucune clé IA)"
                    : configured
                      ? "Assistant actif (Gemini ou Groq)"
                      : "Chargement…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[240px]">
              {messages.map((m, i) => (
                <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                  {renderMessageContent(m, i)}
                </div>
              ))}
              {loading && (
                <p className="text-xs text-muted-foreground italic px-2">Réflexion en cours…</p>
              )}
            </div>

            <div className="p-3 border-t border-border flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ex : Comment demander une recharge ?"
                className="flex-1 px-3 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
              
              {/* Voice recording button */}
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer border ${
                  recording
                    ? "bg-red-600 text-white border-red-700 animate-pulse hover:bg-red-700"
                    : "bg-muted text-foreground border-border hover:bg-muted/80"
                }`}
                title={recording ? "Arrêter l'enregistrement" : "Enregistrer une note vocale"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 cursor-pointer hover:bg-primary/95 shadow-sm"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

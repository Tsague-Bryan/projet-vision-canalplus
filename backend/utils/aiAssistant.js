const axios = require("axios");
const { getCatalogPromptContext } = require("./canalCatalog");

const SYSTEM_PROMPT = `Tu es l'assistant officiel de l'application Vision Canal+ (partenaires Canal+ au Cameroun).

Langues et ton :
- Réponds chaleureusement en Français, Anglais, ou en Pidgin English camerounais selon la langue utilisée par l'utilisateur.
- Si l'utilisateur s'adresse à toi en Pidgin, réponds en Pidgin simple (ex: "No vex, your wallet balance na...", "Make you click for here...", etc.).

Règles strictes :
- Tu expliques l'utilisation de l'application : réabonnement, abonnement, portefeuille, recharge, commissions, décodeurs, demandes technicien, factures dans Transactions.
- Si l'utilisateur formule une intention claire d'effectuer une recharge ou un réabonnement, tu dois l'aider en générant un bloc JSON d'action.
- Ce bloc JSON doit être placé à la toute fin de ta réponse, précédé du mot-clé [ACTION_TRIGGER] sur une nouvelle ligne. Le format doit être strictement respecté.

Formats JSON [ACTION_TRIGGER] autorisés :
1. Demande de recharge :
[ACTION_TRIGGER] {"action": "request_recharge", "montant": 5000, "moyen_paiement": "MTN Mobile Money"} (détermine le montant et le moyen de paiement "MTN Mobile Money" ou "Orange Money" si mentionnés, ou demande-les).
2. Demande de réabonnement :
[ACTION_TRIGGER] {"action": "request_reabonnement", "numero_abonne": "12345678", "formule": "Evasion", "duree": 1} (détermine le numéro abonné, la formule et la durée si mentionnés).

Important :
- Ne mets pas d'action si l'utilisateur pose juste une question informative.
- Ne invente pas d'action si les informations minimales (comme le montant) manquent.
- Ne déclenche jamais l'opération directement, le client s'occupera d'afficher le bouton de raccourci.
- Réfère-toi toujours au catalogue de formules, d'accessoires ou de codes d'erreur Canal+ fourni ci-dessous pour guider l'utilisateur.`;

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

const rateBuckets = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(userId) {
  const key = String(userId);
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    const err = new Error("Limite de questions atteinte. Réessayez dans une heure.");
    err.status = 429;
    throw err;
  }
}

function uniqueModels(list) {
  const seen = new Set();
  return list.filter((m) => {
    const id = String(m || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function geminiModelList() {
  const fromEnv = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  return uniqueModels([...fromEnv, ...DEFAULT_GEMINI_MODELS]);
}

function isQuotaError(err) {
  const msg = String(err.response?.data?.error?.message || err.message || "").toLowerCase();
  const status = err.response?.status;
  return status === 429 || msg.includes("quota") || msg.includes("rate limit") || msg.includes("limit: 0");
}

function friendlyAiError(apiMsg, status) {
  return "Votre assistant Vision Canal+ est indisponible pour le moment. Réessayez plus tard.";
}

function buildGeminiContents(message, history) {
  const contents = [];
  for (const entry of (history || []).slice(-8)) {
    const text = String(entry?.content || "").trim();
    if (!text) continue;
    contents.push({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }
  contents.push({ role: "user", parts: [{ text: message }] });
  return contents;
}

async function callGemini(apiKey, model, message, history, context = "") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const fullPrompt = SYSTEM_PROMPT + "\n\n" + getCatalogPromptContext() + (context ? "\n\n" + context : "");
  const res = await axios.post(
    url,
    {
      systemInstruction: { parts: [{ text: fullPrompt }] },
      contents: buildGeminiContents(message, history),
      generationConfig: { temperature: 0.35, maxOutputTokens: 900 },
    },
    {
      params: { key: apiKey },
      timeout: 45000,
      headers: { "Content-Type": "application/json" },
    }
  );
  const text = res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text.trim()) throw new Error("Réponse vide du modèle");
  return { reply: text.trim(), configured: true, provider: "gemini", model };
}

async function callGroq(apiKey, message, history, context = "") {
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const fullPrompt = SYSTEM_PROMPT + "\n\n" + getCatalogPromptContext() + (context ? "\n\n" + context : "");
  const messages = [{ role: "system", content: fullPrompt }];
  for (const entry of (history || []).slice(-8)) {
    const text = String(entry?.content || "").trim();
    if (!text) continue;
    messages.push({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: text,
    });
  }
  messages.push({ role: "user", content: message });

  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    { model, messages, temperature: 0.35, max_tokens: 900 },
    {
      timeout: 45000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  const text = res.data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("Réponse vide du modèle");
  return { reply: text.trim(), configured: true, provider: "groq", model };
}

function offlineReply() {
  return {
    reply:
      "L'assistant IA n'est pas activé sur ce serveur. L'administrateur peut ajouter une clé gratuite :\n" +
      "• Google : https://aistudio.google.com → GEMINI_API_KEY\n" +
      "• Groq : https://console.groq.com → GROQ_API_KEY\n\n" +
      "En attendant : Portefeuille → recharge ; Réabonnements / Abonnements → opérations Canal+ ; Transactions → factures.",
    configured: false,
  };
}

async function askAssistant(userMessage, history = [], userId = "anon", context = "") {
  const message = String(userMessage || "").trim();
  if (!message) {
    const err = new Error("Message vide");
    err.status = 400;
    throw err;
  }
  if (message.length > 2000) {
    const err = new Error("Message trop long (2000 caractères max)");
    err.status = 400;
    throw err;
  }

  checkRateLimit(userId);

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!geminiKey && !groqKey) return offlineReply();

  const errors = [];

  if (geminiKey) {
    for (const model of geminiModelList()) {
      try {
        return await callGemini(geminiKey, model, message, history, context);
      } catch (err) {
        const apiMsg = err.response?.data?.error?.message || err.message;
        console.error(`🔥 Gemini (${model}):`, apiMsg);
        errors.push(`${model}: ${apiMsg}`);
        if (!isQuotaError(err)) break;
      }
    }
  }

  if (groqKey) {
    try {
      return await callGroq(groqKey, message, history, context);
    } catch (err) {
      const apiMsg = err.response?.data?.error?.message || err.message;
      console.error("🔥 Groq:", apiMsg);
      errors.push(`groq: ${apiMsg}`);
    }
  }

  const last = errors[errors.length - 1] || "";
  const wrapped = new Error(friendlyAiError(last, 429));
  wrapped.status = 429;
  throw wrapped;
}

function getAiStatus() {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const groq = Boolean(process.env.GROQ_API_KEY);
  return {
    configured: gemini || groq,
    gemini,
    groq,
    geminiModels: geminiModelList(),
    groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    hint: gemini
      ? "Si quota Gemini = 0, changez GEMINI_MODEL ou ajoutez GROQ_API_KEY"
      : "Clé gratuite : aistudio.google.com ou console.groq.com",
  };
}

module.exports = { askAssistant, getAiStatus, SYSTEM_PROMPT };

const nodemailer = require("nodemailer");

// ── Création du transporteur Gmail ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Vérifier la connexion au démarrage ────────────────────────────────────────
transporter.verify((error) => {
  if (error) {
    console.error("❌ Nodemailer — connexion Gmail échouée :", error.message);
  } else {
    console.log("✅ Nodemailer — Gmail connecté avec succès");
  }
});

// ── Template email pour le code de réinitialisation ──────────────────────────
const buildResetEmailHTML = (prenom, code, expiresMinutes = 15) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Code de réinitialisation — Vision Canal+</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- En-tête -->
          <tr>
            <td style="background:#003087;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
                VISION CANAL+
              </h1>
              <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">
                Grossiste agréé Canal+ Cameroun
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="font-size:16px;color:#111827;margin:0 0 8px;">
                Bonjour <strong>${prenom}</strong>,
              </p>
              <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 32px;">
                Vous avez demandé la réinitialisation de votre mot de passe.<br/>
                Voici votre code de vérification :
              </p>

              <!-- Code -->
              <div style="background:#f0f4ff;border:2px dashed #003087;border-radius:12px;
                          padding:28px;text-align:center;margin:0 0 32px;">
                <p style="font-size:42px;font-weight:900;color:#003087;letter-spacing:12px;
                           margin:0;font-family:monospace;">
                  ${code}
                </p>
                <p style="font-size:12px;color:#6b7280;margin:12px 0 0;">
                  Ce code expire dans <strong>${expiresMinutes} minutes</strong>
                </p>
              </div>

              <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 16px;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
                Votre mot de passe restera inchangé.
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
                Vision Canal+ — Douala, Cameroun<br/>
                Tel : +237 688 28 21 61<br/>
                Cet email a été envoyé automatiquement, ne pas répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Fonction principale d'envoi ───────────────────────────────────────────────
const sendResetCode = async ({ to, prenom, code }) => {
  if (!to || !code) throw new Error("Email et code requis");

  const mailOptions = {
    from:    process.env.EMAIL_FROM || `Vision Canal+ <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Votre code de réinitialisation Vision Canal+`,
    html:    buildResetEmailHTML(prenom || "Partenaire", code),
    text:    `Bonjour ${prenom},\n\nVotre code de réinitialisation : ${code}\n\nCe code expire dans 15 minutes.\n\nVision Canal+`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email envoyé à ${to} — MessageId: ${info.messageId}`);
  return info;
};

module.exports = { sendResetCode };
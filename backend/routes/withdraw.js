const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const auth    = require("../middleware/auth");

// ── Vérifie si la fenêtre de paiement est active (28 du mois + 5 jours) ──────
const fenetreActiveAutomatiquement = () => {
  const now     = new Date();
  const jour    = now.getDate();
  const mois    = now.getMonth();
  const annee   = now.getFullYear();

  // Dernier jour du mois en cours
  const dernierJour = new Date(annee, mois + 1, 0).getDate();

  // Fenêtre : du 28 jusqu'au 2 du mois suivant (inclus)
  if (jour >= 28 && jour <= dernierJour) return true;

  // Début du mois : jours 1 et 2
  if (jour <= 2) return true;

  return false;
};

// ── STATUT DU BOUTON BALANCE (pour le frontend partenaire) ───────────────────
// GET /api/partner/balance-status
router.get("/balance-status", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Lire le paramètre admin (override manuel)
    const [settings] = await pool.query(
      "SELECT balance_enabled, enabled_by FROM commission_settings WHERE id = 1"
    );

    if (settings.length === 0) {
      return res.status(500).json({ error: "Paramètres de commission introuvables" });
    }

    const { balance_enabled, enabled_by } = settings[0];

    // Statut final : admin override OU fenêtre automatique
    const autoActif    = fenetreActiveAutomatiquement();
    const boutonActif  = balance_enabled === 1 || autoActif;

    // Commissions disponibles du partenaire
    const [userRows] = await pool.query(
      "SELECT commission_balance FROM users WHERE id = ?",
      [userId]
    );

    const commissions = userRows.length > 0 ? Number(userRows[0].commission_balance) : 0;

    return res.json({
      bouton_actif:       boutonActif,
      active_par:         balance_enabled === 1 ? enabled_by : (autoActif ? "auto" : "inactif"),
      commission_balance: commissions,
    });

  } catch (err) {
    console.error("🔥 ERREUR balance-status :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── RETRAIT DES COMMISSIONS → PORTEFEUILLE ────────────────────────────────────
// POST /api/partner/withdraw
router.post("/withdraw", auth, async (req, res) => {
  const userId = req.user.id;

  let connection;

  try {
    // Vérifier si le bouton est actif
    const [settings] = await pool.query(
      "SELECT balance_enabled FROM commission_settings WHERE id = 1"
    );

    const balance_enabled = settings[0]?.balance_enabled === 1;
    const autoActif       = fenetreActiveAutomatiquement();
    const boutonActif     = balance_enabled || autoActif;

    if (!boutonActif) {
      return res.status(403).json({
        error: "Le retrait de vos commissions n'est pas encore possible. Veuillez patienter la période des paiements (disponible du 28 au 2 de chaque mois)."
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Récupérer les données du partenaire
    const [userRows] = await connection.query(
      "SELECT name, prenom, commission_balance, wallet_balance FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const user            = userRows[0];
    const montantRetrait  = Number(user.commission_balance);

    if (montantRetrait <= 0) {
      await connection.rollback();
      return res.status(400).json({
        error: "Vous n'avez aucune commission à retirer pour le moment."
      });
    }

    // Transfert : commission_balance → wallet_balance
    const newWallet      = Number(user.wallet_balance) + montantRetrait;
    const newCommissions = 0; // réinitialisé après retrait

    await connection.query(
      "UPDATE users SET wallet_balance = ?, commission_balance = ? WHERE id = ?",
      [newWallet, newCommissions, userId]
    );

    // Enregistrer la demande de retrait
    await connection.query(
      `INSERT INTO demandes_retrait (user_id, montant, statut, created_at)
       VALUES (?, ?, 'approved', NOW())`,
      [userId, montantRetrait]
    );

    // Notification admin
    const partnerName = `${user.prenom || ""} ${user.name}`.trim();
    await connection.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      [
        "retrait_commission",
        `💸 ${partnerName} a transféré ${Number(montantRetrait).toLocaleString()} FCFA de commissions vers son portefeuille.`,
      ]
    );

    await connection.commit();

    // Notification temps réel
    if (req.io) {
      req.io.emit("new_notification", {
        type:    "retrait_commission",
        message: `💸 Retrait commissions — ${partnerName}`,
      });
    }

    return res.json({
      success:            true,
      message:            `${Number(montantRetrait).toLocaleString()} FCFA de commissions transférés dans votre portefeuille.`,
      montant_retire:     montantRetrait,
      wallet_balance:     newWallet,
      commission_balance: newCommissions,
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 ERREUR withdraw :", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });

  } finally {
    if (connection) connection.release();
  }
});

// ── HISTORIQUE DES RETRAITS DU PARTENAIRE ────────────────────────────────────
// GET /api/partner/retraits
router.get("/retraits", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, montant, statut, created_at
       FROM demandes_retrait
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("🔥 ERREUR /retraits :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
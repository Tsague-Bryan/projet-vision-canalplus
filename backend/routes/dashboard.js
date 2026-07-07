// routes/dashboard.js
const express = require("express");
const fs      = require("fs");
const path    = require("path");
const auth    = require("../middleware/auth");
const pool    = require("../db");
const router  = express.Router();

const ensureWalletOperationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_operations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(40) NOT NULL,
      montant DECIMAL(14,2) NOT NULL DEFAULT 0,
      statut VARCHAR(30) NOT NULL DEFAULT 'validee',
      moyen_paiement VARCHAR(80) NULL,
      message VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

router.get("/partner/dashboard", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.role !== "partner") {
      return res.status(403).json({ error: "Accès réservé aux partenaires" });
    }

    const [[u]] = await pool.query(
      `SELECT name, prenom, telephone, ville, quartier, photo_url,
              COALESCE(wallet_balance, 0)      AS wallet_balance,
              COALESCE(commission_balance, 0)  AS commission_balance,
              COALESCE(commission_total, 0)    AS commission_total,
              COALESCE(balance_actif, 0)       AS balance_actif
       FROM users WHERE id = ? AND role = 'partner'`,
      [userId]
    );
    if (!u) return res.status(404).json({ message: "Partenaire introuvable" });

    const [[{ total: nbReab }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM reabonnements WHERE users_id = ?", [userId]
    );
    const [[{ total: nbClients }]] = await pool.query(
      "SELECT COUNT(DISTINCT numero_abonne) AS total FROM reabonnements WHERE users_id = ?", [userId]
    );
    const [[{ total: revenus }]] = await pool.query(
      "SELECT COALESCE(SUM(montant), 0) AS total FROM reabonnements WHERE users_id = ?", [userId]
    );
    await ensureWalletOperationsTable();
    const [[{ total: totalRecharges }]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM (
         SELECT montant AS total
         FROM demandes_recharge
         WHERE user_id = ? AND statut = 'validee'
         UNION ALL
         SELECT montant AS total
         FROM wallet_operations
         WHERE user_id = ? AND statut IN ('validee', 'approved') AND type IN ('wallet_credit', 'admin_credit')
       ) recharges`,
      [userId, userId]
    );

    const [statsRows] = await pool.query(
      `SELECT formule, COALESCE(SUM(commission), 0) AS commissions, COUNT(*) AS nb_operations
       FROM reabonnements WHERE users_id = ? GROUP BY formule`, [userId]
    );

    const [transactionsRows] = await pool.query(
      `SELECT id, numero_abonne, formule, montant, duree,
              COALESCE(commission, 0) AS commission,
              COALESCE(type_operation, 'reabonnement') AS type_operation,
              created_at
       FROM reabonnements WHERE users_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    // On peut envisager de rendre cette vérification asynchrone ou de stocker l'info en BDD
    // pour éviter des appels système répétitifs sur le disque.
    const transactions = await Promise.all(transactionsRows.map(async (t) => {
      const fileName = `facture_${t.id}.html`;
      const fp = path.join(__dirname, "../invoices", fileName);

      // Utilisation d'une vérification asynchrone (facultatif ici mais plus propre)
      const hasInvoice = fs.existsSync(fp);
      return { ...t, facture_url: hasInvoice ? `/invoices/${fileName}` : null };
    }));

    let balanceGlobalActif = false;
    try {
      const [s] = await pool.query("SELECT balance_enabled FROM commission_settings WHERE id = 1");
      balanceGlobalActif = s.length > 0 && s[0].balance_enabled === 1;
    } catch (_) {}
    const boutonBalanceActif = balanceGlobalActif && Number(u.balance_actif) === 1;

    let adminWhatsapp = "237695225823";
    try {
      const [[waRow]] = await pool.query("SELECT valeur FROM app_config WHERE cle = 'admin_whatsapp' LIMIT 1");
      if (waRow) adminWhatsapp = waRow.valeur;
    } catch (_) {}

    return res.json({
      message:              `Bienvenue ${u.prenom||""} ${u.name}`.trim(),
      wallet_balance:       Number(u.wallet_balance),
      commission_balance:   Number(u.commission_balance),
      commission_total:     Number(u.commission_total),
      total_recharges:      Number(totalRecharges),
      total_commissions_gagnees: Number(u.commission_total),
      bouton_balance_actif: boutonBalanceActif,
      balance_global_actif: balanceGlobalActif,
      balance_partenaire_actif: Number(u.balance_actif) === 1,
      admin_whatsapp:       adminWhatsapp,
      user: {
        name: u.name,
        prenom: u.prenom,
        telephone: u.telephone,
        ville: u.ville,
        quartier: u.quartier,
        photo_url: u.photo_url || '/uploads/avatars/default-avatar.png'
      },
      photo_url: u.photo_url || '/uploads/avatars/default-avatar.png',
      telephone: u.telephone,
      localisation: `${u.ville || ""}, ${u.quartier || ""}`.trim(),
      stats:                { clients: nbClients, reabonnements: nbReab, revenus: Number(revenus) },
      commissions_par_formule: statsRows,
      transactions,
    });
  } catch (err) {
    console.error("🔥 dashboard partenaire:", err);
    return res.status(500).json({ message: "Erreur serveur", details: err.message });
  }
});

/**
 * GET /api/partner/notifications
 * Récupère les dernières alertes du partenaire connecté
 */
router.get("/partner/notifications", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      "SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("🔥 GET /partner/notifications:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * PUT /api/partner/notifications/read
 * Marque toutes les notifications non lues comme lues
 */
router.put("/partner/notifications/read", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("🔥 PUT /partner/notifications/read:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

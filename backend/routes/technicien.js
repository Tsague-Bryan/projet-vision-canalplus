// backend/routes/technicien.js
const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");
const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// PARTENAIRE : Envoyer une demande technicien
// ══════════════════════════════════════════════════════════════════════════════
router.post("/demande-technicien", auth, async (req, res) => {
  const { nom, telephone, ville, quartier, probleme } = req.body;
  const userId = req.user.id;

  try {
    // Validation des champs
    if (!nom || !telephone || !ville || !quartier || !probleme) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    // Récupérer les infos du partenaire
    const [[user]] = await pool.query(
      "SELECT name, prenom, structure FROM users WHERE id = ?",
      [userId]
    );

    // Insérer la demande dans la base
    const [result] = await pool.query(
      `INSERT INTO demandes_technicien 
       (user_id, nom_client, telephone, ville, quartier, probleme, statut, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'en_attente', NOW())`,
      [userId, nom, telephone, ville, quartier, probleme]
    );

    const partnerName = `${user?.prenom || ""} ${user?.name || ""}`.trim();
    const message = `🔧 ${partnerName} a soumis une demande technique pour ${nom} (${ville}, ${quartier}) - Tél: ${telephone}`;

    // Créer une notification pour l'admin
    await pool.query(
      "INSERT INTO notifications (type, message, created_at) VALUES (?, ?, NOW())",
      ["demande_technicien", message]
    );

    // Émettre un événement Socket.io pour notifier l'admin en temps réel
    if (req.io) {
      req.io.emit("new_notification", {
        type: "demande_technicien",
        message: message,
        demandeId: result.insertId
      });
    }

    return res.json({
      success: true,
      message: "Demande envoyée avec succès. Un technicien vous contactera bientôt."
    });
  } catch (err) {
    console.error("🔥 demande-technicien:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN : Récupérer les demandes (avec pagination et filtre date)
// ══════════════════════════════════════════════════════════════════════════════
router.get("/admin/demandes-technicien", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const limit = 10;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;
    const { date } = req.query;

    let whereClause = "";
    let queryParams = [];

    // Si une date est fournie, on filtre dessus
    if (date) {
      whereClause = "WHERE DATE(dt.created_at) = ?";
      queryParams = [date];
    }

    // Compte total pour la pagination
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM demandes_technicien dt ${whereClause}`,
      queryParams
    );

    // Récupération des demandes avec jointure sur users pour avoir le nom du partenaire
    const [rows] = await pool.query(
      `SELECT dt.*, u.name, u.prenom, u.structure 
       FROM demandes_technicien dt 
       LEFT JOIN users u ON u.id = dt.user_id 
       ${whereClause}
       ORDER BY dt.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return res.json({
      demandes: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("🔥 get demandes-technicien:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN : Changer le statut (Approuver / Rejeter)
// ══════════════════════════════════════════════════════════════════════════════
router.put("/admin/demandes-technicien/:id/statut", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const { statut } = req.body; // 'en_cours', 'terminee', 'annulee'
  const validStatuts = ["en_cours", "terminee", "annulee"];

  if (!validStatuts.includes(statut)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    // Récupérer le user_id pour notifier le partenaire
    const [[demande]] = await pool.query("SELECT user_id, nom_client FROM demandes_technicien WHERE id = ?", [req.params.id]);

    if (!demande) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    await pool.query(
      "UPDATE demandes_technicien SET statut = ? WHERE id = ?",
      [statut, req.params.id]
    );

    // Notification pour le partenaire
    const messagePartenaire = `🔧 Votre demande pour ${demande.nom_client} est désormais : ${statut}`;
    await pool.query(
      "INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, NOW())",
      [demande.user_id, 'technicien_update', messagePartenaire]
    );

    // Socket.io temps réel
    if (req.io) {
      req.io.emit(`partner_notification_${demande.user_id}`, {
        message: messagePartenaire,
        type: "technicien_update"
      });
      req.io.emit("admin_dashboard_update", { type: "technicien_update" });
    }

    return res.json({ success: true, message: "Statut mis à jour et partenaire notifié" });
  } catch (err) {
    console.error("🔥 update statut technicien:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN : Supprimer les demandes traitées (Nettoyage)
// ══════════════════════════════════════════════════════════════════════════════
router.delete("/admin/demandes-technicien/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const [result] = await pool.query("DELETE FROM demandes_technicien WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Demande introuvable" });
    return res.json({ success: true, message: "Demande supprimée" });
  } catch (err) {
    console.error("delete demande technicien:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/admin/demandes-technicien-cleanup", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    // Supprime les demandes qui sont soit terminées, soit annulées
    const [result] = await pool.query(
      "DELETE FROM demandes_technicien WHERE statut IN ('terminee', 'annulee')"
    );
    
    return res.json({ 
      success: true, 
      message: `${result.affectedRows} demande(s) traitée(s) supprimée(s)` 
    });
  } catch (err) {
    console.error("🔥 cleanup technicien:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;

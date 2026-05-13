-- 1. Remettre tous les compteurs à zéro
UPDATE users SET 
  wallet_balance = 0,
  commission_balance = 0,
  commission_total = 0,
  balance_actif = 0
WHERE role = 'partner';

-- 2. Supprimer tous les partenaires (garde l'admin)
DELETE FROM users WHERE role = 'partner';

-- 3. Vider les tables liées
DELETE FROM reabonnements;
DELETE FROM demandes_recharge;
DELETE FROM demandes_technicien;
DELETE FROM notifications;
DELETE FROM decodeurs;
DELETE FROM commission_operation_history;
DELETE FROM commission_daily_history;

-- 4. Remettre les commissions à leur état de base
UPDATE commission_rules SET
  current_rate = base_rate,
  cashbox_amount = 0,
  activation_count = 0,
  base_progress_count = 0,
  required_base_count = 1,
  bonus_step = 0,
  trend_direction = 'base',
  commission_actuelle = ROUND(price * base_rate / 100);

-- 5. Réinitialiser les auto-increments
ALTER TABLE reabonnements AUTO_INCREMENT = 1;
ALTER TABLE demandes_recharge AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE decodeurs AUTO_INCREMENT = 1;
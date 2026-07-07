-- Reinitialisation complete de la base Vision Canal+
-- Conserve uniquement le ou les comptes admin existants.
-- A executer seulement apres sauvegarde de la base en ligne.

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM reabonnements;
DELETE FROM abonnements;
DELETE FROM demandes_recharge;
DELETE FROM wallet_operations;
DELETE FROM notifications;
DELETE FROM demandes_retrait;
DELETE FROM demandes_technicien;
DELETE FROM decodeurs;
DELETE FROM commission_operation_history;
DELETE FROM commission_cashbox_movements;
DELETE FROM commission_daily_history;
DELETE FROM admin_commissions;

DELETE FROM users WHERE role <> 'admin';

UPDATE users
SET wallet_balance = 0,
    commission_balance = 0,
    commission_total = 0,
    balance_actif = 0
WHERE role = 'admin';

UPDATE commission_rules
SET cashbox_amount = 0,
    activation_count = 0,
    base_progress_count = 0,
    bonus_step = 0,
    trend_direction = 'base',
    business_day_key = NULL;

INSERT INTO app_config (cle, valeur) VALUES
  ('admin_whatsapp', '237695225823'),
  ('fujisat_test_mode', 'false'),
  ('admin_gain_rate', '6'),
  ('commission_abonnement', '2000')
ON DUPLICATE KEY UPDATE valeur = VALUES(valeur);

SET FOREIGN_KEY_CHECKS = 1;

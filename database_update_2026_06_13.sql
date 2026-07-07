-- Mise a jour Vision Canal+ - 13/06/2026
-- A executer sur la base en ligne avant de deployer le nouveau code.

CREATE TABLE IF NOT EXISTS app_config (
  cle VARCHAR(100) PRIMARY KEY,
  valeur VARCHAR(255) NOT NULL
);

INSERT INTO app_config (cle, valeur) VALUES
  ('admin_whatsapp', '237695225823'),
  ('fujisat_user', ''),
  ('fujisat_pass', ''),
  ('fujisat_test_mode', 'false'),
  ('admin_gain_rate', '6'),
  ('commission_abonnement', '2000')
ON DUPLICATE KEY UPDATE valeur = VALUES(valeur);

CREATE TABLE IF NOT EXISTS wallet_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(40) NOT NULL,
  montant DECIMAL(14,2) NOT NULL DEFAULT 0,
  statut VARCHAR(30) NOT NULL DEFAULT 'validee',
  moyen_paiement VARCHAR(80) NULL,
  message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet_operations_user_created (user_id, created_at)
);

ALTER TABLE demandes_recharge
  ADD COLUMN IF NOT EXISTS date_operation DATE NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_actif TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL;

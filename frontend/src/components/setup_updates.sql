-- 1. Ajout de la colonne pour la photo de profil dans la table users
ALTER TABLE `users` 
ADD COLUMN `photo_url` VARCHAR(255) DEFAULT NULL AFTER `quartier`;

-- 2. Création de la table pour gérer les demandes d'intervention technique
CREATE TABLE IF NOT EXISTS `demandes_technicien` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `nom_client` VARCHAR(255) NOT NULL,
  `telephone` VARCHAR(50) NOT NULL,
  `ville` VARCHAR(100) NOT NULL,
  `quartier` VARCHAR(100) NOT NULL,
  `probleme` TEXT NOT NULL,
  `statut` ENUM('en_attente', 'en_cours', 'terminee', 'annulee') DEFAULT 'en_attente',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tech_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Mise à jour ou création de la table notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL, -- NULL signifie que c'est une notification pour l'ADMIN
  `type` VARCHAR(50) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0, -- 0 = non lu, 1 = lu
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
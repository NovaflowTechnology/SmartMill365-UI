CREATE DATABASE IF NOT EXISTS `kanban_dashboard`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `kanban_dashboard`;

CREATE TABLE `organizations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('superadmin','admin','editor','viewer') DEFAULT 'viewer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `org_id` int DEFAULT NULL,
  `favorite_template_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `org_id` (`org_id`),
  KEY `fk_users_favorite_template` (`favorite_template_id`),
  CONSTRAINT `users_ibfk_1`
    FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `layout` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `org_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `fk_templates_org` (`org_id`),
  CONSTRAINT `fk_templates_org`
    FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `templates_ibfk_1`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_favorite_template`
    FOREIGN KEY (`favorite_template_id`)
    REFERENCES `templates` (`id`)
    ON DELETE SET NULL;

CREATE TABLE `org_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_id` int DEFAULT NULL,
  `template_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_org_template` (`org_id`,`template_id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `org_templates_ibfk_1`
    FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `org_templates_ibfk_2`
    FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `organization_influx_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_id` int NOT NULL,
  `bucket_name` varchar(128) NOT NULL,
  `measurement_name` varchar(128) NOT NULL,
  `tag_key` varchar(64) NOT NULL DEFAULT 'id',
  `tag_value` varchar(255) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_org_device`
    (`org_id`,`bucket_name`,`measurement_name`,`tag_key`,`tag_value`),
  CONSTRAINT `fk_influx_device_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `process_flows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT '',
  `topology` json DEFAULT NULL,
  `org_id` int NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_process_flows_org` (`org_id`),
  KEY `idx_process_flows_created_by` (`created_by`),
  CONSTRAINT `fk_process_flows_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_process_flows_org`
    FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

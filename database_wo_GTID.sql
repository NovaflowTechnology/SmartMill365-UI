-- Kanban Dashboard database schema
-- Structure only: no production or user data included.
-- Designed for MySQL 8.0+.

CREATE DATABASE IF NOT EXISTS `kanban_dashboard`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `kanban_dashboard`;

SET @OLD_CHARACTER_SET_CLIENT = @@CHARACTER_SET_CLIENT;
SET @OLD_CHARACTER_SET_RESULTS = @@CHARACTER_SET_RESULTS;
SET @OLD_COLLATION_CONNECTION = @@COLLATION_CONNECTION;
SET @OLD_TIME_ZONE = @@TIME_ZONE;
SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_MODE = @@SQL_MODE;
SET @OLD_SQL_NOTES = @@SQL_NOTES;

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';
SET UNIQUE_CHECKS = 0;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET SQL_NOTES = 0;

-- Drop tables in dependency order.
DROP TABLE IF EXISTS `org_templates`;
DROP TABLE IF EXISTS `organization_influx_devices`;
DROP TABLE IF EXISTS `templates`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `organizations`;

-- ============================================================
-- Organizations
-- ============================================================

CREATE TABLE `organizations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_organization_name` (`name`)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ============================================================
-- Users
--
-- The favorite_template_id foreign key is added later because
-- users and templates reference each other.
-- ============================================================

CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM(
    'superadmin',
    'admin',
    'editor',
    'viewer'
  ) NOT NULL DEFAULT 'viewer',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `org_id` INT DEFAULT NULL,
  `favorite_template_id` INT DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_username` (`username`),
  KEY `idx_users_org_id` (`org_id`),
  KEY `idx_users_favorite_template_id` (`favorite_template_id`),

  CONSTRAINT `fk_users_organization`
    FOREIGN KEY (`org_id`)
    REFERENCES `organizations` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ============================================================
-- Templates
-- ============================================================

CREATE TABLE `templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `layout` JSON DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `org_id` INT DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_templates_created_by` (`created_by`),
  KEY `idx_templates_org_id` (`org_id`),

  CONSTRAINT `fk_templates_creator`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT `fk_templates_organization`
    FOREIGN KEY (`org_id`)
    REFERENCES `organizations` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Add the users → templates relationship after both tables exist.

ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_favorite_template`
    FOREIGN KEY (`favorite_template_id`)
    REFERENCES `templates` (`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- ============================================================
-- Organization-to-template assignments
-- ============================================================

CREATE TABLE `org_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `org_id` INT NOT NULL,
  `template_id` INT NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_org_template` (`org_id`, `template_id`),
  KEY `idx_org_templates_template_id` (`template_id`),

  CONSTRAINT `fk_org_templates_organization`
    FOREIGN KEY (`org_id`)
    REFERENCES `organizations` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT `fk_org_templates_template`
    FOREIGN KEY (`template_id`)
    REFERENCES `templates` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ============================================================
-- Influx devices assigned to organizations
-- ============================================================

CREATE TABLE `organization_influx_devices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `org_id` INT NOT NULL,
  `bucket_name` VARCHAR(128) NOT NULL,
  `measurement_name` VARCHAR(128) NOT NULL,
  `tag_key` VARCHAR(64) NOT NULL DEFAULT 'id',
  `tag_value` VARCHAR(255) NOT NULL,
  `device_name` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_org_device` (
    `org_id`,
    `bucket_name`,
    `measurement_name`,
    `tag_key`,
    `tag_value`
  ),
  KEY `idx_influx_devices_org_id` (`org_id`),

  CONSTRAINT `fk_influx_device_organization`
    FOREIGN KEY (`org_id`)
    REFERENCES `organizations` (`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Restore session settings.

SET SQL_MODE = @OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
SET TIME_ZONE = @OLD_TIME_ZONE;
SET CHARACTER_SET_CLIENT = @OLD_CHARACTER_SET_CLIENT;
SET CHARACTER_SET_RESULTS = @OLD_CHARACTER_SET_RESULTS;
SET COLLATION_CONNECTION = @OLD_COLLATION_CONNECTION;
SET SQL_NOTES = @OLD_SQL_NOTES;

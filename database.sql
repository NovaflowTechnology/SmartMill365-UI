-- MySQL dump 10.13  Distrib 9.7.0, for Win64 (x86_64)
--
-- Host: localhost    Database: kanban_dashboard
-- ------------------------------------------------------
-- Server version	9.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '4bc8e29b-43ef-11f1-b8ae-e89c259288fe:1-92';

--
-- Table structure for table `org_templates`
--

DROP TABLE IF EXISTS `org_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `org_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_id` int DEFAULT NULL,
  `template_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `org_id` (`org_id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `org_templates_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `org_templates_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `org_templates`
--

LOCK TABLES `org_templates` WRITE;
/*!40000 ALTER TABLE `org_templates` DISABLE KEYS */;
INSERT INTO `org_templates` VALUES (14,1,9),(15,2,9),(16,2,15);
/*!40000 ALTER TABLE `org_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organizations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
INSERT INTO `organizations` VALUES (1,'Palm Oil'),(2,'Client A');
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `fk_templates_org` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `templates`
--

LOCK TABLES `templates` WRITE;
/*!40000 ALTER TABLE `templates` DISABLE KEYS */;
INSERT INTO `templates` VALUES (9,'A Boiler','{\"cols\": 4, \"rows\": 3, \"items\": [{\"h\": 2, \"w\": 2, \"x\": 1, \"y\": 1, \"id\": 1779657285073, \"pins\": [], \"type\": \"image\", \"dataKey\": \"\"}, {\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"id\": 1779657291535, \"type\": \"gauge\", \"dataKey\": \"steamPressure\"}, {\"h\": 1, \"w\": 1, \"x\": 1, \"y\": 0, \"id\": 1779657296248, \"type\": \"gauge\", \"dataKey\": \"vgPressure\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"id\": 1779657297512, \"type\": \"bignumber\", \"dataKey\": \"waterDrumLevel\"}, {\"h\": 2, \"w\": 1, \"x\": 0, \"y\": 1, \"id\": 1779657306974, \"type\": \"line\", \"dataKey\": \"steamPressure\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 1, \"id\": 1779657313058, \"type\": \"line\", \"dataKey\": \"steamFlowrate\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 2, \"id\": 1779657318012, \"type\": \"line\", \"dataKey\": \"waterFlowrate\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 0, \"id\": 1779657320477, \"type\": \"line\", \"dataKey\": \"steamPressure\"}]}',1,'2026-05-24 21:15:22',NULL),(15,'Boiler B','{\"cols\": 4, \"rows\": 3, \"items\": [{\"h\": 2, \"w\": 2, \"x\": 1, \"y\": 1, \"id\": 1779680895142, \"pins\": [], \"type\": \"image\", \"dataKey\": \"\"}, {\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"id\": 1779680899111, \"type\": \"gauge\", \"dataKey\": \"steamPressure\"}, {\"h\": 1, \"w\": 2, \"x\": 1, \"y\": 0, \"id\": 1779680901885, \"type\": \"line\", \"dataKey\": \"steamPressure\"}, {\"h\": 2, \"w\": 1, \"x\": 0, \"y\": 1, \"id\": 1779680907749, \"type\": \"gauge\", \"dataKey\": \"steamPressure\"}]}',1,'2026-05-25 03:48:34',NULL),(16,'Sample','{\"cols\": 4, \"rows\": 3, \"items\": [{\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"id\": 1779681129798, \"type\": \"gauge\", \"dataKey\": \"steamPressure\"}, {\"h\": 2, \"w\": 2, \"x\": 1, \"y\": 1, \"id\": 1779681133505, \"pins\": [], \"type\": \"image\", \"dataKey\": \"\"}, {\"h\": 1, \"w\": 2, \"x\": 1, \"y\": 0, \"id\": 1779681140179, \"type\": \"line\", \"dataKey\": \"steamPressure\"}, {\"h\": 2, \"w\": 1, \"x\": 0, \"y\": 1, \"id\": 1779681151696, \"type\": \"bignumber\", \"dataKey\": \"waterDrumLevel\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 0, \"id\": 1779681157061, \"type\": \"gauge\", \"dataKey\": \"waterDrumLevel\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 1, \"id\": 1779681159858, \"type\": \"line\", \"dataKey\": \"steamPressure\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 2, \"id\": 1779681162112, \"type\": \"line\", \"dataKey\": \"waterFlowrate\"}]}',2,'2026-05-25 03:53:18',1);
/*!40000 ALTER TABLE `templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('superadmin','admin','editor','viewer') DEFAULT 'viewer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `org_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `org_id` (`org_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'super','$2b$10$Zf.7MGQQ9tFlyl4/maOcrejFHCbQH/zp9Bsxx6ITgVdToHL82fpFa','superadmin','2026-04-29 17:19:41',NULL),(2,'admin','$2b$10$Zf.7MGQQ9tFlyl4/maOcrejFHCbQH/zp9Bsxx6ITgVdToHL82fpFa','admin','2026-04-29 17:19:41',1),(3,'editor','$2b$10$Zf.7MGQQ9tFlyl4/maOcrejFHCbQH/zp9Bsxx6ITgVdToHL82fpFa','editor','2026-04-29 17:19:41',1),(4,'viewer','$2b$10$Zf.7MGQQ9tFlyl4/maOcrejFHCbQH/zp9Bsxx6ITgVdToHL82fpFa','viewer','2026-04-29 17:19:41',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-25 12:30:13

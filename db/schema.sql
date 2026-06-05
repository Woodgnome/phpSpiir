-- MariaDB dump 10.19  Distrib 10.5.18-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: spiir
-- ------------------------------------------------------
-- Server version	10.5.18-MariaDB-0+deb11u1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_periods`
--

DROP TABLE IF EXISTS `account_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_periods` (
  `account_period_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `account_id` bigint(20) NOT NULL,
  `posting_count` int(11) NOT NULL,
  `ignore_postings_before` tinyint(4) NOT NULL DEFAULT 0,
  `ignore_postings_after` tinyint(4) NOT NULL DEFAULT 0,
  `ignored_posting_count` int(11) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `start_balance` int(11) NOT NULL,
  `end_balance` int(11) NOT NULL,
  `is_automatic` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`account_period_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `account_periods_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `account_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `type_explicitly_set` tinyint(4) NOT NULL DEFAULT 0,
  `subcategory_id` varchar(255) DEFAULT NULL,
  `bank_credential_id` bigint(20) DEFAULT NULL,
  `balance` int(11) NOT NULL,
  `available_balance` int(11) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `number_of_postings` int(11) NOT NULL,
  `is_automatic` tinyint(4) NOT NULL DEFAULT 0,
  `bank_id` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `partner_id` int(11) DEFAULT NULL,
  `in_active` tinyint(4) NOT NULL DEFAULT 0,
  `in_active_by_system` tinyint(4) NOT NULL DEFAULT 0,
  `owner_user_id` int(11) NOT NULL,
  `connection_type` varchar(255) DEFAULT NULL,
  `last_updated` datetime NOT NULL,
  PRIMARY KEY (`account_id`),
  KEY `owner_user_id` (`owner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bank_credentials`
--

DROP TABLE IF EXISTS `bank_credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bank_credentials` (
  `bank_credential_id` int(11) NOT NULL AUTO_INCREMENT,
  `bank_id` int(11) NOT NULL,
  `id` bigint(20) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `supports_unattended` tinyint(4) NOT NULL DEFAULT 0,
  `is_disabled` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`bank_credential_id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `bank_credentials_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`bank_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `banks`
--

DROP TABLE IF EXISTS `banks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `banks` (
  `bank_id` int(11) NOT NULL AUTO_INCREMENT,
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `country_code` varchar(255) NOT NULL,
  `is_partner_bank` tinyint(4) NOT NULL DEFAULT 0,
  `has_logo` tinyint(4) NOT NULL DEFAULT 0,
  `active` tinyint(4) NOT NULL DEFAULT 0,
  `mobile_bank_api_enabled` tinyint(4) NOT NULL DEFAULT 0,
  `mark_as_beta` tinyint(4) NOT NULL DEFAULT 0,
  `is_automatic` tinyint(4) NOT NULL DEFAULT 0,
  `bank_api_disabled_message` varchar(255) DEFAULT NULL,
  `disable_manual_upload` tinyint(4) NOT NULL DEFAULT 0,
  `csv_supported` tinyint(4) NOT NULL DEFAULT 0,
  `search_hints` varchar(255) NOT NULL,
  `help_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`bank_id`),
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `sort` int(11) NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `countries` (
  `country_id` int(11) NOT NULL AUTO_INCREMENT,
  `id` varchar(2) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `posts` (
  `post_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `account_period_id` bigint(20) NOT NULL,
  `date` datetime NOT NULL,
  `date_custom` datetime DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `description_original` varchar(255) NOT NULL,
  `subcategory_id` int(11) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `amount_original` int(11) NOT NULL,
  `balance` int(11) DEFAULT NULL,
  `currency` varchar(255) NOT NULL,
  `currency_original` varchar(255) NOT NULL,
  `counter_entry_id` bigint(20) DEFAULT NULL,
  `comment` varchar(255) DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `is_extraordinary` tinyint(4) NOT NULL DEFAULT 0,
  `split_group_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`post_id`),
  KEY `subcategory_id` (`subcategory_id`),
  KEY `counter_entry_id` (`counter_entry_id`),
  KEY `split_group_id` (`split_group_id`),
  KEY `posts_ibfk_3` (`account_period_id`),
  CONSTRAINT `posts_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`subcategory_id`),
  CONSTRAINT `posts_ibfk_3` FOREIGN KEY (`account_period_id`) REFERENCES `account_periods` (`account_period_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subcategories`
--

DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subcategories` (
  `subcategory_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `expense_type` varchar(255) NOT NULL,
  `hints` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`subcategory_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-26 21:48:56

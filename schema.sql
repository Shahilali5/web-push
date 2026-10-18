CREATE DATABASE IF NOT EXISTS push_system CHARACTER SET utf8mb4;
USE push_system;

CREATE TABLE subscribers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(512) NOT NULL,
  token_hash CHAR(40) NOT NULL UNIQUE,
  user_id VARCHAR(100) NULL,
  tags JSON NULL,
  browser VARCHAR(60) NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (active), INDEX (user_id)
);

CREATE TABLE campaigns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  icon VARCHAR(500) NULL,
  image VARCHAR(500) NULL,
  url VARCHAR(500) NULL,
  channel ENUM('push','live','both') DEFAULT 'push',
  target VARCHAR(150) DEFAULT 'all',
  status ENUM('scheduled','queued','sending','done','cancelled') DEFAULT 'queued',
  scheduled_at DATETIME NULL,
  total INT DEFAULT 0,
  sent INT DEFAULT 0,
  failed INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE send_errors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  subscriber_id BIGINT NOT NULL,
  error VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (campaign_id)
);

CREATE TABLE templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  icon VARCHAR(500) NULL,
  image VARCHAR(500) NULL,
  url VARCHAR(500) NULL
);

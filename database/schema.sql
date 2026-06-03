-- ============================================================
--  Cadence — Campaign Manager : Database schema + seed data
--  Engine: MySQL (XAMPP / MariaDB)
--  Run in phpMyAdmin or:  mysql -u root < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS cadence
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cadence;

-- Drop in FK-safe order (so the script is re-runnable) ----------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  USERS  (login + team roster)
-- ============================================================
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('Admin','Manager','Editor','Viewer') NOT NULL DEFAULT 'Viewer',
  team          VARCHAR(80)   DEFAULT NULL,
  status        ENUM('Active','Invited','Suspended') NOT NULL DEFAULT 'Active',
  last_active   DATETIME      DEFAULT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(180) NOT NULL,
  channel    ENUM('Email','PPC','Social','Display','Event') NOT NULL DEFAULT 'Email',
  status     ENUM('Active','Paused','Completed','Draft') NOT NULL DEFAULT 'Draft',
  owner      VARCHAR(120) NOT NULL,
  budget     DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent      DECIMAL(12,2) NOT NULL DEFAULT 0,
  leads      INT NOT NULL DEFAULT 0,
  roi        DECIMAL(5,2) NOT NULL DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date   DATE DEFAULT NULL,
  progress   TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_channel (channel)
) ENGINE=InnoDB;

-- ============================================================
--  LEADS
-- ============================================================
CREATE TABLE leads (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  company    VARCHAR(140) DEFAULT NULL,
  email      VARCHAR(160) DEFAULT NULL,
  score      TINYINT NOT NULL DEFAULT 0,
  status     ENUM('New','Contacted','Qualified','Proposal','Lost') NOT NULL DEFAULT 'New',
  source     ENUM('Email','PPC','Social','Display','Event') NOT NULL DEFAULT 'Email',
  value      DECIMAL(12,2) NOT NULL DEFAULT 0,
  owner      VARCHAR(120) DEFAULT NULL,
  created    DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  CONTACTS (CRM)
-- ============================================================
CREATE TABLE contacts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  company    VARCHAR(140) DEFAULT NULL,
  title      VARCHAR(120) DEFAULT NULL,
  email      VARCHAR(160) DEFAULT NULL,
  phone      VARCHAR(40)  DEFAULT NULL,
  stage      ENUM('Lead','Opportunity','Customer','Churned') NOT NULL DEFAULT 'Lead',
  value      DECIMAL(12,2) NOT NULL DEFAULT 0,
  owner      VARCHAR(120) DEFAULT NULL,
  last_touch DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  BUDGETS
-- ============================================================
CREATE TABLE budgets (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  campaign  VARCHAR(180) NOT NULL,
  channel   ENUM('Email','PPC','Social','Display','Event') NOT NULL DEFAULT 'Email',
  allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent     DECIMAL(12,2) NOT NULL DEFAULT 0,
  committed DECIMAL(12,2) NOT NULL DEFAULT 0,
  quarter   VARCHAR(8) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  TASKS
-- ============================================================
CREATE TABLE tasks (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  title     VARCHAR(200) NOT NULL,
  campaign  VARCHAR(180) DEFAULT NULL,
  assignee  VARCHAR(120) DEFAULT NULL,
  priority  ENUM('High','Medium','Low') NOT NULL DEFAULT 'Medium',
  status    ENUM('To Do','In Progress','Review','Done') NOT NULL DEFAULT 'To Do',
  due       DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  EVENTS (calendar)
-- ============================================================
CREATE TABLE events (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  day   TINYINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  color VARCHAR(20) DEFAULT 'gray'
) ENGINE=InnoDB;

-- ============================================================
--  APPROVALS  (steps stored as JSON array)
-- ============================================================
CREATE TABLE approvals (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  item      VARCHAR(200) NOT NULL,
  type      ENUM('Creative','Budget','Contract','Campaign') NOT NULL DEFAULT 'Budget',
  requester VARCHAR(120) DEFAULT NULL,
  amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  submitted DATE DEFAULT NULL,
  stage     TINYINT NOT NULL DEFAULT 0,
  status    ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  steps     JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  icon   VARCHAR(60) DEFAULT NULL,
  color  VARCHAR(20) DEFAULT NULL,
  title  VARCHAR(180) NOT NULL,
  body   TEXT,
  time   VARCHAR(40) DEFAULT NULL,
  unread TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  time   DATETIME DEFAULT NULL,
  user   VARCHAR(120) DEFAULT NULL,
  action VARCHAR(160) NOT NULL,
  target VARCHAR(200) DEFAULT NULL,
  type   ENUM('create','update','delete','export','system','auth','approve') NOT NULL DEFAULT 'update',
  ip     VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
--  ROLE PERMISSIONS  (matrix: one row per area, bool per role)
-- ============================================================
CREATE TABLE role_permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  area          VARCHAR(80) NOT NULL,
  admin_allow   TINYINT(1) NOT NULL DEFAULT 0,
  manager_allow TINYINT(1) NOT NULL DEFAULT 0,
  editor_allow  TINYINT(1) NOT NULL DEFAULT 0,
  viewer_allow  TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ============================================================
--  PASSWORD RESETS  (for forgot-password flow)
-- ============================================================
CREATE TABLE password_resets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(160) NOT NULL,
  token      VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token)
) ENGINE=InnoDB;


-- ============================================================
--  SEED DATA
-- ============================================================

-- Users -------------------------------------------------------
-- NOTE: password_hash placeholder below is overwritten by seed_users.php
--       so the bcrypt hashes are generated by PHP (correct + portable).
INSERT INTO users (name, email, password_hash, role, team, status, last_active) VALUES
('Maya Chen','maya.chen@acme.com','PLACEHOLDER','Admin','Growth','Active',NOW()),
('Daniel Ross','daniel.ross@acme.com','PLACEHOLDER','Manager','Demand Gen','Active',NOW()),
('Priya Nair','priya.nair@acme.com','PLACEHOLDER','Manager','Events','Active',NOW()),
('Liam O''Brien','liam.obrien@acme.com','PLACEHOLDER','Editor','Brand','Active',NOW()),
('Sofia Marquez','sofia.marquez@acme.com','PLACEHOLDER','Editor','Lifecycle','Active',NOW()),
('Noah Kim','noah.kim@acme.com','PLACEHOLDER','Editor','Social','Invited',NULL),
('Ava Thompson','ava.thompson@acme.com','PLACEHOLDER','Viewer','Analytics','Active',NOW()),
('Ethan Wu','ethan.wu@acme.com','PLACEHOLDER','Viewer','Paid Media','Suspended',NULL);

-- Campaigns ---------------------------------------------------
INSERT INTO campaigns (name, channel, status, owner, budget, spent, leads, roi, start_date, end_date, progress) VALUES
('Summer Launch 2026','Email','Active','Maya Chen',48000,31200,1240,3.1,'2026-05-01','2026-07-15',65),
('Q2 Product Webinar','Social','Active','Daniel Ross',22000,18400,860,2.4,'2026-04-10','2026-06-20',84),
('Retargeting — Cart Abandon','PPC','Active','Priya Nair',15000,9700,540,4.2,'2026-05-20','2026-08-01',41),
('Brand Awareness — APAC','Display','Paused','Liam O''Brien',60000,22300,410,1.2,'2026-03-01','2026-09-30',37),
('Spring Newsletter Series','Email','Completed','Sofia Marquez',12000,12000,980,5.6,'2026-02-01','2026-04-30',100),
('Influencer Collab — Fitness','Social','Draft','Noah Kim',35000,0,0,0,'2026-07-01','2026-09-15',0),
('Search — Branded Keywords','PPC','Active','Ava Thompson',28000,16800,1120,3.8,'2026-04-01','2026-12-31',60),
('Holiday Teaser','Display','Draft','Ethan Wu',40000,0,0,0,'2026-10-15','2026-12-24',0),
('Customer Win-back','Email','Active','Maya Chen',9000,6300,320,2.9,'2026-05-05','2026-06-30',70),
('LinkedIn Thought Leadership','Social','Active','Daniel Ross',18000,7400,290,1.9,'2026-05-12','2026-08-30',32),
('Trade Show — TechExpo','Event','Completed','Priya Nair',54000,51800,670,2.2,'2026-03-18','2026-03-22',100),
('Free Trial Push','PPC','Paused','Sofia Marquez',25000,11200,480,1.6,'2026-04-22','2026-07-22',45);

-- Leads -------------------------------------------------------
INSERT INTO leads (name, company, email, score, status, source, value, owner, created) VALUES
('Jordan Blake','Northwind Co','j.blake@northwind.io',92,'Qualified','Email',24000,'Maya Chen','2026-05-28'),
('Rosa Mendez','Brightpath','rosa@brightpath.com',78,'Contacted','PPC',12000,'Daniel Ross','2026-05-27'),
('Wei Zhang','Lumen Analytics','wei.z@lumen.ai',85,'Qualified','Social',38000,'Priya Nair','2026-05-26'),
('Tomas Berg','Fjord Labs','tomas@fjordlabs.no',41,'New','Display',6000,'Liam O''Brien','2026-05-26'),
('Aisha Khan','Vertex Retail','a.khan@vertex.com',67,'Contacted','Email',15500,'Sofia Marquez','2026-05-25'),
('Marcus Hale','Cobalt Mfg','m.hale@cobalt.co',88,'Proposal','Event',52000,'Noah Kim','2026-05-24'),
('Lena Petrova','Skyward SaaS','lena@skyward.app',73,'Qualified','Social',28000,'Ava Thompson','2026-05-23'),
('Owen Carter','Harbor Freight','owen.c@harbor.com',29,'New','PPC',4000,'Ethan Wu','2026-05-23'),
('Nadia Rahman','Pulse Health','n.rahman@pulse.io',81,'Proposal','Email',44000,'Maya Chen','2026-05-22'),
('Diego Santos','Andes Logistics','diego@andes.cl',55,'Contacted','Display',9800,'Daniel Ross','2026-05-21'),
('Hannah Wells','Meadow Foods','hannah@meadow.com',64,'New','Social',13000,'Priya Nair','2026-05-20'),
('Sam Okafor','Trailhead Inc','sam.o@trailhead.io',90,'Qualified','Event',60000,'Liam O''Brien','2026-05-19'),
('Yuki Tanaka','Sakura Tech','yuki@sakuratech.jp',76,'Contacted','PPC',21000,'Sofia Marquez','2026-05-18'),
('Grace Miller','Beacon Edu','grace@beacon.edu',48,'New','Email',7500,'Noah Kim','2026-05-17');

-- Contacts ----------------------------------------------------
INSERT INTO contacts (name, company, title, email, phone, stage, value, owner, last_touch) VALUES
('Elaine Foster','Northwind Co','VP Marketing','elaine@northwind.io','+1 415 555 0192','Customer',120000,'Maya Chen','2026-05-29'),
('Raj Patel','Lumen Analytics','Head of Growth','raj@lumen.ai','+1 408 555 0148','Opportunity',84000,'Priya Nair','2026-05-28'),
('Clara Nilsson','Fjord Labs','CMO','clara@fjordlabs.no','+47 22 555 019','Lead',32000,'Liam O''Brien','2026-05-25'),
('Victor Cruz','Vertex Retail','Director, Demand Gen','victor@vertex.com','+1 312 555 0177','Customer',156000,'Sofia Marquez','2026-05-30'),
('Amara Diallo','Pulse Health','Growth Lead','amara@pulse.io','+1 646 555 0123','Opportunity',67000,'Maya Chen','2026-05-27'),
('Felix Brandt','Cobalt Mfg','Marketing Manager','felix@cobalt.co','+49 30 555 0166','Lead',28000,'Noah Kim','2026-05-22'),
('Ines Lopez','Andes Logistics','CEO','ines@andes.cl','+56 2 555 0188','Churned',0,'Daniel Ross','2026-04-30'),
('Oscar Lindqvist','Skyward SaaS','VP Sales','oscar@skyward.app','+46 8 555 0144','Customer',98000,'Ava Thompson','2026-05-31'),
('Bianca Rossi','Meadow Foods','Brand Director','bianca@meadow.com','+39 06 555 0133','Opportunity',51000,'Priya Nair','2026-05-26'),
('Kwame Mensah','Trailhead Inc','Founder','kwame@trailhead.io','+1 503 555 0111','Lead',40000,'Liam O''Brien','2026-05-24');

-- Budgets -----------------------------------------------------
INSERT INTO budgets (campaign, channel, allocated, spent, committed, quarter) VALUES
('Summer Launch 2026','Email',48000,31200,8000,'Q2'),
('Q2 Product Webinar','Social',22000,18400,2000,'Q2'),
('Retargeting — Cart Abandon','PPC',15000,9700,3000,'Q2'),
('Brand Awareness — APAC','Display',60000,22300,12000,'Q2'),
('Search — Branded Keywords','PPC',28000,16800,5000,'Q2'),
('Trade Show — TechExpo','Event',54000,51800,0,'Q1'),
('Customer Win-back','Email',9000,6300,1000,'Q2'),
('LinkedIn Thought Leadership','Social',18000,7400,4000,'Q2'),
('Holiday Teaser','Display',40000,0,0,'Q4');

-- Tasks -------------------------------------------------------
INSERT INTO tasks (title, campaign, assignee, priority, status, due) VALUES
('Draft email sequence copy','Summer Launch 2026','Maya Chen','High','In Progress','2026-06-05'),
('Design webinar landing page','Q2 Product Webinar','Daniel Ross','High','In Progress','2026-06-04'),
('Set up retargeting pixels','Retargeting — Cart Abandon','Priya Nair','Medium','Done','2026-05-30'),
('Approve APAC creative','Brand Awareness — APAC','Liam O''Brien','High','Review','2026-06-06'),
('Brief influencer partners','Influencer Collab — Fitness','Noah Kim','Medium','To Do','2026-06-10'),
('QA tracking links','Search — Branded Keywords','Ava Thompson','Low','To Do','2026-06-12'),
('Write holiday teaser script','Holiday Teaser','Ethan Wu','Low','To Do','2026-06-20'),
('Segment win-back audience','Customer Win-back','Maya Chen','Medium','Done','2026-05-28'),
('Schedule LinkedIn posts','LinkedIn Thought Leadership','Daniel Ross','Medium','In Progress','2026-06-07'),
('Compile TechExpo lead list','Trade Show — TechExpo','Priya Nair','High','Review','2026-06-03'),
('A/B test subject lines','Summer Launch 2026','Sofia Marquez','Medium','To Do','2026-06-09'),
('Finalize Q3 budget request','—','Liam O''Brien','High','In Progress','2026-06-08');

-- Events ------------------------------------------------------
INSERT INTO events (day, title, color) VALUES
(2,'Win-back A/B test','blue'),
(3,'TechExpo lead review','amber'),
(4,'Webinar LP due','red'),
(4,'Standup 9:30','gray'),
(5,'Email copy due','green'),
(6,'APAC creative review','purple'),
(9,'Subject line test','blue'),
(11,'Webinar goes live','red'),
(12,'Tracking QA','gray'),
(16,'Mid-month report','amber'),
(18,'Influencer kickoff','purple'),
(20,'Holiday script due','green'),
(24,'Budget sync','blue'),
(27,'Sprint retro','gray');

-- Approvals ---------------------------------------------------
INSERT INTO approvals (item, type, requester, amount, submitted, stage, status, steps) VALUES
('Brand Awareness — APAC creative','Creative','Liam O''Brien',60000,'2026-05-31',2,'Pending','["Owner","Manager","Finance"]'),
('Holiday Teaser — $40k budget','Budget','Ethan Wu',40000,'2026-05-30',1,'Pending','["Owner","Manager","Finance"]'),
('Influencer Collab contract','Contract','Noah Kim',35000,'2026-05-29',3,'Approved','["Owner","Manager","Finance"]'),
('Q2 Webinar overspend +$2k','Budget','Daniel Ross',2000,'2026-05-28',0,'Rejected','["Owner","Manager","Finance"]'),
('Free Trial Push — relaunch','Campaign','Sofia Marquez',25000,'2026-05-27',2,'Pending','["Owner","Manager","Finance"]'),
('Search — keyword expansion','Budget','Ava Thompson',8000,'2026-05-26',3,'Approved','["Owner","Manager","Finance"]');

-- Notifications -----------------------------------------------
INSERT INTO notifications (icon, color, title, body, time, unread) VALUES
('bi-check-circle-fill','green','Influencer contract approved','Finance approved the $35k contract for Influencer Collab — Fitness.','12 min ago',1),
('bi-exclamation-triangle-fill','amber','Budget threshold reached','Q2 Product Webinar has spent 84% of its allocated budget.','1 hr ago',1),
('bi-person-plus-fill','blue','New high-value lead','Sam Okafor (Trailhead Inc) scored 90 — assigned to Liam O''Brien.','2 hr ago',1),
('bi-clock-fill','red','Task overdue','"Compile TechExpo lead list" was due today and is still in Review.','3 hr ago',0),
('bi-chat-left-text-fill','purple','Comment on Summer Launch','Maya Chen mentioned you on the email sequence draft.','5 hr ago',0),
('bi-graph-up','green','Weekly report ready','Your performance report for May 25–31 is ready to view.','Yesterday',0),
('bi-x-circle-fill','red','Approval rejected','Q2 Webinar overspend request was rejected by Finance.','Yesterday',0);

-- Audit logs --------------------------------------------------
INSERT INTO audit_logs (time, user, action, target, type, ip) VALUES
('2026-06-03 09:42:00','Maya Chen','Updated campaign','Summer Launch 2026','update','10.0.4.21'),
('2026-06-03 09:18:00','Daniel Ross','Exported report','Leads — May','export','10.0.4.55'),
('2026-06-03 08:51:00','System','Auto-paused campaign','Free Trial Push','system','—'),
('2026-06-02 17:30:00','Liam O''Brien','Submitted for approval','APAC creative','create','10.0.4.12'),
('2026-06-02 16:05:00','Priya Nair','Deleted lead','Owen Carter','delete','10.0.4.33'),
('2026-06-02 14:22:00','Ava Thompson','Logged in','—','auth','10.0.4.78'),
('2026-06-02 11:47:00','Maya Chen','Changed user role','Noah Kim → Editor','update','10.0.4.21'),
('2026-06-02 10:09:00','Finance Bot','Approved budget','Search keyword expansion','approve','—'),
('2026-06-01 18:33:00','Ethan Wu','Created campaign','Holiday Teaser','create','10.0.4.90'),
('2026-06-01 15:12:00','Sofia Marquez','Updated budget','Customer Win-back','update','10.0.4.44'),
('2026-06-01 09:05:00','System','Nightly data sync','All campaigns','system','—'),
('2026-05-31 16:48:00','Daniel Ross','Rejected approval','Q2 Webinar overspend','delete','10.0.4.55');

-- Role permissions matrix ------------------------------------
INSERT INTO role_permissions (area, admin_allow, manager_allow, editor_allow, viewer_allow) VALUES
('Campaigns',1,1,1,0),
('Leads & CRM',1,1,1,0),
('Budgets',1,1,0,0),
('Approvals',1,1,0,0),
('Reports & Export',1,1,1,1),
('User Management',1,0,0,0),
('Audit Logs',1,0,0,0),
('Billing & Settings',1,0,0,0);

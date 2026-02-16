"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = require("better-sqlite3");
var path_1 = require("path");
var dbPath = path_1.default.join(process.cwd(), 'test.db');
var db = new better_sqlite3_1.default(dbPath);
console.log('Initializing Standardized Insurance Domain SQLite Test Database...');
// 1. Create CLI_CLIENT Table
// Note: We include CLI_ClientKey as a stored column for easier joining as per standards
db.exec("\n  CREATE TABLE IF NOT EXISTS CLI_CLIENT (\n    CLI_ClientID INTEGER PRIMARY KEY AUTOINCREMENT,\n    CLI_CountryCode TEXT NOT NULL,\n    CLI_ClientKey TEXT NOT NULL, \n    CLI_Name TEXT NOT NULL,\n    CLI_Email TEXT,\n    CLI_Type TEXT DEFAULT 'Individual'\n  )\n");
// 2. Create CLI_TransactionAccounts Table
// CTA_ODSTransactionAccountID is the PK, used as the relation name in AGREEMENTS
db.exec("\n  CREATE TABLE IF NOT EXISTS CLI_TransactionAccounts (\n    CTA_ODSTransactionAccountID INTEGER PRIMARY KEY AUTOINCREMENT,\n    CTA_ClientKey TEXT NOT NULL,\n    CTA_AccountType TEXT NOT NULL,\n    CTA_Balance DECIMAL(18, 2) NOT NULL,\n    CTA_Status TEXT DEFAULT 'Active'\n  )\n");
// 3. Create AGR_AGreements Table
// Using CTA_ODSTransactionAccountID to match the related table's primary key name
db.exec("\n  CREATE TABLE IF NOT EXISTS AGR_AGreements (\n    AGR_AgreementID INTEGER PRIMARY KEY AUTOINCREMENT,\n    AGR_ODSTransactionAccountID INTEGER NOT NULL,\n    AGR_Status TEXT NOT NULL,\n    AGR_Version INTEGER NOT NULL DEFAULT 1,\n    AGR_PolicyNumber TEXT NOT NULL,\n    AGR_EffectiveDate DATE,\n    AGR_ExpiryDate DATE\n  )\n");
// 4. Create SDO_Products
db.exec("\n  CREATE TABLE IF NOT EXISTS SDO_Products (\n    SDO_ProductID INTEGER PRIMARY KEY AUTOINCREMENT,\n    SDO_Name TEXT NOT NULL,\n    SDO_Category TEXT NOT NULL\n  )\n");
// 5. Clear existing data
db.exec('DELETE FROM AGR_AGreements');
db.exec('DELETE FROM CLI_TransactionAccounts');
db.exec('DELETE FROM CLI_CLIENT');
db.exec('DELETE FROM SDO_Products');
// 6. Insert Sample Data
var insertProduct = db.prepare('INSERT INTO SDO_Products (SDO_Name, SDO_Category) VALUES (?, ?)');
var insertClient = db.prepare('INSERT INTO CLI_CLIENT (CLI_CountryCode, CLI_ClientKey, CLI_Name, CLI_Email) VALUES (?, ?, ?, ?)');
var insertAccount = db.prepare('INSERT INTO CLI_TransactionAccounts (CLI_ClientKey, CTA_AccountType, CTA_Balance) VALUES (?, ?, ?)');
var insertAgreement = db.prepare('INSERT INTO AGR_AGreements (CTA_ODSTransactionAccountID, AGR_Status, AGR_Version, AGR_PolicyNumber, AGR_EffectiveDate, AGR_ExpiryDate) VALUES (?, ?, ?, ?, ?, ?)');
// Helper to create the ClientKey
var getClientKey = function (countryCode, clientId) { return "".concat(countryCode).concat(clientId); };
// Products
insertProduct.run('Premium Life Cover', 'Life');
insertProduct.run('Comprehensive Auto', 'General');
// Clients - We need to insert and then update the Key, or perform a workaround in SQLite
// For simplicity in seeding, we'll insert with a placeholder and then update
var c1_res = insertClient.run('US', 'TEMP', 'John Doe', 'john.doe@example.com');
var c1_key = getClientKey('US', c1_res.lastInsertRowid);
db.prepare('UPDATE CLI_CLIENT SET CLI_ClientKey = ? WHERE CLI_ClientID = ?').run(c1_key, c1_res.lastInsertRowid);
var c2_res = insertClient.run('UK', 'TEMP', 'Jane Smith', 'jane.smith@example.com');
var c2_key = getClientKey('UK', c2_res.lastInsertRowid);
db.prepare('UPDATE CLI_CLIENT SET CLI_ClientKey = ? WHERE CLI_ClientID = ?').run(c2_key, c2_res.lastInsertRowid);
// Accounts
var acc1 = insertAccount.run(c1_key, 'Premium Fund', 50000.00);
var acc2 = insertAccount.run(c2_key, 'Policy Holder Account', 1500.00);
// Agreements - Using the standardized key name CTA_ODSTransactionAccountID
insertAgreement.run(acc1.lastInsertRowid, 'InForce', 1, 'POL-US-001', '2025-01-01', '2026-01-01');
insertAgreement.run(acc1.lastInsertRowid, 'InForce', 2, 'POL-US-001', '2026-01-01', '2027-01-01');
insertAgreement.run(acc1.lastInsertRowid, 'InForce', 1, 'POL-US-002', '2025-02-01', '2026-02-01');
insertAgreement.run(acc2.lastInsertRowid, 'Pending', 1, 'POL-UK-999', '2025-03-01', '2026-03-01');
console.log('Standardized seeding completed successfully!');
db.close();

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'test.db');
const db = new Database(dbPath);

console.log('Initializing Standardized Insurance Domain SQLite Test Database...');

// 1. Create CLI_CLIENT Table
// Note: We include CLI_ClientKey as a stored column for easier joining as per standards
db.exec(`
  CREATE TABLE IF NOT EXISTS CLI_CLIENT (
    CLI_ClientID INTEGER PRIMARY KEY AUTOINCREMENT,
    CLI_CountryCode TEXT NOT NULL,
    CLI_ClientKey TEXT NOT NULL, 
    CLI_Name TEXT NOT NULL,
    CLI_Email TEXT,
    CLI_Type TEXT DEFAULT 'Individual'
  )
`);

// 2. Create CLI_TransactionAccounts Table
// CTA_ODSTransactionAccountID is the PK, used as the relation name in AGREEMENTS
db.exec(`
  CREATE TABLE IF NOT EXISTS CLI_TransactionAccounts (
    CTA_ODSTransactionAccountID INTEGER PRIMARY KEY AUTOINCREMENT,
    CTA_ClientKey TEXT NOT NULL,
    CTA_AccountType TEXT NOT NULL,
    CTA_Balance DECIMAL(18, 2) NOT NULL,
    CTA_Status TEXT DEFAULT 'Active'
  )
`);

// 3. Create AGR_AGreements Table
// Using CTA_ODSTransactionAccountID to match the related table's primary key name
db.exec(`
  CREATE TABLE IF NOT EXISTS AGR_AGreements (
    AGR_AgreementID INTEGER PRIMARY KEY AUTOINCREMENT,
    AGR_ODSTransactionAccountID INTEGER NOT NULL,
    AGR_Status TEXT NOT NULL,
    AGR_Version INTEGER NOT NULL DEFAULT 1,
    AGR_PolicyNumber TEXT NOT NULL,
    AGR_EffectiveDate DATE,
    AGR_ExpiryDate DATE
  )
`);

// 4. Create SDO_Products
db.exec(`
  CREATE TABLE IF NOT EXISTS SDO_Products (
    SDO_ProductID INTEGER PRIMARY KEY AUTOINCREMENT,
    SDO_Name TEXT NOT NULL,
    SDO_Category TEXT NOT NULL
  )
`);

// 5. Clear existing data
db.exec('DELETE FROM AGR_AGreements');
db.exec('DELETE FROM CLI_TransactionAccounts');
db.exec('DELETE FROM CLI_CLIENT');
db.exec('DELETE FROM SDO_Products');

// 6. Insert Sample Data
const insertProduct = db.prepare('INSERT INTO SDO_Products (SDO_Name, SDO_Category) VALUES (?, ?)');
const insertClient = db.prepare('INSERT INTO CLI_CLIENT (CLI_CountryCode, CLI_ClientKey, CLI_Name, CLI_Email) VALUES (?, ?, ?, ?)');
const insertAccount = db.prepare('INSERT INTO CLI_TransactionAccounts (CTA_ClientKey, CTA_AccountType, CTA_Balance) VALUES (?, ?, ?)');
const insertAgreement = db.prepare('INSERT INTO AGR_AGreements (AGR_ODSTransactionAccountID, AGR_Status, AGR_Version, AGR_PolicyNumber, AGR_EffectiveDate, AGR_ExpiryDate) VALUES (?, ?, ?, ?, ?, ?)');

// Helper to create the ClientKey
const getClientKey = (countryCode: string, clientId: number | bigint) => `${countryCode}${clientId}`;

// Products
insertProduct.run('Premium Life Cover', 'Life');
insertProduct.run('Comprehensive Auto', 'General');

// Clients - We need to insert and then update the Key, or perform a workaround in SQLite
// For simplicity in seeding, we'll insert with a placeholder and then update
const c1_res = insertClient.run('US', 'TEMP', 'John Doe', 'john.doe@example.com');
const c1_key = getClientKey('US', c1_res.lastInsertRowid);
db.prepare('UPDATE CLI_CLIENT SET CLI_ClientKey = ? WHERE CLI_ClientID = ?').run(c1_key, c1_res.lastInsertRowid);

const c2_res = insertClient.run('UK', 'TEMP', 'Jane Smith', 'jane.smith@example.com');
const c2_key = getClientKey('UK', c2_res.lastInsertRowid);
db.prepare('UPDATE CLI_CLIENT SET CLI_ClientKey = ? WHERE CLI_ClientID = ?').run(c2_key, c2_res.lastInsertRowid);

// Accounts
const acc1 = insertAccount.run(c1_key, 'Premium Fund', 50000.00);
const acc2 = insertAccount.run(c2_key, 'Policy Holder Account', 1500.00);

// Agreements - Using the standardized key name CTA_ODSTransactionAccountID
insertAgreement.run(acc1.lastInsertRowid, 'InForce', 1, 'POL-US-001', '2025-01-01', '2026-01-01');
insertAgreement.run(acc1.lastInsertRowid, 'InForce', 2, 'POL-US-001', '2026-01-01', '2027-01-01');
insertAgreement.run(acc1.lastInsertRowid, 'InForce', 1, 'POL-US-002', '2025-02-01', '2026-02-01');
insertAgreement.run(acc2.lastInsertRowid, 'Pending', 1, 'POL-UK-999', '2025-03-01', '2026-03-01');

console.log('Standardized seeding completed successfully!');
db.close();

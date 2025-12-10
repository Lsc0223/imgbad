const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'imgbad.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS s3_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    region TEXT NOT NULL,
    bucket TEXT NOT NULL,
    access_key_id TEXT NOT NULL,
    secret_access_key TEXT NOT NULL,
    public_url_prefix TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;

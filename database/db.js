// Abstraction simple de la base SQLite
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'culture-radar.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

function getDb() {
    if (!db) {
        const needInit = !fs.existsSync(DB_PATH);
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        if (needInit) {
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
            db.exec(schema);
            console.log('[db] Schema applique sur nouvelle DB.');
        }
    }
    return db;
}

function resetDb() {
    if (db) { db.close(); db = null; }
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    return getDb();
}

module.exports = { getDb, resetDb, DB_PATH, SCHEMA_PATH };

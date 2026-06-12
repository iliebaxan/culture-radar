// Abstraction simple de la base SQLite
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'culture-radar.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

function getDb() {
    if (!db) {
        const isNew = !fs.existsSync(DB_PATH);
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        // Le schema est idempotent (CREATE TABLE/INDEX IF NOT EXISTS) : on
        // l applique a chaque ouverture pour garantir que toutes les tables
        // existent, meme si un fichier DB incomplet traine sur le disque.
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);
        if (isNew) console.log('[db] Schema applique sur nouvelle DB.');
    }
    return db;
}

function resetDb() {
    if (db) { db.close(); db = null; }
    // Supprimer aussi les fichiers WAL/SHM pour eviter tout residu corrompu
    for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    return getDb();
}

module.exports = { getDb, resetDb, DB_PATH, SCHEMA_PATH };

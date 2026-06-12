// Export SQL de la base (schema + donnees) -> exports/culture-radar.sql
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');

const db = getDb();
const outPath = path.join(__dirname, '..', 'exports', 'culture-radar.sql');

function escape(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return v;
    if (v instanceof Date) return `'${v.toISOString()}'`;
    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
    if (Buffer.isBuffer(v)) return `x'${v.toString('hex')}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
}

let sql = '-- =====================================================\n';
sql += '-- CultureRadar - Export SQL complet (schema + donnees)\n';
sql += `-- Genere le ${new Date().toISOString()}\n`;
sql += '-- =====================================================\n\n';

// Schema
sql += fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
sql += '\n\n-- =====================================================\n';
sql += '-- DONNEES\n';
sql += '-- =====================================================\n\n';

const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM ${name}`).all();
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    sql += `-- Table: ${name} (${rows.length} lignes)\n`;
    for (const r of rows) {
        const values = cols.map(c => escape(r[c])).join(', ');
        sql += `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${values});\n`;
    }
    sql += '\n';
}

fs.writeFileSync(outPath, sql, 'utf-8');
const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`[export] OK -> ${outPath} (${kb} Ko)`);

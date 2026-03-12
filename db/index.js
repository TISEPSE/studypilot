const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const initSchema = require('./schema');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'studypilot.db'));
initSchema(db);

module.exports = db;

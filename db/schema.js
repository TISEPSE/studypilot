// Initialisation du schéma SQLite
module.exports = function initSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6750A4',
      icon TEXT NOT NULL DEFAULT 'book',
      description TEXT DEFAULT '',
      target_hours INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('link','video','file')),
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      due_date TEXT DEFAULT NULL,
      done INTEGER DEFAULT 0,
      done_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      title TEXT DEFAULT '',
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_min INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS progress_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      minutes INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT DEFAULT '',
      teacher TEXT DEFAULT '',
      type TEXT DEFAULT 'Cours',
      week TEXT DEFAULT 'both',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      max_value REAL NOT NULL DEFAULT 20,
      coefficient REAL NOT NULL DEFAULT 1,
      date TEXT,
      type TEXT DEFAULT 'devoir',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations timetable
  for (const [col, def] of [
    ['room', "TEXT DEFAULT ''"],
    ['teacher', "TEXT DEFAULT ''"],
    ['type', "TEXT DEFAULT 'Cours'"],
    ['week', "TEXT DEFAULT 'both'"],
  ]) {
    try { db.exec(`ALTER TABLE timetable ADD COLUMN ${col} ${def}`); } catch(_) {}
  }

  // Migrations grades
  for (const [col, def] of [
    ['type', "TEXT DEFAULT 'devoir'"],
  ]) {
    try { db.exec(`ALTER TABLE grades ADD COLUMN ${col} ${def}`); } catch(_) {}
  }

  // Migrations tasks
  for (const [col, def] of [
    ['type', "TEXT NOT NULL DEFAULT 'autre'"],
    ['kanban_status', "TEXT NOT NULL DEFAULT 'todo'"],
    ['subtasks', "TEXT NOT NULL DEFAULT '[]'"],
    ['estimated_time', "INTEGER NOT NULL DEFAULT 0"],
  ]) {
    try { db.exec(`ALTER TABLE tasks ADD COLUMN ${col} ${def}`); } catch(_) {}
  }

  // Insertion des matières par défaut si vide
  const count = db.prepare('SELECT COUNT(*) as c FROM subjects').get().c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO subjects (name, color, icon) VALUES (?, ?, ?)');
    insert.run('Mathématiques', '#4285F4', 'calculate');
    insert.run('Français', '#EA4335', 'history_edu');
    insert.run('Histoire-Géo', '#FBBC05', 'public');
    insert.run('Anglais', '#34A853', 'language');
    insert.run('Physique-Chimie', '#673AB7', 'science');
    insert.run('SVT', '#009688', 'biotech');
  }
};

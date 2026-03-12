const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all notes (avec filtres optionnels)
router.get('/', (req, res) => {
  const { subject_id, q, pinned } = req.query;
  let sql = `SELECT n.*, s.name as subject_name, s.color as subject_color,
    (SELECT COUNT(*) FROM resources r WHERE r.note_id = n.id) as resource_count
    FROM notes n LEFT JOIN subjects s ON n.subject_id = s.id WHERE 1=1`;
  const params = [];
  if (subject_id) { sql += ' AND n.subject_id = ?'; params.push(subject_id); }
  if (pinned === '1') { sql += ' AND n.pinned = 1'; }
  if (q) { sql += ' AND (n.title LIKE ? OR n.content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY n.pinned DESC, n.updated_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET one note
router.get('/:id', (req, res) => {
  const note = db.prepare(`SELECT n.*, s.name as subject_name, s.color as subject_color FROM notes n LEFT JOIN subjects s ON n.subject_id = s.id WHERE n.id = ?`).get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note introuvable' });
  const resources = db.prepare('SELECT * FROM resources WHERE note_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...note, resources });
});

// POST create
router.post('/', (req, res) => {
  const { subject_id, title, content = '', tags = [], pinned = 0 } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titre requis' });
  const r = db.prepare(`INSERT INTO notes (subject_id,title,content,tags,pinned) VALUES (?,?,?,?,?)`).run(subject_id || null, title.trim(), content, JSON.stringify(tags), pinned ? 1 : 0);
  res.status(201).json({ id: r.lastInsertRowid });
});

// PUT update
router.put('/:id', (req, res) => {
  const { subject_id, title, content, tags, pinned } = req.body;
  const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Note introuvable' });
  db.prepare(`UPDATE notes SET subject_id=?, title=?, content=?, tags=?, pinned=?, updated_at=datetime('now') WHERE id=?`)
    .run(subject_id ?? current.subject_id, title ?? current.title, content ?? current.content, tags ? JSON.stringify(tags) : current.tags, pinned !== undefined ? (pinned ? 1 : 0) : current.pinned, req.params.id);
  res.json({ ok: true });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Resources d'une note
router.get('/:id/resources', (req, res) => {
  res.json(db.prepare('SELECT * FROM resources WHERE note_id = ? ORDER BY created_at ASC').all(req.params.id));
});

router.post('/:id/resources', (req, res) => {
  const { type, title, url } = req.body;
  if (!type || !url?.trim()) return res.status(400).json({ error: 'Type et URL requis' });
  const note = db.prepare('SELECT subject_id FROM notes WHERE id = ?').get(req.params.id);
  const r = db.prepare(`INSERT INTO resources (subject_id,note_id,type,title,url) VALUES (?,?,?,?,?)`).run(note?.subject_id || null, req.params.id, type, title || url, url.trim());
  res.status(201).json({ id: r.lastInsertRowid });
});

router.delete('/:noteId/resources/:resourceId', (req, res) => {
  db.prepare('DELETE FROM resources WHERE id = ? AND note_id = ?').run(req.params.resourceId, req.params.noteId);
  res.json({ ok: true });
});

module.exports = router;

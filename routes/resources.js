const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all resources (filtre par subject ou type)
router.get('/', (req, res) => {
  const { subject_id, type } = req.query;
  let sql = `SELECT r.*, s.name as subject_name, s.color as subject_color, n.title as note_title
    FROM resources r
    LEFT JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN notes n ON r.note_id = n.id
    WHERE 1=1`;
  const params = [];
  if (subject_id) { sql += ' AND r.subject_id = ?'; params.push(subject_id); }
  if (type) { sql += ' AND r.type = ?'; params.push(type); }
  sql += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

function validUrl(u) {
  try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; }
  catch(_) { return false; }
}

// POST standalone resource (sans note)
router.post('/', (req, res) => {
  const { subject_id, type, title, url } = req.body;
  if (!type || !url?.trim()) return res.status(400).json({ error: 'Type et URL requis' });
  if (!validUrl(url.trim())) return res.status(400).json({ error: 'URL invalide (http/https uniquement)' });
  const r = db.prepare(`INSERT INTO resources (subject_id,note_id,type,title,url) VALUES (?,NULL,?,?,?)`).run(subject_id || null, type, title || url, url.trim());
  res.status(201).json({ id: r.lastInsertRowid });
});

// PUT update resource
router.put('/:id', (req, res) => {
  const { type, title, url, subject_id } = req.body;
  const cur = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Ressource introuvable' });
  if (url && !validUrl(url)) return res.status(400).json({ error: 'URL invalide (http/https uniquement)' });
  db.prepare('UPDATE resources SET type=?,title=?,url=?,subject_id=? WHERE id=?')
    .run(type ?? cur.type, title ?? cur.title, url ?? cur.url, subject_id ?? cur.subject_id, req.params.id);
  res.json({ ok: true });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET sessions (optionnellement filtrées par semaine)
router.get('/', (req, res) => {
  const { week_start, week_end, subject_id } = req.query;
  let sql = `SELECT se.*, s.name as subject_name, s.color as subject_color FROM sessions se LEFT JOIN subjects s ON se.subject_id = s.id WHERE 1=1`;
  const params = [];
  if (week_start) { sql += ' AND se.date >= ?'; params.push(week_start); }
  if (week_end) { sql += ' AND se.date <= ?'; params.push(week_end); }
  if (subject_id) { sql += ' AND se.subject_id = ?'; params.push(subject_id); }
  sql += ' ORDER BY se.date ASC, se.start_time ASC';
  res.json(db.prepare(sql).all(...params));
});

// POST create
router.post('/', (req, res) => {
  const { subject_id, title = '', date, start_time, end_time, notes = '' } = req.body;
  if (!date || !start_time || !end_time) return res.status(400).json({ error: 'Date et horaires requis' });
  // Calcul durée
  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);
  const duration_min = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  const r = db.prepare(`INSERT INTO sessions (subject_id,title,date,start_time,end_time,duration_min,notes) VALUES (?,?,?,?,?,?,?)`).run(subject_id || null, title, date, start_time, end_time, duration_min, notes);
  res.status(201).json({ id: r.lastInsertRowid });
});

// PUT update
router.put('/:id', (req, res) => {
  const { subject_id, title, date, start_time, end_time, notes, done } = req.body;
  const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Session introuvable' });
  const newStart = start_time ?? current.start_time;
  const newEnd = end_time ?? current.end_time;
  const [sh, sm] = newStart.split(':').map(Number);
  const [eh, em] = newEnd.split(':').map(Number);
  const duration_min = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  db.prepare(`UPDATE sessions SET subject_id=?, title=?, date=?, start_time=?, end_time=?, duration_min=?, notes=?, done=? WHERE id=?`)
    .run(subject_id ?? current.subject_id, title ?? current.title, date ?? current.date, newStart, newEnd, duration_min, notes ?? current.notes, done !== undefined ? (done ? 1 : 0) : current.done, req.params.id);
  res.json({ ok: true });
});

// PATCH mark done + log progress
router.patch('/:id/done', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session introuvable' });
  db.prepare('UPDATE sessions SET done = 1 WHERE id = ?').run(req.params.id);
  // Enregistre le log de progression
  if (session.duration_min > 0) {
    db.prepare(`INSERT INTO progress_logs (subject_id,session_id,minutes,date) VALUES (?,?,?,?)`).run(session.subject_id, session.id, session.duration_min, session.date);
  }
  res.json({ ok: true });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

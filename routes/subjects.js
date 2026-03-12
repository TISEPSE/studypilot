const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all subjects avec stats
router.get('/', (req, res) => {
  const subjects = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM notes n WHERE n.subject_id = s.id) as note_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id AND t.done = 0) as pending_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id AND t.done = 1) as done_tasks,
      (SELECT COALESCE(SUM(p.minutes),0) FROM progress_logs p WHERE p.subject_id = s.id) as total_minutes
    FROM subjects s ORDER BY s.name ASC
  `).all();
  res.json(subjects);
});

// GET one subject
router.get('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Matière introuvable' });
  res.json(s);
});

const VALID_COLOR = /^#[0-9a-fA-F]{6}$/;
const VALID_ICON  = /^[a-z0-9_]{1,64}$/;
function sanitizeSubject({ name, color, icon, description, target_hours }) {
  return {
    name:         name?.trim(),
    color:        VALID_COLOR.test(color) ? color : '#6750A4',
    icon:         VALID_ICON.test(icon)   ? icon  : 'book',
    description:  typeof description === 'string' ? description.slice(0, 500) : '',
    target_hours: Number(target_hours) || 0,
  };
}

// POST create
router.post('/', (req, res) => {
  const d = sanitizeSubject({ color: '#6750A4', icon: 'book', description: '', target_hours: 0, ...req.body });
  if (!d.name) return res.status(400).json({ error: 'Nom requis' });
  const r = db.prepare(`INSERT INTO subjects (name,color,icon,description,target_hours) VALUES (?,?,?,?,?)`).run(d.name, d.color, d.icon, d.description, d.target_hours);
  res.status(201).json({ id: r.lastInsertRowid });
});

// PUT update
router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM subjects WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Matière introuvable' });
  const d = sanitizeSubject({ ...cur, ...req.body });
  db.prepare(`UPDATE subjects SET name=COALESCE(?,name), color=COALESCE(?,color), icon=COALESCE(?,icon), description=COALESCE(?,description), target_hours=COALESCE(?,target_hours), updated_at=datetime('now') WHERE id=?`)
    .run(d.name, d.color, d.icon, d.description, d.target_hours, req.params.id);
  res.json({ ok: true });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

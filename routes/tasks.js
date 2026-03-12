const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all tasks
router.get('/', (req, res) => {
  const { subject_id, done, kanban_status } = req.query;
  let sql = `SELECT t.*, s.name as subject_name, s.color as subject_color
    FROM tasks t LEFT JOIN subjects s ON t.subject_id = s.id WHERE 1=1`;
  const params = [];
  if (subject_id)    { sql += ' AND t.subject_id = ?';    params.push(subject_id); }
  if (done !== undefined) { sql += ' AND t.done = ?';     params.push(done === '1' ? 1 : 0); }
  if (kanban_status) { sql += ' AND t.kanban_status = ?'; params.push(kanban_status); }
  sql += ` ORDER BY t.done ASC,
    CASE WHEN t.due_date IS NOT NULL AND t.due_date < date('now') THEN 0 ELSE 1 END,
    t.due_date ASC NULLS LAST, t.created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

// POST create
router.post('/', (req, res) => {
  const { subject_id, title, description = '', priority = 'medium', due_date, type = 'autre', kanban_status = 'todo', subtasks = '[]', estimated_time = 0 } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titre requis' });
  const r = db.prepare(`INSERT INTO tasks (subject_id,title,description,priority,due_date,type,kanban_status,subtasks,estimated_time) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(subject_id || null, title.trim(), description, priority, due_date || null, type, kanban_status, typeof subtasks === 'string' ? subtasks : JSON.stringify(subtasks), estimated_time || 0);
  res.status(201).json({ id: r.lastInsertRowid });
});

// PUT update
router.put('/:id', (req, res) => {
  const { subject_id, title, description, priority, due_date, done, type, kanban_status, subtasks, estimated_time } = req.body;
  const cur = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Tâche introuvable' });
  const isDone = done !== undefined ? (done ? 1 : 0) : cur.done;
  const newStatus = kanban_status ?? (isDone ? 'done' : cur.kanban_status);
  const doneAt = isDone && !cur.done ? "datetime('now')" : isDone ? `'${cur.done_at}'` : 'NULL';
  db.prepare(`UPDATE tasks SET subject_id=?,title=?,description=?,priority=?,due_date=?,done=?,done_at=${doneAt},type=?,kanban_status=?,subtasks=?,estimated_time=?,updated_at=datetime('now') WHERE id=?`)
    .run(subject_id ?? cur.subject_id, title ?? cur.title, description ?? cur.description, priority ?? cur.priority,
      due_date !== undefined ? (due_date || null) : cur.due_date, isDone, type ?? cur.type, newStatus,
      subtasks !== undefined ? (typeof subtasks === 'string' ? subtasks : JSON.stringify(subtasks)) : cur.subtasks,
      estimated_time !== undefined ? (estimated_time || 0) : cur.estimated_time,
      req.params.id);
  res.json({ ok: true });
});

// PATCH toggle done
router.patch('/:id/toggle', (req, res) => {
  const cur = db.prepare('SELECT done FROM tasks WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Tâche introuvable' });
  const newDone = cur.done ? 0 : 1;
  const newStatus = newDone ? 'done' : 'todo';
  db.prepare(`UPDATE tasks SET done=?,kanban_status=?,done_at=CASE WHEN ?=1 THEN datetime('now') ELSE NULL END,updated_at=datetime('now') WHERE id=?`)
    .run(newDone, newStatus, newDone, req.params.id);
  res.json({ done: newDone });
});

// PATCH kanban status
router.patch('/:id/kanban', (req, res) => {
  const { kanban_status } = req.body;
  const cur = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Tâche introuvable' });
  const isDone = kanban_status === 'done' ? 1 : 0;
  db.prepare(`UPDATE tasks SET kanban_status=?,done=?,done_at=CASE WHEN ?=1 THEN datetime('now') ELSE done_at END,updated_at=datetime('now') WHERE id=?`)
    .run(kanban_status, isDone, isDone, req.params.id);
  res.json({ ok: true });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard stats globales (sans les heures de révision)
router.get('/', (req, res) => {
  const subjects_count = db.prepare('SELECT COUNT(*) as c FROM subjects').get().c;
  const notes_count = db.prepare('SELECT COUNT(*) as c FROM notes').get().c;
  const tasks_total = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  const tasks_done = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE done = 1').get().c;
  const tasks_pending = tasks_total - tasks_done;

  // Progression par matière (basée sur les tâches)
  const by_subject = db.prepare(`
    SELECT s.id, s.name, s.color, s.icon,
      (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id AND t.done = 0) as pending_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id) as total_tasks
    FROM subjects s
    ORDER BY s.name ASC
  `).all();

  // Notes récentes (5 dernières)
  const recent_notes = db.prepare(`
    SELECT n.id, n.title, n.updated_at, s.name as subject_name, s.color as subject_color
    FROM notes n LEFT JOIN subjects s ON n.subject_id = s.id
    ORDER BY n.updated_at DESC LIMIT 5
  `).all();

  // Tâches urgentes (high priority non faites, avec due_date)
  const urgent_tasks = db.prepare(`
    SELECT t.*, s.name as subject_name, s.color as subject_color
    FROM tasks t LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE t.done = 0 AND (t.priority = 'high' OR t.due_date <= date('now','+3 days'))
    ORDER BY t.due_date ASC NULLS LAST, t.priority DESC LIMIT 5
  `).all();

  // Prochain examen (échéance la plus proche)
  const next_exam = db.prepare(`
    SELECT t.title, t.due_date, s.name as subject_name, s.color as subject_color,
    (strftime('%s', t.due_date) - strftime('%s', 'now')) / 86400 as days_left
    FROM tasks t LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE t.done = 0 AND t.due_date >= date('now')
    ORDER BY t.due_date ASC LIMIT 1
  `).get();

  res.json({
    subjects_count, notes_count,
    tasks_total, tasks_done, tasks_pending,
    by_subject,
    recent_notes, urgent_tasks,
    next_exam
  });
});

module.exports = router;

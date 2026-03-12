const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard stats globales
router.get('/', (req, res) => {
  const subjects_count = db.prepare('SELECT COUNT(*) as c FROM subjects').get().c;
  const notes_count = db.prepare('SELECT COUNT(*) as c FROM notes').get().c;
  const tasks_total = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  const tasks_done = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE done = 1').get().c;
  const tasks_pending = tasks_total - tasks_done;
  const total_minutes = db.prepare('SELECT COALESCE(SUM(minutes),0) as m FROM progress_logs').get().m;
  const sessions_done = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE done = 1').get().c;
  const sessions_upcoming = db.prepare(`SELECT COUNT(*) as c FROM sessions WHERE done = 0 AND date >= date('now')`).get().c;

  // Sessions de cette semaine
  const week_minutes = db.prepare(`SELECT COALESCE(SUM(minutes),0) as m FROM progress_logs WHERE date >= date('now','weekday 0','-7 days')`).get().m;

  // Progression par matière
  const by_subject = db.prepare(`
    SELECT s.id, s.name, s.color, s.icon, s.target_hours,
      COALESCE(SUM(p.minutes),0) as total_minutes,
      (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id AND t.done = 0) as pending_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id) as total_tasks
    FROM subjects s LEFT JOIN progress_logs p ON p.subject_id = s.id
    GROUP BY s.id ORDER BY total_minutes DESC
  `).all();

  // Sessions à venir (5 prochaines)
  const upcoming_sessions = db.prepare(`
    SELECT se.*, s.name as subject_name, s.color as subject_color
    FROM sessions se LEFT JOIN subjects s ON se.subject_id = s.id
    WHERE se.done = 0 AND se.date >= date('now')
    ORDER BY se.date ASC, se.start_time ASC LIMIT 5
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

  // Activité des 7 derniers jours
  const daily_activity = db.prepare(`
    SELECT date, SUM(minutes) as minutes
    FROM progress_logs
    WHERE date >= date('now','-6 days')
    GROUP BY date ORDER BY date ASC
  `).all();

  res.json({
    subjects_count, notes_count,
    tasks_total, tasks_done, tasks_pending,
    total_minutes, sessions_done, sessions_upcoming,
    week_minutes, by_subject,
    upcoming_sessions, recent_notes, urgent_tasks,
    daily_activity
  });
});

module.exports = router;

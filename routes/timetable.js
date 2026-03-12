'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare(`SELECT t.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon
    FROM timetable t LEFT JOIN subjects s ON t.subject_id = s.id
    ORDER BY t.day_of_week, t.start_time`).all());
});

router.post('/', (req, res) => {
  const { subject_id, day_of_week, start_time, end_time, room='', teacher='', type='Cours', week='both' } = req.body;
  if (day_of_week === undefined || !start_time || !end_time) return res.status(400).json({ error: 'Champs requis manquants' });
  const r = db.prepare(`INSERT INTO timetable (subject_id,day_of_week,start_time,end_time,room,teacher,type,week) VALUES (?,?,?,?,?,?,?,?)`)
    .run(subject_id||null, day_of_week, start_time, end_time, room, teacher, type, week);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM timetable WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Cours introuvable' });
  const { subject_id, day_of_week, start_time, end_time, room, teacher, type, week } = req.body;
  db.prepare(`UPDATE timetable SET subject_id=?,day_of_week=?,start_time=?,end_time=?,room=?,teacher=?,type=?,week=? WHERE id=?`)
    .run(subject_id??cur.subject_id, day_of_week??cur.day_of_week, start_time??cur.start_time,
      end_time??cur.end_time, room??cur.room, teacher??cur.teacher, type??cur.type, week??cur.week, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM timetable WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

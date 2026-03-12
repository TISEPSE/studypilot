'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { subject_id } = req.query;
  let sql = `SELECT g.*, s.name as subject_name, s.color as subject_color
    FROM grades g LEFT JOIN subjects s ON g.subject_id = s.id WHERE 1=1`;
  const params = [];
  if (subject_id) { sql += ' AND g.subject_id=?'; params.push(subject_id); }
  sql += ' ORDER BY g.date DESC, g.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/averages', (req, res) => {
  const rows = db.prepare(`SELECT s.id, s.name, s.color,
    ROUND(SUM(CASE WHEN g.id IS NOT NULL THEN (g.value/g.max_value*20)*g.coefficient ELSE 0 END)/
      NULLIF(SUM(CASE WHEN g.id IS NOT NULL THEN g.coefficient ELSE 0 END),0),2) as average,
    COUNT(g.id) as count
    FROM subjects s LEFT JOIN grades g ON g.subject_id=s.id
    GROUP BY s.id ORDER BY s.name`).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { subject_id, name, value, max_value=20, coefficient=1, date, type='devoir' } = req.body;
  if (!name?.trim() || value===undefined) return res.status(400).json({ error: 'Champs requis manquants' });
  const r = db.prepare(`INSERT INTO grades (subject_id,name,value,max_value,coefficient,date,type) VALUES (?,?,?,?,?,?,?)`)
    .run(subject_id||null, name.trim(), value, max_value, coefficient, date||null, type);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM grades WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Note introuvable' });
  const { subject_id, name, value, max_value, coefficient, date, type } = req.body;
  db.prepare(`UPDATE grades SET subject_id=?,name=?,value=?,max_value=?,coefficient=?,date=?,type=? WHERE id=?`)
    .run(subject_id??cur.subject_id, name??cur.name, value??cur.value, max_value??cur.max_value,
      coefficient??cur.coefficient, date??cur.date, type??cur.type, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grades WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

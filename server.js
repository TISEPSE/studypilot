const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

// Init DB (crée le fichier et le schéma si besoin)
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false })); // CSP désactivé pour les iframes YouTube
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// API Routes
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/grades', require('./routes/grades'));

// Frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎓 StudyPilot démarré sur http://localhost:${PORT}\n`);
});

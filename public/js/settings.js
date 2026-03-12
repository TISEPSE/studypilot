'use strict';
// ── Settings Page ────────────────────────────────────────────
const SettingsPage = {
  load() {
    const mode = localStorage.getItem('sp_theme_mode') || 'light';
    const name = localStorage.getItem('sp_name') || '';
    const level = localStorage.getItem('sp_level') || '';

    const themes = [
      { mode:'light',  icon:'light_mode',      label:'Clair'   },
      { mode:'dark',   icon:'dark_mode',        label:'Sombre'  },
      { mode:'system', icon:'brightness_auto',  label:'Système' },
    ];

    document.getElementById('page-settings').innerHTML = `
      <p class="page-brief settings-page-brief">Personnalise ton espace, gère tes données et les options de l'application.</p>

      <!-- Apparence -->
      <div class="settings-block">
        <div class="settings-block-title"><span class="material-symbols-rounded">palette</span>Apparence</div>
        <div class="theme-selector">
          ${themes.map(t => `
            <button class="theme-btn ${mode === t.mode ? 'active' : ''}" onclick="SettingsPage.setTheme('${t.mode}')">
              <span class="material-symbols-rounded">${t.icon}</span>
              <span>${t.label}</span>
            </button>`).join('')}
        </div>
      </div>

      <!-- Profil -->
      <div class="settings-block">
        <div class="settings-block-title"><span class="material-symbols-rounded">person</span>Mon profil
          <span class="settings-sub">Personnalise l'accueil et les statistiques</span>
        </div>
        <div class="settings-row-2">
          <div class="fg"><label>Prénom</label><input type="text" id="settingsName" class="fg" placeholder="Prénom" value="${escHtml(name)}" style="border:1.5px solid var(--md-outline-var);border-radius:var(--r-md);padding:10px 14px;font-size:14px;background:var(--md-surface-ctr-low);outline:none;width:100%"></div>
          <div class="fg"><label>Niveau d'études</label><input type="text" id="settingsLevel" placeholder="Niveau d'études" value="${escHtml(level)}" style="border:1.5px solid var(--md-outline-var);border-radius:var(--r-md);padding:10px 14px;font-size:14px;background:var(--md-surface-ctr-low);outline:none;width:100%"></div>
        </div>
        <button class="btn-filled" onclick="SettingsPage.saveProfile()"><span class="material-symbols-rounded">save</span>Enregistrer</button>
      </div>

      <!-- Données -->
      <div class="settings-block">
        <div class="settings-block-title"><span class="material-symbols-rounded">folder_open</span>Mes données</div>
        <p class="settings-help">Exporte toutes tes matières, notes, tâches, ressources, notes et emploi du temps en JSON, ou importe une sauvegarde.</p>
        <div class="settings-data-row">
          <button class="btn-tonal" onclick="SettingsPage.exportData()"><span class="material-symbols-rounded">download</span>Exporter</button>
          <button class="btn-tonal" onclick="document.getElementById('importFile').click()"><span class="material-symbols-rounded">upload</span>Importer</button>
          <input type="file" id="importFile" accept=".json" style="display:none" onchange="SettingsPage.importData(event)">
        </div>
      </div>

      <!-- Zone dangereuse -->
      <div class="settings-block">
        <div class="settings-block-title" style="color:var(--md-error)">
          <span class="material-symbols-rounded" style="color:var(--md-error)">warning</span>Zone dangereuse
        </div>
        <p class="settings-help">Supprime définitivement toutes les données (matières, notes, tâches, sessions). Action irréversible.</p>
        <button class="btn-filled" style="background:var(--md-error);align-self:flex-start" onclick="SettingsPage.resetData()">
          <span class="material-symbols-rounded">delete_forever</span>Réinitialiser les données
        </button>
      </div>

      <!-- À propos -->
      <div class="settings-block">
        <div class="settings-block-title"><span class="material-symbols-rounded">info</span>À propos</div>
        <div style="display:flex;align-items:center;gap:14px">
          <img src="/favicon.svg" style="width:48px;height:48px;border-radius:12px;flex-shrink:0" alt="StudyPilot">
          <div>
            <div style="font-weight:600;font-size:15px">StudyPilot</div>
            <div style="font-size:12px;color:var(--md-on-surface-var);margin-top:2px">Espace de révision personnel</div>
            <div style="font-size:11px;color:var(--md-outline);margin-top:4px;font-family:'JetBrains Mono',monospace">v1.0.0</div>
          </div>
        </div>
      </div>
    `;
  },

  setTheme(mode) {
    App._applyThemeMode(mode);
    this.load();
  },

  saveProfile() {
    const name = document.getElementById('settingsName').value.trim();
    const level = document.getElementById('settingsLevel').value.trim();
    localStorage.setItem('sp_name', name);
    localStorage.setItem('sp_level', level);
    toast('Profil enregistré');
  },

  async exportData() {
    try {
      const [subjects, notes, tasks, resources, grades, timetable] = await Promise.all([
        API.get('/subjects'),
        API.get('/notes'),
        API.get('/tasks'),
        API.get('/resources'),
        API.get('/grades'),
        API.get('/timetable'),
      ]);
      const data = {
        exported_at: new Date().toISOString(),
        app: 'StudyPilot',
        version: '1.0.0',
        subjects, notes, tasks, resources, grades, timetable,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `studypilot-export-${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Export téléchargé');
    } catch(e) { toast('Erreur lors de l\'export', 'error'); }
  },

  async importData(e) {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.subjects && !data.notes && !data.tasks) { toast('Fichier invalide', 'error'); return; }

      let created = 0;
      // Import subjects first (collect ID mapping)
      const idMap = {};
      if (data.subjects) {
        for (const s of data.subjects) {
          try {
            const r = await API.post('/subjects', { name: s.name, color: s.color, icon: s.icon, description: s.description, target_hours: s.target_hours });
            idMap[s.id] = r.id; created++;
          } catch(_) {}
        }
      }
      if (data.notes) {
        for (const n of data.notes) {
          try {
            await API.post('/notes', { title: n.title, content: n.content, subject_id: idMap[n.subject_id] || null, pinned: n.pinned });
            created++;
          } catch(_) {}
        }
      }
      if (data.tasks) {
        for (const t of data.tasks) {
          try {
            await API.post('/tasks', { title: t.title, description: t.description, subject_id: idMap[t.subject_id] || null, priority: t.priority, due_date: t.due_date });
            created++;
          } catch(_) {}
        }
      }
      if (data.grades) {
        for (const g of data.grades) {
          try {
            await API.post('/grades', { subject_id: idMap[g.subject_id] || null, name: g.name, value: g.value, max_value: g.max_value, coefficient: g.coefficient, type: g.type, date: g.date });
            created++;
          } catch(_) {}
        }
      }
      if (data.timetable) {
        for (const s of data.timetable) {
          try {
            await API.post('/timetable', { subject_id: idMap[s.subject_id] || null, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, room: s.room, teacher: s.teacher, type: s.type, week: s.week });
            created++;
          } catch(_) {}
        }
      }
      toast(`Import terminé — ${created} éléments ajoutés`);
      await App.loadSubjects();
      e.target.value = '';
    } catch(err) { toast('Fichier JSON invalide', 'error'); }
  },

  async resetData() {
    if (!confirm('Supprimer TOUTES les données ? Cette action est irréversible.')) return;
    if (!confirm('Dernière confirmation : tout sera effacé.')) return;
    try {
      const [subjects, notes, tasks, resources, grades, timetable] = await Promise.all([
        API.get('/subjects'), API.get('/notes'), API.get('/tasks'), API.get('/resources'), API.get('/grades'), API.get('/timetable'),
      ]);
      await Promise.all([
        ...grades.map(g => API.del(`/grades/${g.id}`)),
        ...timetable.map(s => API.del(`/timetable/${s.id}`)),
        ...resources.map(r => API.del(`/resources/${r.id}`)),
        ...tasks.map(t => API.del(`/tasks/${t.id}`)),
        ...notes.map(n => API.del(`/notes/${n.id}`)),
        ...subjects.map(s => API.del(`/subjects/${s.id}`)),
      ]);
      toast('Toutes les données ont été supprimées');
      await App.loadSubjects();
      App.goTo('dashboard');
    } catch(e) { toast('Erreur lors de la réinitialisation', 'error'); }
  },
};

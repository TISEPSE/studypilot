'use strict';
// ── Subjects Page ────────────────────────────────────────────
const SubjectsPage = {
  async load() {
    const subjects = await API.get('/subjects');
    const grid = document.getElementById('subjectsGrid');
    if (!subjects.length) {
      grid.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">auto_stories</span><p>Ajoutez votre première matière !</p></div>';
      return;
    }
    grid.innerHTML = subjects.map(s => {
      const pct = s.target_hours > 0 ? Math.min(100, Math.round((s.total_minutes||0) / (s.target_hours * 60) * 100)) : null;
      return `
      <div class="subj-card">
        <div class="subj-stripe" style="background:${escHtml(s.color||'#006B5E')}"></div>
        <div class="subj-body">
          <div class="subj-top">
            <div class="subj-icon" style="background:${hexAlpha(s.color||'#006B5E',.15)}">
              <span class="material-symbols-rounded" style="color:${escHtml(s.color||'#006B5E')}">${escHtml(s.icon||'book')}</span>
            </div>
            <div style="flex:1;min-width:0">
              <div class="subj-name">${escHtml(s.name)}</div>
              ${s.description ? `<div class="subj-desc">${escHtml(s.description)}</div>` : ''}
            </div>
          </div>
          <div class="subj-stats">
            <span class="subj-stat"><span class="material-symbols-rounded">edit_note</span>${s.note_count||0} note${s.note_count!==1?'s':''}</span>
            <span class="subj-stat"><span class="material-symbols-rounded">task_alt</span>${s.pending_tasks||0} tâche${s.pending_tasks!==1?'s':''}</span>
            <span class="subj-stat"><span class="material-symbols-rounded">timer</span>${fmtMinutes(s.total_minutes||0)}</span>
          </div>
          ${pct !== null ? `
            <div class="prog-bar"><div class="prog-bar-fill" style="width:${pct}%;background:${s.color||'#006B5E'}"></div></div>
            <div style="font-size:11px;color:var(--md-on-surface-var);margin-top:4px">${pct}% · objectif ${s.target_hours}h</div>` : ''}
          <div class="subj-actions">
            <button class="btn-text" onclick="SubjectsPage.openEdit(${s.id})"><span class="material-symbols-rounded">edit</span> Modifier</button>
            <button class="icon-btn" style="margin-left:auto" onclick="SubjectsPage.delete(${s.id})" title="Supprimer"><span class="material-symbols-rounded">delete</span></button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  openNew() {
    document.getElementById('subjectId').value = '';
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectColor').value = '#006B5E';
    document.getElementById('subjectDescription').value = '';
    document.getElementById('modalSubjectTitle').textContent = 'Nouvelle matière';
    this._currentIcon = 'book';
    renderIconPicker('iconPicker', 'book', ic => { this._currentIcon = ic; });
    App.openModal('modalSubject');
  },

  async openEdit(id) {
    const s = await API.get(`/subjects/${id}`);
    document.getElementById('subjectId').value = s.id;
    document.getElementById('subjectName').value = s.name;
    document.getElementById('subjectColor').value = s.color || '#006B5E';
    document.getElementById('subjectDescription').value = s.description || '';
    document.getElementById('modalSubjectTitle').textContent = 'Modifier la matière';
    this._currentIcon = s.icon || 'book';
    renderIconPicker('iconPicker', this._currentIcon, ic => { this._currentIcon = ic; });
    App.openModal('modalSubject');
  },

  async save() {
    const id = document.getElementById('subjectId').value;
    const data = {
      name: document.getElementById('subjectName').value.trim(),
      color: document.getElementById('subjectColor').value,
      icon: this._currentIcon || 'book',
      description: document.getElementById('subjectDescription').value.trim(),
    };
    if (!data.name) { toast('Le nom est requis', 'error'); return; }
    try {
      if (id) await API.put(`/subjects/${id}`, data);
      else await API.post('/subjects', data);
      App.closeModal('modalSubject');
      toast(id ? 'Matière modifiée' : 'Matière ajoutée');
      this.load();
      await App.loadSubjects();
    } catch(e) { toast(e.message, 'error'); }
  },

  async delete(id) {
    if (!await App.confirmDelete('Supprimer cette matière ? Les notes et tâches associées seront également supprimées.')) return;
    try {
      await API.del(`/subjects/${id}`);
      toast('Matière supprimée');
      this.load();
      await App.loadSubjects();
    } catch(e) { toast(e.message, 'error'); }
  },

  _currentIcon: 'book',
};

'use strict';
const GradesPage = {
  _grades: [],
  _selectedSubjectId: null,

  async load() {
    this._selectedSubjectId = null;
    await this._fetchAndRender();
  },

  async _fetchAndRender() {
    this._grades = await API.get('/grades');
    this._render();
  },

  _render() {
    const content = document.getElementById('gradesContent');
    const subjects = App.subjects;

    if (this._selectedSubjectId) {
      this._renderSubjectDetails(content);
    } else {
      this._renderSubjectsList(content, subjects);
    }
  },

  _renderSubjectsList(content, subjects) {
    if (!subjects.length) {
      content.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">auto_stories</span><p>Ajoutez d\'abord des matières dans l\'onglet Matières.</p></div>';
      return;
    }

    const gradesBySubj = {};
    this._grades.forEach(g => {
      if (!gradesBySubj[g.subject_id]) gradesBySubj[g.subject_id] = [];
      gradesBySubj[g.subject_id].push(g);
    });

    content.innerHTML = `
      <div class="grades-subjects-grid">
        ${subjects.map(s => {
          const subjGrades = gradesBySubj[s.id] || [];
          const avg = this._average(subjGrades);
          const avgClass = avg === null ? '' : 'avg-' + (avg >= 14 ? 'great' : avg >= 10 ? 'good' : avg >= 8 ? 'warn' : 'bad');
          return `
            <div class="grades-subj-card" onclick="GradesPage.selectSubject(${s.id})">
              <div class="gs-card-icon" style="background:${hexAlpha(s.color || '#006B5E', .15)};color:${s.color || '#006B5E'}">
                <span class="material-symbols-rounded">${s.icon || 'book'}</span>
              </div>
              <div class="gs-card-body">
                <div class="gs-card-name">${escHtml(s.name)}</div>
                <div class="gs-card-count">${subjGrades.length} note${subjGrades.length !== 1 ? 's' : ''}</div>
              </div>
              ${avg !== null ? `<div class="gs-card-avg ${avgClass}">${avg.toFixed(2)}</div>` : '<div class="gs-card-avg empty">—</div>'}
            </div>`;
        }).join('')}
      </div>`;
  },

  _renderSubjectDetails(content) {
    const subj = App.subjects.find(s => s.id === this._selectedSubjectId);
    if (!subj) { this._selectedSubjectId = null; this._render(); return; }

    const subjGrades = this._grades.filter(g => g.subject_id === subj.id);
    const avg = this._average(subjGrades);
    const avgClass = avg === null ? '' : 'avg-' + (avg >= 14 ? 'great' : avg >= 10 ? 'good' : avg >= 8 ? 'warn' : 'bad');

    content.innerHTML = `
      <div class="grades-detail-head">
        <button class="btn-text" onclick="GradesPage.selectSubject(null)"><span class="material-symbols-rounded">arrow_back</span> Retour</button>
        <div class="gd-title-wrap">
          <span class="gs-dot" style="background:${subj.color}"></span>
          <h2 class="gd-title">${escHtml(subj.name)}</h2>
          ${avg !== null ? `<span class="gs-avg ${avgClass}">${avg.toFixed(2)}/20</span>` : ''}
        </div>
      </div>
      <div class="grades-table">
        <div class="gt-header"><span>Intitulé</span><span>Type</span><span>Note</span><span>Coeff.</span><span>Date</span><span></span></div>
        ${subjGrades.length ? subjGrades.map(g => {
          const _v = parseFloat(g.value), _m = parseFloat(g.max_value);
          const on20 = (!isNaN(_v) && !isNaN(_m) && _m > 0) ? (_v / _m * 20) : null;
          const cls = 'gv-' + (on20 === null || on20 < 8 ? 'bad' : on20 >= 14 ? 'great' : on20 >= 10 ? 'good' : 'warn');
          return `
            <div class="gt-row">
              <span class="gt-name">${escHtml(g.name)}</span>
              <span class="gt-type">${escHtml(g.type)}</span>
              <span class="gt-val ${cls}">${on20 !== null ? `${_v}/${_m}<small> (${on20.toFixed(1)}/20)</small>` : '—'}</span>
              <span class="gt-coeff">×${g.coefficient}</span>
              <span class="gt-date">${g.date ? fmtDate(g.date) : '—'}</span>
              <span class="gt-actions">
                <button class="icon-btn" onclick="GradesPage.openEdit(${g.id})" title="Modifier"><span class="material-symbols-rounded">edit</span></button>
                <button class="icon-btn" onclick="GradesPage.delete(${g.id})" title="Supprimer"><span class="material-symbols-rounded">delete</span></button>
              </span>
            </div>`;
        }).join('') : '<div class="empty-hint">Aucune note pour cette matière</div>'}
      </div>`;
  },

  selectSubject(id) {
    this._selectedSubjectId = id;
    this._render();
  },

  _average(grades) {
    if (!grades.length) return null;
    const totalW = grades.reduce((s, g) => s + g.coefficient, 0);
    if (!totalW) return null;
    const sumW = grades.reduce((s, g) => s + (g.value / g.max_value * 20) * g.coefficient, 0);
    return sumW / totalW;
  },

  openNew() {
    document.getElementById('gradeId').value = '';
    document.getElementById('gradeSubject').value = this._selectedSubjectId || '';
    document.getElementById('gradeName').value = '';
    document.getElementById('gradeValue').value = '';
    document.getElementById('gradeMax').value = '20';
    document.getElementById('gradeCoeff').value = '1';
    document.getElementById('gradeType').value = 'devoir';
    document.getElementById('modalGradeTitle').textContent = 'Ajouter une note';
    App.openModal('modalGrade');
  },

  openEdit(id) {
    const g = this._grades.find(x => x.id === id);
    if (!g) return;
    document.getElementById('gradeId').value = g.id;
    document.getElementById('gradeSubject').value = g.subject_id || '';
    document.getElementById('gradeName').value = g.name;
    document.getElementById('gradeValue').value = g.value;
    document.getElementById('gradeMax').value = g.max_value;
    document.getElementById('gradeCoeff').value = g.coefficient;
    document.getElementById('gradeType').value = g.type || 'devoir';
    document.getElementById('modalGradeTitle').textContent = 'Modifier la note';
    App.openModal('modalGrade');
  },

  async save() {
    const id = document.getElementById('gradeId').value;
    const value = parseFloat(document.getElementById('gradeValue').value);
    const max = parseFloat(document.getElementById('gradeMax').value) || 20;
    if (isNaN(value)) { toast('Note invalide', 'error'); return; }
    const data = {
      subject_id: document.getElementById('gradeSubject').value || null,
      name: document.getElementById('gradeName').value.trim(),
      value, max_value: max,
      coefficient: parseFloat(document.getElementById('gradeCoeff').value) || 1,
      date: today(),
      type: document.getElementById('gradeType').value,
    };
    if (!data.name) { toast('Intitulé requis', 'error'); return; }
    try {
      if (id) await API.put(`/grades/${id}`, data);
      else await API.post('/grades', data);
      App.closeModal('modalGrade');
      toast(id ? 'Note modifiée' : 'Note ajoutée');
      this._fetchAndRender();
    } catch (e) { toast(e.message, 'error'); }
  },

  async delete(id) {
    if (!await App.confirmDelete('Supprimer cette note ?')) return;
    try {
      await API.del(`/grades/${id}`);
      toast('Note supprimée');
      this._fetchAndRender();
    } catch (e) { toast(e.message, 'error'); }
  },
};

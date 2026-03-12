'use strict';
const NotesPage = {
  _notes: [],
  _resources: [],
  _selectedSubjectId: null,

  async load() {
    this._selectedSubjectId = null;
    await this._fetchAndRender();
  },

  async _fetchAndRender() {
    this._notes = await API.get('/notes');
    this._render();
  },

  _render() {
    const content = document.getElementById('notesContent');
    if (!content) return;
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

    const notesBySubj = {};
    this._notes.forEach(n => {
      if (!notesBySubj[n.subject_id]) notesBySubj[n.subject_id] = [];
      notesBySubj[n.subject_id].push(n);
    });

    content.innerHTML = `
      <div class="grades-subjects-grid">
        ${subjects.map(s => {
          const subjNotes = notesBySubj[s.id] || [];
          return `
            <div class="grades-subj-card" onclick="NotesPage.selectSubject(${s.id})">
              <div class="gs-card-icon" style="background:${hexAlpha(s.color || '#006B5E', .15)};color:${s.color || '#006B5E'}">
                <span class="material-symbols-rounded">${s.icon || 'book'}</span>
              </div>
              <div class="gs-card-body">
                <div class="gs-card-name">${escHtml(s.name)}</div>
                <div class="gs-card-count">${subjNotes.length} note${subjNotes.length !== 1 ? 's' : ''}</div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  _renderSubjectDetails(content) {
    const subj = App.subjects.find(s => s.id === this._selectedSubjectId);
    if (!subj) { this._selectedSubjectId = null; this._render(); return; }

    const subjNotes = this._notes.filter(n => n.subject_id === subj.id);

    content.innerHTML = `
      <div class="grades-detail-head">
        <button class="btn-text" onclick="NotesPage.selectSubject(null)"><span class="material-symbols-rounded">arrow_back</span> Retour</button>
        <div class="gd-title-wrap">
          <span class="gs-dot" style="background:${subj.color}"></span>
          <h2 class="gd-title">${escHtml(subj.name)}</h2>
        </div>
        <button class="btn-page-action" onclick="NotesPage.openNew()"><span class="material-symbols-rounded">add</span> Nouvelle note</button>
      </div>
      <div class="notes-grid">
        ${subjNotes.length ? subjNotes.map(n => `
          <div class="note-card ${n.pinned ? 'pinned' : ''}" onclick="NotesPage.openEdit(${n.id})">
            <div class="note-card-header">
              ${n.pinned ? '<span class="note-card-pin"><span class="material-symbols-rounded">push_pin</span></span>' : '<span></span>'}
            </div>
            <div class="note-card-title">${escHtml(n.title)}</div>
            ${n.content ? `<div class="note-card-excerpt">${escHtml(n.content.slice(0, 120))}${n.content.length > 120 ? '…' : ''}</div>` : ''}
            <div class="note-card-foot">
              <span class="note-card-date">${fmtDate(n.updated_at)}</span>
              ${n.resource_count > 0 ? `<span class="note-card-date"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:-2px">link</span> ${n.resource_count}</span>` : ''}
            </div>
          </div>`).join('') : '<div class="empty-hint">Aucune note pour cette matière</div>'}
      </div>`;
  },

  selectSubject(id) {
    this._selectedSubjectId = id;
    this._render();
  },

  openNew() {
    this._resources = [];
    document.getElementById('noteId').value = '';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteSubject').value = this._selectedSubjectId || '';
    document.getElementById('notePinned').checked = false;
    document.getElementById('noteDeleteBtn').style.display = 'none';
    document.getElementById('modalNoteTitle').textContent = 'Nouvelle note';
    this._renderResources();
    App.openModal('modalNote');
  },

  async openEdit(id) {
    const n = await API.get(`/notes/${id}`);
    this._resources = n.resources || [];
    document.getElementById('noteId').value = n.id;
    document.getElementById('noteTitle').value = n.title;
    document.getElementById('noteContent').value = n.content || '';
    document.getElementById('noteSubject').value = n.subject_id || '';
    document.getElementById('notePinned').checked = !!n.pinned;
    document.getElementById('noteDeleteBtn').style.display = '';
    document.getElementById('modalNoteTitle').textContent = 'Modifier la note';
    this._renderResources();
    App.openModal('modalNote');
  },

  async delete(id) {
    if (!id || !await App.confirmDelete('Supprimer cette note ?')) return;
    try {
      await API.del(`/notes/${id}`);
      toast('Note supprimée');
      App.closeModal('modalNote');
      this._fetchAndRender();
    } catch (e) { toast(e.message, 'error'); }
  },

  async save() {
    const id = document.getElementById('noteId').value;
    const data = {
      title: document.getElementById('noteTitle').value.trim(),
      content: document.getElementById('noteContent').value,
      subject_id: document.getElementById('noteSubject').value || null,
      pinned: document.getElementById('notePinned').checked ? 1 : 0,
    };
    if (!data.title) { toast('Le titre est requis', 'error'); return; }
    try {
      let noteId = id;
      if (id) { await API.put(`/notes/${id}`, data); }
      else { const r = await API.post('/notes', data); noteId = r.id; }
      if (noteId) {
        const existing = id ? (await API.get(`/notes/${id}/resources`)) : [];
        const newIds = new Set(this._resources.filter(r => r.id).map(r => r.id));
        for (const r of existing) {
          if (!newIds.has(r.id)) await API.del(`/notes/${noteId}/resources/${r.id}`);
        }
        for (const r of this._resources) {
          if (!r.id) await API.post(`/notes/${noteId}/resources`, { type: r.type, title: r.title, url: r.url });
        }
      }
      App.closeModal('modalNote');
      toast(id ? 'Note modifiée' : 'Note créée');
      this._fetchAndRender();
    } catch (e) { toast(e.message, 'error'); }
  },

  addResource() {
    document.getElementById('resourceNoteId').value = document.getElementById('noteId').value || '__new__';
    ResourcesPage.setType('link');
    document.getElementById('resourceTitle').value = '';
    document.getElementById('resourceUrl').value = '';
    document.getElementById('resourceSubject').value = document.getElementById('noteSubject').value || '';
    App.openModal('modalResource');
  },

  _renderResources() {
    const el = document.getElementById('noteResourcesList');
    if (!el) return;
    if (!this._resources || !this._resources.length) { el.innerHTML = ''; return; }
    el.innerHTML = this._resources.map((r, i) => `
      <div class="note-res-item">
        <span class="material-symbols-rounded">${r.type === 'video' ? 'play_circle' : 'link'}</span>
        <div class="note-res-info">
          <div class="note-res-title"><a href="${escHtml(r.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escHtml(r.title || r.url)}</a></div>
          <div class="note-res-url">${escHtml(r.url)}</div>
        </div>
        <button class="icon-btn" onclick="event.stopPropagation();NotesPage._removeResource(${i})" title="Supprimer"><span class="material-symbols-rounded">close</span></button>
      </div>`).join('');
  },

  _removeResource(idx) { this._resources.splice(idx, 1); this._renderResources(); },

  _addResourceFromModal(res) {
    this._resources.push(res);
    this._renderResources();
    App.closeModal('modalResource');
  },
};

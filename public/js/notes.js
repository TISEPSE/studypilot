'use strict';
// ── Notes Page ───────────────────────────────────────────────
const NotesPage = {
  _resources: [],

  async load() {
    const q = document.getElementById('notesSearch').value.trim();
    const sid = document.getElementById('notesFilter').value;
    let url = '/notes?';
    if (q) url += `q=${encodeURIComponent(q)}&`;
    if (sid) url += `subject_id=${sid}`;
    const notes = await API.get(url);
    const grid = document.getElementById('notesGrid');
    if (!notes.length) {
      grid.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">edit_note</span><p>Aucune note trouvée</p></div>';
      return;
    }
    grid.innerHTML = notes.map(n => `
      <div class="note-card ${n.pinned ? 'pinned' : ''}" onclick="NotesPage.openEdit(${n.id})">
        <div class="note-card-header">
          ${n.subject_name ? `<span class="note-card-subj" style="background:${hexAlpha(n.subject_color||'#006B5E',.15)};color:${n.subject_color||'#006B5E'}">${escHtml(n.subject_name)}</span>` : '<span></span>'}
          ${n.pinned ? '<span class="note-card-pin"><span class="material-symbols-rounded">push_pin</span></span>' : ''}
        </div>
        <div class="note-card-title">${escHtml(n.title)}</div>
        ${n.content ? `<div class="note-card-excerpt">${escHtml(n.content.slice(0,120))}${n.content.length>120?'…':''}</div>` : ''}
        <div class="note-card-foot">
          <span class="note-card-date">${fmtDate(n.updated_at)}</span>
          ${n.resource_count > 0 ? `<span class="note-card-date"><span class="material-symbols-rounded" style="font-size:13px;vertical-align:-2px">link</span> ${n.resource_count}</span>` : ''}
        </div>
      </div>`).join('');
  },

  openNew() {
    this._resources = [];
    document.getElementById('noteId').value = '';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteSubject').value = '';
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
      this.load();
    } catch(e) { toast(e.message, 'error'); }
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
    if (!this._resources.length) { el.innerHTML = ''; return; }
    el.innerHTML = this._resources.map((r, i) => {
      const ytId = r.type === 'video' ? getYoutubeId(r.url) : null;
      return `<div class="note-res-info" style="flex:1;min-width:0">
          <div class="note-res-title"><a href="${escHtml(r.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escHtml(r.title||r.url)}</a></div>
          <div class="note-res-url">${escHtml(r.url)}</div>
        </div>
        <button class="icon-btn" onclick="event.stopPropagation();NotesPage._removeResource(${i})" title="Supprimer"><span class="material-symbols-rounded">close</span></button>
      </div>`;
    }).join('');
  },

  _removeResource(idx) { this._resources.splice(idx, 1); this._renderResources(); },

  _addResourceFromModal(res) {
    this._resources.push(res);
    this._renderResources();
    App.closeModal('modalResource');
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
      this.load();
    } catch(e) { toast(e.message, 'error'); }
  },
};

document.getElementById('notesSearch')?.addEventListener('input', () => NotesPage.load());
document.getElementById('notesFilter')?.addEventListener('change', () => NotesPage.load());

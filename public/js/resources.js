'use strict';
function safeUrl(u) {
  try { const p = new URL(u); return (p.protocol==='http:'||p.protocol==='https:') ? u : '#'; }
  catch(_) { return '#'; }
}
// ── Resources Page ───────────────────────────────────────────
const ResourcesPage = {
  _type: 'link',
  _cache: [],

  async load() {
    const type = document.querySelector('#resTypeTabs .type-tab.active')?.dataset.type || '';
    const sid = document.getElementById('resourcesFilter').value;
    let url = '/resources?';
    if (type) url += `type=${type}&`;
    if (sid) url += `subject_id=${sid}`;
    const grid = document.getElementById('resourcesGrid');
    grid.innerHTML = Array(4).fill('<div class="res-card skeleton"><div class="skeleton-media"></div><div class="skeleton-body"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div></div>').join('');
    const resources = await API.get(url);
    this._cache = resources;
    if (!resources.length) {
      grid.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">link</span><p>Aucune ressource trouvée</p></div>';
      return;
    }
    grid.innerHTML = resources.map((r, i) => {
      const ytId = r.type === 'video' ? getYoutubeId(r.url) : null;
      let domain = '';
      try { domain = new URL(r.url).hostname.replace(/^www\./, ''); } catch(e) {}

      let mediaHtml;
      if (ytId) {
        mediaHtml = `
          <a class="res-media" href="${escHtml(safeUrl(r.url))}" target="_blank" rel="noopener">
            <img src="https://img.youtube.com/vi/${encodeURIComponent(ytId)}/hqdefault.jpg" alt="${escHtml(r.title)}">
          </a>
          <a class="res-play-overlay" href="${escHtml(safeUrl(r.url))}" target="_blank" rel="noopener"><span class="material-symbols-rounded">play_circle</span></a>`;
      } else {
        const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : '';
        const faviconImg = faviconUrl
          ? `<img class="res-favicon" src="${faviconUrl}" alt="" onerror="this.outerHTML='<div class=\\'res-favicon-fallback\\'><span class=\\'material-symbols-rounded\\'>link</span></div>'">`
          : `<div class="res-favicon-fallback"><span class="material-symbols-rounded">link</span></div>`;
        mediaHtml = `<a class="res-link-bg" href="${escHtml(safeUrl(r.url))}" target="_blank" rel="noopener">
          ${faviconImg}
          ${domain ? `<span class="res-link-domain">${escHtml(domain)}</span>` : ''}
        </a>`;
      }

      const subLine = r.subject_name
        ? `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:${r.subject_color||'#006B5E'};display:inline-block;flex-shrink:0"></span>${escHtml(r.subject_name)}</span>`
        : (domain || '');

      return `<div class="res-card" style="--i:${i}">
        ${mediaHtml}
        <div class="res-overlay">
          <div class="res-overlay-info">
            <div class="res-overlay-title">${escHtml(r.title || r.url)}</div>
            ${subLine ? `<div class="res-overlay-sub">${subLine}</div>` : ''}
          </div>
          <div class="res-overlay-btns">
            <button class="icon-btn" onclick="event.stopPropagation();ResourcesPage.openEdit(${r.id})" title="Modifier"><span class="material-symbols-rounded">edit</span></button>
            <button class="icon-btn" onclick="event.stopPropagation();ResourcesPage.delete(${r.id})" title="Supprimer"><span class="material-symbols-rounded">delete</span></button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  openNew() {
    document.getElementById('resourceId').value = '';
    document.getElementById('resourceNoteId').value = '';
    document.getElementById('resourceTitle').value = '';
    document.getElementById('resourceUrl').value = '';
    document.getElementById('resourceSubject').value = '';
    this.setType('link');
    App.openModal('modalResource');
  },

  openEdit(id) {
    const r = this._cache.find(x => x.id === id);
    if (!r) return;
    document.getElementById('resourceId').value = r.id;
    document.getElementById('resourceNoteId').value = '';
    document.getElementById('resourceTitle').value = r.title || '';
    document.getElementById('resourceUrl').value = r.url || '';
    document.getElementById('resourceSubject').value = r.subject_id || '';
    this.setType(r.type || 'link');
    App.openModal('modalResource');
  },

  setType(type) {
    this._type = type;
    document.getElementById('resourceType').value = type;
    document.querySelectorAll('#resourceTypeTabs .res-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  },

  async _fetchYoutubeTitle(url) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.title) document.getElementById('resourceTitle').value = data.title;
    } catch(e) {}
  },

  async save() {
    const noteId = document.getElementById('resourceNoteId').value;
    const resourceId = document.getElementById('resourceId').value;
    const url = document.getElementById('resourceUrl').value.trim();
    if (!document.getElementById('resourceTitle').value && /youtube\.com\/|youtu\.be\//.test(url)) {
      await this._fetchYoutubeTitle(url);
    }
    const data = {
      type: document.getElementById('resourceType').value || 'link',
      title: document.getElementById('resourceTitle').value.trim(),
      url,
      subject_id: document.getElementById('resourceSubject').value || null,
    };
    if (!data.url) { toast("L'URL est requise", 'error'); return; }

    // Edit existing resource
    if (resourceId && !noteId) {
      try {
        await API.put(`/resources/${resourceId}`, data);
        App.closeModal('modalResource');
        document.getElementById('resourceId').value = '';
        toast('Ressource modifiée');
        this.load();
      } catch(e) { toast(e.message, 'error'); }
      return;
    }

    if (noteId === '__new__') {
      NotesPage._addResourceFromModal(data);
      return;
    }
    if (noteId && noteId !== '') {
      try {
        await API.post(`/notes/${noteId}/resources`, data);
        const updated = await API.get(`/notes/${noteId}`);
        NotesPage._resources = updated.resources || [];
        NotesPage._renderResources();
        App.closeModal('modalResource');
        toast('Ressource ajoutée');
      } catch(e) { toast(e.message, 'error'); }
      return;
    }
    try {
      await API.post('/resources', data);
      App.closeModal('modalResource');
      toast('Ressource ajoutée');
      this.load();
    } catch(e) { toast(e.message, 'error'); }
  },

  async delete(id) {
    if (!await App.confirmDelete('Supprimer cette ressource ?')) return;
    try {
      await API.del(`/resources/${id}`);
      toast('Ressource supprimée');
      this.load();
    } catch(e) { toast(e.message, 'error'); }
  },
};

// Auto-detect YouTube URL and fetch title
document.getElementById('resourceUrl')?.addEventListener('change', e => {
  const url = e.target.value.trim();
  if (!url) return;
  const isYt = /youtube\.com\/|youtu\.be\//.test(url);
  if (isYt) {
    ResourcesPage.setType('video');
    if (!document.getElementById('resourceTitle').value) {
      ResourcesPage._fetchYoutubeTitle(url);
    }
  }
});

document.getElementById('resTypeTabs')?.addEventListener('click', e => {
  const btn = e.target.closest('.type-tab');
  if (!btn) return;
  document.querySelectorAll('#resTypeTabs .type-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ResourcesPage.load();
});
document.getElementById('resourcesFilter')?.addEventListener('change', () => ResourcesPage.load());

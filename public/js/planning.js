'use strict';
// ── Planning Page ────────────────────────────────────────────
const PlanningPage = {
  _weekOffset: 0,

  load() {
    this._renderWeek();
    document.getElementById('prevWeek').onclick = () => { this._weekOffset--; this._renderWeek(); };
    document.getElementById('nextWeek').onclick = () => { this._weekOffset++; this._renderWeek(); };
    document.getElementById('todayBtn').onclick = () => { this._weekOffset = 0; this._renderWeek(); };
  },

  _getWeekDates() {
    const now = new Date();
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + this._weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  },

  async _renderWeek() {
    const days = this._getWeekDates();
    const start = days[0].toISOString().split('T')[0];
    const end = days[6].toISOString().split('T')[0];

    const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    document.getElementById('weekLabel').textContent = `${fmt(days[0])} – ${fmt(days[6])}`;

    const sessions = await API.get(`/sessions?week_start=${start}&week_end=${end}`);
    const map = {};
    sessions.forEach(s => { (map[s.date] = map[s.date] || []).push(s); });

    const todayStr = today();
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    document.getElementById('weekGrid').innerHTML = days.map((d, i) => {
      const key = d.toISOString().split('T')[0];
      const isToday = key === todayStr;
      const daySessions = map[key] || [];
      return `<div class="day-col ${isToday ? 'today' : ''}">
        <div class="day-head">
          <div class="day-name">${dayNames[i]}</div>
          <div class="day-num">${d.getDate()}</div>
        </div>
        <div class="day-sessions">
          ${daySessions.map(s => `
            <div class="sess-chip ${s.done ? 'done' : ''}" style="background:${hexAlpha(s.subject_color||'#006B5E',.18)};color:${s.subject_color||'#006B5E'}">
              <div style="min-width:0;flex:1">
                <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.subject_name || s.title || 'Session')}</div>
                <div class="sess-chip-time">${s.start_time.slice(0,5)} – ${s.end_time.slice(0,5)}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
                ${!s.done ? `<button class="icon-btn" style="width:22px;height:22px;color:inherit" onclick="PlanningPage.markDone(${s.id})" title="Terminer"><span class="material-symbols-rounded" style="font-size:14px">check_circle</span></button>` : ''}
                <button class="icon-btn" style="width:22px;height:22px;color:inherit" onclick="PlanningPage.openEdit(${s.id})" title="Modifier"><span class="material-symbols-rounded" style="font-size:14px">edit</span></button>
                <button class="icon-btn" style="width:22px;height:22px;color:inherit" onclick="PlanningPage.delete(${s.id})" title="Supprimer"><span class="material-symbols-rounded" style="font-size:14px">delete</span></button>
              </div>
            </div>`).join('')}
          <button class="day-add" onclick="PlanningPage.openNew('${key}')">+</button>
        </div>
      </div>`;
    }).join('');
  },

  openNew(date) {
    document.getElementById('sessionId').value = '';
    document.getElementById('sessionTitle').value = '';
    document.getElementById('sessionSubject').value = '';
    document.getElementById('sessionDate').value = date || today();
    document.getElementById('sessionStart').value = '09:00';
    document.getElementById('sessionEnd').value = '10:00';
    document.getElementById('sessionNotes').value = '';
    document.getElementById('modalSessionTitle').textContent = 'Nouvelle session';
    App.openModal('modalSession');
  },

  async openEdit(id) {
    const sessions = await API.get('/sessions');
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sessionId').value = s.id;
    document.getElementById('sessionTitle').value = s.title || '';
    document.getElementById('sessionSubject').value = s.subject_id || '';
    document.getElementById('sessionDate').value = s.date;
    document.getElementById('sessionStart').value = s.start_time;
    document.getElementById('sessionEnd').value = s.end_time;
    document.getElementById('sessionNotes').value = s.notes || '';
    document.getElementById('modalSessionTitle').textContent = 'Modifier la session';
    App.openModal('modalSession');
  },

  async save() {
    const id = document.getElementById('sessionId').value;
    const data = {
      title: document.getElementById('sessionTitle').value.trim(),
      subject_id: document.getElementById('sessionSubject').value || null,
      date: document.getElementById('sessionDate').value,
      start_time: document.getElementById('sessionStart').value,
      end_time: document.getElementById('sessionEnd').value,
      notes: document.getElementById('sessionNotes').value.trim(),
    };
    if (!data.date || !data.start_time || !data.end_time) { toast('Date et horaires requis', 'error'); return; }
    try {
      if (id) await API.put(`/sessions/${id}`, data);
      else await API.post('/sessions', data);
      App.closeModal('modalSession');
      toast(id ? 'Session modifiée' : 'Session ajoutée');
      this._renderWeek();
    } catch(e) { toast(e.message, 'error'); }
  },

  async markDone(id) {
    try {
      await API.patch(`/sessions/${id}/done`);
      toast('Session terminée !');
      this._renderWeek();
    } catch(e) { toast(e.message, 'error'); }
  },

  async delete(id) {
    if (!await App.confirmDelete('Supprimer cette session ?')) return;
    try {
      await API.del(`/sessions/${id}`);
      toast('Session supprimée');
      this._renderWeek();
    } catch(e) { toast(e.message, 'error'); }
  },
};

'use strict';
// ── Progress Page ────────────────────────────────────────────
const ProgressPage = {
  async load() {
    const stats = await API.get('/stats');
    this._renderBarChart(stats.daily_activity);
    this._renderDonut(stats.tasks_done, stats.tasks_pending);
    document.getElementById('progSessions').innerHTML = `
      <div class="sess-stat-row"><div class="sess-stat-val">${stats.sessions_done}</div><div class="sess-stat-label">Sessions terminées</div></div>
      <div class="sess-stat-row"><div class="sess-stat-val">${stats.sessions_upcoming}</div><div class="sess-stat-label">Sessions à venir</div></div>
      <div class="sess-stat-row"><div class="sess-stat-val">${fmtMinutes(stats.total_minutes)}</div><div class="sess-stat-label">Total révisé</div></div>
      <div class="sess-stat-row"><div class="sess-stat-val">${fmtMinutes(stats.week_minutes)}</div><div class="sess-stat-label">Cette semaine</div></div>`;
    document.getElementById('progBySubject').innerHTML = renderSubjProgList(stats.by_subject);
  },

  _renderBarChart(data) {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const map = {};
    data.forEach(d => { map[d.date] = d.minutes; });
    const slots = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      slots.push({ day: days[d.getDay() === 0 ? 6 : d.getDay() - 1], minutes: map[key] || 0, isToday: key === today() });
    }
    const max = Math.max(...slots.map(s => s.minutes), 1);
    document.getElementById('progBarChart').innerHTML = slots.map(s => `
      <div class="bar-col">
        <div class="bar-val">${s.minutes > 0 ? fmtMinutes(s.minutes) : ''}</div>
        <div class="bar-track"><div class="bar-fill" style="height:${Math.round(s.minutes / max * 100)}%;${s.isToday ? 'opacity:1' : 'opacity:.75'}"></div></div>
        <div class="bar-lbl" style="${s.isToday ? 'color:var(--md-primary);font-weight:600' : ''}">${s.day}</div>
      </div>`).join('');
  },

  _renderDonut(done, pending) {
    const total = done + pending;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const r = 38, circ = 2 * Math.PI * r;
    const dash = circ * pct / 100;
    document.getElementById('progDonut').innerHTML = `
      <svg viewBox="0 0 100 100" width="140" height="140" style="display:block;margin:0 auto">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--md-surface-ctr-highest)" stroke-width="13"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--md-primary)" stroke-width="13"
          stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
          transform="rotate(-90 50 50)" style="transition:stroke-dasharray .6s cubic-bezier(.2,0,0,1)"/>
        <text x="50" y="47" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">${pct}%</text>
        <text x="50" y="62" text-anchor="middle" font-size="10" fill="var(--md-on-surface-var)">${done}/${total}</text>
      </svg>
      <div class="donut-legend">
        <div class="donut-leg"><span class="donut-dot" style="background:var(--md-primary)"></span>Terminées (${done})</div>
        <div class="donut-leg"><span class="donut-dot" style="background:var(--md-surface-ctr-highest)"></span>À faire (${pending})</div>
      </div>`;
  },
};

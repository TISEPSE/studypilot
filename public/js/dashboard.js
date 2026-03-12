'use strict';
const DashboardPage = {
  async load() {
    const [stats, timetable] = await Promise.all([
      API.get('/stats'),
      API.get('/timetable').catch(()=>[]),
    ]);
    const h = new Date().getHours();
    const greet = h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
    const name = localStorage.getItem('sp_name');
    document.getElementById('dashGreeting').textContent = name?`${greet}, ${name} !`:`${greet} !`;

    document.getElementById('statSubjects').textContent = stats.subjects_count;
    document.getElementById('statNotes').textContent = stats.notes_count;
    document.getElementById('statTasks').textContent = stats.tasks_pending;

    // Countdown Banner
    const countdownEl = document.getElementById('countdownContent');
    if (stats.next_exam) {
      const exam = stats.next_exam;
      const days = Math.ceil(exam.days_left);
      countdownEl.innerHTML = `
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;opacity:0.8;margin-bottom:8px">Prochaine échéance</div>
        <div style="font-size:20px;font-weight:700;line-height:1.2;margin-bottom:4px">${escHtml(exam.title)}</div>
        <div style="font-size:14px;opacity:0.9;margin-bottom:12px">${escHtml(exam.subject_name)}</div>
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:32px;font-weight:800">${days === 0 ? 'Aujourd\'hui' : days}</span>
          <span style="font-size:16px;font-weight:600">${days > 0 ? (days === 1 ? 'jour' : 'jours') : ''}</span>
        </div>
      `;
      document.getElementById('countdownBanner').style.background = hexAlpha(exam.subject_color || '#6750A4', 1);
      document.getElementById('countdownBanner').style.color = '#fff';
    } else {
      countdownEl.innerHTML = '<div class="empty-hint" style="color:inherit;opacity:0.7">Aucun examen ou devoir prévu</div>';
      document.getElementById('countdownBanner').style.background = 'var(--md-surface-ctr-high)';
      document.getElementById('countdownBanner').style.color = 'var(--md-on-surface-var)';
    }

    // Today's timetable
    const todayIdx = new Date().getDay()===0?6:new Date().getDay()-1;
    const todaySlots = timetable.filter(s=>s.day_of_week===todayIdx).sort((a,b)=>a.start_time.localeCompare(b.start_time));
    const ttEl = document.getElementById('dashTodayTT');
    if(ttEl) ttEl.innerHTML = todaySlots.length
      ? todaySlots.map(s=>`
          <div class="act-item" onclick="App.goTo('timetable')">
            <div class="act-dot" style="background:${s.subject_color||'#006B5E'}"></div>
            <div class="act-main">
              <div class="act-name">${escHtml(s.subject_name||'Cours')}</div>
              <div class="act-sub">${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)} · ${escHtml(s.type)}${s.room?' · '+escHtml(s.room):''}</div>
            </div>
          </div>`).join('')
      : '<div class="empty-hint">Aucun cours aujourd\'hui</div>';

    // Urgent tasks
    const urgentEl = document.getElementById('dashUrgentTasks');
    if(urgentEl) urgentEl.innerHTML = stats.urgent_tasks?.length
      ? stats.urgent_tasks.map(t=>`
          <div class="act-item" onclick="App.goTo('subjects')">
            <div class="act-dot" style="background:${t.subject_color||'#BA1A1A'}"></div>
            <div class="act-main">
              <div class="act-name">${escHtml(t.title)}</div>
              ${t.due_date?`<div class="act-sub act-overdue">${isOverdue(t.due_date)?'En retard':'Échéance'} · ${fmtDate(t.due_date)}</div>`:''}
            </div>
          </div>`).join('')
      : '<div class="empty-hint">Aucune tâche urgente</div>';

    // Recent notes
    const nl = document.getElementById('recentNotesList');
    nl.innerHTML = stats.recent_notes.length
      ? stats.recent_notes.map(n=>`
          <div class="act-item" onclick="NotesPage.openEdit(${n.id})">
            <div class="act-dot" style="background:${n.subject_color||'#BFC9C5'}"></div>
            <div class="act-main">
              <div class="act-name">${escHtml(n.title)}</div>
              ${n.subject_name?`<div class="act-sub">${escHtml(n.subject_name)}</div>`:''}
            </div>
            <div class="act-time">${fmtDate(n.updated_at)}</div>
          </div>`).join('')
      : '<div class="empty-hint">Aucune note</div>';

    document.getElementById('dashSubjProg').innerHTML=this._renderSubjTaskList(stats.by_subject);
  },

  _renderSubjTaskList(subjects) {
    if (!subjects.length) return '<div class="empty-hint">Aucune matière</div>';
    return subjects.map(s => {
      const total = s.total_tasks || 0;
      const pending = s.pending_tasks || 0;
      const done = total - pending;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return `
        <div class="subj-prog-item">
          <div class="subj-prog-icon" style="background:${hexAlpha(s.color||'#006B5E',.15)}">
            <span class="material-symbols-rounded" style="color:${escHtml(s.color||'#006B5E')}">${escHtml(s.icon||'book')}</span>
          </div>
          <div class="subj-prog-body">
            <div class="subj-prog-row">
              <span class="subj-prog-name">${escHtml(s.name)}</span>
              <span class="subj-prog-val">${done}/${total} tâches</span>
            </div>
            <div class="prog-bar">
              <div class="prog-bar-fill" style="width:${pct}%;background:${s.color||'#006B5E'}"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  }
};

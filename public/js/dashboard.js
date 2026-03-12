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
    document.getElementById('statHours').textContent = fmtMinutes(stats.total_minutes);

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
          <div class="act-item" onclick="App.goTo('tasks')">
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

    this._renderWeekBars(stats.daily_activity);
    document.getElementById('weekTotalLbl').textContent=`${fmtMinutes(stats.week_minutes)} révisées cette semaine`;
    document.getElementById('dashSubjProg').innerHTML=renderSubjProgList(stats.by_subject);
  },

  _renderWeekBars(data) {
    const days=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const map={}; data.forEach(d=>{map[d.date]=d.minutes;});
    const slots=[];
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const key=d.toISOString().split('T')[0];
      slots.push({day:days[d.getDay()===0?6:d.getDay()-1],minutes:map[key]||0});
    }
    const max=Math.max(...slots.map(s=>s.minutes),1);
    document.getElementById('weekBars').innerHTML=slots.map(s=>`
      <div class="wbar-col">
        <div class="wbar-track"><div class="wbar-fill" style="height:${Math.round(s.minutes/max*100)}%"></div></div>
        <div class="wbar-lbl">${s.day}</div>
      </div>`).join('');
  }
};

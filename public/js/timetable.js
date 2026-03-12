'use strict';
const TimetablePage = {
  _slots: [],
  _weekFilter: 'both',

  async load() {
    this._slots = await API.get('/timetable');
    this._renderGrid();
    document.querySelectorAll('#ttWeekTabs .type-tab').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#ttWeekTabs .type-tab').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        this._weekFilter = b.dataset.week;
        this._renderGrid();
      };
    });
  },

  _toMin(t) { const [h,m] = t.split(':').map(Number); return h*60+m; },

  _renderGrid() {
    const START=7*60, HEAD=36, TOP_PAD=20;
    const DAYS=['Lun','Mar','Mer','Jeu','Ven'];
    const todayIdx = new Date().getDay()===0?6:new Date().getDay()-1;
    const filtered = this._slots.filter(s => s.week==='both'||s.week===this._weekFilter||this._weekFilter==='both');
    const byDay = {};
    for(let i=0;i<5;i++) byDay[i]=[];
    filtered.forEach(s => { if(s.day_of_week<5) byDay[s.day_of_week].push(s); });

    const timesEl = document.getElementById('ttTimes');
    let timesHtml = '';
    for(let h=7;h<=21;h++) {
      const topPx = HEAD + TOP_PAD + (h-7)*60;
      timesHtml += `<div class="tt-hlabel" style="top:${topPx}px">${h}h</div>`;
    }
    timesEl.innerHTML = timesHtml;

    document.getElementById('ttGrid').innerHTML = DAYS.map((dayName,i) => {
      const isToday = i===todayIdx;
      let hourLines='';
      for(let h=7;h<=21;h++) {
        hourLines+=`<div class="tt-hline" style="top:${TOP_PAD+(h-7)*60}px"></div>`;
      }
      const slotsHtml = byDay[i].map(s => {
        const startMin=this._toMin(s.start_time), endMin=this._toMin(s.end_time);
        const topPx = TOP_PAD + startMin - START;
        const heightPx = Math.max(endMin - startMin, 30);
        const bg=hexAlpha(s.subject_color||'#006B5E',.15);
        const border=s.subject_color||'#006B5E';
        return `<div class="tt-slot" style="top:${topPx}px;height:${heightPx}px;background:${bg};border-left:3px solid ${border};color:${border}"
          onclick="TimetablePage.openDetail(${s.id})">
          <div class="tt-slot-name">${escHtml(s.subject_name||'?')}</div>
          <div class="tt-slot-meta">${escHtml(s.type)}${s.room?' · '+escHtml(s.room):''}</div>
          <div class="tt-slot-time">${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}</div>
        </div>`;
      }).join('');
      return `<div class="tt-day-col${isToday?' today':''}">
        <div class="tt-day-head${isToday?' today':''}">${dayName}${isToday?'<span class="tt-today-dot"></span>':''}</div>
        <div class="tt-day-body">${hourLines}${slotsHtml}</div>
      </div>`;
    }).join('');
  },

  _showPanel(name) {
    document.getElementById('ttPanelDetail').style.display = name==='detail' ? '' : 'none';
    document.getElementById('ttPanelEdit').style.display   = name==='edit'   ? '' : 'none';
  },

  openDetail(id) {
    const s=this._slots.find(x=>x.id===id);
    if(!s) return;
    const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
    const WEEKS={both:'Toutes les semaines',A:'Semaine A',B:'Semaine B'};
    const color=s.subject_color||'#006B5E';
    const rows=[
      `<div class="tt-detail-row"><span class="material-symbols-rounded">schedule</span><span>${s.start_time.slice(0,5)} – ${s.end_time.slice(0,5)}</span></div>`,
      `<div class="tt-detail-row"><span class="material-symbols-rounded">calendar_today</span><span>${DAYS[s.day_of_week]||'?'}</span></div>`,
      s.room?`<div class="tt-detail-row"><span class="material-symbols-rounded">door_open</span><span>${escHtml(s.room)}</span></div>`:'',
      s.teacher?`<div class="tt-detail-row"><span class="material-symbols-rounded">person</span><span>${escHtml(s.teacher)}</span></div>`:'',
      `<div class="tt-detail-row"><span class="material-symbols-rounded">repeat</span><span>${WEEKS[s.week]||s.week}</span></div>`,
    ].filter(Boolean).join('');
    document.getElementById('ttDetailBody').innerHTML=`
      <div class="tt-detail-header">
        <span class="tt-detail-color" style="background:${color}"></span>
        <span class="tt-detail-subject">${escHtml(s.subject_name||'Sans matière')}</span>
        <span class="tt-detail-type">${escHtml(s.type||'Cours')}</span>
      </div>
      <div class="tt-detail-rows">${rows}</div>`;
    document.getElementById('ttDetailEditBtn').onclick=()=>{ this._fillEdit(s); this._showPanel('edit'); };
    this._showPanel('detail');
    App.openModal('modalTimetable');
  },

  openNew(dayIdx) {
    document.getElementById('ttId').value='';
    document.getElementById('ttSubject').value='';
    document.getElementById('ttDay').value=dayIdx!==undefined?dayIdx:0;
    document.getElementById('ttStart').value='08:00';
    document.getElementById('ttEnd').value='09:00';
    document.getElementById('ttRoom').value='';
    document.getElementById('ttTeacher').value='';
    document.getElementById('ttType').value='Cours';
    document.getElementById('ttWeek').value='both';
    document.getElementById('modalTtTitle').textContent='Ajouter un cours';
    document.getElementById('ttDeleteBtn').style.display='none';
    this._showPanel('edit');
    App.openModal('modalTimetable');
  },

  _fillEdit(s) {
    document.getElementById('ttId').value=s.id;
    document.getElementById('ttSubject').value=s.subject_id||'';
    document.getElementById('ttDay').value=s.day_of_week;
    document.getElementById('ttStart').value=s.start_time;
    document.getElementById('ttEnd').value=s.end_time;
    document.getElementById('ttRoom').value=s.room||'';
    document.getElementById('ttTeacher').value=s.teacher||'';
    document.getElementById('ttType').value=s.type||'Cours';
    document.getElementById('ttWeek').value=s.week||'both';
    document.getElementById('modalTtTitle').textContent='Modifier le cours';
    document.getElementById('ttDeleteBtn').style.display='';
  },

  async save() {
    const id=document.getElementById('ttId').value;
    const data={
      subject_id:document.getElementById('ttSubject').value||null,
      day_of_week:parseInt(document.getElementById('ttDay').value),
      start_time:document.getElementById('ttStart').value,
      end_time:document.getElementById('ttEnd').value,
      room:document.getElementById('ttRoom').value.trim(),
      teacher:document.getElementById('ttTeacher').value.trim(),
      type:document.getElementById('ttType').value,
      week:document.getElementById('ttWeek').value,
    };
    if(data.start_time>=data.end_time){toast('L\'heure de fin doit être après le début','error');return;}
    try {
      if(id) await API.put(`/timetable/${id}`,data);
      else await API.post('/timetable',data);
      App.closeModal('modalTimetable');
      toast(id?'Cours modifié':'Cours ajouté');
      this.load();
    } catch(e){toast(e.message,'error');}
  },

  async delete(id) {
    if(!await App.confirmDelete('Supprimer ce cours ?')) return;
    try {
      await API.del(`/timetable/${id}`);
      toast('Cours supprimé');
      this.load();
    } catch(e){toast(e.message,'error');}
  },
};

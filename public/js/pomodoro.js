'use strict';
const PomodoroTimer = {
  _interval: null,
  _seconds: 25*60,
  _running: false,
  _mode: 'work', // work | break | longbreak
  _cycles: 0,
  MODES: { work:25*60, break:5*60, longbreak:15*60 },
  LABELS: { work:'Travail', break:'Pause', longbreak:'Grande pause' },

  open() { App.openModal('modalPomodoro'); this._render(); },
  close() { App.closeModal('modalPomodoro'); },

  setMode(mode) {
    this._stop();
    this._mode=mode;
    this._seconds=this.MODES[mode];
    document.querySelectorAll('.pomo-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    this._render();
  },

  _start() {
    if(this._running) return;
    this._running=true;
    document.getElementById('pomoBtnStart').style.display='none';
    document.getElementById('pomoBtnPause').style.display='';
    this._updateFab();
    this._interval=setInterval(()=>{
      if(this._seconds<=0){ this._complete(); return; }
      this._seconds--;
      this._renderTime();
      this._renderProgress();
      this._updateFab();
    },1000);
  },

  _pause() {
    this._running=false;
    clearInterval(this._interval);
    document.getElementById('pomoBtnStart').style.display='';
    document.getElementById('pomoBtnPause').style.display='none';
    this._updateFab();
  },

  _stop() {
    this._pause();
    this._seconds=this.MODES[this._mode];
    this._renderTime();
    this._renderProgress();
  },

  _updateFab() {
    const fab=document.getElementById('pomoFab');
    if(!fab) return;
    if(this._running){
      const m=Math.floor(this._seconds/60).toString().padStart(2,'0');
      const s=(this._seconds%60).toString().padStart(2,'0');
      fab.classList.add('pomo-fab--running');
      fab.querySelector('.pomo-fab-label').textContent=`${m}:${s}`;
    } else {
      fab.classList.remove('pomo-fab--running');
      fab.querySelector('.pomo-fab-label').textContent='';
    }
  },

  _complete() {
    this._pause();
    this._seconds=0;
    this._renderTime();
    if(this._mode==='work'){
      this._cycles++;
      document.getElementById('pomoCycles').textContent=this._cycles;
      toast('🍅 Session terminée ! Prends une pause.','success');
      this.setMode(this._cycles%4===0?'longbreak':'break');
    } else {
      toast('Pause terminée, au travail !','success');
      this.setMode('work');
    }
  },

  _render() {
    this._renderTime();
    this._renderProgress();
    document.getElementById('pomoModeLabel').textContent=this.LABELS[this._mode];
  },

  _renderTime() {
    const m=Math.floor(this._seconds/60).toString().padStart(2,'0');
    const s=(this._seconds%60).toString().padStart(2,'0');
    const el=document.getElementById('pomoTime');
    if(el) el.textContent=`${m}:${s}`;
  },

  _renderProgress() {
    const total=this.MODES[this._mode];
    const pct=((total-this._seconds)/total)*100;
    const el=document.getElementById('pomoProgress');
    if(el) el.style.strokeDashoffset=`${283*(1-pct/100)}`;
  },
};

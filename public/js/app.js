'use strict';
const PAGE_TITLES = {
  dashboard:'Tableau de bord',timetable:'Emploi du temps',subjects:'Matières',
  notes:'Notes de cours',resources:'Ressources',
  grades:'Notes & Moyennes',progress:'Progression',settings:'Paramètres'
};
const App = {
  subjects:[],
  async init() {
    this._applyThemeMode(localStorage.getItem('sp_theme_mode') || localStorage.getItem('sp_theme') || 'light');
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => {
      if ((localStorage.getItem('sp_theme_mode') || 'light') === 'system') this._applyThemeMode('system');
    });
    document.getElementById('navCollapseBtn').onclick = () => document.body.classList.toggle('nav-collapsed');
    document.getElementById('menuBtn').onclick = () => {
      document.getElementById('sideNav').classList.toggle('mobile-open');
      document.getElementById('navScrim').classList.toggle('open');
    };
    document.getElementById('navScrim').onclick = () => {
      document.getElementById('sideNav').classList.remove('mobile-open');
      document.getElementById('navScrim').classList.remove('open');
    };
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); this.goTo(el.dataset.page); });
    });
    const topbar = document.getElementById('topbar');
    const updateTopbar = () => topbar.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', updateTopbar, { passive: true });
    updateTopbar();
    window.addEventListener('hashchange', () => {
      const page = location.hash.replace('#','') || 'dashboard';
      this._goToNoHash(page);
    });
    this._initModalBackdrops();
    await this.loadSubjects();
    const hash = location.hash.replace('#','') || 'dashboard';
    this.goTo(hash);
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hide');
    setTimeout(() => overlay.style.display = 'none', 300);
  },
  async loadSubjects() {
    try { this.subjects = await API.get('/subjects'); } catch(e) { this.subjects = []; }
    this._fillSelects();
  },
  _fillSelects() {
    ['noteSubject','resourceSubject','notesFilter','resourcesFilter','gradesFilter','ttSubject'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      const cur = el.value, isFilter = id.endsWith('Filter');
      el.innerHTML = `<option value="">${isFilter?'Toutes les matières':'Sans matière'}</option>`
        + App.subjects.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');
      el.value = cur;
    });
  },
  _goToNoHash(page) {
    if (!PAGE_TITLES[page]) page = 'dashboard';
    this._navigate(page);
  },
  goTo(page) {
    if (!PAGE_TITLES[page]) page = 'dashboard';
    location.hash = page;
    this._navigate(page);
  },
  _navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    document.getElementById('pgTitle').textContent = PAGE_TITLES[page];
    document.getElementById('sideNav').classList.remove('mobile-open');
    document.getElementById('navScrim').classList.remove('open');
    const main = document.getElementById('main');
    main.scrollTop = 0;
    window.scrollTo(0, 0);
    document.getElementById('topbar').classList.remove('scrolled');
    switch(page) {
      case 'dashboard': DashboardPage.load(); break;
      case 'subjects':  SubjectsPage.load(); break;
      case 'notes':     NotesPage.load(); break;
      case 'resources': ResourcesPage.load(); break;
      case 'timetable': TimetablePage.load(); break;
      case 'grades':    GradesPage.load(); break;
      case 'tasks':     TasksPage.load(); TasksPage.initQuickAdd(); break;
      case 'progress':  ProgressPage.load(); break;
      case 'settings':  SettingsPage.load(); break;
    }
  },
  openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => document.querySelector(`#${id} input:not([type=hidden]):not([type=color]):not([type=checkbox])`)?.focus(), 80);
  },
  closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if(!document.querySelector('.modal-scrim.open')) document.body.classList.remove('modal-open');
  },
  _initModalBackdrops() {
    document.querySelectorAll('.modal-scrim').forEach(scrim => {
      scrim.addEventListener('click', e => { if(e.target === scrim) scrim.classList.remove('open'); });
    });
  },

  // Theme: 'light' | 'dark' | 'system'
  _applyThemeMode(mode) {
    localStorage.setItem('sp_theme_mode', mode);
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const icons = { light:'light_mode', dark:'dark_mode', system:'brightness_auto' };
    // Met à jour l'icône dans la page paramètres si elle est ouverte
    const themeIcon = document.getElementById('settingsThemeIcon');
    if (themeIcon) themeIcon.textContent = icons[mode] || 'dark_mode';
  },
  _cycleTheme() {
    const cur = localStorage.getItem('sp_theme_mode') || 'light';
    const next = cur === 'light' ? 'dark' : cur === 'dark' ? 'system' : 'light';
    this._applyThemeMode(next);
  },
  async confirmDelete(msg) { return confirm(msg || 'Confirmer la suppression ?'); }
};
document.addEventListener('DOMContentLoaded', () => App.init());

'use strict';
const PAGE_TITLES = {
  dashboard:'Tableau de bord',timetable:'Emploi du temps',subjects:'Matières',
  notes:'Notes de cours',resources:'Ressources',
  grades:'Moyennes',progress:'Progression',settings:'Paramètres'
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
    
    // On attend le chargement complet avant de cacher l'overlay
    try {
      await this.loadSubjects();
      const hash = location.hash.replace('#','') || 'dashboard';
      await this._navigate(hash);
    } catch (e) {
      console.error("Erreur d'initialisation", e);
    } finally {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.classList.add('hide');
        setTimeout(() => overlay.style.display = 'none', 400);
      }
    }
  },
  async loadSubjects() {
    try { this.subjects = await API.get('/subjects'); } catch(e) { this.subjects = []; }
    this._fillSelects();
  },
  _fillSelects() {
    ['resourceSubject','resourcesFilter','ttSubject'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      const cur = el.value, isFilter = id.endsWith('Filter');
      el.innerHTML = `<option value="">${isFilter?'Toutes les matières':'Sans matière'}</option>`
        + App.subjects.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');
      el.value = cur;
    });
  },
  async _goToNoHash(page) {
    if (!PAGE_TITLES[page]) page = 'dashboard';
    await this._navigate(page);
  },
  async goTo(page) {
    if (!PAGE_TITLES[page]) page = 'dashboard';
    location.hash = page;
    await this._navigate(page);
  },
  async _navigate(page) {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const targetPage = document.getElementById(`page-${page}`);
    const targetNav = document.querySelector(`.nav-item[data-page="${page}"]`);

    // 1. On met à jour la navigation immédiatement
    navItems.forEach(n => n.classList.remove('active'));
    if (targetNav) targetNav.classList.add('active');
    document.getElementById('pgTitle').textContent = PAGE_TITLES[page];
    
    // 2. On ferme les menus mobiles
    document.getElementById('sideNav').classList.remove('mobile-open');
    document.getElementById('navScrim').classList.remove('open');

    // 3. CHARGEMENT DES DONNÉES (On attend ici)
    switch(page) {
      case 'dashboard': await DashboardPage.load(); break;
      case 'subjects':  await SubjectsPage.load(); break;
      case 'notes':     await NotesPage.load(); break;
      case 'resources': await ResourcesPage.load(); break;
      case 'timetable': await TimetablePage.load(); break;
      case 'grades':    await GradesPage.load(); break;
      case 'settings':  await SettingsPage.load(); break;
    }

    // 4. AFFICHAGE DE LA PAGE (Seulement quand les données sont prêtes)
    pages.forEach(p => p.classList.remove('active'));
    if (targetPage) targetPage.classList.add('active');

    // 5. Scroll et Topbar
    const main = document.getElementById('main');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
    document.getElementById('topbar')?.classList.remove('scrolled');
  },
  openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      document.body.classList.add('modal-open');
      setTimeout(() => el.querySelector(`input:not([type=hidden]):not([type=color]):not([type=checkbox])`)?.focus(), 80);
    }
  },
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      if(!document.querySelector('.modal-scrim.open')) document.body.classList.remove('modal-open');
    }
  },
  _initModalBackdrops() {
    document.querySelectorAll('.modal-scrim').forEach(scrim => {
      scrim.addEventListener('click', e => { if(e.target === scrim) this.closeModal(scrim.id); });
    });
  },
  _applyThemeMode(mode) {
    localStorage.setItem('sp_theme_mode', mode);
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const icons = { light:'light_mode', dark:'dark_mode', system:'brightness_auto' };
    const themeIcon = document.getElementById('settingsThemeIcon');
    if (themeIcon) themeIcon.textContent = icons[mode] || 'dark_mode';
  },
  async confirmDelete(msg) { return confirm(msg || 'Confirmer la suppression ?'); }
};
document.addEventListener('DOMContentLoaded', () => App.init());

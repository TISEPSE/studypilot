'use strict';
// ── Utilitaires partagés ────────────────────────────────────

const ICONS = ['book','calculate','science','history_edu','language','music_note',
  'sports_soccer','computer','psychology','account_balance','biotech',
  'architecture','palette','engineering','eco','public','gavel',
  'medical_services','school','code'];

function fmtDate(d) {
  if (!d) return '';
  return new Date(d.includes('T') ? d : d + 'T00:00:00')
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function fmtMinutes(min) {
  if (!min) return '0 min';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2,'0') : ''}` : `${m} min`;
}
function today() { return new Date().toISOString().split('T')[0]; }
function isOverdue(due) { return due && due < today(); }
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function hexAlpha(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function toast(msg, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  t.innerHTML = `<span class="material-symbols-rounded ico-f">${icon}</span> ${escHtml(msg)}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Markdown minimal
function renderMarkdown(md) {
  if (!md) return '';
  return escHtml(md)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^---$/gm,'<hr>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
}

// ID YouTube
function getYoutubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,20})/);
  return m ? m[1] : null;
}

// Icône picker partagé
function renderIconPicker(containerId, selected, onSelect) {
  const el = document.getElementById(containerId);
  el.innerHTML = ICONS.map(ic => `
    <div class="icon-opt ${ic === selected ? 'selected' : ''}" data-icon="${ic}" title="${ic}">
      <span class="material-symbols-rounded">${ic}</span>
    </div>
  `).join('');
  el.querySelectorAll('.icon-opt').forEach(opt => {
    opt.onclick = () => {
      el.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      if (onSelect) onSelect(opt.dataset.icon);
    };
  }).join('');
  }

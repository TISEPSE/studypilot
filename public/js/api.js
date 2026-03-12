'use strict';
// ── API Helper ──────────────────────────────────────────────
const API = {
  base: '/api',
  async _req(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const r = await fetch(this.base + path, opts);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  get: (p) => API._req('GET', p),
  post: (p, b) => API._req('POST', p, b),
  put: (p, b) => API._req('PUT', p, b),
  patch: (p, b) => API._req('PATCH', p, b ?? {}),
  del: (p) => API._req('DELETE', p),
};

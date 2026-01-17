// /js/diagnostics.js — HUD + structured logger

export const Diagnostics = (() => {
  const state = {
    mounted: false,
    visible: false,
    kv: {},
    ok: new Set(),
    fail: new Map(),
    logs: [],
    maxLogs: 200,
    buttons: {},
  };

  let el = null;

  function mount(domEl) {
    el = domEl;
    state.mounted = true;
    render();
  }

  function show() {
    state.visible = true;
    if (el) el.hidden = false;
    render();
  }

  function hide() {
    state.visible = false;
    if (el) el.hidden = true;
  }

  function toggle() {
    if (!state.visible) show(); else hide();
  }

  function kv(key, val) {
    state.kv[key] = String(val);
    render();
  }

  function ok(label) {
    state.ok.add(label);
    state.fail.delete(label);
    render();
  }

  function fail(label, err) {
    state.fail.set(label, normalizeError(err));
    state.ok.delete(label);
    log('ERROR', `${label}: ${normalizeError(err).message}`);
    render();
  }

  function log(tag, msg) {
    const line = `[${tag}] ${msg}`;
    state.logs.push(line);
    if (state.logs.length > state.maxLogs) state.logs.shift();
    // Also send to console for desktop debugging.
    try { console.log(line); } catch {}
    render();
  }

  function setButtons(snapshot) {
    state.buttons = snapshot || {};
    // avoid rendering every frame; throttle lightly
    if (performance.now() % 6 < 1) render();
  }

  function normalizeError(err) {
    if (!err) return { message: 'Unknown error', stack: '' };
    if (typeof err === 'string') return { message: err, stack: '' };
    return {
      message: err.message || String(err),
      stack: err.stack || ''
    };
  }

  function render() {
    if (!state.mounted || !el || el.hidden) return;

    const okList = [...state.ok].sort();
    const failList = [...state.fail.entries()].sort((a,b)=>a[0].localeCompare(b[0]));

    const pills = [
      `OK:${okList.length}`,
      `FAIL:${failList.length}`,
    ];

    const btn = (label, onclick) => `<button data-action="${onclick}">${label}</button>`;

    el.innerHTML = `
      <div class="row">
        <span class="pill">Scarlett VR Diagnostic</span>
        <span class="pill">${pills.join('</span><span class="pill">')}</span>
      </div>
      <div class="row" style="margin-top:8px">
        ${btn('Hide HUD', 'hide')}
        ${btn('Copy Logs', 'copy')}
        ${btn('Clear Logs', 'clear')}
      </div>

      <details open>
        <summary>Key Status</summary>
        <pre>${escapeHtml(formatKV(state.kv))}</pre>
      </details>

      <details ${failList.length ? 'open' : ''}>
        <summary>Module Health</summary>
        <pre>${escapeHtml(formatHealth(okList, failList))}</pre>
      </details>

      <details>
        <summary>Controller Buttons (live)</summary>
        <pre>${escapeHtml(formatButtons(state.buttons))}</pre>
      </details>

      <details open>
        <summary>Logs</summary>
        <pre>${escapeHtml(state.logs.join('\n'))}</pre>
      </details>
    `;

    // Bind buttons
    el.querySelectorAll('button[data-action]').forEach(b => {
      b.onclick = () => {
        const a = b.getAttribute('data-action');
        if (a === 'hide') hide();
        if (a === 'clear') { state.logs = []; render(); }
        if (a === 'copy') {
          const txt = state.logs.join('\n');
          navigator.clipboard?.writeText(txt).then(()=>log('HUD','Logs copied ✅')).catch(()=>log('HUD','Clipboard blocked'));
        }
      };
    });
  }

  function formatKV(map) {
    return Object.keys(map).sort().map(k => `${k}: ${map[k]}`).join('\n');
  }

  function formatHealth(okList, failList) {
    const okLines = okList.map(x => `✅ ${x}`);
    const failLines = failList.map(([k,v]) => `❌ ${k}: ${v.message}`);
    return [...okLines, ...failLines].join('\n') || '(none)';
  }

  function formatButtons(btns) {
    const lines = [];
    for (const hand of Object.keys(btns)) {
      lines.push(`${hand}:`);
      const b = btns[hand];
      for (const k of Object.keys(b)) {
        lines.push(`  ${k}: ${b[k]}`);
      }
    }
    return lines.join('\n') || '(no controllers)';
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;');
  }

  return { mount, show, hide, toggle, kv, ok, fail, log, setButtons };
})();

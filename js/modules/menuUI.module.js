// js/modules/menuUI.module.js
// BUILD: MENU_UI_FULL_v1
// Simple overlay menu (green theme) for Android/2D testing.

export default {
  name: "menuUI",
  init(input = {}, maybeApp) {
    const ctx = normalize(input, maybeApp);
    const { Scarlett, ui, debug } = ctx;

    const id = "scarlettMenuUI";
    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'position:fixed',
      'right:10px',
      'top:10px',
      'z-index:99999',
      'max-width:280px',
      'border-radius:14px',
      'border:1px solid rgba(90,255,180,0.35)',
      'background:rgba(0,0,0,0.62)',
      'color:#baffd7',
      'font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
      'padding:10px'
    ].join(';');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
        <div style="font-weight:900;letter-spacing:0.5px;">SCARLETT MENU</div>
        <button id="sm_hide" style="cursor:pointer;border-radius:10px;padding:6px 10px;border:1px solid rgba(90,255,180,0.35);background:rgba(0,0,0,0.25);color:#baffd7;">hide</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button id="sm_hud"    style="${btnCss()}">HUD</button>
        <button id="sm_diag"   style="${btnCss()}">DIAG</button>
        <button id="sm_mods"   style="${btnCss()}">MODULES</button>
        <button id="sm_tp"     style="${btnCss()}">TELEPORT</button>
      </div>
      <div style="margin-top:8px;opacity:0.9;">Tip: drag finger to look. Sticks move.</div>
    `;

    document.body.appendChild(el);

    const $ = (q) => el.querySelector(q);

    $('#sm_hide').onclick = () => {
      el.style.display = 'none';
      window.dispatchEvent(new CustomEvent('scarlett:menuHidden'));
    };

    $('#sm_hud').onclick  = () => (ui?.toggleHud ? ui.toggleHud() : Scarlett?.UI?.toggleHud?.());
    $('#sm_diag').onclick = () => (globalThis.SCARLETT_DIAG?.toggle ? globalThis.SCARLETT_DIAG.toggle() : null);
    $('#sm_mods').onclick = () => (Scarlett?.UI?.toggleModules?.());
    $('#sm_tp').onclick   = () => (Scarlett?.UI?.toggleTeleport?.());

    // Global hot corner: tap top-right 3 times to re-show
    let taps = 0;
    let last = 0;
    window.addEventListener('pointerdown', (e) => {
      const now = performance.now();
      if (now - last > 900) taps = 0;
      last = now;
      if (e.clientX > innerWidth - 80 && e.clientY < 80) {
        taps++;
        if (taps >= 3) {
          taps = 0;
          el.style.display = 'block';
        }
      }
    }, { passive: true });

    debug?.log?.('menuUI init ✅');

    return {
      name: 'menuUI',
      show() { el.style.display = 'block'; },
      hide() { el.style.display = 'none'; },
      dispose() { try { el.remove(); } catch {} },
    };
  }
};

function btnCss() {
  return [
    'cursor:pointer',
    'border-radius:12px',
    'padding:10px 8px',
    'border:1px solid rgba(90,255,180,0.35)',
    'background:rgba(0,0,0,0.25)',
    'color:#baffd7',
    'font-weight:800'
  ].join(';');
}

function normalize(input, maybeApp) {
  const ctx = input?.THREE ? input : null;
  const app = (ctx?.app || maybeApp || input?.app || input) || {};
  return {
    Scarlett: ctx?.Scarlett || app?.Scarlett || globalThis.Scarlett,
    ui: ctx?.ui || app?.ui || globalThis.ui,
    debug: ctx?.debug || app?.debug || globalThis.debug,
  };
}

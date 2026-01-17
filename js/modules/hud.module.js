// /js/modules/hud.module.js
// Lightweight HUD overlay (FULL)

export default {
  id: 'hud.module.js',

  async init({ log }) {
    const el = document.createElement('div');
    el.id = 'scarlettHUD';
    el.style.position = 'fixed';
    el.style.left = '10px';
    el.style.top = '10px';
    el.style.zIndex = '9999';
    el.style.fontFamily = 'system-ui, sans-serif';
    el.style.fontSize = '14px';
    el.style.color = '#fff';
    el.style.padding = '8px 10px';
    el.style.borderRadius = '10px';
    el.style.background = 'rgba(0,0,0,0.45)';
    el.style.pointerEvents = 'none';
    el.textContent = 'SCARLETT HUD';

    document.body.appendChild(el);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.hud = {
      set: (txt) => { el.textContent = String(txt ?? ''); },
      show: () => { el.style.display = 'block'; },
      hide: () => { el.style.display = 'none'; }
    };

    this._el = el;
    log?.('hud.module ✅');
  },

  update(dt) {
    const td = window.SCARLETT?.table?.data;
    const poker = window.SCARLETT?.poker?.getState?.();
    if (!this._el) return;

    const s = td?.activeSeat ?? 0;
    const dealer = td?.dealerIndex ?? 0;
    const speed = poker?.speed ?? 1;
    const paused = poker?.paused ? 'PAUSED' : 'RUN';
    this._el.textContent = `Seat:${s} Dealer:${dealer} | ${paused} | x${speed.toFixed(2)}`;
  },

  test() {
    const ok = !!window.SCARLETT?.hud;
    return { ok, note: ok ? 'HUD present' : 'HUD missing' };
  }
};

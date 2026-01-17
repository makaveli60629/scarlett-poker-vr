// js/modules/avatarUI.module.js
// BUILD: AVATAR_UI_FULL_v1
// Overlay controls to toggle local/bot avatars and (future) Meta avatar modes.

export default {
  name: "avatarUI",
  init(input = {}, maybeApp) {
    const ctx = normalize(input, maybeApp);
    const { debug } = ctx;

    const id = "scarlettAvatarUI";
    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'position:fixed','left:10px','top:10px','z-index:99999',
      'max-width:260px','border-radius:14px',
      'border:1px solid rgba(90,255,180,0.35)',
      'background:rgba(0,0,0,0.55)','color:#baffd7',
      'font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
      'padding:10px','display:none'
    ].join(';');

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
        <div style="font-weight:900;">AVATARS</div>
        <button id="av_close" style="${btnCss()}">close</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button id="av_local" style="${btnCss()}">Local</button>
        <button id="av_bots" style="${btnCss()}">Bots</button>
      </div>
      <div style="margin-top:8px;opacity:0.9;">
        Meta Avatar: <span style="opacity:0.8;">placeholder hook</span>
      </div>
    `;

    document.body.appendChild(el);

    const $ = (q) => el.querySelector(q);

    let localOn = false;
    let botsOn = true;

    function sync() {
      const av = globalThis.SCARLETT_AVATARS;
      if (av) {
        av.setLocalVisible(localOn);
        av.setBotsVisible(botsOn);
      }
      $('#av_local').textContent = `Local: ${localOn ? 'ON' : 'OFF'}`;
      $('#av_bots').textContent = `Bots: ${botsOn ? 'ON' : 'OFF'}`;
    }

    $('#av_close').onclick = () => (el.style.display = 'none');
    $('#av_local').onclick = () => { localOn = !localOn; sync(); };
    $('#av_bots').onclick = () => { botsOn = !botsOn; sync(); };

    // Show from menu or 4-tap top-left
    globalThis.SCARLETT_UI = globalThis.SCARLETT_UI || {};
    globalThis.SCARLETT_UI.showAvatars = () => { el.style.display = 'block'; sync(); };

    let taps = 0, last = 0;
    window.addEventListener('pointerdown', (e) => {
      const now = performance.now();
      if (now - last > 900) taps = 0;
      last = now;
      if (e.clientX < 90 && e.clientY < 90) {
        taps++;
        if (taps >= 4) {
          taps = 0;
          el.style.display = (el.style.display === 'none') ? 'block' : 'none';
          sync();
        }
      }
    }, { passive: true });

    sync();
    debug?.log?.('avatarUI init ✅');

    return {
      name: 'avatarUI',
      show() { el.style.display = 'block'; sync(); },
      hide() { el.style.display = 'none'; },
      dispose() { try { el.remove(); } catch {} },
    };
  }
};

function btnCss() {
  return [
    'cursor:pointer','border-radius:12px','padding:10px 8px',
    'border:1px solid rgba(90,255,180,0.35)','background:rgba(0,0,0,0.25)',
    'color:#baffd7','font-weight:800'
  ].join(';');
}

function normalize(input, maybeApp) {
  const ctx = input?.THREE ? input : null;
  const app = (ctx?.app || maybeApp || input?.app || input) || {};
  return {
    debug: ctx?.debug || app?.debug || globalThis.debug,
  };
}

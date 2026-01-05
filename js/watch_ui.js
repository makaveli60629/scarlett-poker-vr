/**
 * watch_ui.js — “watch menu” overlay (DOM)
 * Toggles with Y button (handled in controls.js).
 */
export const WatchUI = {
  _root: null,
  _open: false,
  _onNav: null,
  _onAudio: null,
  _onReset: null,

  init({ onNavigate, onAudioToggle, onReset }) {
    this._onNav = onNavigate;
    this._onAudio = onAudioToggle;
    this._onReset = onReset;

    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "50%";
    root.style.top = "65%";
    root.style.transform = "translate(-50%, -50%)";
    root.style.zIndex = "99999";
    root.style.padding = "14px";
    root.style.borderRadius = "16px";
    root.style.background = "rgba(0,0,0,0.78)";
    root.style.border = "1px solid rgba(0,255,255,0.25)";
    root.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
    root.style.color = "#fff";
    root.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
    root.style.display = "none";
    root.style.minWidth = "280px";

    root.innerHTML = `
      <div style="font-weight:700; font-size:16px; margin-bottom:10px; letter-spacing:0.3px;">
        Skylark Menu
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <button data-nav="lobby"  style="padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,180,255,0.18);color:#fff;font-weight:700;">Lobby</button>
        <button data-nav="store"  style="padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,255,180,0.16);color:#fff;font-weight:700;">Store</button>
        <button data-nav="poker"  style="padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,80,120,0.16);color:#fff;font-weight:700;">Poker</button>
        <button data-audio="1"    style="padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,200,0,0.14);color:#fff;font-weight:700;">Audio</button>
        <button data-reset="1"    style="grid-column:1 / span 2; padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.10);color:#fff;font-weight:700;">Reset</button>
      </div>

      <div style="margin-top:10px; opacity:0.85; font-size:12px;">
        Press <b>Y</b> to toggle this menu.
      </div>
    `;

    root.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button");
      if (!btn) return;
      const nav = btn.getAttribute("data-nav");
      const aud = btn.getAttribute("data-audio");
      const rst = btn.getAttribute("data-reset");

      if (nav && this._onNav) this._onNav(nav);
      if (aud && this._onAudio) this._onAudio();
      if (rst && this._onReset) this._onReset();
    });

    document.body.appendChild(root);
    this._root = root;
  },

  toggle() {
    this._open = !this._open;
    if (this._root) this._root.style.display = this._open ? "block" : "none";
  },

  close() {
    this._open = false;
    if (this._root) this._root.style.display = "none";
  }
};

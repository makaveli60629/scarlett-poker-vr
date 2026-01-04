// js/ui.js

/**
 * UI: Works on Android + Quest (DOM overlay).
 * - Notifications queue with OK
 * - Menu buttons: Lobby / Store / Poker / Audio / Spawn Chip
 * - No fullscreen blockers (all pointer-events controlled)
 */

export const UI = {
  root: null,
  toastEl: null,
  notifWrap: null,
  notifText: null,
  notifOk: null,
  menuWrap: null,
  menuOpen: false,

  init({ onTeleport, onToggleAudio, onSpawnChip }) {
    // Root overlay
    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.pointerEvents = "none";
    root.style.zIndex = "99999";
    document.body.appendChild(root);
    this.root = root;

    // Toast (bottom)
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "18px";
    toast.style.transform = "translateX(-50%)";
    toast.style.padding = "10px 14px";
    toast.style.background = "rgba(0,0,0,0.65)";
    toast.style.border = "1px solid rgba(0,255,170,0.6)";
    toast.style.borderRadius = "12px";
    toast.style.color = "white";
    toast.style.fontWeight = "800";
    toast.style.fontFamily = "system-ui, sans-serif";
    toast.style.pointerEvents = "none";
    root.appendChild(toast);
    this.toastEl = toast;

    // Notification modal (big, in-your-face but not fullscreen)
    const nw = document.createElement("div");
    nw.style.position = "fixed";
    nw.style.left = "50%";
    nw.style.top = "18%";
    nw.style.transform = "translateX(-50%)";
    nw.style.width = "min(520px, 88vw)";
    nw.style.background = "rgba(0,0,0,0.78)";
    nw.style.border = "2px solid rgba(255,60,120,0.85)";
    nw.style.borderRadius = "18px";
    nw.style.padding = "14px";
    nw.style.boxShadow = "0 0 24px rgba(255,60,120,0.18)";
    nw.style.display = "none";
    nw.style.pointerEvents = "auto";

    const nt = document.createElement("div");
    nt.style.color = "white";
    nt.style.fontFamily = "system-ui, sans-serif";
    nt.style.fontWeight = "800";
    nt.style.fontSize = "18px";
    nt.style.lineHeight = "1.3";
    nt.style.marginBottom = "12px";
    nw.appendChild(nt);

    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.style.width = "100%";
    ok.style.padding = "12px 12px";
    ok.style.borderRadius = "14px";
    ok.style.border = "1px solid rgba(0,255,170,0.6)";
    ok.style.background = "rgba(0,0,0,0.55)";
    ok.style.color = "white";
    ok.style.fontWeight = "900";
    ok.style.letterSpacing = "0.5px";
    ok.style.cursor = "pointer";
    nw.appendChild(ok);

    root.appendChild(nw);

    this.notifWrap = nw;
    this.notifText = nt;
    this.notifOk = ok;

    ok.addEventListener("click", (e) => {
      e.preventDefault();
      this.hideNotification();
    });

    // Right-side quick buttons
    const makeBtn = (text, topPx) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.style.position = "fixed";
      b.style.right = "14px";
      b.style.top = `${topPx}px`;
      b.style.padding = "10px 12px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(0,255,170,0.55)";
      b.style.background = "rgba(0,0,0,0.45)";
      b.style.color = "white";
      b.style.fontWeight = "900";
      b.style.fontFamily = "system-ui, sans-serif";
      b.style.pointerEvents = "auto";
      b.style.boxShadow = "0 0 14px rgba(0,255,170,0.15)";
      b.style.cursor = "pointer";
      return b;
    };

    const btnMenu = makeBtn("MENU", 14);
    const btnAudio = makeBtn("AUDIO", 64);
    const btnChip = makeBtn("SPAWN CHIP", 114);

    root.appendChild(btnMenu);
    root.appendChild(btnAudio);
    root.appendChild(btnChip);

    btnAudio.addEventListener("click", (e) => { e.preventDefault(); onToggleAudio?.(); });
    btnChip.addEventListener("click", (e) => { e.preventDefault(); onSpawnChip?.(); });

    // Menu panel
    const mw = document.createElement("div");
    mw.style.position = "fixed";
    mw.style.right = "14px";
    mw.style.top = "164px";
    mw.style.width = "200px";
    mw.style.padding = "10px";
    mw.style.borderRadius = "14px";
    mw.style.border = "1px solid rgba(255,60,120,0.75)";
    mw.style.background = "rgba(0,0,0,0.58)";
    mw.style.display = "none";
    mw.style.pointerEvents = "auto";

    const addMenuBtn = (label, fn) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.width = "100%";
      b.style.marginBottom = "8px";
      b.style.padding = "10px 10px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(0,255,170,0.45)";
      b.style.background = "rgba(0,0,0,0.45)";
      b.style.color = "white";
      b.style.fontWeight = "900";
      b.style.cursor = "pointer";
      b.addEventListener("click", (e) => { e.preventDefault(); fn?.(); });
      mw.appendChild(b);
    };

    addMenuBtn("LOBBY", () => onTeleport?.("lobby"));
    addMenuBtn("STORE", () => onTeleport?.("store"));
    addMenuBtn("POKER ROOM", () => onTeleport?.("poker"));
    addMenuBtn("CLOSE MENU", () => this.setMenu(false));

    root.appendChild(mw);
    this.menuWrap = mw;

    btnMenu.addEventListener("click", (e) => {
      e.preventDefault();
      this.setMenu(!this.menuOpen);
    });
  },

  toast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg || "";
    clearTimeout(this._t);
    this._t = setTimeout(() => { if (this.toastEl) this.toastEl.textContent = ""; }, 1600);
  },

  notify(msg) {
    if (!this.notifWrap) return;
    this.notifText.textContent = msg || "";
    this.notifWrap.style.display = "block";
  },

  hideNotification() {
    if (!this.notifWrap) return;
    this.notifWrap.style.display = "none";
  },

  setMenu(v) {
    this.menuOpen = !!v;
    if (this.menuWrap) this.menuWrap.style.display = this.menuOpen ? "block" : "none";
  },
};

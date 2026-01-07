// /js/dev_mode.js — Scarlett Poker VR — DEV MODE (Android/desktop)
// Provides on-screen MOVE + TURN, optional tap teleport.
// GitHub Pages safe.

export const DevMode = (() => {
  let _enabled = false;
  let _forced = false;
  let _root = null;
  let _move = { x: 0, y: 0 };
  let _turn = { x: 0, y: 0 };
  let _tapTeleport = false;
  let _onTeleport = null;

  function forceEnable(v) { _forced = !!v; }
  function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

  function shouldEnable() {
    const url = new URL(window.location.href);
    if (_forced) return true;
    if (url.searchParams.get("dev") === "1") return true;
    if (!("xr" in navigator) && isMobile()) return true;
    return false;
  }

  function _mkPad(label) {
    const d = document.createElement("div");
    d.style.position = "absolute";
    d.style.bottom = "18px";
    d.style.width = "170px";
    d.style.height = "170px";
    d.style.borderRadius = "18px";
    d.style.background = "rgba(0,0,0,0.35)";
    d.style.border = "1px solid rgba(0,255,170,0.35)";
    d.style.backdropFilter = "blur(6px)";
    d.style.display = "flex";
    d.style.alignItems = "center";
    d.style.justifyContent = "center";
    d.style.color = "rgba(0,255,170,0.8)";
    d.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    d.style.fontSize = "12px";
    d.style.userSelect = "none";
    d.style.touchAction = "none";
    d.textContent = label;

    const stick = document.createElement("div");
    stick.style.width = "64px";
    stick.style.height = "64px";
    stick.style.borderRadius = "50%";
    stick.style.background = "rgba(0,255,170,0.25)";
    stick.style.border = "1px solid rgba(0,255,170,0.5)";
    stick.style.transform = "translate(0px,0px)";
    d.appendChild(stick);

    return { pad: d, stick };
  }

  function _bindStick(pad, stick, onMove) {
    let active = false;
    let startX = 0, startY = 0;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const down = (e) => {
      active = true;
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
    };

    const move = (e) => {
      if (!active) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      const max = 48;
      const cx = clamp(dx, -max, max);
      const cy = clamp(dy, -max, max);

      stick.style.transform = `translate(${cx}px,${cy}px)`;
      onMove(cx / max, cy / max);
    };

    const up = () => {
      active = false;
      stick.style.transform = `translate(0px,0px)`;
      onMove(0, 0);
    };

    pad.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    pad.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
  }

  function init({ onTeleport } = {}) {
    _onTeleport = onTeleport || null;

    _enabled = shouldEnable();
    if (!_enabled) return { enabled: false };
    if (_root) return { enabled: true }; // already created

    _root = document.createElement("div");
    _root.id = "devHud";
    _root.style.position = "fixed";
    _root.style.left = "0";
    _root.style.top = "0";
    _root.style.width = "100%";
    _root.style.height = "100%";
    _root.style.pointerEvents = "none";
    document.body.appendChild(_root);

    const left = _mkPad("MOVE");
    left.pad.style.left = "14px";
    left.pad.style.pointerEvents = "auto";

    const right = _mkPad("TURN");
    right.pad.style.right = "14px";
    right.pad.style.pointerEvents = "auto";

    _root.appendChild(left.pad);
    _root.appendChild(right.pad);

    _bindStick(left.pad, left.stick, (x, y) => {
      _move.x = x;
      _move.y = -y; // invert for forward
    });

    _bindStick(right.pad, right.stick, (x, y) => {
      _turn.x = x;
      _turn.y = y;
    });

    const btn = document.createElement("button");
    btn.textContent = "Tap Teleport: OFF";
    btn.style.position = "absolute";
    btn.style.top = "14px";
    btn.style.right = "14px";
    btn.style.pointerEvents = "auto";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "10px";
    btn.style.border = "1px solid rgba(0,255,170,0.5)";
    btn.style.background = "rgba(0,0,0,0.55)";
    btn.style.color = "rgba(0,255,170,0.9)";
    btn.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    btn.style.fontSize = "12px";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      _tapTeleport = !_tapTeleport;
      btn.textContent = `Tap Teleport: ${_tapTeleport ? "ON" : "OFF"}`;
    };
    _root.appendChild(btn);

    window.addEventListener("pointerdown", (e) => {
      if (!_tapTeleport) return;
      if (e.target && (e.target.tagName === "BUTTON" || e.target.closest?.("#devHud"))) return;
      if (_onTeleport) _onTeleport({ x: e.clientX, y: e.clientY });
    });

    return { enabled: true };
  }

  function enabled() { return _enabled; }
  function getAxes() { return { moveX: _move.x, moveY: _move.y, turnX: _turn.x }; }

  return { init, enabled, getAxes, forceEnable };
})();

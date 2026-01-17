// /js/index.js — Scarlett Prime Entry (RESTORE + ANDROID STICKS + FULL BUTTON HUD)
// BUILD: INDEX_SPINE_ANDROID_UI_v2

const BUILD = "INDEX_SPINE_ANDROID_UI_v2";
const NOW = () => new Date().toISOString().slice(11, 19);

export async function boot({ BASE, V }) {
  const push = (s) => globalThis.SCARLETT_DIAG?.push?.(`[${NOW()}] ${s}`);

  const Scarlett = (globalThis.Scarlett = globalThis.Scarlett || {});
  Scarlett.BUILD = Scarlett.BUILD || {};
  Scarlett.BUILD.index = BUILD;
  Scarlett.BASE = BASE;
  Scarlett.V = V;

  // Android input state (joysticks/buttons)
  Scarlett.ANDROID_INPUT = Scarlett.ANDROID_INPUT || {
    moveX: 0, moveY: 0,
    turnX: 0, turnY: 0,
    teleport: false,
    interact: false,
    sit: false,
    store: false,
  };

  push?.(`[index] build=${BUILD}`);
  push?.(`[index] base=${BASE}`);

  ensureAndroidHud(Scarlett);

  // Load Scarlett1 router (your real system)
  const routerUrl = `${BASE}js/scarlett1/index.js?v=${encodeURIComponent(V)}`;
  try {
    push?.(`[index] importing router ${routerUrl}`);
    const router = await import(routerUrl);
    push?.(`[index] router imported ✅`);
    if (typeof router.boot === "function") {
      await router.boot({ Scarlett, BASE, V });
      push?.(`[index] router boot ✅`);
    } else {
      push?.(`[index] router missing boot() ❌`);
    }
  } catch (e) {
    push?.(`[index] router import FAILED ❌ ${String(e?.message || e)}`);
  }
}

function ensureAndroidHud(Scarlett) {
  if (document.getElementById("androidHud")) return;

  const hud = document.createElement("div");
  hud.id = "androidHud";
  hud.style.cssText = `
    position:fixed; left:0; right:0; bottom:0; z-index:99999;
    display:flex; flex-direction:column; gap:10px;
    padding:10px;
    pointer-events:none;
    font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
  `;

  // top row buttons
  const rowTop = document.createElement("div");
  rowTop.style.cssText = `display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between; pointer-events:auto;`;

  const leftBtns = document.createElement("div");
  leftBtns.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; align-items:center;";

  const rightBtns = document.createElement("div");
  rightBtns.style.cssText = "display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end;";

  const mkBtn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `
      cursor:pointer;
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.22);
      background:rgba(0,0,0,0.35);
      color:#eaeaea;
      padding:10px 12px;
      font-size:12px;
      pointer-events:auto;
      touch-action: manipulation;
    `;
    return b;
  };

  const bDiag = mkBtn("DIAG");
  const bHud  = mkBtn("HUD");
  const bMods = mkBtn("MODULES");
  const bHide = mkBtn("HIDE ALL");

  const bTP   = mkBtn("TELEPORT");
  const bAct  = mkBtn("INTERACT");
  const bSit  = mkBtn("SIT");
  const bStore= mkBtn("STORE");

  leftBtns.appendChild(bDiag);
  leftBtns.appendChild(bHud);
  leftBtns.appendChild(bMods);
  leftBtns.appendChild(bHide);

  rightBtns.appendChild(bTP);
  rightBtns.appendChild(bAct);
  rightBtns.appendChild(bSit);
  rightBtns.appendChild(bStore);

  rowTop.appendChild(leftBtns);
  rowTop.appendChild(rightBtns);

  // joystick row
  const rowJoy = document.createElement("div");
  rowJoy.style.cssText = `
    display:flex; align-items:flex-end; justify-content:space-between; gap:12px;
    pointer-events:none;
  `;

  const leftJoy = makeJoystick("MOVE");
  const rightJoy = makeJoystick("TURN");

  rowJoy.appendChild(leftJoy.el);
  rowJoy.appendChild(rightJoy.el);

  // wire buttons
  bDiag.onclick = () => globalThis.SCARLETT_DIAG?.toggle?.();
  bHud.onclick  = () => globalThis.Scarlett?.UI?.toggleHud?.();
  bMods.onclick = () => globalThis.SCARLETT_MODULES?.toggle?.();

  bHide.onclick = () => {
    globalThis.SCARLETT_DIAG?.hide?.();
    hud.style.display = "none";
    document.getElementById("scarlettModsPanel")?.style && (document.getElementById("scarlettModsPanel").style.display = "none");

    let chip = document.getElementById("scarlettRestoreChip");
    if (!chip) {
      chip = document.createElement("button");
      chip.id = "scarlettRestoreChip";
      chip.textContent = "SHOW UI";
      chip.style.cssText = `
        position:fixed; right:10px; top:10px; z-index:99999;
        cursor:pointer; border-radius:999px;
        border:1px solid rgba(255,255,255,0.25);
        background:rgba(0,0,0,0.55);
        color:#fff;
        padding:10px 14px;
        font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
      `;
      chip.onclick = () => {
        hud.style.display = "flex";
        globalThis.SCARLETT_DIAG?.show?.();
        chip.remove();
      };
      document.body.appendChild(chip);
    }
  };

  // Action buttons feed Scarlett.ANDROID_INPUT
  bTP.onclick = () => {
    Scarlett.ANDROID_INPUT.teleport = !Scarlett.ANDROID_INPUT.teleport;
    globalThis.Scarlett?.UI?.toggleTeleport?.();
  };

  // momentary actions
  wireMomentaryButton(bAct, () => Scarlett.ANDROID_INPUT.interact = true, () => Scarlett.ANDROID_INPUT.interact = false);
  wireMomentaryButton(bSit, () => Scarlett.ANDROID_INPUT.sit = true, () => Scarlett.ANDROID_INPUT.sit = false);
  wireMomentaryButton(bStore, () => Scarlett.ANDROID_INPUT.store = true, () => Scarlett.ANDROID_INPUT.store = false);

  // feed joystick values
  leftJoy.on((x, y) => { Scarlett.ANDROID_INPUT.moveX = x; Scarlett.ANDROID_INPUT.moveY = y; });
  rightJoy.on((x, y) => { Scarlett.ANDROID_INPUT.turnX = x; Scarlett.ANDROID_INPUT.turnY = y; });

  hud.appendChild(rowTop);
  hud.appendChild(rowJoy);
  document.body.appendChild(hud);
}

function wireMomentaryButton(btn, downFn, upFn) {
  const down = (e) => { e.preventDefault(); downFn(); };
  const up = (e) => { e.preventDefault(); upFn(); };

  btn.addEventListener("pointerdown", down, { passive: false });
  btn.addEventListener("pointerup", up, { passive: false });
  btn.addEventListener("pointercancel", up, { passive: false });
  btn.addEventListener("pointerleave", up, { passive: false });
}

// ---------- On-screen joystick ----------
function makeJoystick(label) {
  const el = document.createElement("div");
  el.style.cssText = `
    width:160px; height:160px;
    border-radius:999px;
    border:1px solid rgba(255,255,255,0.18);
    background:rgba(0,0,0,0.25);
    position:relative;
    pointer-events:auto;
    touch-action:none;
  `;

  const cap = document.createElement("div");
  cap.textContent = label;
  cap.style.cssText = `
    position:absolute; top:-18px; left:0; right:0;
    text-align:center;
    color:rgba(255,255,255,0.75);
    font-size:11px;
    pointer-events:none;
  `;
  el.appendChild(cap);

  const knob = document.createElement("div");
  knob.style.cssText = `
    width:70px; height:70px; border-radius:999px;
    position:absolute; left:50%; top:50%;
    transform: translate(-50%, -50%);
    border:1px solid rgba(255,255,255,0.22);
    background:rgba(255,255,255,0.10);
    pointer-events:none;
  `;
  el.appendChild(knob);

  let cb = () => {};
  let active = false;
  let rect = null;
  let pid = null;

  function set(x, y) {
    // x,y in [-1..1]
    const r = 45; // knob travel radius
    knob.style.transform = `translate(${x * r - 35}px, ${y * r - 35}px)`;
    cb(x, y);
  }

  function reset() {
    knob.style.transform = `translate(-35px, -35px)`;
    cb(0, 0);
  }

  // initialize correct knob center via translate(-35,-35) since knob is 70x70
  reset();

  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    active = true;
    pid = e.pointerId;
    el.setPointerCapture(pid);
    rect = el.getBoundingClientRect();
  }, { passive: false });

  el.addEventListener("pointermove", (e) => {
    if (!active || e.pointerId !== pid) return;
    e.preventDefault();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);

    // clamp circle
    const mag = Math.hypot(dx, dy);
    if (mag > 1) { dx /= mag; dy /= mag; }

    // invert Y so up is forward (+)
    set(dx, -dy);
  }, { passive: false });

  const end = (e) => {
    if (!active || e.pointerId !== pid) return;
    e.preventDefault();
    active = false;
    pid = null;
    reset();
  };

  el.addEventListener("pointerup", end, { passive: false });
  el.addEventListener("pointercancel", end, { passive: false });
  el.addEventListener("pointerleave", end, { passive: false });

  return {
    el,
    on(fn) { cb = fn || (() => {}); }
  };
}

// /js/scarlett1/modules/dev/android_dev_hud_module.js
// ANDROID DEV HUD (FULL) — Diagnostics + Virtual Controllers + Hide/Show + Options
// - Designed for phone/tablet debugging when NOT in XR
// - Writes into ctx.input (left/right) so your normal locomotion/grab code can run
// - Captures errors + shows them in HUD
// - Does not modify world geometry; UI only

export function createAndroidDevHudModule({
  title = "SCARLETT • ANDROID DEV HUD",
  enabledByDefault = true,

  // If true, HUD only shows when NOT in XR (recommended)
  onlyWhenNotXR = true,

  // Visual defaults
  defaultScale = 1.0,
  defaultOpacity = 0.92,

  // Input shaping
  deadzone = 0.10,
  maxStick = 1.0,

  // Optional: invert the Y axis on sticks
  invertLeftY = false,
  invertRightY = false,
} = {}) {
  let root = null;
  let hud = null;
  let hudBody = null;
  let hudCollapsed = false;

  let show = enabledByDefault;
  let scale = defaultScale;
  let opacity = defaultOpacity;

  let freezeInput = false;

  // live state
  const st = {
    fps: 0,
    acc: 0,
    frames: 0,

    lastErr: "none",
    lastErrAt: 0,

    // virtual controller state
    left:  { stickX: 0, stickY: 0, trigger: 0, squeeze: 0, a:false, b:false, x:false, y:false },
    right: { stickX: 0, stickY: 0, trigger: 0, squeeze: 0, a:false, b:false, x:false, y:false },

    // touch tracking
    touchL: null,
    touchR: null,
  };

  function nowSec() { return performance.now() / 1000; }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function applyDeadzone(v, dz) {
    const av = Math.abs(v);
    if (av < dz) return 0;
    // re-scale so it ramps nicely after dz
    const s = (av - dz) / (1 - dz);
    return Math.sign(v) * clamp(s, 0, 1);
  }

  function ensureErrorHooks() {
    if (window.__scarlettAndroidHudErrorHooked) return;
    window.__scarlettAndroidHudErrorHooked = true;

    window.addEventListener("error", (ev) => {
      const msg = ev?.message || "error";
      const file = ev?.filename || "";
      const line = ev?.lineno || "";
      const col = ev?.colno || "";
      const stack = ev?.error?.stack || "";
      st.lastErr = clip(`${msg}\n${file}:${line}:${col}\n${stack}`);
      st.lastErrAt = nowSec();
      console.log("[android_hud] captured error:", st.lastErr);
    });

    window.addEventListener("unhandledrejection", (ev) => {
      const r = ev?.reason;
      const msg = (r?.message) ? r.message : String(r || "unhandledrejection");
      const stack = r?.stack || "";
      st.lastErr = clip(`${msg}\n${stack}`);
      st.lastErrAt = nowSec();
      console.log("[android_hud] captured rejection:", st.lastErr);
    });
  }

  function clip(s, n = 900) {
    s = String(s || "");
    if (s.length <= n) return s;
    return s.slice(0, n) + "…";
  }

  function ensureDOM() {
    if (root) return;

    root = document.createElement("div");
    root.setAttribute("data-hud", "1");
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.zIndex = "999999";
    root.style.pointerEvents = "none"; // only specific elements enable events
    document.body.appendChild(root);

    // HUD panel
    hud = document.createElement("div");
    hud.style.position = "fixed";
    hud.style.left = "10px";
    hud.style.top = "10px";
    hud.style.width = "360px";
    hud.style.maxWidth = "92vw";
    hud.style.borderRadius = "14px";
    hud.style.border = "1px solid rgba(255,255,255,0.18)";
    hud.style.background = "rgba(0,0,0,0.60)";
    hud.style.color = "white";
    hud.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    hud.style.fontSize = "12px";
    hud.style.lineHeight = "1.25";
    hud.style.padding = "10px";
    hud.style.backdropFilter = "blur(8px)";
    hud.style.webkitBackdropFilter = "blur(8px)";
    hud.style.pointerEvents = "auto";
    root.appendChild(hud);

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";
    hud.appendChild(header);

    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    titleEl.style.fontWeight = "800";
    titleEl.style.letterSpacing = "0.08em";
    header.appendChild(titleEl);

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "6px";
    header.appendChild(btnRow);

    const mkBtn = (label) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.padding = "6px 8px";
      b.style.borderRadius = "10px";
      b.style.border = "1px solid rgba(255,255,255,0.18)";
      b.style.background = "rgba(20,20,30,0.75)";
      b.style.color = "white";
      b.style.cursor = "pointer";
      b.style.fontSize = "11px";
      return b;
    };

    const hideBtn = mkBtn("HIDE");
    const collapseBtn = mkBtn("COLLAPSE");
    const optsBtn = mkBtn("OPTIONS");
    btnRow.appendChild(hideBtn);
    btnRow.appendChild(collapseBtn);
    btnRow.appendChild(optsBtn);

    hudBody = document.createElement("div");
    hudBody.style.marginTop = "8px";
    hudBody.style.whiteSpace = "pre-wrap";
    hud.appendChild(hudBody);

    // Options panel
    const opts = document.createElement("div");
    opts.style.display = "none";
    opts.style.marginTop = "10px";
    opts.style.paddingTop = "10px";
    opts.style.borderTop = "1px solid rgba(255,255,255,0.14)";
    opts.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    opts.style.fontSize = "12px";
    opts.style.whiteSpace = "normal";
    hud.appendChild(opts);

    const mkRow = (label, node) => {
      const r = document.createElement("div");
      r.style.display = "flex";
      r.style.alignItems = "center";
      r.style.justifyContent = "space-between";
      r.style.gap = "10px";
      r.style.margin = "6px 0";
      const l = document.createElement("div");
      l.textContent = label;
      l.style.opacity = "0.9";
      r.appendChild(l);
      r.appendChild(node);
      return r;
    };

    const mkRange = (min, max, step, value, on) => {
      const i = document.createElement("input");
      i.type = "range"; i.min = String(min); i.max = String(max); i.step = String(step);
      i.value = String(value);
      i.oninput = () => on(parseFloat(i.value));
      return i;
    };

    const mkCheck = (value, on) => {
      const c = document.createElement("input");
      c.type = "checkbox";
      c.checked = !!value;
      c.onchange = () => on(!!c.checked);
      return c;
    };

    // Scale/Opacity
    opts.appendChild(mkRow("Scale", mkRange(0.7, 1.4, 0.05, scale, (v) => { scale = v; applyStyles(); })));
    opts.appendChild(mkRow("Opacity", mkRange(0.2, 1.0, 0.05, opacity, (v) => { opacity = v; applyStyles(); })));

    // Invert Y
    opts.appendChild(mkRow("Invert Left Y", mkCheck(invertLeftY, (v) => { invertLeftY = v; })));
    opts.appendChild(mkRow("Invert Right Y", mkCheck(invertRightY, (v) => { invertRightY = v; })));

    // Freeze input
    opts.appendChild(mkRow("Freeze Input", mkCheck(false, (v) => { freezeInput = v; })));

    // Reset input
    const resetBtn = mkBtn("RESET INPUT");
    resetBtn.onclick = () => resetVirtual();
    opts.appendChild(mkRow("Reset", resetBtn));

    // Quick test buttons (writes into ctx input momentarily)
    const snapLeft = mkBtn("Snap Left");
    const snapRight = mkBtn("Snap Right");
    const zero = mkBtn("Zero All");
    snapLeft.onclick = () => { st.right.stickX = -1; setTimeout(() => st.right.stickX = 0, 120); };
    snapRight.onclick = () => { st.right.stickX = 1; setTimeout(() => st.right.stickX = 0, 120); };
    zero.onclick = () => resetVirtual();
    const quick = document.createElement("div");
    quick.style.display = "flex";
    quick.style.gap = "6px";
    quick.appendChild(snapLeft);
    quick.appendChild(snapRight);
    quick.appendChild(zero);
    opts.appendChild(mkRow("Quick", quick));

    // Copy HUD text
    const copyBtn = mkBtn("COPY HUD");
    copyBtn.onclick = async () => {
      const text = hudBody.textContent || "";
      try { await navigator.clipboard.writeText(text); copyBtn.textContent = "COPIED ✅"; }
      catch { copyBtn.textContent = "COPY FAIL ❌"; }
      setTimeout(() => copyBtn.textContent = "COPY HUD", 800);
    };
    opts.appendChild(mkRow("Copy", copyBtn));

    // Hide/show logic
    hideBtn.onclick = () => {
      show = !show;
      // leave a tiny floating show button when hidden
      if (!show) {
        hud.style.display = "none";
        ensureShowButton();
      } else {
        hud.style.display = "block";
        removeShowButton();
      }
    };

    collapseBtn.onclick = () => {
      hudCollapsed = !hudCollapsed;
      hudBody.style.display = hudCollapsed ? "none" : "block";
      opts.style.display = "none";
    };

    optsBtn.onclick = () => {
      opts.style.display = (opts.style.display === "none") ? "block" : "none";
      hudBody.style.display = "block";
      hudCollapsed = false;
    };

    // Virtual controllers
    makeVirtualControllers();
    applyStyles();
  }

  let showBtn = null;
  function ensureShowButton() {
    if (showBtn) return;
    showBtn = document.createElement("button");
    showBtn.textContent = "SHOW HUD";
    showBtn.setAttribute("data-hud", "1");
    showBtn.style.position = "fixed";
    showBtn.style.left = "10px";
    showBtn.style.top = "10px";
    showBtn.style.zIndex = "999999";
    showBtn.style.padding = "10px 12px";
    showBtn.style.borderRadius = "12px";
    showBtn.style.border = "1px solid rgba(255,255,255,0.18)";
    showBtn.style.background = "rgba(20,20,30,0.75)";
    showBtn.style.color = "white";
    showBtn.style.cursor = "pointer";
    showBtn.onclick = () => {
      show = true;
      hud.style.display = "block";
      removeShowButton();
    };
    document.body.appendChild(showBtn);
  }
  function removeShowButton() {
    if (!showBtn) return;
    showBtn.remove();
    showBtn = null;
  }

  function applyStyles() {
    if (!hud) return;
    hud.style.transformOrigin = "top left";
    hud.style.transform = `scale(${scale})`;
    hud.style.opacity = String(opacity);
  }

  // ---------- Virtual controllers UI ----------
  function makePad(label) {
    const pad = document.createElement("div");
    pad.style.position = "fixed";
    pad.style.bottom = "14px";
    pad.style.width = "170px";
    pad.style.height = "170px";
    pad.style.borderRadius = "999px";
    pad.style.border = "1px solid rgba(255,255,255,0.18)";
    pad.style.background = "rgba(0,0,0,0.35)";
    pad.style.backdropFilter = "blur(6px)";
    pad.style.webkitBackdropFilter = "blur(6px)";
    pad.style.pointerEvents = "auto";
    pad.style.touchAction = "none";
    pad.style.userSelect = "none";

    const cap = document.createElement("div");
    cap.textContent = label;
    cap.style.position = "absolute";
    cap.style.left = "0";
    cap.style.right = "0";
    cap.style.top = "-22px";
    cap.style.textAlign = "center";
    cap.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    cap.style.fontSize = "12px";
    cap.style.color = "rgba(255,255,255,0.9)";
    pad.appendChild(cap);

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.width = "58px";
    nub.style.height = "58px";
    nub.style.transform = "translate(-50%,-50%)";
    nub.style.borderRadius = "999px";
    nub.style.border = "1px solid rgba(255,255,255,0.25)";
    nub.style.background = "rgba(255,255,255,0.08)";
    pad.appendChild(nub);

    return { pad, nub };
  }

  function makeButton(label) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.width = "76px";
    b.style.height = "40px";
    b.style.borderRadius = "12px";
    b.style.border = "1px solid rgba(255,255,255,0.18)";
    b.style.background = "rgba(20,20,30,0.70)";
    b.style.color = "white";
    b.style.cursor = "pointer";
    b.style.pointerEvents = "auto";
    b.style.touchAction = "none";
    return b;
  }

  let padL, padR, btnTR, btnGR, btnA, btnB, btnX, btnY;

  function makeVirtualControllers() {
    // Left stick
    padL = makePad("LEFT STICK");
    padL.pad.style.left = "12px";
    root.appendChild(padL.pad);

    // Right stick
    padR = makePad("RIGHT STICK");
    padR.pad.style.right = "12px";
    root.appendChild(padR.pad);

    // Right side buttons cluster
    const cluster = document.createElement("div");
    cluster.style.position = "fixed";
    cluster.style.right = "12px";
    cluster.style.bottom = "190px";
    cluster.style.display = "grid";
    cluster.style.gridTemplateColumns = "repeat(2, 80px)";
    cluster.style.gap = "8px";
    cluster.style.pointerEvents = "none";
    root.appendChild(cluster);

    btnTR = makeButton("TRIG");
    btnGR = makeButton("GRIP");
    btnA = makeButton("A");
    btnB = makeButton("B");
    btnX = makeButton("X");
    btnY = makeButton("Y");

    // pointerEvents back on for buttons
    for (const b of [btnTR, btnGR, btnA, btnB, btnX, btnY]) b.style.pointerEvents = "auto";

    cluster.appendChild(btnTR);
    cluster.appendChild(btnGR);
    cluster.appendChild(btnA);
    cluster.appendChild(btnB);
    cluster.appendChild(btnX);
    cluster.appendChild(btnY);

    // Touch handlers
    attachStickHandlers(padL.pad, padL.nub, "left");
    attachStickHandlers(padR.pad, padR.nub, "right");

    attachButtonHandlers(btnTR, () => { st.right.trigger = 1; }, () => { st.right.trigger = 0; });
    attachButtonHandlers(btnGR, () => { st.right.squeeze = 1; }, () => { st.right.squeeze = 0; });

    attachButtonHandlers(btnA,  () => { st.right.a = true; }, () => { st.right.a = false; });
    attachButtonHandlers(btnB,  () => { st.right.b = true; }, () => { st.right.b = false; });
    attachButtonHandlers(btnX,  () => { st.left.x = true; },  () => { st.left.x = false; });
    attachButtonHandlers(btnY,  () => { st.left.y = true; },  () => { st.left.y = false; });
  }

  function attachButtonHandlers(btn, down, up) {
    const onDown = (e) => { e.preventDefault(); down(); btn.style.background = "rgba(60,160,90,0.60)"; };
    const onUp   = (e) => { e.preventDefault(); up();   btn.style.background = "rgba(20,20,30,0.70)"; };

    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointerup", onUp);
    btn.addEventListener("pointercancel", onUp);
    btn.addEventListener("pointerleave", onUp);
  }

  function attachStickHandlers(pad, nub, which) {
    const radius = 64;

    const activeKey = (which === "left") ? "touchL" : "touchR";

    const setStick = (x, y) => {
      // x/y are -1..1
      x = clamp(x, -maxStick, maxStick);
      y = clamp(y, -maxStick, maxStick);

      x = applyDeadzone(x, deadzone);
      y = applyDeadzone(y, deadzone);

      if (which === "left") {
        st.left.stickX = x;
        st.left.stickY = invertLeftY ? -y : y;
      } else {
        st.right.stickX = x;
        st.right.stickY = invertRightY ? -y : y;
      }
    };

    const updateNub = (x, y) => {
      nub.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    };

    const onDown = (e) => {
      e.preventDefault();
      pad.setPointerCapture(e.pointerId);
      st[activeKey] = { id: e.pointerId };
    };

    const onMove = (e) => {
      if (!st[activeKey] || st[activeKey].id !== e.pointerId) return;

      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      const ndx = clamp(dx / radius, -1, 1);
      const ndy = clamp(dy / radius, -1, 1);

      updateNub(ndx * radius * 0.72, ndy * radius * 0.72);
      setStick(ndx, ndy);
    };

    const onUp = (e) => {
      if (st[activeKey] && st[activeKey].id === e.pointerId) st[activeKey] = null;
      updateNub(0, 0);
      setStick(0, 0);
    };

    pad.addEventListener("pointerdown", onDown);
    pad.addEventListener("pointermove", onMove);
    pad.addEventListener("pointerup", onUp);
    pad.addEventListener("pointercancel", onUp);
  }

  function resetVirtual() {
    st.left.stickX = 0; st.left.stickY = 0; st.left.trigger = 0; st.left.squeeze = 0;
    st.right.stickX = 0; st.right.stickY = 0; st.right.trigger = 0; st.right.squeeze = 0;
    st.left.a=false; st.left.b=false; st.left.x=false; st.left.y=false;
    st.right.a=false; st.right.b=false; st.right.x=false; st.right.y=false;
  }

  // ---------- HUD render ----------
  function renderHUD(ctx) {
    if (!hud || !hudBody) return;

    const xr = ctx.xrSession ? "ACTIVE" : "inactive";
    const mods = (ctx._enabledModuleNames || []).join(", ") || "unknown";

    const errAge = st.lastErrAt ? `${(nowSec() - st.lastErrAt).toFixed(1)}s ago` : "n/a";

    const lines = [];
    lines.push(`build: ${ctx.WORLD_BUILD || "unknown"}`);
    lines.push(`url: ${location.href}`);
    lines.push(`xr: ${xr}`);
    lines.push(`fps: ${st.fps.toFixed(1)}`);
    lines.push(`modules: ${mods}`);
    lines.push("");
    lines.push("ANDROID INPUT (virtual):");
    lines.push(`L stick=(${st.left.stickX.toFixed(2)}, ${st.left.stickY.toFixed(2)}) trig=${st.left.trigger.toFixed(2)} grip=${st.left.squeeze.toFixed(2)} X=${st.left.x?1:0} Y=${st.left.y?1:0}`);
    lines.push(`R stick=(${st.right.stickX.toFixed(2)}, ${st.right.stickY.toFixed(2)}) trig=${st.right.trigger.toFixed(2)} grip=${st.right.squeeze.toFixed(2)} A=${st.right.a?1:0} B=${st.right.b?1:0}`);
    lines.push("");
    lines.push(`lastError: ${errAge}`);
    lines.push(st.lastErr);

    hudBody.textContent = lines.join("\n");
  }

  function shouldShow(ctx) {
    if (!show) return false;
    if (!onlyWhenNotXR) return true;
    return !ctx.xrSession;
  }

  return {
    name: "android_dev_hud",

    onEnable(ctx) {
      ensureErrorHooks();
      ensureDOM();
      resetVirtual();
      console.log("[android_dev_hud] ready ✅");
    },

    update(ctx, { dt }) {
      // FPS
      st.acc += dt;
      st.frames++;
      if (st.acc >= 0.5) {
        st.fps = st.frames / st.acc;
        st.acc = 0;
        st.frames = 0;
      }

      // Show/Hide HUD + controllers UI
      const visible = shouldShow(ctx);
      if (root) root.style.display = visible ? "block" : "none";
      if (!visible) return;

      // Write virtual controls into ctx.input (ONLY when not XR)
      if (!freezeInput && !ctx.xrSession) {
        ctx.input.left.stickX = st.left.stickX;
        ctx.input.left.stickY = st.left.stickY;
        ctx.input.left.trigger = st.left.trigger;
        ctx.input.left.squeeze = st.left.squeeze;
        ctx.input.left.x = st.left.x;
        ctx.input.left.y = st.left.y;

        ctx.input.right.stickX = st.right.stickX;
        ctx.input.right.stickY = st.right.stickY;
        ctx.input.right.trigger = st.right.trigger;
        ctx.input.right.squeeze = st.right.squeeze;
        ctx.input.right.a = st.right.a;
        ctx.input.right.b = st.right.b;
      }

      renderHUD(ctx);
    }
  };
}

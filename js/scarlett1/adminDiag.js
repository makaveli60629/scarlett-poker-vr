// /js/scarlett1/adminDiag.js
// SCARLETT ADMIN DIAGNOSTICS PANEL (AUTHORITATIVE)
// Build: SCARLETT_ADMIN_DIAG_v1_0

export function installScarlettAdminDiag(opts = {}) {
  const BUILD = "SCARLETT_ADMIN_DIAG_v1_0";
  const startTs = Date.now();

  const cfg = {
    // Paths to check (edit if your structure differs)
    checks: [
      { name: "index.html", url: "./index.html" },
      { name: "js/scarlett1/index.js", url: "./js/scarlett1/index.js" },
      { name: "js/world.js", url: "./js/world.js" },
      { name: "js/index.js", url: "./js/index.js" },
      { name: "js/main.js", url: "./js/main.js" },
      { name: "js/boot.js", url: "./js/boot.js" },
      { name: "js/scarlett1/boot.js", url: "./js/scarlett1/boot.js" },
      { name: "js/scarlett1/boot1.js", url: "./js/scarlett1/boot1.js" },
    ],
    hudButtonIds: ["btnEnterVR", "btnHideHUD", "btnTeleport", "btnDiag"],
    ...opts
  };

  // ---------- internal state ----------
  const state = {
    logs: [],
    results: [],
    blocker: null,
    lastReport: "",
  };

  // ---------- log + optional bridge ----------
  function dwrite(msg) {
    const s = String(msg);
    state.logs.push(s);
    try { window.__scarlettDiagWrite?.(s); } catch (_) {}
    try { console.log(s); } catch (_) {}
    if (ui.logEl) {
      ui.logEl.textContent += (ui.logEl.textContent ? "\n" : "") + s;
      ui.logEl.scrollTop = ui.logEl.scrollHeight;
    }
  }

  // ---------- UI ----------
  const ui = createPanel();
  dwrite(`[ADMIN] booting… build=${BUILD}`);
  dwrite(`[ADMIN] href=${location.href}`);
  dwrite(`[ADMIN] secureContext=${String(window.isSecureContext)}`);
  dwrite(`[ADMIN] ua=${navigator.userAgent}`);

  // Public hooks (so your other code can call it)
  window.__scarlettAdminDiag = {
    BUILD,
    runAll,
    copyReport,
    open: () => ui.root.style.display = "block",
    close: () => ui.root.style.display = "none",
    dwrite,
  };

  // Always bind buttons safely
  bindPanelButtons();

  // Auto run once
  runAll();

  // ---------- panel creation ----------
  function createPanel() {
    const root = document.createElement("div");
    root.id = "scarlettAdminDiag";
    root.style.cssText = [
      "position:fixed",
      "left:10px",
      "top:10px",
      "width:min(94vw,720px)",
      "height:min(86vh,760px)",
      "z-index:2147483647",
      "background:rgba(0,0,0,0.86)",
      "border:1px solid rgba(255,255,255,0.18)",
      "border-radius:14px",
      "backdrop-filter: blur(8px)",
      "color:#fff",
      "font:12px/1.25 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
      "display:block",
      "box-shadow:0 10px 30px rgba(0,0,0,0.5)",
      "overflow:hidden",
      "pointer-events:auto",
      "touch-action:manipulation",
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = "display:flex;gap:8px;align-items:center;padding:10px 10px 8px 10px;border-bottom:1px solid rgba(255,255,255,0.12);";
    header.innerHTML = `
      <div style="font-weight:800;letter-spacing:.2px;">SCARLETT • ADMIN DIAGNOSTICS</div>
      <div style="opacity:.75;">${BUILD}</div>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
        <button data-a="run"   style="${btnCss()}">RUN ALL</button>
        <button data-a="copy"  style="${btnCss()}">COPY REPORT</button>
        <button data-a="fix"   style="${btnCss()}">FORCE TOUCH FIX</button>
        <button data-a="reload"style="${btnCss()}">RELOAD</button>
        <button data-a="hard"  style="${btnCss()}">HARD RELOAD</button>
        <button data-a="close" style="${btnCss()}">CLOSE</button>
      </div>
    `;

    const body = document.createElement("div");
    body.style.cssText = "display:grid;grid-template-columns:1fr;gap:10px;padding:10px;overflow:auto;height:calc(100% - 54px);";

    const cards = document.createElement("div");
    cards.style.cssText = "display:grid;grid-template-columns:1fr;gap:10px;";

    const card1 = card("Preflight / Environment", `<div id="admEnv"></div>`);
    const card2 = card("HUD Buttons / Touch Blockers", `<div id="admHud"></div>`);
    const card3 = card("XR / WebXR", `<div id="admXr"></div>`);
    const card4 = card("Controllers / Gamepads", `<div id="admGp"></div>`);
    const card5 = card("Renderer / Canvas", `<div id="admRend"></div>`);
    const card6 = card("Module / File Checks (fetch)", `<div id="admMods"></div>`);
    const card7 = card("Live Log", `<pre id="admLog" style="margin:0;white-space:pre-wrap;"></pre>`);

    cards.append(card1, card2, card3, card4, card5, card6, card7);
    body.append(cards);
    root.append(header, body);
    document.body.appendChild(root);

    // Make sure nothing blocks the panel
    root.addEventListener("pointerdown", (e) => { e.stopPropagation(); }, { capture: true });

    return {
      root,
      envEl: root.querySelector("#admEnv"),
      hudEl: root.querySelector("#admHud"),
      xrEl: root.querySelector("#admXr"),
      gpEl: root.querySelector("#admGp"),
      rendEl: root.querySelector("#admRend"),
      modsEl: root.querySelector("#admMods"),
      logEl: root.querySelector("#admLog"),
      header,
    };

    function card(title, inner) {
      const c = document.createElement("div");
      c.style.cssText = "border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px;background:rgba(255,255,255,0.04);";
      c.innerHTML = `
        <div style="font-weight:800;margin-bottom:6px;">${title}</div>
        ${inner}
      `;
      return c;
    }

    function btnCss() {
      return [
        "padding:8px 10px",
        "border-radius:12px",
        "border:1px solid rgba(255,255,255,0.18)",
        "background:rgba(0,0,0,0.45)",
        "color:#fff",
        "font-weight:800",
        "cursor:pointer",
        "touch-action:manipulation",
        "-webkit-tap-highlight-color:rgba(0,0,0,0)",
      ].join(";");
    }
  }

  function bindPanelButtons() {
    const btns = ui.header.querySelectorAll("button[data-a]");
    btns.forEach((b) => {
      const act = b.getAttribute("data-a");
      const handler = async (e) => {
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        if (act === "run") await runAll();
        if (act === "copy") copyReport();
        if (act === "fix") forceTouchFix();
        if (act === "reload") location.reload();
        if (act === "hard") location.href = location.pathname + "?v=SCARLETT_HARD_" + Date.now();
        if (act === "close") ui.root.style.display = "none";
      };
      ["pointerdown","touchstart","click"].forEach(evt => {
        b.addEventListener(evt, handler, { passive:false, capture:true });
      });
    });
  }

  // ---------- diagnostics ----------
  async function runAll() {
    state.results = [];
    dwrite(`[ADMIN] runAll()…`);

    renderEnv();
    await renderHud();
    await renderXr();
    renderGamepads();
    renderRenderer();
    await renderModules();

    state.lastReport = makeReport();
    dwrite(`[ADMIN] runAll() ✅`);
  }

  function renderEnv() {
    const now = new Date().toISOString();
    const perf = (performance && performance.now) ? performance.now().toFixed(1) : "n/a";
    ui.envEl.innerHTML = `
      <div>time=${now}</div>
      <div>uptimeMs=${Math.floor(Date.now()-startTs)}</div>
      <div>perfNow=${perf}</div>
      <div>secureContext=${String(window.isSecureContext)}</div>
      <div>visibility=${document.visibilityState}</div>
      <div>touch=${"ontouchstart" in window}</div>
      <div>maxTouchPoints=${navigator.maxTouchPoints ?? "n/a"}</div>
      <div>devicePixelRatio=${window.devicePixelRatio ?? "n/a"}</div>
    `;
  }

  async function renderHud() {
    const lines = [];
    const buttonInfo = [];

    for (const id of cfg.hudButtonIds) {
      const el = document.getElementById(id);
      if (!el) {
        buttonInfo.push(`<div>❌ ${id}: missing</div>`);
        continue;
      }

      const r = el.getBoundingClientRect();
      const cx = Math.max(0, Math.min(window.innerWidth - 1, Math.floor(r.left + r.width / 2)));
      const cy = Math.max(0, Math.min(window.innerHeight - 1, Math.floor(r.top + r.height / 2)));
      const topEl = document.elementFromPoint(cx, cy);

      const blocked = topEl && topEl !== el && !el.contains(topEl);
      const topDesc = topEl ? describeEl(topEl) : "null";

      buttonInfo.push(`
        <div style="margin-bottom:6px;">
          ${blocked ? "❌" : "✅"} <b>${id}</b>
          <div style="opacity:.85;">rect=${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}</div>
          <div style="opacity:.85;">elementFromPoint=${escapeHtml(topDesc)}</div>
        </div>
      `);

      lines.push(`[HUD] ${id} blocked=${blocked} top=${topDesc}`);
    }

    // Find common fullscreen blockers
    const blockers = findFullscreenBlockers();
    const blkHtml = blockers.length
      ? blockers.map(b => `<div>⚠️ blocker: ${escapeHtml(describeEl(b.el))} • z=${b.z} • pe=${b.pe}</div>`).join("")
      : `<div>✅ no obvious fullscreen blockers detected</div>`;

    ui.hudEl.innerHTML = `
      <div style="margin-bottom:8px;opacity:.9;">Tap-test: panel uses elementFromPoint() at each button center to detect touch stealers.</div>
      ${buttonInfo.join("")}
      <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.12);padding-top:8px;">
        <div style="font-weight:800;margin-bottom:6px;">Fullscreen Blocker Scan</div>
        ${blkHtml}
      </div>
    `;

    dwrite(lines.join("\n"));
  }

  async function renderXr() {
    const xr = navigator.xr;
    if (!xr) {
      ui.xrEl.innerHTML = `<div>❌ navigator.xr not available</div>`;
      dwrite("[XR] navigator.xr=false");
      return;
    }

    let immersive = "n/a";
    let inline = "n/a";
    try { immersive = await xr.isSessionSupported("immersive-vr"); } catch (e) { immersive = "error"; }
    try { inline = await xr.isSessionSupported("inline"); } catch (e) { inline = "error"; }

    const hasSession = !!(window.SCARLETT?.xrSession || window.__xrSession || window.__session);
    ui.xrEl.innerHTML = `
      <div>✅ navigator.xr available</div>
      <div>isSessionSupported(immersive-vr)=${String(immersive)}</div>
      <div>isSessionSupported(inline)=${String(inline)}</div>
      <div>existingSessionHint=${String(hasSession)}</div>
    `;
    dwrite(`[XR] immersive-vr=${immersive} inline=${inline}`);
  }

  function renderGamepads() {
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (!gps.length) {
      ui.gpEl.innerHTML = `<div>⚠️ no gamepads detected right now</div><div style="opacity:.85;">(In Quest/VR, gamepads appear after XR session starts.)</div>`;
      dwrite("[GP] count=0");
      return;
    }

    ui.gpEl.innerHTML = gps.map((g, i) => {
      const axes = g.axes ? g.axes.map(n => (Math.round(n * 100) / 100)).join(", ") : "";
      const btns = g.buttons ? g.buttons.length : 0;
      return `
        <div style="margin-bottom:8px;">
          ✅ [${i}] ${escapeHtml(g.id || "gamepad")}
          <div style="opacity:.85;">connected=${String(g.connected)} mapping=${escapeHtml(g.mapping || "n/a")}</div>
          <div style="opacity:.85;">axes=[${axes}] buttons=${btns}</div>
        </div>
      `;
    }).join("");

    dwrite(`[GP] count=${gps.length}`);
  }

  function renderRenderer() {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const threeHint = !!(window.THREE || window.__THREE || window.SCARLETT?.three);

    const info = canvases.map((c, i) => {
      const r = c.getBoundingClientRect();
      const pe = getComputedStyle(c).pointerEvents;
      return `<div>canvas[${i}] ${Math.round(r.width)}x${Math.round(r.height)} pe=${pe}</div>`;
    }).join("");

    ui.rendEl.innerHTML = `
      <div>canvasCount=${canvases.length}</div>
      <div>threeGlobalHint=${String(threeHint)}</div>
      ${info || ""}
      <div style="margin-top:8px;opacity:.85;">If buttons don't work and canvas pe!=none, canvas is stealing touch.</div>
    `;

    dwrite(`[RENDER] canvasCount=${canvases.length} threeHint=${threeHint}`);
  }

  async function renderModules() {
    const rows = [];
    for (const c of cfg.checks) {
      const res = await fetchCheck(c.url);
      rows.push(resToHtml(c.name, c.url, res));
    }
    ui.modsEl.innerHTML = rows.join("");

    const okCount = cfg.checks.reduce((n, c, idx) => n + (ui.modsEl.querySelectorAll("div[data-ok='1']").length), 0);
    dwrite(`[MOD] checks=${cfg.checks.length}`);
  }

  async function fetchCheck(url) {
    const out = { url, ok:false, status:0, ct:"", bytes:0, err:"", hint:"" };
    try {
      const bust = (url.includes("?") ? "&" : "?") + "v=DIAG_" + Date.now();
      const r = await fetch(url + bust, { cache: "no-store" });
      out.status = r.status;
      out.ok = r.ok;
      out.ct = r.headers.get("content-type") || "";
      const txt = await r.text();
      out.bytes = txt.length;

      // Fast hints
      if (txt.includes("import * as THREE") || txt.includes("from \"three\"")) out.hint += "three-import ";
      if (txt.includes("setAnimationLoop")) out.hint += "xr-loop ";
      if (txt.includes("requestSession")) out.hint += "requestSession ";
      if (txt.includes("buildWorld") || txt.includes("world")) out.hint += "world ";
      if (txt.includes("scarlett") || txt.includes("SCARLETT")) out.hint += "scarlett ";

      return out;
    } catch (e) {
      out.err = e?.message || String(e);
      return out;
    }
  }

  function resToHtml(name, url, r) {
    const ok = r.ok && r.bytes > 0;
    const badge = ok ? "✅" : "❌";
    const okAttr = ok ? "1" : "0";
    return `
      <div data-ok="${okAttr}" style="padding:8px;border:1px solid rgba(255,255,255,0.10);border-radius:10px;margin-bottom:8px;">
        <div>${badge} <b>${escapeHtml(name)}</b> <span style="opacity:.75;">(${escapeHtml(url)})</span></div>
        <div style="opacity:.85;">status=${r.status} ct=${escapeHtml(r.ct)} bytes=${r.bytes}</div>
        <div style="opacity:.85;">hint=${escapeHtml(r.hint || "—")}</div>
        ${r.err ? `<div style="color:#ff9;opacity:.95;">err=${escapeHtml(r.err)}</div>` : ""}
      </div>
    `;
  }

  // ---------- blocker scan ----------
  function findFullscreenBlockers() {
    const els = Array.from(document.body.querySelectorAll("*"));
    const out = [];
    const vw = window.innerWidth, vh = window.innerHeight;

    for (const el of els) {
      if (!el || el === ui.root) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
      const pos = cs.position;
      if (pos !== "fixed" && pos !== "absolute") continue;

      const r = el.getBoundingClientRect();
      const covers = r.left <= 0 && r.top <= 0 && r.right >= vw - 1 && r.bottom >= vh - 1;
      if (!covers) continue;

      const z = parseInt(cs.zIndex || "0", 10);
      const pe = cs.pointerEvents;
      // Only report likely stealers
      if (pe !== "none") out.push({ el, z, pe });
    }

    out.sort((a, b) => (b.z || 0) - (a.z || 0));
    return out.slice(0, 10);
  }

  function forceTouchFix() {
    // 1) Make all canvases never steal touches
    document.querySelectorAll("canvas").forEach(c => c.style.pointerEvents = "none");

    // 2) Try to fix common fullscreen overlays
    const blockers = findFullscreenBlockers();
    blockers.forEach(b => {
      try { b.el.style.pointerEvents = "none"; } catch (_) {}
    });

    // 3) Force HUD ids (if present) to accept touch
    cfg.hudButtonIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.pointerEvents = "auto";
      el.style.touchAction = "manipulation";
    });

    dwrite("[ADMIN] FORCE TOUCH FIX applied ✅ (canvas pointer-events none + blockers pointer-events none)");
    runAll();
  }

  // ---------- report ----------
  function makeReport() {
    const parts = [];
    parts.push("=== SCARLETT ADMIN DIAG REPORT ===");
    parts.push(`BUILD=${BUILD}`);
    parts.push(`HREF=${location.href}`);
    parts.push(`secureContext=${String(window.isSecureContext)}`);
    parts.push(`ua=${navigator.userAgent}`);
    parts.push(`touch=${"ontouchstart" in window} maxTouchPoints=${navigator.maxTouchPoints ?? "n/a"}`);
    parts.push("");

    // HUD block test summary
    parts.push("--- HUD / TOUCH ---");
    for (const id of cfg.hudButtonIds) {
      const el = document.getElementById(id);
      if (!el) { parts.push(`${id}=MISSING`); continue; }
      const r = el.getBoundingClientRect();
      const cx = Math.floor(r.left + r.width / 2);
      const cy = Math.floor(r.top + r.height / 2);
      const topEl = document.elementFromPoint(cx, cy);
      const blocked = topEl && topEl !== el && !el.contains(topEl);
      parts.push(`${id}=OK blocked=${blocked} top=${describeEl(topEl)}`);
    }

    const blockers = findFullscreenBlockers();
    parts.push("");
    parts.push("--- FULLSCREEN BLOCKERS ---");
    if (!blockers.length) parts.push("none");
    blockers.forEach(b => parts.push(`${describeEl(b.el)} z=${b.z} pe=${b.pe}`));

    // XR
    parts.push("");
    parts.push("--- XR ---");
    parts.push(`navigator.xr=${String(!!navigator.xr)}`);

    // Gamepads
    parts.push("");
    parts.push("--- GAMEPADS ---");
    const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    parts.push(`count=${gps.length}`);
    gps.forEach((g, i) => parts.push(`[${i}] id=${g.id} mapping=${g.mapping} axes=${(g.axes||[]).length} buttons=${(g.buttons||[]).length}`));

    // Canvas
    parts.push("");
    parts.push("--- CANVAS ---");
    const canvases = Array.from(document.querySelectorAll("canvas"));
    parts.push(`canvasCount=${canvases.length}`);
    canvases.forEach((c,i) => {
      const cs = getComputedStyle(c);
      parts.push(`canvas[${i}] pe=${cs.pointerEvents} rect=${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)}`);
    });

    // Module fetch checks (from the UI content)
    parts.push("");
    parts.push("--- MODULE FETCH CHECKS ---");
    // Re-run from state.results not stored; but we can derive from UI:
    // (Keep it simple: include the last visible text as-is)
    const modsText = ui.modsEl ? ui.modsEl.innerText : "";
    parts.push(modsText || "n/a");

    // Tail logs (last ~120 lines)
    parts.push("");
    parts.push("--- LOG TAIL ---");
    const tail = state.logs.slice(-120);
    parts.push(tail.join("\n"));

    return parts.join("\n");
  }

  async function copyReport() {
    state.lastReport = makeReport();
    try {
      await navigator.clipboard.writeText(state.lastReport);
      dwrite("[ADMIN] report copied to clipboard ✅");
    } catch (e) {
      // fallback: show prompt
      dwrite("[ADMIN] clipboard failed; showing report in log panel (copy manually) ⚠️");
      if (ui.logEl) {
        ui.logEl.textContent = state.lastReport;
      }
    }
  }

  // ---------- helpers ----------
  function describeEl(el) {
    if (!el) return "null";
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className ? `.${String(el.className).trim().split(/\s+/).slice(0,3).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
  }
}

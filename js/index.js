// /js/index.js
// SCARLETT ROUTER + DIAGNOSTICS (FULL) — Prefight index.js + world.js

const BUILD = "ROUTER_FULL_DIAG_v3_PREFLIGHT_WORLD";

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function clip(s, n = 700) {
  s = String(s || "");
  return s.length <= n ? s : s.slice(0, n) + "…";
}
function qs() {
  const p = new URLSearchParams(location.search);
  const o = {};
  for (const [k, v] of p.entries()) o[k] = v === "" ? "1" : v;
  return o;
}

let overlay, body, btnRow, hiddenBtn;
let reportLines = [];
let hidden = false;

function ensureOverlay() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.setAttribute("data-hud", "1");
  overlay.style.position = "fixed";
  overlay.style.left = "10px";
  overlay.style.top = "10px";
  overlay.style.right = "10px";
  overlay.style.maxWidth = "920px";
  overlay.style.zIndex = "999999";
  overlay.style.padding = "12px";
  overlay.style.borderRadius = "16px";
  overlay.style.border = "1px solid rgba(255,255,255,0.18)";
  overlay.style.background = "rgba(0,0,0,0.65)";
  overlay.style.color = "white";
  overlay.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
  overlay.style.fontSize = "12px";
  overlay.style.lineHeight = "1.25";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.backdropFilter = "blur(8px)";
  overlay.style.webkitBackdropFilter = "blur(8px)";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "8px";

  const title = document.createElement("div");
  title.textContent = `SCARLETT ROUTER DIAGNOSTICS • ${BUILD}`;
  title.style.fontWeight = "900";
  title.style.letterSpacing = "0.08em";

  btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.flexWrap = "wrap";
  btnRow.style.gap = "6px";

  header.appendChild(title);
  header.appendChild(btnRow);

  body = document.createElement("div");
  body.style.marginTop = "10px";

  overlay.appendChild(header);
  overlay.appendChild(body);
  document.body.appendChild(overlay);

  hiddenBtn = document.createElement("button");
  hiddenBtn.textContent = "SHOW HUD";
  hiddenBtn.style.position = "fixed";
  hiddenBtn.style.left = "10px";
  hiddenBtn.style.top = "10px";
  hiddenBtn.style.zIndex = "999999";
  hiddenBtn.style.padding = "10px 12px";
  hiddenBtn.style.borderRadius = "12px";
  hiddenBtn.style.border = "1px solid rgba(255,255,255,0.18)";
  hiddenBtn.style.background = "rgba(20,20,30,0.75)";
  hiddenBtn.style.color = "white";
  hiddenBtn.style.cursor = "pointer";
  hiddenBtn.style.display = "none";
  hiddenBtn.onclick = () => setHidden(false);
  document.body.appendChild(hiddenBtn);

  addButtons();
}

function setHidden(v) {
  hidden = !!v;
  overlay.style.display = hidden ? "none" : "block";
  hiddenBtn.style.display = hidden ? "block" : "none";
}

function write(line) {
  reportLines.push(line);
  if (reportLines.length > 260) reportLines.shift();
  if (body) body.textContent = reportLines.join("\n");
}

async function copyReport() {
  const text = reportLines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    write(`[${now()}] [copy] COPIED ✅`);
  } catch (e) {
    write(`[${now()}] [copy] FAILED ❌ ${String(e)}`);
  }
}

function mkBtn(label, fn) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.padding = "8px 10px";
  b.style.borderRadius = "12px";
  b.style.border = "1px solid rgba(255,255,255,0.18)";
  b.style.background = "rgba(20,20,30,0.75)";
  b.style.color = "white";
  b.style.cursor = "pointer";
  b.style.fontSize = "12px";
  b.onclick = fn;
  return b;
}

function addButtons() {
  btnRow.innerHTML = "";
  btnRow.appendChild(mkBtn("HIDE HUD", () => setHidden(true)));
  btnRow.appendChild(mkBtn("RETRY", () => runRouter().catch(() => {})));
  btnRow.appendChild(mkBtn("COPY REPORT", () => copyReport()));
  btnRow.appendChild(mkBtn("HARD RELOAD", () => location.reload(true)));
}

async function preflight(url) {
  write(`[${now()}] [fetch] GET ${url}`);
  try {
    const res = await fetch(url, { cache: "no-store" });
    write(`[${now()}] [fetch] status=${res.status} ok=${res.ok}`);
    write(`[${now()}] [fetch] ct=${res.headers.get("content-type") || "?"}`);
    const txt = await res.text();
    write(`[${now()}] [fetch] bytes=${txt.length}`);
    write(`[${now()}] [fetch] head:\n${clip(txt.slice(0, 350), 350)}`);
    return { ok: res.ok, status: res.status, text: txt };
  } catch (e) {
    write(`[${now()}] [fetch] FAILED ❌ ${String(e)}`);
    return { ok: false, status: 0, text: "" };
  }
}

async function runRouter() {
  ensureOverlay();
  reportLines = [];

  write(`[${now()}] [HTML] booting…`);
  write(`[${now()}] [router] build=${BUILD}`);
  write(`[${now()}] [env] href=${location.href}`);
  write(`[${now()}] [env] secureContext=${String(window.isSecureContext)}`);
  write(`[${now()}] [env] navigator.xr=${String(!!navigator.xr)}`);
  write(`[${now()}] [env] ua=${navigator.userAgent}`);

  const q = qs();
  const v = q.v || `ROUTER_CACHEPROOF_${Date.now()}`;

  const idxAbs = new URL(`/scarlett-poker-vr/js/scarlett1/index.js?v=${encodeURIComponent(v)}`, location.origin).toString();
  const worldAbs = new URL(`/scarlett-poker-vr/js/scarlett1/world.js?v=${encodeURIComponent(v)}`, location.origin).toString();

  write(`\n--- PREFLIGHT: index.js ---`);
  await preflight(idxAbs);

  write(`\n--- PREFLIGHT: world.js ---`);
  await preflight(worldAbs);

  write(`\n[${now()}] [router] importing: ./scarlett1/index.js?v=${encodeURIComponent(v)}`);
  try {
    const mod = await import(`./scarlett1/index.js?v=${encodeURIComponent(v)}`);
    write(`[${now()}] [router] import OK ✅`);
    if (typeof mod.start === "function") {
      write(`[${now()}] [router] calling start()…`);
      await mod.start({ query: q, routerBuild: BUILD });
      write(`[${now()}] [router] start() returned ✅`);
    } else {
      write(`[${now()}] [router] no start() export — done ✅`);
    }
  } catch (e) {
    write(`[${now()}] [ERR] scarlett1 runtime FAILED ❌`);
    write(`[${now()}] [ERR] ${String(e?.message || e)}`);
    if (e?.stack) write(clip(e.stack, 900));
  }
}

runRouter().catch((e) => console.error("[router] fatal", e));

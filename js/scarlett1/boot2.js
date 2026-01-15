// /js/scarlett1/boot2.js — Scarlett Boot2 (Diagnostics + XR + Android-safe)
// ✅ Robust cache-bust for world + modules
// ✅ VRButton from three/examples
// ✅ Clean diagnostics HUD with status + logs
// ✅ Never crashes if optional modules fail

const BUILD = `BOOT2_${Date.now()}`;

// ---------- tiny logger / HUD ----------
const Diag = (() => {
  const S = { root: null, box: null, statusEl: null, logsEl: null, shown: true, lines: [] };

  const stamp = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}]`;
  };

  function ensure() {
    if (S.root) return;

    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "10px";
    root.style.top = "10px";
    root.style.zIndex = "9999";
    root.style.width = "min(520px, calc(100vw - 20px))";
    root.style.maxHeight = "70vh";
    root.style.pointerEvents = "auto";
    root.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

    const panel = document.createElement("div");
    panel.style.background = "rgba(5,10,20,0.72)";
    panel.style.border = "1px solid rgba(120,190,255,0.25)";
    panel.style.borderRadius = "16px";
    panel.style.padding = "12px";
    panel.style.backdropFilter = "blur(10px)";
    panel.style.color = "rgba(230,245,255,0.95)";

    const title = document.createElement("div");
    title.style.display = "flex";
    title.style.justifyContent = "space-between";
    title.style.alignItems = "center";
    title.style.gap = "10px";

    const h = document.createElement("div");
    h.textContent = "SCARLETT BOOT2 DIAGNOSTICS";
    h.style.fontWeight = "900";
    h.style.letterSpacing = "0.06em";
    h.style.color = "rgba(160,220,255,0.95)";

    const hide = document.createElement("button");
    hide.textContent = "Hide";
    hide.style.borderRadius = "12px";
    hide.style.border = "1px solid rgba(120,190,255,0.25)";
    hide.style.background = "rgba(10,16,32,0.55)";
    hide.style.color = "rgba(230,245,255,0.95)";
    hide.style.padding = "8px 10px";
    hide.style.fontWeight = "800";
    hide.onclick = () => {
      S.shown = !S.shown;
      box.style.display = S.shown ? "block" : "none";
      hide.textContent = S.shown ? "Hide" : "Show";
    };

    title.appendChild(h);
    title.appendChild(hide);

    const status = document.createElement("div");
    status.style.marginTop = "8px";
    status.innerHTML = `STATUS: <span style="color:#9ef0b0;font-weight:900;">Booting...</span>`;

    const btnRow = document.createElement("div");
    btnRow.style.display = "grid";
    btnRow.style.gridTemplateColumns = "1fr 1fr";
    btnRow.style.gap = "10px";
    btnRow.style.marginTop = "10px";

    const mkBtn = (txt, fn) => {
      const b = document.createElement("button");
      b.textContent = txt;
      b.style.borderRadius = "14px";
      b.style.border = "1px solid rgba(120,190,255,0.18)";
      b.style.background = "rgba(16,24,48,0.55)";
      b.style.color = "rgba(230,245,255,0.95)";
      b.style.padding = "12px 10px";
      b.style.fontWeight = "900";
      b.onclick = fn;
      return b;
    };

    const copy = mkBtn("Copy Logs", async () => {
      const text = S.lines.join("\n");
      try { await navigator.clipboard.writeText(text); log("copied ✅"); }
      catch { log("copy failed ❌"); }
    });

    const clear = mkBtn("Clear", () => {
      S.lines.length = 0;
      render();
    });

    const reload = mkBtn("Reload", () => location.reload());

    btnRow.appendChild(mkBtn("Hide HUD", () => { root.style.display = "none"; }));
    btnRow.appendChild(copy);
    btnRow.appendChild(clear);
    btnRow.appendChild(reload);

    const box = document.createElement("div");
    box.style.marginTop = "10px";
    box.style.padding = "10px";
    box.style.borderRadius = "14px";
    box.style.border = "1px solid rgba(120,190,255,0.18)";
    box.style.background = "rgba(0,0,0,0.35)";
    box.style.maxHeight = "42vh";
    box.style.overflow = "auto";
    box.style.whiteSpace = "pre-wrap";
    box.style.fontSize = "12px";
    box.style.lineHeight = "1.25";

    panel.appendChild(title);
    panel.appendChild(status);
    panel.appendChild(btnRow);
    panel.appendChild(box);

    root.appendChild(panel);
    document.body.appendChild(root);

    S.root = root;
    S.box = box;
    S.statusEl = status;
    S.logsEl = box;
  }

  function render() {
    ensure();
    S.logsEl.textContent = S.lines.join("\n");
    S.logsEl.scrollTop = S.logsEl.scrollHeight;
  }

  function log(...a) {
    const msg = `${stamp()} ${a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`;
    S.lines.push(msg);
    if (S.lines.length > 500) S.lines.splice(0, S.lines.length - 500);
    render();
    console.log(msg);
  }

  function status(html) {
    ensure();
    S.statusEl.innerHTML = `STATUS: <span style="font-weight:900;">${html}</span>`;
  }

  return { log, status };
})();

// ---------- helpers ----------
const BASE = (() => {
  // Ensure we behave on GitHub pages subpath: /scarlett-poker-vr/
  const p = location.pathname;
  if (p.includes("/scarlett-poker-vr/")) return "/scarlett-poker-vr/";
  // fallback: root folder
  return p.endsWith("/") ? p : (p.split("/").slice(0, -1).join("/") + "/");
})();

const bust = (url) => {
  const u = new URL(url, location.origin);
  u.searchParams.set("v", String(Date.now()));
  return u.pathname + u.search;
};

async function safeImport(url, label) {
  try {
    Diag.log(`[boot2] import ${url}`);
    const mod = await import(url);
    Diag.log(`[boot2] ok ✅ ${label || url}`);
    return mod;
  } catch (e) {
    Diag.log(`[boot2] fail ❌ ${label || url} :: ${e?.message || e}`);
    throw e;
  }
}

// ---------- BOOT ----------
(async function main() {
  Diag.log("diag start ✅");
  Diag.log(`href=${location.href}`);
  Diag.log(`path=${location.pathname}`);
  Diag.log(`base=${BASE}`);
  Diag.log(`secureContext=${window.isSecureContext}`);
  Diag.log(`ua=${navigator.userAgent}`);
  Diag.log(`navigator.xr=${!!navigator.xr}`);

  try {
    // Three
    const threeUrl = bust("https://unpkg.com/three@0.158.0/build/three.module.js");
    const THREE = await safeImport(threeUrl, "three");
    Diag.log(`[boot2] three import ✅ r${THREE.REVISION}`);

    // VRButton
    const { VRButton } = await safeImport(
      bust("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js"),
      "VRButton"
    );

    // Renderer / scene / camera / rig
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.xr.enabled = true;
    document.body.style.margin = "0";
    document.body.style.background = "#02040a";
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Rig: player(yaw) -> cameraPitch(pitch) -> camera
    const player = new THREE.Group();
    player.name = "PlayerRig";
    scene.add(player);

    const cameraPitch = new THREE.Group();
    cameraPitch.name = "CameraPitch";
    player.add(cameraPitch);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    camera.position.set(0, 1.6, 3.2);
    cameraPitch.add(camera);

    // Controllers
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    player.add(c0);
    player.add(c1);
    const controllers = { c0, c1 };

    // Hands (Quest hand tracking)
    const h0 = renderer.xr.getHand(0);
    const h1 = renderer.xr.getHand(1);
    player.add(h0);
    player.add(h1);
    const hands = { h0, h1 };

    // VRButton
    const btn = VRButton.createButton(renderer);
    btn.style.position = "fixed";
    btn.style.left = "10px";
    btn.style.bottom = "10px";
    btn.style.zIndex = "9999";
    document.body.appendChild(btn);
    Diag.log("VRButton ready ✅");

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // World import (cache-busted)
    const worldUrl = bust(new URL("./world.js", import.meta.url).toString());
    Diag.log(`[boot2] world url=${worldUrl}`);

    const worldMod = await safeImport(worldUrl, "world.js");
    const initWorld = worldMod.initWorld || worldMod.World?.init || worldMod.default?.initWorld;

    if (typeof initWorld !== "function") {
      throw new Error("world.js missing initWorld()");
    }

    Diag.status(`<span style="color:#9ef0b0;">World loading...</span>`);

    const api = await initWorld({
      THREE,
      scene,
      renderer,
      camera,
      cameraPitch,
      player,
      controllers,
      hands,
      log: Diag.log,
      BUILD
    });

    // Render loop
    let last = performance.now();
    renderer.setAnimationLoop((t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;

      api?.update?.(dt, t / 1000);

      renderer.render(scene, camera);
    });

    Diag.status(`<span style="color:#9ef0b0;">World running ✅</span>`);
    Diag.log("[boot2] done ✅");

  } catch (e) {
    Diag.status(`<span style="color:#ff6b6b;">BOOT FAILED ❌</span>`);
    Diag.log(`BOOT ERROR: ${e?.message || e}`);
    console.error(e);
  }
})();

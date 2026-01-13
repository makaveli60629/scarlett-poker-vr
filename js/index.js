// index.js — Scarlett Poker VR Audit Boot v1
// ✅ Runs an automatic repo audit (checks common paths)
// ✅ Boots a visible VR scene even if your old core files are missing
// ✅ Prints every failure to the on-screen HUD (Quest/Android safe)

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const LOG = (m) => (window.__bootlog ? window.__bootlog(m) : console.log(m));
const STATUS = (s) => (window.__bootstatus ? window.__bootstatus(s) : null);

function nowBust(url) {
  return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
}

async function headOk(path) {
  try {
    const r = await fetch(path, { method: 'HEAD', cache: 'no-store' });
    return { ok: r.ok, status: r.status, path };
  } catch (e) {
    return { ok: false, status: 'ERR', path, err: e?.message || String(e) };
  }
}

async function tryImport(path) {
  try {
    LOG(`↳ import ${path}`);
    const mod = await import(nowBust(path));
    LOG(`✅ import ok: ${path}`);
    return mod;
  } catch (e) {
    LOG(`❌ import fail: ${path} :: ${e?.message || e}`);
    return null;
  }
}

// ---- AUDIT ----
// This is the “audit before we do this” — it checks your likely structure:
// - root index.js / index.html
// - js/ entry variants
// - core/ variants
// - known files you’ve used before (world.js, ui.js, controls.js, etc.)

async function runAudit() {
  STATUS('auditing');
  LOG('==============================');
  LOG('AUDIT: scanning common paths…');
  LOG('==============================');

  const candidates = [
    './index.html',
    './index.js',

    // common entry folders
    './js/index.js',
    './js/main.js',

    // common project structure
    './js/world.js',
    './js/ui.js',
    './js/controls.js',
    './js/interactions.js',
    './js/spawn_points.js',
    './js/table.js',
    './js/chair.js',

    // core variants (you mentioned “core files”)
    './core/index.js',
    './core/boot.js',
    './core/world.js',
    './core/ui.js',
    './core/controls.js',
    './core/network.js',
    './core/bots.js',

    // assets folders (HEAD on folders may return 403/404 depending; still useful)
    './assets/',
    './assets/textures/',
    './assets/audio/',
  ];

  for (const p of candidates) {
    const res = await headOk(p);
    if (res.ok) LOG(`OK  ${res.status}  ${p}`);
    else LOG(`BAD ${res.status}  ${p}${res.err ? ' :: ' + res.err : ''}`);
  }

  LOG('==============================');
  LOG('AUDIT COMPLETE ✅');
  LOG('If you see BAD 404 on your core files, we rebuild them clean.');
  LOG('==============================');
  STATUS('audit done');
}

// Make audit callable from the HTML button
window.__runAudit = runAudit;

// ---- BOOT SAFE SCENE ----
// This guarantees you see *something* and controllers show up,
// so even if your old code is broken, the deploy is alive.

async function bootSafeScene() {
  STATUS('booting scene');
  LOG('[boot] starting safe scene…');

  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app container in index.html');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  app.innerHTML = '';
  app.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));
  LOG('[boot] VRButton ready ✅');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.fog = new THREE.Fog(0x050507, 2, 60);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.6, 3);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.25);
  scene.add(hemi);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const anchor = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.35, 0.12, 120, 16),
    new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.55, metalness: 0.05 })
  );
  anchor.position.set(0, 1.6, -1.8);
  scene.add(anchor);

  // Controllers with rays
  function addController(i) {
    const c = renderer.xr.getController(i);
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial());
    line.name = 'ray';
    line.scale.z = 6;
    c.add(line);

    c.addEventListener('connected', (e) => LOG(`🎮 controller${i} connected: ${e?.data?.targetRayMode || 'unknown'}`));
    c.addEventListener('disconnected', () => LOG(`🎮 controller${i} disconnected`));

    scene.add(c);
  }
  addController(0);
  addController(1);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    anchor.rotation.y += dt * 0.8;
    anchor.rotation.x += dt * 0.35;
    renderer.render(scene, camera);
  });

  LOG('[boot] safe scene running ✅');
  STATUS('running');

  return { THREE, renderer, scene, camera };
}

// ---- OPTIONAL: Try to restore your old structure automatically ----
// After the safe scene is running, we attempt to import your “core” entry points.
// If they exist, they will load; if not, HUD will tell you exactly what’s missing.

async function tryRestoreCore(ctx) {
  STATUS('restore attempt');
  LOG('[restore] attempting to load your existing core files…');

  const entryCandidates = [
    './core/index.js',
    './js/index.js',
    './js/main.js',
    './core/boot.js'
  ];

  for (const path of entryCandidates) {
    const ok = await headOk(path);
    if (!ok.ok) continue;

    const mod = await tryImport(path);
    if (!mod) continue;

    // If your core exports a start/init, call it.
    const fn = mod.start || mod.init || mod.boot;
    if (typeof fn === 'function') {
      LOG(`[restore] calling ${path} -> ${fn.name || 'start/init/boot'}()`);
      try {
        await fn({ ...ctx, log: LOG, status: STATUS });
        LOG('[restore] core started ✅');
        STATUS('core running');
        return true;
      } catch (e) {
        LOG('[restore] core start failed ❌ ' + (e?.message || e));
      }
    } else {
      LOG(`[restore] ${path} loaded, but no start/init/boot export found (ok).`);
      STATUS('restore loaded');
      return true;
    }
  }

  LOG('[restore] no core entry found. That means it’s missing or renamed.');
  LOG('Next step: you tell me what your core folder/file names are, OR we rebuild core clean.');
  STATUS('restore none');
  return false;
}

// ---- STARTUP ----
(async function main() {
  try {
    LOG('[index.js] entered ✅');

    // Run audit immediately so you see what exists right away
    await runAudit();

    // Always boot a visible scene (proves deploy + rendering + controllers)
    const ctx = await bootSafeScene();

    // Then attempt to restore your old core system if present
    await tryRestoreCore(ctx);

  } catch (e) {
    LOG('FATAL ❌ ' + (e?.message || e));
    console.error(e);
    STATUS('fatal');
  }
})();

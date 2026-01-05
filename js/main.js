import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";
import { WatchUI } from "./watch_ui.js";

const BUILD_TAG = "LOCKDOWN-ROOM-v2.2";
const TEX_ROOT = "./assets/textures/";

function logLine(el, msg) {
  if (!el) return;
  el.innerHTML += `<div>${msg}</div>`;
}

async function loadFirstTexture(names, repeat = [1, 1]) {
  const loader = new THREE.TextureLoader();
  for (const name of names) {
    const path = TEX_ROOT + name;
    const tex = await new Promise((resolve) => {
      loader.load(
        path,
        (t) => resolve(t),
        undefined,
        () => resolve(null)
      );
    });
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
      return { ok: true, tex, path };
    }
  }
  return { ok: false, tex: null, path: TEX_ROOT + names[0] };
}

function matFromTex(res, fallbackColor = 0x666666, roughness = 0.95) {
  return new THREE.MeshStandardMaterial({
    color: res.ok ? 0xffffff : fallbackColor,
    map: res.ok ? res.tex : null,
    roughness
  });
}

function safeSpawn(rig, v3) {
  rig.position.set(v3.x, 0, v3.z);
  rig.rotation.set(0, 0, 0);
}

export async function boot(statusEl, logEl) {
  const setStatus = (t) => { if (statusEl) statusEl.innerHTML = String(t); };

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "12px";
  vrBtn.style.top = "12px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  // Rig + Camera
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // Textures
  const carpet = await loadFirstTexture(["lobby_carpet.jpg","lobby_carpet.JPG"], [6, 6]);
  const brick  = await loadFirstTexture(["brickwall.jpg","brickwall.JPG"], [5, 2]);
  const ceiling = await loadFirstTexture(["ceiling_dome_main.jpg","ceiling_dome_main.JPG"], [2, 2]);
  const felt = await loadFirstTexture(["table_felt_green.jpg","table_felt_green.JPG"], [1, 1]);
  const trim = await loadFirstTexture(["Table leather trim.jpg","table_leather_trim.jpg","Table_leather_trim.jpg"], [1, 1]);
  const logo = await loadFirstTexture(["brand_logo.jpg","brand_logo.JPG"], [1, 1]);

  logLine(logEl, `🧾 BUILD: <b>${BUILD_TAG}</b>`);
  logLine(logEl, `carpet: ${carpet.ok ? "✅" : "❌"} ${carpet.path}`);
  logLine(logEl, `brick: ${brick.ok ? "✅" : "❌"} ${brick.path}`);
  logLine(logEl, `ceiling: ${ceiling.ok ? "✅" : "❌"} ${ceiling.path}`);
  logLine(logEl, `felt: ${felt.ok ? "✅" : "❌"} ${felt.path}`);
  logLine(logEl, `trim: ${trim.ok ? "✅" : "❌"} ${trim.path}`);
  logLine(logEl, `logo: ${logo.ok ? "✅" : "❌"} ${logo.path}`);

  // Lights (BRIGHTER)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.55));

  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(14, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const warm = new THREE.PointLight(0xffe7c2, 1.6, 55);
  warm.position.set(0, 5.9, 0);
  scene.add(warm);

  const blue = new THREE.PointLight(0x4aa3ff, 1.05, 80);
  blue.position.set(-14, 4.2, -14);
  scene.add(blue);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), matFromTex(carpet, 0x777777, 0.95));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling (so it’s not black void)
  const ceilMat = matFromTex(ceiling, 0x14141a, 0.95);
  ceilMat.side = THREE.DoubleSide;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.4;
  scene.add(ceil);

  // Walls (solid)
  const wallMat = matFromTex(brick, 0x303060, 0.95);
  const wallH = 6.4;
  const thick = 0.6;

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(60, wallH, thick), wallMat);
  wallN.position.set(0, wallH / 2, -30);
  scene.add(wallN);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(60, wallH, thick), wallMat);
  wallS.position.set(0, wallH / 2, 30);
  scene.add(wallS);

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 60), wallMat);
  wallW.position.set(-30, wallH / 2, 0);
  scene.add(wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 60), wallMat);
  wallE.position.set(30, wallH / 2, 0);
  scene.add(wallE);

  // Table
  const table = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.18, 72),
    matFromTex(felt, 0x00ff88, 0.75)
  );
  top.scale.set(1.55, 1, 1);
  top.position.y = 0.92;
  top.castShadow = top.receiveShadow = true;
  table.add(top);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.14, 24, 110),
    matFromTex(trim, 0xffcc00, 0.55)
  );
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1.55, 1, 1);
  ring.position.y = 1.01;
  table.add(ring);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.6, 0.9, 36),
    new THREE.MeshStandardMaterial({ color: 0x111117, roughness: 0.95 })
  );
  base.position.y = 0.45;
  table.add(base);

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.65),
    matFromTex(logo, 0xffffff, 0.75)
  );
  plaque.position.set(0, 1.08, 3.75);
  plaque.rotation.y = Math.PI;
  table.add(plaque);

  scene.add(table);

  // SPAWNS (never inside table)
  const spawns = {
    lobby: new THREE.Vector3(0, 0, 11.0),
    poker: new THREE.Vector3(0, 0, 12.5),
    store: new THREE.Vector3(-12.5, 0, 9.0),
  };

  safeSpawn(rig, spawns.lobby);

  // Controllers attached to rig (so lasers follow YOU)
  rig.add(renderer.xr.getController(0));
  rig.add(renderer.xr.getController(1));

  // Init WatchUI (in-world)
  WatchUI.init({
    scene,
    camera,
    onNavigate: (room) => {
      if (!spawns[room]) return;
      safeSpawn(rig, spawns[room]);
      logLine(logEl, `🚪 Menu teleport -> ${room}`);
      WatchUI.close();
    },
    onAudioToggle: () => {
      logLine(logEl, "🔊 Audio toggle (hook your audio.js next)");
    },
    onReset: () => {
      safeSpawn(rig, spawns.lobby);
      logLine(logEl, "♻️ Reset -> lobby");
    },
  });

  // Init Controls
  Controls.init({ rig, camera, renderer, spawns, colliders: [] });
  Controls.attachHaloToScene(scene);

  Controls.onMenuToggle = () => WatchUI.toggle();
  Controls.onReset = () => safeSpawn(rig, spawns.lobby);

  setStatus(
    `Status: running ✅<br>
     BUILD: ${BUILD_TAG}<br>
     Left stick: move | Right stick: 45° turn | Left trigger: teleport | Menu/Y/Start/StickPress: menu`
  );

  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    Controls.update(dt);

    // Feed menu input state into WatchUI
    WatchUI.update(dt, {
      camera,
      input: Controls.inputForMenu
    });

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";

function loadTextureSafe(url, { repeatX = 1, repeatY = 1 } = {}) {
  const loader = new THREE.TextureLoader();
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

function makeFrame(w, h, depth = 0.06, color = 0x222222) {
  const frame = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.15 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(w + depth * 2, depth, depth), mat);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w + depth * 2, depth, depth), mat);
  const left = new THREE.Mesh(new THREE.BoxGeometry(depth, h, depth), mat);
  const right = new THREE.Mesh(new THREE.BoxGeometry(depth, h, depth), mat);

  top.position.set(0, h / 2 + depth / 2, 0);
  bot.position.set(0, -h / 2 - depth / 2, 0);
  left.position.set(-w / 2 - depth / 2, 0, 0);
  right.position.set(w / 2 + depth / 2, 0, 0);

  frame.add(top, bot, left, right);
  return frame;
}

async function makeArtPanel(imgPath, w = 3.2, h = 1.8) {
  const group = new THREE.Group();
  const tex = await loadTextureSafe(imgPath);

  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.05,
      map: tex || null
    })
  );

  const frame = makeFrame(w, h, 0.08, 0x2b2b2b);
  frame.position.z = 0.03;

  group.add(backing);
  group.add(frame);
  return group;
}

async function buildCasinoTable({ scene }) {
  // Oval table base
  const table = new THREE.Group();

  const feltTex = await loadTextureSafe("./assets/textures/table_felt_green.jpg", { repeatX: 1, repeatY: 1 });
  const trimTex = await loadTextureSafe("./assets/textures/Table leather trim.jpg", { repeatX: 1, repeatY: 1 });
  const logoTex = await loadTextureSafe("./assets/textures/brand_logo.jpg", { repeatX: 1, repeatY: 1 });

  // Felt top (oval-ish by scaling cylinder)
  const topGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.18, 64);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x0f7a40,
    roughness: 0.75,
    metalness: 0.05,
    map: feltTex || null
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.scale.set(1.55, 1, 1); // elongate
  top.position.y = 0.92;
  top.castShadow = true;
  top.receiveShadow = true;

  // Trim ring
  const trimGeo = new THREE.TorusGeometry(3.25, 0.14, 24, 90);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a10,
    roughness: 0.55,
    metalness: 0.08,
    map: trimTex || null
  });
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.rotation.x = Math.PI / 2;
  trim.scale.set(1.55, 1, 1);
  trim.position.y = 1.01;
  trim.castShadow = true;

  // Base pedestal
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.5, 0.9, 32),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.92, metalness: 0.08 })
  );
  base.position.y = 0.45;
  base.castShadow = true;
  base.receiveShadow = true;

  // Logo plaque (on one side)
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.55),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.05,
      map: logoTex || null
    })
  );
  plaque.position.set(0, 1.05, 3.55);
  plaque.rotation.y = Math.PI; // face outward
  plaque.scale.set(1.2, 1.2, 1);

  table.add(top, trim, base, plaque);

  // Collision body (simple invisible box around table)
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 2.2, 6.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  collider.position.set(0, 1.0, 0);
  collider.userData.isCollider = true;
  table.add(collider);

  table.position.set(0, 0, 0);
  scene.add(table);

  return table;
}

export async function boot(statusEl) {
  const setStatus = (t) => { if (statusEl) statusEl.innerHTML = String(t); };

  // renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.top = "12px";
  vrBtn.style.right = "12px";
  vrBtn.style.zIndex = "20";
  document.body.appendChild(vrBtn);

  // scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070d);

  // rig + camera
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 150);
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // Safe spawn (ALWAYS away from table)
  rig.position.set(0, 0, 8.5);
  rig.rotation.set(0, 0, 0);

  // Textures
  const carpetTex = await loadTextureSafe("./assets/textures/lobby_carpet.jpg", { repeatX: 6, repeatY: 6 });
  const ceilingTex = await loadTextureSafe("./assets/textures/ceiling_dome_main.jpg", { repeatX: 2, repeatY: 2 });
  const brickTex = await loadTextureSafe("./assets/textures/brickwall.jpg", { repeatX: 5, repeatY: 2 });

  // lights (casino look)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 1.0));

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(10, 14, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  // Warm downlights
  const down1 = new THREE.PointLight(0xffe7c2, 0.95, 22);
  down1.position.set(0, 5.4, 2);
  scene.add(down1);

  const down2 = new THREE.PointLight(0xffe7c2, 0.95, 22);
  down2.position.set(0, 5.4, -2);
  scene.add(down2);

  // Blue accent rim
  const rim = new THREE.PointLight(0x4aa3ff, 0.55, 40);
  rim.position.set(-10, 4.5, -10);
  scene.add(rim);

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.95,
      map: carpetTex || null
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ceiling (textured, not black)
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.02,
      map: ceilingTex || null,
      side: THREE.DoubleSide
    })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.2;
  ceil.receiveShadow = true;
  scene.add(ceil);

  // walls (solid)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    map: brickTex || null
  });

  const wallH = 6.2;
  const thick = 0.6;

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(46, wallH, thick), wallMat);
  wallN.position.set(0, wallH / 2, -23);
  wallN.castShadow = true;
  wallN.receiveShadow = true;
  scene.add(wallN);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(46, wallH, thick), wallMat);
  wallS.position.set(0, wallH / 2, 23);
  wallS.castShadow = true;
  wallS.receiveShadow = true;
  scene.add(wallS);

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 46), wallMat);
  wallW.position.set(-23, wallH / 2, 0);
  wallW.castShadow = true;
  wallW.receiveShadow = true;
  scene.add(wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 46), wallMat);
  wallE.position.set(23, wallH / 2, 0);
  wallE.castShadow = true;
  wallE.receiveShadow = true;
  scene.add(wallE);

  // Table zone marker (for navigation + clarity)
  const tableZone = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.1, 0.08, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f7a40, roughness: 0.6, metalness: 0.1 })
  );
  tableZone.position.set(0, 0.04, 0);
  tableZone.receiveShadow = true;
  scene.add(tableZone);

  // Build the actual casino table (oval + trim + logo plaque)
  await buildCasinoTable({ scene });

  // Add wall art (uses your textures; falls back to dark if missing)
  const art1 = await makeArtPanel("./assets/textures/casino_art.jpg", 3.4, 2.0);
  art1.position.set(-10, 3.2, -22.6);
  art1.rotation.y = 0;
  scene.add(art1);

  const art2 = await makeArtPanel("./assets/textures/Casinoart2.jpg", 3.4, 2.0);
  art2.position.set(10, 3.2, -22.6);
  art2.rotation.y = 0;
  scene.add(art2);

  // Big brand logo wall panel (main wall)
  const logoTex = await loadTextureSafe("./assets/textures/brand_logo.jpg");
  const logoWall = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 2.5),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.05,
      map: logoTex || null
    })
  );
  logoWall.position.set(0, 3.4, -22.4);
  logoWall.rotation.y = 0;
  scene.add(logoWall);

  // Spawn marker ring
  const spawnMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  spawnMarker.rotation.x = -Math.PI / 2;
  spawnMarker.position.set(rig.position.x, 0.03, rig.position.z);
  scene.add(spawnMarker);

  // controllers + lasers (must be inside rig)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  function addLaser(ctrl, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 7;
    ctrl.add(line);
  }
  addLaser(c0, 0x00ccff);
  addLaser(c1, 0xffaa00);

  // controls
  Controls.init({ rig, camera, renderer });

  setStatus(`Status: running ✅<br>
  Casino build loaded ✅<br>
  Left stick move ✅ Right stick snap turn ✅<br>
  Spawn safe ✅`);

  // loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    Controls.update(dt);
    renderer.render(scene, camera);
  });

  // resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

import { World } from "./world.js";
import { PokerTable } from "./table.js";
import { EventChips } from "./event_chips.js";

/**
 * Scarlett Poker VR - MAIN (FULL)
 * Fixes:
 *  - Under-floor XR issue (correct reference space + viewer height handling)
 *  - Spawn snapping to table/origin on XR session start
 *  - Safe spawn (never inside table zone / colliders)
 *  - Solid collisions for walls/table using Box3
 *  - Left stick locomotion + right stick snap turn + left trigger teleport halo
 */

export async function boot({ statusEl, errEl, vrCorner }) {
  const state = {
    room: "lobby",
    inXR: false,
    spawns: {
      lobby: new THREE.Vector3(0, 0, 7.5),
      poker: new THREE.Vector3(0, 0, 8.0),
      store: new THREE.Vector3(12, 0, 6.5),
    },
  };

  // --- scene / renderer ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;

  // IMPORTANT: floor-based XR space (prevents under-floor / weird height)
  renderer.xr.setReferenceSpaceType("local-floor");

  document.body.appendChild(renderer.domElement);

  // --- camera / rig ---
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);

  // Rig base stays on floor (y=0). XR will place camera height automatically in local-floor.
  const playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  scene.add(playerRig);

  // Viewer offset group:
  // - Non-XR: raise to 1.65
  // - XR: keep at 0 (XR provides real head height)
  const viewer = new THREE.Group();
  viewer.name = "Viewer";
  viewer.position.set(0, 1.65, 0); // non-XR default
  viewer.add(camera);
  playerRig.add(viewer);

  // --- VR Button in top-right ---
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "relative";
  vrBtn.style.margin = "0";
  vrCorner.appendChild(vrBtn);

  // --- lighting ---
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.95);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(10, 18, 6);
  scene.add(key);

  const fill = new THREE.PointLight(0x88bbff, 0.85, 40);
  fill.position.set(-8, 6, 8);
  scene.add(fill);

  const warm = new THREE.PointLight(0xffcc88, 0.75, 40);
  warm.position.set(8, 6, 8);
  scene.add(warm);

  // --- build world/table ---
  statusEl.textContent = "Status: building world…";
  const build = World.build(scene);

  statusEl.textContent = "Status: building table…";
  const table = PokerTable.build(scene);
  build.colliders.push(...table.colliders);

  statusEl.textContent = "Status: building chips…";
  const chips = EventChips.build(scene);
  chips.setDropZone(new THREE.Vector3(-2.2, 1.05, 5.4));

  // --- controllers (always attached to rig) ---
  const controllerModelFactory = new XRControllerModelFactory();

  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  controller1.name = "Controller1";
  controller2.name = "Controller2";
  playerRig.add(controller1);
  playerRig.add(controller2);

  const grip1 = renderer.xr.getControllerGrip(0);
  grip1.add(controllerModelFactory.createControllerModel(grip1));
  playerRig.add(grip1);

  const grip2 = renderer.xr.getControllerGrip(1);
  grip2.add(controllerModelFactory.createControllerModel(grip2));
  playerRig.add(grip2);

  // --- lasers ---
  function makeLaser() {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 12;
    return line;
  }
  controller1.add(makeLaser());
  controller2.add(makeLaser());

  // --- teleport halo ---
  const haloGeo = new THREE.RingGeometry(0.22, 0.28, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x44ffaa,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.visible = false;
  scene.add(halo);

  // --- collider movement ---
  const playerRadius = 0.25;

  function collidesAt(pos) {
    const feet = new THREE.Vector3(pos.x, pos.y + playerRadius, pos.z);
    const chest = new THREE.Vector3(pos.x, pos.y + 1.1, pos.z);
    for (const box of build.colliders) {
      if (box.distanceToPoint(feet) < playerRadius) return true;
      if (box.distanceToPoint(chest) < playerRadius) return true;
    }
    return false;
  }

  function safeMove(deltaVec) {
    const next = playerRig.position.clone().add(deltaVec);
    next.y = 0; // keep rig base on floor
    if (!collidesAt(next)) playerRig.position.copy(next);
  }

  // --- safe spawn finder ---
  function findNearestSafeSpawn(startPos) {
    const base = new THREE.Vector3(startPos.x, 0, startPos.z);

    // extra protection: never spawn in table zone
    if (!collidesAt(base) && !table.isPointInNoTeleportZone(base)) return base;

    const step = 0.35;
    for (let r = 1; r <= 24; r++) {
      const radius = r * step;
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const p = new THREE.Vector3(
          base.x + Math.cos(a) * radius,
          0,
          base.z + Math.sin(a) * radius
        );
        if (!collidesAt(p) && !table.isPointInNoTeleportZone(p)) return p;
      }
    }

    // fallback far from table
    return new THREE.Vector3(0, 0, 10);
  }

  function setRoom(roomName) {
    state.room = roomName;
    const desired = state.spawns[roomName] || state.spawns.lobby;
    const safe = findNearestSafeSpawn(desired);
    playerRig.position.copy(safe);
  }

  // Set initial room spawn BEFORE XR starts
  setRoom("lobby");

  // --- XR gamepad read ---
  const raycaster = new THREE.Raycaster();
  const tmpRot = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  const xr = {
    left: { axes: [], buttons: [] },
    right: { axes: [], buttons: [] },
    snapCooldown: 0,
    teleportHeld: false,
    lastTeleportPoint: null,
  };

  function readGamepad(source, out) {
    const gp = source?.gamepad;
    if (!gp) return;
    out.axes = gp.axes.slice(0);
    out.buttons = gp.buttons.map((b) => ({ pressed: b.pressed, value: b.value }));
  }

  function getYawFromCamera() {
    const e = new THREE.Euler(0, 0, 0, "YXZ");
    e.setFromQuaternion(camera.quaternion);
    return e.y;
  }

  function snapTurn(amountRad) {
    const camWorld = new THREE.Vector3();
    camera.getWorldPosition(camWorld);

    const rigPos = playerRig.position.clone();
    const pivot = new THREE.Vector3(camWorld.x, rigPos.y, camWorld.z);

    playerRig.position.sub(pivot);
    playerRig.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), amountRad);
    playerRig.position.add(pivot);

    playerRig.rotation.y += amountRad;
  }

  function updateTeleportAim() {
    halo.visible = false;
    xr.lastTeleportPoint = null;

    const src = controller1; // left hand aims teleport

    tmpRot.identity().extractRotation(src.matrixWorld);
    tmpPos.setFromMatrixPosition(src.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpRot).normalize();

    raycaster.set(tmpPos, tmpDir);
    raycaster.far = 30;

    const hits = raycaster.intersectObjects(build.floorPlanes, false);
    if (!hits.length) return;

    const p = hits[0].point.clone();
    p.y = 0;

    // never land in table zone
    if (table.isPointInNoTeleportZone(p)) return;
    if (collidesAt(p)) return;

    halo.position.set(p.x, 0.01, p.z);
    halo.visible = true;
    xr.lastTeleportPoint = p;
  }

  function doTeleport() {
    if (!xr.lastTeleportPoint) return;
    playerRig.position.set(xr.lastTeleportPoint.x, 0, xr.lastTeleportPoint.z);
  }

  // --- XR session events (THE BIG FIX) ---
  renderer.xr.addEventListener("sessionstart", () => {
    state.inXR = true;

    // XR already supplies height in local-floor; remove artificial height
    viewer.position.set(0, 0, 0);

    // IMPORTANT: some devices reset world origin on session start.
    // Re-apply current room spawn so you DON'T snap to table/origin.
    setRoom(state.room);

    statusEl.textContent = "Status: XR session ✅";
  });

  renderer.xr.addEventListener("sessionend", () => {
    state.inXR = false;

    // restore non-XR eye height
    viewer.position.set(0, 1.65, 0);

    statusEl.textContent = "Status: XR session ended";
  });

  // --- basic desktop room switching (optional) ---
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "1") setRoom("lobby");
    if (k === "2") setRoom("poker");
    if (k === "3") setRoom("store");
    if (k === "r") setRoom(state.room);
  });

  // --- loop ---
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);

    const session = renderer.xr.getSession();
    if (session) {
      const sources = session.inputSources || [];
      const leftSrc = sources.find((s) => s.handedness === "left") || sources[0];
      const rightSrc = sources.find((s) => s.handedness === "right") || sources[1] || sources[0];

      readGamepad(leftSrc, xr.left);
      readGamepad(rightSrc, xr.right);

      const lx = xr.left.axes[2] ?? xr.left.axes[0] ?? 0;
      const ly = xr.left.axes[3] ?? xr.left.axes[1] ?? 0;
      const rx = xr.right.axes[2] ?? xr.right.axes[0] ?? 0;

      const dead = 0.16;
      const moveSpeed = 2.0;

      // Move relative to camera yaw
      if (Math.abs(lx) > dead || Math.abs(ly) > dead) {
        const yaw = getYawFromCamera();
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        const v = new THREE.Vector3();
        v.addScaledVector(forward, (-ly) * moveSpeed * dt);
        v.addScaledVector(right, (lx) * moveSpeed * dt);
        safeMove(v);
      }

      // Snap turn 45°
      if (xr.snapCooldown > 0) xr.snapCooldown -= dt;
      if (xr.snapCooldown <= 0) {
        if (rx > 0.75) { snapTurn(-Math.PI / 4); xr.snapCooldown = 0.25; }
        if (rx < -0.75) { snapTurn(Math.PI / 4); xr.snapCooldown = 0.25; }
      }

      // Teleport with left trigger hold/release
      const leftTriggerPressed =
        xr.left.buttons?.[0]?.pressed ||
        (xr.left.buttons?.[1]?.value ?? 0) > 0.65;

      if (leftTriggerPressed) {
        xr.teleportHeld = true;
        updateTeleportAim();
      } else {
        if (xr.teleportHeld) doTeleport();
        xr.teleportHeld = false;
        halo.visible = false;
      }
    }

    chips.update(dt);
    renderer.render(scene, camera);
  });

  // resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  statusEl.textContent = "Status: ready ✅";
}

// /js/scarlett1/spine_xr.js — Scarlett 1.0 XR Spine (Permanent)
// Controllers + lasers + teleport trigger + rig helpers (safe, modular)

export const SpineXR = (() => {
  const S = {
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    player: null,

    // controller objects
    c0: null,
    c1: null,
    g0: null,
    g1: null,

    // visuals
    lasers: [],
    reticles: { left: null, right: null },

    // teleport
    lastHit: { left: null, right: null },
    tmpM: null,
    tmpV: null,
    tmpDir: null,
    ray: null,

    // refs from world
    getGroundMeshes: null,
    log: console.log
  };

  function init({ THREE, renderer, scene, camera, player, getGroundMeshes, log }) {
    S.THREE = THREE;
    S.renderer = renderer;
    S.scene = scene;
    S.camera = camera;
    S.player = player;
    S.getGroundMeshes = getGroundMeshes || (() => []);
    S.log = log || console.log;

    S.tmpM = new THREE.Matrix4();
    S.tmpV = new THREE.Vector3();
    S.tmpDir = new THREE.Vector3();
    S.ray = new THREE.Raycaster();

    installControllers();
    installReticles();

    S.log("[spine_xr] init ✅");
    return api();
  }

  function api() {
    return { state: S, update, teleportTo, controllers: () => ({ c0: S.c0, c1: S.c1, g0: S.g0, g1: S.g1 }) };
  }

  function installControllers() {
    const { THREE, renderer, scene } = S;

    S.c0 = renderer.xr.getController(0);
    S.c1 = renderer.xr.getController(1);
    scene.add(S.c0, S.c1);

    S.g0 = renderer.xr.getControllerGrip(0);
    S.g1 = renderer.xr.getControllerGrip(1);
    scene.add(S.g0, S.g1);

    // lasers
    S.lasers = [];
    addLaser(S.c0, "left", 0xff55ff);
    addLaser(S.c1, "right", 0x55aaff);

    // teleport trigger (right controller)
    S.c1.addEventListener("selectstart", () => tryTeleport("right"));
    // optional: allow left select too
    S.c0.addEventListener("selectstart", () => tryTeleport("left"));
  }

  function addLaser(controller, hand, color) {
    const { THREE } = S;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    line.name = `LASER_${hand.toUpperCase()}`;
    line.scale.z = 14;
    controller.add(line);
    S.lasers.push({ controller, hand, line });
  }

  function installReticles() {
    const { THREE, scene } = S;

    const make = (color) => {
      const g = new THREE.RingGeometry(0.12, 0.18, 32);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const r = new THREE.Mesh(g, m);
      r.rotation.x = -Math.PI / 2;
      r.visible = false;

      // soft glow dot in middle
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 })
      );
      dot.rotation.x = -Math.PI / 2;
      dot.position.y = 0.001;
      r.add(dot);

      scene.add(r);
      return r;
    };

    S.reticles.left = make(0xff55ff);
    S.reticles.right = make(0x55aaff);
  }

  function tryTeleport(hand) {
    const hit = S.lastHit[hand];
    if (!hit) return;
    teleportTo(hit);
  }

  function teleportTo(pos) {
    // teleport player rig root (keep y stable, set x/z)
    try {
      S.player.position.set(pos.x, pos.y, pos.z);
    } catch {}
  }

  function update() {
    const { renderer } = S;
    const presenting = !!renderer?.xr?.isPresenting;

    for (const L of S.lasers) {
      L.line.visible = presenting;
      if (!presenting) {
        setReticle(L.hand, null);
        continue;
      }
      const hit = raycastFromController(L.controller);
      setReticle(L.hand, hit);
      S.lastHit[L.hand] = hit;
    }
  }

  function setReticle(hand, hit) {
    const r = hand === "left" ? S.reticles.left : S.reticles.right;
    if (!r) return;
    if (!hit) {
      r.visible = false;
      return;
    }
    r.visible = true;
    r.position.set(hit.x, hit.y + 0.01, hit.z);
  }

  function raycastFromController(ctrl) {
    const { tmpM, tmpV, tmpDir, ray } = S;
    const grounds = S.getGroundMeshes?.() || [];
    if (!grounds.length) return null;

    tmpM.identity().extractRotation(ctrl.matrixWorld);
    const origin = tmpV.setFromMatrixPosition(ctrl.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpM).normalize();
    ray.set(origin, tmpDir);

    const hits = ray.intersectObjects(grounds, true);
    if (!hits.length) return null;

    const p = hits[0].point;
    return { x: p.x, y: p.y, z: p.z };
  }

  return { init };
})();
export default SpineXR;

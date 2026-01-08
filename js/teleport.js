// /js/teleport.js — Scarlett Teleport v10.7 (WIRED)
// - Toggleable from HUD (scarlett-toggle-teleport)
// - Marker hidden + teleport disabled when off
export const Teleport = {
  init({ THREE, scene, renderer, player, controllers = [], log, world }) {
    const L = (...a) => { try { log?.(...a); } catch { console.log(...a); } };

    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    let enabled = true;
    try {
      const f = window.__SCARLETT_FLAGS;
      if (f) enabled = !!f.teleport;
    } catch {}

    // Marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    marker.name = "TeleportMarker";
    scene.add(marker);

    // Tele targets
    const teleTargets = [];
    if (world?.floor) teleTargets.push(world.floor);
    scene.traverse((o) => {
      if (o?.isMesh && (o.name === "Floor" || o.name === "floor")) teleTargets.push(o);
    });

    let lastHitOK = false;

    function controllerRay(controller) {
      tempMat.identity().extractRotation(controller.matrixWorld);
      tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();
      const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      raycaster.set(origin, tempDir);
      raycaster.far = 30;
      return raycaster;
    }

    function updateMarker() {
      if (!enabled) { marker.visible = false; lastHitOK = false; return; }

      const c = controllers[1] || controllers[0];
      if (!c) return;

      const rc = controllerRay(c);
      const hits = rc.intersectObjects(teleTargets.length ? teleTargets : [world?.group || scene], true);

      if (hits && hits.length) {
        hitPoint.copy(hits[0].point);
        marker.position.set(hitPoint.x, 0.02, hitPoint.z);
        marker.visible = true;
        lastHitOK = true;
      } else {
        marker.visible = false;
        lastHitOK = false;
      }
    }

    function doTeleport() {
      if (!enabled) return;
      if (!lastHitOK) return;
      player.position.set(marker.position.x, 0, marker.position.z);
      L("[teleport] moved ✅");
    }

    for (const c of controllers) {
      c.addEventListener("selectstart", doTeleport);
      c.addEventListener("squeezestart", doTeleport);
    }

    // HUD toggle
    window.addEventListener("scarlett-toggle-teleport", (e) => {
      enabled = !!e?.detail;
      marker.visible = false;
      lastHitOK = false;
      L("[teleport] enabled=", enabled);
    });

    L("[teleport] ready ✅");

    return {
      setEnabled(v) {
        enabled = !!v;
        marker.visible = false;
        lastHitOK = false;
      },
      update() {
        updateMarker();
        if (!marker.visible) return;
        marker.userData.t = (marker.userData.t || 0) + 0.016;
        marker.material.opacity = 0.65 + Math.sin(marker.userData.t * 4.0) * 0.18;
      }
    };
  }
};

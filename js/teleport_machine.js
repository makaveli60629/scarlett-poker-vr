// /js/teleport_machine.js — Scarlett Poker VR (TeleportMachine v1.0)
// GitHub Pages safe module (no "three" import). World/main passes THREE in.

export const TeleportMachine = (() => {
  let _THREE = null;
  let _log = console.log;

  let machine = null;
  let marker = null;
  let baseRing = null;
  let glowRing = null;
  let light = null;

  let teleTargets = [];
  let controllers = [];
  let playerRig = null;

  const raycaster = { v: null, rc: null };
  let lastHitOK = false;
  let lastHitPoint = null;

  function safeLog(...args) { try { _log(...args); } catch {} }

  function makeMachineMesh() {
    const g = new _THREE.Group();
    g.name = "TeleportMachine";

    // pedestal
    const pedestal = new _THREE.Mesh(
      new _THREE.CylinderGeometry(0.28, 0.36, 0.22, 24),
      new _THREE.MeshStandardMaterial({ color: 0x10121a, roughness: 0.9, metalness: 0.1 })
    );
    pedestal.position.y = 0.11;
    g.add(pedestal);

    // core orb
    const orb = new _THREE.Mesh(
      new _THREE.SphereGeometry(0.10, 18, 14),
      new _THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.3,
        roughness: 0.25,
        metalness: 0.1,
      })
    );
    orb.position.y = 0.31;
    orb.name = "TeleportOrb";
    g.add(orb);

    // ring base
    baseRing = new _THREE.Mesh(
      new _THREE.TorusGeometry(0.42, 0.04, 10, 48),
      new _THREE.MeshStandardMaterial({ color: 0x1b1c26, roughness: 0.85, metalness: 0.1 })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.02;
    g.add(baseRing);

    // glow ring
    glowRing = new _THREE.Mesh(
      new _THREE.TorusGeometry(0.42, 0.016, 10, 64),
      new _THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        emissive: 0x2bd7ff,
        emissiveIntensity: 1.5,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
      })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.03;
    g.add(glowRing);

    // light
    light = new _THREE.PointLight(0x2bd7ff, 0.9, 6);
    light.position.set(0, 0.45, 0);
    g.add(light);

    // marker (teleport destination)
    marker = new _THREE.Mesh(
      new _THREE.RingGeometry(0.25, 0.38, 52),
      new _THREE.MeshBasicMaterial({
        color: 0x7fe7ff,
        transparent: true,
        opacity: 0.85,
        side: _THREE.DoubleSide,
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    marker.name = "TeleportMarker";
    g.add(marker);

    // Save a reference for animation
    g.userData.orb = orb;
    g.userData.t = 0;

    return g;
  }

  function ensureRaycaster() {
    if (!raycaster.rc) raycaster.rc = new _THREE.Raycaster();
    if (!raycaster.v) raycaster.v = new _THREE.Vector3();
    if (!lastHitPoint) lastHitPoint = new _THREE.Vector3();
  }

  function getControllerRay(controller) {
    ensureRaycaster();

    // direction: controller forward (0,0,-1) rotated by controller world rotation
    const m = new _THREE.Matrix4().extractRotation(controller.matrixWorld);
    const dir = raycaster.v.set(0, 0, -1).applyMatrix4(m).normalize();

    const origin = new _THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);

    raycaster.rc.set(origin, dir);
    raycaster.rc.far = 30;
    return raycaster.rc;
  }

  function updateMarkerFromController() {
    if (!machine) return;

    // Prefer right controller if exists
    const c = controllers[1] || controllers[0];
    if (!c) {
      marker.visible = false;
      lastHitOK = false;
      return;
    }

    const rc = getControllerRay(c);
    const hits = rc.intersectObjects(teleTargets, true);

    if (hits && hits.length) {
      lastHitPoint.copy(hits[0].point);
      marker.position.set(lastHitPoint.x - machine.position.x, 0.01, lastHitPoint.z - machine.position.z);
      marker.visible = true;
      lastHitOK = true;
    } else {
      marker.visible = false;
      lastHitOK = false;
    }
  }

  function doTeleport() {
    if (!playerRig || !lastHitOK || !lastHitPoint) return;
    // Move rig to destination (keep y=0 for floor space)
    playerRig.position.set(lastHitPoint.x, 0, lastHitPoint.z);
    safeLog("[TeleportMachine] ✅ teleported to", lastHitPoint.x.toFixed(2), lastHitPoint.z.toFixed(2));
  }

  function bindInputs() {
    // VR controller triggers
    controllers.forEach((c) => {
      if (!c) return;
      c.addEventListener("selectstart", doTeleport);
      c.addEventListener("squeezestart", doTeleport);
    });

    // Desktop / mobile fallback: tap/click teleports to current marker (if visible)
    window.addEventListener("pointerdown", () => {
      if (marker?.visible) doTeleport();
    });
  }

  function pickTeleportTargets(sceneOrGroup) {
    teleTargets = [];

    // Priority: mesh named "Floor" or "floor" (your world can name it)
    sceneOrGroup.traverse?.((o) => {
      if (o?.isMesh && (o.name === "Floor" || o.name === "floor")) teleTargets.push(o);
    });

    // If none found, fall back to any big plane geometry-ish meshes
    if (!teleTargets.length) {
      sceneOrGroup.traverse?.((o) => {
        if (!o?.isMesh) return;
        const g = o.geometry;
        if (!g) return;
        const type = g.type || "";
        if (type.includes("Plane") || type.includes("Box")) teleTargets.push(o);
      });
    }

    safeLog("[TeleportMachine] targets:", teleTargets.length);
  }

  return {
    /**
     * Build and return the machine group.
     * Call signature matches your world.js usage:
     * TeleportMachine.build({ THREE, scene: world.group, texLoader, log, playerRig?, controllers? })
     */
    build({ THREE, scene, log = console.log, playerRig: rig = null, controllers: ctrls = null }) {
      _THREE = THREE;
      _log = log || console.log;

      machine = makeMachineMesh();
      scene.add(machine);

      // Store references if provided
      playerRig = rig || null;
      controllers = Array.isArray(ctrls) ? ctrls : [];

      // Discover floor/targets under provided scene/group
      pickTeleportTargets(scene);

      // Only bind once
      try { bindInputs(); } catch {}

      safeLog("[TeleportMachine] build ✅");
      return machine;
    },

    /**
     * Optionally called from world tick.
     */
    tick(dt = 0.016) {
      if (!machine) return;

      machine.userData.t += dt;

      // Animate orb + glow
      const t = machine.userData.t;
      if (machine.userData.orb) {
        machine.userData.orb.position.y = 0.31 + Math.sin(t * 2.2) * 0.02;
        machine.userData.orb.material.emissiveIntensity = 1.25 + Math.sin(t * 3.2) * 0.35;
      }

      if (glowRing?.material) {
        glowRing.material.opacity = 0.75 + Math.sin(t * 3.0) * 0.18;
        glowRing.material.emissiveIntensity = 1.25 + Math.sin(t * 3.0) * 0.35;
      }

      if (light) {
        light.intensity = 0.85 + Math.sin(t * 3.2) * 0.25;
      }

      // Update marker from controller ray
      try { updateMarkerFromController(); } catch {}
    },

    /**
     * Allow main.js to inject controllers and rig later (recommended).
     */
    connect({ playerRig: rig, controllers: ctrls }) {
      if (rig) playerRig = rig;
      if (Array.isArray(ctrls)) controllers = ctrls;
      safeLog("[TeleportMachine] connect ✅");
    }
  };
})();

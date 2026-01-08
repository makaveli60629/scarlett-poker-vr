// /js/teleport.js — Scarlett Teleport v2.0 (Quest/WebXR, stable, trimmed)
// Fixes / upgrades:
// - preserves player Y (does NOT force y=0)
// - clamps teleport to world.roomClamp (solid boundaries)
// - reuses temp vectors (less GC stutter on Quest)
// - marker sits slightly above surface + pulses with dt
// - optional beam + hit spark visuals
// - ignores non-floor hits unless named Floor/floor OR world.floor is provided

export const Teleport = {
  init({ THREE, scene, renderer, camera, player, controllers, log = console.log, world }) {
    const L = (...a) => { try { log?.(...a); } catch { console.log(...a); } };

    const raycaster = new THREE.Raycaster();

    // temps (NO allocations per frame)
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const tempOrigin = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    // ---------- Visuals ----------
    // Marker (ring)
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 56),
      new THREE.MeshBasicMaterial({
        color: 0x7fe7ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    marker.name = "TeleportMarker";
    scene.add(marker);

    // Marker inner glow puck (nice “trimming”)
    const puck = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 48),
      new THREE.MeshBasicMaterial({ color: 0x2bd7ff, transparent: true, opacity: 0.22 })
    );
    puck.rotation.x = -Math.PI / 2;
    marker.add(puck);

    // Beam (from controller)
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const beamMat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 });
    const beam = new THREE.Line(beamGeo, beamMat);
    beam.name = "TeleportBeam";
    beam.scale.z = 12;
    beam.visible = false;

    // Little “hit spark” at marker center
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.8 })
    );
    spark.name = "TeleportSpark";
    spark.visible = false;
    scene.add(spark);

    // Attach beam to the “teleport controller” (prefer right)
    const useController = () => controllers?.[1] || controllers?.[0] || null;
    const beamParent = useController();
    if (beamParent) beamParent.add(beam);

    // ---------- Teleportable surfaces ----------
    // Prefer world.floor, else any mesh named Floor/floor
    const teleTargets = [];
    if (world?.floor) teleTargets.push(world.floor);

    scene.traverse((o) => {
      if (o?.isMesh && (o.name === "Floor" || o.name === "floor")) {
        if (!teleTargets.includes(o)) teleTargets.push(o);
      }
    });

    // If nothing found, we still raycast against world.group/scene
    const fallbackTargets = [world?.group || scene];

    // ---------- State ----------
    const st = {
      enabled: true,
      t: 0,
      lastHitOK: false,
      lastHitPoint: new THREE.Vector3(),
      activeHand: 1, // 1 = right, 0 = left
    };

    // ---------- Helpers ----------
    function controllerRay(controller) {
      // direction = controller -Z in world
      tempMat.identity().extractRotation(controller.matrixWorld);
      tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();

      tempOrigin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.set(tempOrigin, tempDir);
      raycaster.far = 35;

      return raycaster;
    }

    function clampToRoom(p) {
      if (!world?.roomClamp) return p;

      p.x = Math.max(world.roomClamp.minX, Math.min(world.roomClamp.maxX, p.x));
      p.z = Math.max(world.roomClamp.minZ, Math.min(world.roomClamp.maxZ, p.z));
      return p;
    }

    function updateMarker(dt) {
      const c = controllers?.[st.activeHand] || controllers?.[1] || controllers?.[0];
      if (!c) {
        marker.visible = false;
        beam.visible = false;
        spark.visible = false;
        st.lastHitOK = false;
        return;
      }

      const rc = controllerRay(c);

      const targets = teleTargets.length ? teleTargets : fallbackTargets;
      const hits = rc.intersectObjects(targets, true);

      if (hits && hits.length) {
        // If we used fallbackTargets, prefer hits on meshes called Floor/floor if possible
        let h = hits[0];
        if (!teleTargets.length) {
          for (const cand of hits) {
            const n = cand?.object?.name || "";
            if (n === "Floor" || n === "floor") { h = cand; break; }
          }
        }

        hitPoint.copy(h.point);
        clampToRoom(hitPoint);

        // Place marker slightly above the surface
        marker.position.set(hitPoint.x, (h.point.y ?? 0) + 0.02, hitPoint.z);
        marker.visible = true;

        // Beam visible if we have a controller; scale it to hit distance
        beam.visible = true;
        const d = tempOrigin.distanceTo(hitPoint);
        beam.scale.z = Math.max(1.0, Math.min(35, d));

        // Spark
        spark.visible = true;
        spark.position.set(hitPoint.x, marker.position.y + 0.02, hitPoint.z);

        st.lastHitOK = true;
        st.lastHitPoint.copy(hitPoint);
      } else {
        marker.visible = false;
        beam.visible = false;
        spark.visible = false;
        st.lastHitOK = false;
      }

      // Pulse visuals
      st.t += dt;
      const pulse = 0.65 + Math.sin(st.t * 4.2) * 0.18;
      marker.material.opacity = pulse;
      puck.material.opacity = 0.14 + Math.sin(st.t * 4.2 + 0.8) * 0.08;
      spark.material.opacity = 0.55 + Math.sin(st.t * 7.0) * 0.25;
      const s = 0.9 + Math.sin(st.t * 5.5) * 0.08;
      spark.scale.setScalar(s);
    }

    function doTeleport() {
      if (!st.enabled || !st.lastHitOK) return;

      // Preserve rig Y. Move only X/Z.
      const y = player.position.y;
      const tp = st.lastHitPoint.clone();
      clampToRoom(tp);

      player.position.set(tp.x, y, tp.z);

      // Optional: tiny forward nudge so you never land exactly on ring edge
      // (keeps you from “standing inside” the marker visually)
      // player.position.add(new THREE.Vector3(0, 0, 0.02));

      L("[teleport] moved ✅", `x=${tp.x.toFixed(2)} z=${tp.z.toFixed(2)}`);
    }

    // Use selectstart/squeeze as you had, but also let left/right pick active hand
    function bindController(c, index) {
      if (!c) return;
      c.addEventListener("selectstart", () => { st.activeHand = index; doTeleport(); });
      c.addEventListener("squeezestart", () => { st.activeHand = index; doTeleport(); });
    }

    if (controllers?.length) {
      for (let i = 0; i < controllers.length; i++) bindController(controllers[i], i);
    }

    L("[teleport] ready ✅");

    return {
      setEnabled(v) {
        st.enabled = !!v;
        marker.visible = st.enabled && marker.visible;
        beam.visible = st.enabled && beam.visible;
        spark.visible = st.enabled && spark.visible;
      },

      update(dt = 0.016) {
        if (!st.enabled) return;
        updateMarker(dt);
      }
    };
  }
};

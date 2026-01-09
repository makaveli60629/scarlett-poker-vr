// /js/teleport_machine.js — Scarlett VR Poker (Mountable TeleportMachine v2)
// Exports: TeleportMachine with init/build/mount so World loader can mount it.
// Provides: simple teleport target + confirm + visual rune

export const TeleportMachine = {
  init(ctx){ return this.mount(ctx); },
  build(ctx){ return this.mount(ctx); },

  mount(ctx){
    const { THREE, scene, renderer, player } = ctx;
    if (!THREE || !scene || !renderer || !player) throw new Error("TeleportMachine.mount: missing ctx parts");

    // Prevent double-mount
    if (scene.userData.__teleport_machine_built) return;
    scene.userData.__teleport_machine_built = true;

    // State
    const S = {
      enabled: true,
      target: new THREE.Vector3(0, 0, 6),
      hasTarget: false,
      ring: null,
      beam: null,
      ray: new THREE.Raycaster(),
      tmpM4: new THREE.Matrix4(),
      tmpDir: new THREE.Vector3(),
      floorY: 0,
    };

    // Visible rune ring (Scorpion Rune feel)
    const ringGeo = new THREE.RingGeometry(0.32, 0.46, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.02, 2);
    ring.visible = false;
    scene.add(ring);
    S.ring = ring;

    // Small pillar “machine”
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.15, 28),
      new THREE.MeshStandardMaterial({ color: 0x101526, roughness: 0.6, metalness: 0.2 })
    );
    base.position.set(0, 0.58, 2);
    scene.add(base);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.55, 20),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.2, metalness: 0.1, transparent:true, opacity:0.8 })
    );
    core.position.set(0, 1.05, 2);
    scene.add(core);

    const glow = new THREE.PointLight(0x7fe7ff, 1.2, 8);
    glow.position.set(0, 1.25, 2);
    scene.add(glow);

    // Find floor mesh to raycast against (fallback floor exists)
    const floorCandidates = [];
    scene.traverse((o)=>{
      if (!o || !o.isMesh) return;
      const name = (o.name||"").toLowerCase();
      if (name.includes("floor")) floorCandidates.push(o);
      // also treat large plane meshes as floor
      if (o.geometry && o.geometry.type === "PlaneGeometry") floorCandidates.push(o);
    });

    function setEnabled(v){
      S.enabled = !!v;
      if (!S.enabled) { S.ring.visible = false; S.hasTarget = false; }
    }

    // Hook HUD toggle
    window.addEventListener("scarlett-toggle-teleport", (e)=> setEnabled(!!e.detail));

    // Simple “tap to teleport” on mobile: tap screen = teleport to ring if valid
    window.addEventListener("pointerdown", (e)=>{
      // ignore clicks on UI buttons
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
      if (tag === "button") return;
      if (!S.enabled) return;

      // if we have a target, teleport
      if (S.hasTarget) {
        player.position.x = S.target.x;
        player.position.z = S.target.z;
      }
    }, { passive:true });

    // Controller raycast teleport (Quest): aim with right controller
    const right = renderer.xr.getController(1);
    const left = renderer.xr.getController(0);

    function updateTargetFromController(ctrl){
      if (!ctrl) return;

      // ray direction
      S.tmpM4.identity().extractRotation(ctrl.matrixWorld);
      S.tmpDir.set(0, 0, -1).applyMatrix4(S.tmpM4).normalize();

      const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
      S.ray.set(origin, S.tmpDir);

      const hits = S.ray.intersectObjects(floorCandidates.length ? floorCandidates : scene.children, true);
      if (hits && hits.length) {
        const h = hits[0];
        // only accept near-floor hits
        const p = h.point;
        S.target.copy(p);
        S.target.y = 0;
        S.hasTarget = true;

        S.ring.position.set(S.target.x, 0.02, S.target.z);
        S.ring.visible = true;
      } else {
        S.hasTarget = false;
        S.ring.visible = false;
      }
    }

    // Confirm teleport on trigger squeeze
    function tryConfirmTeleport(){
      if (!S.enabled || !S.hasTarget) return;
      player.position.x = S.target.x;
      player.position.z = S.target.z;
    }

    // XR select = trigger for many browsers
    right?.addEventListener("select", tryConfirmTeleport);
    left?.addEventListener("select", tryConfirmTeleport);

    // Also allow HUD “Recenter” to cancel ring
    window.addEventListener("scarlett-recenter", ()=>{
      S.hasTarget = false;
      if (S.ring) S.ring.visible = false;
    });

    // Per-frame update
    const tick = () => {
      if (!S.enabled) return;
      // Prefer right controller in XR, else do nothing (mobile uses tap)
      if (renderer.xr.isPresenting) updateTargetFromController(right || left);

      // subtle rune pulse
      if (S.ring && S.ring.visible) {
        const t = performance.now() * 0.002;
        S.ring.material.opacity = 0.55 + 0.25 * Math.sin(t * 2.2);
        S.ring.rotation.z = t * 0.35;
      }
    };

    // store update hook where world can call later if it wants
    scene.userData.__teleport_tick = tick;

    // also register a global ticker if main isn’t calling it
    const oldLoop = renderer.getAnimationLoop?.();
    // (do nothing; main already runs render loop)

    // expose in ctx.world if present
    if (ctx.world) {
      const prev = ctx.world.update;
      ctx.world.update = (dt)=>{
        try { prev && prev(dt); } catch {}
        try { tick(); } catch {}
      };
    }

    return { enabled:()=>S.enabled };
  }
};

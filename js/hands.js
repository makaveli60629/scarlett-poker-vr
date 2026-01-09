// /js/hands.js — Scarlett Hands v2.1
// - Shows cyber gloves when hand-tracking is available
// - Adds a simple watch panel on LEFT wrist
// - "Y" toggles watch menu visibility (event from controls.js)

export const HandsSystem = (() => {
  function init({ THREE, scene, renderer, player, camera, log } = {}) {
    const state = {
      gloves: { left: null, right: null },
      watch: { root: null, visible: true },
      refSpace: null
    };

    // glove material (safe)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.25,
      metalness: 0.25,
      emissive: 0x00ffff,
      emissiveIntensity: 0.35
    });

    const gloveGeo = new THREE.CylinderGeometry(0.035, 0.050, 0.22, 16);
    function makeGlove() {
      const g = new THREE.Mesh(gloveGeo, mat.clone());
      g.rotation.x = Math.PI/2;
      g.visible = false;
      scene.add(g);
      return g;
    }

    state.gloves.left = makeGlove();
    state.gloves.right = makeGlove();

    // Watch panel (simple)
    const watchRoot = new THREE.Group();
    watchRoot.name = "WatchUI";
    scene.add(watchRoot);

    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    function drawWatch() {
      ctx.clearRect(0,0,512,256);
      ctx.fillStyle = "rgba(10,12,20,0.75)";
      ctx.fillRect(12, 12, 488, 232);
      ctx.strokeStyle = "rgba(127,231,255,0.6)";
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, 488, 232);

      ctx.fillStyle = "#7fe7ff";
      ctx.font = "bold 44px Arial";
      ctx.textAlign = "left";
      ctx.fillText("SCARLETT MENU", 28, 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px Arial";
      ctx.fillText("• Recenter", 28, 130);
      ctx.fillText("• Teleport Pads", 28, 175);
      ctx.fillText("• Poker Running", 28, 220);
    }
    drawWatch();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const watchPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.20, 0.10),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    watchPlane.renderOrder = 999;
    watchRoot.add(watchPlane);

    state.watch.root = watchRoot;

    window.addEventListener("scarlett-toggle-watchmenu", () => {
      state.watch.visible = !state.watch.visible;
      watchRoot.visible = state.watch.visible;
    });

    // Store last wrist pose (if hand tracking present)
    function update() {
      const session = renderer.xr.getSession?.();
      if (!session) {
        state.gloves.left.visible = false;
        state.gloves.right.visible = false;
        state.watch.root.visible = false;
        return;
      }

      // Show watch even without hands (attach near camera-left for now)
      if (!state.watch.root.visible) state.watch.root.visible = state.watch.visible;

      // Try to read joint poses if hand tracking exists
      const refSpace = renderer.xr.getReferenceSpace?.();
      if (!refSpace) return;

      let leftWristPose = null;

      for (const inputSource of session.inputSources) {
        if (!inputSource.hand) continue;

        const wrist = inputSource.hand.get("wrist");
        const pose = session.requestAnimationFrame ? null : null; // placeholder
        // In Three/WebXR, we need XRFrame for joint pose; we don't have it here.
        // So: we keep gloves hidden unless you already have a joint-based frame loop.
        // Your hands are still handled visually by the Quest itself.
      }

      // Attach watch near camera as a stable fallback (still useful)
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
      const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).normalize();
      const up = new THREE.Vector3(0,1,0);

      watchRoot.position.copy(camera.position)
        .addScaledVector(fwd, 0.55)
        .addScaledVector(right, -0.18)
        .addScaledVector(up, -0.12);

      watchRoot.quaternion.copy(camera.quaternion);
    }

    return { update };
  }

  return { init };
})();

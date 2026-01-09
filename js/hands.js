// /js/hands.js — Scarlett Hands v2.0
// - Hand tracking wrist meshes (simple gloves)
// - Left wrist WATCH mesh
// - Left wrist MENU panel toggled by Y (scarlett-menu event)

export const HandsSystem = (() => {
  let THREE, scene, renderer, log;

  const S = {
    root: null,
    left: { wrist: null, glove: null, watch: null, menu: null, menuTex: null },
    right:{ wrist: null, glove: null },
    menuOpen: false,
  };

  function makeCanvasMenu() {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");

    function draw() {
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(10,12,20,0.72)";
      ctx.fillRect(0,0,c.width,c.height);

      ctx.strokeStyle = "rgba(127,231,255,0.55)";
      ctx.lineWidth = 6;
      ctx.strokeRect(8,8,c.width-16,c.height-16);

      ctx.fillStyle = "#e8ecff";
      ctx.font = "bold 40px Arial";
      ctx.fillText("SCARLETT MENU", 24, 54);

      ctx.fillStyle = "rgba(232,236,255,0.85)";
      ctx.font = "28px Arial";
      ctx.fillText("• Store", 24, 110);
      ctx.fillText("• Poker Table", 24, 146);
      ctx.fillText("• Skins / Outfits", 24, 182);

      ctx.fillStyle = "rgba(127,231,255,0.9)";
      ctx.font = "bold 26px Arial";
      ctx.fillText("Press Y to Close", 300, 230);
    }

    draw();
    return { c, ctx, draw };
  }

  function init({ THREE: _T, scene: _S, renderer: _R, log: _L } = {}) {
    THREE = _T; scene = _S; renderer = _R; log = _L || console.log;

    if (S.root) { try { scene.remove(S.root); } catch {} }
    S.root = new THREE.Group();
    S.root.name = "HandsRoot";
    scene.add(S.root);

    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x10131a,
      roughness: 0.55,
      metalness: 0.25,
      emissive: 0x00ffff,
      emissiveIntensity: 0.35
    });

    const gloveGeo = new THREE.CylinderGeometry(0.028, 0.038, 0.22, 14);
    const watchGeo = new THREE.BoxGeometry(0.052, 0.012, 0.062);

    // gloves
    S.left.glove = new THREE.Mesh(gloveGeo, gloveMat);
    S.right.glove = new THREE.Mesh(gloveGeo, gloveMat);
    S.left.glove.rotation.x = Math.PI / 2;
    S.right.glove.rotation.x = Math.PI / 2;
    S.left.glove.visible = false;
    S.right.glove.visible = false;

    // watch
    const watchMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.25,
      metalness: 0.55,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5
    });
    S.left.watch = new THREE.Mesh(watchGeo, watchMat);
    S.left.watch.visible = false;

    // wrist menu
    const menu = makeCanvasMenu();
    const tex = new THREE.CanvasTexture(menu.c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const menuMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      depthTest: false
    });

    S.left.menu = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), menuMat);
    S.left.menu.renderOrder = 300;
    S.left.menu.visible = false;

    S.left.menuTex = tex;

    S.root.add(S.left.glove, S.right.glove, S.left.watch, S.left.menu);

    window.addEventListener("scarlett-menu", (e) => {
      S.menuOpen = !!e.detail;
    });

    log("[hands] ready ✅");
    return { update };
  }

  function update(dt) {
    const session = renderer.xr.getSession?.();
    if (!session) return;

    const refSpace = renderer.xr.getReferenceSpace?.();
    const frame = renderer.xr.getFrame?.(); // may not exist in some builds
    // Your main loop already has frame; if your main passes none, we still try with xr.getFrame.
    // Prefer the frame passed from main.js by adding HandsSystem.update(frame, refSpace)
  }

  function updateFromFrame(frame, refSpace) {
    if (!frame || !refSpace) return;

    let leftSeen = false, rightSeen = false;

    for (const src of frame.session.inputSources) {
      if (!src?.hand) continue;
      const wrist = src.hand.get("wrist");
      const pose = frame.getJointPose(wrist, refSpace);
      if (!pose) continue;

      const isLeft = (src.handedness === "left");

      const glove = isLeft ? S.left.glove : S.right.glove;
      glove.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      glove.quaternion.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      glove.visible = !!(window.__SCARLETT_FLAGS?.hands ?? true);

      if (isLeft) {
        leftSeen = true;

        // watch sits just above wrist
        S.left.watch.position.copy(glove.position);
        S.left.watch.quaternion.copy(glove.quaternion);
        S.left.watch.translateZ(0.04);
        S.left.watch.translateY(0.01);
        S.left.watch.visible = glove.visible;

        // menu attached to wrist and angled toward face
        S.left.menu.position.copy(glove.position);
        S.left.menu.quaternion.copy(glove.quaternion);
        S.left.menu.translateZ(0.10);
        S.left.menu.translateY(0.02);
        S.left.menu.rotation.x += -0.8;
        S.left.menu.visible = glove.visible && S.menuOpen;
      } else {
        rightSeen = true;
      }
    }

    if (!leftSeen) { S.left.glove.visible = false; S.left.watch.visible = false; S.left.menu.visible = false; }
    if (!rightSeen) { S.right.glove.visible = false; }
  }

  return {
    init,
    update: updateFromFrame
  };
})();

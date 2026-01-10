// /js/vr_ui.js — Scarlett VR UI (FULL)
// - Uses TextureKit to resolve avatar textures safely (supports spaces/case).
// - Exports: initVRUI(ctx)

export async function initVRUI(ctx) {
  const { THREE, scene, renderer, camera, player, log, world } = ctx;
  const ui = (m) => (log ? log(m) : console.log(m));

  const textureKit = scene.userData.textureKit || renderer.__SCARLETT_TEXTUREKIT;
  if (!textureKit) {
    ui("[ui] ⚠️ No textureKit found. (textures.js not mounted?)");
  }

  // Simple “hands/gloves” visual anchor (safe default)
  const root = new THREE.Group();
  root.name = "scarlett_vr_ui";
  scene.add(root);

  // A small floating badge near player (debug visible)
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 })
  );
  badge.position.set(0.0, 1.65, -0.65);
  root.add(badge);

  // Build a tiny canvas texture for the badge so it always works
  {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 192;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(10,12,20,.85)";
    g.fillRect(0,0,c.width,c.height);
    g.strokeStyle = "rgba(127,231,255,.65)";
    g.lineWidth = 6;
    g.strokeRect(10,10,c.width-20,c.height-20);
    g.fillStyle = "rgba(232,236,255,.95)";
    g.font = "bold 54px system-ui";
    g.fillText("SCARLETT", 46, 78);
    g.font = "28px system-ui";
    g.fillStyle = "rgba(152,160,199,.95)";
    g.fillText("VR Poker", 46, 132);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    badge.material.map = tex;
    badge.material.needsUpdate = true;
  }

  // Try loading avatar textures (no spam, only summary)
  let handsTex=null, watchTex=null, menuTex=null;
  if (textureKit) {
    handsTex = await textureKit.getAvatarHands();
    watchTex = await textureKit.getAvatarWatch();
    menuTex  = await textureKit.getAvatarMenuHand();
  }

  ui(`[ui] avatar textures: hands=${!!handsTex} watch=${!!watchTex} menuHand=${!!menuTex}`);

  // Optional: expose to world for future use
  world.__ui = world.__ui || {};
  world.__ui.textures = { handsTex, watchTex, menuTex };

  // Update loop hook (badge follows camera gently)
  world.__ui.update = (dt) => {
    // keep badge in front of the camera (small smoothing)
    const target = new THREE.Vector3(0, 0, -0.65).applyMatrix4(camera.matrixWorld);
    badge.position.lerp(target, 0.25);
    badge.quaternion.slerp(camera.quaternion, 0.25);
  };

  return { root };
}

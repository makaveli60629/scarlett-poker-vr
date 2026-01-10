// /js/vr_ui_panel.js — FULL (hardened) v1.3
// Fixes:
// - "Cannot read properties of undefined (reading 'push')" by initializing ctx arrays
// - Works even if called with (ctx) OR accidentally with (scene)

export const VRUIPanel = {
  init(arg){
    // Support both init(ctx) and init(scene) calls safely
    const ctx = (arg && arg.scene && arg.renderer) ? arg : null;

    // If we were passed a THREE.Scene directly, abort safely
    if (!ctx || !ctx.scene){
      console.warn("[vr_ui_panel] missing ctx pieces, abort");
      return { ok:false };
    }

    // ---- HARDEN ctx ----
    ctx.__mounted = ctx.__mounted || [];
    ctx.ui = ctx.ui || {};
    ctx.ui.panels = ctx.ui.panels || [];
    ctx.ui.buttons = ctx.ui.buttons || [];
    ctx.ui.hotspots = ctx.ui.hotspots || [];

    const { THREE, scene, camera } = ctx;
    if (!THREE || !scene || !camera){
      console.warn("[vr_ui_panel] missing THREE/scene/camera, abort");
      return { ok:false };
    }

    // ---- Build a simple wrist/face panel anchor (non-invasive) ----
    // (Your vr_ui.js can attach this wherever it wants; here we just create a panel object.)
    const panel = new THREE.Group();
    panel.name = "VR_UI_PANEL";
    panel.position.set(0, 1.55, -0.65);
    panel.visible = true;

    // Panel background
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x0b0d14, transparent: true, opacity: 0.88 })
    );
    bg.renderOrder = 10;
    panel.add(bg);

    // Subtle border
    const border = new THREE.Mesh(
      new THREE.RingGeometry(0.001, 0.001, 3), // placeholder tiny ring
      new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 })
    );
    border.visible = false;
    panel.add(border);

    // Title text (canvas texture)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const g = canvas.getContext("2d");
    g.clearRect(0,0,canvas.width,canvas.height);
    g.fillStyle = "#e8ecff";
    g.font = "bold 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    g.fillText("MENU", 28, 78);
    g.fillStyle = "#98a0c7";
    g.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    g.fillText("Teleport • Store • Rooms", 28, 132);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.40, 0.18),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1.0 })
    );
    label.position.set(0, 0, 0.001);
    label.renderOrder = 11;
    panel.add(label);

    // Attach panel to camera so it follows head (safe default)
    // You can change this later to attach to hand/wrist.
    camera.add(panel);

    // Track it so other systems can reference it
    ctx.ui.panels.push(panel);
    ctx.__mounted.push(panel);

    console.log("[vr_ui_panel] init ✅");
    return { ok:true, panel };
  }
};

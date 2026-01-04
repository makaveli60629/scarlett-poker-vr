// js/ui.js
import * as THREE from "three";

function makePanel(w = 1.2, h = 0.7, color = 0x111111, opacity = 0.85) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(geo, mat);
  panel.renderOrder = 10;
  panel.name = "ui_panel";
  return panel;
}

function makeButton(label, x, y, w = 0.46, h = 0.14) {
  const group = new THREE.Group();
  group.name = "ui_button";

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  bg.name = "ui_button_bg";
  bg.userData.isUIButton = true; // important for raycast
  group.add(bg);

  // Simple text using canvas texture (no external font files)
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#B7FFB7";
  ctx.font = "bold 54px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, h * 0.70),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  text.position.z = 0.001;
  text.name = "ui_button_text";
  group.add(text);

  group.position.set(x, y, 0.01);
  bg.userData.label = label;
  return group;
}

export const UI = {
  init({ scene, camera, renderer, playerGroup, HUD }) {
    // Root UI rig (in-world)
    const uiRoot = new THREE.Group();
    uiRoot.name = "ui_root";
    scene.add(uiRoot);

    // MENU PANEL
    const menu = new THREE.Group();
    menu.name = "ui_menu";
    const menuPanel = makePanel(1.35, 0.8, 0x0c0c0f, 0.85);
    menu.add(menuPanel);

    // Buttons (menu)
    const bTeleportA = makeButton("TELEPORT A", -0.35, 0.18);
    const bTeleportB = makeButton("TELEPORT B",  0.35, 0.18);
    const bTeleportC = makeButton("TELEPORT C", -0.35, -0.02);
    const bStore     = makeButton("STORE",       0.35, -0.02);
    const bChips     = makeButton("REAL CHIPS",  0.00, -0.26, 0.95);

    // Attach actions
    bTeleportA.children[0].userData.action = "teleport_point_A";
    bTeleportB.children[0].userData.action = "teleport_point_B";
    bTeleportC.children[0].userData.action = "teleport_point_C";
    bStore.children[0].userData.action     = "open_store";
    bChips.children[0].userData.action     = "spawn_chips";

    menu.add(bTeleportA, bTeleportB, bTeleportC, bStore, bChips);
    menu.visible = true;
    uiRoot.add(menu);

    // STORE PANEL (kiosk)
    const store = new THREE.Group();
    store.name = "ui_store";
    const storePanel = makePanel(1.35, 0.8, 0x120b16, 0.88);
    store.add(storePanel);

    const bBack = makeButton("BACK", 0.0, 0.28, 0.9);
    bBack.children[0].userData.action = "close_store";
    store.add(bBack);

    const item1 = makeButton("BUY: TABLE THEME", -0.35, 0.02);
    item1.children[0].userData.action = "buy_theme_table";

    const item2 = makeButton("BUY: SOFA", 0.35, 0.02);
    item2.children[0].userData.action = "buy_sofa";

    const item3 = makeButton("BUY: EMOTE PACK", 0.0, -0.22, 0.95);
    item3.children[0].userData.action = "buy_emotes";

    store.add(item1, item2, item3);
    store.visible = false;
    uiRoot.add(store);

    // Place UI in front of player spawn (will be repositioned each frame)
    uiRoot.position.set(0, 1.55, 3.0);

    // Public list of clickable meshes
    const clickable = [];
    uiRoot.traverse((obj) => {
      if (obj.userData && obj.userData.isUIButton) clickable.push(obj);
    });

    function setVisibleMenu(v) {
      menu.visible = v;
      store.visible = !v ? store.visible : false;
    }

    function setVisibleStore(v) {
      store.visible = v;
      menu.visible = !v ? menu.visible : false;
    }

    function update() {
      // Follow player gently (keep UI in front)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();

      const targetPos = new THREE.Vector3().copy(playerGroup.position);
      targetPos.y += 1.55;
      targetPos.add(forward.multiplyScalar(2.2));

      uiRoot.position.lerp(targetPos, 0.12);

      const lookAt = new THREE.Vector3().copy(playerGroup.position);
      lookAt.y += 1.55;
      uiRoot.lookAt(lookAt);

      // Menu toggle via actionId
      if (window.actionId === "menu") {
        menu.visible = !menu.visible;
        store.visible = false;
        window.actionId = null;
      }
    }

    HUD?.log?.("UI ready (menu + store + chips button).");
    return {
      update,

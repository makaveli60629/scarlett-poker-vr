// js/ui.js
import * as THREE from "three";

function panelMesh(w, h, color, opacity) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthTest: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "ui_panel";
  return mesh;
}

function textTexture(label) {
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
  tex.needsUpdate = true;
  return tex;
}

function makeButton(label, x, y, w, h, action) {
  const g = new THREE.Group();
  g.name = "ui_button_group";
  g.position.set(x, y, 0.01);

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    })
  );

  // IMPORTANT: Interactions raycasts these
  bg.name = "ui_button_bg";
  bg.userData.isUIButton = true;
  bg.userData.action = action;
  bg.userData.label = label;

  const tex = textTexture(label);
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, h * 0.70),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  labelMesh.position.z = 0.001;

  g.add(bg);
  g.add(labelMesh);

  return g;
}

export const UI = {
  init: function (opts) {
    const scene = opts.scene;
    const camera = opts.camera;
    const playerGroup = opts.playerGroup;
    const HUD = opts.HUD;

    // Root group
    const uiRoot = new THREE.Group();
    uiRoot.name = "ui_root";
    scene.add(uiRoot);

    // MENU
    const menu = new THREE.Group();
    menu.name = "ui_menu";
    menu.visible = true;

    const menuPanel = panelMesh(1.35, 0.85, 0x0c0c0f, 0.85);
    menu.add(menuPanel);

    menu.add(makeButton("TELEPORT A", -0.35, 0.22, 0.46, 0.14, "teleport_point_A"));
    menu.add(makeButton("TELEPORT B",  0.35, 0.22, 0.46, 0.14, "teleport_point_B"));
    menu.add(makeButton("TELEPORT C", -0.35, 0.02, 0.46, 0.14, "teleport_point_C"));
    menu.add(makeButton("STORE",       0.35, 0.02, 0.46, 0.14, "open_store"));
    menu.add(makeButton("REAL CHIPS",  0.00, -0.28, 0.96, 0.14, "spawn_chips"));

    uiRoot.add(menu);

    // STORE
    const store = new THREE.Group();
    store.name = "ui_store";
    store.visible = false;

    const storePanel = panelMesh(1.35, 0.85, 0x120b16, 0.88);
    store.add(storePanel);

    store.add(makeButton("BACK", 0.0, 0.30, 0.96, 0.14, "close_store"));
    store.add(makeButton("BUY: TABLE THEME", -0.35, 0.06, 0.46, 0.14, "buy_theme_table"));
    store.add(makeButton("BUY: SOFA",         0.35, 0.06, 0.46, 0.14, "buy_sofa"));
    store.add(makeButton("BUY: EMOTE PACK",   0.00, -0.20, 0.96, 0.14, "buy_emotes"));

    uiRoot.add(store);

    // Initial placement
    uiRoot.position.set(0, 1.55, 3.0);

    // Gather clickable meshes
    const clickable = [];
    uiRoot.traverse(function (obj) {
      if (obj.userData && obj.userData.isUIButton) clickable.push(obj);
    });

    function update() {
      // Follow player (in front of camera)
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();

      const target = new THREE.Vector3();
      target.copy(playerGroup.position);
      target.y += 1.55;
      target.add(forward.multiplyScalar(2.2));

      uiRoot.position.lerp(target, 0.12);

      const lookAt = new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 1.55, playerGroup.position.z);
      uiRoot.lookAt(lookAt);

      // Toggle menu on action
      if (window.actionId === "menu") {
        menu.visible = !menu.visible;
        store.visible = false;
        window.actionId = null;
      }
    }

    if (HUD && HUD.log) HUD.log("UI ready (GitHub-safe).");

    return {
      update: update,
      uiRoot: uiRoot,
      clickable: clickable
    };
  }
};

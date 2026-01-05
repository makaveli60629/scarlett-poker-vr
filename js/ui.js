import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function labelSprite(text) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0)";
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = "rgba(0,0,0,0.65)";
  g.fillRect(18, 18, c.width - 36, c.height - 36);

  g.strokeStyle = "rgba(0,255,255,0.25)";
  g.lineWidth = 8;
  g.strokeRect(18, 18, c.width - 36, c.height - 36);

  g.fillStyle = "white";
  g.font = "bold 64px system-ui, Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.6, 0.3, 1);
  return s;
}

function makeButton(name, text, action) {
  const g = new THREE.Group();
  g.name = name;

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x071018, transparent: true, opacity: 0.85 })
  );
  bg.userData.action = action;
  bg.userData.isUIButton = true;
  g.add(bg);

  const label = labelSprite(text);
  label.position.z = 0.01;
  g.add(label);

  // IMPORTANT: we add interactable on the BG plane (easy ray hit)
  g.userData.hit = bg;
  return g;
}

export const UI = {
  create(ctx) {
    ctx.ui = ctx.ui || {};
    ctx.interactables = ctx.interactables || [];
    ctx.addInteractable = ctx.addInteractable || ((m) => (ctx.interactables.push(m), m));

    const panel = new THREE.Group();
    panel.name = "VRMenuPanel";
    panel.visible = false;

    // Attach to camera so it’s always accessible
    ctx.camera.add(panel);
    panel.position.set(0, 0.05, -0.9);

    // Background plate
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.25),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    plate.position.set(0, 0, -0.02);
    panel.add(plate);

    const title = labelSprite("SKYLARK MENU");
    title.scale.set(1.1, 0.35, 1);
    title.position.set(0, 0.48, 0.02);
    panel.add(title);

    const bLobby = makeButton("btnLobby", "GO LOBBY", "room:lobby");
    bLobby.position.set(0, 0.18, 0.02);
    panel.add(bLobby);

    const bPoker = makeButton("btnPoker", "GO POKER", "room:poker");
    bPoker.position.set(0, -0.05, 0.02);
    panel.add(bPoker);

    const bStore = makeButton("btnStore", "GO STORE", "room:store");
    bStore.position.set(0, -0.28, 0.02);
    panel.add(bStore);

    const bChips = makeButton("btnChips", "SPAWN CHIPS", "chips:spawn");
    bChips.position.set(0, -0.51, 0.02);
    panel.add(bChips);

    // Register interactables (the hit planes)
    [bLobby, bPoker, bStore, bChips].forEach((b) => ctx.addInteractable(b.userData.hit || b.children[0]));
    // Also store mapping from hit object -> action
    ctx.uiHitActions = new Map();
    [bLobby, bPoker, bStore, bChips].forEach((b) => {
      const hit = b.children[0];
      ctx.uiHitActions.set(hit.uuid, hit.userData.action);
    });

    // Interaction hook
    if (ctx.on) {
      ctx.on("interact", ({ hit }) => {
        if (!panel.visible) return;
        const obj = hit?.object;
        if (!obj) return;
        const action = obj.userData.action || ctx.uiHitActions.get(obj.uuid);
        if (!action) return;

        if (action.startsWith("room:")) {
          const room = action.split(":")[1];
          if (typeof ctx.setRoom === "function") ctx.setRoom(room);
        }
        if (action === "chips:spawn") {
          const fn = ctx.api?.eventChips?.spawnChips || ctx.api?.eventChips?.spawn;
          if (typeof fn === "function") fn(ctx);
        }
      });
    }

    ctx.ui.panel = panel;
    ctx.api = ctx.api || {};
    ctx.api.ui = this;

    return this;
  },

  toggleMenu(ctx) {
    const p = ctx?.ui?.panel;
    if (!p) return;
    p.visible = !p.visible;
  },

  update(dt, ctx) {
    // keep the menu plate facing forward (camera-attached already)
  },
};

export default UI;

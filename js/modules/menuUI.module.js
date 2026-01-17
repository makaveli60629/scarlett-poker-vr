// /js/modules/menuUI.module.js
// Left controller Y toggles menu; right trigger presses buttons (FULL)
// Robust: uses rising-edge detection on left buttons[3]/[4] (common X/Y) and right trigger

export default {
  id: "menuUI.module.js",

  async init({ THREE, anchors, renderer, camera, rig, rightRay, leftGrip, log }) {
    const root = new THREE.Group();
    root.name = "MENU_UI_ROOT";
    anchors.ui.add(root);

    // Menu panel (attached to left hand so it stays near you)
    const panel = new THREE.Group();
    panel.name = "MENU_PANEL";
    panel.visible = false;
    leftGrip.add(panel);
    panel.position.set(0.0, 0.06, -0.12);
    panel.rotation.x = -0.35;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x0b0e14, transparent: true, opacity: 0.85 })
    );
    panel.add(bg);

    const mkButton = (label, y, onPress) => {
      const g = new THREE.Group();
      g.position.set(0, y, 0.001);

      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.07),
        new THREE.MeshBasicMaterial({ color: 0x1f2a3a, transparent: true, opacity: 0.95 })
      );
      btn.name = `BTN_${label}`;
      g.add(btn);

      const c = document.createElement("canvas");
      c.width = 512; c.height = 128;
      const ctx = c.getContext("2d");
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 256, 64);

      const tex = new THREE.CanvasTexture(c);
      const txt = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.07),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      txt.position.z = 0.001;
      g.add(txt);

      g.userData.onPress = onPress;
      g.userData.btnMesh = btn;
      panel.add(g);
      return g;
    };

    const buttons = [];
    buttons.push(mkButton("DEMO: RESTART",  0.07, () => window.SCARLETT?.poker?.startDemo?.()));
    buttons.push(mkButton("SFX: TEST",      0.00, () => window.SCARLETT?.audioTest?.()));
    buttons.push(mkButton("TOGGLE HUD",    -0.07, () => { window.SCARLETT = window.SCARLETT || {}; window.SCARLETT.hud = !(window.SCARLETT.hud); }));

    // pointer interaction using rightRay
    const raycaster = new THREE.Raycaster();
    const tmpO = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpD = new THREE.Vector3();

    // input state
    let lastLY = false;
    let lastRTrigger = false;

    function getGamepad(session, handedness) {
      for (const src of session.inputSources) {
        if (src?.handedness === handedness && src?.gamepad) return src.gamepad;
      }
      return null;
    }

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.menu = {
      show: () => (panel.visible = true),
      hide: () => (panel.visible = false),
      toggle: () => (panel.visible = !panel.visible),
    };

    log?.("menuUI.module ✅ (left toggle + right press)");

    this._rt = { renderer, camera, rightRay, panel, buttons, raycaster, tmpO, tmpQ, tmpD, getGamepad, lastLY, lastRTrigger };
  },

  update(dt, { renderer }) {
    const r = this._rt;
    if (!r) return;

    const session = renderer.xr.getSession?.();
    if (!session) return;

    // LEFT Y TOGGLE (robust rising edge on buttons[3]/[4])
    const gpL = r.getGamepad(session, "left");
    if (gpL) {
      const b3 = gpL.buttons?.[3]?.pressed || false;
      const b4 = gpL.buttons?.[4]?.pressed || false;
      const yLike = b4 || b3; // depending on mapping, Y may be 4 or 3
      if (yLike && !r.lastLY) r.panel.visible = !r.panel.visible;
      r.lastLY = yLike;
    }

    if (!r.panel.visible) return;

    // RIGHT PRESS (trigger)
    const gpR = r.getGamepad(session, "right");
    const trig = gpR ? (gpR.buttons?.[0]?.value ?? 0) : 0;
    const trigDown = trig > 0.75;

    // Hover highlight
    r.rightRay.getWorldPosition(r.tmpO);
    r.rightRay.getWorldQuaternion(r.tmpQ);
    r.tmpD.set(0, 0, -1).applyQuaternion(r.tmpQ).normalize();

    r.raycaster.set(r.tmpO, r.tmpD);
    r.raycaster.far = 3;

    // collect button meshes
    const meshes = [];
    for (const b of r.buttons) meshes.push(b.userData.btnMesh);

    const hits = r.raycaster.intersectObjects(meshes, false);

    // reset colors
    for (const b of r.buttons) b.userData.btnMesh.material.color.setHex(0x1f2a3a);

    if (hits.length) {
      const hit = hits[0].object;
      hit.material.color.setHex(0xffd24a);

      // press
      if (trigDown && !r.lastRTrigger) {
        // find owning button group
        for (const b of r.buttons) {
          if (b.userData.btnMesh === hit) {
            try { b.userData.onPress?.(); } catch (_) {}
            break;
          }
        }
      }
    }

    r.lastRTrigger = trigDown;
  },

  test() {
    const ok = !!window.SCARLETT?.menu;
    return { ok, note: ok ? "menu present" : "menu missing" };
  }
};

// /js/modules/menuUI.module.js
// Left Y toggles menu; right trigger presses buttons (FULL)

export default {
  id: "menuUI.module.js",

  async init({ THREE, anchors, renderer, camera, rightRay, leftGrip, log }) {
    const root = new THREE.Group();
    root.name = "MENU_UI_ROOT";
    anchors.ui.add(root);

    const panel = new THREE.Group();
    panel.name = "MENU_PANEL";
    panel.visible = false;
    leftGrip.add(panel);
    panel.position.set(0.0, 0.06, -0.12);
    panel.rotation.x = -0.35;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.36),
      new THREE.MeshBasicMaterial({ color: 0x0b0e14, transparent: true, opacity: 0.86 })
    );
    panel.add(bg);

    const mkButton = (label, y, onPress) => {
      const g = new THREE.Group();
      g.position.set(0, y, 0.002);

      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.07),
        new THREE.MeshBasicMaterial({ color: 0x1f2a3a, transparent: true, opacity: 0.95 })
      );
      btn.name = `BTN_${label}`;
      g.add(btn);

      const c = document.createElement("canvas");
      c.width = 512; c.height = 128;
      const ctx = c.getContext("2d");
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 256, 64);

      const tex = new THREE.CanvasTexture(c);
      const txt = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.07),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      txt.position.z = 0.001;
      g.add(txt);

      g.userData.onPress = onPress;
      g.userData.btnMesh = btn;
      g.userData.label = label;
      panel.add(g);
      return g;
    };

    const buttons = [];
    buttons.push(mkButton("DEMO: RESTART",  0.125, () => window.SCARLETT?.poker?.startDemo?.()));
    buttons.push(mkButton("DEMO: PAUSE",    0.045, () => window.SCARLETT?.poker?.togglePause?.()));
    buttons.push(mkButton("DEMO: STEP",    -0.035, () => window.SCARLETT?.poker?.step?.()));
    buttons.push(mkButton("SPEED: 0.5x",   -0.115, () => window.SCARLETT?.poker?.setSpeed?.(0.5)));
    buttons.push(mkButton("SPEED: 1.0x",   -0.195, () => window.SCARLETT?.poker?.setSpeed?.(1.0)));
    buttons.push(mkButton("SPEED: 2.0x",   -0.275, () => window.SCARLETT?.poker?.setSpeed?.(2.0)));

    const pointerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    pointerDot.name = "UI_POINTER_DOT";
    pointerDot.visible = false;
    anchors.ui.add(pointerDot);

    const raycaster = new THREE.Raycaster();
    const tmpO = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpD = new THREE.Vector3();

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
      isOpen: () => !!panel.visible
    };

    log?.("menuUI.module ✅ (pause/step/speed + pointer dot)");

    this._rt = { THREE, renderer, camera, rightRay, panel, buttons, raycaster, tmpO, tmpQ, tmpD, getGamepad, lastLY, lastRTrigger, pointerDot };
  },

  update(dt, { renderer }) {
    const r = this._rt;
    if (!r) return;

    const session = renderer.xr.getSession?.();
    if (!session) return;

    const gpL = r.getGamepad(session, "left");
    if (gpL) {
      const b3 = gpL.buttons?.[3]?.pressed || false;
      const b4 = gpL.buttons?.[4]?.pressed || false;
      const yLike = b4 || b3;
      if (yLike && !r.lastLY) r.panel.visible = !r.panel.visible;
      r.lastLY = yLike;
    }

    if (!r.panel.visible) {
      r.pointerDot.visible = false;
      return;
    }

    const gpR = r.getGamepad(session, "right");
    const trig = gpR ? (gpR.buttons?.[0]?.value ?? 0) : 0;
    const trigDown = trig > 0.75;

    r.rightRay.getWorldPosition(r.tmpO);
    r.rightRay.getWorldQuaternion(r.tmpQ);
    r.tmpD.set(0, 0, -1).applyQuaternion(r.tmpQ).normalize();

    r.raycaster.set(r.tmpO, r.tmpD);
    r.raycaster.far = 3;

    const meshes = [];
    for (const b of r.buttons) meshes.push(b.userData.btnMesh);
    const hits = r.raycaster.intersectObjects(meshes, false);

    for (const b of r.buttons) b.userData.btnMesh.material.color.setHex(0x1f2a3a);
    r.pointerDot.visible = false;

    if (hits.length) {
      const hit = hits[0];
      const hitMesh = hit.object;
      hitMesh.material.color.setHex(0xffd24a);
      r.pointerDot.visible = true;
      r.pointerDot.position.copy(hit.point);

      if (trigDown && !r.lastRTrigger) {
        for (const b of r.buttons) {
          if (b.userData.btnMesh === hitMesh) {
            try { b.userData.onPress?.(); } catch (_) {}
            try {
              window.dispatchEvent(new CustomEvent("SCARLETT_UI_PRESS", {
                detail: { label: b.userData.label, point: { x: hit.point.x, y: hit.point.y, z: hit.point.z } }
              }));
            } catch (_) {}
            break;
          }
        }
      }
    }

    r.lastRTrigger = trigDown;
  },

  test() {
    const ok = !!window.SCARLETT?.menu;
    return { ok, note: ok ? "menu present (pause/step/speed)" : "menu missing" };
  }
};

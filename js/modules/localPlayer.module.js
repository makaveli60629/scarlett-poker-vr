// /js/modules/localPlayer.module.js
// Local player tracker — tag OFF by default; if enabled, above head.

export default {
  id: "localPlayer.module.js",

  async init({ THREE, camera, rig, anchors, log }) {
    const root = new THREE.Group();
    root.name = "LOCAL_PLAYER_ROOT";
    anchors.debug.add(root);

    // Tag (OFF by default)
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,512,128);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", 256, 64);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), mat);
    plane.name = "LOCAL_PLAYER_TAG";
    plane.visible = false; // IMPORTANT: off by default
    root.add(plane);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.localPlayer = {
      root,
      tag: plane,
      setTagVisible(v) { plane.visible = !!v; }
    };

    this._rt = { plane, rig, camera };
    log?.("localPlayer.module ✅ (tag off by default)");
  },

  update() {
    const r = this._rt;
    if (!r) return;

    // If tag enabled, keep it above head and facing camera
    if (r.plane.visible) {
      const headY = 1.75; // approx in rig space
      r.plane.position.set(0, headY, -0.2);
      r.plane.quaternion.copy(r.camera.quaternion);
    }
  },

  test() {
    return { ok: true, note: "local player present (tag off by default)" };
  }
};

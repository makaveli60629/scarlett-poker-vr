// /js/modules/localPlayer.module.js
// Local "YOU" avatar preview close by, driven by camera + grips (FULL)

export default {
  id: "localPlayer.module.js",

  async init({ THREE, anchors, rig, camera, rightGrip, leftGrip, log }) {
    const root = new THREE.Group();
    root.name = "LOCAL_PLAYER_ROOT";
    anchors.avatars.add(root);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.20, 0.65, 18),
      new THREE.MeshStandardMaterial({ color: 0x2a2f44, roughness: 0.95 })
    );
    body.name = "YOU_BODY";
    root.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })
    );
    head.name = "YOU_HEAD";
    root.add(head);

    const handMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const lh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), handMat);
    const rh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), handMat);
    lh.name = "YOU_LH";
    rh.name = "YOU_RH";
    root.add(lh, rh);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(10, 30, 236, 68);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 30, 236, 68);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", 128, 64);

    const tex = new THREE.CanvasTexture(c);
    const nameplate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.28),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    nameplate.name = "YOU_NAMEPLATE";
    root.add(nameplate);

    this._rt = { THREE, root, body, head, lh, rh, nameplate, rig, camera, rightGrip, leftGrip };

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.localPlayer = { root, body, head, lh, rh };

    log?.("localPlayer.module ✅ (YOU tracked)");
  },

  update(dt, { camera }) {
    const r = this._rt;
    if (!r) return;

    const headPos = new r.THREE.Vector3();
    r.camera.getWorldPosition(headPos);

    const showOffset = new r.THREE.Vector3(0.45, -0.10, -0.35).applyQuaternion(r.camera.quaternion);
    const base = headPos.clone().add(showOffset);
    r.root.position.copy(base);

    r.head.position.set(0, 1.55, 0.05);
    r.body.position.set(0, 1.10, 0);

    const lwp = new r.THREE.Vector3();
    const rwp = new r.THREE.Vector3();
    r.leftGrip.getWorldPosition(lwp);
    r.rightGrip.getWorldPosition(rwp);
    r.root.worldToLocal(lwp);
    r.root.worldToLocal(rwp);
    r.lh.position.copy(lwp);
    r.rh.position.copy(rwp);

    r.nameplate.position.set(0, 2.05, 0);
    r.nameplate.lookAt(r.camera.position);
  },

  test() {
    const ok = !!window.SCARLETT?.localPlayer;
    return { ok, note: ok ? "local player present" : "local player missing" };
  }
};

// /js/modules/avatarUI.module.js
// Seat highlights + action/dealer indicators (FULL)

export default {
  id: "avatarUI.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const root = new THREE.Group();
    root.name = "AVATAR_UI_ROOT";
    anchors.ui.add(root);

    const seatCount = tableData.seats || 6;
    const seatRadius = (tableData.railRadius || 1.45) + 0.55;

    const rings = [];
    for (let i = 0; i < seatCount; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.012, 10, 40),
        new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.12 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.name = `SEAT_RING_${i}`;
      root.add(ring);
      rings.push(ring);
    }

    const dealerMark = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.20 })
    );
    dealerMark.rotation.x = Math.PI / 2;
    dealerMark.name = "DEALER_RING";
    root.add(dealerMark);

    this._rt = { THREE, root, rings, dealerMark, seatCount, seatRadius };
    log?.("avatarUI.module ✅ (action+dealer)");
  },

  update(dt, { tableData }) {
    const r = this._rt;
    if (!r) return;

    const cx = tableData.center.x;
    const cz = tableData.center.z;

    for (let i = 0; i < r.seatCount; i++) {
      const t = (i / r.seatCount) * Math.PI * 2;
      r.rings[i].position.set(cx + Math.cos(t) * r.seatRadius, 0.02, cz + Math.sin(t) * r.seatRadius);
      r.rings[i].material.opacity = (i === (tableData.activeSeat ?? 0)) ? 0.22 : 0.10;
    }

    const di = tableData.dealerIndex ?? 0;
    const tt = (di / r.seatCount) * Math.PI * 2;
    r.dealerMark.position.set(cx + Math.cos(tt) * (r.seatRadius - 0.18), 0.021, cz + Math.sin(tt) * (r.seatRadius - 0.18));
  },

  test() {
    return { ok: true, note: "avatar UI OK" };
  }
};

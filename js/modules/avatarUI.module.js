// /js/modules/avatarUI.module.js
// Nameplates + dealer/action indicators (FULL)

export default {
  id: 'avatarUI.module.js',

  async init({ THREE, anchors, log }) {
    const root = new THREE.Group();
    root.name = 'AVATAR_UI_ROOT';
    anchors.ui.add(root);

    const plates = [];

    function makePlate(text) {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(10, 26, 492, 76);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 26, 492, 76);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);

      const tex = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.16),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      return m;
    }

    // build around seats
    const td = window.SCARLETT?.table?.data;
    const seatCount = td?.seats || 6;
    const cx = td?.center?.x ?? 0;
    const cy = (td?.center?.y ?? 0.78) + 1.65;
    const cz = td?.center?.z ?? -2.0;
    const rad = (td?.railRadius || 1.42) + 0.85;

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const p = makePlate(`P${i + 1}`);
      p.position.set(cx + Math.cos(t) * rad, cy, cz + Math.sin(t) * rad);
      root.add(p);
      plates.push(p);
    }

    // indicator ring for active seat
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.02, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.name = 'ACTIVE_SEAT_RING';
    root.add(ring);

    this._rt = { td, seatCount, cx, cz, rad, ring, plates };

    log?.('avatarUI.module ✅');
  },

  update(dt, { camera }) {
    const r = this._rt;
    if (!r) return;

    // face camera
    for (const p of r.plates) p.lookAt(camera.position);

    const td = window.SCARLETT?.table?.data;
    const active = td?.activeSeat ?? 0;
    const t = (active / r.seatCount) * Math.PI * 2;
    const y = (td?.center?.y ?? 0.78) + 0.06;
    r.ring.position.set(r.cx + Math.cos(t) * (r.rad - 0.22), y, r.cz + Math.sin(t) * (r.rad - 0.22));
  },

  test() { return { ok: true, note: 'avatar UI OK' }; }
};

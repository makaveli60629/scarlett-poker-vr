// /js/modules/avatarUI.module.js
// Nameplates + seat rings + dealer highlight (FULL)

export default {
  id: "avatarUI.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const ui = new THREE.Group();
    ui.name = "AVATAR_UI_ROOT";
    anchors.ui.add(ui);

    const makeLabel = (text) => {
      // Canvas texture label (cheap + reliable)
      const c = document.createElement("canvas");
      c.width = 256; c.height = 128;
      const ctx = c.getContext("2d");

      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 18, 256, 92);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.strokeRect(0.5, 18.5, 255, 91);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 64);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.275), mat);
      plane.renderOrder = 10;
      return plane;
    };

    // Seat rings
    const seatRings = new THREE.Group();
    seatRings.name = "SEAT_RINGS";
    ui.add(seatRings);

    const seatCount = tableData.seats || 6;
    const seatRadius = (tableData.railRadius || 1.45) + 0.55;

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.20, 32),
        new THREE.MeshBasicMaterial({ color: 0x3a3f55, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(
        tableData.center.x + Math.cos(t) * seatRadius,
        0.02,
        tableData.center.z + Math.sin(t) * seatRadius
      );
      ring.name = `SEAT_RING_${i}`;
      seatRings.add(ring);
    }

    // Nameplates for table avatars
    const labels = [];
    const avatarsPack = window.SCARLETT?.avatars;
    if (avatarsPack?.avatars) {
      for (let i = 0; i < avatarsPack.avatars.length; i++) {
        const av = avatarsPack.avatars[i];
        const label = makeLabel(`Player ${i+1}`);
        label.position.set(av.g.position.x, 1.8, av.g.position.z);
        ui.add(label);
        labels.push(label);
      }
    }

    // Showcase label
    if (avatarsPack?.showcase) {
      const sLabel = makeLabel("SHOWCASE");
      sLabel.position.set(avatarsPack.showcase.g.position.x, 1.8, avatarsPack.showcase.g.position.z);
      ui.add(sLabel);
      labels.push(sLabel);
    }

    // Dealer marker follows dealer button if present
    const dealerMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.015, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dealerMarker.rotation.x = Math.PI / 2;
    dealerMarker.position.set(tableData.center.x + 0.35, tableData.center.y + 0.10, tableData.center.z + 0.2);
    dealerMarker.name = "DEALER_MARKER";
    ui.add(dealerMarker);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatarUI = { ui, labels, seatRings, dealerMarker, activeSeat: 0 };

    log?.("avatarUI.module ✅");
  },

  update(dt, { camera, tableData }) {
    const ui = window.SCARLETT?.avatarUI;
    const av = window.SCARLETT?.avatars;
    const table = window.SCARLETT?.table;

    if (!ui) return;

    // face all labels toward camera
    if (ui.labels?.length) {
      for (const lbl of ui.labels) {
        lbl.lookAt(camera.position);
      }
    }

    // move dealer marker to dealer button if exists
    if (ui.dealerMarker && table?.dealerButton) {
      ui.dealerMarker.position.set(
        table.dealerButton.position.x,
        table.dealerButton.position.y + 0.03,
        table.dealerButton.position.z
      );
    }

    // highlight active seat ring
    const active = ui.activeSeat ?? 0;
    const rings = ui.seatRings?.children || [];
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      ring.material.color.setHex(i === active ? 0xffd24a : 0x3a3f55);
      ring.material.opacity = i === active ? 1.0 : 0.75;
    }
  },

  test() {
    const ok = !!window.SCARLETT?.avatarUI?.ui;
    return { ok, note: ok ? "avatar UI present" : "avatar UI missing" };
  }
};

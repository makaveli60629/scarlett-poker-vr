// /js/modules/avatarUI.module.js
// Nameplates + seat rings + active-seat highlight + dealer ring (FULL)

export default {
  id: "avatarUI.module.js",

  async init({ THREE, anchors, tableData, log }) {
    const ui = new THREE.Group();
    ui.name = "AVATAR_UI_ROOT";
    anchors.ui.add(ui);

    const makeLabel = (text) => {
      const c = document.createElement("canvas");
      c.width = 320; c.height = 160;
      const ctx = c.getContext("2d");

      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(10, 42, 300, 86);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 42, 300, 86);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 160, 85);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.35), mat);
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
        new THREE.RingGeometry(0.16, 0.21, 36),
        new THREE.MeshBasicMaterial({ color: 0x3a3f55, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
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

    // Dealer ring (sits near active dealer seat)
    const dealerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.015, 14, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dealerRing.rotation.x = Math.PI / 2;
    dealerRing.position.set(tableData.center.x, 0.03, tableData.center.z);
    dealerRing.name = "DEALER_RING";
    ui.add(dealerRing);

    // Labels
    const labels = [];
    const avatarsPack = window.SCARLETT?.avatars;

    if (avatarsPack?.avatars) {
      for (let i = 0; i < avatarsPack.avatars.length; i++) {
        const av = avatarsPack.avatars[i];
        const label = makeLabel(`Player ${i+1}`);
        label.position.set(av.g.position.x, 1.95, av.g.position.z);
        label.name = `LABEL_${i}`;
        ui.add(label);
        labels.push(label);
      }
    }

    if (avatarsPack?.showcase) {
      const sLabel = makeLabel("SHOWCASE");
      sLabel.position.set(avatarsPack.showcase.g.position.x, 1.95, avatarsPack.showcase.g.position.z);
      sLabel.name = "LABEL_SHOWCASE";
      ui.add(sLabel);
      labels.push(sLabel);
    }

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.avatarUI = { ui, labels, seatRings, dealerRing };

    log?.("avatarUI.module ✅ (action+dealer)");
  },

  update(dt, { camera, tableData }) {
    const ui = window.SCARLETT?.avatarUI;
    const table = window.SCARLETT?.table;
    if (!ui) return;

    // Face labels to camera
    for (const lbl of (ui.labels || [])) lbl.lookAt(camera.position);

    // Active seat highlight
    const active = tableData.activeSeat ?? 0;
    const rings = ui.seatRings?.children || [];
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      ring.material.color.setHex(i === active ? 0xffd24a : 0x3a3f55);
      ring.material.opacity = i === active ? 1.0 : 0.75;
    }

    // Dealer ring position: use chip anchor (clean + stable)
    const dealerIndex = tableData.dealerIndex ?? 0;
    const chipAnchors = table?.chipAnchors || [];
    const a = chipAnchors[dealerIndex];
    if (a && ui.dealerRing) {
      const wp = a.getWorldPosition(new THREE.Vector3());
      ui.dealerRing.position.set(wp.x, 0.03, wp.z);
    }
  },

  test() {
    const ok = !!window.SCARLETT?.avatarUI?.ui;
    return { ok, note: ok ? "avatar UI OK" : "avatar UI missing" };
  }
};

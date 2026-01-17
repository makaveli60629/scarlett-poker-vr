// /js/modules/pokerTable.module.js
// Poker table + seats + pot + dealer button + betting rings (FULL)

export default {
  id: "pokerTable.module.js",

  async init({ THREE, anchors, tableData, syncGestureToTable, log }) {
    const g = new THREE.Group();
    g.name = "POKER_TABLE_GROUP";
    anchors.table.add(g);

    // Place the table where your world expects it
    tableData.center.set(0, 0.78, -2);
    tableData.radius = 1.2;
    tableData.railRadius = 1.45;
    tableData.seats = 9;

    // Felt
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(tableData.radius, tableData.radius, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0x145a32, roughness: 0.9 })
    );
    felt.position.copy(tableData.center);
    g.add(felt);

    // Rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(tableData.railRadius, 0.09, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.95 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(tableData.center.x, tableData.center.y + 0.06, tableData.center.z);
    g.add(rail);

    // Inner ring (bet line / pass line style)
    const betRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.02, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0xc9a23f, roughness: 0.6 })
    );
    betRing.rotation.x = Math.PI / 2;
    betRing.position.set(tableData.center.x, tableData.center.y + 0.07, tableData.center.z);
    g.add(betRing);

    // Pot marker
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.01, 32),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    pot.position.set(tableData.center.x, tableData.center.y + 0.075, tableData.center.z);
    pot.name = "POT_MARKER";
    g.add(pot);

    // Dealer button (visual)
    const dealer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.01, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    dealer.position.set(tableData.center.x + 0.35, tableData.center.y + 0.08, tableData.center.z + 0.2);
    dealer.name = "DEALER_BUTTON";
    g.add(dealer);

    // Seat markers
    const seatGroup = new THREE.Group();
    seatGroup.name = "SEATS";
    g.add(seatGroup);

    const seatCount = tableData.seats;
    const seatRadius = tableData.railRadius + 0.55;

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;

      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.10, 0.02, 24),
        new THREE.MeshStandardMaterial({ color: 0x3a3f55, roughness: 0.9 })
      );
      seat.position.set(
        tableData.center.x + Math.cos(t) * seatRadius,
        0.01,
        tableData.center.z + Math.sin(t) * seatRadius
      );
      seat.name = `SEAT_${i}`;
      seatGroup.add(seat);
    }

    // Re-sync GestureControl to the real table position/radius
    syncGestureToTable?.();

    // Export helpful references
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.table = { group: g, data: tableData };

    log?.("pokerTable.module ✅");
  },

  test() {
    // just a cheap “exists” check
    const ok = !!window.SCARLETT?.table?.group;
    return { ok, note: ok ? "table present" : "table missing" };
  }
};

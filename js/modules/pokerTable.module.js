// /js/modules/pokerTable.module.js
// 6-max table + seats + pot + dealer button + chip anchors (FULL)

export default {
  id: "pokerTable.module.js",

  async init({ THREE, anchors, tableData, syncGestureToTable, log }) {
    const g = new THREE.Group();
    g.name = "POKER_TABLE_GROUP";
    anchors.table.add(g);

    tableData.center.set(0, 0.78, -2);
    tableData.radius = 1.2;
    tableData.railRadius = 1.45;
    tableData.seats = 6;

    // Felt
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(tableData.radius, tableData.radius, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0x145a32, roughness: 0.9 })
    );
    felt.position.copy(tableData.center);
    felt.name = "TABLE_FELT";
    g.add(felt);

    // Rail
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(tableData.railRadius, 0.09, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.95 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(tableData.center.x, tableData.center.y + 0.06, tableData.center.z);
    rail.name = "TABLE_RAIL";
    g.add(rail);

    // Betting ring
    const betRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.02, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0xc9a23f, roughness: 0.6 })
    );
    betRing.rotation.x = Math.PI / 2;
    betRing.position.set(tableData.center.x, tableData.center.y + 0.07, tableData.center.z);
    betRing.name = "BET_RING";
    g.add(betRing);

    // Pot marker
    const potMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.01, 32),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    potMarker.position.set(tableData.center.x, tableData.center.y + 0.075, tableData.center.z);
    potMarker.name = "POT_MARKER";
    g.add(potMarker);

    // Dealer button
    const dealerButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.01, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    dealerButton.position.set(tableData.center.x + 0.35, tableData.center.y + 0.08, tableData.center.z + 0.2);
    dealerButton.name = "DEALER_BUTTON";
    g.add(dealerButton);

    // Seats + chip anchors
    const seatGroup = new THREE.Group();
    seatGroup.name = "SEATS";
    g.add(seatGroup);

    const chipAnchors = [];
    const seatCount = tableData.seats;
    const seatRadius = tableData.railRadius + 0.55;

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;

      const sx = tableData.center.x + Math.cos(t) * seatRadius;
      const sz = tableData.center.z + Math.sin(t) * seatRadius;

      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.02, 24),
        new THREE.MeshStandardMaterial({ color: 0x3a3f55, roughness: 0.9 })
      );
      seat.position.set(sx, 0.01, sz);
      seat.name = `SEAT_${i}`;
      seatGroup.add(seat);

      const chipAnchor = new THREE.Object3D();
      chipAnchor.position.set(
        tableData.center.x + Math.cos(t) * (tableData.radius + 0.35),
        tableData.center.y + 0.085,
        tableData.center.z + Math.sin(t) * (tableData.radius + 0.35)
      );
      chipAnchor.name = `CHIP_ANCHOR_${i}`;
      g.add(chipAnchor);
      chipAnchors.push(chipAnchor);
    }

    const potAnchor = new THREE.Object3D();
    potAnchor.position.set(tableData.center.x, tableData.center.y + 0.085, tableData.center.z);
    potAnchor.name = "POT_ANCHOR";
    g.add(potAnchor);

    syncGestureToTable?.();

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.table = { group: g, data: tableData, dealerButton, potMarker, chipAnchors, potAnchor };

    log?.("pokerTable.module ✅ (chips+anchors)");
  },

  test() {
    const ok = !!window.SCARLETT?.table?.chipAnchors?.length;
    return { ok, note: ok ? "table+chip anchors present" : "chip anchors missing" };
  }
};

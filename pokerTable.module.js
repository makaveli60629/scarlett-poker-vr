// /js/modules/pokerTable.module.js
// Poker table (6-max) + chip anchors + pot anchor (FULL)

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

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(tableData.radius, tableData.radius, 0.12, 64),
      new THREE.MeshStandardMaterial({ color: 0x145a32, roughness: 0.9 })
    );
    felt.position.copy(tableData.center);
    felt.name = "TABLE_FELT";
    g.add(felt);

    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(tableData.railRadius, 0.09, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.95 })
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(tableData.center.x, tableData.center.y + 0.06, tableData.center.z);
    rail.name = "TABLE_RAIL";
    g.add(rail);

    const betRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.02, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0xc9a23f, roughness: 0.6 })
    );
    betRing.rotation.x = Math.PI / 2;
    betRing.position.set(tableData.center.x, tableData.center.y + 0.07, tableData.center.z);
    betRing.name = "TABLE_BET_RING";
    g.add(betRing);

    // pot anchor
    const potAnchor = new THREE.Group();
    potAnchor.name = "POT_ANCHOR";
    potAnchor.position.set(tableData.center.x, tableData.center.y + 0.075, tableData.center.z);
    g.add(potAnchor);

    const potMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.01, 32),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    potMarker.position.set(0, 0, 0);
    potMarker.name = "POT_MARKER";
    potAnchor.add(potMarker);

    const dealer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.01, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    dealer.position.set(tableData.center.x + 0.35, tableData.center.y + 0.08, tableData.center.z + 0.2);
    dealer.name = "DEALER_BUTTON";
    g.add(dealer);

    // chip anchors per seat
    const chipAnchors = [];
    const seatRadius = tableData.railRadius + 0.55;
    for (let i = 0; i < tableData.seats; i++) {
      const t = (i / tableData.seats) * Math.PI * 2;
      const a = new THREE.Group();
      a.name = `CHIP_ANCHOR_${i}`;
      a.position.set(
        tableData.center.x + Math.cos(t) * (seatRadius - 0.15),
        tableData.center.y + 0.08,
        tableData.center.z + Math.sin(t) * (seatRadius - 0.15)
      );
      a.lookAt(tableData.center.x, tableData.center.y + 0.1, tableData.center.z);
      g.add(a);
      chipAnchors.push(a);
    }

    // seat markers
    const seatsG = new THREE.Group();
    seatsG.name = "SEATS";
    g.add(seatsG);
    for (let i = 0; i < tableData.seats; i++) {
      const t = (i / tableData.seats) * Math.PI * 2;
      const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.10, 0.02, 24),
        new THREE.MeshStandardMaterial({ color: 0x3a3f55, roughness: 0.9 })
      );
      seat.position.set(
        tableData.center.x + Math.cos(t) * (tableData.railRadius + 0.55),
        0.01,
        tableData.center.z + Math.sin(t) * (tableData.railRadius + 0.55)
      );
      seat.name = `SEAT_${i}`;
      seatsG.add(seat);
    }

    syncGestureToTable?.();

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.table = { group: g, data: tableData, chipAnchors, potAnchor };

    log?.("pokerTable.module ✅ (chips+anchors)");
  },

  test() {
    const ok = !!window.SCARLETT?.table?.group && !!window.SCARLETT?.table?.chipAnchors?.length;
    return { ok, note: ok ? "table+chip anchors present" : "table missing" };
  }
};

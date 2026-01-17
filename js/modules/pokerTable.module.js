// /js/modules/pokerTable.module.js
// Polished 6-max poker table with anchors (FULL)

export default {
  id: 'pokerTable.module.js',

  async init({ THREE, anchors, log }) {
    const g = new THREE.Group();
    g.name = 'POKER_TABLE_GROUP';
    anchors.table.add(g);

    const tableData = {
      center: new THREE.Vector3(0, 0.78, -2.0),
      radius: 1.15,
      railRadius: 1.42,
      seats: 6,
      dealerIndex: 0,
      activeSeat: 0
    };

    const cx = tableData.center.x;
    const cy = tableData.center.y;
    const cz = tableData.center.z;

    const feltMat = new THREE.MeshStandardMaterial({ color: 0x125b34, roughness: 0.95, metalness: 0.0 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x24160f, roughness: 0.85, metalness: 0.05 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x1a100c, roughness: 0.85, metalness: 0.03 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xcaa23c, roughness: 0.55, metalness: 0.25 });

    // base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.18, 48), woodMat);
    base.position.set(cx, 0.09, cz);
    base.name = 'TABLE_BASE';
    g.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.72, 28), woodMat);
    stem.position.set(cx, 0.46, cz);
    stem.name = 'TABLE_STEM';
    g.add(stem);

    // felt
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(tableData.radius, tableData.radius, 0.10, 72), feltMat);
    felt.position.set(cx, cy, cz);
    felt.name = 'TABLE_FELT';
    g.add(felt);

    // rail
    const rail = new THREE.Mesh(new THREE.TorusGeometry(tableData.railRadius, 0.11, 18, 128), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(cx, cy + 0.07, cz);
    rail.name = 'TABLE_RAIL';
    g.add(rail);

    // betting ring
    const betRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.016, 14, 128), goldMat);
    betRing.rotation.x = Math.PI / 2;
    betRing.position.set(cx, cy + 0.075, cz);
    betRing.name = 'TABLE_BETRING';
    g.add(betRing);

    // pot anchor
    const potAnchor = new THREE.Group();
    potAnchor.name = 'POT_ANCHOR';
    potAnchor.position.set(cx, cy + 0.085, cz);
    g.add(potAnchor);

    const potMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.01, 42),
      new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 })
    );
    potMarker.name = 'POT_MARKER';
    potAnchor.add(potMarker);

    // dealer button
    const dealerButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.012, 28),
      new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.45, metalness: 0.05 })
    );
    dealerButton.name = 'DEALER_BUTTON';
    dealerButton.position.set(cx + 0.35, cy + 0.085, cz + 0.20);
    g.add(dealerButton);

    // chip anchors
    const chipAnchors = [];
    for (let i = 0; i < tableData.seats; i++) {
      const t = (i / tableData.seats) * Math.PI * 2 + Math.PI;
      const chipAnchor = new THREE.Group();
      chipAnchor.name = `CHIP_ANCHOR_${i}`;
      chipAnchor.position.set(
        cx + Math.cos(t) * (tableData.radius + 0.35),
        cy + 0.085,
        cz + Math.sin(t) * (tableData.radius + 0.35)
      );
      g.add(chipAnchor);
      chipAnchors.push(chipAnchor);
    }

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.table = { group: g, data: tableData, chipAnchors, potAnchor, dealerButton };

    // Let gestureControl lock onto the real table
    try {
      const mod = await import('./gestureControl.js');
      mod?.GestureControl?.setTableFromScarlett?.();
    } catch (_) {}

    log?.('pokerTable.module ✅ (polished)');
  },

  test() {
    const ok = !!window.SCARLETT?.table?.chipAnchors?.length;
    return { ok, note: ok ? 'table+chip anchors present' : 'table missing' };
  }
};

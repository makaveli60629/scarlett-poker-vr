// js/modules/lobbyStations.module.js
// BUILD: LOBBY_STATIONS_FULL_v1
// Adds visible stations (Join, Practice, Store) around lobby.

export default {
  name: "lobbyStations",
  init(input = {}, maybeApp) {
    const ctx = normalize(input, maybeApp);
    const { THREE, scene, room, debug } = ctx;

    const g = new THREE.Group();
    g.name = "lobbyStations";
    scene?.add(g);

    // Place stations in a ring around center (on main floor)
    const stations = [
      { name: "PRACTICE", pos: [8, 0, 10], color: 0x66ffcc },
      { name: "JOIN TABLE", pos: [-8, 0, 10], color: 0xff66cc },
      { name: "STORE", pos: [-18, 0, -16], color: 0x00ff88 },
      { name: "VIP", pos: [18, 0, 14], color: 0xffd166 },
    ];

    const items = [];
    for (const s of stations) {
      const station = makeStation(THREE, s.name, s.color);
      station.position.set(s.pos[0], 0.02, s.pos[2]);
      g.add(station);
      items.push(station);
    }

    // Expose for other modules
    room.anchors = room.anchors || {};
    room.anchors.stations = g;

    debug?.log?.('lobbyStations init ✅');

    return {
      name: 'lobbyStations',
      group: g,
      items,
      dispose() { try { g.parent?.remove(g); } catch {} }
    };
  }
};

function makeStation(THREE, label, color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.95, metalness: 0.0 })
  );
  base.position.y = 0.06;
  g.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.05, 10, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.4, metalness: 0.1, emissive: new THREE.Color(color), emissiveIntensity: 1.05 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.13;
  g.add(ring);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x222634, roughness: 0.85, metalness: 0.05 })
  );
  pole.position.y = 0.9;
  g.add(pole);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.8, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.5, metalness: 0.15, emissive: new THREE.Color(color), emissiveIntensity: 0.8 })
  );
  sign.position.y = 1.55;
  g.add(sign);

  // Label as simple etch using small boxes (keeps it asset-free)
  const labelBar = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.08, 0.02),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0 })
  );
  labelBar.position.set(0, 1.55, 0.08);
  g.add(labelBar);

  g.userData.label = label;
  return g;
}

function normalize(input, maybeApp) {
  const ctx = input?.THREE ? input : null;
  const app = (ctx?.app || maybeApp || input?.app || input) || {};
  return {
    THREE: ctx?.THREE || app?.THREE || globalThis.THREE,
    scene: ctx?.scene || app?.scene || globalThis.scene,
    room: ctx?.room || app?.room || globalThis.room,
    debug: ctx?.debug || app?.debug || globalThis.debug,
  };
}

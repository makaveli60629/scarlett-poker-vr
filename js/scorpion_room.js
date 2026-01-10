// /js/scorpion_room.js — Scorpion Room v2 (FULL)
// Creates a dedicated table zone + visuals + allows activation toggles.

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, log } = ctx;

    const group = new THREE.Group();
    group.name = "SCORPION_ROOM";
    group.position.set(8.0, 0, 0); // right side “wing”
    scene.add(group);

    // Room shell (simple)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.0, 0.08, 18, 96),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0xff2d7a, emissiveIntensity: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    // Lighting
    const neon = new THREE.PointLight(0xff2d7a, 3.0, 18);
    neon.position.set(0, 3.0, 0);
    group.add(neon);

    // Marker sign
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.85 })
    );
    sign.position.set(0, 2.2, -3.8);
    sign.rotation.y = Math.PI;
    group.add(sign);

    // “Scorpion Table” placeholder (PokerSim will attach a real table visual)
    ctx.tables.scorpion = ctx.tables.scorpion || {
      id: "scorpion",
      minBet: 100,
      maxPlayers: 3,
      anchor: new THREE.Vector3(8.0, 0, 0),
    };

    const api = {
      group,
      setActive(on) {
        group.visible = !!on;
      }
    };

    // default ON so you can see it; RoomManager can toggle later
    group.visible = true;

    log?.("[scorpion] build ✅ (master wing)");
    return api;
  }
};

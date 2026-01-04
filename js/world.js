import * as THREE from "three";

/**
 * WORLD (Lobby + Poker Room)
 * - Solid walls/floor (colliders)
 * - Teleport pads (Lobby <-> Poker Room)
 * - Safe spawn area
 */
export const World = {
  colliders: [],        // solid objects we collide with
  teleportSurfaces: [], // objects you can teleport onto
  markers: {},          // named teleport targets

  // helper: make a collider object
  addCollider(mesh) {
    mesh.userData.isCollider = true;
    this.colliders.push(mesh);
  },

  // helper: mark a surface as teleportable
  addTeleportSurface(mesh) {
    mesh.userData.teleportable = true;
    this.teleportSurfaces.push(mesh);
  },

  // build a simple room
  buildRoom({ scene, name, center = new THREE.Vector3(), size = { w: 18, h: 4, d: 18 } }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(center);

    // FLOOR (teleportable)
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(size.w, 0.2, size.d),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95, metalness: 0.0 })
    );
    floor.position.set(0, -0.1, 0);
    floor.receiveShadow = true;
    group.add(floor);
    this.addCollider(floor);
    this.addTeleportSurface(floor);

    // WALLS (solid)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f1f22, roughness: 0.9 });
    const t = 0.35;

    const north = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, t), wallMat);
    north.position.set(0, size.h / 2, -size.d / 2);
    const south = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, t), wallMat);
    south.position.set(0, size.h / 2, size.d / 2);

    const west = new THREE.Mesh(new THREE.BoxGeometry(t, size.h, size.d), wallMat);
    west.position.set(-size.w / 2, size.h / 2, 0);
    const east = new THREE.Mesh(new THREE.BoxGeometry(t, size.h, size.d), wallMat);
    east.position.set(size.w / 2, size.h / 2, 0);

    for (const w of [north, south, west, east]) {
      w.castShadow = true;
      w.receiveShadow = true;
      group.add(w);
      this.addCollider(w);
    }

    // LIGHTING
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.65);
    group.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(6, 10, 6);
    key.castShadow = true;
    group.add(key);

    // subtle ceiling fill
    const fill = new THREE.PointLight(0xffffff, 0.35, 30);
    fill.position.set(0, 3.2, 0);
    group.add(fill);

    scene.add(group);
    return group;
  },

  // teleport pad (visible destination disc)
  makeTeleportPad({ scene, position, label }) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a7bd5, roughness: 0.35, metalness: 0.0 })
    );
    pad.position.copy(position);
    pad.receiveShadow = true;
    pad.userData.teleportable = true;
    pad.userData.teleportTarget = label;
    scene.add(pad);

    // ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.05, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
    );
    ring.position.copy(position).add(new THREE.Vector3(0, 0.06, 0));
    scene.add(ring);

    // save marker
    this.markers[label] = position.clone().add(new THREE.Vector3(0, 0, 0));
    this.addTeleportSurface(pad);
    return pad;
  },

  build(scene, playerGroup) {
    // BACKGROUND
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 2, 60);

    // SAFE SPAWN (no objects above)
    playerGroup.position.set(0, 0, 5);

    // LOBBY
    this.buildRoom({
      scene,
      name: "Lobby",
      center: new THREE.Vector3(0, 0, 0),
      size: { w: 18, h: 4, d: 18 }
    });

    // POKER ROOM (separate area)
    this.buildRoom({
      scene,
      name: "PokerRoom",
      center: new THREE.Vector3(0, 0, -32),
      size: { w: 22, h: 4.5, d: 22 }
    });

    // TELEPORT PADS
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, 2), label: "Lobby" });
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, -30), label: "PokerRoom" });

    // OPTIONAL: add a simple “table placeholder” in poker room (solid)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.25, 28),
      new THREE.MeshStandardMaterial({ color: 0x0f6b3e, roughness: 0.8 })
    );
    table.position.set(0, 0.35, -32);
    scene.add(table);
    this.addCollider(table);
  }
};

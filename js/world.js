import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/**
 * WORLD
 * - Lobby + Poker Room
 * - Visible teleport pads (raised)
 * - Neon trim corners + ceiling edges
 * - Store kiosk visible
 * - Colliders list for "solid"
 */
export const World = {
  colliders: [],
  teleportSurfaces: [],
  markers: {},

  addCollider(mesh) {
    mesh.userData.isCollider = true;
    if (mesh.geometry?.computeBoundingBox) mesh.geometry.computeBoundingBox();
    this.colliders.push(mesh);
  },

  addTeleportSurface(mesh) {
    mesh.userData.teleportable = true;
    if (mesh.geometry?.computeBoundingBox) mesh.geometry.computeBoundingBox();
    this.teleportSurfaces.push(mesh);
  },

  buildRoom({ scene, name, center, size }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(center);

    // FLOOR
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(size.w, 0.2, size.d),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.95 })
    );
    floor.position.set(0, -0.1, 0);
    floor.receiveShadow = true;
    group.add(floor);
    this.addCollider(floor);
    this.addTeleportSurface(floor);

    // WALLS
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x202026, roughness: 0.9 });
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

    // NEON TRIM
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.1
    });

    const trimW = 0.06;

    // corner posts
    const corners = [
      new THREE.Vector3(-size.w / 2 + trimW, size.h / 2, -size.d / 2 + trimW),
      new THREE.Vector3(size.w / 2 - trimW, size.h / 2, -size.d / 2 + trimW),
      new THREE.Vector3(-size.w / 2 + trimW, size.h / 2, size.d / 2 - trimW),
      new THREE.Vector3(size.w / 2 - trimW, size.h / 2, size.d / 2 - trimW)
    ];
    for (const p of corners) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(trimW, size.h, trimW), neonMat);
      post.position.copy(p);
      group.add(post);
    }

    // ceiling rectangle
    const yTop = size.h - 0.06;
    const topNorth = new THREE.Mesh(new THREE.BoxGeometry(size.w, trimW, trimW), neonMat);
    topNorth.position.set(0, yTop, -size.d / 2 + trimW);
    const topSouth = new THREE.Mesh(new THREE.BoxGeometry(size.w, trimW, trimW), neonMat);
    topSouth.position.set(0, yTop, size.d / 2 - trimW);
    const topWest = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimW, size.d), neonMat);
    topWest.position.set(-size.w / 2 + trimW, yTop, 0);
    const topEast = new THREE.Mesh(new THREE.BoxGeometry(trimW, trimW, size.d), neonMat);
    topEast.position.set(size.w / 2 - trimW, yTop, 0);
    group.add(topNorth, topSouth, topWest, topEast);

    // LIGHTS
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.95);
    group.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(8, 12, 6);
    key.castShadow = true;
    group.add(key);

    const fill = new THREE.PointLight(0xffffff, 0.65, 45);
    fill.position.set(0, size.h - 0.4, 0);
    group.add(fill);

    scene.add(group);
    return group;
  },

  makeTeleportPad({ scene, position, label }) {
    const y = 0.03; // raised so it won't disappear into floor

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x2f7dff,
      emissive: 0x2f7dff,
      emissiveIntensity: 1.4,
      roughness: 0.25
    });

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.07, 28), padMat);
    pad.position.set(position.x, y, position.z);
    pad.userData.teleportable = true;
    pad.userData.teleportTarget = label;
    scene.add(pad);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 10, 28), ringMat);
    ring.position.set(position.x, y + 0.05, position.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    this.markers[label] = new THREE.Vector3(position.x, 0, position.z);
    this.addTeleportSurface(pad);
    return pad;
  },

  makeStoreKiosk({ scene, position }) {
    const kiosk = new THREE.Group();
    kiosk.position.copy(position);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.9 })
    );
    base.position.y = 0.6;
    kiosk.add(base);
    this.addCollider(base);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        emissive: 0x00ff88,
        emissiveIntensity: 1.3
      })
    );
    screen.position.set(0, 1.05, 0.41);
    kiosk.add(screen);

    const header = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.12, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 2.0
      })
    );
    header.position.set(0, 1.28, 0.2);
    kiosk.add(header);

    scene.add(kiosk);

    // teleportable store zone glow
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 32),
      new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.25
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(position.x, 0.01, position.z);
    scene.add(pad);
    this.addTeleportSurface(pad);

    this.markers.Store = new THREE.Vector3(position.x, 0, position.z);
  },

  build(scene, playerGroup) {
    scene.background = new THREE.Color(0x07080d);
    scene.fog = new THREE.Fog(0x07080d, 3, 80);

    // safe spawn
    playerGroup.position.set(0, 0, 5);

    // rooms
    this.buildRoom({
      scene,
      name: "Lobby",
      center: new THREE.Vector3(0, 0, 0),
      size: { w: 18, h: 4.2, d: 18 }
    });

    this.buildRoom({
      scene,
      name: "PokerRoom",
      center: new THREE.Vector3(0, 0, -32),
      size: { w: 22, h: 4.6, d: 22 }
    });

    // teleport pads
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, 2), label: "Lobby" });
    this.makeTeleportPad({ scene, position: new THREE.Vector3(0, 0, -30), label: "PokerRoom" });

    // store kiosk in lobby
    this.makeStoreKiosk({ scene, position: new THREE.Vector3(-5.5, 0, 5.5) });

    // poker table placeholder (solid)
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.25, 28),
      new THREE.MeshStandardMaterial({ color: 0x0f6b3e, roughness: 0.8 })
    );
    table.position.set(0, 0.35, -32);
    scene.add(table);
    this.addCollider(table);
  }
};

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const World = {
  build(scene, rig, ctx) {
    const colliders = [];
    const floorPlanes = [];

    // ---- Lighting (stable, bright, no black room) ----
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(12, 18, 10);
    key.castShadow = false;
    scene.add(key);

    const warm = new THREE.PointLight(0xffcc88, 0.65, 60);
    warm.position.set(10, 5.5, 10);
    scene.add(warm);

    const cool = new THREE.PointLight(0x88bbff, 0.70, 60);
    cool.position.set(-10, 5.5, 10);
    scene.add(cool);

    // ---- Helper: collider box from mesh (cheap + reliable) ----
    const addColliderFromMesh = (m) => {
      const box = new THREE.Box3().setFromObject(m);
      colliders.push(box);
    };

    // ---- Room builder ----
    const makeRoom = ({
      name,
      sizeX,
      sizeZ,
      wallH,
      thickness,
      center,
      floorColor,
      wallColor,
      ceilingColor,
      carpet = true,
      carpetColor = 0x2a0d15,
    }) => {
      const group = new THREE.Group();
      group.name = `room_${name}`;
      group.position.copy(center);
      scene.add(group);

      // Floor (solid, no grid “tile” interference)
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(sizeX, sizeZ),
        new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.95 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      group.add(floor);
      floorPlanes.push(floor);

      // Carpet overlay (tiny offset so it NEVER z-fights)
      if (carpet) {
        const carpetMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(sizeX * 0.98, sizeZ * 0.98),
          new THREE.MeshStandardMaterial({
            color: carpetColor,
            roughness: 0.98,
            metalness: 0.0,
          })
        );
        carpetMesh.rotation.x = -Math.PI / 2;
        carpetMesh.position.y = 0.01;
        group.add(carpetMesh);
      }

      // Walls (SOLID)
      const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });

      const halfX = sizeX / 2;
      const halfZ = sizeZ / 2;

      const mkWall = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        m.position.set(x, y, z);
        group.add(m);
        addColliderFromMesh(m);
        return m;
      };

      // back/front/left/right
      mkWall(sizeX, wallH, thickness, 0, wallH / 2, -halfZ);
      mkWall(sizeX, wallH, thickness, 0, wallH / 2,  halfZ);
      mkWall(thickness, wallH, sizeZ, -halfX, wallH / 2, 0);
      mkWall(thickness, wallH, sizeZ,  halfX, wallH / 2, 0);

      // Ceiling
      const ceil = new THREE.Mesh(
        new THREE.PlaneGeometry(sizeX, sizeZ),
        new THREE.MeshStandardMaterial({ color: ceilingColor, roughness: 0.95 })
      );
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(0, wallH, 0);
      group.add(ceil);

      return { group, floor, center };
    };

    // ---- Define the 3 rooms (your layout) ----
    // Lobby is 40x40
    const lobby = makeRoom({
      name: "lobby",
      sizeX: 40,
      sizeZ: 40,
      wallH: 4.6,
      thickness: 0.35,
      center: new THREE.Vector3(0, 0, 0),
      floorColor: 0x111217,
      wallColor: 0x2a2f3a,
      ceilingColor: 0x0b0c10,
      carpet: true,
      carpetColor: 0x1b0b0f,
    });

    // Poker room (bigger than before so you never spawn outside)
    const poker = makeRoom({
      name: "poker",
      sizeX: 34,
      sizeZ: 34,
      wallH: 4.6,
      thickness: 0.35,
      center: new THREE.Vector3(0, 0, -52),
      floorColor: 0x101015,
      wallColor: 0x242a34,
      ceilingColor: 0x07080c,
      carpet: true,
      carpetColor: 0x0d3a22, // felt vibe
    });

    // Store room
    const store = makeRoom({
      name: "store",
      sizeX: 30,
      sizeZ: 30,
      wallH: 4.6,
      thickness: 0.35,
      center: new THREE.Vector3(-52, 0, 0),
      floorColor: 0x111217,
      wallColor: 0x2b2f3a,
      ceilingColor: 0x07080c,
      carpet: true,
      carpetColor: 0x0f0f12,
    });

    // ---- Neon doorway markers (so you can SEE where rooms are) ----
    const mkPortalMarker = (pos, color = 0x44ccff) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.08, 14, 48),
        new THREE.MeshBasicMaterial({ color })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.06;
      scene.add(ring);
      return ring;
    };

    // portal markers in lobby
    mkPortalMarker(new THREE.Vector3(0, 0, -18), 0x44ccff);  // toward poker
    mkPortalMarker(new THREE.Vector3(-18, 0, 0), 0xffcc44);  // toward store

    // ---- Spawns (SAFE: never on table, never outside room) ----
    const spawns = {
      lobby: new THREE.Vector3(0, 0, 10),
      poker: new THREE.Vector3(0, 0, -42),
      store: new THREE.Vector3(-42, 0, 10),
    };

    // Expose to ctx so locomotion + teleport_machine can use it
    if (ctx) {
      ctx.rooms = {
        lobby: { pos: lobby.group.position.clone() },
        poker: { pos: poker.group.position.clone() },
        store: { pos: store.group.position.clone() },
      };
      ctx.spawns3D = spawns;
      ctx.floorPlanes = floorPlanes;
      ctx.colliders = colliders;
    }

    // If rig exists, enforce safe lobby spawn immediately
    if (rig) {
      const p = spawns.lobby;
      rig.position.set(p.x, 0, p.z);
    }

    return { colliders, floorPlanes, spawns };
  },
};

export default World;

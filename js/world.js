// js/world.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const World = {
  build(scene, playerGroup) {
    // Spawn safety (not on table)
    // Put player slightly forward + above floor
    playerGroup.position.set(0, 0, 4);

    // Background / fog
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 6, 45);

    // --- LIGHTING (BRIGHTER) ---
    // Soft global ambient so Quest never goes “black”
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    // Hemisphere light helps “lift” shadows
    const hemi = new THREE.HemisphereLight(0xbad7ff, 0x101018, 0.85);
    hemi.position.set(0, 10, 0);
    scene.add(hemi);

    // Main directional (key light)
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 10, 4);
    dir.castShadow = false;
    scene.add(dir);

    // VIP accent lights (keep the vibe)
    const vipA = new THREE.PointLight(0x00ffaa, 1.2, 18);
    vipA.position.set(0, 3.2, -6.5);
    scene.add(vipA);

    const vipB = new THREE.PointLight(0xff3366, 0.85, 18);
    vipB.position.set(3.5, 2.6, -4.0);
    scene.add(vipB);

    // --- FLOOR ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    scene.add(floor);

    // --- WALLS (simple VIP room box) ---
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      roughness: 0.92,
      metalness: 0.05,
      emissive: 0x020208,
      emissiveIntensity: 0.35,
    });

    const room = new THREE.Group();
    room.name = "vip_room_shell";

    const wallThickness = 0.2;
    const wallHeight = 4.0;
    const size = 18;

    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      return m;
    };

    // Back / front / left / right
    room.add(mkWall(size, wallHeight, wallThickness, 0, wallHeight / 2, -size / 2));
    room.add(mkWall(size, wallHeight, wallThickness, 0, wallHeight / 2,  size / 2));
    room.add(mkWall(wallThickness, wallHeight, size, -size / 2, wallHeight / 2, 0));
    room.add(mkWall(wallThickness, wallHeight, size,  size / 2, wallHeight / 2, 0));

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 1.0 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, wallHeight, 0);
    room.add(ceiling);

    scene.add(room);

    return { floor, room };
  },
};

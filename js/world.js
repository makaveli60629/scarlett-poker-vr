import * as THREE from "three";
import { TextureBank, Textures } from "./textures.js";
import { registerCollider, registerSpawnPad } from "./state.js";

export const World = {
  build(scene) {
    scene.background = new THREE.Color(0x060607);
    scene.fog = new THREE.Fog(0x060607, 8, 60);

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.25));

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(7, 12, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    // FLOOR
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 32),
      TextureBank.standard({ mapFile: Textures.FLOOR_LOBBY, color: 0x2a2a2a, roughness: 0.95, repeat: 5 })
    );
    floor.name = "floor";
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // WALLS (solid)
    const wallMat = TextureBank.standard({ mapFile: Textures.WALL_BRICK, color: 0x3a3a3a, roughness: 0.95, repeat: 3 });
    const wallGeo = new THREE.BoxGeometry(32, 6, 0.8);

    const mkWall = (x, y, z, ry = 0) => {
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(x, y, z);
      w.rotation.y = ry;
      w.castShadow = w.receiveShadow = true;
      scene.add(w);

      const halfX = 16, halfY = 3, halfZ = 0.4;
      let min, max;
      if (Math.abs(ry) < 0.01) {
        min = { x: x - halfX, y: y - halfY, z: z - halfZ };
        max = { x: x + halfX, y: y + halfY, z: z + halfZ };
      } else {
        min = { x: x - halfZ, y: y - halfY, z: z - halfX };
        max = { x: x + halfZ, y: y + halfY, z: z + halfX };
      }
      registerCollider(w, { min, max });
    };

    mkWall(0, 3, -16, 0);
    mkWall(0, 3,  16, 0);
    mkWall(-16, 3, 0, Math.PI / 2);
    mkWall( 16, 3, 0, Math.PI / 2);

    // CEILING
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 32),
      TextureBank.standard({ mapFile: Textures.CEILING_DOME, color: 0x101010, roughness: 1.0, emissive: 0x050505 })
    );
    ceiling.position.set(0, 6.05, 0);
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // WALL ART
    this.addWallArt(scene, 0, 3, -15.55, 0, Textures.CASINO_ART);
    this.addWallArt(scene, -15.55, 3, 0, Math.PI/2, Textures.CASINO_ART_2);

    // PROPS
    this.addProps(scene);

    // SPAWN PADS IN ALL ROOMS
    this.addSpawnPads(scene);
  },

  addWallArt(scene, x, y, z, ry, file) {
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.4),
      TextureBank.standard({ mapFile: file, color: 0x222222, roughness: 0.9 })
    );
    art.position.set(x, y, z);
    art.rotation.y = ry;
    scene.add(art);
  },

  addSpawnPads(scene) {
    // Lobby pads
    this.addTeleportPad(scene, 0, 10, "LOBBY_ENTRY");
    this.addTeleportPad(scene, -12, 10, "LOBBY_SOFA");
    this.addTeleportPad(scene, 12, -10, "LOBBY_PLANT");

    // Future room anchors (pads exist now = safe spawn always)
    this.addTeleportPad(scene, 40, 10, "VIP_ENTRY");
    this.addTeleportPad(scene, 0, 50, "PENTHOUSE_ENTRY");
    this.addTeleportPad(scene, -40, -10, "NIGHTCLUB_ENTRY");
  },

  addTeleportPad(scene, x, z, label) {
    const group = new THREE.Group();
    group.position.set(x, 0.01, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.03, 36),
      TextureBank.standard({ color: 0x0b2a18, roughness: 0.9, emissive: 0x002211 })
    );
    base.receiveShadow = true;
    group.add(base);

    const ringMat = TextureBank.standard({
      mapFile: Textures.TELEPORT_GLOW,
      color: 0x00ff66,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x00aa44,
      emissiveMapFile: Textures.TELEPORT_GLOW
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 12, 64), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);

    group.name = `spawnPad_${label}`;
    scene.add(group);
    registerSpawnPad(group);
  },

  addProps(scene) {
    // Sofa
    const sofaMat = TextureBank.standard({
      mapFile: Textures.SOFA_DIFF,
      normalMapFile: Textures.SOFA_NORM,
      color: 0x2b2b2b,
      roughness: 0.95
    });

    const couch = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 1.1), sofaMat);
    couch.position.set(-10, 0.5, 10);
    couch.castShadow = couch.receiveShadow = true;
    scene.add(couch);
    registerCollider(couch, {
      min: { x: -11.5, y: 0, z: 9.45 },
      max: { x: -8.5,  y: 1.0, z: 10.55 }
    });

    // Plants
    const plant = (x, z) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.30, 0.35, 14),
        TextureBank.standard({ color: 0x3a2a20, roughness: 1 })
      );
      pot.position.set(x, 0.175, z);
      pot.castShadow = pot.receiveShadow = true;
      scene.add(pot);

      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 16),
        TextureBank.standard({ color: 0x1f6b3a, roughness: 0.9 })
      );
      leaves.position.set(x, 0.75, z);
      leaves.castShadow = true;
      scene.add(leaves);

      registerCollider(pot, {
        min: { x: x - 0.35, y: 0, z: z - 0.35 },
        max: { x: x + 0.35, y: 1.3, z: z + 0.35 }
      });
    };

    plant(10, 10);
    plant(10, -10);
    plant(-10, -10);
  }
};

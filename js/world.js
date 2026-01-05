// js/world.js — VIP Room World Restore (Box + Floor + Boss Table + Chairs)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { BossTable } from "./boss_table.js";
import { Chair } from "./chair.js";
import { TeleportMachine } from "./teleport_machine.js"; // ok if you have it
import { applyZonesToPosition } from "./state.js";

export const World = {
  textureLoader: new THREE.TextureLoader(),

  // SAFE texture helper: if missing, we keep the scene alive
  safeTex(file, { repeat = 1, color = 0x1a1b22 } = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    const path = `assets/textures/${file}`;

    try {
      const tex = this.textureLoader.load(
        path,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeat, repeat);
          t.colorSpace = THREE.SRGBColorSpace;
          mat.map = t;
          mat.color.setHex(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => console.warn("Texture missing, fallback color used:", path)
      );
      // don't depend on immediate load; mat stands alone
      void tex;
    } catch (e) {
      console.warn("Texture load failed:", path, e);
    }
    return mat;
  },

  build(scene, playerGroup) {
    // Spawn safe (NOT on table)
    playerGroup.position.set(0, 0, 5);

    // Background (VIP dark)
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 8, 42);

    // Lights (brighter but VIP)
    const hemi = new THREE.HemisphereLight(0x9fb3ff, 0x0a0b10, 0.55);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(6, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.PointLight(0x00ffaa, 0.45, 24);
    rim.position.set(0, 2.7, -6.5);
    scene.add(rim);

    const pink = new PointLightSafe(0xff2f6a, 0.22, 18);
    pink.position.set(-4.8, 2.0, -4.0);
    scene.add(pink);

    // === THE BOX (VIP room shell) ===
    // Inward-facing box so it feels like a room
    const roomW = 18, roomH = 6.2, roomD = 18;

    const roomMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c12,
      roughness: 1.0,
      side: THREE.BackSide,
    });

    const room = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), roomMat);
    room.position.set(0, roomH / 2, -2.0);
    room.receiveShadow = true;
    scene.add(room);

    // === FLOOR ===
    // If you have carpet: assets/textures/lobby_carpet.jpg (or png)
    const floorMat = this.safeTex("lobby_carpet.jpg", { repeat: 3, color: 0x101118 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW - 0.2, roomD - 0.2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -2.0);
    floor.receiveShadow = true;
    scene.add(floor);

    // === WALL TRIM (the nice neon trim you liked) ===
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(roomW - 0.6, 0.08, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        roughness: 0.4,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.3,
      })
    );
    trim.position.set(0, 0.08, -2.0 - (roomD / 2) + 0.2);
    scene.add(trim);

    // Corner “green balls” accents
    const orbGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.8,
      roughness: 0.35,
    });

    const corners = [
      [-roomW/2 + 0.8, 0.25, -2.0 - roomD/2 + 0.8],
      [ roomW/2 - 0.8, 0.25, -2.0 - roomD/2 + 0.8],
      [-roomW/2 + 0.8, 0.25, -2.0 + roomD/2 - 0.8],
      [ roomW/2 - 0.8, 0.25, -2.0 + roomD/2 - 0.8],
    ];
    corners.forEach(([x,y,z]) => {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(x,y,z);
      scene.add(orb);
    });

    // === CENTERPIECE: Boss Table + Rail ===
    BossTable.build(scene);

    // === Teleport Machine (optional) ===
    // If your TeleportMachine exists, we build it safely
    try {
      if (TeleportMachine?.build) {
        // Place it forward of spawn, not on table
        TeleportMachine.build(scene, new THREE.Vector3(0, 0, 2.0));
      }
    } catch (e) {
      console.warn("TeleportMachine build skipped:", e);
    }

    // === CHAIRS around Boss Table ===
    // BossTable center from boss_table.js is (0,0,-6.5)
    const tableCenter = new THREE.Vector3(0, 0, -6.5);

    // Build chairs asynchronously (no-crash)
    (async () => {
      await Chair.placeRing(scene, tableCenter, 3.35, 8, "vip");
    })();

    // Return handy refs (optional)
    return { room, floor };
  },

  // keep player inside + respect zones
  update(dt, playerGroup) {
    if (!playerGroup) return;

    // Apply “no-entry zones” pushback (boss zone etc.)
    const push = applyZonesToPosition?.(playerGroup.position);
    if (push) playerGroup.position.add(push);

    // Soft boundary so you don’t leave the room
    const minX = -8.3, maxX = 8.3;
    const minZ = -18.0, maxZ = 12.0;

    playerGroup.position.x = THREE.MathUtils.clamp(playerGroup.position.x, minX, maxX);
    playerGroup.position.z = THREE.MathUtils.clamp(playerGroup.position.z, minZ, maxZ);

    // floor clamp
    if (playerGroup.position.y < 0) playerGroup.position.y = 0;
  },
};

// tiny safe light helper (older browsers sometimes hate PointLight being undefined in scope)
function PointLightSafe(color, intensity, distance) {
  return new THREE.PointLight(color, intensity, distance);
  }

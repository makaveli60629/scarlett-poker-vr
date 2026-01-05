// js/world.js — VIP Room World (8.1.2)
// - Fixes PokerSim import mismatch
// - Builds simple lobby shell + floor
// - Starts PokerSim with a clean “spectator” setup
// - Exports World.build + World.update used by main.js

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PokerSim } from "./poker_simulation.js";

export const World = (() => {
  const _state = {
    built: false,
    scene: null,
    rig: null,
    floor: null,
    room: null,
    ambient: null,
    dir: null,
    tick: 0,
  };

  function _mat(color, rough = 0.95, metal = 0.02, emissive = 0x000000, ei = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      emissive,
      emissiveIntensity: ei,
    });
  }

  function _buildLobby(scene) {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = _mat(0x20252c, 0.98, 0.0);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "LobbyFloor";
    scene.add(floor);

    // Soft neon ring on floor
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(6.0, 6.25, 90),
      _mat(0x00ffaa, 0.2, 0.0, 0x00ffaa, 1.2)
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.name = "SpawnRing";
    scene.add(ring);

    // Walls (simple box room)
    const room = new THREE.Group();
    room.name = "VIPRoomShell";

    const wallMat = _mat(0x0b0d12, 0.98, 0.02);
    const wallThick = 0.5;

    const w = 44, h = 12, d = 44;
    const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), wallMat);
    wallNorth.position.set(0, h / 2, -d / 2);

    const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), wallMat);
    wallSouth.position.set(0, h / 2, d / 2);

    const wallEast = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    wallEast.position.set(w / 2, h / 2, 0);

    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    wallWest.position.set(-w / 2, h / 2, 0);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, wallThick, d), _mat(0x090a0d, 1.0, 0.0));
    ceiling.position.set(0, h + wallThick / 2, 0);

    room.add(wallNorth, wallSouth, wallEast, wallWest, ceiling);

    // Glow frames where you can later mount pictures
    const frameMat = _mat(0x00ffaa, 0.25, 0.0, 0x00ffaa, 1.0);
    function addFrame(x, y, z, ry) {
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), frameMat);
      frame.position.set(x, y, z);
      frame.rotation.y = ry;
      frame.name = "GlowFrame";
      room.add(frame);
    }
    addFrame(0, 6, -21.7, 0);
    addFrame(-21.7, 6, 0, Math.PI / 2);
    addFrame(21.7, 6, 0, -Math.PI / 2);

    scene.add(room);

    return { floor, room };
  }

  function _buildLighting(scene) {
    // Brighter, Quest-friendly
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.35);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 14, 6);
    scene.add(dir);

    const p1 = new THREE.PointLight(0x66aaff, 0.55, 45);
    p1.position.set(-10, 5, 10);
    scene.add(p1);

    const p2 = new THREE.PointLight(0x00ffaa, 0.45, 45);
    p2.position.set(10, 4.5, -10);
    scene.add(p2);

    const p3 = new THREE.PointLight(0xff3366, 0.25, 35);
    p3.position.set(0, 5, 0);
    scene.add(p3);

    return { hemi, dir };
  }

  async function build(scene, rig) {
    if (_state.built) return;

    _state.built = true;
    _state.scene = scene;
    _state.rig = rig;

    // Background
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.Fog(0x05060a, 2, 70);

    const lobby = _buildLobby(scene);
    _state.floor = lobby.floor;
    _state.room = lobby.room;

    const lights = _buildLighting(scene);
    _state.ambient = lights.hemi;
    _state.dir = lights.dir;

    // Spawn safely (center, facing table direction)
    rig.position.set(0, 0, 8);
    rig.rotation.set(0, 0, 0);

    // Start PokerSim (spectator mode)
    PokerSim.init(scene, {
      tableCenter: new THREE.Vector3(0, 0, -6.5),
      playerCount: 5,
      startingChips: 20000,
      handPauseSeconds: 60, // winner walks w/ crown for 60s before restart
      communityHoverY: 2.15,
      uiHoverY: 3.2,
      showHoleCardsAboveHeads: true,
      showTurnHighlight: true,
      potStackOnTable: true,
    });
  }

  function update(dt, camera) {
    _state.tick += dt;
    PokerSim.update(dt, camera);
  }

  return { build, update };
})();

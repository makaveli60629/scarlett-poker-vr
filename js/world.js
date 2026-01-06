// /js/world.js — FULL (9.0) with Table + Chairs + Interactables
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TeleportMachine } from "./teleport_machine.js";
import { buildPokerTable } from "./table.js";
import { buildChair } from "./chair.js";

export const World = {
  _tex: null,

  build(scene) {
    this._tex = new THREE.TextureLoader();

    scene.background = new THREE.Color(0x07070a);
    scene.fog = new THREE.Fog(0x07070a, 10, 50);

    // Lights (brighter)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(6, 10, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bd7ff, 0.6);
    fill.position.set(-7, 6, -4);
    scene.add(fill);
    const warm = new THREE.PointLight(0xffd27a, 0.9, 26);
    warm.position.set(0, 7, -7);
    scene.add(warm);

    // Room
    const ROOM_W = 34;
    const ROOM_D = 34;
    const WALL_H = 9.5;

    const bounds = {
      min: new THREE.Vector3(-ROOM_W / 2 + 1.2, 0, -ROOM_D / 2 + 1.2),
      max: new THREE.Vector3( ROOM_W / 2 - 1.2, 0,  ROOM_D / 2 - 1.2)
    };

    // Materials
    const floorMat = this._safeMat({
      file: "Marblegold floors.jpg",
      color: 0xffffff,
      repeat: [7, 7],
      roughness: 0.9,
      metalness: 0.1
    });

    const wallMat = this._safeMat({
      file: "brickwall.jpg",
      color: 0xf2f2f2,
      repeat: [12, 3], // smaller bricks look
      roughness: 0.95,
      metalness: 0.0
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      roughness: 0.35,
      metalness: 0.5,
      emissive: 0x1a1206,
      emissiveIntensity: 0.25
    });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Walls
    const wallGeo = new THREE.PlaneGeometry(ROOM_W, WALL_H);
    const wallN = new THREE.Mesh(wallGeo, wallMat);
    wallN.position.set(0, WALL_H / 2, -ROOM_D / 2);
    scene.add(wallN);

    const wallS = new THREE.Mesh(wallGeo, wallMat);
    wallS.position.set(0, WALL_H / 2, ROOM_D / 2);
    wallS.rotation.y = Math.PI;
    scene.add(wallS);

    const wallE = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, WALL_H), wallMat);
    wallE.position.set(ROOM_W / 2, WALL_H / 2, 0);
    wallE.rotation.y = -Math.PI / 2;
    scene.add(wallE);

    const wallW = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, WALL_H), wallMat);
    wallW.position.set(-ROOM_W / 2, WALL_H / 2, 0);
    wallW.rotation.y = Math.PI / 2;
    scene.add(wallW);

    // Gold bottom trim
    const trimH = 0.22;
    const trimY = trimH / 2;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), goldMat)).position.set(0, trimY, -ROOM_D / 2 + 0.11);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, trimH, 0.22), goldMat)).position.set(0, trimY,  ROOM_D / 2 - 0.11);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), goldMat)).position.set( ROOM_W / 2 - 0.11, trimY, 0);
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, trimH, ROOM_D), goldMat)).position.set(-ROOM_W / 2 + 0.11, trimY, 0);

    // Corner pillars
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.34, WALL_H, 22);
    for (const [x, z] of [
      [ ROOM_W / 2 - 0.7,  ROOM_D / 2 - 0.7],
      [-ROOM_W / 2 + 0.7,  ROOM_D / 2 - 0.7],
      [ ROOM_W / 2 - 0.7, -ROOM_D / 2 + 0.7],
      [-ROOM_W / 2 + 0.7, -ROOM_D / 2 + 0.7]
    ]) {
      const p = new THREE.Mesh(pillarGeo, goldMat);
      p.position.set(x, WALL_H / 2, z);
      scene.add(p);
    }

    // Table center (one table)
    const tableCenter = new THREE.Vector3(0, 0, -6.0);

    // Stage
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(7.0, 7.3, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.95, metalness: 0.15 })
    );
    stage.position.set(tableCenter.x, 0.04, tableCenter.z);
    scene.add(stage);

    // Build table
    const table = buildPokerTable({ tex: this._tex, center: tableCenter });
    scene.add(table.group);

    // Chairs (8 seats around table)
    const seats = [];
    const interactables = [];
    const chairRingR = 3.25;
    const seatCount = 8;

    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;

      const x = tableCenter.x + Math.cos(a) * chairRingR;
      const z = tableCenter.z + Math.sin(a) * chairRingR;

      // face toward table
      const rotY = -a + Math.PI;

      const chair = buildChair({ tex: this._tex, position: new THREE.Vector3(x, 0, z), rotationY: rotY });
      chair.userData.seatIndex = i; // IMPORTANT
      chair.userData.hit.userData.type = "chair"; // raycast anchor
      chair.userData.hit.userData.seatIndex = i;
      chair.userData.type = "chair";

      // also set on root for traversal
      chair.userData.sitTarget = chair.userData.sitTarget;

      scene.add(chair);

      seats.push({
        index: i,
        chair,
        sitTarget: chair.userData.sitTarget
      });

      interactables.push(chair.userData.hit);
    }

    // Teleport machine (spawn in front of table)
    const teleport = TeleportMachine.build(scene, this._tex);
    teleport.position.set(0, 0, tableCenter.z + 9.5);
    TeleportMachine.padCenter.set(teleport.position.x, 0, teleport.position.z);
    const spawn = TeleportMachine.getSafeSpawn();

    // Colliders (walls only here; your Controls already clamps)
    const colliders = [];
    const wallThickness = 0.9;

    colliders.push(this._boxCollider(new THREE.Vector3(0, WALL_H / 2, -ROOM_D / 2), new THREE.Vector3(ROOM_W, WALL_H, wallThickness)));
    colliders.push(this._boxCollider(new THREE.Vector3(0, WALL_H / 2,  ROOM_D / 2), new THREE.Vector3(ROOM_W, WALL_H, wallThickness)));
    colliders.push(this._boxCollider(new THREE.Vector3( ROOM_W / 2, WALL_H / 2, 0), new THREE.Vector3(wallThickness, WALL_H, ROOM_D)));
    colliders.push(this._boxCollider(new THREE.Vector3(-ROOM_W / 2, WALL_H / 2, 0), new THREE.Vector3(wallThickness, WALL_H, ROOM_D)));

    return {
      tableCenter,
      tableAnchors: table.anchors,
      seats,
      interactables,
      bounds,
      colliders,
      teleport,
      spawn
    };
  },

  _safeMat({ file, color = 0xffffff, repeat = [1, 1], roughness = 0.9, metalness = 0.0 }) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    try {
      const tex = this._tex.load(
        `assets/textures/${file}`,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeat[0], repeat[1]);
          t.colorSpace = THREE.SRGBColorSpace;
        },
        undefined,
        () => {}
      );
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    } catch (e) {}
    return mat;
  },

  _boxCollider(center, size) {
    const half = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    return new THREE.Box3(center.clone().sub(half), center.clone().add(half));
  }
};

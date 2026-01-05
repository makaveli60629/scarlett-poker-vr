// js/world.js — VIP Room World (8.1.9)
// FIXES:
// - Correctly imports PokerSim export (prevents "does not provide export named PokerSim")
// - Builds room, floor, walls, boss table zone placeholder
// - Adds big neon leaderboard frame at back
// - Safe update loop

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PokerSim } from "./poker_simulation.js";

export const World = {
  _built: false,
  _leaderboardMesh: null,

  async build(scene, rig, camera) {
    if (this._built) return;
    this._built = true;

    // Spawn: behind rail, centered
    rig.position.set(0, 0, 6);
    rig.rotation.y = 0;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    scene.add(floor);

    // Outer glow rings (your “color lines”)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 1.2, roughness: 0.25 });
    for (let i = 0; i < 3; i++) {
      const r = 6.5 + i * 2.2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 12, 120), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      scene.add(ring);
    }

    // Walls (solid box room)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.95 });
    const room = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 34), wallMat);
    room.position.set(0, 5, 0);
    room.material.side = THREE.BackSide;
    scene.add(room);

    // A “glow frame” panel mount (you can replace texture later)
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      new THREE.MeshStandardMaterial({ color: 0x11131b, emissive: 0xff0033, emissiveIntensity: 0.35 })
    );
    frame.position.set(0, 4.8, -16.5);
    scene.add(frame);

    // Leaderboard big neon board behind the table
    this._leaderboardMesh = this._makeLeaderboardBoard();
    this._leaderboardMesh.position.set(0, 5.3, -16.4);
    scene.add(this._leaderboardMesh);

    // Boss Table anchor position (table module can be swapped in later)
    const tableAnchor = new THREE.Group();
    tableAnchor.position.set(0, 0, -6.5);
    scene.add(tableAnchor);

    // Start poker simulation (bots/cards/pot/etc.)
    PokerSim.start(scene, tableAnchor);

    return true;
  },

  update(dt, camera, rig) {
    // Keep leaderboard updated from sim state
    if (this._leaderboardMesh) {
      PokerSim.renderLeaderboardTo(this._leaderboardMesh);
    }

    PokerSim.update(dt);
  },

  _makeLeaderboardBoard() {
    // Canvas text texture (no external fonts needed)
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xff0044,
      emissiveIntensity: 0.6,
      roughness: 0.45,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), mat);
    mesh.userData._lbCanvas = canvas;
    mesh.userData._lbCtx = ctx;
    mesh.userData._lbTex = tex;

    // glow border
    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(12.4, 6.4),
      new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: 0x00ffaa, emissiveIntensity: 0.45 })
    );
    border.position.z = -0.02;

    const g = new THREE.Group();
    g.add(border, mesh);

    // initial paint
    ctx.fillStyle = "#070a10";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ffaa";
    ctx.font = "bold 54px Arial";
    ctx.fillText("BOSS TOURNAMENT (Top 10)", 40, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px Arial";
    ctx.fillText("Waiting for rounds…", 40, 140);
    tex.needsUpdate = true;

    return g;
  },
};

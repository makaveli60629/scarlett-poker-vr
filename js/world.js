// /js/world.js — Skylark Poker VR — World v9.0
// PURPOSE: Stable physical world, correct alignment, no sinking/floating
// IMPORTANT: Uses LOCAL ./three.js ONLY (GitHub Pages safe)

import * as THREE from "./three.js";

export const World = {
  async build(scene, playerRig, opts = {}) {
    const texturesPath = opts.texturesPath || "assets/textures/";
    const onLeaderboardReady = opts.onLeaderboardReady || (() => {});

    // -----------------------------
    // FLOOR (Y = 0 IS LAW)
    // -----------------------------
    const floorTex = new THREE.TextureLoader().load(
      texturesPath + "Marblegold floors.jpg",
      t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(6, 6);
      }
    );

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // -----------------------------
    // WALLS (simple, solid, centered)
    // -----------------------------
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0e0f14,
      roughness: 0.9,
    });

    const wallHeight = 6;
    const wallDepth = 0.4;
    const roomSize = 26;

    function makeWall(w, h, d, x, y, z) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        wallMat
      );
      wall.position.set(x, y, z);
      scene.add(wall);
    }

    makeWall(roomSize, wallHeight, wallDepth, 0, wallHeight / 2, -roomSize / 2);
    makeWall(roomSize, wallHeight, wallDepth, 0, wallHeight / 2,  roomSize / 2);
    makeWall(wallDepth, wallHeight, roomSize, -roomSize / 2, wallHeight / 2, 0);
    makeWall(wallDepth, wallHeight, roomSize,  roomSize / 2, wallHeight / 2, 0);

    // -----------------------------
    // LIGHTING (no darkness)
    // -----------------------------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.75);
    scene.add(hemi);

    const ceilingLight = new THREE.PointLight(0xffffff, 0.9, 60);
    ceilingLight.position.set(0, 7, 0);
    scene.add(ceilingLight);

    // Accent lights
    const accentA = new THREE.PointLight(0x00ffaa, 0.45, 25);
    accentA.position.set(-6, 3, -6);
    scene.add(accentA);

    const accentB = new THREE.PointLight(0xff2bd6, 0.45, 25);
    accentB.position.set(6, 3, -6);
    scene.add(accentB);

    // -----------------------------
    // TABLE (CENTERED, ABOVE FLOOR)
    // -----------------------------
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0, -4.5);
    scene.add(tableGroup);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.2, 0.7, 32),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
      })
    );
    tableBase.position.y = 0.35;
    tableGroup.add(tableBase);

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.15, 0.22, 48),
      new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load(
          texturesPath + "table_felt_green.jpg"
        ),
        roughness: 0.8,
      })
    );
    tableTop.position.y = 1.05;
    tableGroup.add(tableTop);

    // -----------------------------
    // CHAIRS + BOT ANCHORS
    // -----------------------------
    const seatCount = 8;
    const seatRadius = 3.8;
    const seatHeight = 0.45; // TOP of seat
    const botBottomOffset = 0.55; // body height above seat

    const seats = [];

    for (let i = 0; i < seatCount; i++) {
      const angle = (i / seatCount) * Math.PI * 2;

      const x = Math.cos(angle) * seatRadius;
      const z = Math.sin(angle) * seatRadius;

      // Chair
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.45, 0.6),
        new THREE.MeshStandardMaterial({
          color: 0x2a2a30,
          roughness: 0.9,
        })
      );
      chair.position.set(x, seatHeight / 2, z);
      chair.lookAt(0, seatHeight / 2, 0);
      scene.add(chair);

      // Bot placeholder anchor (NOT mesh logic here)
      const botAnchor = new THREE.Group();
      botAnchor.position.set(
        x,
        seatHeight + botBottomOffset,
        z
      );
      botAnchor.lookAt(0, botAnchor.position.y, 0);
      scene.add(botAnchor);

      seats.push({ chair, botAnchor });
    }

    // -----------------------------
    // LEADERBOARD (HIGH, CLEAR VIEW)
    // -----------------------------
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 3.8, -11);
    scene.add(boardGroup);

    const boardBG = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 3.2),
      new THREE.MeshStandardMaterial({
        color: 0x05060a,
        emissive: 0x111122,
        emissiveIntensity: 0.6,
        roughness: 0.85,
      })
    );
    boardGroup.add(boardBG);

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const boardTex = new THREE.CanvasTexture(canvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;

    const boardText = new THREE.Mesh(
      new THREE.PlaneGeometry(7.3, 3.0),
      new THREE.MeshBasicMaterial({
        map: boardTex,
        transparent: true,
      })
    );
    boardText.position.z = 0.01;
    boardGroup.add(boardText);

    function drawLeaderboard(lines) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000cc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffd27a";
      ctx.font = "bold 54px Arial";
      ctx.fillText("Boss Tournament", 40, 70);

      ctx.font = "bold 40px Arial";
      ctx.fillStyle = "#00ffaa";

      lines.forEach((l, i) => {
        ctx.fillText(l, 40, 140 + i * 60);
      });

      boardTex.needsUpdate = true;
    }

    drawLeaderboard([
      "Waiting for game...",
      "",
      "",
    ]);

    onLeaderboardReady(drawLeaderboard);

    // -----------------------------
    // SPAWN SAFETY (never inside floor)
    // -----------------------------
    playerRig.position.y = 0;
    if (playerRig.children.length) {
      playerRig.children.forEach(c => {
        if (c.position) c.position.y = Math.max(c.position.y, 1.6);
      });
    }

    // -----------------------------
    // RETURN WORLD API
    // -----------------------------
    return {
      tableGroup,
      seats,
      updateLeaderboard: drawLeaderboard,
    };
  },
};

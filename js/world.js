// /js/world.js — Update 9.1
// Fixes: duplicated builds (world is a singleton), floor alignment, brighter room,
// gold trim, corner pillars, spectator rail, art frames (glow), floor texture.

import * as THREE from "./three.js";

export const World = {
  _built: false,
  textureLoader: new THREE.TextureLoader(),

  safeTex(file) {
    const path = `assets/textures/${file}`;
    try {
      return this.textureLoader.load(path, undefined, undefined, () => {});
    } catch {
      return null;
    }
  },

  matTex(file, fallbackColor, repeatX = 1, repeatY = 1, extra = {}) {
    const t = this.safeTex(file);
    if (t) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.colorSpace = THREE.SRGBColorSpace;
    }
    return new THREE.MeshStandardMaterial({
      color: fallbackColor,
      map: t || null,
      roughness: extra.roughness ?? 0.9,
      metalness: extra.metalness ?? 0.05,
      emissive: extra.emissive ?? 0x000000,
      emissiveIntensity: extra.emissiveIntensity ?? 0.0
    });
  },

  build(scene) {
    if (this._built) return this._refs;
    this._built = true;

    // ===== LIGHTING (BRIGHTER) =====
    scene.background = new THREE.Color(0x07070a);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x202020, 1.15);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 10, 4);
    key.castShadow = false;
    scene.add(key);

    const fill = new THREE.PointLight(0xffd27a, 0.55, 30);
    fill.position.set(0, 6, -8);
    scene.add(fill);

    // ===== ROOM =====
    const room = new THREE.Group();
    scene.add(room);

    const W = 18, D = 22, H = 6.2;

    // floor at y=0
    const floorMat = this.matTex("Marblegold floors.jpg", 0x2a2a2a, 3, 3, { roughness: 0.85, metalness: 0.12 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    floor.name = "FLOOR";
    room.add(floor);

    // walls
    const wallMat = this.matTex("wall_stone_runes.jpg", 0x2b2b30, 2, 1, { roughness: 0.95 });
    const wallGeo = new THREE.BoxGeometry(W, H, 0.35);

    const back = new THREE.Mesh(wallGeo, wallMat);
    back.position.set(0, H / 2, -D / 2);
    room.add(back);

    const front = new THREE.Mesh(wallGeo, wallMat);
    front.position.set(0, H / 2, D / 2);
    room.add(front);

    const sideGeo = new THREE.BoxGeometry(0.35, H, D);
    const left = new THREE.Mesh(sideGeo, wallMat);
    left.position.set(-W / 2, H / 2, 0);
    room.add(left);

    const right = new THREE.Mesh(sideGeo, wallMat);
    right.position.set(W / 2, H / 2, 0);
    room.add(right);

    // gold base trim around bottom
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xffd27a,
      emissiveIntensity: 0.18,
      roughness: 0.35,
      metalness: 0.45
    });

    const trimH = 0.22;
    const trimT = 0.06;

    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), trimMat);
    trimBack.position.set(0, trimH/2, -D/2 + 0.20);
    room.add(trimBack);

    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), trimMat);
    trimFront.position.set(0, trimH/2, D/2 - 0.20);
    room.add(trimFront);

    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), trimMat);
    trimLeft.position.set(-W/2 + 0.20, trimH/2, 0);
    room.add(trimLeft);

    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), trimMat);
    trimRight.position.set(W/2 - 0.20, trimH/2, 0);
    room.add(trimRight);

    // corner pillars
    const pillarMat = this.matTex("rosewood_veneer1_4k.jpg", 0x2b1a10, 1, 2, { roughness: 0.7, metalness: 0.1 });
    const pillarGeo = new THREE.CylinderGeometry(0.28, 0.34, H, 18);

    const corners = [
      [-W/2 + 0.55, -D/2 + 0.55],
      [ W/2 - 0.55, -D/2 + 0.55],
      [-W/2 + 0.55,  D/2 - 0.55],
      [ W/2 - 0.55,  D/2 - 0.55],
    ];
    for (const [x, z] of corners) {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x, H/2, z);
      room.add(p);
    }

    // ===== WALL ART (brighter) =====
    const artTex = this.safeTex("casino_art.jpg") || this.safeTex("Casinoart2.jpg");
    const artFrame = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
      metalness: 0.25,
      emissive: 0x000000
    });
    const artMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: artTex || null,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
      roughness: 0.9
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 0.08), artFrame);
    frame.position.set(0, 3.2, -D/2 + 0.30);

    const art = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 1.85), artMat);
    art.position.set(0, 3.2, -D/2 + 0.35);

    // small glow for art so it's not dark
    const artGlow = new THREE.PointLight(0xffffff, 0.6, 8);
    artGlow.position.set(0, 3.3, -D/2 + 1.4);

    room.add(frame, art, artGlow);

    // ===== POKER ZONE (ONE table only — table comes from PokerSimulation) =====
    // spectator rail ring
    const rail = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9, metalness: 0.15 });
    const railR = 6.6;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(railR, 0.06, 12, 120),
      railMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.95;
    rail.add(ring);

    // small posts
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(Math.cos(a) * railR, 0.45, Math.sin(a) * railR);
      rail.add(post);
    }

    // rail positioned around table center (table center is z=-8)
    rail.position.set(0, 0, -8);
    room.add(rail);

    // collision blockers (simple): keep player inside room
    const blockers = new THREE.Group();
    const invMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
    const thick = 0.6;

    const bBack = new THREE.Mesh(new THREE.BoxGeometry(W, H, thick), invMat);
    bBack.position.set(0, H/2, -D/2);
    const bFront = new THREE.Mesh(new THREE.BoxGeometry(W, H, thick), invMat);
    bFront.position.set(0, H/2, D/2);
    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(thick, H, D), invMat);
    bLeft.position.set(-W/2, H/2, 0);
    const bRight = new THREE.Mesh(new THREE.BoxGeometry(thick, H, D), invMat);
    bRight.position.set(W/2, H/2, 0);

    blockers.add(bBack, bFront, bLeft, bRight);
    room.add(blockers);

    this._refs = {
      floor,
      floorMeshes: [floor],
      rail,
      room
    };
    return this._refs;
  }
};

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

function safeTex(url, { repeat = [2, 2] } = {}) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(
    url,
    (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.anisotropy = 4;
      t.colorSpace = THREE.SRGBColorSpace;
    },
    undefined,
    () => {}
  );
  return tex;
}

function matWithTex(texUrl, fallbackColor, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: fallbackColor,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0.0,
  });
  try {
    const tex = safeTex(texUrl, opts.tex || {});
    m.map = tex;
    m.color.set(0xffffff);
    m.needsUpdate = true;
  } catch {}
  return m;
}

function addBoxCollider(ctx, mesh) {
  ctx.collidersAABB = ctx.collidersAABB || [];
  const box = new THREE.Box3().setFromObject(mesh);
  ctx.collidersAABB.push(box);
}

export const World = {
  build(scene, rig, ctx) {
    // --- WORLD SETTINGS ---
    scene.background = new THREE.Color(0x04060a);

    ctx.rooms = {
      lobby: { pos: new THREE.Vector3(0, 0, 0), size: 26 },
      poker: { pos: new THREE.Vector3(0, 0, -34), size: 26 },
      store: { pos: new THREE.Vector3(34, 0, 0), size: 26 },
    };

    // SPAWNS (so you NEVER spawn in tables/walls)
    ctx.spawns = ctx.spawns || {};
    ctx.spawns.lobby = { x: 0, z: 10 };
    ctx.spawns.poker = { x: 0, z: -24 };
    ctx.spawns.store = { x: 34, z: 10 };

    // --- LIGHTING ---
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.1);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(18, 22, 10);
    sun.castShadow = true;
    scene.add(sun);

    const lobbyGlow = new THREE.PointLight(0x66ccff, 0.65, 55);
    lobbyGlow.position.set(0, 3.2, 0);
    scene.add(lobbyGlow);

    const pokerWarm = new THREE.PointLight(0xffcc88, 0.7, 55);
    pokerWarm.position.set(0, 3.2, -34);
    scene.add(pokerWarm);

    const storeCool = new THREE.PointLight(0x88bbff, 0.7, 55);
    storeCool.position.set(34, 3.2, 0);
    scene.add(storeCool);

    // --- MATERIALS (textures are optional / fallback safe) ---
    const TEX = "assets/textures/";
    const mCarpet = matWithTex(`${TEX}lobby_carpet.jpg`, 0x2a0d15, {
      roughness: 0.95,
      tex: { repeat: [4, 4] },
    });
    const mBrick = matWithTex(`${TEX}brickwall.jpg`, 0x20242d, {
      roughness: 0.92,
      tex: { repeat: [2, 1] },
    });
    const mCeil = matWithTex(`${TEX}ceiling_dome_main.jpg`, 0x0b0c10, {
      roughness: 0.95,
      tex: { repeat: [1, 1] },
    });
    const mFloorPoker = matWithTex(`${TEX}Marblegold floors.jpg`, 0x444444, {
      roughness: 0.85,
      tex: { repeat: [2, 2] },
    });
    const mStoreFloor = matWithTex(`${TEX}rosewood_veneer1_4k.jpg`, 0x3b2a1e, {
      roughness: 0.86,
      tex: { repeat: [2, 2] },
    });

    // Prevent z-fighting (your “blinking floor”)
    mCarpet.polygonOffset = true;
    mCarpet.polygonOffsetFactor = -1;
    mCarpet.polygonOffsetUnits = -1;

    // --- BUILD ONE ROOM HELPER ---
    const makeRoom = (name, center, size, floorMat) => {
      const half = size / 2;
      const wallH = 5.2;
      const thick = 0.5;

      const group = new THREE.Group();
      group.name = `room_${name}`;
      group.position.copy(center);
      scene.add(group);

      // Floor
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      floor.name = `floor_${name}`;
      floor.position.y = 0;
      group.add(floor);

      // Walls
      const wallMat = mBrick.clone();
      const mkWall = (w, h, d, x, y, z) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
        addBoxCollider(ctx, wall);
        return wall;
      };

      mkWall(size, wallH, thick, 0, wallH / 2, -half); // back
      mkWall(size, wallH, thick, 0, wallH / 2, +half); // front
      mkWall(thick, wallH, size, -half, wallH / 2, 0); // left
      mkWall(thick, wallH, size, +half, wallH / 2, 0); // right

      // Ceiling
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mCeil);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(0, wallH, 0);
      group.add(ceil);

      // Accent neon strip
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry(size - 2, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x44ccff })
      );
      neon.position.set(0, wallH - 0.35, -half + 0.6);
      group.add(neon);

      const neon2 = neon.clone();
      neon2.position.set(0, wallH - 0.35, half - 0.6);
      group.add(neon2);

      // Return anchor
      ctx.roomAnchors = ctx.roomAnchors || {};
      ctx.roomAnchors[name] = {
        group,
        floor,
        center: group.getWorldPosition(new THREE.Vector3()),
        size,
      };

      return group;
    };

    // --- LOBBY ---
    const lobby = makeRoom("lobby", ctx.rooms.lobby.pos, ctx.rooms.lobby.size, mCarpet);

    // Lobby subtle grid above carpet (no blinking)
    const grid = new THREE.GridHelper(26, 26, 0x553344, 0x221018);
    grid.position.set(0, 0.03, 0);
    lobby.add(grid);

    // Logo wall (back wall)
    const logoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 4),
      matWithTex(`${TEX}brand_logo.jpg`, 0xffffff, { roughness: 0.6 })
    );
    logoPlane.position.set(0, 2.8, -ctx.rooms.lobby.size / 2 + 0.3);
    lobby.add(logoPlane);

    // --- POKER ROOM ---
    makeRoom("poker", ctx.rooms.poker.pos, ctx.rooms.poker.size, mFloorPoker);

    // --- STORE ROOM ---
    makeRoom("store", ctx.rooms.store.pos, ctx.rooms.store.size, mStoreFloor);

    // --- Global collider for “ground”
    ctx.floorPlanes = ctx.floorPlanes || [];
    ctx.floorPlanes.push(ctx.roomAnchors.lobby.floor);
    ctx.floorPlanes.push(ctx.roomAnchors.poker.floor);
    ctx.floorPlanes.push(ctx.roomAnchors.store.floor);

    // NOTE: We are NOT moving rig here. main.js already spawns you.
    return ctx.roomAnchors;
  },
};

export default World;

// /js/bots.js — Scarlett Bots v3.0 (LOW POLY ONE-MESH + SHIRT TEXTURE + SEATED)
// ✅ One merged low-poly mesh per bot (single draw call)
// ✅ Shirt texture on body/arms (repeating pattern)
// ✅ Head uses skin color (via small atlas region)
// ✅ Seats bots correctly on SeatAnchor world position (no floating)
// ✅ Simple "hands on table" baked pose
// ✅ Safe fallback if texture missing

import * as THREE from "three";
import { BufferGeometryUtils } from "three/addons/utils/BufferGeometryUtils.js";

export const Bots = (() => {
  let scene, getSeats, tableFocus, metrics;

  const B = {
    bots: [],
    WALKERS: 0,
    _atlasTex: null,
    _atlasMat: null,
    _atlasReady: false,
  };

  // ---------- TEXTURE / ATLAS ----------
  // We build a 1024x512 atlas:
  // Left  (0..0.25 U)  = solid "skin" area (white, then vertex colors tint it)
  // Right (0.25..1 U)  = shirt diffuse image stretched to fit
  function buildAtlasMaterial({ shirtUrl, skinColor = 0xd2b48c } = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // base fill
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // left skin zone (white — vertexColor will tint)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 512);

    // right zone placeholder
    ctx.fillStyle = "#2a2f3a";
    ctx.fillRect(256, 0, 768, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;

    // Load shirt image into right side when ready
    const loader = new THREE.TextureLoader();
    loader.load(
      shirtUrl,
      (shirtTex) => {
        // draw shirtTex image into right side
        try {
          const img = shirtTex.image;
          // clear right region
          ctx.clearRect(256, 0, 768, 512);
          // draw the shirt diffuse into right region
          ctx.drawImage(img, 256, 0, 768, 512);

          tex.needsUpdate = true;
          B._atlasReady = true;
        } catch (e) {
          console.warn("[bots] atlas draw failed:", e);
        }
      },
      undefined,
      (err) => {
        console.warn("[bots] shirt texture load failed:", err);
      }
    );

    // Vertex colors ON so head can be tinted skin while body stays dark
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      vertexColors: true,
      roughness: 0.75,
      metalness: 0.12,
      emissive: 0x001018,
      emissiveIntensity: 0.10,
    });

    B._atlasTex = tex;
    B._atlasMat = mat;
    return mat;
  }

  // ---------- UV HELPERS ----------
  // Remap geometry UVs into atlas region:
  // uRange = [u0,u1] inside atlas, vRange=[v0,v1]
  function remapUV(geo, u0, u1, v0, v1) {
    const uv = geo.attributes.uv;
    if (!uv) return geo;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
    }
    uv.needsUpdate = true;
    return geo;
  }

  function applyVertexColor(geo, hex) {
    const c = new THREE.Color(hex);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  // ---------- LOW POLY BOT (ONE MERGED MESH) ----------
  // We bake a seated pose directly into geometry.
  function makeLowPolyBotMesh({ suitColor = 0x141923, skinColor = 0xd2b48c } = {}) {
    const parts = [];

    // Atlas regions:
    // Skin area: U 0.00..0.25
    // Shirt area: U 0.25..1.00
    const SKIN_U0 = 0.00, SKIN_U1 = 0.25;
    const SHIRT_U0 = 0.25, SHIRT_U1 = 1.00;

    // --- TORSO (boxy low poly) ---
    {
      const torso = new THREE.BoxGeometry(0.42, 0.55, 0.24, 1, 1, 1);
      // Seated: lower torso
      torso.translate(0, 0.78, 0.02);
      remapUV(torso, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(torso, suitColor);
      parts.push(torso);
    }

    // --- PELVIS ---
    {
      const pelvis = new THREE.BoxGeometry(0.34, 0.18, 0.20, 1, 1, 1);
      pelvis.translate(0, 0.52, 0.05);
      remapUV(pelvis, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(pelvis, suitColor);
      parts.push(pelvis);
    }

    // --- HEAD (low poly) ---
    {
      const head = new THREE.SphereGeometry(0.13, 10, 8);
      head.translate(0, 1.16, 0.04);
      // head samples SKIN region of atlas
      remapUV(head, SKIN_U0, SKIN_U1, 0.0, 1.0);
      applyVertexColor(head, skinColor);
      parts.push(head);
    }

    // --- ARMS (low poly cylinders), baked "hands on table" pose ---
    {
      const armGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 8, 1, true);

      // Left arm
      const aL = armGeo.clone();
      // rotate forward/down
      aL.rotateX(Math.PI * 0.55);
      aL.rotateZ(Math.PI * 0.08);
      aL.translate(-0.26, 0.80, -0.12);
      remapUV(aL, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(aL, suitColor);
      parts.push(aL);

      // Right arm
      const aR = armGeo.clone();
      aR.rotateX(Math.PI * 0.55);
      aR.rotateZ(-Math.PI * 0.08);
      aR.translate(0.26, 0.80, -0.12);
      remapUV(aR, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(aR, suitColor);
      parts.push(aR);
    }

    // --- LEGS (bent) ---
    {
      const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.48, 8, 1, true);

      const lL = legGeo.clone();
      lL.rotateX(Math.PI * 0.42);
      lL.translate(-0.11, 0.30, 0.14);
      remapUV(lL, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(lL, suitColor);
      parts.push(lL);

      const lR = legGeo.clone();
      lR.rotateX(Math.PI * 0.42);
      lR.translate(0.11, 0.30, 0.14);
      remapUV(lR, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(lR, suitColor);
      parts.push(lR);
    }

    // --- SHOES (simple boxes) ---
    {
      const shoe = new THREE.BoxGeometry(0.14, 0.06, 0.26, 1, 1, 1);

      const sL = shoe.clone();
      sL.translate(-0.11, 0.06, 0.28);
      remapUV(sL, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(sL, suitColor);
      parts.push(sL);

      const sR = shoe.clone();
      sR.translate(0.11, 0.06, 0.28);
      remapUV(sR, SHIRT_U0, SHIRT_U1, 0.0, 1.0);
      applyVertexColor(sR, suitColor);
      parts.push(sR);
    }

    const merged = BufferGeometryUtils.mergeGeometries(parts, false);
    merged.computeVertexNormals();

    const bot = new THREE.Mesh(merged, B._atlasMat || new THREE.MeshStandardMaterial({ color: 0x141923 }));
    bot.frustumCulled = true;
    bot.userData = { mode: "seated", seatIndex: 0 };
    return bot;
  }

  // ---------- SEATING ----------
  function sitBot(bot, seatIndex) {
    const seats = getSeats?.() || [];
    const s = seats[seatIndex];
    if (!s?.anchor) return;

    const anchorPos = new THREE.Vector3();
    s.anchor.getWorldPosition(anchorPos);

    bot.position.copy(anchorPos);
    bot.rotation.set(0, s.yaw, 0);

    // push a touch away from table to avoid clipping
    const toTable = new THREE.Vector3().subVectors(tableFocus, bot.position);
    toTable.y = 0;
    toTable.normalize();
    bot.position.addScaledVector(toTable, -0.10);

    // lower a hair so butt meets seat
    bot.position.y -= (metrics?.seatDrop ?? 0.06);

    bot.userData.mode = "seated";
    bot.userData.seatIndex = seatIndex;
  }

  // ---------- API ----------
  function init({ THREE: _THREE, scene: _scene, getSeats: _getSeats, tableFocus: _tableFocus, metrics: _metrics } = {}) {
    // note: THREE is imported at top; _THREE passed from world is okay but not required here
    scene = _scene;
    getSeats = _getSeats;
    tableFocus = _tableFocus || new THREE.Vector3(0, 0, -6.5);
    metrics = _metrics || { seatDrop: 0.06 };

    // cleanup
    for (const b of B.bots) {
      try { scene.remove(b); } catch {}
    }
    B.bots = [];

    // build atlas material once
    if (!B._atlasMat) {
      buildAtlasMaterial({
        shirtUrl: "./assets/textures/shirt_diffuse.png",
      });
    }

    // create 6 seated bots (seat indexes 1..6 from your world.js)
    for (let i = 0; i < 6; i++) {
      const bot = makeLowPolyBotMesh();
      bot.name = "Bot_" + (i + 1);

      // match your player scale (tweak if needed)
      bot.scale.setScalar(0.95);

      scene.add(bot);
      B.bots.push(bot);

      sitBot(bot, i + 1);
    }
  }

  function setPlayerRig(_playerRig, _camera) {
    // reserved for future (look-at player, etc.)
  }

  function update(dt) {
    // stable seated bots only for now
    // later: tiny idle head bob / look-at can be done by a small shader or separate head bone
  }

  return { init, update, setPlayerRig };
})();

// /js/vr_ui.js — Scarlett VR Poker (VR UI v2.0)
// Fix: missing avatar textures no longer spam errors.
// Uses canvas fallback textures if assets are missing.

const seenMissing = new Set();

function ui(m){
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
}

function onceMissing(path){
  if (seenMissing.has(path)) return;
  seenMissing.add(path);
  ui(`[ui] missing texture: ${path}`);
}

function makeFallbackTexture(THREE, label){
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#0b0d14";
  g.fillRect(0,0,c.width,c.height);
  g.fillStyle = "#7fe7ff";
  g.font = "bold 18px system-ui, sans-serif";
  g.fillText("SCARLETT VR", 56, 120);
  g.fillStyle = "#ff2d7a";
  g.fillText(label, 96, 150);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

async function tryLoadTexture(THREE, url, label){
  const loader = new THREE.TextureLoader();
  return await new Promise((resolve) => {
    loader.load(
      url,
      (t) => resolve(t),
      undefined,
      () => {
        onceMissing(url);
        resolve(makeFallbackTexture(THREE, label));
      }
    );
  });
}

export async function initVRUI(ctx){
  const { THREE, scene } = ctx;
  if (!THREE || !scene) return;

  if (scene.userData.__vruiMounted) return;
  scene.userData.__vruiMounted = true;

  const base = "assets/textures/avatars/";
  const handsTex = await tryLoadTexture(THREE, base + "Hands.jpg", "Hands");
  const watchTex = await tryLoadTexture(THREE, base + "Watch.jpg", "Watch");
  const menuTex  = await tryLoadTexture(THREE, base + "Menu hand.jpg", "Menu");

  const planeGeo = new THREE.PlaneGeometry(0.18, 0.18);
  function addPlane(tex, x, y, z){
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent:true, opacity: 0.95 });
    const p = new THREE.Mesh(planeGeo, m);
    p.position.set(x,y,z);
    scene.add(p);
    return p;
  }

  const handsPlane = addPlane(handsTex, -0.35, 1.45, 1.2);
  const watchPlane = addPlane(watchTex,  0.35, 1.45, 1.2);
  const menuPlane  = addPlane(menuTex,   0.00, 1.65, 1.1);

  const start = performance.now();
  const tick = () => {
    const t = (performance.now() - start) * 0.001;
    handsPlane.position.y = 1.45 + Math.sin(t * 1.7) * 0.02;
    watchPlane.position.y = 1.45 + Math.sin(t * 1.7 + 1.2) * 0.02;
    menuPlane.position.y  = 1.65 + Math.sin(t * 1.3 + 2.1) * 0.015;
    menuPlane.rotation.z  = Math.sin(t * 0.8) * 0.08;
  };

  if (ctx.world && typeof ctx.world.update === "function") {
    const prev = ctx.world.update;
    ctx.world.update = (dt) => { try { prev(dt); } catch {} try { tick(); } catch {} };
  } else {
    scene.userData.__vruiTick = tick;
  }

  return { handsPlane, watchPlane, menuPlane };
}

// /js/chip_physicality.js — ChipPhysicalityModule v1.0 (FULL)
// ✅ Low-poly physical chips (size/color by value)
// ✅ Casino-ish edge stripes + value label sprite (optional)
// ✅ No external deps beyond THREE
//
// Usage:
//   import { ChipPhysicality } from "./chip_physicality.js";
//   const chip = ChipPhysicality.create(1000); scene.add(chip);

export const ChipPhysicality = (() => {
  function colorFor(value) {
    if (value >= 1000) return 0xffd700;      // Gold (Whale)
    if (value >= 500)  return 0x111111;      // Black
    if (value >= 100)  return 0xff2d2d;      // Red
    if (value >= 25)   return 0x2d7bff;      // Blue
    if (value >= 5)    return 0x00d17a;      // Green
    return 0xffffff;                         // White
  }

  function scaleFor(value) {
    if (value >= 1000) return 1.35;
    if (value >= 500)  return 1.18;
    if (value >= 100)  return 1.08;
    return 1.0;
  }

  function makeValueSprite(THREE, text) {
    // tiny canvas label (kept simple + cheap)
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);

    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(0, 0, c.width, c.height);

    g.strokeStyle = "rgba(0,255,255,0.55)";
    g.lineWidth = 6;
    g.strokeRect(6, 6, c.width - 12, c.height - 12);

    g.fillStyle = "#e8ecff";
    g.font = "bold 54px monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(0.20, 0.10, 1);
    sp.position.set(0, 0.055, 0);
    sp.renderOrder = 9999;
    sp.material.depthTest = false;
    return sp;
  }

  function createChip(THREE, value) {
    const s = scaleFor(value);
    const col = colorFor(value);

    const group = new THREE.Group();
    group.name = "Chip";
    group.userData.type = "chip";
    group.userData.value = value;
    group.userData.grabbable = true;

    // low-poly cylinder
    const geo = new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.012 * s, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      flatShading: true,
      metalness: 0.35,
      roughness: 0.35
    });
    const body = new THREE.Mesh(geo, mat);
    body.castShadow = false;
    body.receiveShadow = false;
    group.add(body);

    // edge stripes
    const stripeGeo = new THREE.TorusGeometry(0.0395 * s, 0.0016 * s, 6, 22);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.2,
      roughness: 0.4
    });

    const topStripe = new THREE.Mesh(stripeGeo, stripeMat);
    topStripe.rotation.x = Math.PI / 2;
    topStripe.position.y = 0.0066 * s;
    group.add(topStripe);

    const botStripe = new THREE.Mesh(stripeGeo, stripeMat);
    botStripe.rotation.x = Math.PI / 2;
    botStripe.position.y = -0.0066 * s;
    group.add(botStripe);

    // value label (optional but nice for debugging)
    const label = makeValueSprite(THREE, String(value));
    group.add(label);

    // small random rotation so stacks look real
    group.rotation.y = Math.random() * Math.PI * 2;

    return group;
  }

  return {
    create(value, THREE) {
      if (!THREE) throw new Error("ChipPhysicality.create requires THREE as 2nd arg or via module usage");
      return createChip(THREE, value);
    },

    // convenience for systems that pass ctx
    createFromCtx(ctx, value) {
      return createChip(ctx.THREE, value);
    }
  };
})();

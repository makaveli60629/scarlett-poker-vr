// /js/shop_ui.js — Scarlett VR Poker (Compat Shop UI)
// Fixes: Inventory.getChips is not a function
// Keeps: ShopUI export (object), provides init(ctx) safely.

function _getInventory(ctx){
  const inv =
    ctx?.Inventory ||
    ctx?.world?.Inventory ||
    ctx?.world?.inventory ||
    window.Inventory ||
    null;

  // If inventory exists but missing getChips, add it.
  if (inv && typeof inv.getChips !== "function") {
    inv.getChips = () => ([
      { denom: 1,   color: "white" },
      { denom: 5,   color: "red" },
      { denom: 25,  color: "green" },
      { denom: 100, color: "black" },
      { denom: 500, color: "purple" },
      { denom: 1000,color: "gold" },
    ]);
  }

  if (!inv) {
    return {
      getChips: () => ([
        { denom: 1,   color: "white" },
        { denom: 5,   color: "red" },
        { denom: 25,  color: "green" },
        { denom: 100, color: "black" },
        { denom: 500, color: "purple" },
        { denom: 1000,color: "gold" },
      ])
    };
  }

  return inv;
}

export const ShopUI = {
  init(ctx){
    const { THREE, scene } = ctx || {};
    const Inventory = _getInventory(ctx);

    // If you have a real UI system elsewhere, this will not interfere.
    // This is a minimal in-world kiosk label so you can confirm init() ran.

    // If THREE/scene not present, just no-op safely (still fixes Inventory crash)
    if (!THREE || !scene || typeof scene.add !== "function") return;

    if (scene.userData.__shop_ui_built) return;
    scene.userData.__shop_ui_built = true;

    const chips = Inventory.getChips();
    const labelText = `SHOP UI\nChips: ${chips.map(c=>c.denom).join(", ")}`;

    // Simple 3D sign (no fonts required)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const g = canvas.getContext("2d");
    g.fillStyle = "rgba(10,12,20,0.85)";
    g.fillRect(0,0,512,256);
    g.strokeStyle = "rgba(127,231,255,0.45)";
    g.lineWidth = 6;
    g.strokeRect(12,12,488,232);
    g.fillStyle = "rgba(232,236,255,0.95)";
    g.font = "bold 32px sans-serif";
    g.fillText("Scarlett Shop", 28, 60);
    g.font = "22px sans-serif";
    const lines = labelText.split("\n");
    let y = 110;
    for (const line of lines){
      g.fillText(line, 28, y);
      y += 34;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
    const geo = new THREE.PlaneGeometry(2.2, 1.1);
    const sign = new THREE.Mesh(geo, mat);
    sign.position.set(8, 1.6, -6);
    sign.rotation.y = -Math.PI * 0.15;
    sign.name = "shop_ui_sign";
    scene.add(sign);
  }
};

// /js/modules/tableArt.module.js
// Procedural table textures + cupholders + subtle glow (FULL)

export default {
  id: "tableArt.module.js",

  async init({ THREE, log }) {
    const table = window.SCARLETT?.table;
    if (!table?.group) {
      log?.("tableArt.module: table missing (waiting)");
      window.SCARLETT = window.SCARLETT || {};
      window.SCARLETT.tableArt = { ready: false };
      return;
    }

    const feltCanvas = document.createElement("canvas");
    feltCanvas.width = 512; feltCanvas.height = 512;
    const fctx = feltCanvas.getContext("2d");
    fctx.fillStyle = "#145a32";
    fctx.fillRect(0,0,512,512);
    for (let i = 0; i < 8000; i++) {
      const x = (Math.random() * 512) | 0;
      const y = (Math.random() * 512) | 0;
      const a = Math.random() * 0.12;
      fctx.fillStyle = `rgba(255,255,255,${a})`;
      fctx.fillRect(x,y,1,1);
    }
    const grad = fctx.createRadialGradient(256,256,40,256,256,260);
    grad.addColorStop(0, "rgba(0,0,0,0.00)");
    grad.addColorStop(1, "rgba(0,0,0,0.20)");
    fctx.fillStyle = grad;
    fctx.fillRect(0,0,512,512);

    const feltTex = new THREE.CanvasTexture(feltCanvas);
    feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
    feltTex.repeat.set(1.2, 1.2);

    const railCanvas = document.createElement("canvas");
    railCanvas.width = 512; railCanvas.height = 128;
    const rctx = railCanvas.getContext("2d");
    rctx.fillStyle = "#2a1a12";
    rctx.fillRect(0,0,512,128);
    rctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let x = 10; x < 512; x += 18) rctx.fillRect(x, 18, 6, 2);
    rctx.fillStyle = "rgba(0,0,0,0.25)";
    rctx.fillRect(0, 0, 512, 10);
    rctx.fillRect(0, 118, 512, 10);

    const railTex = new THREE.CanvasTexture(railCanvas);
    railTex.wrapS = railTex.wrapT = THREE.RepeatWrapping;
    railTex.repeat.set(2.5, 1);

    const felt = table.group.getObjectByName("TABLE_FELT");
    if (felt?.material) {
      felt.material.map = feltTex;
      felt.material.needsUpdate = true;
    }

    const rail = table.group.getObjectByName("TABLE_RAIL");
    if (rail?.material) {
      rail.material.map = railTex;
      rail.material.needsUpdate = true;
    }

    const holders = new THREE.Group();
    holders.name = "CUPHOLDERS";
    table.group.add(holders);

    const cupGeo = new THREE.TorusGeometry(0.07, 0.012, 10, 40);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const center = table.data.center;
    const rr = table.data.railRadius;

    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2 + 0.2;
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.rotation.x = Math.PI / 2;
      cup.position.set(center.x + Math.cos(t) * (rr + 0.16), center.y + 0.06, center.z + Math.sin(t) * (rr + 0.16));
      holders.add(cup);
    }

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.01, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.10 })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(center.x, center.y + 0.075, center.z);
    table.group.add(glow);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.tableArt = { ready: true };

    log?.("tableArt.module ✅ (procedural textures + cupholders)");
  },

  test() { return { ok: true, note: "table art module loaded" }; }
};

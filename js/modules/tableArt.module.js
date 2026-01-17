// /js/modules/tableArt.module.js
// Procedural felt/rail textures + accents (FULL)

export default {
  id: 'tableArt.module.js',

  async init({ THREE, log }) {
    const table = window.SCARLETT?.table;
    if (!table?.group) {
      log?.('tableArt.module: table missing');
      return;
    }

    const group = table.group;

    // Felt
    const feltCanvas = document.createElement('canvas');
    feltCanvas.width = 1024; feltCanvas.height = 1024;
    const f = feltCanvas.getContext('2d');
    f.fillStyle = '#125b34';
    f.fillRect(0,0,1024,1024);

    // diagonal weave
    f.globalAlpha = 0.10;
    f.strokeStyle = '#0b3a22';
    f.lineWidth = 2;
    for (let i = -1024; i < 2048; i += 14) {
      f.beginPath();
      f.moveTo(i, 0);
      f.lineTo(i + 1024, 1024);
      f.stroke();
    }
    f.globalAlpha = 1.0;

    // noise speckle
    for (let i = 0; i < 26000; i++) {
      const x = (Math.random() * 1024) | 0;
      const y = (Math.random() * 1024) | 0;
      const a = Math.random() * 0.10;
      f.fillStyle = `rgba(255,255,255,${a})`;
      f.fillRect(x,y,1,1);
    }

    // vignette
    const vg = f.createRadialGradient(512,512,80,512,512,520);
    vg.addColorStop(0, 'rgba(0,0,0,0.00)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    f.fillStyle = vg;
    f.fillRect(0,0,1024,1024);

    const feltTex = new THREE.CanvasTexture(feltCanvas);
    feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
    feltTex.repeat.set(1.0,1.0);
    feltTex.anisotropy = 4;

    // Rail
    const railCanvas = document.createElement('canvas');
    railCanvas.width = 1024; railCanvas.height = 256;
    const r = railCanvas.getContext('2d');
    r.fillStyle = '#24160f';
    r.fillRect(0,0,1024,256);

    // grain
    for (let i = 0; i < 14000; i++) {
      const x = (Math.random() * 1024) | 0;
      const y = (Math.random() * 256) | 0;
      const a = Math.random() * 0.12;
      r.fillStyle = `rgba(0,0,0,${a})`;
      r.fillRect(x,y,2,1);
    }

    // stitching
    r.globalAlpha = 0.45;
    r.fillStyle = '#f2d27a';
    for (let x = 10; x < 1024; x += 20) r.fillRect(x, 40, 8, 3);
    for (let x = 20; x < 1024; x += 20) r.fillRect(x, 210, 8, 3);
    r.globalAlpha = 1.0;

    const railTex = new THREE.CanvasTexture(railCanvas);
    railTex.wrapS = railTex.wrapT = THREE.RepeatWrapping;
    railTex.repeat.set(2.2,1.0);
    railTex.anisotropy = 4;

    // apply
    const felt = group.getObjectByName('TABLE_FELT');
    if (felt?.material) {
      felt.material.map = feltTex;
      felt.material.needsUpdate = true;
    }

    const rail = group.getObjectByName('TABLE_RAIL');
    if (rail?.material) {
      rail.material.map = railTex;
      rail.material.needsUpdate = true;
    }

    const ring = group.getObjectByName('TABLE_BETRING');
    if (ring?.material) {
      ring.material.emissive = new THREE.Color(0x3a2a06);
      ring.material.emissiveIntensity = 0.45;
      ring.material.needsUpdate = true;
    }

    // subtle overhead point light
    const spot = new THREE.PointLight(0xfff2d0, 0.65, 10, 2.0);
    spot.position.set(table.data.center.x, table.data.center.y + 2.2, table.data.center.z);
    spot.name = 'TABLE_SPOTLIGHT';
    group.add(spot);

    log?.('tableArt.module ✅');
  },

  test() { return { ok: true, note: 'table art loaded' }; }
};

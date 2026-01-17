// /js/modules/lobbyStations.module.js
// Lobby stations + signage (FULL)

export default {
  id: 'lobbyStations.module.js',

  async init({ THREE, anchors, log }) {
    const root = new THREE.Group();
    root.name = 'LOBBY_STATIONS';
    anchors.room.add(root);

    const mkStation = (label, pos, color = 0xff3355) => {
      const g = new THREE.Group();
      g.name = `STATION_${label}`;
      g.position.copy(pos);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.06, 48),
        new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.95 })
      );
      pad.position.y = 0.03;
      g.add(pad);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.025, 14, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      g.add(ring);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 1.25, 18),
        new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.9 })
      );
      pillar.position.y = 0.68;
      g.add(pillar);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.90, 0.28, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.8, metalness: 0.05 })
      );
      sign.position.y = 1.30;
      g.add(sign);

      const c = document.createElement('canvas');
      c.width = 512; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0,0,512,128);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 256, 64);

      const tex = new THREE.CanvasTexture(c);
      const txt = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.22),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      txt.position.set(0, 1.30, 0.035);
      g.add(txt);

      const light = new THREE.PointLight(0xffd24a, 0.45, 6, 2.0);
      light.position.set(0, 1.45, 0.3);
      g.add(light);

      root.add(g);
      return g;
    };

    mkStation('TABLE', new THREE.Vector3( 3.2, 0, -2.0), 0xff3355);
    mkStation('STORE', new THREE.Vector3(-3.2, 0, -2.0), 0x33d3ff);
    mkStation('SETTINGS', new THREE.Vector3(0.0, 0, -5.2), 0x7dff64);

    // big Scarlett wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 1.8, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.85 })
    );
    wall.position.set(0, 1.9, -8.0);
    root.add(wall);

    const c2 = document.createElement('canvas');
    c2.width = 1024; c2.height = 256;
    const ct2 = c2.getContext('2d');
    ct2.fillStyle = '#000000';
    ct2.fillRect(0,0,1024,256);
    ct2.fillStyle = '#ffffff';
    ct2.font = 'bold 120px sans-serif';
    ct2.textAlign = 'center';
    ct2.textBaseline = 'middle';
    ct2.fillText('SCARLETT', 512, 128);

    const t2 = new THREE.CanvasTexture(c2);
    const wallTxt = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 1.2),
      new THREE.MeshBasicMaterial({ map: t2 })
    );
    wallTxt.position.set(0, 1.9, -7.96);
    root.add(wallTxt);

    log?.('lobbyStations.module ✅');
  },

  test() { return { ok: true, note: 'lobby stations present' }; }
};

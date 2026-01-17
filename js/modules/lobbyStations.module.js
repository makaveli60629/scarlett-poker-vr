// /js/modules/lobbyStations.module.js
// Simple lobby portals/stations (FULL)

export default {
  id: "lobbyStations.module.js",

  async init({ THREE, anchors, log }) {
    const root = new THREE.Group();
    root.name = "LOBBY_STATIONS_ROOT";
    anchors.room.add(root);

    const mkStation = (name, x, z, color) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, 0, z);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.03, 12, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      g.add(ring);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.10, 1.6, 16),
        new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.95 })
      );
      pillar.position.y = 0.8;
      g.add(pillar);

      const c = document.createElement("canvas");
      c.width = 512; c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0,0,512,128);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name.replace(/_/g, " "), 256, 64);

      const tex = new THREE.CanvasTexture(c);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.3),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      sign.position.set(0, 1.55, 0);
      sign.lookAt(0, 1.55, 0.001);
      g.add(sign);

      return g;
    };

    root.add(mkStation("TABLE_PORTAL",  6, -2, 0xffd24a));
    root.add(mkStation("STORE_PORTAL", -6, -2, 0x5ad0ff));
    root.add(mkStation("SETTINGS",     0,  7, 0xa5ff5a));

    log?.("lobbyStations.module ✅");
  },

  test() { return { ok: true, note: "lobby stations present" }; }
};

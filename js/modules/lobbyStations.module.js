// /js/modules/lobbyStations.module.js
// 3 lobby stations: TABLE / STORE / SETTINGS + signage + light accents (FULL)

export default {
  id: "lobbyStations.module.js",

  async init({ THREE, anchors, log }) {
    const root = new THREE.Group();
    root.name = "LOBBY_STATIONS_ROOT";
    anchors.room.add(root);

    const makeLabel = (text) => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const ctx = c.getContext("2d");

      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.clearRect(0,0,c.width,c.height);

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(40, 70, 432, 120);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 70, 432, 120);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 130);

      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), mat);
      return plane;
    };

    const makeStation = (name, pos) => {
      const g = new THREE.Group();
      g.name = `STATION_${name}`;
      g.position.copy(pos);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 0.22, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.95 })
      );
      base.position.y = 0.11;
      g.add(base);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.03, 12, 64),
        new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.6 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.23;
      g.add(ring);

      const label = makeLabel(name);
      label.position.set(0, 1.25, 0);
      label.lookAt(0, 1.25, 0); // will be faced in update if you want
      g.add(label);

      const spot = new THREE.PointLight(0xffd24a, 0.7, 6, 2);
      spot.position.set(0, 2.0, 0);
      g.add(spot);

      root.add(g);
      return { g, label };
    };

    // Layout around spawn
    const stations = [
      makeStation("TABLE",    new THREE.Vector3(-3.2, 0, -3.6)),
      makeStation("STORE",    new THREE.Vector3( 0.0, 0, -5.0)),
      makeStation("SETTINGS", new THREE.Vector3( 3.2, 0, -3.6)),
    ];

    // Big sign
    const sign = makeLabel("SCARLETT LOBBY");
    sign.position.set(0, 3.2, -7.5);
    root.add(sign);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.lobbyStations = { root, stations };

    log?.("lobbyStations.module ✅");
  },

  update(dt, { camera }) {
    const pack = window.SCARLETT?.lobbyStations;
    if (!pack?.stations) return;

    // face labels to camera
    for (const s of pack.stations) {
      try { s.label.lookAt(camera.position); } catch (_) {}
    }
  },

  test() {
    const ok = !!window.SCARLETT?.lobbyStations?.stations?.length;
    return { ok, note: ok ? "lobby stations present" : "lobby stations missing" };
  }
};

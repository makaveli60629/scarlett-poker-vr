// /js/scarlett1/world.js — Scarlett1 World v4.3 (teleport surfaces ready)

export class World {
  constructor({ THREE, renderer }) {
    this.THREE = THREE;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);

    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);
    this.camera.position.set(0, 1.6, 3);

    this.rig = new THREE.Group();
    this.rig.name = "PlayerRig";
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.teleportSurfaces = [];
  }

  async init() {
    const THREE = this.THREE;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 1.25);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(6, 10, 5);
    this.scene.add(hemi, dir);

    // Teleportable floor (big)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(18, 72),
      new THREE.MeshStandardMaterial({ color: 0x0b2a2a, roughness: 0.92, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "TeleportFloor";
    this.scene.add(floor);
    this.teleportSurfaces.push(floor);

    // Center ring marker
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.06, 16, 80),
      new THREE.MeshStandardMaterial({ color: 0x33ffcc, emissive: 0x006655, emissiveIntensity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    this.scene.add(ring);

    // Table placeholder
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.4, 64),
      new THREE.MeshStandardMaterial({ color: 0x552200, roughness: 0.85 })
    );
    table.position.set(0, 0.2, 0);
    table.name = "TablePlaceholder";
    this.scene.add(table);

    // Sign (CanvasTexture)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#001018";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#33ff66";
    ctx.font = "bold 40px monospace";
    ctx.fillText("SCARLETT WORLD OK", 40, 110);
    ctx.font = "24px monospace";
    ctx.fillStyle = "#9bbcff";
    ctx.fillText("Enter VR + Move + Teleport", 40, 165);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.3),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    sign.position.set(0, 1.8, -3.0);
    sign.lookAt(0, 1.6, 0);
    this.scene.add(sign);
  }

  tick(t, frame) {
    // keep camera aspect correct
    const w = innerWidth, h = innerHeight;
    const a = w / h;
    if (this.camera.aspect !== a) {
      this.camera.aspect = a;
      this.camera.updateProjectionMatrix();
    }
  }
}

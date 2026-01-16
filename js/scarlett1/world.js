// /js/scarlett1/world.js — FULL Minimal World (Always Visible)
// This is a verified baseline. Once this renders, we plug your big Scarlett world back in.

export class World {
  constructor({ THREE, renderer }) {
    this.THREE = THREE;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);

    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
    this.camera.position.set(0, 1.6, 3);

    this.rig = new THREE.Group();
    this.rig.name = "PlayerRig";
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.t = 0;
  }

  async init() {
    const THREE = this.THREE;

    // Lights (bright enough)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x111111, 1.1);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 10, 5);
    this.scene.add(hemi, dir);

    // BIG BLUE FLOOR (guaranteed visible)
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x2255ff, roughness: 0.8, metalness: 0.05 })
    );
    floor.position.set(0, -0.1, 0);
    this.scene.add(floor);

    // A visible “anchor” object in front
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 2.2, 18),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x003344, emissiveIntensity: 0.6 })
    );
    pillar.position.set(0, 1.1, -2.5);
    this.scene.add(pillar);

    // Simple text label using CanvasTexture (no sprites)
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#001018";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#33ff66";
    ctx.font = "bold 40px monospace";
    ctx.fillText("SCARLETT BASELINE OK", 28, 92);
    ctx.fillStyle = "#9bbcff";
    ctx.font = "24px monospace";
    ctx.fillText("Enter VR to test XR loop", 28, 150);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.4),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    sign.position.set(0, 1.8, -3.2);
    sign.lookAt(0, 1.6, 0);
    this.scene.add(sign);

    return true;
  }

  tick(t, frame) {
    this.t = t;

    // Keep camera aspect correct
    const w = innerWidth, h = innerHeight;
    if (this.camera.aspect !== w / h) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }
        }

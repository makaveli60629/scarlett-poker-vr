// /js/scarlett1/modules/turn_ui_system.js
// In-world panel (CanvasTexture) showing current turn + basic debug.
// No Sprites. Quest-safe.

export class TurnUISystem {
  constructor({ THREE, scene, camera }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;

    this.group = new THREE.Group();
    this.group.name = "TurnUISystem";

    this.turnIndex = 0;
    this._timer = 0;

    this.canvas = null;
    this.ctx = null;
    this.tex = null;
    this.plane = null;
  }

  async init({ world }) {
    this.scene.add(this.group);

    // CanvasTexture
    this.canvas = document.createElement("canvas");
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext("2d");

    this.tex = new this.THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = this.THREE.SRGBColorSpace;

    const mat = new this.THREE.MeshBasicMaterial({ map: this.tex, transparent: false });
    this.plane = new this.THREE.Mesh(new this.THREE.PlaneGeometry(2.6, 1.3), mat);

    // Place near “status wall” area if table exists
    const table = world?.poker?.table;
    const p = table?.anchors?.statusPanel || new this.THREE.Vector3(0, 1.7, -6.5);
    this.plane.position.copy(p);
    this.plane.rotation.y = 0;

    this.group.add(this.plane);

    world.poker = world.poker || {};
    world.poker.turnUI = this;
  }

  setTurn(i, seatsCount) {
    this.turnIndex = ((i % seatsCount) + seatsCount) % seatsCount;
    this._draw();
  }

  update({ dt, world }) {
    const table = world?.poker?.table;
    const seats = table?.anchors?.seats?.length || 8;

    // Demo: advance turn every 6 seconds
    this._timer += dt;
    if (this._timer > 6) {
      this._timer = 0;
      this.turnIndex = (this.turnIndex + 1) % seats;
      this._draw(world);
    }
  }

  _draw(world) {
    const ctx = this.ctx;
    if (!ctx) return;

    // background
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, 512, 256);

    // header
    ctx.fillStyle = "#33ff66";
    ctx.font = "bold 34px monospace";
    ctx.fillText("SCARLETT TABLE STATUS", 22, 52);

    // turn
    ctx.fillStyle = "#55aaff";
    ctx.font = "bold 44px monospace";
    ctx.fillText(`TURN: ${this.turnIndex + 1}`, 22, 120);

    // info
    const xr = !!world?.renderer?.xr?.getSession?.();
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px monospace";
    ctx.fillText(`XR: ${xr ? "YES" : "NO"}`, 22, 170);

    ctx.fillStyle = "#ff2bd6";
    ctx.font = "22px monospace";
    ctx.fillText("Pinch deck to deal • Pinch chips to grab", 22, 220);

    this.tex.needsUpdate = true;
  }
}

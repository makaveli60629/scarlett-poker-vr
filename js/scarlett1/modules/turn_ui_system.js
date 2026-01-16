// /js/scarlett1/modules/turn_ui_system.js — Update 4.2 (FULL)
// In-world status panel using CanvasTexture (Quest-safe, no Sprites).
// ✅ Shows TURN
// ✅ Tracks activeSeat (your seat) from SeatingSystem
// ✅ Auto-syncs HandBoxes + BetZones every time turn changes

export class TurnUISystem {
  constructor({ THREE, scene, camera }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;

    this.group = new THREE.Group();
    this.group.name = "TurnUISystem";

    this.turnIndex = 0;
    this.activeSeat = null;

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
    this.canvas.width = 768;
    this.canvas.height = 384;
    this.ctx = this.canvas.getContext("2d");

    this.tex = new this.THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = this.THREE.SRGBColorSpace;

    const mat = new this.THREE.MeshBasicMaterial({ map: this.tex });
    this.plane = new this.THREE.Mesh(new this.THREE.PlaneGeometry(3.2, 1.6), mat);

    // Place near “status wall” if table exists
    const table = world?.poker?.table;
    const p = table?.anchors?.statusPanel || new this.THREE.Vector3(0, 1.7, -6.5);
    this.plane.position.copy(p);

    // Face toward center (approx)
    this.plane.lookAt(0, 1.6, 0);

    this.group.add(this.plane);

    // expose
    world.poker = world.poker || {};
    world.poker.turnUI = this;

    // initial draw
    this._draw(world);
  }

  setTurn(i, seatsCount = 8, world = null) {
    const n = Math.max(1, seatsCount | 0);
    this.turnIndex = ((i % n) + n) % n;

    // sync other systems
    if (world?.poker?.handBoxes?.setTurn) world.poker.handBoxes.setTurn(this.turnIndex);
    if (world?.poker?.betZones?.setHotZone) world.poker.betZones.setHotZone(this.turnIndex);

    this._draw(world);
  }

  setActiveSeat(seatIndexOrNull, world = null) {
    this.activeSeat = (seatIndexOrNull === null || seatIndexOrNull === undefined) ? null : seatIndexOrNull;
    this._draw(world);
  }

  update({ dt, world }) {
    const table = world?.poker?.table;
    const seats = table?.anchors?.seats?.length || 8;

    // Demo: advance turn every 6 seconds (until you replace with real hand logic)
    this._timer += dt;
    if (this._timer > 6) {
      this._timer = 0;
      this.setTurn(this.turnIndex + 1, seats, world);
    }
  }

  _draw(world) {
    const ctx = this.ctx;
    if (!ctx) return;

    const xr = !!world?.renderer?.xr?.getSession?.();
    const seated = !!world?.poker?.seating?.isSeated;
    const mySeat = world?.poker?.seating?.seatIndex ?? this.activeSeat;

    // bg
    ctx.fillStyle = "#061018";
    ctx.fillRect(0, 0, 768, 384);

    // header glow bar
    ctx.fillStyle = "#33ff66";
    ctx.fillRect(18, 18, 732, 8);

    // title
    ctx.fillStyle = "#33ff66";
    ctx.font = "bold 40px monospace";
    ctx.fillText("SCARLETT TABLE STATUS", 22, 66);

    // turn
    ctx.fillStyle = "#55aaff";
    ctx.font = "bold 64px monospace";
    ctx.fillText(`TURN: ${this.turnIndex + 1}`, 22, 150);

    // my seat
    ctx.fillStyle = "#ff2bd6";
    ctx.font = "bold 42px monospace";
    if (mySeat === null || mySeat === undefined) {
      ctx.fillText(`SEAT: -`, 22, 210);
    } else {
      ctx.fillText(`SEAT: ${mySeat + 1}`, 22, 210);
    }

    // status line
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px monospace";
    ctx.fillText(`XR: ${xr ? "YES" : "NO"}   SEATED: ${seated ? "YES" : "NO"}`, 22, 262);

    // instructions
    ctx.fillStyle = "#9bbcff";
    ctx.font = "24px monospace";
    ctx.fillText("Pinch to teleport • Pinch deck to deal • Pinch chips to grab", 22, 318);

    ctx.fillStyle = "#33ff66";
    ctx.fillText("Pinch a seat pad to sit • Pinch again to stand", 22, 350);

    this.tex.needsUpdate = true;
  }
}

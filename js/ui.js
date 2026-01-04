import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

// SAFE STATE FALLBACK (so ui.js won't crash if state.js isn't loaded yet)
const SafeState = (() => {
  const s = (window.__NOVA_STATE ||= { playerName: "Ron", rank: 7, money: 10000 });
  return {
    get playerName() { return s.playerName ?? "Ron"; },
    get rank() { return s.rank ?? 7; },
    get money() { return s.money ?? 10000; }
  };
})();

export const UI = {
  scene: null,
  playerGroup: null,

  board: null,
  boardCanvas: null,
  boardCtx: null,
  boardTex: null,

  watch: null,
  watchCanvas: null,
  watchCtx: null,
  watchTex: null,

  init(scene, playerGroup) {
    this.scene = scene;
    this.playerGroup = playerGroup;

    // Leaderboard
    this.boardCanvas = document.createElement('canvas');
    this.boardCanvas.width = 1024;
    this.boardCanvas.height = 512;
    this.boardCtx = this.boardCanvas.getContext('2d');
    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTex.colorSpace = THREE.SRGBColorSpace;

    this.board = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 3.25),
      new THREE.MeshBasicMaterial({ map: this.boardTex, transparent: true, opacity: 0.95 })
    );
    this.board.position.set(0, 3.5, 46);
    this.board.rotation.y = Math.PI;
    scene.add(this.board);

    // Watch
    this.watchCanvas = document.createElement('canvas');
    this.watchCanvas.width = 512;
    this.watchCanvas.height = 512;
    this.watchCtx = this.watchCanvas.getContext('2d');
    this.watchTex = new THREE.CanvasTexture(this.watchCanvas);
    this.watchTex.colorSpace = THREE.SRGBColorSpace;

    this.watch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.18),
      new THREE.MeshBasicMaterial({ map: this.watchTex, transparent: true, opacity: 0.95 })
    );
    this.watch.position.set(-0.22, 1.3, -0.35);
    playerGroup.add(this.watch);

    this.redrawAll();
  },

  nowString() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  },

  redrawLeaderboard() {
    const ctx = this.boardCtx;
    ctx.clearRect(0, 0, 1024, 512);

    ctx.fillStyle = 'rgba(0, 20, 40, 0.70)';
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = 'rgba(0, 255, 200, 0.85)';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 984, 472);

    ctx.fillStyle = 'rgba(0,255,200,0.95)';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('LEADERBOARD', 50, 95);

    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(`Name: ${SafeState.playerName}`, 60, 180);
    ctx.fillText(`Rank: #${SafeState.rank}`, 60, 250);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
    ctx.fillText(`Bank: $${Number(SafeState.money).toLocaleString()}`, 60, 320);

    ctx.fillStyle = 'rgba(140, 200, 255, 0.95)';
    ctx.fillText(`Time: ${this.nowString()}`, 60, 390);

    this.boardTex.needsUpdate = true;
  },

  redrawWatch() {
    const ctx = this.watchCtx;
    ctx.clearRect(0, 0, 512, 512);

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(0,255,200,0.85)';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 472, 472);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText(this.nowString(), 70, 190);

    ctx.fillStyle = 'rgba(255,215,0,0.95)';
    ctx.font = 'bold 62px sans-serif';
    ctx.fillText(`$${Number(SafeState.money).toLocaleString()}`, 60, 310);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '36px sans-serif';
    ctx.fillText(`Rank #${SafeState.rank}`, 60, 390);

    this.watchTex.needsUpdate = true;
  },

  redrawAll() {
    this.redrawLeaderboard();
    this.redrawWatch();
  },

  update() {
    const s = new Date().getSeconds();
    if (this._lastSec !== s) {
      this._lastSec = s;
      this.redrawAll();
    }
  }
};

import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

export const UI = {
  scene: null,
  playerGroup: null,

  money: 10000,
  rank: 7,
  playerName: "Ron",

  // leaderboard panel
  board: null,
  boardCanvas: null,
  boardCtx: null,
  boardTex: null,

  // watch
  watch: null,
  watchCanvas: null,
  watchCtx: null,
  watchTex: null,

  init(scene, playerGroup) {
    this.scene = scene;
    this.playerGroup = playerGroup;

    // === Leaderboard hologram ===
    this.boardCanvas = document.createElement('canvas');
    this.boardCanvas.width = 1024;
    this.boardCanvas.height = 512;
    this.boardCtx = this.boardCanvas.getContext('2d');

    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTex.colorSpace = THREE.SRGBColorSpace;

    const boardMat = new THREE.MeshBasicMaterial({
      map: this.boardTex,
      transparent: true,
      opacity: 0.95
    });

    this.board = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 3.25), boardMat);
    this.board.position.set(0, 3.5, 46); // lobby back wall-ish
    this.board.rotation.y = Math.PI;     // face toward main area
    this.scene.add(this.board);

    // === Watch ===
    this.watchCanvas = document.createElement('canvas');
    this.watchCanvas.width = 512;
    this.watchCanvas.height = 512;
    this.watchCtx = this.watchCanvas.getContext('2d');

    this.watchTex = new THREE.CanvasTexture(this.watchCanvas);
    this.watchTex.colorSpace = THREE.SRGBColorSpace;

    const watchMat = new THREE.MeshBasicMaterial({
      map: this.watchTex,
      transparent: true,
      opacity: 0.95
    });

    this.watch = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), watchMat);
    // Attach near player (we’ll later attach to left wrist joint when we add joint binding)
    this.watch.position.set(-0.22, 1.3, -0.35);
    this.playerGroup.add(this.watch);

    this.redrawAll();
  },

  nowString() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },

  redrawLeaderboard() {
    const ctx = this.boardCtx;
    ctx.clearRect(0, 0, 1024, 512);

    // Background
    ctx.fillStyle = 'rgba(0, 20, 40, 0.70)';
    ctx.fillRect(0, 0, 1024, 512);

    // Frame glow
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 984, 472);

    // Title
    ctx.fillStyle = 'rgba(0,255,200,0.95)';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('LEADERBOARD', 50, 95);

    // Data
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(`Name: ${this.playerName}`, 60, 180);
    ctx.fillText(`Rank: #${this.rank}`, 60, 250);

    // Money glow color
    ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
    ctx.fillText(`Bank: $${this.money.toLocaleString()}`, 60, 320);

    // Time glow
    ctx.fillStyle = 'rgba(140, 200, 255, 0.95)';
    ctx.fillText(`Time: ${this.nowString()}`, 60, 390);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Tip: Teleport to pads • Store coming next', 60, 460);

    this.boardTex.needsUpdate = true;
  },

  redrawWatch() {
    const ctx = this.watchCtx;
    ctx.clearRect(0, 0, 512, 512);

    // round-ish background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(0,255,200,0.85)';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, 472, 472);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(this.nowString(), 60, 170);

    ctx.fillStyle = 'rgba(255,215,0,0.95)';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(`$${this.money.toLocaleString()}`, 60, 290);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '36px sans-serif';
    ctx.fillText(`Rank #${this.rank}`, 60, 380);

    this.watchTex.needsUpdate = true;
  },

  redrawAll() {
    this.redrawLeaderboard();
    this.redrawWatch();
  },

  update() {
    // Update time once per second
    const s = new Date().getSeconds();
    if (this._lastSec !== s) {
      this._lastSec = s;
      this.redrawAll();
    }
  }
};

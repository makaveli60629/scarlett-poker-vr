import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { State } from './state.js';

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
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
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
    ctx.fillText(`Name: ${State.playerName}`, 60, 180);
    ctx.fillText(`Rank: #${State.rank}`, 60, 250);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
    ctx.fillText(`Bank: $${State.money.toLocaleString()}`, 60, 320);

    ctx.fillStyle = 'rgba(140, 200, 255, 0.95)';
    ctx.fillText(`Time: ${this.nowString()}`, 60, 390);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Tip: Laser clicks kiosk • Hop-teleport to pads', 60, 460);

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
    ctx.font = 'bold 72px sans-serif';
    ctx.fillText(this.nowString(), 60, 170);

    ctx.fillStyle = 'rgba(255,215,0,0.95)';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(`$${State.money.toLocaleString()}`, 60, 290);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '36px sans-serif';
    ctx.fillText(`Rank #${State.rank}`, 60, 380);

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

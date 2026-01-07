// /js/poker_simulation.js — Scarlett Poker VR — Poker Visuals v2 (Cards + Chips Visible)
// GitHub-safe

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const PokerSimulation = {
  scene: null,
  world: null,

  deck: [],
  community: [],
  cardMeshes: [],
  chipStacks: [],

  init({ scene, world }) {
    this.scene = scene;
    this.world = world;

    this._resetDeck();
    this._buildCommunityCards();
    this._buildChipPot();

    // Deal 5 community cards visible immediately (for testing)
    this.dealCommunity(5);
  },

  _resetDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const deck = [];
    for (const s of suits) for (const r of ranks) deck.push({ s, r });
    this.deck = this._shuffle(deck);
  },

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  _buildCommunityCards() {
    // Create 5 card tiles placed on table
    const anchor = this.world?.anchors?.cardRow || new THREE.Vector3(0, 1.11, -0.35);
    const y = anchor.y;

    const cardW = 0.16;
    const cardH = 0.22;
    const gap = 0.03;

    for (let i = 0; i < 5; i++) {
      const card = this._makeCardMesh("??");
      card.position.set(anchor.x + (i - 2) * (cardW + gap), y, anchor.z);
      card.rotation.x = -Math.PI / 2;
      this.scene.add(card);
      this.cardMeshes.push(card);
    }
  },

  _buildChipPot() {
    const anchor = this.world?.anchors?.chipArea || new THREE.Vector3(0, 1.10, 0.55);

    const colors = [0xff2bd6, 0x2bd7ff, 0x00ffaa, 0xffd27a];
    for (let s = 0; s < 4; s++) {
      const stack = new THREE.Group();
      const chipCount = 8;

      for (let i = 0; i < chipCount; i++) {
        const chip = this._makeChip(colors[s]);
        chip.position.y = i * 0.012;
        stack.add(chip);
      }

      stack.position.set(anchor.x + (s - 1.5) * 0.10, anchor.y, anchor.z);
      this.scene.add(stack);
      this.chipStacks.push(stack);
    }
  },

  _makeChip(color) {
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 0.01, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.12
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI / 2;
    return m;
  },

  _makeCardMesh(text) {
    // Safe: CanvasTexture with simple text
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#111";
    ctx.font = "bold 78px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 });
    const geo = new THREE.PlaneGeometry(0.16, 0.22);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData._canvas = canvas;
    mesh.userData._ctx = ctx;
    mesh.userData._tex = tex;
    return mesh;
  },

  _setCardText(mesh, t) {
    const ctx = mesh.userData._ctx;
    const canvas = mesh.userData._canvas;
    const tex = mesh.userData._tex;
    if (!ctx || !canvas || !tex) return;

    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = "#111";
    ctx.font = "bold 78px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, canvas.width / 2, canvas.height / 2);

    tex.needsUpdate = true;
  },

  dealCommunity(n = 5) {
    this.community.length = 0;
    for (let i = 0; i < n; i++) {
      const c = this.deck.pop();
      this.community.push(c);
    }

    for (let i = 0; i < this.cardMeshes.length; i++) {
      const c = this.community[i];
      const label = c ? `${c.r}${c.s}` : "—";
      this._setCardText(this.cardMeshes[i], label);
    }
  },

  update(dt) {
    // Later: animate dealing, pot growth, etc.
  }
};

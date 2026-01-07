// /js/store.js — Scarlett Poker VR — Store v1 (Kiosk + Camera Panel)
// Input: Android/desktop click/tap on overlay buttons (safe). VR raycast later.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { AvatarItems } from "./avatar_items.js";

export const Store = {
  scene: null,
  camera: null,
  overlay: null,
  state: null,

  kiosk: null,
  open: false,

  init({ scene, camera, overlay }) {
    this.scene = scene;
    this.camera = camera;
    this.overlay = overlay;

    this.state = AvatarItems.loadState();
    this._buildKiosk();
    this._buildHtmlPanel();

    this._log(`Store ready. Chips: ${this.state.chips}`);
  },

  _buildKiosk() {
    // Place the kiosk near the "store" pad area (right side)
    this.kiosk = new THREE.Group();
    this.kiosk.position.set(12.0, 0, 2.6);
    this.kiosk.name = "StoreKiosk";

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.9 })
    );
    base.position.y = 0.06;
    this.kiosk.add(base);

    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.10, 1.1, 18),
      new THREE.MeshStandardMaterial({ color: 0x131824, roughness: 0.6, metalness: 0.2 })
    );
    stand.position.y = 0.65;
    this.kiosk.add(stand);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.42, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d12,
        roughness: 0.85,
        emissive: 0x2bd7ff,
        emissiveIntensity: 0.35
      })
    );
    sign.position.set(0, 1.35, 0);
    this.kiosk.add(sign);

    const glow = new THREE.PointLight(0x2bd7ff, 0.55, 10);
    glow.position.set(0, 1.3, 0.6);
    this.kiosk.add(glow);

    this.scene.add(this.kiosk);

    // Small “try-on” pedestals
    const colors = [0xff2bd6, 0x2bd7ff, 0x00ffaa, 0xffd27a];
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.08, 20),
        new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.85 })
      );
      p.position.set(-0.6 + i * 0.4, 0.10, 0.7);
      this.kiosk.add(p);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.10, 18, 18),
        new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.6 })
      );
      orb.position.set(-0.6 + i * 0.4, 0.28, 0.7);
      this.kiosk.add(orb);
    }
  },

  _buildHtmlPanel() {
    // Build a simple clickable/tappable HTML panel (mobile-safe)
    const panel = document.createElement("div");
    panel.id = "storePanel";
    panel.style.position = "fixed";
    panel.style.right = "10px";
    panel.style.bottom = "10px";
    panel.style.width = "320px";
    panel.style.maxWidth = "92vw";
    panel.style.background = "rgba(0,0,0,0.75)";
    panel.style.border = "1px solid rgba(0,255,120,0.25)";
    panel.style.color = "#00ff66";
    panel.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    panel.style.fontSize = "12px";
    panel.style.padding = "10px";
    panel.style.borderRadius = "10px";
    panel.style.display = "none";
    panel.style.zIndex = "99999";
    panel.style.userSelect = "none";

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div><b>STORE</b> — Chips: <span id="chipsCount">${this.state.chips}</span></div>
        <button id="storeClose" style="background:#111;color:#00ff66;border:1px solid #00ff6640;border-radius:8px;padding:4px 8px;">Close</button>
      </div>
      <div style="margin-top:8px;opacity:0.9">Tap an item to buy/equip.</div>
      <div id="storeList" style="margin-top:10px;display:grid;grid-template-columns:1fr;gap:6px;"></div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <button id="storeOpenBtn" style="display:none"></button>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector("#storeClose").onclick = () => this.toggle(false);

    this._panel = panel;
    this._list = panel.querySelector("#storeList");
    this._chipsEl = panel.querySelector("#chipsCount");

    this._renderList();

    // Global hot area button (mobile)
    const openBtn = document.createElement("button");
    openBtn.textContent = "Store";
    openBtn.style.position = "fixed";
    openBtn.style.left = "10px";
    openBtn.style.bottom = "10px";
    openBtn.style.zIndex = "99999";
    openBtn.style.background = "#111";
    openBtn.style.color = "#00ff66";
    openBtn.style.border = "1px solid #00ff6640";
    openBtn.style.borderRadius = "10px";
    openBtn.style.padding = "10px 12px";
    openBtn.style.fontFamily = "ui-monospace, Menlo, Consolas, monospace";
    openBtn.onclick = () => this.toggle(true);
    document.body.appendChild(openBtn);

    this._openBtn = openBtn;
  },

  _renderList() {
    this._list.innerHTML = "";

    for (const item of AvatarItems.catalog) {
      const owned = !!this.state.owned?.[item.id];
      const equipped = this.state.equipped?.[item.type] === item.id;

      const row = document.createElement("button");
      row.style.textAlign = "left";
      row.style.background = "#0b0d12";
      row.style.border = "1px solid rgba(0,255,120,0.18)";
      row.style.borderRadius = "10px";
      row.style.padding = "8px";
      row.style.color = "#00ff66";
      row.style.cursor = "pointer";

      const right = equipped ? " (EQUIPPED)" : owned ? " (OWNED)" : ` — ${item.price} chips`;
      row.innerHTML = `<b>${item.name}</b> <span style="opacity:0.9">${right}</span><div style="opacity:0.75">${item.type}</div>`;

      row.onclick = () => {
        if (!owned) {
          const r = AvatarItems.buy(this.state, item.id);
          this._log(r.msg);
        } else {
          const r = AvatarItems.equip(this.state, item.id);
          this._log(r.msg);
        }
        this._chipsEl.textContent = String(this.state.chips);
        this._renderList();
        this.onProfileChanged?.(this.state);
      };

      this._list.appendChild(row);
    }
  },

  toggle(forceOpen = null) {
    this.open = forceOpen === null ? !this.open : !!forceOpen;
    this._panel.style.display = this.open ? "block" : "none";
    this._log(`Store: ${this.open ? "OPEN" : "CLOSED"}`);
  },

  _log(msg) {
    console.log("[Store]", msg);
    // also put a short ping in overlay if it exists
    if (this.overlay) {
      const t = this.overlay.textContent || "";
      const lines = (t + "\n" + "🛍️ " + msg).split("\n").slice(-18);
      this.overlay.textContent = lines.join("\n");
    }
  }
};

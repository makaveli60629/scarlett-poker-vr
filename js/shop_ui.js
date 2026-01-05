// js/shop_ui.js — Patch 6.4
// Simple Shop UI overlay (DOM). Toggle via Input.menuPressed() or key 'M'.

import { Inventory } from "./inventory.js";

export const ShopUI = {
  open: false,
  el: null,
  onEquip: null,
  onToast: null,

  items: [
    { id: "hat_black", type: "hat", name: "Black Hat", price: 0, desc: "Starter item." },
    { id: "glasses_neon", type: "glasses", name: "Neon Glasses", price: 2500, desc: "Glow style." },
    { id: "shirt_nova", type: "shirt", name: "Team Nova Shirt", price: 3500, desc: "Classic." },
    { id: "crown_fx", type: "fx", name: "Crown FX", price: 6000, desc: "Winner aura." }
  ],

  init({ onEquip, onToast } = {}) {
    this.onEquip = onEquip || null;
    this.onToast = onToast || null;

    this.el = document.createElement("div");
    this.el.id = "shop-ui";
    this.el.style.position = "fixed";
    this.el.style.right = "16px";
    this.el.style.bottom = "16px";
    this.el.style.width = "340px";
    this.el.style.maxWidth = "92vw";
    this.el.style.background = "rgba(10,12,18,0.88)";
    this.el.style.border = "2px solid rgba(0,255,170,0.55)";
    this.el.style.borderRadius = "16px";
    this.el.style.padding = "12px";
    this.el.style.color = "white";
    this.el.style.fontFamily = "system-ui, Arial";
    this.el.style.zIndex = "99998";
    this.el.style.display = "none";
    this.el.style.backdropFilter = "blur(8px)";
    document.body.appendChild(this.el);

    this.render();
  },

  toggle() {
    this.open = !this.open;
    if (this.el) this.el.style.display = this.open ? "block" : "none";
    if (this.open) this.render();
  },

  close() {
    this.open = false;
    if (this.el) this.el.style.display = "none";
  },

  render() {
    if (!this.el) return;

    const chips = Inventory.getChips();
    const eq = Inventory.equipped();

    const row = (label, value) =>
      `<div style="display:flex;justify-content:space-between;opacity:0.9;margin-top:4px">
        <div>${label}</div><div style="font-weight:700">${value}</div>
      </div>`;

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:900;font-size:18px;letter-spacing:0.3px">STORE — COSMETICS</div>
        <button id="shop-close" style="background:rgba(255,60,120,0.85);border:0;color:white;border-radius:10px;padding:6px 10px;font-weight:800;cursor:pointer">X</button>
      </div>
      ${row("Chips", chips.toLocaleString())}
      <div style="height:10px"></div>
      <div style="opacity:0.8;font-size:13px">Menu/M toggles • Grip = interact near kiosk (later)</div>
      <div style="height:10px;border-top:1px solid rgba(255,255,255,0.12)"></div>
      <div style="max-height:340px;overflow:auto;padding-right:6px;margin-top:10px">
    `;

    for (const it of this.items) {
      const owned = Inventory.owns(it.id) || it.price === 0;
      const equipped =
        (it.type === "hat" && eq.hat === it.id) ||
        (it.type === "glasses" && eq.glasses === it.id) ||
        (it.type === "shirt" && eq.shirt === it.id) ||
        (it.type === "fx" && eq.fx === it.id);

      const priceLabel = it.price === 0 ? "FREE" : `${it.price.toLocaleString()} chips`;
      const status = equipped ? "EQUIPPED" : owned ? "OWNED" : "LOCKED";

      const btnLabel = equipped ? "Unequip" : owned ? "Equip" : "Buy";
      const btnId = `btn_${it.id}`;

      html += `
        <div style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,0.14);border-radius:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:900">${it.name}</div>
            <div style="opacity:0.85;font-weight:800">${status}</div>
          </div>
          <div style="opacity:0.85;margin-top:4px;font-size:13px">${it.desc}</div>
          <div style="opacity:0.85;margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:800">${priceLabel}</div>
            <button id="${btnId}" style="background:rgba(0,255,170,0.85);border:0;color:black;border-radius:12px;padding:7px 12px;font-weight:900;cursor:pointer">
              ${btnLabel}
            </button>
          </div>
        </div>
      `;
    }

    html += `</div>`;

    this.el.innerHTML = html;

    const closeBtn = this.el.querySelector("#shop-close");
    if (closeBtn) closeBtn.onclick = () => this.close();

    for (const it of this.items) {
      const btn = this.el.querySelector(`#btn_${it.id}`);
      if (!btn) continue;

      btn.onclick = () => {
        const owned = Inventory.owns(it.id) || it.price === 0;
        const eq = Inventory.equipped();

        const equipped =
          (it.type === "hat" && eq.hat === it.id) ||
          (it.type === "glasses" && eq.glasses === it.id) ||
          (it.type === "shirt" && eq.shirt === it.id) ||
          (it.type === "fx" && eq.fx === it.id);

        if (!owned) {
          const ok = Inventory.spendChips(it.price);
          if (!ok) return this.onToast?.("Not enough chips.");
          Inventory.unlock(it.id);
          this.onToast?.(`Purchased: ${it.name}`);
        }

        // Equip / Unequip
        const slot = it.type;
        if (equipped) {
          Inventory.equip(slot, null);
          this.onToast?.(`Unequipped: ${it.name}`);
        } else {
          Inventory.equip(slot, it.id);
          this.onToast?.(`Equipped: ${it.name}`);
        }

        this.onEquip?.(Inventory.equipped());
        this.render();
      };
    }
  }
};

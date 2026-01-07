// /js/avatar_items.js — Avatar items catalog + state (localStorage)

export const AvatarItems = {
  key: "scarlett_vr_store_v1",

  ensureDefaults() {
    const s = this.loadState();
    if (!s || !s.version) this.saveState(this.defaultState());
  },

  defaultState() {
    const owned = [
      "shirt_nova",
      "face_basic",
      "hat_none",
      "glasses_none",
      "aura_none"
    ];
    return {
      version: 1,
      chips: 10000,
      owned,
      equipped: {
        shirt: "shirt_nova",
        face: "face_basic",
        hat: "hat_none",
        glasses: "glasses_none",
        aura: "aura_none",
      },
      ui: { cat: "Shirts" }
    };
  },

  loadState() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return this.defaultState();
      return JSON.parse(raw);
    } catch {
      return this.defaultState();
    }
  },

  saveState(state) {
    try { localStorage.setItem(this.key, JSON.stringify(state)); } catch {}
  },

  getAllItems() {
    return [
      // Shirts
      { id:"shirt_nova", name:"Team Nova Tee", category:"Shirts", slot:"shirt", price:0, data:{ color:0x00ffaa } },
      { id:"shirt_scarlett", name:"Scarlett Tee", category:"Shirts", slot:"shirt", price:250, data:{ color:0xff2bd6 } },
      { id:"shirt_royal", name:"Royal Black Tee", category:"Shirts", slot:"shirt", price:350, data:{ color:0x111111 } },

      // Hats
      { id:"hat_none", name:"No Hat", category:"Hats", slot:"hat", price:0, data:{ type:"none" } },
      { id:"hat_cap_black", name:"Black Cap", category:"Hats", slot:"hat", price:200, data:{ type:"cap", color:0x111111 } },
      { id:"hat_cap_gold", name:"Gold Cap", category:"Hats", slot:"hat", price:350, data:{ type:"cap", color:0xffd27a } },

      // Glasses
      { id:"glasses_none", name:"No Glasses", category:"Glasses", slot:"glasses", price:0, data:{ type:"none" } },
      { id:"glasses_basic", name:"Basic Glasses", category:"Glasses", slot:"glasses", price:250, data:{ type:"basic", color:0x111111 } },

      // Auras
      { id:"aura_none", name:"No Aura", category:"Auras", slot:"aura", price:0, data:{ type:"none" } },
      { id:"aura_green", name:"Neon Aura (Green)", category:"Auras", slot:"aura", price:500, data:{ type:"ring", color:0x00ffaa } },
      { id:"aura_pink", name:"Neon Aura (Pink)", category:"Auras", slot:"aura", price:500, data:{ type:"ring", color:0xff2bd6 } },

      // Faces
      { id:"face_basic", name:"Basic Face", category:"Faces", slot:"face", price:0, data:{ type:"basic" } },
      { id:"face_smile", name:"Smile Face", category:"Faces", slot:"face", price:200, data:{ type:"smile" } },

      // VIP placeholder
      { id:"vip_badge", name:"VIP Badge (placeholder)", category:"VIP", slot:"aura", price:1500, data:{ type:"ring", color:0xffd27a } },
    ];
  },

  getItem(id) {
    return this.getAllItems().find(i => i.id === id) || null;
  }
};

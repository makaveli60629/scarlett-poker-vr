// /js/avatar_items.js — Scarlett Poker VR — Avatar Items v1 (Catalog + Inventory + Equip)

export const AvatarItems = {
  catalog: [
    // Shirts (color skins for now)
    { id: "shirt_black",  name: "Black Tee",   type: "shirt",  price: 250,  data: { shirt: 0x111111 } },
    { id: "shirt_white",  name: "White Tee",   type: "shirt",  price: 250,  data: { shirt: 0xf3f3f3 } },
    { id: "shirt_red",    name: "Red Tee",     type: "shirt",  price: 300,  data: { shirt: 0xff2b2b } },
    { id: "shirt_pink",   name: "Pink Tee",    type: "shirt",  price: 350,  data: { shirt: 0xff2bd6 } },
    { id: "shirt_cyan",   name: "Cyan Tee",    type: "shirt",  price: 350,  data: { shirt: 0x2bd7ff } },
    { id: "shirt_neon",   name: "Neon Green",  type: "shirt",  price: 500,  data: { shirt: 0x00ffaa } },

    // Accessories (simple meshes attached to avatar for now)
    { id: "cap_black",    name: "Black Cap",   type: "hat",    price: 600,  data: { hat: "cap", color: 0x111111 } },
    { id: "cap_gold",     name: "Gold Cap",    type: "hat",    price: 900,  data: { hat: "cap", color: 0xffd27a } },
    { id: "glasses_dark", name: "Dark Glasses",type: "glasses",price: 750,  data: { glasses: "basic", color: 0x111111 } },

    // Title / aura (visual glow)
    { id: "aura_vip",     name: "VIP Aura",    type: "aura",   price: 1200, data: { aura: 0xff2bd6 } },
    { id: "aura_ice",     name: "Ice Aura",    type: "aura",   price: 1200, data: { aura: 0x2bd7ff } },
    { id: "aura_nova",    name: "Nova Aura",   type: "aura",   price: 2000, data: { aura: 0x00ffaa } },
  ],

  loadState() {
    // localStorage safe
    const raw = localStorage.getItem("scarlett_vr_profile_v1");
    if (!raw) {
      return {
        chips: 10000,          // you wanted 10,000 start
        owned: {},             // itemId -> true
        equipped: {},          // type -> itemId
      };
    }
    try { return JSON.parse(raw); } catch { return { chips: 10000, owned: {}, equipped: {} }; }
  },

  saveState(state) {
    try { localStorage.setItem("scarlett_vr_profile_v1", JSON.stringify(state)); } catch {}
  },

  getItem(id) {
    return this.catalog.find(x => x.id === id) || null;
  },

  buy(state, id) {
    const item = this.getItem(id);
    if (!item) return { ok:false, msg:"Item not found." };
    if (state.owned?.[id]) return { ok:false, msg:"Already owned." };
    if ((state.chips ?? 0) < item.price) return { ok:false, msg:"Not enough chips." };

    state.chips -= item.price;
    state.owned[id] = true;
    this.saveState(state);
    return { ok:true, msg:`Bought: ${item.name}` };
  },

  equip(state, id) {
    const item = this.getItem(id);
    if (!item) return { ok:false, msg:"Item not found." };
    if (!state.owned?.[id]) return { ok:false, msg:"You don't own it yet." };

    state.equipped[item.type] = id;
    this.saveState(state);
    return { ok:true, msg:`Equipped: ${item.name}` };
  },

  unequip(state, type) {
    if (!state.equipped) state.equipped = {};
    delete state.equipped[type];
    this.saveState(state);
    return { ok:true, msg:`Unequipped: ${type}` };
  }
};

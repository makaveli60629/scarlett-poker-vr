// /js/store_catalog.js — Scarlett VR Poker Store Catalog v1.0
// Standalone data module used by /js/store.js
// No dependencies. Safe for GitHub Pages.

export const StoreCatalog = {
  version: "1.0",
  currencyName: "Chips",

  categories: [
    {
      id: "chips",
      name: "Chip Skins",
      items: [
        { id: "chip_skin_classic_01", type: "chip_skin", name: "Classic Clay Set", price: 2500, rarity: "common" },
        { id: "chip_skin_neon_01", type: "chip_skin", name: "Neon Aqua Set", price: 10000, rarity: "rare" },
        { id: "chip_skin_neon_02", type: "chip_skin", name: "Neon Pink Set", price: 12000, rarity: "rare" },
        { id: "chip_skin_vip_01", type: "chip_skin", name: "VIP Gold Set", price: 50000, rarity: "epic" },
        { id: "chip_skin_event_01", type: "chip_skin", name: "Event Crown Set", price: 75000, rarity: "epic" }
      ]
    },

    {
      id: "cards",
      name: "Card Backs",
      items: [
        { id: "card_back_default", type: "card_back", name: "Scarlett Default Back", price: 0, rarity: "common" },
        { id: "card_back_neon_purple", type: "card_back", name: "Neon Purple Back", price: 8000, rarity: "rare" },
        { id: "card_back_cyan_grid", type: "card_back", name: "Cyan Grid Back", price: 9000, rarity: "rare" },
        { id: "card_back_hot_pink", type: "card_back", name: "Hot Pink Back", price: 9000, rarity: "rare" },
        { id: "card_back_vip_black_gold", type: "card_back", name: "VIP Black & Gold", price: 60000, rarity: "epic" }
      ]
    },

    {
      id: "vip",
      name: "VIP & Membership",
      items: [
        { id: "vip_week", type: "vip", name: "VIP (7 Days)", price: 25000, rarity: "rare" },
        { id: "vip_month", type: "vip", name: "VIP (30 Days)", price: 90000, rarity: "epic" }
      ]
    },

    {
      id: "cosmetics",
      name: "Cosmetics",
      items: [
        { id: "hands_gloves_black_pink", type: "hands", name: "Gloves: Black / Pink", price: 3500, rarity: "common" },
        { id: "hands_gloves_black_aqua", type: "hands", name: "Gloves: Black / Aqua", price: 3500, rarity: "common" },
        { id: "crown_cosmetic", type: "crown", name: "Crown (Cosmetic)", price: 120000, rarity: "legendary" }
      ]
    }
  ]
};

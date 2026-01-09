// /js/store_catalog.js — Scarlett VR Poker Store Catalog v1.0
// Safe, standalone data module.

export const StoreCatalog = {
  currencyName: "Chips",
  categories: [
    {
      id: "cards",
      name: "Card Skins",
      items: [
        { id: "cardback_pink",  name: "Hot Pink Back",   price: 2500, type: "card_back",  rarity: "common" },
        { id: "cardback_aqua",  name: "Aqua Back",       price: 2500, type: "card_back",  rarity: "common" },
        { id: "cardback_gold",  name: "Gold Back",       price: 12000, type: "card_back", rarity: "rare" },
        { id: "cardback_scorpion", name: "Scorpion Back", price: 18000, type: "card_back", rarity: "epic" },
      ]
    },
    {
      id: "chips",
      name: "Chip Skins",
      items: [
        { id: "chip_classic_set", name: "Classic Casino Set", price: 5000, type: "chip_skin", rarity: "common" },
        { id: "chip_neon_set",    name: "Neon High-Stakes Set", price: 15000, type: "chip_skin", rarity: "rare" },
        { id: "chip_founder",     name: "Founder Chrome Set", price: 50000, type: "chip_skin", rarity: "legendary" },
      ]
    },
    {
      id: "cosmetics",
      name: "Cosmetics",
      items: [
        { id: "glove_pink", name: "Pink Gloves", price: 4000, type: "hands", rarity: "common" },
        { id: "glove_aqua", name: "Aqua Gloves", price: 4000, type: "hands", rarity: "common" },
        { id: "crown_event", name: "Event Crown Aura", price: 25000, type: "aura", rarity: "epic" },
      ]
    },
    {
      id: "memberships",
      name: "Membership",
      items: [
        { id: "vip_monthly", name: "VIP Monthly", price: 75000, type: "membership", rarity: "vip" },
        { id: "vip_yearly",  name: "VIP Yearly",  price: 500000, type: "membership", rarity: "vip" },
      ]
    }
  ]
};

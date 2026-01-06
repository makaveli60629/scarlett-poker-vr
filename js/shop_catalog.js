// /js/shop_catalog.js — starter shop inventory (safe placeholder)
export const ShopCatalog = {
  currency: "chips",
  items: [
    // Shirts
    { id: "tee_scarlett_black", type: "shirt", name: "Scarlett Tee (Black)", price: 2500 },
    { id: "tee_scarlett_white", type: "shirt", name: "Scarlett Tee (White)", price: 2500 },
    { id: "tee_team_nova", type: "shirt", name: "Team Nova Tee", price: 3500 },
    { id: "hoodie_nova", type: "shirt", name: "Nova Hoodie", price: 6000 },

    // Face skins (temporary)
    { id: "face_classic", type: "face", name: "Classic Face", price: 0 },
    { id: "face_gold", type: "face", name: "Gold Face", price: 9000 },
    { id: "face_neon", type: "face", name: "Neon Face", price: 9000 },

    // Cosmetics
    { id: "gloves_black", type: "hands", name: "Black Gloves", price: 2000 },
    { id: "glasses_poker", type: "cosmetic", name: "Poker Shades", price: 4500 },

    // Table cosmetics (future)
    { id: "table_felt_red", type: "table", name: "Red Felt", price: 8000 },
    { id: "cards_gold", type: "cards", name: "Gold Cards", price: 12000 },
    { id: "chips_neon", type: "chips", name: "Neon Chip Set", price: 15000 },
  ],
};

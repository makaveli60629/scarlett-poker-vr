export const State = {
  version: "UPDATE-D-FOUNDATION",

  // Player + mode
  mode: "spectate", // "spectate" | "seated"
  seatedIndex: -1,

  // Locations (teleport anchors)
  anchors: {
    lobby: { x: 0, y: 0, z: 6 },
    store: { x: 16, y: 0, z: 6 },
    table: { x: 0, y: 0, z: 0 }
  },

  // Economy
  chips: 10000,
  eventChips: 0,
  membership: false,
  owned: new Set(),

  // Store inventory (temporary showroom)
  storeItems: [
    // Shirts / Hoodies
    { id:"shirt_black", name:"Black Tee", type:"cosmetic", price:2500 },
    { id:"shirt_white", name:"White Tee", type:"cosmetic", price:2500 },
    { id:"hoodie_red", name:"Red Hoodie", type:"cosmetic", price:5000 },
    { id:"hoodie_black", name:"Black Hoodie", type:"cosmetic", price:5000 },
    { id:"jacket_gold", name:"Gold Jacket", type:"cosmetic", price:10000 },

    // Glasses / Accessories
    { id:"shades_classic", name:"Classic Shades", type:"cosmetic", price:3000 },
    { id:"shades_neon", name:"Neon Shades", type:"cosmetic", price:4500 },
    { id:"chain_silver", name:"Silver Chain", type:"cosmetic", price:6500 },
    { id:"chain_gold", name:"Gold Chain", type:"cosmetic", price:9000 },
    { id:"watch_chrome", name:"Chrome Watch", type:"cosmetic", price:8000 },

    // Badges / Frames
    { id:"frame_red", name:"Red Name Frame", type:"frame", price:3000 },
    { id:"frame_gold", name:"Gold Name Frame", type:"frame", price:7000 },
    { id:"badge_weekly", name:"Weekly Badge", type:"badge", price:12000 },

    // Table cosmetics
    { id:"table_felt_red", name:"Red Felt Skin", type:"tableSkin", price:15000 },
    { id:"table_trim_gold", name:"Gold Trim Skin", type:"tableSkin", price:15000 },

    // Chip bundles
    { id:"chips_10k", name:"+10,000 chips", type:"chips", price:0, chips:10000 },
    { id:"chips_100k", name:"+100,000 chips", type:"chips", price:0, chips:100000 },
    { id:"chips_1m", name:"+1,000,000 chips", type:"chips", price:0, chips:1000000 },

    // Membership
    { id:"membership_25", name:"Membership ($25)", type:"membership", priceUSD:25 },

    // Event chip
    { id:"eventchip_5", name:"Event Chip ($5)", type:"eventChip", priceUSD:5 },

    // Extras (filler for showroom)
    ...Array.from({length:20}).map((_,i)=>({
      id:`cos_${i+1}`, name:`Cosmetic Item ${i+1}`, type:"cosmetic", price: 2000 + i*250
    }))
  ],

  // Feature flags (so we can grow safely without breaking)
  features: {
    teleportHalo: true,
    snapTurn45: true,
    solidColliders: true,
    showNameTagsSpectate: true,
    hideNameTagsAtTable: true,
    audioToggle: true,
    storeShowroom: true,
    leaderboard: true
  }
};

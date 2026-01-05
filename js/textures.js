// textures.js — Skylark Poker VR (6.2)
// MUST export: TextureBank + Textures (named exports)

import * as THREE from "three";

export const TextureBank = {
  loader: new THREE.TextureLoader(),
  cache: new Map(),

  url(file) {
    return encodeURI(`assets/textures/${file}`);
  },

  load(file, { repeat = 1, wrap = true } = {}) {
    if (!file) return null;

    const key = `${file}|${repeat}|${wrap}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const tex = this.loader.load(
      this.url(file),
      (t) => {
        if (wrap) {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeat, repeat);
        }
        t.anisotropy = 2;
        t.needsUpdate = true;
      },
      undefined,
      () => console.warn(`[TextureBank] Missing texture: ${file} → fallback color`)
    );

    this.cache.set(key, tex);
    return tex;
  },

  standard({
    mapFile = null,
    color = 0x777777,
    roughness = 0.9,
    metalness = 0.0,
    repeat = 1,
    emissive = 0x000000,
    emissiveMapFile = null,
    normalMapFile = null,
  } = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
    });

    if (mapFile) mat.map = this.load(mapFile, { repeat });

    if (emissiveMapFile) {
      mat.emissiveMap = this.load(emissiveMapFile, { repeat });
      mat.emissive = new THREE.Color(0xffffff);
    }

    if (normalMapFile) mat.normalMap = this.load(normalMapFile, { repeat });

    return mat;
  }
};

export const Textures = {
  WALL_BRICK: "brickwall.jpg",
  WALL_RUNES: "wall_stone_runes.jpg",
  FLOOR_LOBBY: "lobby_carpet.jpg",
  FLOOR_MARBLE: "Marblegold floors.jpg",
  CEILING_DOME: "ceiling_dome_main.jpg",
  TELEPORT_GLOW: "Teleport glow.jpg",

  TABLE_FELT: "table_felt_green.jpg",
  TABLE_TRIM: "Table leather trim.jpg",
  TABLE_ATLAS: "table_atlas.jpg",

  BRAND: "brand_logo.jpg",
  CASINO_ART: "casino_art.jpg",
  CASINO_ART_2: "Casinoart2.jpg",
  SCORPION_BRAND: "Scoripon room brand.jpg",

  CARD_BACK: "Card back.jpg",
  UI_WINNER: "ui_winner_hologram.jpg",
  WINNER: "Winner.jpg",
  DAILY: "dailyclaim.jpg",

  CHIP_1000: "chip_1000.jpg",
  CHIP_5000: "chip_5000.jpg",
  CHIP_10000: "chip_10000.jpg",

  CROWN: "Crown.jpg",

  SOFA_DIFF: "sofa_02_diff_4k.jpg",
  SOFA_ARM: "sofa_02_arm_4k.jpg",
  SOFA_NORM: "sofa_02_nor_gl_4k.jpg",
};

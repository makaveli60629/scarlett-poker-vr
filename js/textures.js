// /js/textures.js — Skylark Poker VR
// Centralized texture registry + safe loader
// GitHub Pages friendly (relative paths only)

import * as THREE from "./three.js";

const loader = new THREE.TextureLoader();

function load(file, repeatX = 1, repeatY = 1) {
  const tex = loader.load(`assets/textures/${file}`);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * TEXTURE REGISTRY
 * Use these names everywhere else
 */
export const Textures = {
  FLOOR_MARBLE: load("Marblegold floors.jpg", 4, 4),
  WALL_BRICK: load("brickwall.jpg", 6, 3),
  WALL_ART: load("casino_art.jpg", 2, 1),
  CEILING: load("ceiling_dome_main.jpg", 1, 1),

  TABLE_FELT: load("table_felt_green.jpg", 1, 1),
  TABLE_LEATHER: load("Table leather trim.jpg", 1, 1),

  CHIP_1000: load("chip_1000.jpg"),
  CHIP_5000: load("chip_5000.jpg"),
  CHIP_10000: load("chip_10000.jpg"),

  TELEPORT_GLOW: load("Teleport glow.jpg"),
  CROWN: load("Crown.jpg"),

  UI_WINNER: load("ui_winner_hologram.jpg"),
  BRAND_LOGO: load("brand_logo.jpg")
};

/**
 * MATERIAL FACTORY
 */
export const TextureBank = {
  standard(opts = {}) {
    return new THREE.MeshStandardMaterial({
      map: opts.map || null,
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 0.9,
      metalness: opts.metalness ?? 0.05,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0
    });
  }
};

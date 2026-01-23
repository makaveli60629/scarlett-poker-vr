import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * UPDATE 4.0 FULL LOADER (Repo-Aligned)
 * Card Faces Atlas + JSON + Back texture.
 * Felt texture uses your repo file: assets/textures/table_felt_green.jpg (fallback felt.png)
 */
export function initRepoAssets({ onProgress, onComplete }) {
  const loadingManager = new THREE.LoadingManager();

  loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    onProgress?.({ url, itemsLoaded, itemsTotal });
  };
  loadingManager.onLoad = () => onComplete?.();

  const textureLoader = new THREE.TextureLoader(loadingManager);
  const audioLoader = new THREE.AudioLoader(loadingManager);

  const assets = {
    // Cards (authoritative repo paths)
    cardFacesTex: textureLoader.load('assets/textures/cards/scarlett_card_faces_atlas_2048.png'),
    cardBackTex:  textureLoader.load('assets/textures/cards/scarlett_card_back_512x712.png'),
    cardAtlasJson: null,

    // Felt (try table_felt_green first, fallback felt.png)
    feltTex: null,

    // Chips (optional atlases; safe if missing)
    chipsTex: null,

    // Audio buffers (optional, safe if missing)
    audio: {}
  };

  assets.cardFacesTex.flipY = false;
  assets.cardBackTex.flipY = false;

  // Felt load with fallback
  assets.feltTex = textureLoader.load(
    'assets/textures/table_felt_green.jpg',
    undefined,
    undefined,
    () => { assets.feltTex = textureLoader.load('assets/textures/felt.png'); }
  );

  // Chips atlas (optional)
  assets.chipsTex = textureLoader.load('assets/textures/chips.png', undefined, undefined, () => { assets.chipsTex = null; });

  // Audio (optional)
  const soundFiles = [
    ['chipClack', 'assets/audio/chip_clack.mp3'],
    ['cardSlide', 'assets/audio/card_slide.mp3'],
    ['cardFlip',  'assets/audio/card_flip.mp3'],
    ['shoeDeal',  'assets/audio/shoe_deal.mp3'],
    ['ambient',   'assets/audio/ambient_casino.mp3'],
  ];
  soundFiles.forEach(([name, url]) => {
    audioLoader.load(url, (buffer) => { assets.audio[name] = buffer; }, undefined, () => {/* ignore missing */});
  });

  // Atlas JSON (critical). Not counted in LoadingManager.
  fetch('assets/textures/cards/scarlett_card_faces_atlas_2048.json')
    .then(r => r.json())
    .then(j => { assets.cardAtlasJson = j; })
    .catch(() => { assets.cardAtlasJson = null; });

  return { loadingManager, textureLoader, audioLoader, assets };
}

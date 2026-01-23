import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Spatial "Audio-Haptics" for hands-only play.
 * Safe if audio files are missing.
 */
export function initRepoAudio({ camera, scene, assets }) {
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const lib = {};
  function makePositional(name, vol=0.6) {
    const s = new THREE.PositionalAudio(listener);
    const buf = assets?.audio?.[name];
    if (buf) s.setBuffer(buf);
    s.setRefDistance(1);
    s.setRolloffFactor(2);
    s.setVolume(vol);
    scene.add(s);
    lib[name] = s;
  }
  ['chipClack','cardSlide','cardFlip','shoeDeal'].forEach(n => makePositional(n, 0.6));

  const ambient = new THREE.Audio(listener);
  if (assets?.audio?.ambient) {
    ambient.setBuffer(assets.audio.ambient);
    ambient.setLoop(true);
    ambient.setVolume(0.22);
  }
  camera.add(ambient);
  lib.ambient = ambient;

  function playAt(name, worldPos) {
    const s = lib[name];
    if (!s || !s.buffer) return;
    if (s.isPlaying) s.stop();
    if (worldPos) s.position.copy(worldPos);
    s.play();
  }
  function startAmbient() {
    if (lib.ambient?.buffer && !lib.ambient.isPlaying) lib.ambient.play();
  }
  return { playAt, startAmbient };
}

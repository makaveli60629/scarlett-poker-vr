// /js/scarlett1/boot.js — Scarlett 1.0 boot (base-path safe)
// Loads Three.js from CDN, then starts world.

const D = window.SCARLETT_DIAG || {
  log: console.log.bind(console),
  err: console.error.bind(console),
  setStatus: (s)=>console.log('[STATUS]', s)
};

D.setStatus('boot.js running…');
D.log('boot start ✅');

const THREE_URL = 'https://unpkg.com/three@0.158.0/build/three.module.js';

async function loadThree() {
  D.setStatus('Loading three.js…');
  try{
    const mod = await import(THREE_URL);
    D.log('three import ✅', THREE_URL);
    return mod;
  }catch(e){
    D.err('three import FAILED', e?.message || e);
    D.setStatus('three import failed');
    throw e;
  }
}

async function start() {
  const THREE = await loadThree();

  D.setStatus('Loading world.js…');

  // Base path (repo-safe)
  const path = location.pathname;
  const seg = path.split('/').filter(Boolean)[0];
  const base = seg ? `/${seg}/` : `/`;
  const worldUrl = `${base}js/scarlett1/world.js?v=${Date.now()}`;

  D.log('world url=', worldUrl);

  let worldMod;
  try{
    worldMod = await import(worldUrl);
    D.log('world import ✅');
  }catch(e){
    D.err('world import FAILED', e?.message || e);
    D.setStatus('world import failed');
    return;
  }

  if(!worldMod || typeof worldMod.initWorld !== 'function'){
    D.err('world.js missing export initWorld()');
    D.setStatus('world.js missing initWorld()');
    return;
  }

  D.setStatus('Starting world…');
  try{
    await worldMod.initWorld({ THREE, DIAG: D });
    D.setStatus('World running ✅');
  }catch(e){
    D.err('initWorld FAILED', e?.message || e);
    D.setStatus('World crashed');
  }
}

start();

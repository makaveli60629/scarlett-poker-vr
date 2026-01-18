// /js/modules/audio_system.js
// Audio system (Android + Quest safe). Uses local /assets/audio/*.wav with a fallback oscillator beep.
// NOTE: GitHub Pages serves these fine.

export function installAudioSystem({ dwrite }){
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = AC ? new AC() : null;

  const buffers = new Map();
  async function loadBuffer(name, url){
    if (!ctx) return null;
    try{
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      buffers.set(name, buf);
      return buf;
    }catch(err){
      dwrite?.(`[audio] failed ${name}: ${err?.message || err}`);
      return null;
    }
  }

  async function preload(){
    if (!ctx) return;
    await Promise.all([
      loadBuffer("chip","./assets/audio/chip.wav"),
      loadBuffer("card","./assets/audio/card.wav"),
      loadBuffer("teleport","./assets/audio/teleport.wav"),
      loadBuffer("ambience","./assets/audio/ambience.wav"),
    ]);
    dwrite?.("[audio] buffers ready");
  }

  function play(name, gain=0.5, loop=false){
    if (!ctx) return;
    const buf = buffers.get(name);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(ctx.destination);
    src.start();
    return src;
  }

  function beep(freq=440, ms=80, type="sine", gain=0.06){
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ try{o.stop();}catch(_){ } }, ms);
  }

  const cues = {
    teleport(){
      const s = play("teleport", 0.35, false);
      if (!s) beep(620, 70, "triangle", 0.05);
    },
    joinSeat(){
      const s = play("chip", 0.30, false);
      if (!s) beep(520, 90, "sine", 0.05);
    },
    standUp(){
      const s = play("chip", 0.22, false);
      if (!s) beep(330, 90, "sine", 0.05);
    },
    card(){
      const s = play("card", 0.25, false);
      if (!s) beep(980, 40, "square", 0.025);
    },
    chip(){
      const s = play("chip", 0.25, false);
      if (!s) beep(760, 45, "triangle", 0.03);
    },
    startAmbience(){
      // loop quiet
      const s = play("ambience", 0.08, true);
      if (!s) return null;
      return s;
    }
  };

  // Unlock on first gesture; then preload + start ambience
  let ambienceNode = null;
  const unlock = async ()=>{
    if (!ctx) return;
    try{ await ctx.resume(); }catch(_){}
    await preload();
    try{ ambienceNode = cues.startAmbience(); }catch(_){}
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once:true });
  window.addEventListener("touchstart", unlock, { once:true });

  dwrite?.("[audio] installed (local wav + fallback)");
  return { cues };
}

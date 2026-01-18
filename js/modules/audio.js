// Scarlett Audio Module — lightweight, Quest-safe
export function initAudio(dwrite){
  const state = { ctx: null };

  function ensure(){
    if (state.ctx) return state.ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { dwrite?.("[audio] WebAudio not available"); return null; }
    state.ctx = new AudioCtx();
    return state.ctx;
  }

  function tone(freq, dur, gain=0.03){
    const ctx = ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(()=>{});
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  window.__scarlettAudioPlay = (name)=>{
    if (window.SCARLETT?.audioOn === false) return;
    if (name === "click") tone(660, 0.05);
    else if (name === "teleport") tone(520, 0.04), setTimeout(()=>tone(740,0.04), 60);
    else if (name === "deal") { tone(520,0.04); setTimeout(()=>tone(740,0.04), 60); setTimeout(()=>tone(620,0.04), 120);} 
    else tone(440, 0.04);
  };

  dwrite?.("[audio] ready ✅");
}

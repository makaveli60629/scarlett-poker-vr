// /js/modules/audio_system.js
// Simple spatial-ish audio hooks (no external assets required). Uses oscillator beeps as placeholders.
// You can replace with real audio files later.
export function installAudioSystem({ dwrite }){
  const ctx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;

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

  // Public cues
  const cues = {
    teleport(){ beep(620, 70, "triangle", 0.05); },
    joinSeat(){ beep(520, 90, "sine", 0.05); },
    standUp(){ beep(330, 90, "sine", 0.05); },
    card(){ beep(980, 40, "square", 0.025); },
    chip(){ beep(760, 45, "triangle", 0.03); },
  };

  // Unlock on first gesture
  const unlock = async ()=>{
    if (!ctx) return;
    try{ await ctx.resume(); }catch(_){}
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once:true });
  window.addEventListener("touchstart", unlock, { once:true });

  dwrite?.("[audio] installed (placeholder beeps; swap with real files later)");
  return { cues };
}

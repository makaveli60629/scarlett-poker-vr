// Audio module (simple, safe, mobile-friendly)
// Provides: window.__scarlettAudioPlay(name), window.__scarlettAudioSetEnabled(bool)

export function initAudio(dwrite){
  let enabled = true;
  let ctx = null;

  function ensure(){
    if (!enabled) return null;
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { dwrite?.("[audio] AudioContext not available"); return null; }
    ctx = new AC();
    return ctx;
  }

  function blip(freq=440, dur=0.06, type="sine"){
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(c.destination);
    const t = c.currentTime;
    o.start(t);
    o.stop(t + dur);
  }

  window.__scarlettAudioSetEnabled = (v)=>{ enabled = !!v; if(!enabled && ctx){ try{ctx.suspend();}catch(_){ } } else if(enabled && ctx){ try{ctx.resume();}catch(_){ } } };
  window.__scarlettAudioPlay = (name)=>{
    if (!enabled) return;
    if (ctx && ctx.state === "suspended") { ctx.resume?.().catch(()=>{}); }
    if (name === "click") blip(520, 0.045, "square");
    else if (name === "deal") blip(880, 0.06, "triangle");
    else if (name === "chip") blip(330, 0.05, "sine");
    else blip(440, 0.05, "sine");
  };

  dwrite?.("[audio] module ready");
}

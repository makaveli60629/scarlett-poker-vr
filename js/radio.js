// js/radio.js
(function(){
  const D = window.SCARLETT_DIAG || { log: ()=>{} };

  // Public, generally accessible streams (may change over time)
  const STATIONS = [
    { name: "1Power (Hip-Hop/Rap)", url: "https://live.powerhitz.com/1power" },
    { name: "Hot 108 Jamz (Hip-Hop/Rap)", url: "https://live.powerhitz.com/hot108" },
    { name: "Real RnB", url: "https://live.powerhitz.com/realrnb" }
  ];

  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "none";
  audio.loop = false; // streams ignore loop anyway
  audio.volume = 0.65;

  let idx = 0;
  let muted = false;
  let started = false;

  function safePlay(){
    // Browsers require a user gesture; we call this after an interaction (watch button, HUD button, etc.)
    return audio.play().then(()=>{
      started = true;
      D.log(`[radio] playing: ${STATIONS[idx].name}`);
    }).catch((e)=>{
      D.log(`[radio] play blocked (user gesture required): ${e && e.message ? e.message : e}`);
    });
  }

  function loadStation(i){
    idx = (i + STATIONS.length) % STATIONS.length;
    audio.src = STATIONS[idx].url;
    D.log(`[radio] tuned: ${STATIONS[idx].name}`);
    if (started && !muted) safePlay();
  }

  function toggleMute(){
    muted = !muted;
    audio.muted = muted;
    D.log(`[radio] muted=${muted}`);
    return muted;
  }

  function next(){
    loadStation(idx + 1);
  }
  function prev(){
    loadStation(idx - 1);
  }

  function start(){
    if (!audio.src) loadStation(idx);
    if (muted) { muted = false; audio.muted = false; }
    return safePlay();
  }

  function setVolume(v){
    audio.volume = Math.max(0, Math.min(1, v));
  }

  // Autopause on VR exit / tab hide
  document.addEventListener("visibilitychange", ()=>{
    if (document.hidden) {
      try{ audio.pause(); }catch(e){}
    }
  });

  window.SCARLETT_RADIO = {
    stations: STATIONS,
    get index(){ return idx; },
    get muted(){ return muted; },
    get started(){ return started; },
    start, next, prev, toggleMute, setVolume,
    get current(){ return STATIONS[idx]; }
  };

  // Do not auto-play; wait for user gesture via wrist menu
  loadStation(0);
})();

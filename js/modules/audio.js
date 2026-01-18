export function initAudio(dwrite){
  let ctx=null;

  function ensure(){
    if(ctx) return ctx;
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A) return null;
    ctx=new A();
    return ctx;
  }

  window.__scarlettAudioPlay=function(){
    if(window.SCARLETT && window.SCARLETT.audioOn===false) return;
    const c=ensure();
    if(!c) return;
    const o=c.createOscillator();
    const g=c.createGain();
    o.frequency.value=600;
    g.gain.value=0.03;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime+0.05);
  };

  dwrite("[audio] ready");
}

export function initAudio(d){
let ctx=null;
window.__scarlettAudioPlay=function(){
if(!window.SCARLETT||!window.SCARLETT.audioOn)return;
if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx=new A();}
const o=ctx.createOscillator();const g=ctx.createGain();
o.frequency.value=500;g.gain.value=0.03;o.connect(g);g.connect(ctx.destination);
o.start();o.stop(ctx.currentTime+0.05);
};
d("[audio] ready");
}


const scene=document.querySelector('#scene');
const status=document.getElementById('status');
const diag=document.getElementById('diag');
const canvas=document.getElementById('tvCanvas');
const ctx=canvas.getContext('2d');

function log(t){diag.textContent+=t+"\\n";}
window.enterVR=()=>scene.enterVR();
window.toggleDiag=()=>diag.style.display=diag.style.display==='none'?'block':'none';

AFRAME.registerComponent('thumbstick-move',{
init(){
const rig=this.el;
this.tick=(t,dt)=>{
const gp=navigator.getGamepads()[0];
if(!gp)return;
rig.object3D.position.x+=gp.axes[0]*dt*0.002;
rig.object3D.position.z+=gp.axes[1]*dt*0.002;
}
}
});

let phase=0;
function drawTV(){
phase+=0.01;
ctx.fillStyle='#081018';
ctx.fillRect(0,0,1024,576);
ctx.fillStyle='#00d2ff';
ctx.font='48px sans-serif';
ctx.fillText('SCARLETT POKER TV',40,80);
ctx.fillStyle='#fff';
ctx.font='28px sans-serif';
ctx.fillText('LIVE DEMO - CHICAGO',40,130);
requestAnimationFrame(drawTV);
}
drawTV();

scene.addEventListener('loaded',()=>{
status.textContent='ready';
log('scene loaded');
});

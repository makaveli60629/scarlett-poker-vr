import*as THREE from'three';
export async function setupControls({scene,rig,camera,renderer,THREE,log}){
  const ctrls=[],last=[{},{}];
  const makeRay=()=>{const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);
    const l=new THREE.Line(g,new THREE.LineBasicMaterial());l.scale.z=6;return l};
  for(let i=0;i<2;i++){const c=renderer.xr.getController(i);scene.add(c);ctrls.push(c);
    const r=makeRay();c.add(r);
    c.addEventListener('connected',e=>{c.userData.gamepad=e.data.gamepad||null;log(`🎮 pad${i} connected`)});
    c.addEventListener('selectstart',()=>log(`🧪 pad${i} selectstart`));
    c.addEventListener('squeezestart',()=>log(`🧪 pad${i} squeeze`));
  }
  function tick(){for(let i=0;i<ctrls.length;i++){const gp=ctrls[i].userData.gamepad;if(!gp?.buttons)continue;
    for(let b=0;b<gp.buttons.length;b++){const p=!!gp.buttons[b].pressed;
      if(last[i][b]!==p){last[i][b]=p;log(`🧪 pad${i} b${b}=${p?'DOWN':'UP'}`)}}}}
  log('[controls] ready ✓');return{controllers:ctrls,tick};
}
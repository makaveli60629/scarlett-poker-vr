import*as THREE from'three';import{VRButton}from'three/addons/webxr/VRButton.js';
export async function start({modules,log}){
  log(`[XR] navigator.xr = ${!!navigator.xr}`);
  log(`[XR] secureContext = ${window.isSecureContext}`);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b0f14);
  const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,500);camera.position.set(0,1.6,3);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);document.body.appendChild(VRButton.createButton(renderer));
  log('[XR] VRButton injected ✅ (ENTER VR)');
  const rig=new THREE.Group();rig.add(camera);scene.add(rig);
  scene.add(new THREE.HemisphereLight(0xffffff,0x233044,1));
  const dl=new THREE.DirectionalLight(0xffffff,.55);dl.position.set(3,8,4);scene.add(dl);
  if(modules.world?.build){await modules.world.build({scene,rig,THREE,log})}
  let ctl=null;if(modules.controls?.setupControls){ctl=await modules.controls.setupControls({scene,rig,camera,renderer,THREE,log})}
  let tp=null;if(modules.teleport?.setupTeleport){tp=await modules.teleport.setupTeleport({scene,rig,camera,renderer,THREE,log,controls:ctl})}
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  renderer.setAnimationLoop(()=>{ctl?.tick?.();tp?.tick?.();renderer.render(scene,camera)});
  log('✅ XR LOOP RUNNING');
}
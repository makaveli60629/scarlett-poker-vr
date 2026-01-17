import*as THREE from'three';
export async function build({scene,rig,THREE,log}){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x1d2430}));
  floor.rotation.x=-Math.PI/2;floor.userData.isFloor=true;scene.add(floor);
  const grid=new THREE.GridHelper(30,30,0x2a3646,0x16202b);grid.position.y=.002;scene.add(grid);
  const table=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,.08,48),new THREE.MeshStandardMaterial({color:0x0e7c3a}));
  table.position.set(0,.95,-4.2);scene.add(table);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=2.2,x=Math.cos(a)*r,z=-4.2+Math.sin(a)*r;
    const s=new THREE.Mesh(new THREE.BoxGeometry(.45,.06,.45),new THREE.MeshStandardMaterial({color:0x6f6f6f}));
    s.position.set(x,.55,z);s.rotation.y=-a;scene.add(s)}
  rig.position.set(0,0,0);log('[world] default ready ✓');
}
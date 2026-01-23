import * as THREE from 'three';

export function buildWorld({ scene, player, camera, diag }){
  // Ground
  const groundGeo = new THREE.PlaneGeometry(200, 200, 10, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b2236, roughness: 1.0, metalness: 0.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = 0;
  ground.receiveShadow = false;
  scene.add(ground);

  // Simple room landmarks
  const grid = new THREE.GridHelper(50, 50, 0x3b4a7a, 0x223055);
  grid.position.y = 0.01;
  scene.add(grid);

  // Poker table mock
  const table = new THREE.Group();
  table.position.set(0, 0, 0);
  scene.add(table);

  const topGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.14, 48);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x0aa7a7, roughness: 0.85 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.85;
  table.add(top);

  const rimGeo = new THREE.TorusGeometry(1.62, 0.08, 16, 64);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.6 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI/2;
  rim.position.y = 0.93;
  table.add(rim);

  const legGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.85, 16);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.position.y = 0.425;
  table.add(leg);

  // A bright "spawn pad" so you can always see something
  const spawn = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x355cff, emissive: 0x112255, roughness: 0.6 })
  );
  spawn.rotation.x = -Math.PI/2;
  spawn.position.set(0, 0.02, 3);
  scene.add(spawn);

  // Scorpion room marker
  const scorpionMarker = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.4, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x5517ff, emissive: 0x220055, roughness: 0.65 })
  );
  scorpionMarker.position.set(18, 0.2, -10);
  scene.add(scorpionMarker);

  // "Cards" for demo deal
  const cards = [];
  function clearCards(){
    for (const c of cards) scene.remove(c);
    cards.length = 0;
  }

  function demoDeal(){
    clearCards();
    const cardGeo = new THREE.PlaneGeometry(0.18, 0.26);
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide });
    const centers = [
      new THREE.Vector3(-0.24, 0.95, 0.0),
      new THREE.Vector3(-0.12, 0.95, 0.0),
      new THREE.Vector3( 0.00, 0.95, 0.0),
      new THREE.Vector3( 0.12, 0.95, 0.0),
      new THREE.Vector3( 0.24, 0.95, 0.0),
    ];
    centers.forEach((p, i)=>{
      const card = new THREE.Mesh(cardGeo, cardMat.clone());
      card.material.color.setHex(0xffffff);
      card.position.copy(p);
      card.position.y = 0.96;
      card.rotation.x = -Math.PI/2;
      card.rotation.z = (i-2) * 0.08;
      scene.add(card);
      cards.push(card);
    });
    diag.log('[deal] demo community cards placed ✅');
    diag.open();
  }

  function gotoScorpion(){
    // Teleport player near marker
    player.position.set(16.5, 0, -6.5);
    // Face marker
    player.rotation.y = Math.atan2((scorpionMarker.position.x - player.position.x), (scorpionMarker.position.z - player.position.z));
    diag.log('[world] moved to Scorpion Room ✅');
  }

  function update(dt){
    // gentle pulsing on markers so scene never feels dead
    const t = performance.now() * 0.001;
    spawn.material.emissiveIntensity = 0.6 + Math.sin(t*2.0)*0.2;
    scorpionMarker.material.emissiveIntensity = 0.5 + Math.sin(t*3.0)*0.25;
  }

  return { update, demoDeal, gotoScorpion };
}

// SCARLETT • Bots (promo bodies)
// Quest-safe: simple meshes, no skinning.

export function spawnDemoBots(state) {
  const THREE = window.THREE;
  if (!THREE || !state?.scene) return;

  state.bots = state.bots || [];
  const root = new THREE.Group();
  root.name = 'botsRoot';
  state.scene.add(root);
  state.botsRoot = root;

  // Expect seat positions from table module
  const seats = state.tableSeats || [];
  const count = Math.max(5, Math.min(6, seats.length || 6));

  for (let i=0; i<count; i++) {
    const seat = seats[i] || { pos: new THREE.Vector3(0,0,0), look: new THREE.Vector3(0,0,0) };

    const bot = new THREE.Group();
    bot.name = `bot_${i}`;
    bot.position.copy(seat.pos);
    bot.position.y += 0.02;

    // Facing table
    if (seat.look) bot.lookAt(seat.look);

    // Body parts
    const mat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9, metalness: 0.05 });
    const mat2 = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1.0, metalness: 0.0 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.26, 6, 12), mat);
    torso.position.set(0, 0.48, 0);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mat);
    head.position.set(0, 0.67, 0.02);

    const hip = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.14), mat2);
    hip.position.set(0, 0.36, 0);

    const armGeo = new THREE.CapsuleGeometry(0.04, 0.22, 6, 10);
    const armL = new THREE.Mesh(armGeo, mat);
    const armR = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.18, 0.50, 0.02);
    armR.position.set( 0.18, 0.50, 0.02);
    armL.rotation.z = 0.35;
    armR.rotation.z = -0.35;

    const legGeo = new THREE.CapsuleGeometry(0.05, 0.22, 6, 10);
    const legL = new THREE.Mesh(legGeo, mat2);
    const legR = new THREE.Mesh(legGeo, mat2);
    legL.position.set(-0.07, 0.18, 0.02);
    legR.position.set( 0.07, 0.18, 0.02);
    legL.rotation.x = 1.2;
    legR.rotation.x = 1.2;

    bot.add(torso, head, hip, armL, armR, legL, legR);

    // Nameplate
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,256,64);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(`BOT ${i+1}`, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(0.42, 0.10, 1);
    spr.position.set(0, 0.88, 0);
    bot.add(spr);

    root.add(bot);
    state.bots.push(bot);
  }
}

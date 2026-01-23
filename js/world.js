import * as THREE from 'three';

/**
 * World now includes:
 * - Lobby + poker table
 * - Scorpion marker
 * - Store room + VR kiosk with ray-click controllers
 */
export function buildWorld({ scene, player, camera, diag, catalog, profile, storeUI }){

  // ---------- Base ground ----------
  const groundGeo = new THREE.PlaneGeometry(240, 240, 10, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b2236, roughness: 1.0, metalness: 0.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = 0;
  scene.add(ground);

  const grid = new THREE.GridHelper(80, 80, 0x3b4a7a, 0x223055);
  grid.position.y = 0.01;
  scene.add(grid);

  // ---------- Poker table mock ----------
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

  // Spawn pad
  const spawn = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x355cff, emissive: 0x112255, roughness: 0.6 })
  );
  spawn.rotation.x = -Math.PI/2;
  spawn.position.set(0, 0.02, 3);
  scene.add(spawn);

  // Scorpion marker
  const scorpionMarker = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.4, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x5517ff, emissive: 0x220055, roughness: 0.65 })
  );
  scorpionMarker.position.set(18, 0.2, -10);
  scene.add(scorpionMarker);

  // ---------- Store Room ----------
  const storeRoot = new THREE.Group();
  storeRoot.position.set(-18, 0, -10);
  scene.add(storeRoot);

  // room floor
  const storeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x141b2d, roughness: 1.0 })
  );
  storeFloor.rotation.x = -Math.PI/2;
  storeFloor.position.y = 0.01;
  storeRoot.add(storeFloor);

  // store arch / sign
  const archMat = new THREE.MeshStandardMaterial({ color: 0x0f1320, roughness: 0.8 });
  const arch = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.4), archMat);
  arch.position.set(0, 1.6, -6);
  storeRoot.add(arch);

  const sign = makeTextBillboard('STORE', 0.9, 0xffffff, 0x2244ff);
  sign.position.set(0, 2.2, -5.78);
  storeRoot.add(sign);

  // kiosk body
  const kiosk = new THREE.Group();
  kiosk.position.set(0, 0, -2.5);
  storeRoot.add(kiosk);

  const kioskBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.05, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.75 })
  );
  kioskBase.position.y = 0.55;
  kiosk.add(kioskBase);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.4, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0a1226, emissive: 0x111d3f, roughness: 0.4 })
  );
  screen.position.set(0, 1.55, 0.58);
  kiosk.add(screen);

  // store interactables (VR ray click)
  const interactables = [];
  const raycaster = new THREE.Raycaster();
  const tempMat = new THREE.Matrix4();

  // Build item buttons on kiosk screen
  const btns = [];
  const cols = 3, rows = 2;
  const bw = 0.72, bh = 0.46;
  const gapX = 0.08, gapY = 0.08;

  const originX = -((cols * bw + (cols-1)*gapX) / 2) + bw/2;
  const originY = ((rows * bh + (rows-1)*gapY) / 2) - bh/2;

  function refreshKioskButtons(){
    // clear old
    btns.forEach(b => {
      kiosk.remove(b.root);
      const idx = interactables.indexOf(b.hit);
      if (idx >= 0) interactables.splice(idx, 1);
    });
    btns.length = 0;

    const items = catalog.items.slice(0, cols*rows);
    items.forEach((item, i)=>{
      const c = i % cols;
      const r = Math.floor(i / cols);

      const root = new THREE.Group();
      root.position.set(
        originX + c*(bw+gapX),
        1.55 + (originY - r*(bh+gapY)),
        0.62
      );
      kiosk.add(root);

      const owned = profile.owns(item.id);
      const mat = new THREE.MeshStandardMaterial({
        color: owned ? 0x0f3a2a : 0x2a2f44,
        emissive: owned ? 0x0b221a : 0x101530,
        roughness: 0.55
      });

      const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
      face.rotation.y = Math.PI; // face player
      root.add(face);

      const label = makeTextBillboard(shorten(item.name, 14), 0.22, 0xffffff, owned ? 0x00ff99 : 0x3b4a7a);
      label.position.set(0, 0, 0.01);
      label.rotation.y = Math.PI;
      root.add(label);

      const hit = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 }));
      hit.position.set(0, 0, 0.015);
      hit.rotation.y = Math.PI;
      hit.userData.onSelect = () => {
        storeUI.selectItem(item.id);
        storeUI.open();
        diag.log(`[store] selected "${item.name}" from VR kiosk`);
      };

      root.add(hit);
      interactables.push(hit);

      btns.push({ root, hit, itemId: item.id });
    });
  }

  refreshKioskButtons();

  // VR controller rays (safe: no errors if no XR)
  const controllers = [];
  const controllerLines = [];

  function setupControllers(renderer){
    for (let i=0; i<2; i++){
      const c = renderer.xr.getController(i);
      c.userData.index = i;
      c.addEventListener('selectstart', () => onSelect(c));
      scene.add(c);
      controllers.push(c);

      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
      const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x88aaff }));
      line.name = 'ray';
      line.scale.z = 6;
      c.add(line);
      controllerLines.push(line);
    }
  }

  function onSelect(controller){
    // Ray from controller forward
    tempMat.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempMat);

    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length){
      const obj = hits[0].object;
      if (obj.userData.onSelect) obj.userData.onSelect();
    }
  }

  // public hook for app to call after renderer exists
  function attachXR(renderer){
    try{
      setupControllers(renderer);
      diag.log('[xr] controller rays armed ✅');
    }catch(e){
      diag.log(`[xr] controller setup failed: ${e?.message || e}`);
    }
  }

  // ---------- Demo cards ----------
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
    player.position.set(16.5, 0, -6.5);
    player.rotation.y = Math.atan2((scorpionMarker.position.x - player.position.x), (scorpionMarker.position.z - player.position.z));
    diag.log('[world] moved to Scorpion Room ✅');
  }

  function gotoStore(){
    player.position.set(-18, 0, -6);
    player.rotation.y = 0;
    diag.log('[world] moved to Store Room ✅');
  }

  function update(dt){
    const t = performance.now() * 0.001;
    spawn.material.emissiveIntensity = 0.6 + Math.sin(t*2.0)*0.2;
    scorpionMarker.material.emissiveIntensity = 0.5 + Math.sin(t*3.0)*0.25;
    screen.material.emissiveIntensity = 0.7 + Math.sin(t*2.6)*0.15;

    // if profile changed ownership (after buy), refresh kiosk button colors
    if (storeUI.consumeKioskRefresh()){
      refreshKioskButtons();
    }
  }

  // billboard helper (simple plane with canvas texture)
  function makeTextBillboard(text, size=0.4, color=0xffffff, glow=0x2244ff){
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0,0,canvas.width, canvas.height);

    ctx.font = 'bold 120px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // glow
    ctx.shadowColor = `#${glow.toString(16).padStart(6,'0')}`;
    ctx.shadowBlur = 26;
    ctx.fillStyle = `#${color.toString(16).padStart(6,'0')}`;
    ctx.fillText(text, canvas.width/2, canvas.height/2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size*2.2, size), mat);
    return mesh;
  }

  function shorten(s, n){
    s = String(s);
    return s.length <= n ? s : (s.slice(0, n-1) + '…');
  }

  return { update, demoDeal, gotoScorpion, gotoStore, attachXR };
}

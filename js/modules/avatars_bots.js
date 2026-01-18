// /js/modules/avatars_bots.js
export function createBotsAndCards({ THREE, dwrite }, { center }){
  const group = new THREE.Group();
  group.name = "botsAndCards";

  const bots = [];
  const hoverCards = [];
  const tableY = -0.8 + 0.55; // matches divot_table defaults
  const seatRadius = 2.95;
  const botCount = 5; // + 1 open seat marker
  const cardW = 0.18, cardH = 0.26;

  const botMat = new THREE.MeshStandardMaterial({ color: 0x7aa7ff, roughness:0.75 });
  const botMat2 = new THREE.MeshStandardMaterial({ color: 0xffa76a, roughness:0.75 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.55, metalness:0.05 });

  const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.8 });
  const cardBack = new THREE.MeshStandardMaterial({ color: 0x3333ff, roughness:0.7 });
  const hoverMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive:0x66aaff, emissiveIntensity:0.35, roughness:0.85 });

  function makeBot(i, angle){
    const g = new THREE.Group();
    g.name = "bot_"+i;

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), (i%2)?botMat:botMat2);
    body.position.set(0, 0.65, 0);
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), headMat);
    head.position.set(0, 1.08, 0.02);
    g.add(head);

    const x = center.x + Math.cos(angle)*seatRadius;
    const z = center.z + Math.sin(angle)*seatRadius;
    g.position.set(x, tableY, z);
    g.lookAt(center.x, tableY+0.2, center.z);

    // Simple "shoulders" bar
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.18), headMat);
    shoulders.position.set(0, 0.92, 0.02);
    g.add(shoulders);

    // Cards on table for this bot
    const baseY = tableY + 0.14;
    const offset = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
    const cardCenter = new THREE.Vector3(center.x, baseY, center.z).add(offset.multiplyScalar(1.25));

    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), cardMat);
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), cardMat);
    c1.rotation.x = -Math.PI/2;
    c2.rotation.x = -Math.PI/2;
    c1.position.copy(cardCenter).add(new THREE.Vector3(-0.11, 0.001, 0));
    c2.position.copy(cardCenter).add(new THREE.Vector3(0.11, 0.001, 0));
    group.add(c1, c2);

    // Hover mirrored cards (training mirror)
    const h1 = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), hoverMat);
    const h2 = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), hoverMat);
    h1.position.copy(cardCenter).add(new THREE.Vector3(-0.11, 0.6, 0));
    h2.position.copy(cardCenter).add(new THREE.Vector3(0.11, 0.6, 0));
    // face camera-ish (updated in update())
    group.add(h1, h2);
    hoverCards.push(h1, h2);

    // Add to group
    group.add(g);
    bots.push(g);
  }

  // Create 5 bots around table (leave one open seat)
  const angles = [];
  for (let k=0;k<6;k++) angles.push((k/6)*Math.PI*2 + Math.PI/6);
  // skip seat 0 as open seat
  let bi = 0;
  for (let s=0;s<6;s++){
    if (s===0) continue;
    makeBot(bi++, angles[s]);
  }

  // Open seat marker
  const openAngle = angles[0];
  const openPos = new THREE.Vector3(center.x + Math.cos(openAngle)*seatRadius, tableY, center.z + Math.sin(openAngle)*seatRadius);
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0x22ff22, emissive:0x22ff22, emissiveIntensity:0.35, roughness:0.65 })
  );
  marker.position.copy(openPos);
  marker.position.y += 0.05;
  group.add(marker);

  // Community cards (center)
  const commY = tableY + 0.14;
  for (let i=0;i<5;i++){
    const cc = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), cardBack);
    cc.rotation.x = -Math.PI/2;
    cc.position.set(center.x + (i-2)*0.22, commY+0.001, center.z);
    group.add(cc);
  }

  dwrite?.("[bots] bots seated + cards ready");

  // Update: hover cards face camera
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0,1,0);
  return {
    group,
    cardBackMatRef: cardBack,
    update(){
      // cheap billboard
      for (const hc of hoverCards){
        hc.lookAt(0,0,0); // overwritten below
      }
      // real billboard to camera
      // (avoid allocations in a simple loop)
      for (let i=0;i<hoverCards.length;i++){
        const hc = hoverCards[i];
        hc.quaternion.copy(q);
        hc.lookAt( (window.__scarlettCamPosX ?? 0), (window.__scarlettCamPosY ?? 1.6), (window.__scarlettCamPosZ ?? 0) );
      }
    }
  };
}

// /js/modules/pip.js
// Picture-in-Picture: mini render of the table from a fixed camera into a canvas.

export function installPIP(ctx){
  const { THREE, renderer, scene, world } = ctx;
  const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m); }catch(_){ } };

  // Build table + cards + hover cards (teaching mirror)
  const table = buildTable(THREE);
  world.tableAnchor.add(table);

  // Offscreen renderer
  const pipCanvas = document.getElementById('pipCanvas');
  const pipRenderer = new THREE.WebGLRenderer({ canvas: pipCanvas, antialias:true, alpha:true, preserveDrawingBuffer:false });
  pipRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const pipScene = scene; // same scene; different camera
  const pipCam = new THREE.PerspectiveCamera(55, 4/3, 0.05, 200);
  pipCam.position.set(0, 3.2, 3.8);
  pipCam.lookAt(0, -0.35, 0);

  function resize(){
    const r = pipCanvas.getBoundingClientRect();
    const w = Math.max(2, Math.floor(r.width));
    const h = Math.max(2, Math.floor(r.height));
    pipRenderer.setSize(w, h, false);
    pipCam.aspect = w/h;
    pipCam.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Render loop for PIP (decoupled; light cost)
  let last = performance.now();
  function loop(){
    const now = performance.now();
    const dt = Math.min(0.05, (now-last)/1000);
    last = now;

    // Small orbit
    const a = now * 0.00025;
    pipCam.position.set(Math.cos(a)*4.1, 3.0, Math.sin(a)*4.1);
    pipCam.lookAt(0, -0.35, 0);

    pipRenderer.render(pipScene, pipCam);
    requestAnimationFrame(loop);
  }
  loop();

  dwrite('[status] MODULE PIP ✅');
}

function buildTable(THREE){
  const g = new THREE.Group();

  // Table base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.55, 64),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.08 })
  );
  base.position.y = 0.25;
  g.add(base);

  // Felt top
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.95, metalness: 0.0, emissive: 0x04140f, emissiveIntensity: 0.25 })
  );
  felt.position.y = 0.55;
  g.add(felt);

  // Rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.22, 0.08, 16, 84),
    new THREE.MeshStandardMaterial({ color: 0x1b2534, roughness: 0.55, metalness: 0.18 })
  );
  rim.position.y = 0.63;
  rim.rotation.x = Math.PI/2;
  g.add(rim);

  // Dealer chip stack
  const chip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0xff2f6d, roughness: 0.4, metalness: 0.1, emissive: 0xff2f6d, emissiveIntensity: 0.1 })
  );
  chip.position.set(0, 0.70, -0.55);
  g.add(chip);

  // Cards: flat on table + hovering mirror
  const cardTex = makeCardTexture();
  const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.75, metalness: 0.0 });

  const w = 0.22, h = 0.32;
  const flatY = 0.62;
  const hoverY = 1.15;

  // Community cards
  for (let i=0;i<5;i++){
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMat);
    card.rotation.x = -Math.PI/2;
    card.position.set(-0.52 + i*0.26, flatY, 0);
    g.add(card);

    const hover = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMat);
    hover.position.set(card.position.x, hoverY, card.position.z);
    hover.rotation.y = Math.PI; // face outward
    g.add(hover);
  }

  // Player hands (5 bots)
  const seats = 6;
  const radius = 1.65;
  for (let i=1;i<seats;i++){
    const ang = (i/seats)*Math.PI*2;
    const px = Math.cos(ang)*radius;
    const pz = Math.sin(ang)*radius;

    for (let c=0;c<2;c++){
      const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMat);
      card.rotation.x = -Math.PI/2;
      card.position.set(px + (c-0.5)*0.12, flatY, pz);
      card.rotation.z = ang + (c-0.5)*0.12;
      g.add(card);

      const hover = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMat);
      hover.position.set(px + (c-0.5)*0.12, hoverY, pz);
      hover.rotation.y = Math.PI;
      hover.rotation.z = -ang + (c-0.5)*0.12;
      g.add(hover);
    }
  }

  return g;
}

function makeCardTexture(){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const x = c.getContext('2d');

  x.fillStyle = '#f8fafc';
  x.fillRect(0,0,c.width,c.height);
  x.strokeStyle = 'rgba(15,23,42,0.35)';
  x.lineWidth = 10;
  x.strokeRect(12,12,c.width-24,c.height-24);

  x.fillStyle = 'rgba(255,47,109,0.92)';
  x.font = '900 110px system-ui, Arial';
  x.textAlign='center';
  x.textBaseline='middle';
  x.fillText('A', 128, 170);

  x.fillStyle = 'rgba(15,23,42,0.85)';
  x.font = '800 44px system-ui, Arial';
  x.fillText('♠', 128, 250);

  const THREE = window.THREE;
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// /js/ui.js — Simple in-world UI panel + store panel

export function createUI({ THREE, scene, camera, Diagnostics }) {
  const ui = new THREE.Group();
  ui.name = 'ui_root';
  scene.add(ui);

  let visible = true;

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.55),
    new THREE.MeshBasicMaterial({ map: makePanelTex(THREE, 'Scarlett VR\nDiagnostic UI', '#ffffff', '#1b1b2b'), transparent: true })
  );
  panel.position.set(0, 1.55, -1.25);
  ui.add(panel);

  // Clickable button area
  const btn = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.12),
    new THREE.MeshBasicMaterial({ map: makePanelTex(THREE, 'Open Store', '#ffffff', '#2b2b55'), transparent: true })
  );
  btn.position.set(0, 1.36, -1.24);
  btn.name = 'ui_open_store';
  btn.userData.onClick = () => {
    Diagnostics.log('UI', 'Open Store pressed');
    showStore();
  };
  ui.add(btn);

  const store = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.65),
    new THREE.MeshBasicMaterial({ map: makePanelTex(THREE, 'STORE\n(placeholder)', '#ffffff', '#0f331f'), transparent: true })
  );
  store.position.set(0, 1.45, -1.22);
  store.visible = false;
  store.name = 'ui_store';
  store.userData.onClick = () => {
    store.visible = false;
    Diagnostics.log('UI', 'Close Store');
  };
  ui.add(store);

  const targets = [btn, store];

  function showStore() {
    store.visible = true;
  }

  // Toggle UI visibility with left menu (b7) or Y (b4)
  let lastToggle = 0;

  function update(_dt, { buttons }) {
    // keep UI in front of camera (for desktop and VR)
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    ui.position.copy(camPos);
    ui.position.add(camDir.multiplyScalar(0.0));
    ui.quaternion.copy(camera.quaternion);

    const left = buttons?.left || {};
    const pressed = (left.b7 === 1) || (left.b4 === 1);
    const tNow = performance.now();
    if (pressed && (tNow - lastToggle) > 350) {
      visible = !visible;
      panel.visible = visible;
      btn.visible = visible;
      if (!visible) store.visible = false;
      lastToggle = tNow;
      Diagnostics.log('UI', `ui ${visible ? 'ON' : 'OFF'}`);
    }
  }

  return { update, targets };
}

function makePanelTex(THREE, text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = fg;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = String(text).split('\n');
  const startY = c.height/2 - (lines.length-1)*30;
  lines.forEach((ln, i) => ctx.fillText(ln, c.width/2, startY + i*60));
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

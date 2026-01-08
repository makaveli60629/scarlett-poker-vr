// /js/vr_ui.js — controller-attached UI (hands/watch/menu)
// Caller passes THREE + scene + controller grips

export async function initVRUI({ THREE, scene, leftGrip, rightGrip, log = console.log }) {
  const loader = new THREE.TextureLoader();

  function load(url) {
    return new Promise((resolve) => {
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          resolve(t);
        },
        undefined,
        () => {
          log(`[ui] missing texture: ${url}`);
          resolve(null);
        }
      );
    });
  }

  // ✅ your exact filenames
  const handsTex = await load("assets/textures/avatars/Hands.jpg");
  const watchTex = await load("assets/textures/avatars/Watch.jpg");
  const menuTex  = await load("assets/textures/avatars/Menu hand.jpg");

  // helper: make a textured plane
  function makePlane(tex, w, h, emissive = true) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex || null,
      transparent: true,
      opacity: 1,
      roughness: 0.6,
      metalness: 0.05,
      depthWrite: false,
      emissive: emissive ? new THREE.Color(0x66ffff) : new THREE.Color(0x000000),
      emissiveIntensity: emissive ? 0.55 : 0.0,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.renderOrder = 999;
    return mesh;
  }

  // -------- Right hand image (Hands.jpg)
  // NOTE: if your Hands.jpg contains both hands in one image, it’ll still look good as a “glove plate” for now.
  const rightHandPlate = makePlane(handsTex, 0.16, 0.16, true);
  rightHandPlate.position.set(0.02, -0.02, -0.05);
  rightHandPlate.rotation.x = -0.7;
  rightHandPlate.rotation.y = 0.0;

  // -------- Left hand image (Hands.jpg) + menu plate (Menu hand.jpg)
  const leftHandPlate = makePlane(handsTex, 0.16, 0.16, true);
  leftHandPlate.position.set(-0.02, -0.02, -0.05);
  leftHandPlate.rotation.x = -0.7;

  const menuPlate = makePlane(menuTex, 0.20, 0.26, true);
  menuPlate.position.set(0.06, 0.05, -0.10); // floating off left hand
  menuPlate.rotation.y = -0.25;
  menuPlate.rotation.x = -0.15;

  // -------- Watch (Watch.jpg) on left wrist
  const watchPlate = makePlane(watchTex, 0.14, 0.14, true);
  watchPlate.position.set(-0.05, 0.00, -0.06);
  watchPlate.rotation.x = -1.15;
  watchPlate.rotation.y = 0.15;

  if (rightGrip) rightGrip.add(rightHandPlate);
  if (leftGrip) {
    leftGrip.add(leftHandPlate);
    leftGrip.add(menuPlate);
    leftGrip.add(watchPlate);
  }

  // light that makes UI pop
  const uiLight = new THREE.PointLight(0x66ffff, 0.35, 2.0);
  uiLight.position.set(0, 1.6, 0.2);
  scene.add(uiLight);

  return {
    rightHandPlate,
    leftHandPlate,
    menuPlate,
    watchPlate,
    setMenuVisible(v) { menuPlate.visible = !!v; },
  };
}

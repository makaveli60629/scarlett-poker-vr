// /js/scarlett1/world_parts/store.js — Store: kiosk + balcony + stairs + telepad + mannequins v1.0

export function buildStore(ctx, core, layout) {
  const { THREE, log } = ctx;
  const { scene, mats, cfg } = core;

  const cyl = (rt,rb,h,mat,seg=28) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  const box = (w,h,d,mat) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);

  const store = layout.rooms.find(r => r.id === "STORE");
  if (!store) return { telepad: null };

  const center = store.roomCenter.clone();

  const kiosk = box(4.6, 1.2, 3.0, mats.TRIM);
  kiosk.position.set(center.x, 0.6, center.z);
  kiosk.rotation.y = store.doorA;
  scene.add(kiosk);

  const screen = box(4.2, 2.0, 0.12, mats.GLASS);
  screen.position.set(center.x, 1.8, center.z - 1.45);
  screen.rotation.y = store.doorA;
  scene.add(screen);

  // Balcony
  const balcY = 3.3;
  const balc = box(cfg.ROOM_W*0.62, 0.18, cfg.ROOM_L*0.30, mats.HALL);
  balc.position.set(center.x - 2.8, balcY, center.z + 5.2);
  balc.rotation.y = store.doorA;
  scene.add(balc);

  // Short stairs
  const steps = 8;
  for (let i=0;i<steps;i++) {
    const s = box(3.2, 0.14, 0.55, mats.TRIM);
    s.position.set(center.x + 3.6, 0.07 + i*(balcY/steps), center.z + 2.0 + i*0.55);
    s.rotation.y = store.doorA;
    scene.add(s);
  }

  // Telepad on balcony
  const telepad = cyl(1.0,1.0,0.10, new THREE.MeshStandardMaterial({
    color: 0x2b6cff, emissive: 0x2b6cff, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.2
  }), 28);
  telepad.position.set(center.x - 2.8, balcY + 0.09, center.z + 5.2);
  telepad.name = "TELEPAD_BALCONY";
  scene.add(telepad);

  // Mannequins
  const manGeo = new THREE.CapsuleGeometry(0.35, 1.1, 8, 16);
  const manMat = new THREE.MeshStandardMaterial({ color: 0x1a2f55, roughness: 0.6, metalness: 0.25, emissive: 0x050a12 });
  for (let i=0;i<6;i++) {
    const m = new THREE.Mesh(manGeo, manMat);
    m.position.set(center.x + (-7 + i*2.8), 1.05, center.z + 6.8);
    scene.add(m);

    const base = cyl(0.7,0.7,0.08, mats.TRIM, 20);
    base.position.set(m.position.x, 0.04, m.position.z);
    scene.add(base);
  }

  log("store ✅ balcony + stairs + telepad + mannequins");
  return { telepad, center };
}

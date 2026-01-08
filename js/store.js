// /js/store.js — Update 9.0 store (safe visuals, no UI clicks yet)

import { ShopCatalog } from "./shop_catalog.js";
import { createTextureKit } from "./textures.js";

export async function initStore({ THREE, scene, world, log = console.log }) {
  const kit = createTextureKit(THREE, { log });

  const g = new THREE.Group();
  g.name = "Store";
  g.position.set(-5.5, 0, 2.5); // left side of lobby
  world.group.add(g);

  // kiosk base
  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.85 })
  );
  kiosk.position.y = 0.55;
  g.add(kiosk);

  // sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.35, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x2a3cff, emissive: 0x2a3cff, emissiveIntensity: 0.55, roughness: 0.4 })
  );
  sign.position.set(0, 1.35, 0.55);
  g.add(sign);

  // item pedestals
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x0e1018, roughness: 0.9 });
  const iconMatFallback = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

  for (let i = 0; i < ShopCatalog.length; i++) {
    const item = ShopCatalog[i];
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 20), pedMat);
    ped.position.set(-0.75 + i * 0.5, 0.125, -0.55);
    g.add(ped);

    const iconTex = await kit.load(item.icon).catch(() => null);
    const iconMat = iconTex
      ? new THREE.MeshStandardMaterial({ map: iconTex, transparent: true, roughness: 0.9 })
      : iconMatFallback;

    const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), iconMat);
    icon.position.set(ped.position.x, 0.55, ped.position.z);
    icon.rotation.y = Math.PI;
    icon.userData.spin = 0.6 + Math.random() * 0.4;
    icon.userData.itemId = item.id;
    g.add(icon);
  }

  // store tick (spin icons)
  return {
    group: g,
    tick(dt) {
      for (const child of g.children) {
        if (child.isMesh && child.geometry?.type === "PlaneGeometry" && child.userData?.spin) {
          child.rotation.y += dt * child.userData.spin;
        }
      }
    }
  };
                                                          }

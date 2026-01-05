import * as THREE from "three";
import { TextureBank, Textures } from "./textures.js";
import { registerCollider, registerInteractable } from "./state.js";

export const Table = {
  build(scene) {
    // Table felt
    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.0, 0.32, 64),
      TextureBank.standard({ mapFile: Textures.TABLE_FELT, color: 0x004411, roughness: 0.7, repeat: 2 })
    );
    felt.position.set(0, 0.78, 0);
    felt.castShadow = true;
    felt.receiveShadow = true;
    felt.name = "bossTable";
    felt.userData.spectatorOnly = true;
    scene.add(felt);

    // Rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.12, 18, 72),
      TextureBank.standard({ mapFile: Textures.TABLE_TRIM, color: 0x2b1b10, roughness: 0.75, repeat: 2 })
    );
    rim.position.set(0, 0.92, 0);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    rim.receiveShadow = true;
    scene.add(rim);

    // Table collider footprint
    registerCollider(felt, { min: { x: -3.1, y: 0, z: -3.1 }, max: { x: 3.1, y: 1.2, z: 3.1 } });

    // SAFETY ESSENTIAL #1: spectator safety ring collider (invisible)
    // Prevents player stepping into seats / clipping into boss space
    const ringCollider = new THREE.Object3D();
    ringCollider.position.set(0, 0, 0);
    ringCollider.name = "bossTableSpectatorRing";
    scene.add(ringCollider);
    registerCollider(ringCollider, { min: { x: -4.25, y: 0, z: -4.25 }, max: { x: 4.25, y: 2.0, z: 4.25 } });

    // Click gives spectator message (no seat joining)
    registerInteractable(felt, () => {
      window.dispatchEvent(new CustomEvent("notify", { detail: { text: "Boss Table: Spectator Only. Watch the bosses play." } }));
    });

    // Store kiosk placeholder
    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.2, 0.5),
      TextureBank.standard({ color: 0x222244, roughness: 0.8 })
    );
    kiosk.position.set(-8, 0.6, 0);
    kiosk.castShadow = true;
    kiosk.receiveShadow = true;
    scene.add(kiosk);
    registerCollider(kiosk, { min: { x: -8.25, y: 0, z: -0.25 }, max: { x: -7.75, y: 1.2, z: 0.25 } });

    const button = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.03),
      TextureBank.standard({ color: 0x00aa66, roughness: 0.6, emissive: 0x003311 })
    );
    button.position.set(0, 0.15, 0.27);
    kiosk.add(button);

    registerInteractable(button, () => {
      window.dispatchEvent(new CustomEvent("notify", { detail: { text: "Store: coming next (chips + clothing + premium tables)." } }));
    });
  }
};

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { registerCollider } from "./state.js";

export const World = {
  build(scene) {
    scene.fog = new THREE.Fog(0x05060a, 6, 45);

    // Lights (so it’s NEVER black)
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(6, 10, 5);
    scene.add(key);

    const accent = new THREE.PointLight(0x00ffaa, 0.5, 25);
    accent.position.set(0, 3, 0);
    scene.add(accent);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 1.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    try { registerCollider(floor); } catch {}

    // Solid walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
    const w = 26, h = 4.2, t = 0.25;

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMat);
    wallN.position.set(0, h/2, -w/2);
    scene.add(wallN); try { registerCollider(wallN); } catch {}

    const wallS = wallN.clone(); wallS.position.z = w/2; scene.add(wallS); try { registerCollider(wallS); } catch {}

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(t, h, w), wallMat);
    wallE.position.set(w/2, h/2, 0);
    scene.add(wallE); try { registerCollider(wallE); } catch {}

    const wallW = wallE.clone(); wallW.position.x = -w/2; scene.add(wallW); try { registerCollider(wallW); } catch {}

    // Glow edge strips (premium)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.2,
      roughness: 0.35
    });

    const edgeY = h - 0.12;
    const stripN = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), glowMat);
    stripN.position.set(0, edgeY, -w/2 + 0.12);
    scene.add(stripN);

    const stripS = stripN.clone(); stripS.position.z = w/2 - 0.12; scene.add(stripS);

    const stripE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, w), glowMat);
    stripE.position.set(w/2 - 0.12, edgeY, 0);
    scene.add(stripE);

    const stripW = stripE.clone(); stripW.position.x = -w/2 + 0.12; scene.add(stripW);

    // Simple decor: fountain
    const stone = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    const water = new THREE.MeshStandardMaterial({ color: 0x2266ff, transparent: true, opacity: 0.55, roughness: 0.25 });

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.4, 24), stone);
    bowl.position.set(4.5, 0.2, 0.5);
    scene.add(bowl); try { registerCollider(bowl); } catch {}

    const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.18, 24), water);
    waterMesh.position.set(4.5, 0.32, 0.5);
    scene.add(waterMesh);

    // Plants
    const potMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });

    const addPlant = (x,z) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,0.35,16), potMat);
      pot.position.set(x,0.18,z);
      scene.add(pot); try { registerCollider(pot); } catch {}

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.55,16,12), leafMat);
      leaves.position.set(x,0.9,z);
      scene.add(leaves);
    };

    addPlant(11, 11);
    addPlant(-11, 11);
    addPlant(11, -11);
    addPlant(-11, -11);
  }
};

// js/world.js — Scarlett Orchestrated World v4.6 (Lobby + Pit + Table + Chairs + Rail + Store)
import * as THREE from 'three';

export const World = (() => {
  const floors = [];

  function build({ scene, playerRig, diag }) {
    // Background / fog
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.Fog(0x020205, 2, 55);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 0.85);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 10, 4);
    key.castShadow = false;
    scene.add(key);

    // Player spawn (safe: away from table)
    playerRig.position.set(0, 0, 4.2);
    playerRig.rotation.set(0, 0, 0);

    // Floor base
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x083a1f, roughness: 0.95, metalness: 0.0 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(10.5, 64), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    scene.add(floor);
    floors.push(floor);

    // Lobby shell
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x2a2c35, roughness: 0.8 });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.2, 4.2, 64, 1, true), shellMat);
    shell.position.y = 2.1;
    scene.add(shell);

    // Ceiling glow ring
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(9.2, 0.25, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0x0b0c14, emissive: 0x2222ff, emissiveIntensity: 0.22, roughness: 0.9 })
    );
    glow.rotation.x = Math.PI/2;
    glow.position.y = 4.0;
    scene.add(glow);

    // Poker pit (slightly lowered circle)
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.95 });
    const pit = new THREE.Mesh(new THREE.CircleGeometry(6.2, 64), pitMat);
    pit.rotation.x = -Math.PI/2;
    pit.position.y = -0.08;
    scene.add(pit);
    floors.push(pit);

    // Pit rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(6.2, 0.18, 10, 96),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4f, roughness: 0.6, metalness: 0.1 })
    );
    rim.rotation.x = Math.PI/2;
    rim.position.y = 0.02;
    scene.add(rim);

    // Stairs ramp (simple)
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x2a2c35, roughness: 0.85 }));
    ramp.position.set(0, 0.02, 6.8);
    scene.add(ramp);
    floors.push(ramp);

    // Table (oval)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0.12, 0);
    scene.add(tableGroup);

    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.65, 0.16, 48, 1, false),
      new THREE.MeshStandardMaterial({ color: 0x0f6b3a, roughness: 0.9 })
    );
    tableTop.scale.set(1.55, 1.0, 1.0);
    tableTop.castShadow = false;
    tableGroup.add(tableTop);

    const tableEdge = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.16, 10, 72),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 })
    );
    tableEdge.scale.set(1.55, 1.0, 1.0);
    tableEdge.rotation.x = Math.PI/2;
    tableEdge.position.y = 0.06;
    tableGroup.add(tableEdge);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 0.7, 24),
      new THREE.MeshStandardMaterial({ color: 0x171821, roughness: 0.85 })
    );
    base.position.y = -0.42;
    tableGroup.add(base);

    // Chairs (6)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x6a6e77, roughness: 0.95 });
    const chairSeatGeo = new THREE.BoxGeometry(0.55, 0.08, 0.55);
    const chairBackGeo = new THREE.BoxGeometry(0.55, 0.52, 0.08);
    const chairLegGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);

    const radius = 3.05;
    for (let i = 0; i < 6; i++) {
      const a = (i/6) * Math.PI*2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const chair = new THREE.Group();
      chair.position.set(x, 0.0, z);
      chair.lookAt(0, 0, 0);

      const seat = new THREE.Mesh(chairSeatGeo, chairMat);
      seat.position.y = 0.42;
      chair.add(seat);

      const back = new THREE.Mesh(chairBackGeo, chairMat);
      back.position.set(0, 0.70, -0.24);
      chair.add(back);

      const leg = new THREE.Mesh(chairLegGeo, new THREE.MeshStandardMaterial({ color: 0x2c2f39, roughness: 0.85 }));
      leg.position.y = 0.22;
      chair.add(leg);

      scene.add(chair);
      floors.push(seat); // allow teleport onto seat ring around table (optional)
    }

    // Rail boundary
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.14, 10, 96),
      new THREE.MeshStandardMaterial({ color: 0x2b2f3b, roughness: 0.75 })
    );
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.85;
    scene.add(rail);

    // Store pad (simple)
    const storePad = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48),
      new THREE.MeshStandardMaterial({ color: 0x111217, roughness: 0.95 }));
    storePad.rotation.x = -Math.PI/2;
    storePad.position.set(-6.2, 0.01, -4.8);
    scene.add(storePad);
    floors.push(storePad);

    const storeWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x1d1f28, roughness: 0.9 }));
    storeWall.position.set(-8.35, 1.1, -4.8);
    scene.add(storeWall);

    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x0b0c14, emissive: 0x2233ff, emissiveIntensity: 0.12, roughness: 0.6 }));
    kiosk.position.set(-6.1, 0.55, -3.6);
    scene.add(kiosk);

    // Final
    diag && diag.log('[world] orchestrated build ready ✅');
    return { floors };
  }

  return { build };
})();

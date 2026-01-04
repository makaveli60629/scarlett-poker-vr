import * as THREE from "three";

export const Table = {
  build({ scene, state }){
    const group = new THREE.Group();
    group.name = "PokerTable";
    group.position.set(0, 0, 0);
    scene.add(group);

    // Safe texture loader (won't crash if missing)
    const loader = new THREE.TextureLoader();
    const loadTex = (path) => new Promise((resolve) => {
      loader.load(path, t => resolve(t), undefined, () => resolve(null));
    });

    // Materials (fallback colors)
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1710, roughness:0.75, metalness:0.15 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness:0.85, metalness:0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A24D, roughness:0.28, metalness:0.75 });

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.55, 64), woodMat);
    base.scale.set(1.6, 1, 1.1);
    base.position.y = 0.45;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Felt top (will apply texture if found)
    const feltTop = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.10, 64), new THREE.MeshStandardMaterial({
      color: 0x5a0f22, roughness:0.9, metalness:0.05
    }));
    feltTop.scale.set(1.6, 1, 1.1);
    feltTop.position.y = 0.78;
    feltTop.castShadow = true;
    feltTop.receiveShadow = true;
    group.add(feltTop);

    // Gold trim ring
    const trim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.05, 16, 80), goldMat);
    trim.rotation.x = Math.PI/2;
    trim.scale.set(1.6, 1.1, 1.1);
    trim.position.y = 0.83;
    group.add(trim);

    // Rail (padded edge)
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.20, 0.11, 18, 80), railMat);
    rail.rotation.x = Math.PI/2;
    rail.scale.set(1.6, 1.1, 1.1);
    rail.position.y = 0.86;
    rail.castShadow = true;
    group.add(rail);

    // Chip tray (right side)
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.62), woodMat);
    tray.position.set(1.45, 0.83, 0);
    tray.castShadow = true;
    tray.receiveShadow = true;
    group.add(tray);

    // Collision shell (solid)
    const collider = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.35, 1.1, 64),
      new THREE.MeshBasicMaterial({ visible:false })
    );
    collider.scale.set(1.6, 1, 1.1);
    collider.position.y = 0.55;
    collider.name = "TABLE_COLLIDER";
    group.add(collider);

    // Attach seat anchor points (6 seats)
    const seats = [];
    const rX = 2.15;
    const rZ = 1.45;
    for(let i=0;i<state.maxSeats;i++){
      const a = (i/state.maxSeats) * Math.PI*2;
      const p = new THREE.Vector3(Math.cos(a)*rX, 0, Math.sin(a)*rZ);
      seats.push(p);
    }

    // Optional textures (safe)
    (async () => {
      const felt = await loadTex("assets/textures/table_felt_red.jpg");
      if(felt){
        felt.wrapS = felt.wrapT = THREE.RepeatWrapping;
        felt.repeat.set(2,2);
        feltTop.material.map = felt;
        feltTop.material.color.setHex(0xffffff);
        feltTop.material.needsUpdate = true;
      }

      const logo = await loadTex("assets/textures/scarlett_logo.png");
      if(logo){
        const logoMesh = new THREE.Mesh(
          new THREE.CircleGeometry(0.28, 48),
          new THREE.MeshStandardMaterial({ map: logo, transparent:true, roughness:0.8 })
        );
        logoMesh.rotation.x = -Math.PI/2;
        logoMesh.position.y = 0.835;
        group.add(logoMesh);
      }
    })();

    return {
      group,
      feltTop,
      seats,
      worldPositionOfSeat(i){
        const p = seats[i] || new THREE.Vector3(0,0,0);
        return group.localToWorld(p.clone().add(new THREE.Vector3(0,0,0)));
      }
    };
  }
};

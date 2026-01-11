// /js/store_room.js — StoreRoom v1.0 (placeholder shop loop)

export const StoreRoom = {
  init({ THREE, root, log }) {
    const safeLog=(...a)=>{ try{log?.(...a);}catch(e){} };

    const g = new THREE.Group();
    g.name = "StoreRoom";
    root.add(g);

    // Room shell
    const wall = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.9, metalness: 0.05 });
    const neon = new THREE.MeshStandardMaterial({ color: 0xff2d7a, roughness: 0.3, metalness: 0.25, emissive: 0x300018, emissiveIntensity: 1.2 });

    const shell = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 18), wall);
    shell.position.set(22, 3, 0);
    g.add(shell);

    const door = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 0.3), neon);
    door.position.set(22, 1.75, 9);
    g.add(door);

    // Kiosk
    const kiosk = new THREE.Group();
    kiosk.position.set(22, 0, 0);
    g.add(kiosk);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 20), wall);
    base.position.set(0, 0.2, 0);
    kiosk.add(base);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 20), wall);
    pedestal.position.set(0, 1.0, 0);
    kiosk.add(pedestal);

    const item = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), neon);
    item.position.set(0, 1.9, 0);
    kiosk.add(item);

    const st = {
      t: 0,
      wallet: 100000,
      owned: false
    };

    safeLog("[store] room ✅");
    return {
      group: g,
      getPosition(){ return new THREE.Vector3(22,0,0); },
      toggleBuy(){
        st.owned = !st.owned;
        safeLog("[store] buy toggle owned=", st.owned);
        item.material.color.setHex(st.owned ? 0x4cd964 : 0xff2d7a);
      },
      update(dt){
        st.t += dt;
        item.rotation.y += dt * 0.8;
        item.rotation.x = Math.sin(st.t*0.8) * 0.25;
      },
      dispose(){ try{ if(g.parent) g.parent.remove(g); }catch(e){} }
    };
  }
};

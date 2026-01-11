// /js/solid_walls.js — SolidWalls v1.0 (FULL)
// ✅ Exports SolidWalls.init(ctx)
// ✅ Builds: circular lobby shell + 2 hallways + room markers (store + scorpion)
// ✅ No blue carpet, no box room

export const SolidWalls = {
  async init({ THREE, scene, root, log }) {
    const safe = (...a)=>{ try{ (log||console.log)(...a); }catch(e){} };

    const g = new THREE.Group();
    g.name = "SolidWalls";
    root.add(g);

    // ----- Lobby ring walls -----
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x101425, roughness: 0.92, metalness: 0.05 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a2042, roughness: 0.35, metalness: 0.25, emissive: 0x060818, emissiveIntensity: 0.25 });

    const R = 14.0;              // lobby radius
    const H = 4.0;               // wall height
    const T = 0.35;              // wall thickness
    const SEG = 24;              // segments

    for (let i=0;i<SEG;i++){
      const a0 = (i/SEG)*Math.PI*2;
      const a1 = ((i+1)/SEG)*Math.PI*2;
      const ang = (a0+a1)*0.5;

      // leave gaps (doorways)
      // store doorway at +Z, scorpion doorway at -X
      const deg = ang * 180/Math.PI;
      const near = (v, target, span)=> Math.abs(((v-target+540)%360)-180) < span;

      if (near(deg, 0, 12)) continue;    // +Z gap (store hallway)
      if (near(deg, 270, 12)) continue;  // -X gap (scorpion hallway)

      const w = (2*Math.PI*R)/SEG * 0.95;
      const segWall = new THREE.Mesh(new THREE.BoxGeometry(w, H, T), wallMat);
      segWall.position.set(Math.sin(ang)*R, H/2, Math.cos(ang)*R);
      segWall.rotation.y = ang;
      g.add(segWall);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, T+0.02), trimMat);
      trim.position.set(segWall.position.x, H-0.06, segWall.position.z);
      trim.rotation.copy(segWall.rotation);
      g.add(trim);
    }

    // ----- Hallways -----
    function hallway(name, x,z, yaw){
      const hg = new THREE.Group();
      hg.name = name;
      hg.position.set(x,0,z);
      hg.rotation.y = yaw;
      g.add(hg);

      const len = 22;
      const wid = 6;
      const h = 4;

      const sideMat = new THREE.MeshStandardMaterial({ color: 0x0f1322, roughness: 0.95, metalness: 0.02 });
      const floorMat= new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95, metalness: 0.0 });

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), floorMat);
      floor.rotation.x = -Math.PI/2;
      floor.position.set(0,0.01,-len/2);
      hg.add(floor);

      const wallL = new THREE.Mesh(new THREE.BoxGeometry(T, h, len), sideMat);
      wallL.position.set(-wid/2, h/2, -len/2);
      hg.add(wallL);

      const wallR = new THREE.Mesh(new THREE.BoxGeometry(T, h, len), sideMat);
      wallR.position.set( wid/2, h/2, -len/2);
      hg.add(wallR);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.12, len), trimMat);
      cap.position.set(0, h-0.06, -len/2);
      hg.add(cap);

      // end frame marker
      const marker = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 12, 64), trimMat);
      marker.rotation.x = Math.PI/2;
      marker.position.set(0, 1.6, -len+2.0);
      hg.add(marker);

      return hg;
    }

    // Store hallway: from lobby edge (+Z) going forward (-Z in hallway local)
    hallway("Hallway_Store", 0, 14.0, 0);

    // Scorpion hallway: from lobby edge (-X) going forward (local -Z), yaw 90deg
    hallway("Hallway_Scorpion", -14.0, 0, Math.PI/2);

    safe("[walls] SolidWalls built ✅ (lobby ring + 2 hallways)");
  }
};

export default SolidWalls;

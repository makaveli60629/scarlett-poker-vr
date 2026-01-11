// /js/solid_walls.js — SolidWalls v1.0 (FULL)
// Exports { SolidWalls } with SolidWalls.init(ctx)
// Builds: circular lobby ring walls + 2 hallway corridors + simple “rooms” for store & scorpion.
// Safe: no dependencies besides THREE.

export const SolidWalls = {
  init(ctx) {
    const THREE = ctx.THREE;
    const root = ctx.root || ctx.scene;
    const log = ctx.log || console.log;

    const g = new THREE.Group();
    g.name = "SolidWalls";
    root.add(g);

    const matWall = new THREE.MeshStandardMaterial({ color: 0x0f1324, roughness: 0.95, metalness: 0.0 });
    const matTrim = new THREE.MeshStandardMaterial({ color: 0x172047, roughness: 0.65, metalness: 0.15 });
    const matGlow = new THREE.MeshStandardMaterial({ color: 0x0bbbd6, roughness: 0.2, metalness: 0.35, emissive: 0x004455, emissiveIntensity: 0.8 });

    // ---------- helpers ----------
    const addBox = (w,h,d, x,y,z, mat, ry=0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      m.position.set(x,y,z);
      m.rotation.y = ry;
      m.castShadow = false; m.receiveShadow = true;
      g.add(m);
      return m;
    };

    const addFrame = (x,y,z, ry=0) => {
      // doorway frame
      addBox(2.2, 2.6, 0.12, x, y+1.3, z, matTrim, ry);
      // inset glow strip
      addBox(1.9, 0.08, 0.06, x, y+2.25, z+0.04, matGlow, ry);
    };

    // ---------- lobby ring walls ----------
    // Big ring around lobby center (0,0,0)
    const R = 10.5;
    const H = 3.2;
    const thickness = 0.35;
    const segs = 28;

    for (let i=0;i<segs;i++){
      const a = (i/segs) * Math.PI*2;
      // leave two “gaps” for hallways at forward/back-right-ish
      const deg = (a * 180/Math.PI + 360) % 360;
      const gap1 = (deg > 325 || deg < 35);      // front gap
      const gap2 = (deg > 120 && deg < 170);     // left-ish gap
      if (gap1 || gap2) continue;

      const x = Math.sin(a) * R;
      const z = Math.cos(a) * R;
      const ry = a;

      // segment wall
      addBox(2.2, H, thickness, x, H/2, z, matWall, ry);
      // trim band
      addBox(2.2, 0.15, thickness+0.02, x, 1.05, z, matTrim, ry);
    }

    // ---------- hallways ----------
    // Hallway A: from lobby forward to “store room”
    // Lobby center is near z=0, your spawn is z=26 (behind) so we aim halls around that.
    // We'll place store in +Z direction near your spawn zone.
    const hallA = new THREE.Group(); hallA.name="HallStore"; g.add(hallA);

    const hallLenA = 10.5;
    const hallW = 3.2;
    const hallH = 3.0;

    // corridor centered at x=0, z=10..20
    // floor is already global, so walls/ceiling only:
    const buildHall = (group, cx, cz0, cz1, ry=0) => {
      const midZ = (cz0+cz1)/2;
      const len = Math.abs(cz1-cz0);

      // left/right walls
      addBox(thickness, hallH, len, cx - hallW/2, hallH/2, midZ, matWall, ry).parent = group;
      addBox(thickness, hallH, len, cx + hallW/2, hallH/2, midZ, matWall, ry).parent = group;
      // ceiling
      addBox(hallW+thickness, 0.12, len, cx, hallH, midZ, matTrim, ry).parent = group;

      // glow strips
      addBox(0.08, 0.08, len-1, cx - hallW/2 + 0.18, hallH-0.25, midZ, matGlow, ry).parent = group;
      addBox(0.08, 0.08, len-1, cx + hallW/2 - 0.18, hallH-0.25, midZ, matGlow, ry).parent = group;
    };

    buildHall(hallA, 0, 8.5, 8.5+hallLenA, 0);

    // doorway frame at lobby exit + at store entrance
    addFrame(0, 0, 8.0, 0);
    addFrame(0, 0, 8.5+hallLenA+0.6, 0);

    // ---------- store room shell ----------
    const storeRoom = new THREE.Group(); storeRoom.name="StoreRoomShell"; g.add(storeRoom);
    const storeZ = 8.5 + hallLenA + 6.5;
    // simple room
    addBox(12, 3.2, thickness, 0, 1.6, storeZ-6, matWall, 0);      // back wall
    addBox(thickness, 3.2, 12, -6, 1.6, storeZ, matWall, 0);       // left wall
    addBox(thickness, 3.2, 12,  6, 1.6, storeZ, matWall, 0);       // right wall
    addBox(12, 0.12, 12, 0, 3.2, storeZ, matTrim, 0);              // ceiling
    // trim ring
    addBox(12, 0.12, 12, 0, 0.15, storeZ, matTrim, 0);

    // ---------- Hallway B: side corridor to scorpion ----------
    const hallB = new THREE.Group(); hallB.name="HallScorpion"; g.add(hallB);
    const hallLenB = 11.5;
    // corridor from x=-8 to x=-8-hallLenB around z ~ 0 (side wing)
    // We'll rotate corridor 90deg and place to left
    const cxB = -8.0 - hallLenB/2;
    const zB = 1.5;
    // build rotated hall: treat length along X by rotating group
    // We'll use buildHall by swapping axes via rotation.
    const tmp = new THREE.Group();
    tmp.rotation.y = Math.PI/2;
    tmp.position.set(-8.0, 0, zB);
    g.add(tmp);
    buildHall(tmp, 0, 0, hallLenB, 0);
    // frames
    addFrame(-8.0, 0, zB, Math.PI/2);
    addFrame(-8.0-hallLenB-0.6, 0, zB, Math.PI/2);

    // scorpion room shell
    const scorpZ = zB;
    const scorpX = -8.0 - hallLenB - 7.0;
    addBox(14, 3.2, thickness, scorpX-6, 1.6, scorpZ, matWall, Math.PI/2);  // far wall (rot)
    addBox(thickness, 3.2, 14, scorpX, 1.6, scorpZ-7, matWall, 0);          // left wall
    addBox(thickness, 3.2, 14, scorpX, 1.6, scorpZ+7, matWall, 0);          // right wall
    addBox(14, 0.12, 14, scorpX, 3.2, scorpZ, matTrim, 0);                  // ceiling
    addBox(14, 0.12, 14, scorpX, 0.15, scorpZ, matTrim, 0);                 // base trim

    // expose useful anchors so other systems can use them
    const anchors = {
      storeEntrance: new THREE.Vector3(0, 0, 8.5+hallLenA+0.6),
      storeCenter:   new THREE.Vector3(0, 0, storeZ),
      scorpionDoor:  new THREE.Vector3(-8.0-hallLenB-0.6, 0, zB),
      scorpionCenter:new THREE.Vector3(scorpX, 0, scorpZ),
    };

    g.userData.anchors = anchors;

    log("[walls] SolidWalls.init ✅ (hallways + rooms)");
    return { group: g, anchors };
  }
};

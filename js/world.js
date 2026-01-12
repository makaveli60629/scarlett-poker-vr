// /js/world.js — Scarlett WORLD 7.8 (Seal top band + rail stack + jumbotron lower + brighter rooms + leather trim)
export const World = (() => {
  let floors = [];
  const spawns = new Map();

  function build({ THREE, scene, log }) {
    floors = [];
    spawns.clear();

    const root = new THREE.Group();
    scene.add(root);

    // Colors
    const colFloor=0x0b0d14, colWall=0x14182a, colTrim=0x222a4a;
    const colGold=0xd2b46a, colAqua=0x7fe7ff, colPink=0xff2d7a;
    const colFelt=0x123018, colLeather=0x3a2418, colBlue=0x2a6bff;

    const matFloor = new THREE.MeshStandardMaterial({ color: colFloor, roughness:0.95, metalness:0.05, side:THREE.DoubleSide });
    const matWall  = new THREE.MeshStandardMaterial({ color: colWall,  roughness:0.90, metalness:0.07 });
    const matTrim  = new THREE.MeshStandardMaterial({ color: colTrim,  roughness:0.65, metalness:0.10 });
    const matGold  = new THREE.MeshStandardMaterial({ color: colGold,  roughness:0.25, metalness:0.90 });
    const matFelt  = new THREE.MeshStandardMaterial({ color: colFelt,  roughness:0.90, metalness:0.06 });

    const matLeather = new THREE.MeshStandardMaterial({ color: colLeather, roughness:0.55, metalness:0.10 });
    const matNeonA = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colAqua, emissiveIntensity: 2.6, roughness: 0.3 });
    const matNeonP = new THREE.MeshStandardMaterial({ color: 0x05060a, emissive: colPink, emissiveIntensity: 2.6, roughness: 0.3 });
    const matBlue  = new THREE.MeshStandardMaterial({ color: colBlue, roughness:0.35, metalness:0.25, emissive: colBlue, emissiveIntensity: 0.65 });

    // Sizes
    const LOBBY_R=17, WALL_H=10.5, WALL_T=0.35;
    const HALL_W=4.4, HALL_L=11.2;
    const ROOM_W=12, ROOM_D=12, ROOM_H=6.5;

    const pitR=6.4, pitDepth=1.55, rimR=pitR+0.20, rampOuterR=pitR+2.1;

    // Lights (keep your good rings, add room fill)
    root.add(new THREE.AmbientLight(0xffffff, 0.62));
    const sun = new THREE.DirectionalLight(0xffffff, 1.05);
    sun.position.set(14, 28, 10);
    root.add(sun);

    // overhead rings (kept)
    const ringLightMat = new THREE.MeshStandardMaterial({ color:0x0b0d14, emissive:0xffffff, emissiveIntensity:1.35, roughness:0.2, metalness:0.1 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(9.7, 0.16, 12, 200), ringLightMat);
    ring1.position.set(0, 9.2, 0); ring1.rotation.x=Math.PI/2; root.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.15, 12, 200), ringLightMat);
    ring2.position.set(0, 8.5, 0); ring2.rotation.x=Math.PI/2; root.add(ring2);

    for (let i=0;i<12;i++){
      const a=(i/12)*Math.PI*2;
      const p=new THREE.PointLight(0xffffff,1.25,38);
      p.position.set(Math.sin(a)*9.2,7.3,Math.cos(a)*9.2);
      root.add(p);
    }

    const pitKey = new THREE.SpotLight(0xffffff,2.0,35,Math.PI/6,0.45,1.2);
    pitKey.position.set(0,9.0,0);
    pitKey.target.position.set(0,-pitDepth,0);
    root.add(pitKey, pitKey.target);

    // Top ring floor (hole)
    const topRing = new THREE.Mesh(new THREE.RingGeometry(rampOuterR, LOBBY_R, 128), matFloor);
    topRing.rotation.x=-Math.PI/2; topRing.position.y=0; root.add(topRing); floors.push(topRing);

    // Ramp ring
    const ramp = new THREE.Mesh(makeRampRing(THREE, rimR, rampOuterR, -pitDepth, 0, 140), matFloor);
    root.add(ramp); floors.push(ramp);

    // Pit floor
    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(rimR, 96), matFloor);
    pitFloor.rotation.x=-Math.PI/2; pitFloor.position.y=-pitDepth; root.add(pitFloor); floors.push(pitFloor);

    const pitWall = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, pitDepth, 96,1,true), matWall);
    pitWall.position.set(0,-pitDepth/2,0); root.add(pitWall);

    const pitRim = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.09, 14, 200), matTrim);
    pitRim.position.set(0,0.05,0); pitRim.rotation.x=Math.PI/2; root.add(pitRim);

    // Table
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.95,2.95,0.25,56), matFelt);
    tableTop.position.set(0,-pitDepth+0.70,0); root.add(tableTop);

    // ✅ Leather trim rail (instead of gold)
    const tableLeather = new THREE.Mesh(new THREE.TorusGeometry(3.05,0.16,18,160), matLeather);
    tableLeather.position.copy(tableTop.position).add(new THREE.Vector3(0,0.22,0));
    tableLeather.rotation.x=Math.PI/2; root.add(tableLeather);

    // ✅ Rail stack: blue smaller + gold above + cyan neon ring
    const baseR = (rampOuterR - 0.25);
    const blueRail = new THREE.Mesh(new THREE.TorusGeometry(baseR - 0.20, 0.10, 16, 220), matBlue);
    blueRail.position.set(0,0.92,0); blueRail.rotation.x=Math.PI/2; root.add(blueRail);

    const goldRail = new THREE.Mesh(new THREE.TorusGeometry(baseR - 0.10, 0.10, 16, 220), matGold);
    goldRail.position.set(0,1.05,0); goldRail.rotation.x=Math.PI/2; root.add(goldRail);

    const cyanHalo = new THREE.Mesh(new THREE.TorusGeometry(baseR - 0.10, 0.055, 12, 220), matNeonA);
    cyanHalo.position.set(0,1.22,0); cyanHalo.rotation.x=Math.PI/2; root.add(cyanHalo);

    // Lobby wall with 4 gaps + ✅ upper band to seal “openings above doors”
    const gapAngles=[0,Math.PI/2,Math.PI,-Math.PI/2], gapWidth=0.28;
    const nearGap=(a)=>gapAngles.some(g=>Math.abs(Math.atan2(Math.sin(a-g),Math.cos(a-g)))<gapWidth);

    // Lower wall panels only up to y=3.2 (keeps doorways)
    const lowerH = 3.2;
    for (let i=0;i<56;i++){
      const a=(i/56)*Math.PI*2;
      if (nearGap(a)) continue;
      const px=Math.sin(a)*(LOBBY_R+WALL_T/2);
      const pz=Math.cos(a)*(LOBBY_R+WALL_T/2);
      const panel=new THREE.Mesh(new THREE.BoxGeometry(2.0, lowerH, WALL_T), matWall);
      panel.position.set(px, lowerH/2, pz);
      panel.rotation.y=a;
      root.add(panel);
    }

    // ✅ Upper continuous wall band that seals everything above door height
    const upperBandH = WALL_H - lowerH;
    const upperBand = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R + WALL_T/2, LOBBY_R + WALL_T/2, upperBandH, 96, 1, true),
      matWall
    );
    upperBand.position.set(0, lowerH + upperBandH/2, 0);
    root.add(upperBand);

    // Rooms + hallways (keep your current world’s room logic; add extra lights in rooms)
    const roomDefs = [
      { label:"STORE", ax:0, neon:matNeonA },
      { label:"SCORPION", ax:Math.PI/2, neon:matNeonP },
      { label:"SPECTATE", ax:Math.PI, neon:matNeonA },
      { label:"LOUNGE", ax:-Math.PI/2, neon:matNeonP },
    ];

    roomDefs.forEach((r)=>{
      const dir=new THREE.Vector3(Math.sin(r.ax),0,Math.cos(r.ax));

      const hallCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L/2 - 0.25);
      const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(HALL_W,0.22,HALL_L), matFloor);
      hallFloor.position.set(hallCenter.x,-0.11,hallCenter.z);
      hallFloor.rotation.y=r.ax; root.add(hallFloor); floors.push(hallFloor);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALL_W-0.6,0.12,HALL_L-0.6), r.neon);
      strip.position.set(hallCenter.x,4.05,hallCenter.z);
      strip.rotation.y=r.ax; root.add(strip);

      // room center
      const roomCenter = dir.clone().multiplyScalar(LOBBY_R + HALL_L + ROOM_D/2 - 0.7);
      const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W,0.25,ROOM_D), matFloor);
      roomFloor.position.set(roomCenter.x,-0.12,roomCenter.z);
      roomFloor.rotation.y=r.ax; root.add(roomFloor); floors.push(roomFloor);

      // ✅ More room lights (corners)
      const corners = [
        new THREE.Vector3(-ROOM_W/3, 5.2, -ROOM_D/3),
        new THREE.Vector3( ROOM_W/3, 5.2, -ROOM_D/3),
        new THREE.Vector3(-ROOM_W/3, 5.2,  ROOM_D/3),
        new THREE.Vector3( ROOM_W/3, 5.2,  ROOM_D/3),
      ];
      corners.forEach((c)=>{
        const p=new THREE.PointLight(0xffffff,1.6,28);
        p.position.copy(roomCenter);
        p.rotation?.y && (p.rotation.y = r.ax);
        // rotate corner offset by room rotation
        const ox = c.x, oz = c.z;
        const rx = Math.cos(r.ax)*ox + Math.sin(r.ax)*oz;
        const rz = -Math.sin(r.ax)*ox + Math.cos(r.ax)*oz;
        p.position.add(new THREE.Vector3(rx, c.y, rz));
        root.add(p);
      });
    });

    // ✅ Jumbotrons slightly LOWER
    const screenW=7.6, screenH=3.3;
    for (let i=0;i<4;i++){
      const a=i*(Math.PI/2);
      const sx=Math.sin(a)*(LOBBY_R-1.0);
      const sz=Math.cos(a)*(LOBBY_R-1.0);
      const screenMat=new THREE.MeshStandardMaterial({
        color:0x07080c, roughness:0.25, metalness:0.1,
        emissive:0x101428, emissiveIntensity:1.15
      });
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(screenW,screenH), screenMat);
      screen.position.set(sx, 8.2, sz); // was ~8.7
      screen.lookAt(0,8.2,0);
      root.add(screen);
    }

    // VIP cube spawn (keep simple)
    const vipBase = new THREE.Vector3(LOBBY_R - 1.8, 0, 6.2);
    const spawnPos = vipBase.clone().add(new THREE.Vector3(0,0,-1.3));
    const yawToTable = Math.atan2(0 - spawnPos.x, 0 - spawnPos.z);
    spawns.set("vip_cube", { x: spawnPos.x, y:0, z:spawnPos.z, yaw: yawToTable });

    log?.("[world] built ✅ 7.8");
  }

  function makeRampRing(THREE, innerR, outerR, yInner, yOuter, segments=128){
    const positions=[], normals=[], uvs=[], indices=[];
    const add=(x,y,z,u,v)=>{ positions.push(x,y,z); uvs.push(u,v); normals.push(0,1,0); };
    for (let i=0;i<=segments;i++){
      const t=(i/segments)*Math.PI*2;
      const cx=Math.sin(t), cz=Math.cos(t);
      add(cx*innerR, yInner, cz*innerR, 0, i/segments);
      add(cx*outerR, yOuter, cz*outerR, 1, i/segments);
    }
    for (let i=0;i<segments;i++){
      const a=i*2, b=a+1, c=a+2, d=a+3;
      indices.push(a,b,c, b,d,c);
    }
    const g=new THREE.BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals,3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs,2));
    g.computeVertexNormals();
    return g;
  }

  function getSpawn(){ return spawns.get("vip_cube"); }
  function getFloors(){ return floors; }

  return { build, getSpawn, getFloors };
})();

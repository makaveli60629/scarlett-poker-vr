// /js/world.js — Scarlett World v1.4
// - Guard moved OUTSIDE rail at front
// - Spawn point placed ON teleport circle
// - Poker table top gets a custom felt texture with markings + path line
// - Ceiling trim + ceiling lights
// - Simple corner fountain
// - Doors remain LEFT/RIGHT

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log } = {}) {
  const L=(...a)=>{ try{log?.(...a);}catch{console.log(...a);} };

  const group = new THREE.Group();
  group.name="WorldRoot";
  scene.add(group);

  const colliders=[];
  const seats=[];
  const tableFocus=new THREE.Vector3(0,0,-6.5);
  const metrics={ tableY:0.92, seatY:0.52 };
  const tableTopY = metrics.tableY;

  // TEXTURES
  const tl=new THREE.TextureLoader();
  const floorTex = tl.load("./assets/textures/scarlett_floor_tile_seamless.png");
  floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;
  floorTex.repeat.set(10,10);

  const wallTex = tl.load("./assets/textures/1767279790736.jpg");
  wallTex.wrapS=wallTex.wrapT=THREE.RepeatWrapping;
  wallTex.repeat.set(6,2);

  const storeDoorTex = tl.load("./assets/textures/scarlett_door_store.png");
  const pokerDoorTex = tl.load("./assets/textures/scarlett_door_poker.png");

  // LIGHTS
  group.add(new THREE.HemisphereLight(0xffffff, 0x1b2a33, 1.25));
  const key=new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(8,14,6);
  group.add(key);

  // ROOM
  const ROOM_W=34, ROOM_D=34, ROOM_H=8;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map:floorTex, color:0xffffff, roughness:0.95 })
  );
  floor.name="Floor";
  floor.rotation.x=-Math.PI/2;
  group.add(floor);
  colliders.push(floor);

  const wallMat=new THREE.MeshStandardMaterial({ map:wallTex, color:0xffffff, roughness:0.95 });

  function wall(w,h,pos,rotY){
    const vis=new THREE.Mesh(new THREE.PlaneGeometry(w,h), wallMat);
    vis.position.copy(pos);
    vis.rotation.y=rotY;
    group.add(vis);

    const col=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.3), new THREE.MeshBasicMaterial({visible:false}));
    col.position.copy(pos);
    col.rotation.y=rotY;
    group.add(col);
    colliders.push(col);
  }

  wall(ROOM_W, ROOM_H, new THREE.Vector3(0,ROOM_H/2,-ROOM_D/2), 0);
  wall(ROOM_W, ROOM_H, new THREE.Vector3(0,ROOM_H/2, ROOM_D/2), Math.PI);
  wall(ROOM_D, ROOM_H, new THREE.Vector3(-ROOM_W/2,ROOM_H/2,0), Math.PI/2);
  wall(ROOM_D, ROOM_H, new THREE.Vector3( ROOM_W/2,ROOM_H/2,0), -Math.PI/2);

  // CEILING TRIM + LIGHTS
  const ceilingTrim = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W-0.5, 0.18, ROOM_D-0.5),
    new THREE.MeshStandardMaterial({ color:0x10131a, roughness:0.85, emissive:0x0a0b10, emissiveIntensity:0.12 })
  );
  ceilingTrim.position.set(0, ROOM_H-0.12, 0);
  group.add(ceilingTrim);

  for(let i=0;i<6;i++){
    const lamp=new THREE.PointLight(i%2?0x7fe7ff:0xff2d7a, 0.65, 18, 2.0);
    lamp.position.set(-10 + i*4, ROOM_H-1.2, -2);
    group.add(lamp);
  }

  // TABLE FELT TEXTURE (procedural)
  function makeFeltTex(){
    const c=document.createElement("canvas");
    c.width=1024; c.height=1024;
    const ctx=c.getContext("2d");

    // base felt
    ctx.fillStyle="#0f3b2a";
    ctx.fillRect(0,0,c.width,c.height);

    // subtle noise dots
    ctx.globalAlpha=0.10;
    for(let i=0;i<9000;i++){
      const x=(Math.random()*1024)|0;
      const y=(Math.random()*1024)|0;
      const v=120+(Math.random()*40)|0;
      ctx.fillStyle=`rgb(${v},${v+30},${v})`;
      ctx.fillRect(x,y,1,1);
    }
    ctx.globalAlpha=1;

    // oval lines
    ctx.strokeStyle="rgba(255,255,255,0.35)";
    ctx.lineWidth=10;
    ctx.beginPath();
    ctx.ellipse(512,512,360,300,0,0,Math.PI*2);
    ctx.stroke();

    ctx.strokeStyle="rgba(127,231,255,0.35)";
    ctx.lineWidth=6;
    ctx.beginPath();
    ctx.ellipse(512,512,300,240,0,0,Math.PI*2);
    ctx.stroke();

    // “path line” toward dealer spot
    ctx.strokeStyle="rgba(255,45,122,0.45)";
    ctx.lineWidth=8;
    ctx.beginPath();
    ctx.moveTo(512, 512);
    ctx.lineTo(720, 320);
    ctx.stroke();

    // community card box
    ctx.strokeStyle="rgba(255,255,255,0.35)";
    ctx.lineWidth=6;
    ctx.strokeRect(512-260, 512-80, 520, 160);

    const tex=new THREE.CanvasTexture(c);
    tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
    tex.needsUpdate=true;
    return tex;
  }

  // TABLE
  const table = new THREE.Group();
  table.name="PokerTable";
  table.position.set(tableFocus.x, tableTopY, tableFocus.z);
  group.add(table);

  const feltTex = makeFeltTex();
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45,1.55,0.16,48),
    new THREE.MeshStandardMaterial({ map:feltTex, color:0xffffff, roughness:0.85 })
  );
  top.position.y=0;
  table.add(top);

  const stem=new THREE.Mesh(
    new THREE.CylinderGeometry(0.22,0.32,0.9,22),
    new THREE.MeshStandardMaterial({ color:0x151822, roughness:0.8 })
  );
  stem.position.y=-0.55; table.add(stem);

  const base=new THREE.Mesh(
    new THREE.CylinderGeometry(0.9,1.05,0.18,28),
    new THREE.MeshStandardMaterial({ color:0x10131a, roughness:0.9 })
  );
  base.position.y=-1.05; table.add(base);

  // table collider
  const tableCol=new THREE.Mesh(
    new THREE.CylinderGeometry(1.75,1.75,1.35,24),
    new THREE.MeshBasicMaterial({visible:false})
  );
  tableCol.position.copy(table.position).add(new THREE.Vector3(0,-0.40,0));
  group.add(tableCol);
  colliders.push(tableCol);

  // RAIL (solid)
  const rail=new THREE.Mesh(
    new THREE.TorusGeometry(3.85,0.08,10,64),
    new THREE.MeshStandardMaterial({ color:0x10131a, roughness:0.65, emissive:0xff2d7a, emissiveIntensity:0.10 })
  );
  rail.rotation.x=Math.PI/2;
  rail.position.set(tableFocus.x,0.95,tableFocus.z);
  group.add(rail);

  const railCol=new THREE.Mesh(
    new THREE.TorusGeometry(3.85,0.24,10,32),
    new THREE.MeshBasicMaterial({visible:false})
  );
  railCol.rotation.x=Math.PI/2;
  railCol.position.copy(rail.position);
  group.add(railCol);
  colliders.push(railCol);

  // CHAIRS + SEATS
  function chair(angle,i){
    const c=new THREE.Group(); c.name="Chair_"+i;
    const r=2.6;
    c.position.set(tableFocus.x+Math.cos(angle)*r,0,tableFocus.z+Math.sin(angle)*r);
    c.rotation.y=-angle+Math.PI/2;

    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.10,0.55),
      new THREE.MeshStandardMaterial({color:0x1a1f2a,roughness:0.85})
    );
    seat.position.y=metrics.seatY;
    c.add(seat);

    const back=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.60,0.10),
      new THREE.MeshStandardMaterial({color:0x171b24,roughness:0.9})
    );
    back.position.set(0,metrics.seatY+0.32,-0.24);
    c.add(back);

    const anchor=new THREE.Object3D();
    anchor.position.set(0,metrics.seatY+0.02,0.08);
    c.add(anchor);

    const col=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.0,0.7), new THREE.MeshBasicMaterial({visible:false}));
    col.position.set(0,0.5,0);
    c.add(col);
    colliders.push(col);

    group.add(c);
    seats.push({index:i, anchor, yaw:c.rotation.y});
  }

  for(let i=0;i<6;i++){
    chair((i/6)*Math.PI*2 + Math.PI/6, i);
  }
  chair(Math.PI/2, 7);

  function getSeats(){ return seats; }

  // GUARD (moved OUTSIDE rail, front)
  function mannequin(color=0x1b2130){
    const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color,roughness:0.8});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.55,8,16), mat);
    body.position.y=1.0;
    g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.14,18,14), mat);
    head.position.y=1.55;
    g.add(head);
    return g;
  }

  const guard = mannequin(0x1b2130);
  guard.name="RailGuard";
  guard.position.set(tableFocus.x, 0, tableFocus.z + 5.0); // ✅ outside front
  group.add(guard);

  // DOORS LEFT/RIGHT
  function doorway(tex, x, z, label){
    const frame=new THREE.Mesh(new THREE.BoxGeometry(3.2,4.6,0.22),
      new THREE.MeshStandardMaterial({color:0x10131a,roughness:0.7,emissive:0x220010,emissiveIntensity:0.18})
    );
    frame.position.set(x,2.3,z);
    frame.rotation.y = (x<0)?Math.PI/2:-Math.PI/2;
    group.add(frame);
    colliders.push(frame);

    const plane=new THREE.Mesh(new THREE.PlaneGeometry(2.6,4.0),
      new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:1,depthWrite:false})
    );
    plane.position.set(x + (x<0?0.13:-0.13),2.1,z);
    plane.rotation.y = (x<0)?Math.PI/2:-Math.PI/2;
    plane.renderOrder=60;
    group.add(plane);

    const pad=new THREE.Mesh(new THREE.RingGeometry(0.45,0.62,48),
      new THREE.MeshBasicMaterial({color:0x7fe7ff,transparent:true,opacity:0.75,side:THREE.DoubleSide})
    );
    pad.rotation.x=-Math.PI/2;
    pad.position.set(x + (x<0?1.2:-1.2),0.03,z);
    pad.name=label+"_TeleportPad";
    group.add(pad);
    colliders.push(pad);

    return {pad};
  }

  const storeDoor = doorway(storeDoorTex, -ROOM_W/2 + 0.2, 0, "STORE");
  const pokerDoor = doorway(pokerDoorTex,  ROOM_W/2 - 0.2, 0, "POKER");

  // WATER FOUNTAIN (corner)
  const fountain=new THREE.Group();
  fountain.name="WaterFountain";
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.9,0.35,26),
    new THREE.MeshStandardMaterial({color:0x2a2f3a,roughness:0.7,metalness:0.05})
  );
  bowl.position.y=0.18;
  fountain.add(bowl);

  const water=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.62,0.05,22),
    new THREE.MeshStandardMaterial({color:0x2aa8ff,roughness:0.2,emissive:0x0a2a55,emissiveIntensity:0.35,transparent:true,opacity:0.65})
  );
  water.position.y=0.33;
  fountain.add(water);

  fountain.position.set(-ROOM_W/2 + 2.5, 0, -ROOM_D/2 + 2.5);
  group.add(fountain);
  colliders.push(bowl);

  // BOTS
  try { Bots.init({ THREE, scene, getSeats, tableFocus, metrics }); } catch (e) { console.error(e); L("[world] Bots init failed ❌"); }

  function connect({ playerRig, camera } = {}) {
    try { Bots.setPlayerRig(playerRig, camera); } catch {}
  }

  function tick(dt){
    try { Bots.update(dt); } catch {}
    const t=performance.now()*0.001;
    storeDoor.pad.material.opacity=0.55+Math.sin(t*3.0)*0.18;
    pokerDoor.pad.material.opacity=0.55+Math.sin((t+0.7)*3.0)*0.18;
    rail.material.emissiveIntensity=0.09+Math.sin(t*2.0)*0.05;
  }

  // ✅ Spawn ON teleport circle
  const spawn = { x: 0, y: 0, z: 3.6 };

  L("[world] ready ✅");
  return { group, floor, colliders, tableFocus, tableTopY, metrics, getSeats, connect, tick, spawn };
                }

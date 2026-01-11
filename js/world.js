import * as THREE from "three";

export const HybridWorld = (() => {
  const S = {
    THREE,
    renderer:null,
    camera:null,
    player:null,
    controllers:null,
    log: console.log,

    scene:null,
    clock:null,
    root:null,
    floor:null,

    // teleport internals
    _ray: null,
    _tmpQ: null,
    _tmpV: null,
    _marker: null,
    _triggerHeld: false
  };

  const safeLog = (...a)=>{ try{ S.log?.(...a); }catch(e){} };

  function makeBaseScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    scene.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    scene.add(dir);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color:0x0b0d14, roughness:0.96, metalness:0.0 })
    );
    floor.rotation.x = -Math.PI/2;
    floor.position.y = 0;
    floor.name = "Floor";
    scene.add(floor);
    S.floor = floor;

    return scene;
  }

  function ensureRoot(){
    if (S.root && S.root.parent === S.scene) return S.root;
    const g = new THREE.Group();
    g.name = "WorldRoot";
    S.scene.add(g);
    S.root = g;
    return g;
  }

  function buildBlueprintWorld(){
    const root = ensureRoot();

    // lobby carpet
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(9.0, 64),
      new THREE.MeshStandardMaterial({ color:0x071025, roughness:0.95 })
    );
    carpet.rotation.x = -Math.PI/2;
    carpet.position.y = 0.01;
    carpet.name = "LobbyCarpet";
    root.add(carpet);

    // lobby landmark ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({
        color:0x7fe7ff,
        roughness:0.35,
        metalness:0.25,
        emissive:0x071025,
        emissiveIntensity:0.35
      })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    root.add(ring);

    // circular lobby boundary (low wall ring)
    const wallMat = new THREE.MeshStandardMaterial({ color:0x0e1220, roughness:0.95 });
    const boundary = new THREE.Mesh(
      new THREE.TorusGeometry(9.2, 0.35, 16, 64),
      wallMat
    );
    boundary.rotation.x = Math.PI/2;
    boundary.position.set(0, 1.1, 0);
    boundary.name = "LobbyBoundary";
    root.add(boundary);

    // hallways
    const hallGeo = new THREE.BoxGeometry(4.0, 2.6, 10.0);
    const hall1 = new THREE.Mesh(hallGeo, wallMat);
    hall1.position.set(-8.5, 1.3, 0);
    hall1.name = "HallwayStore";
    root.add(hall1);

    const hall2 = new THREE.Mesh(hallGeo, wallMat);
    hall2.position.set(8.5, 1.3, 0);
    hall2.name = "HallwayScorpion";
    root.add(hall2);

    // room shells
    const roomGeo = new THREE.BoxGeometry(10, 3.2, 10);
    const storeRoom = new THREE.Mesh(roomGeo, wallMat);
    storeRoom.position.set(-14.5, 1.6, 0);
    storeRoom.name = "StoreRoomShell";
    root.add(storeRoom);

    const scorpionRoom = new THREE.Mesh(roomGeo, wallMat);
    scorpionRoom.position.set(14.5, 1.6, 0);
    scorpionRoom.name = "ScorpionRoomShell";
    root.add(scorpionRoom);

    // jumbotron placeholder
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5.6),
      new THREE.MeshStandardMaterial({ color:0x101325, emissive:0x0b1130, emissiveIntensity:0.45 })
    );
    screen.position.set(0, 3.1, -10.5);
    screen.name = "Jumbotron";
    root.add(screen);

    // ✅ sunken table build
    const feltRadius = 2.2;
    const rimRadius = feltRadius + 0.25;
    const tableY = 0.82;

    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius+0.9, rimRadius+0.9, 0.25, 48),
      new THREE.MeshStandardMaterial({ color:0x0a0c12, roughness:0.95 })
    );
    pit.position.set(0, 0.35, 0);
    pit.name = "TablePit";
    root.add(pit);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius+0.35, rimRadius+0.35, 0.22, 48),
      new THREE.MeshStandardMaterial({ color:0x141720, roughness:0.9, metalness:0.05 })
    );
    body.position.set(0, tableY, 0);
    body.name = "TableBody";
    root.add(body);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(feltRadius, feltRadius, 0.10, 64),
      new THREE.MeshStandardMaterial({ color:0x0c2a22, roughness:0.95, metalness:0.02 })
    );
    felt.position.set(0, tableY + 0.16, 0);
    felt.name = "TableFelt";
    root.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius, 0.09, 14, 80),
      new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.6, metalness:0.1 })
    );
    rim.rotation.x = Math.PI/2;
    rim.position.set(0, tableY + 0.21, 0);
    rim.name = "TableRim";
    root.add(rim);

    // seats (8)
    const seatRadius = rimRadius + 1.05;
    const stoolMat = new THREE.MeshStandardMaterial({ color:0x141414, roughness:0.85 });

    for (let i=0; i<8; i++){
      const a = (i/8) * Math.PI * 2;
      const x = Math.sin(a) * seatRadius;
      const z = Math.cos(a) * seatRadius;

      const stool = new THREE.Group();
      stool.name = `Seat_${i}`;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.45,18), stoolMat);
      base.position.y = 0.35;
      stool.add(base);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.08,22), stoolMat);
      top.position.y = 0.62;
      stool.add(top);

      stool.position.set(x, 0, z);
      stool.lookAt(0, 0, 0);

      root.add(stool);
    }

    safeLog("[world] blueprint built ✅ (world-only)");
  }

  function installTeleport(){
    S._ray = new THREE.Raycaster();
    S._tmpQ = new THREE.Quaternion();
    S._tmpV = new THREE.Vector3();

    // marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color:0x7fe7ff, transparent:true, opacity:0.85 })
    );
    marker.rotation.x = -Math.PI/2;
    marker.visible = false;
    marker.name = "TeleportMarker";
    S.scene.add(marker);
    S._marker = marker;

    // trigger state via select events
    const c1 = S.controllers?.controller1;
    const c2 = S.controllers?.controller2;

    const onSelectStart = ()=>{ S._triggerHeld = true; };
    const onSelectEnd = ()=>{ S._triggerHeld = false; };

    try{ c1?.addEventListener("selectstart", onSelectStart); c1?.addEventListener("selectend", onSelectEnd); }catch(e){}
    try{ c2?.addEventListener("selectstart", onSelectStart); c2?.addEventListener("selectend", onSelectEnd); }catch(e){}

    safeLog("[teleport] installed ✅ (laser + trigger)");
  }

  function updateTeleport(){
    if (!S.renderer?.xr?.isPresenting){ if (S._marker) S._marker.visible = false; return; }

    const ctrl = S.controllers?.controller2 || S.controllers?.controller1;
    if (!ctrl || !S._ray || !S.floor){ if (S._marker) S._marker.visible = false; return; }

    ctrl.getWorldQuaternion(S._tmpQ);
    const dir = new THREE.Vector3(0,0,-1).applyQuaternion(S._tmpQ).normalize();
    ctrl.getWorldPosition(S._tmpV);

    S._ray.set(S._tmpV, dir);
    const hits = S._ray.intersectObject(S.floor, false);

    if (!hits.length){
      if (S._marker) S._marker.visible = false;
      return;
    }

    const p = hits[0].point;
    S._marker.visible = true;
    S._marker.position.copy(p);

    if (S._triggerHeld){
      S.player.position.set(p.x, 0.02, p.z);
      S._triggerHeld = false;
    }
  }

  return {
    async build({ THREE:THR, renderer, camera, player, controllers, log }){
      S.THREE = THR || THREE;
      S.renderer = renderer;
      S.camera = camera;
      S.player = player;
      S.controllers = controllers || {};
      S.log = log || console.log;

      S.clock = new THREE.Clock();

      S.scene = makeBaseScene();
      if (!S.scene.children.includes(player)) S.scene.add(player);

      // hard spawn
      player.position.set(0, 0.02, 26);
      camera.position.set(0, 1.65, 0);

      // ensure controller visuals exist in world scene (so lasers show in XR)
      try{
        if (S.controllers.controller1 && !S.scene.children.includes(S.controllers.controller1)) S.scene.add(S.controllers.controller1);
        if (S.controllers.controller2 && !S.scene.children.includes(S.controllers.controller2)) S.scene.add(S.controllers.controller2);
      }catch(e){}

      buildBlueprintWorld();
      installTeleport();

      safeLog("[world] build complete ✅ (world-only)");
    },

    frame({ renderer, camera }){
      if (!S.scene) return;
      const dt = S.clock ? S.clock.getDelta() : 0.016;

      // teleport
      try{ updateTeleport(); }catch(e){}

      renderer.render(S.scene, camera);
    }
  };
})();

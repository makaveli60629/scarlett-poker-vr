// /js/seating.js — SeatingSystem v1.0
// Click/pinch seat rings to sit. Stand returns to lobby standing height.
// Works in VR (ray/pinch) and Non-VR (tap/click via ray from camera).

export const SeatingSystem = (() => {
  const S = {
    THREE: null, scene: null, root: null, camera: null, player: null, log: console.log,
    seats: [],
    activeSeat: null,
    enabled: true,
    ray: null,
    tmpV: null,
    tmpDir: null,
    cooldown: 0,
  };

  function safeLog(...a){ try{ S.log?.(...a); }catch(e){} }

  function buildSeatRing(pos, label, color=0x7fe7ff) {
    const THREE = S.THREE;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.26, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(pos);
    ring.userData.seatLabel = label;
    ring.name = `SeatRing_${label}`;
    return ring;
  }

  function createSeatsAroundTable(tablePos, radius=2.9, count=8) {
    const THREE = S.THREE;
    const seats = [];
    for (let i=0; i<count; i++){
      const a = (i / count) * Math.PI*2;
      const p = new THREE.Vector3(
        tablePos.x + Math.sin(a)*radius,
        0.01,
        tablePos.z + Math.cos(a)*radius
      );
      const ring = buildSeatRing(p, `P${i+1}`);
      S.root.add(ring);

      seats.push({
        id: `P${i+1}`,
        index: i,
        ring,
        sitPos: new THREE.Vector3(p.x, 0, p.z),
        sitYaw: Math.atan2(tablePos.x - p.x, tablePos.z - p.z),
      });
    }

    // Spectator spot
    const sp = new THREE.Vector3(tablePos.x + 0, 0.01, tablePos.z + radius + 2.2);
    const spect = buildSeatRing(sp, "SPECTATE", 0xff2d7a);
    S.root.add(spect);
    seats.push({
      id: "SPECTATE",
      index: count,
      ring: spect,
      sitPos: new THREE.Vector3(sp.x, 0, sp.z),
      sitYaw: Math.atan2(tablePos.x - sp.x, tablePos.z - sp.z),
    });

    return seats;
  }

  function sit(seat) {
    if (!seat) return;
    S.activeSeat = seat;

    // Seat = lower camera a bit (sit), and position player at seat
    S.player.position.set(seat.sitPos.x, 0, seat.sitPos.z);
    S.player.rotation.set(0, seat.sitYaw, 0);
    S.camera.position.set(0, 1.20, 0);

    safeLog("[seat] sit", seat.id);
  }

  function stand(spawn) {
    S.activeSeat = null;
    if (spawn) S.player.position.set(spawn.x, 0, spawn.z);
    S.camera.position.set(0, 1.65, 0);
    safeLog("[seat] stand");
  }

  function pickSeatFromRay() {
    if (!S.enabled) return null;
    const hits = S.ray.intersectObjects(S.seats.map(s=>s.ring), false);
    if (!hits.length) return null;
    const obj = hits[0].object;
    return S.seats.find(s => s.ring === obj) || null;
  }

  function updateRayFromCamera() {
    // Ray from camera forward
    S.camera.getWorldPosition(S.tmpV);
    S.tmpDir.set(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();
    S.ray.set(S.tmpV, S.tmpDir);
  }

  function updateHighlight(hitSeat) {
    for (const s of S.seats) {
      const isHot = hitSeat && s === hitSeat;
      const mat = s.ring.material;
      mat.opacity = isHot ? 1.0 : 0.85;
      mat.color.setHex(s.id === "SPECTATE" ? 0xff2d7a : (isHot ? 0x4cd964 : 0x7fe7ff));
    }
  }

  function tryClickSelect(hitSeat) {
    if (!hitSeat) return false;
    // If seat = spectate or player seat
    sit(hitSeat);
    return true;
  }

  function init({ THREE, scene, root, camera, player, log, tablePos, seatCount=8 }) {
    S.THREE = THREE; S.scene = scene; S.root = root; S.camera = camera; S.player = player; S.log = log || console.log;
    S.ray = new THREE.Raycaster();
    S.tmpV = new THREE.Vector3();
    S.tmpDir = new THREE.Vector3();

    S.seats = createSeatsAroundTable(tablePos || new THREE.Vector3(0,0,0), 2.9, seatCount);
    safeLog("[seat] init ✅ seats=", S.seats.length);

    return {
      sit, stand,
      setEnabled(v){ S.enabled = !!v; },
      get activeSeat(){ return S.activeSeat; },
      update(dt){
        S.cooldown = Math.max(0, S.cooldown - dt);
        updateRayFromCamera();
        const hitSeat = pickSeatFromRay();
        updateHighlight(hitSeat);
      },
      click(){
        if (S.cooldown > 0) return;
        updateRayFromCamera();
        const hitSeat = pickSeatFromRay();
        if (tryClickSelect(hitSeat)) S.cooldown = 0.25;
      }
    };
  }

  return { init };
})();

// /js/modules/seat_system.js
// Seat / Sit / Join logic (VIP open seat first). Reusable for other tables later.
export function installSeatSystem({ THREE, rig, camera, renderer, dwrite }, { seats }){
  window.__scarlettOnSeatChange = window.__scarlettOnSeatChange || [];
  const state = {
    seated: false,
    activeSeatId: null,
    standPos: new THREE.Vector3().copy(rig.position),
    standYaw: rig.rotation.y,
    moveEnabled: true,
  };

  // Simple HUD hooks (no extra UI required)
  const btnJoin = document.createElement("button");
  btnJoin.id = "btnJoinSeat";
  btnJoin.textContent = "Join Seat";
  btnJoin.style.display = "none";

  const btnLeave = document.createElement("button");
  btnLeave.id = "btnLeaveSeat";
  btnLeave.textContent = "Stand Up";
  btnLeave.style.display = "none";

  const hudRow = document.querySelector("#hud .row");
  if (hudRow){
    hudRow.appendChild(btnJoin);
    hudRow.appendChild(btnLeave);
  }

  function setCameraSeated(v){
    // camera is inside rig; change local height for seated/standing
    camera.position.y = v ? 1.25 : 1.65;
  }

  function joinSeat(seatId){
    const seat = seats.find(s=>s.id===seatId);
    if (!seat) return;

    state.standPos.copy(rig.position);
    state.standYaw = rig.rotation.y;

    rig.position.copy(seat.position);
    rig.rotation.set(0, seat.yaw, 0);

    state.seated = true;
    state.activeSeatId = seatId;
    setCameraSeated(true);

    btnJoin.style.display = "none";
    btnLeave.style.display = "";

    try{ window.__scarlettAudioCues?.joinSeat?.(); }catch(_){ }
    try{ for (const fn of window.__scarlettOnSeatChange) fn(true, seatId); }catch(_){ }
    dwrite?.(`[seat] joined ${seatId} ✅`);

    // Optional: disable teleport while seated
    try{ window.__scarlettSeatSeated = true; }catch(_){}
  }

  function leaveSeat(){
    if (!state.seated) return;
    rig.position.copy(state.standPos);
    rig.rotation.set(0, state.standYaw, 0);

    state.seated = false;
    state.activeSeatId = null;
    setCameraSeated(false);

    btnJoin.style.display = "none";
    btnLeave.style.display = "none";

    try{ window.__scarlettAudioCues?.standUp?.(); }catch(_){ }
    try{ for (const fn of window.__scarlettOnSeatChange) fn(false, null); }catch(_){ }
    dwrite?.("[seat] stood up ✅");
    try{ window.__scarlettSeatSeated = false; }catch(_){}
  }

  btnJoin.addEventListener("click", ()=>{
    if (state.activeSeatId) joinSeat(state.activeSeatId);
  });
  btnLeave.addEventListener("click", ()=>leaveSeat());

  // Also allow XR controller "squeeze" to stand up quickly when seated
  const c0 = renderer.xr.getController(0);
  c0.addEventListener("squeeze", ()=>{ if (state.seated) leaveSeat(); });

  // Proximity detection
  const tmp = new THREE.Vector3();
  function update(){
    // When seated, keep Join hidden, show Leave
    if (state.seated){
      btnJoin.style.display = "none";
      btnLeave.style.display = "";
      return;
    }

    // If near a seat trigger, offer join
    let found = null;
    for (const s of seats){
      tmp.copy(rig.position);
      const d = tmp.distanceTo(s.position);
      if (d <= (s.radius ?? 0.9)){
        found = s;
        break;
      }
    }

    if (found){
      state.activeSeatId = found.id;
      btnJoin.style.display = "";
      btnLeave.style.display = "none";
      btnJoin.textContent = `Join Seat (${found.label ?? found.id})`;
    } else {
      state.activeSeatId = null;
      btnJoin.style.display = "none";
      btnLeave.style.display = "none";
    }
  }

  dwrite?.("[seat] system installed ✅ (approach open seat)");
  return {
    update,
    joinSeat,
    leaveSeat,
    get seated(){ return state.seated; },
  };
}

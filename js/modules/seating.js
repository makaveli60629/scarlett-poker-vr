import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Seat snapping (tap chair to sit/stand) + arm-rail alignment.
 */
export function createSeatingController({ cameraOrRig, pokerSystem, toast }) {
  let seated = false;
  let currentSeat = 0;

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function sitAt(seatIndex) {
    const seat = pokerSystem?.seats?.[seatIndex];
    if (!seat) return;

    seat.seatAnchor.getWorldPosition(tmp);
    cameraOrRig.position.set(tmp.x, tmp.y + 0.95, tmp.z);

    pokerSystem.pokerSurface.getWorldPosition(tmp2);
    cameraOrRig.lookAt(tmp2.x, tmp2.y + 0.05, tmp2.z);

    seated = true;
    currentSeat = seatIndex;
    toast?.(`Seated: ${seatIndex+1}`);
  }

  function standToLobby(spawnPos = {x:0,y:1.6,z:8}) {
    cameraOrRig.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    cameraOrRig.lookAt(0, 1.2, 0);
    seated = false;
    toast?.('Standing');
  }

  function toggle() {
    if (!seated) sitAt(currentSeat);
    else standToLobby();
  }

  function setSeat(i) {
    currentSeat = Math.max(0, Math.min(7, i));
    if (seated) sitAt(currentSeat);
  }

  window.addEventListener('keydown', (e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 8) setSeat(n-1);
  });

  return { sitAt, standToLobby, toggle, setSeat, get seated(){return seated;}, get seat(){return currentSeat;} };
}

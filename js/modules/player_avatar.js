// /js/modules/player_avatar.js
// Minimal visible player body (torso + shoulders + simple hands) attached to the rig.
// Purpose: you can look down and see an avatar immediately, and we can iterate from here.

export function installPlayerAvatar({ THREE, rig, camera, dwrite }){
  const group = new THREE.Group();
  group.name = "playerAvatar";

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3bd6ff, roughness: 0.75, metalness: 0.05 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.05 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0xffe0c8, roughness: 0.85, metalness: 0.0 });

  // Torso (capsule) positioned below camera
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), bodyMat);
  torso.position.set(0, 0.92, 0);
  group.add(torso);

  // Shoulder bar
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.22), accentMat);
  shoulders.position.set(0, 1.18, 0.05);
  group.add(shoulders);

  // Simple belt / waist ring
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 10, 28), accentMat);
  belt.rotation.x = Math.PI/2;
  belt.position.set(0, 0.70, 0);
  group.add(belt);

  // Hands (simple rounded boxes) — anchored to camera forward, but kept stable
  const handGeo = new THREE.BoxGeometry(0.09, 0.05, 0.13);
  const leftHand = new THREE.Mesh(handGeo, handMat);
  const rightHand = new THREE.Mesh(handGeo, handMat);
  leftHand.name = "handL";
  rightHand.name = "handR";
  group.add(leftHand, rightHand);

  // Small wrist cuffs
  const cuffGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14);
  const leftCuff = new THREE.Mesh(cuffGeo, accentMat);
  const rightCuff = new THREE.Mesh(cuffGeo, accentMat);
  leftCuff.rotation.z = Math.PI/2;
  rightCuff.rotation.z = Math.PI/2;
  group.add(leftCuff, rightCuff);

  // Attach to rig so it moves with player
  rig.add(group);

  // Offsets (tweakable)
  const offsets = {
    handsForward: 0.38,
    handsDown: 0.18,
    handsOut: 0.16,
  };

  const tmpDir = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  function update(){
    // Place hands relative to camera orientation (so looking down shows them naturally)
    camera.getWorldQuaternion(tmpQuat);
    tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat).normalize(); // camera forward
    // World camera position
    camera.getWorldPosition(tmpPos);

    // Derive a basis for left/right from rig yaw (avoid rolling with head tilt)
    const yaw = rig.rotation.y;
    const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
    const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    // Target positions in world
    const base = tmpPos.clone().add(forward.multiplyScalar(offsets.handsForward));
    base.y -= offsets.handsDown;

    const leftWorld = base.clone().add(right.clone().multiplyScalar(-offsets.handsOut));
    const rightWorld = base.clone().add(right.clone().multiplyScalar(offsets.handsOut));

    // Convert world -> rig local by using group.parent (rig)
    rig.worldToLocal(leftWorld);
    rig.worldToLocal(rightWorld);

    leftHand.position.copy(leftWorld);
    rightHand.position.copy(rightWorld);

    // Hands face forward (rig yaw)
    leftHand.rotation.set(0, yaw, 0);
    rightHand.rotation.set(0, yaw, 0);

    leftCuff.position.copy(leftHand.position).add(new THREE.Vector3(0,0,0.075));
    rightCuff.position.copy(rightHand.position).add(new THREE.Vector3(0,0,0.075));
    leftCuff.rotation.set(Math.PI/2, 0, 0);
    rightCuff.rotation.set(Math.PI/2, 0, 0);
  }

  dwrite?.("[avatar] player body attached ✅ (look down)");
  return { group, update };
}

// /js/teleport.js — Teleport mode + confirm

export function createTeleport({ THREE, renderer, scene, player, camera, Diagnostics }) {
  const raycaster = new THREE.Raycaster();

  let teleportOn = true;
  let target = new THREE.Vector3();
  let targetValid = false;

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.25, 24),
    new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);

  // Toggle teleport with left thumbstick click (b2) or X button (b3)
  let lastToggle = 0;

  function update(_dt, { rays, buttons, floor }) {
    const left = buttons?.left || {};
    const right = buttons?.right || {};

    const tNow = performance.now();
    const togglePressed = (left.b2 === 1) || (left.b3 === 1);
    if (togglePressed && (tNow - lastToggle) > 350) {
      teleportOn = !teleportOn;
      lastToggle = tNow;
      Diagnostics.log('TP', `teleport ${teleportOn ? 'ON' : 'OFF'}`);
      Diagnostics.kv('teleport', teleportOn ? 'ON' : 'OFF');
    }

    if (!teleportOn) {
      marker.visible = false;
      return;
    }

    // Use right hand ray for teleport aim
    const ray = rays?.right;
    if (!ray || !floor) {
      marker.visible = false;
      return;
    }

    raycaster.set(ray.origin, ray.dir);
    const hits = raycaster.intersectObject(floor, true);
    if (hits.length) {
      target.copy(hits[0].point);
      targetValid = true;
      marker.visible = true;
      marker.position.copy(target);
    } else {
      targetValid = false;
      marker.visible = false;
    }

    // Confirm teleport on right trigger (b0) release edge
    const trig = right.b0 === 1;
    // simple edge detect
    if (!update._wasTrig) update._wasTrig = 0;
    if (update._wasTrig === 1 && trig === false) {
      if (targetValid) {
        // Move player so camera ends up at target. Keep y at floor; camera y is handled by XR local-floor.
        player.position.set(target.x, 0, target.z);
        Diagnostics.log('TP', `teleport to x=${round(target.x)} z=${round(target.z)}`);
      } else {
        Diagnostics.log('TP', 'no valid target');
      }
    }
    update._wasTrig = trig ? 1 : 0;
  }

  Diagnostics.kv('teleport', teleportOn ? 'ON' : 'OFF');

  return { update };
}

function round(v) {
  return Math.round(v * 100) / 100;
}

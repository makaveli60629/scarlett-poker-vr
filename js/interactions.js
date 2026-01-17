// /js/interactions.js — Ray-based clicking for UI/kiosk

export function createInteractions({ THREE, renderer, scene, camera, Diagnostics }) {
  const raycaster = new THREE.Raycaster();

  function update(_dt, { rays, buttons, targets }) {
    // Use right trigger release as "click" (b0 edge)
    const right = buttons?.right || {};
    const clickNow = right.b0 === 1;
    if (!update._wasClick) update._wasClick = 0;

    const clickReleased = (update._wasClick === 1 && clickNow === 0);
    update._wasClick = clickNow ? 1 : 0;

    if (!clickReleased) return;

    const ray = rays?.right;
    if (!ray) return;

    raycaster.set(ray.origin, ray.dir);

    // Collect interactables: explicit targets + any object with userData.onClick
    const pool = [];
    if (Array.isArray(targets)) pool.push(...targets);
    // Add kiosk hit box if present
    scene.traverse(obj => {
      if (obj?.userData?.onClick) pool.push(obj);
    });

    const hits = raycaster.intersectObjects(pool, true);
    if (!hits.length) return;

    const hit = hits[0].object;
    const fn = hit?.userData?.onClick;
    if (typeof fn === 'function') {
      fn();
      Diagnostics.log('CLICK', `hit ${hit.name || hit.type}`);
    }
  }

  return { update };
}

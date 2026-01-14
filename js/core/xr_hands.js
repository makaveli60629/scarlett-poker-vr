// /js/core/xr_hands.js — ScarlettVR Prime 10.0 (FULL)
// Hands-only visuals (no controller models)
// Uses renderer.xr.getHand(i). Adds simple proxy meshes for visibility.

export const XRHands = (() => {
  function makeHandProxy(THREE, color = 0x66ccff) {
    const geo = new THREE.SphereGeometry(0.03, 14, 14);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.25,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.12
    });
    return new THREE.Mesh(geo, mat);
  }

  return {
    init({ THREE, scene, renderer, Signals, log }) {
      const hand0 = renderer.xr.getHand(0);
      const hand1 = renderer.xr.getHand(1);

      // simple visible proxies so you can SEE something in XR even if joints aren’t available
      const p0 = makeHandProxy(THREE, 0x66ccff);
      const p1 = makeHandProxy(THREE, 0xff6bd6);

      hand0.add(p0);
      hand1.add(p1);

      scene.add(hand0);
      scene.add(hand1);

      log?.("[hands] hands-only init ✅");

      // expose minimal API for other modules
      return {
        hand0,
        hand1,
        getHands() { return [hand0, hand1]; }
      };
    }
  };
})();

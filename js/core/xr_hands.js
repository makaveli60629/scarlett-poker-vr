// /js/core/xr_hands.js — Prime 10.0 (FULL)
// Hands Only: XRHands if available, else geometric proxies attached to controllers.
// IMPORTANT: No controller models.

export const XRHands = (() => {
  function init({ THREE, scene, renderer, Signals, log }) {
    const state = {
      left: { obj:null, type:"none" },
      right:{ obj:null, type:"none" },
      proxies: []
    };

    function makeProxy(handedness) {
      const geo = new THREE.SphereGeometry(0.02, 16, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
      const m = new THREE.Mesh(geo, mat);
      m.name = `HAND_PROXY_${handedness.toUpperCase()}`;
      m.userData.hand = handedness;
      return m;
    }

    function install() {
      // Try XRHands first
      try {
        const h0 = renderer.xr.getHand(0);
        const h1 = renderer.xr.getHand(1);
        if (h0 && h1) {
          h0.name = "XR_HAND_0";
          h1.name = "XR_HAND_1";
          scene.add(h0); scene.add(h1);
          state.left.obj = h0; state.left.type = "xrhand";
          state.right.obj = h1; state.right.type = "xrhand";
          log?.("[hands] XRHands installed ✅");
          return;
        }
      } catch {}

      // Fallback: invisible controllers + proxy mesh
      for (let i=0;i<2;i++){
        const ctrl = renderer.xr.getController(i);
        ctrl.name = `XR_CTRL_${i}`;
        const proxy = makeProxy(i===0 ? "left" : "right");
        ctrl.add(proxy);
        scene.add(ctrl);
        state.proxies.push({ ctrl, proxy });
      }
      state.left.obj = state.proxies[0]?.proxy || null;
      state.right.obj = state.proxies[1]?.proxy || null;
      state.left.type = "proxy";
      state.right.type = "proxy";
      log?.("[hands] Proxy hands installed ✅ (no controller models)");
    }

    renderer.xr.addEventListener("sessionstart", () => {
      install();
      Signals?.emit?.("UI_MESSAGE", { text: "XR session started (Hands Only)", level:"info" });
    });

    renderer.xr.addEventListener("sessionend", () => {
      Signals?.emit?.("UI_MESSAGE", { text: "XR session ended", level:"info" });
    });

    return {
      getHand(hand) {
        return hand === "right" ? state.right.obj : state.left.obj;
      },
      state
    };
  }

  return { init };
})();

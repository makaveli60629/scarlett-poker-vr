// /js/modules/hand_tracking_lazy.js
// Android-safe: only loads Three.js WebXR hand/controller models AFTER entering XR.
// This avoids module import failures on non-XR browsers.

export async function startXRHands({ THREE, scene, renderer, dwrite }, { onHandsActive } = {}){
  try{
    const modHand = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js");
    const modCtrl = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js");
    const { XRHandModelFactory } = modHand;
    const { XRControllerModelFactory } = modCtrl;

    const group = new THREE.Group();
    group.name = "xrHands";
    scene.add(group);

    const handFactory = new XRHandModelFactory();
    const controllerFactory = new XRControllerModelFactory();

    // Controllers (fallback visual)
    const controllerGrip0 = renderer.xr.getControllerGrip(0);
    controllerGrip0.add(controllerFactory.createControllerModel(controllerGrip0));
    group.add(controllerGrip0);

    const controllerGrip1 = renderer.xr.getControllerGrip(1);
    controllerGrip1.add(controllerFactory.createControllerModel(controllerGrip1));
    group.add(controllerGrip1);

    // Hands
    const hand0 = renderer.xr.getHand(0);
    const hand1 = renderer.xr.getHand(1);

    const handModel0 = handFactory.createHandModel(hand0, "mesh");
    const handModel1 = handFactory.createHandModel(hand1, "mesh");
    hand0.add(handModel0);
    hand1.add(handModel1);
    group.add(hand0);
    group.add(hand1);

    let handsWereActive = false;

    function update(){
      const presenting = renderer.xr.isPresenting;
      const active = presenting && ((hand0.joints && hand0.joints.size) || (hand1.joints && hand1.joints.size));
      if (active && !handsWereActive){
        handsWereActive = true;
        dwrite?.("[hands] Quest hand tracking active ✅");
        try{ onHandsActive?.(true); }catch(_){}
      }
      if (!active && handsWereActive){
        handsWereActive = false;
        dwrite?.("[hands] hand tracking inactive (controllers)");
        try{ onHandsActive?.(false); }catch(_){}
      }
    }

    dwrite?.("[hands] XR hands loaded (lazy) ✅");
    return { group, update };
  }catch(err){
    dwrite?.("[hands] lazy load failed: " + (err?.message || err));
    return { update(){} };
  }
}

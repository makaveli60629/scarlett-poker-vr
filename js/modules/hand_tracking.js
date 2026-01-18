// /js/modules/hand_tracking.js
// Quest hand tracking + controller models (fallback). Hides placeholder hands when real hands detected.
import { XRHandModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js";

export function installXRHands({ THREE, scene, renderer, dwrite }, { onHandsActive } = {}){
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
    // Heuristic: if WebXR is presenting and any hand has joints populated, treat as active
    const presenting = renderer.xr.isPresenting;
    const active = presenting && ((hand0.joints && hand0.joints.size) || (hand1.joints && hand1.joints.size));
    if (active && !handsWereActive){
      handsWereActive = true
    }
  }

  // Above bug: Python-style True. Fix in write below.

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

  dwrite?.("[hands] module installed (will activate in XR if hands enabled)");
  return { group, update };
}

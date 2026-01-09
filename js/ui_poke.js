// /js/ui_poke.js — Scarlett UI Poke v1.0 (RIGHT HAND “OK”)
// Purpose:
// - Simple interactable system for pads/buttons in the world.
// - Works with either fingertip poke OR controller ray-hit.
// - Does NOT require main/world changes yet (but you will wire it later).
//
// Later, world.js can call:
//   UIPoke.register({ mesh, onActivate, label })
// and main.js can call:
//   uiPoke.update(dt, primaryPointerState)
//
// Uses the "primaryPointerState" from Inputs.getPrimaryPointerState().

export const UIPoke = (() => {
  let THREE = null;
  let scene = null;

  const S = {
    enabled: true,
    items: [],
    raycaster: null,
    tmpMat: null,
    tmpDir: null,
    tmpPos: null,
    tmpHit: null,
  };

  function pulse(mesh) {
    if (!mesh) return;
    mesh.userData.__pulseT = 0.35;
  }

  function updatePulse(dt) {
    for (const it of S.items) {
      const m = it.mesh;
      if (!m) continue;
      const t = m.userData.__pulseT || 0;
      if (t <= 0) continue;
      m.userData.__pulseT = Math.max(0, t - dt);

      // soft emissive pulse if material supports it
      const mat = m.material;
      if (mat && "emissiveIntensity" in mat) {
        mat.emissiveIntensity = 0.15 + (m.userData.__pulseT * 1.2);
      }
    }
  }

  function getWorldForward(obj, outDir) {
    // forward is -Z
    S.tmpMat.identity().extractRotation(obj.matrixWorld);
    outDir.set(0, 0, -1).applyMatrix4(S.tmpMat).normalize();
  }

  function getWorldPosition(obj, outPos) {
    outPos.setFromMatrixPosition(obj.matrixWorld);
  }

  function rayHitFromObj(obj) {
    getWorldPosition(obj, S.tmpPos);
    getWorldForward(obj, S.tmpDir);
    S.raycaster.set(S.tmpPos, S.tmpDir);
    S.raycaster.far = 12;

    const targets = S.items.map(i => i.mesh).filter(Boolean);
    const hits = S.raycaster.intersectObjects(targets, true);
    return hits?.[0] || null;
  }

  function fingertipHit(handObj) {
    // Best-effort: use index-finger-tip if present, else hand root
    let tip = null;
    try { tip = handObj?.joints?.["index-finger-tip"] || null; } catch {}
    const source = tip || handObj;
    if (!source) return null;

    // small proximity sphere check
    const p = new THREE.Vector3();
    source.getWorldPosition(p);

    let best = null;
    let bestD = Infinity;

    for (const it of S.items) {
      const m = it.mesh;
      if (!m) continue;

      // distance to mesh position (simple but stable)
      const mp = new THREE.Vector3();
      m.getWorldPosition(mp);

      const d = mp.distanceTo(p);
      if (d < (it.radius || 0.18) && d < bestD) {
        best = it;
        bestD = d;
      }
    }

    return best;
  }

  return {
    init({ THREE: _THREE, scene: _scene } = {}) {
      THREE = _THREE;
      scene = _scene;

      S.raycaster = new THREE.Raycaster();
      S.tmpMat = new THREE.Matrix4();
      S.tmpDir = new THREE.Vector3();
      S.tmpPos = new THREE.Vector3();
      S.tmpHit = new THREE.Vector3();

      return this;
    },

    register({ mesh, onActivate, label = "action", radius = 0.18 } = {}) {
      if (!mesh) return;
      S.items.push({ mesh, onActivate, label, radius });
      mesh.userData.__uiLabel = label;
      mesh.userData.__pulseT = 0;

      // ensure emissive exists
      if (mesh.material && "emissive" in mesh.material) {
        mesh.material.emissive.setHex(mesh.material.emissive?.getHex?.() ?? 0x000000);
        mesh.material.emissiveIntensity = mesh.material.emissiveIntensity ?? 0.15;
      }
    },

    clear() {
      S.items.length = 0;
    },

    update(dt, primaryPointerState) {
      if (!S.enabled) return;
      updatePulse(dt);

      const p = primaryPointerState;
      if (!p?.obj) return;

      // Hand mode: fingertip proximity
      if (p.mode === "hand") {
        const hit = fingertipHit(p.obj);
        if (hit && p.activate) {
          pulse(hit.mesh);
          try { hit.onActivate?.(hit); } catch {}
        }
        return;
      }

      // Controller mode: ray hit
      if (p.mode === "controller") {
        const rh = rayHitFromObj(p.obj);
        if (!rh) return;

        // find owner item
        const item = S.items.find(it => it.mesh === rh.object || it.mesh === rh.object?.parent) ||
                     S.items.find(it => it.mesh === rh.object?.parent?.parent) || null;

        if (item && p.activate) {
          pulse(item.mesh);
          try { item.onActivate?.(item); } catch {}
        }
      }
    }
  };
})();

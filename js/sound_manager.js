// /js/sound_manager.js — Scarlett Spatial Audio v1.0 (Quest-safe)
// ✅ PositionalAudio for chips/cards with distance falloff
// ✅ Ambient loop anchored in-world (not in your face)
// ✅ Play-at-position helper (moves emitter to action point)
// ✅ Prevents spam by stopping/restarting short clips safely

export const Sound = (() => {
  let THREE = null;
  let listener = null;
  let loader = null;
  let ready = false;

  const S = {
    master: 0.9,
    sounds: {},      // key -> PositionalAudio
    anchors: {},     // key -> Object3D anchor
    _tmpObj: null,   // fallback object to position sounds when playing "at" a point
  };

  function init({ THREE: T, camera, scene, log = console.log }) {
    THREE = T;
    loader = new THREE.AudioLoader();

    listener = new THREE.AudioListener();
    camera.add(listener);

    S._tmpObj = new THREE.Object3D();
    S._tmpObj.name = "SoundTmpAnchor";
    scene.add(S._tmpObj);

    ready = true;
    log?.("[audio] listener attached ✅");
  }

  function create(key, file, {
    volume = 0.6,
    refDistance = 2.0,
    rolloffFactor = 1.5,
    maxDistance = 35,
    loop = false
  } = {}) {
    if (!ready) return null;

    const a = new THREE.PositionalAudio(listener);

    // Set params early (buffer comes later)
    a.setRefDistance(refDistance);
    a.setRolloffFactor(rolloffFactor);
    a.setMaxDistance(maxDistance);
    a.setLoop(loop);
    a.setVolume(volume * S.master);

    loader.load(
      file,
      (buffer) => {
        a.setBuffer(buffer);
        // If loop ambient, you may start it later after placing/attaching
      },
      undefined,
      (err) => console.warn("[audio] load failed", file, err)
    );

    S.sounds[key] = a;
    return a;
  }

  function attach(key, object3D) {
    const a = S.sounds[key];
    if (!a || !object3D) return;
    object3D.add(a);
    S.anchors[key] = object3D;
  }

  function setMasterVolume(v) {
    S.master = Math.max(0, Math.min(1, v));
    for (const k in S.sounds) {
      const a = S.sounds[k];
      if (!a) continue;
      // keep relative volume; just clamp again
      a.setVolume(Math.min(1, a.getVolume()) * S.master);
    }
  }

  function play(key) {
    const a = S.sounds[key];
    if (!a || !a.buffer) return;
    // Restart short SFX cleanly
    if (a.isPlaying) a.stop();
    a.setVolume(Math.min(1, a.getVolume())); // keep current
    a.play();
  }

  // Play from a world position (chip hit point, card landing, etc.)
  function playAt(key, worldPos) {
    const a = S.sounds[key];
    if (!a || !a.buffer) return;

    // Move anchor to the action point
    S._tmpObj.position.copy(worldPos);
    if (a.parent !== S._tmpObj) {
      // reparent safely
      if (a.parent) a.parent.remove(a);
      S._tmpObj.add(a);
    }

    if (a.isPlaying) a.stop();
    a.play();
  }

  return { init, create, attach, play, playAt, setMasterVolume };
})();

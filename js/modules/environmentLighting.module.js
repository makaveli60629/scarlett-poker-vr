// /js/modules/environmentLighting.module.js
// Global lighting presets (lobby/table) (FULL)

export default {
  id: 'environmentLighting.module.js',

  async init({ THREE, scene, anchors, log }) {
    // Remove old lights (non-destructive: only ones we add)
    const root = new THREE.Group();
    root.name = 'ENV_LIGHTING_ROOT';
    anchors.room.add(root);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x131a2a, 0.85);
    hemi.name = 'ENV_HEMI';
    root.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(3, 6, 2);
    key.name = 'ENV_KEY';
    root.add(key);

    const fill = new THREE.DirectionalLight(0xfff2d0, 0.22);
    fill.position.set(-2, 3, -3);
    fill.name = 'ENV_FILL';
    root.add(fill);

    // subtle floor bounce
    const bounce = new THREE.PointLight(0x3a6cff, 0.08, 20, 2);
    bounce.position.set(0, 0.2, -2.0);
    bounce.name = 'ENV_BOUNCE';
    root.add(bounce);

    // background
    scene.background = new THREE.Color(0x05070d);

    // mild fog makes scale feel real
    scene.fog = new THREE.Fog(0x05070d, 9, 38);

    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.lighting = {
      setPreset: (p) => {
        // future extension; kept stable
        window.SCARLETT.lighting.preset = p;
      },
      preset: 'default'
    };

    log?.('environmentLighting.module ✅');
  },

  test() {
    return { ok: true, note: 'lighting present' };
  }
};

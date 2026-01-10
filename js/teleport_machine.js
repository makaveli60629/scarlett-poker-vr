// /js/teleport_machine.js — Scarlett Teleport Machine (HARDENED) v2.0
export const TeleportMachine = {
  init(ctx = {}) {
    const THREE = ctx.THREE || globalThis.THREE;
    const scene = ctx.scene;
    const log = ctx.log || console.log;

    // Some older code destructures { world } and expects world.mount()
    // Harden: accept ctx.world OR ctx OR ctx.worldBuilder shapes
    const worldObj =
      ctx.world ||
      ctx?.ctx?.world ||
      ctx?.worldObj ||
      {};

    // Guaranteed mount:
    const mount =
      worldObj.mount ||
      ctx.mount ||
      ((obj) => {
        if (scene && obj?.isObject3D) scene.add(obj);
      });

    // Also re-attach it back so future modules can use it
    if (!worldObj.mount) worldObj.mount = mount;
    ctx.world = worldObj;

    if (!THREE || !scene) {
      log("[teleport_machine] missing THREE/scene, abort");
      return;
    }

    // --- Build the machine (simple, visible, glowy) ---
    const root = new THREE.Group();
    root.name = "TeleportMachine";
    root.position.set(-10, 0, 10); // visible corner
    mount(root);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.35, 36),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.55, metalness: 0.25 })
    );
    base.position.y = 0.18;
    root.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.25, metalness: 0.55, emissive: 0x003344, emissiveIntensity: 0.9 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    root.add(ring);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 2.0, 24),
      new THREE.MeshStandardMaterial({ color: 0x10142a, roughness: 0.4, metalness: 0.35 })
    );
    pillar.position.y = 1.25;
    root.add(pillar);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a })
    );
    core.position.y = 2.3;
    root.add(core);

    const light = new THREE.PointLight(0x7fe7ff, 1.8, 18);
    light.position.set(0, 2.2, 0);
    root.add(light);

    // Register a spawn you can teleport to later
    if (ctx.addSpawn && THREE.Vector3) {
      ctx.addSpawn("teleport_machine", root.position.clone().add(new THREE.Vector3(0, 0, 3)), Math.PI);
    }

    // Animate
    let t = 0;
    if (ctx.addTicker) {
      ctx.addTicker((dt) => {
        t += dt;
        ring.rotation.z += dt * 0.8;
        core.position.y = 2.3 + Math.sin(t * 2.5) * 0.08;
        light.intensity = 1.5 + Math.sin(t * 1.7) * 0.25;
      });
    }

    log("[teleport_machine] init ✅ hardened + visible");
  }
};

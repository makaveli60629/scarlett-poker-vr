// /js/scarlett1/modules/world/jumbotron_signage_module.js
// Jumbotron + Signage Module (FULL) — Quest safe

export function createJumbotronSignageModule() {
  return {
    name: "jumbotron_signage",
    onEnable(ctx) {
      const THREE = ctx.THREE;

      const group = new THREE.Group();
      group.name = "JumbotronSignage";

      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x0f0f18,
        roughness: 0.65,
        metalness: 0.15,
        emissive: 0x111122,
        emissiveIntensity: 0.35,
      });

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x10102a,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x2233aa,
        emissiveIntensity: 0.55,
      });

      const r = 11.2;
      const y = 2.7;

      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * Math.PI * 2;
        const x = Math.cos(t) * r;
        const z = Math.sin(t) * r;

        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 0.2), panelMat);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), screenMat);

        frame.position.set(x, y, z);
        frame.rotation.y = -t + Math.PI / 2;

        screen.position.set(0, 0, 0.101);
        frame.add(screen);
        group.add(frame);
      }

      // center banner
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x0f0f18, emissive: 0x33ffff, emissiveIntensity: 0.35 })
      );
      banner.position.set(0, 3.4, -10.7);
      group.add(banner);

      ctx.scene.add(group);
    },
  };
}

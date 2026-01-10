// /js/scorpion_room.js — Scorpion Room (FULL safe stub)
// - Builds a right-side landmark + portal pad.
// - Exports: ScorpionRoom.build(ctx)

export const ScorpionRoom = {
  build(ctx) {
    const { THREE, scene, world, log } = ctx;
    const ui = (m) => (log ? log(m) : console.log(m));

    const g = new THREE.Group();
    g.name = "scorpion_room";
    scene.add(g);

    // Right side placement (table center at 0, store left, scorpion right)
    g.position.set(7.0, 0.0, 0.0);

    // Big neon arch
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.12, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0xff2d7a, emissiveIntensity: 1.2, roughness: 0.35, metalness: 0.2 })
    );
    arch.position.set(0, 2.0, 0);
    arch.rotation.x = Math.PI / 2;
    g.add(arch);

    // Portal pad
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: 0x11131c, roughness: 0.85, metalness: 0.05, emissive: 0x220010, emissiveIntensity: 0.7 })
    );
    pad.position.set(0, 0.04, 0);
    g.add(pad);

    // Label
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.6),
      new THREE.MeshBasicMaterial({ transparent:true, opacity:0.95 })
    );
    sign.position.set(0, 2.45, -0.9);
    g.add(sign);

    // Canvas label texture (always works)
    {
      const c = document.createElement("canvas");
      c.width = 1024; c.height = 256;
      const x = c.getContext("2d");
      x.fillStyle = "rgba(10,12,20,.75)"; x.fillRect(0,0,c.width,c.height);
      x.strokeStyle = "rgba(255,45,122,.85)"; x.lineWidth = 10; x.strokeRect(10,10,c.width-20,c.height-20);
      x.fillStyle = "rgba(255,45,122,.95)";
      x.font = "bold 92px system-ui";
      x.fillText("SCORPION", 58, 150);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      sign.material.map = tex;
      sign.material.needsUpdate = true;
    }

    // Add a collider marker (optional)
    world.colliders.push(pad);

    // Expose a “portal” point
    world.points = world.points || {};
    world.points.scorpion = g.position.clone().add(new THREE.Vector3(0, 0, 0));

    ui("[scorpion] build ✅ (right side)");
    return g;
  }
};

// /js/avatar_system.js — AvatarSystem v1 (Stylized Low-Poly Humanoid)
// ✅ Lightweight (pure geometry, no GLTF)
// ✅ Works with controllers (hands attached to controllers)
// ✅ Optional "body" attached to player rig (non-XR + XR)
// ✅ Watch stays wherever your world.js attaches it (left controller)

export const AvatarSystem = (() => {
  function init(ctx) {
    const { THREE, player, controllers, log } = ctx;

    const root = new THREE.Group();
    root.name = "AVATAR_ROOT";
    player.add(root);

    // ===== Materials (low-poly elegant) =====
    const matSkin = new THREE.MeshStandardMaterial({
      color: 0xd9c7b3, roughness: 0.85, metalness: 0.02
    });
    const matCloth = new THREE.MeshStandardMaterial({
      color: 0x1c2433, roughness: 0.95, metalness: 0.02
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: 0x66ccff, roughness: 0.35, metalness: 0.55,
      emissive: new THREE.Color(0x66ccff), emissiveIntensity: 0.10
    });

    // ===== Body (stylized, low poly) =====
    // Note: We keep body subtle so it doesn't fight with camera.
    const body = new THREE.Group();
    body.name = "AVATAR_BODY";
    root.add(body);

    const chest = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.23, 0), // low poly
      matCloth
    );
    chest.scale.set(1.15, 1.4, 0.85);
    chest.position.set(0, 1.35, 0.05);
    body.add(chest);

    const shoulders = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.17, 0),
      matCloth
    );
    shoulders.scale.set(1.55, 0.65, 0.85);
    shoulders.position.set(0, 1.50, 0.02);
    body.add(shoulders);

    const hips = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 0),
      matCloth
    );
    hips.scale.set(1.1, 0.7, 0.9);
    hips.position.set(0, 1.10, 0.03);
    body.add(hips);

    // neck + head (kept subtle so it doesn't clip camera too much)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.10, 8), matSkin);
    neck.position.set(0, 1.60, 0.06);
    body.add(neck);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), matSkin);
    head.scale.set(1.0, 1.05, 0.95);
    head.position.set(0, 1.78, 0.06);
    body.add(head);

    // tiny crown/halo accent (optional style)
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 18), matAccent);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 1.95, 0.06);
    body.add(halo);

    // ===== Hands (better silhouette than blocky) =====
    // We attach to controllers so it follows your lasers.
    const leftHand = makeHand(THREE, matSkin, matCloth, true);
    const rightHand = makeHand(THREE, matSkin, matCloth, false);

    controllers?.c0?.add(leftHand);
    controllers?.c1?.add(rightHand);

    // Save refs in ctx so world can toggle if needed
    ctx.avatar = ctx.avatar || {};
    ctx.avatar.root = root;
    ctx.avatar.body = body;
    ctx.avatar.leftHand = leftHand;
    ctx.avatar.rightHand = rightHand;

    log?.("[avatar] AvatarSystem v1 init ✅");

    return {
      setVisible(v) {
        root.visible = !!v;
      },
      setHandsVisible(v) {
        leftHand.visible = !!v;
        rightHand.visible = !!v;
      },
      setBodyVisible(v) {
        body.visible = !!v;
      },
      update(dt, t) {
        // subtle idle so it feels alive (but not annoying)
        const bob = Math.sin(t * 1.6) * 0.01;
        body.position.y = bob;
        halo.rotation.z += dt * 0.35;
      }
    };
  }

  function makeHand(THREE, matSkin, matCloth, isLeft) {
    const g = new THREE.Group();
    g.name = isLeft ? "HAND_L" : "HAND_R";

    // Palm (rounded low-poly)
    const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), matCloth);
    palm.scale.set(1.15, 0.65, 1.35);
    palm.position.set(0, -0.005, -0.03);
    g.add(palm);

    // Back-of-hand (skin hint)
    const back = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), matSkin);
    back.scale.set(1.2, 0.55, 1.0);
    back.position.set(0, 0.015, -0.045);
    g.add(back);

    // Fingers (three low-poly “segments”)
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), matSkin);
      f.scale.set(0.9, 0.65, 1.45);
      f.position.set(-0.02 + i * 0.02, 0.01, -0.075);
      g.add(f);
    }

    // Thumb
    const th = new THREE.Mesh(new THREE.IcosahedronGeometry(0.016, 0), matSkin);
    th.scale.set(0.9, 0.65, 1.25);
    th.position.set(isLeft ? -0.05 : 0.05, 0.005, -0.045);
    th.rotation.y = isLeft ? 0.6 : -0.6;
    g.add(th);

    // Wrist cuff
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.04, 10), matCloth);
    cuff.position.set(0, -0.03, -0.01);
    g.add(cuff);

    // Position/orient relative to controller
    g.position.set(isLeft ? -0.012 : 0.012, -0.012, -0.02);
    g.rotation.set(-0.25, 0, 0);
    return g;
  }

  return { init };
})();

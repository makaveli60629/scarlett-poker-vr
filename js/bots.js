// /js/bots.js — Scarlett Bots 9.2 (NO three import)

import { createAvatarRig } from "./avatar_rig.js";

export const Bots = (() => {
  let THREE, scene, getSeats, getLobbyZone, tableFocus;
  const bots = [];
  const walkers = [];

  function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    getSeats = ctx.getSeats;
    getLobbyZone = ctx.getLobbyZone;
    tableFocus = ctx.tableFocus;

    // seated bots (6)
    const seats = getSeats();
    for (let i = 0; i < seats.length; i++) {
      const gender = i % 2 === 0 ? "male" : "female";
      const tex = gender === "male"
        ? "assets/textures/avatars/suit_male_albedo.png"
        : "assets/textures/avatars/suit_female_albedo.png";

      const rig = createAvatarRig({ THREE, textureUrl: tex, gender });

      rig.root.name = `Bot_Seat_${i}`;
      rig.root.position.copy(seats[i].position);

      // align to chair yaw
      rig.root.rotation.y = seats[i].yaw;

      // seat height alignment (chair seat ~0.50, table felt ~0.92)
      // put hips slightly above chair seat so body is not in floor
      rig.root.position.y = 0.0;

      rig.setPose("sit");
      rig.playWalk(false);

      // small “head placeholder”
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 18, 14),
        new THREE.MeshStandardMaterial({ color: 0x10121a, roughness: 0.55, metalness: 0.15, emissive: 0x05060a })
      );
      head.position.set(0, 1.48, 0.06);
      rig.root.add(head);

      scene.add(rig.root);
      bots.push({ rig, mode: "sit" });
    }

    // lobby walkers (4)
    const z = getLobbyZone();
    for (let i = 0; i < 4; i++) {
      const gender = i % 2 === 0 ? "male" : "female";
      const tex = gender === "male"
        ? "assets/textures/avatars/suit_male_albedo.png"
        : "assets/textures/avatars/suit_female_albedo.png";

      const rig = createAvatarRig({ THREE, textureUrl: tex, gender });
      rig.root.name = `Bot_Walker_${i}`;

      rig.root.position.set(
        THREE.MathUtils.lerp(z.min.x, z.max.x, Math.random()),
        0,
        THREE.MathUtils.lerp(z.min.z, z.max.z, Math.random())
      );

      rig.setPose("idle");
      rig.playWalk(true);

      // head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 18, 14),
        new THREE.MeshStandardMaterial({ color: 0x10121a, roughness: 0.55, metalness: 0.15, emissive: 0x05060a })
      );
      head.position.set(0, 1.48, 0.06);
      rig.root.add(head);

      // target
      const target = new THREE.Vector3(
        THREE.MathUtils.lerp(z.min.x, z.max.x, Math.random()),
        0,
        THREE.MathUtils.lerp(z.min.z, z.max.z, Math.random())
      );

      scene.add(rig.root);
      walkers.push({ rig, target, speed: 0.55 + Math.random() * 0.25 });
    }
  }

  function update(dt) {
    // update mixers
    for (const b of bots) b.rig.mixer.update(dt);
    for (const w of walkers) w.rig.mixer.update(dt);

    // move walkers
    const z = getLobbyZone();
    for (const w of walkers) {
      const p = w.rig.root.position;
      const to = new THREE.Vector3().subVectors(w.target, p);
      const d = to.length();

      if (d < 0.25) {
        w.target.set(
          THREE.MathUtils.lerp(z.min.x, z.max.x, Math.random()),
          0,
          THREE.MathUtils.lerp(z.min.z, z.max.z, Math.random())
        );
        continue;
      }

      to.normalize();
      p.addScaledVector(to, w.speed * dt);

      // face direction of movement
      const yaw = Math.atan2(to.x, to.z);
      w.rig.root.rotation.y = yaw;
    }
  }

  return { init, update };
})();

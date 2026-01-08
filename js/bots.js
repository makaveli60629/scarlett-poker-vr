// /js/bots.js — Update 9.0 bots system (safe, visible, shirts, crown hook)

import { createTextureKit } from "./textures.js";

export const Bots = {
  async init({ THREE, scene, world, log = console.log }) {
    const tex = createTextureKit(THREE, { log });

    // Optional bot shirt texture (put your file here)
    const SHIRT_TEX = await tex.load("assets/textures/shirt.png").catch(() => null);

    const bots = [];
    const seatCount = Math.min(6, world.seats.length || 6);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });
    const bodyMatA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
    const bodyMatB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });

    function makeBot(i) {
      const g = new THREE.Group();
      g.name = `Bot_${i}`;

      // Body (shirt as a plane on chest)
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 6, 12), i % 2 ? bodyMatA : bodyMatB);
      body.position.y = 0.55;
      g.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), headMat);
      head.position.y = 1.25;
      g.add(head);

      // Shirt billboard
      const shirtMat = SHIRT_TEX
        ? new THREE.MeshStandardMaterial({ map: SHIRT_TEX, transparent: true, roughness: 0.9 })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

      const shirt = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), shirtMat);
      shirt.position.set(0, 0.78, 0.18);
      shirt.rotation.y = Math.PI; // face forward relative to bot look
      shirt.name = "shirt";
      g.add(shirt);

      // Crown placeholder (hidden until winner)
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffd27a, emissiveIntensity: 0.35, roughness: 0.6 })
      );
      crown.position.y = 1.55;
      crown.visible = false;
      crown.name = "crown";
      g.add(crown);

      g.userData.bot = { id: i, seated: false, target: null, crownTimer: 0 };
      scene.add(g);
      return g;
    }

    for (let i = 0; i < 8; i++) bots.push(makeBot(i));

    // seat first 6
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if (i < seatCount) {
        const s = world.seats[i];
        b.position.set(s.position.x, 0, s.position.z);
        b.rotation.y = s.yaw;
        b.userData.bot.seated = true;
      } else {
        b.userData.bot.seated = false;
        sendToLobby(b);
      }
    }

    function sendToLobby(bot) {
      const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
      const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
      bot.position.set(x, 0, z);
      bot.userData.bot.target = bot.position.clone();
    }

    function pickTarget() {
      const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
      const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
      return new THREE.Vector3(x, 0, z);
    }

    function setWinner(botIndex, seconds = 60) {
      for (const b of bots) {
        const c = b.getObjectByName("crown");
        if (c) c.visible = false;
        b.userData.bot.crownTimer = 0;
      }
      const b = bots[botIndex];
      if (!b) return;
      const c = b.getObjectByName("crown");
      if (c) c.visible = true;
      b.userData.bot.crownTimer = seconds;
    }

    log("[world] bots.js (Bots.init) loaded ✅");

    return {
      bots,
      setWinner,
      update(dt) {
        for (const b of bots) {
          const d = b.userData.bot;

          // crown timer
          if (d.crownTimer > 0) {
            d.crownTimer -= dt;
            const c = b.getObjectByName("crown");
            if (c) {
              c.visible = d.crownTimer > 0;
              c.rotation.y += dt * 2.0;
            }
          }

          if (d.seated) continue;

          if (!d.target || b.position.distanceTo(d.target) < 0.25) d.target = pickTarget();

          const dir = d.target.clone().sub(b.position);
          dir.y = 0;
          const dist = dir.length();
          if (dist > 0.001) {
            dir.normalize();
            b.position.addScaledVector(dir, dt * 0.65);
            b.lookAt(d.target.x, b.position.y, d.target.z);
          }
        }
      }
    };
  }
};

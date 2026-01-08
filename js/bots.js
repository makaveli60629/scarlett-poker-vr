// /js/bots.js — Bots 9.0 (shirts + nametags + crown winner + lobby walkers)
// IMPORTANT: no THREE import. Uses THREE passed into init.

export const Bots = {
  async init({ THREE, scene, world, log = console.log, tex }) {
    const bots = [];
    const shirtTex = tex?.load ? tex.load("assets/textures/shirt.png") : null;
    if (shirtTex) shirtTex.colorSpace = THREE.SRGBColorSpace;

    const crownTex = tex?.load ? tex.load("assets/textures/crown_diffuse.png") : null;
    if (crownTex) crownTex.colorSpace = THREE.SRGBColorSpace;

    const bodyMatShirt = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: shirtTex || null,
      roughness: 0.9
    });

    const bodyMatA = new THREE.MeshStandardMaterial({ color: 0x2bd7ff, roughness: 0.85 });
    const bodyMatB = new THREE.MeshStandardMaterial({ color: 0xff2bd6, roughness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 });

    function makeNameTag(text) {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 512, 128);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, 512, 128);
      ctx.font = "bold 52px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 64);
      const t = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), mat);
      plane.position.y = 1.62;
      plane.renderOrder = 999;
      return plane;
    }

    function makeCrown() {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffd27a,
        map: crownTex || null,
        roughness: 0.45,
        metalness: 0.15,
        transparent: true
      });
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 8), mat);
      crown.position.y = 1.48;
      crown.visible = false;
      crown.name = "crown";
      return crown;
    }

    function makeBot(i) {
      const g = new THREE.Group();
      g.name = "Bot_" + i;

      const bodyMat = shirtTex ? bodyMatShirt : (i % 2 ? bodyMatA : bodyMatB);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.58, 6, 12), bodyMat);
      body.position.y = 0.58;
      body.name = "body";
      g.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 14), headMat);
      head.position.y = 1.28;
      head.name = "head";
      g.add(head);

      const nameTag = makeNameTag("BOT " + (i + 1));
      nameTag.name = "nametag";
      g.add(nameTag);

      const crown = makeCrown();
      g.add(crown);

      g.userData.bot = {
        id: i,
        seated: false,
        target: null,
        winner: false,
        winnerTimer: 0,
        speed: 0.85,
      };

      scene.add(g);
      return { id: i, group: g };
    }

    for (let i = 0; i < 8; i++) bots.push(makeBot(i));

    function seatBot(bot, seatIndex) {
      const b = bot.group;
      const s = world.seats[seatIndex];
      b.position.set(s.position.x, 0, s.position.z);
      b.rotation.y = s.yaw;
      b.userData.bot.seated = true;
      b.userData.bot.target = null;
    }

    function sendToLobby(bot) {
      const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
      const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
      bot.group.position.set(x, 0, z);
      bot.group.userData.bot.seated = false;
      bot.group.userData.bot.target = pickLobbyTarget();
    }

    function pickLobbyTarget() {
      const z = THREE.MathUtils.lerp(world.lobbyZone.min.z, world.lobbyZone.max.z, Math.random());
      const x = THREE.MathUtils.lerp(world.lobbyZone.min.x, world.lobbyZone.max.x, Math.random());
      return new THREE.Vector3(x, 0, z);
    }

    // initial: 6 seated, 2 roaming
    for (let i = 0; i < bots.length; i++) {
      if (i < 6) seatBot(bots[i], i);
      else sendToLobby(bots[i]);
    }

    function setWinner(botId, on) {
      for (const b of bots) {
        const crown = b.group.getObjectByName("crown");
        if (b.id === botId) {
          b.group.userData.bot.winner = !!on;
          if (crown) crown.visible = !!on;
          if (on) {
            b.group.userData.bot.winnerTimer = 60; // 1 minute
            // step out to lobby for the victory lap
            sendToLobby(b);
          }
        } else {
          b.group.userData.bot.winner = false;
          if (crown) crown.visible = false;
        }
      }
    }

    function faceCameraTags(cameraPos) {
      for (const b of bots) {
        const tag = b.group.getObjectByName("nametag");
        if (!tag) continue;
        tag.lookAt(cameraPos.x, tag.getWorldPosition(new THREE.Vector3()).y, cameraPos.z);
      }
    }

    return {
      bots,
      seatBot,
      sendToLobby,
      setWinner,
      update(dt) {
        // nametags face the table focus area (good enough; real camera-facing can be added later)
        faceCameraTags(world.tableFocus.clone().add(new THREE.Vector3(0, 2, 6)));

        for (const bot of bots) {
          const g = bot.group;
          const d = g.userData.bot;

          // winner timer countdown
          if (d.winner && d.winnerTimer > 0) {
            d.winnerTimer -= dt;
            if (d.winnerTimer <= 0) {
              d.winner = false;
              const crown = g.getObjectByName("crown");
              if (crown) crown.visible = false;
              // winner goes back to an open seat if available
              // (simple: seat them at seat 0)
              seatBot(bot, 0);
            }
          }

          // seated bots don't wander
          if (d.seated) continue;

          // wander lobby
          if (!d.target || g.position.distanceTo(d.target) < 0.25) d.target = pickLobbyTarget();

          const dir = d.target.clone().sub(g.position);
          dir.y = 0;
          const dist = dir.length();
          if (dist > 0.001) {
            dir.normalize();
            const step = d.speed * dt;
            g.position.addScaledVector(dir, step);
            g.lookAt(d.target.x, g.position.y, d.target.z);
          }
        }
      }
    };
  }
};

// /js/bots.js — Scarlett Poker VR Bots (GitHub Pages SAFE)

export const Bots = (() => {
  let THREE, scene;
  let bots = [];
  let seats = [];
  let lobbyZone = null;
  let t = 0;

  function makeBot(color = 0x5ac8fa) {
    const g = new THREE.Group();
    g.name = "Bot";

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a8, roughness: 0.7 });

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.42, 6, 12),
      bodyMat
    );
    body.position.y = 0.9;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 14),
      skinMat
    );
    head.position.y = 1.25;

    g.add(body, head);

    g.userData = {
      walkPhase: Math.random() * Math.PI * 2,
      isWalking: false,
      target: new THREE.Vector3()
    };

    return g;
  }

  function seatBot(bot, seat) {
    bot.position.copy(seat.position);
    bot.position.y = seat.sitY;
    bot.rotation.y = seat.yaw;
  }

  function placeWalking(bot) {
    const x = THREE.MathUtils.lerp(lobbyZone.min.x, lobbyZone.max.x, Math.random());
    const z = THREE.MathUtils.lerp(lobbyZone.min.z, lobbyZone.max.z, Math.random());
    bot.position.set(x, 0, z);
    bot.userData.target.set(
      THREE.MathUtils.lerp(lobbyZone.min.x, lobbyZone.max.x, Math.random()),
      0,
      THREE.MathUtils.lerp(lobbyZone.min.z, lobbyZone.max.z, Math.random())
    );
    bot.userData.isWalking = true;
  }

  return {
    init({ THREE: _THREE, scene: _scene, getSeats, getLobbyZone }) {
      THREE = _THREE;
      scene = _scene;
      seats = getSeats ? getSeats() : [];
      lobbyZone = getLobbyZone ? getLobbyZone() : null;

      bots.forEach(b => scene.remove(b));
      bots.length = 0;

      // --- seated bots ---
      for (let i = 1; i <= 4; i++) {
        if (!seats[i]) continue;
        const bot = makeBot();
        seatBot(bot, seats[i]);
        scene.add(bot);
        bots.push(bot);
      }

      // --- walking bots ---
      if (lobbyZone) {
        for (let i = 0; i < 2; i++) {
          const bot = makeBot(0xff6b6b);
          placeWalking(bot);
          scene.add(bot);
          bots.push(bot);
        }
      }

      console.log("[Bots] ready:", bots.length);
    },

    update(dt) {
      t += dt;
      bots.forEach(bot => {
        if (!bot.userData.isWalking) return;

        const dir = bot.userData.target.clone().sub(bot.position);
        const d = dir.length();

        if (d < 0.15) {
          placeWalking(bot);
          return;
        }

        dir.normalize();
        bot.position.addScaledVector(dir, dt * 0.6);
        bot.rotation.y = Math.atan2(dir.x, dir.z);

        bot.position.y = Math.sin(t * 6 + bot.userData.walkPhase) * 0.02;
      });
    }
  };
})();

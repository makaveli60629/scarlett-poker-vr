// /js/bot_rig.js — Simple Bot Mesh + Walk + Seat Pose (FULL)

export function createBot({ THREE, color = 0x7fe7ff, scale = 1.0 } = {}) {
  const bot = new THREE.Group();
  bot.name = "Bot";

  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.08 });

  // Body (hips/butt + chest + shoulders)
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.25), mat);
  hips.position.set(0, 1.02, 0);
  bot.add(hips);

  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.28), mat);
  butt.position.set(0, 0.93, -0.06);
  bot.add(butt);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.50, 0.26), mat);
  chest.position.set(0, 1.34, 0);
  bot.add(chest);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.24), mat);
  shoulders.position.set(0, 1.58, 0);
  bot.add(shoulders);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), mat);
  head.position.set(0, 1.78, 0);
  bot.add(head);

  // Arms (upper + forearm + hands)
  const armL = new THREE.Group(); armL.position.set(-0.34, 1.56, 0);
  const armR = new THREE.Group(); armR.position.set( 0.34, 1.56, 0);

  const upperArmGeo = new THREE.BoxGeometry(0.12, 0.32, 0.12);
  const foreArmGeo  = new THREE.BoxGeometry(0.11, 0.30, 0.11);
  const handGeo     = new THREE.BoxGeometry(0.12, 0.10, 0.14);

  const uL = new THREE.Mesh(upperArmGeo, mat); uL.position.set(0, -0.16, 0);
  const fL = new THREE.Mesh(foreArmGeo, mat);  fL.position.set(0, -0.48, 0);
  const hL = new THREE.Mesh(handGeo, mat);     hL.position.set(0, -0.64, 0.04);

  const uR = new THREE.Mesh(upperArmGeo, mat); uR.position.set(0, -0.16, 0);
  const fR = new THREE.Mesh(foreArmGeo, mat);  fR.position.set(0, -0.48, 0);
  const hR = new THREE.Mesh(handGeo, mat);     hR.position.set(0, -0.64, 0.04);

  armL.add(uL, fL, hL);
  armR.add(uR, fR, hR);
  bot.add(armL, armR);

  // Legs with knees + ankles (fixes “weird walk”)
  const legL = new THREE.Group(); legL.position.set(-0.14, 0.98, 0);
  const legR = new THREE.Group(); legR.position.set( 0.14, 0.98, 0);

  const thighGeo = new THREE.BoxGeometry(0.14, 0.38, 0.14);
  const shinGeo  = new THREE.BoxGeometry(0.13, 0.36, 0.13);
  const footGeo  = new THREE.BoxGeometry(0.16, 0.06, 0.26);

  const thighL = new THREE.Mesh(thighGeo, mat); thighL.position.set(0, -0.19, 0);
  const shinL  = new THREE.Mesh(shinGeo, mat);  shinL.position.set(0, -0.55, 0.02);
  const footL  = new THREE.Mesh(footGeo, mat);  footL.position.set(0, -0.75, 0.07);

  const thighR = new THREE.Mesh(thighGeo, mat); thighR.position.set(0, -0.19, 0);
  const shinR  = new THREE.Mesh(shinGeo, mat);  shinR.position.set(0, -0.55, 0.02);
  const footR  = new THREE.Mesh(footGeo, mat);  footR.position.set(0, -0.75, 0.07);

  legL.add(thighL, shinL, footL);
  legR.add(thighR, shinR, footR);
  bot.add(legL, legR);

  bot.scale.setScalar(scale);

  bot.userData.rig = { armL, armR, legL, legR, chest, hips };
  bot.userData.mode = "walk";
  bot.userData.t = Math.random() * 10;

  bot.userData.setSeated = (seated, lean = 0.15) => {
    bot.userData.mode = seated ? "seat" : "walk";
    if (seated) {
      // seated pose (no laying down / no leaning weird)
      bot.rotation.x = 0;
      bot.userData.rig.legL.rotation.x = -1.25;
      bot.userData.rig.legR.rotation.x = -1.25;
      bot.userData.rig.chest.rotation.x = -lean;
      bot.userData.rig.armL.rotation.x = -0.5;
      bot.userData.rig.armR.rotation.x = -0.5;
    } else {
      bot.userData.rig.chest.rotation.x = 0;
      bot.userData.rig.armL.rotation.x = 0;
      bot.userData.rig.armR.rotation.x = 0;
    }
  };

  bot.userData.update = (dt, speed = 1.0) => {
    bot.userData.t += dt * speed;
    const t = bot.userData.t;
    const r = bot.userData.rig;

    if (bot.userData.mode === "seat") {
      // tiny idle motion only
      r.chest.rotation.y = Math.sin(t * 0.6) * 0.05;
      return;
    }

    // walk cycle (knees/ankles look way better)
    const a = Math.sin(t * 6.0) * 0.65;
    const b = Math.sin(t * 6.0 + Math.PI) * 0.65;

    r.legL.rotation.x = a;
    r.legR.rotation.x = b;

    r.armL.rotation.x = -b * 0.6;
    r.armR.rotation.x = -a * 0.6;

    r.chest.rotation.y = Math.sin(t * 0.9) * 0.08;
  };

  return bot;
}

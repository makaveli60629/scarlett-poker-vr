// /js/bots.js — Scarlett bots 9.2 (rigged pill bodies + walk animation)

import { createAvatarRig } from "./avatar_rig.js";

export const Bots = {
  bots: [],
  _THREE: null,
  _scene: null,
  _getSeats: null,
  _getLobbyZone: null,
  _tableFocus: null,

  async init({ THREE, scene, getSeats, getLobbyZone, tableFocus }) {
    this._THREE = THREE;
    this._scene = scene;
    this._getSeats = getSeats;
    this._getLobbyZone = getLobbyZone;
    this._tableFocus = tableFocus;

    // textures (you’ll replace these with your real shirt/body textures)
    const maleTex = "assets/textures/avatars/bot_body_male.png";
    const femaleTex = "assets/textures/avatars/bot_body_female.png";

    // build 8 bots
    for (let i = 0; i < 8; i++) {
      const isFemale = (i % 2) === 1;
      const rig = await createAvatarRig({
        THREE,
        textureUrl: isFemale ? femaleTex : maleTex,
      });

      rig.root.name = "Bot_" + i;
      rig.root.userData.bot = {
        id: i,
        seated: false,
        target: null,
        speed: 0.85 + Math.random() * 0.35,
        rig,
      };

      // head (simple)
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0xf2d6c9, roughness: 0.85 })
      );
      head.position.set(0, 1.62, 0);
      rig.root.add(head);

      scene.add(rig.root);
      this.bots.push(rig.root);
    }

    // seat 6, lobby 2
    const seats = getSeats();
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      const d = b.userData.bot;

      if (i < 6 && seats[i]) {
        const s = seats[i];
        d.seated = true;
        b.position.set(s.position.x, 0, s.position.z);
        b.rotation.y = s.yaw;

        // ✅ seat height fix (lift body so it’s ON chair, not half in floor)
        b.position.y = 0.02;
      } else {
        d.seated = false;
        b.position.set((Math.random() * 10) - 5, 0, 9 + Math.random() * 3);
        d.target = b.position.clone();
      }
    }
  },

  _pickTarget() {
    const THREE = this._THREE;
    const z = THREE.MathUtils.lerp(this._getLobbyZone().min.z, this._getLobbyZone().max.z, Math.random());
    const x = THREE.MathUtils.lerp(this._getLobbyZone().min.x, this._getLobbyZone().max.x, Math.random());
    return new THREE.Vector3(x, 0, z);
  },

  update(dt) {
    const THREE = this._THREE;
    if (!THREE) return;

    for (const b of this.bots) {
      const d = b.userData.bot;
      const rig = d.rig;

      if (d.seated) {
        // subtle idle motion
        rig.update(dt, 0.1);
        continue;
      }

      // walking lobby
      if (!d.target || b.position.distanceTo(d.target) < 0.25) d.target = this._pickTarget();

      const dir = d.target.clone().sub(b.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist > 0.001) {
        dir.normalize();
        b.position.addScaledVector(dir, dt * d.speed);
        b.lookAt(d.target.x, b.position.y, d.target.z);
        rig.update(dt, d.speed);
      } else {
        rig.update(dt, 0.2);
      }
    }
  },
};

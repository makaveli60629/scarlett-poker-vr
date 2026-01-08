// /js/bots.js — Scarlett Bots 9.2 (NO THREE import)

import { createAvatarRig } from "./avatar_rig.js";

export const Bots = {
  _THREE: null,
  _scene: null,
  _texLoader: null,
  _getSeats: null,
  _getLobbyZone: null,
  _tableFocus: null,

  _bots: [],
  _t: 0,

  init({ THREE, scene, getSeats, getLobbyZone, tableFocus }) {
    this._THREE = THREE;
    this._scene = scene;
    this._getSeats = getSeats;
    this._getLobbyZone = getLobbyZone;
    this._tableFocus = tableFocus;

    this._texLoader = new THREE.TextureLoader();

    // 6 bots (one per seat)
    const seats = getSeats();
    for (let i = 0; i < seats.length; i++) {
      const variant = i % 2 === 0 ? "male" : "female";

      const texturePath =
        variant === "male"
          ? "assets/textures/avatars/suit_male_albedo.png"
          : "assets/textures/avatars/suit_female_albedo.png";

      const rig = createAvatarRig({
        THREE,
        texLoader: this._texLoader,
        variant,
        texturePath
      });

      rig.position.set(seats[i].position.x, 0, seats[i].position.z);
      rig.rotation.y = seats[i].yaw;

      // sit correctly on chair seat height (your chair seat is ~0.50, table felt ~0.92)
      rig.position.y = 0.52;

      // state
      rig.userData.mode = "seated"; // "seated" | "walking"
      rig.userData.seatIndex = i;

      scene.add(rig);
      this._bots.push(rig);
    }
  },

  update(dt) {
    this._t += dt;

    // animate seated bots with subtle breathing + tiny arm motion
    for (const b of this._bots) {
      const J = b.userData.joints;
      if (!J) continue;

      const breath = Math.sin(this._t * 1.7) * 0.02;
      J.chest.position.y = 0.95 + breath;

      // tiny “play” motion
      const handWave = Math.sin(this._t * 2.2) * 0.15;
      J.armL.rotation.x = -0.35 + handWave * 0.25;
      J.armR.rotation.x = -0.35 - handWave * 0.25;

      // head look
      J.head.rotation.y = Math.sin(this._t * 0.6) * 0.25;
    }
  },
};

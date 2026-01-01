// js/teleport-logic.js
// Scarlett Poker VR – Update 1.5.2
// Teleportation & Zone Transition Logic (Lobby ⇄ Scorpion Room)

import CONFIG from './config.js';

AFRAME.registerComponent('teleport-manager', {
  schema: {},

  init() {
    this.player = document.querySelector('#player');
    this.rig = document.querySelector('#rig');
    this.leftController = document.querySelector('#left-controller');

    this.currentZone = 'lobby';
    this.teleportTarget = null;

    this._bindEvents();
  },

  _bindEvents() {
    this.leftController.addEventListener('triggerdown', () => {
      this._aimTeleport();
    });

    this.leftController.addEventListener('triggerup', () => {
      if (this.teleportTarget) {
        this._executeTeleport(this.teleportTarget);
        this.teleportTarget = null;
      }
    });
  },

  _aimTeleport() {
    // Simple ray-based teleport (Quest safe, no spline cost)
    const direction = new THREE.Vector3();
    this.leftController.object3D.getWorldDirection(direction);

    const origin = this.leftController.object3D.position.clone();
    const distance = CONFIG.TELEPORT.MAX_DISTANCE;

    const target = origin.add(direction.multiplyScalar(distance));

    if (this._isValidTeleportTarget(target)) {
      this.teleportTarget = target;
    }
  },

  _isValidTeleportTarget(target) {
    const zones = CONFIG.ZONES;

    // Prevent wall clipping
    if (target.y < 0 || target.y > 3) return false;

    if (this._insideZone(target, zones.SCOPRION_ROOM)) {
      this.currentZone = 'scorpion';
      return true;
    }

    if (this._insideZone(target, zones.LOBBY)) {
      this.currentZone = 'lobby';
      return true;
    }

    return false;
  },

  _insideZone(pos, zone) {
    return (
      pos.x > zone.min.x &&
      pos.x < zone.max.x &&
      pos.z > zone.min.z &&
      pos.z < zone.max.z
    );
  },

  _executeTeleport(target) {
    this.rig.setAttribute('position', {
      x: target.x,
      y: CONFIG.PLAYER.HEIGHT,
      z: target.z
    });

    this._checkTableAutoSit(target);
  },

  _checkTableAutoSit(position) {
    const tableZone = CONFIG.ZONES.TABLE;

    const dx = position.x - tableZone.center.x;
    const dz = position.z - tableZone.center.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= tableZone.radius) {
      this._triggerAutoSit();
    }
  },

  _triggerAutoSit() {
    if (this.player.dataset.seated === 'true') return;

    this.player.dataset.seated = 'true';

    this.rig.setAttribute('position', CONFIG.TABLE.SEAT_POSITION);
    this.rig.setAttribute('rotation', CONFIG.TABLE.SEAT_ROTATION);

    // Fire Auto-Deal event
    document.dispatchEvent(
      new CustomEvent('scarlett:auto-deal', {
        detail: { room: this.currentZone }
      })
    );
  }
});

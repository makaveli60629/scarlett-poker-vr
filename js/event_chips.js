// js/event_chips.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/**
 * EventChips: Gold $5 Event Chip with logic + basic physics + pickup/drop/throw.
 * - membership purchase: +1 event chip
 * - tournament awards: +event chips
 * - cannot cash out (rule-only here)
 * - can spend in store (hook)
 */

export const EventChips = {
  MEMBERSHIP_PRICE_USD: 25,
  EVENT_CHIP_VALUE_USD: 5,

  CHIP_NAME: "EVENT CHIP ($5)",
  CHIP_ID: "event_chip_5",

  state: {
    isMember: false,
    eventChips: 0,
  },

  scene: null,
  mat: { gold: null, label: null },

  sim: {
    chips: [], // { mesh, vel, heldBy, spin }
    gravity: -9.2,
    floorY: 0.0,
    restitution: 0.22,
    friction: 0.985,
    spinFriction: 0.98,
    maxChips: 64,
    chipRadius: 0.055,
    chipHeight: 0.018,
  },

  init(scene, floorY = 0.0) {
    this.scene = scene;
    this.sim.floorY = floorY;

    this.mat.gold = new THREE.MeshStandardMaterial({
      color: 0xC9A24D,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x3a2b10,
      emissiveIntensity: 0.35,
    });

    const labelTex = this._makeChipLabelTexture("EVENT", "$5");
    labelTex.colorSpace = THREE.SRGBColorSpace;

    this.mat.label = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.55,
      metalness: 0.15,
      emissive: 0x101018,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 1.0,
    });
  },

  purchaseMembership(toastFn) {
    if (this.state.isMember) {
      toastFn?.("Already a member ✅");
      return { ok: true, already: true };
    }
    this.state.isMember = true;
    this.state.eventChips += 1;
    toastFn?.(`Membership activated ✅ +1 ${this.CHIP_NAME}`);
    return { ok: true };
  },

  awardTournamentEventChips(toastFn, count = 1) {
    count = Math.max(0, count | 0);
    this.state.eventChips += count;
    toastFn?.(`Tournament reward: +${count} ${this.CHIP_NAME}`);
  },

  spendEventChips(toastFn, count = 1) {
    count = Math.max(0, count | 0);
    if (this.state.eventChips < count) {
      toastFn?.("Not enough Event Chips.");
      return false;
    }
    this.state.eventChips -= count;
    toastFn?.(`Spent ${count} Event Chip(s).`);
    return true;
  },

  spawnPhysicalEventChip(worldPos, worldYaw = 0, initialVel = null) {
    if (!this.scene) return null;
    if (this.sim.chips.length >= this.sim.maxChips) return null;

    const chip = this._createChipMesh();
    chip.position.copy(worldPos);
    chip.rotation.set(-Math.PI / 2, worldYaw, 0);
    chip.castShadow = true;
    chip.receiveShadow = true;

    chip.userData.interactive = true;
    chip.userData.itemId = this.CHIP_ID;
    chip.userData.isEventChip = true;

    this.scene.add(chip);

    const vel = initialVel ? initialVel.clone() : new THREE.Vector3(0, 0.15, -0.25);
    const spin = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2
    );

    const entry = { mesh: chip, vel, heldBy: null, spin };
    this.sim.chips.push(entry);
    return chip;
  },

  tryPickupOrDrop(toastFn, controllerObj, camera, raycastHit, whichHand = "right") {
    const held = this.sim.chips.find((ch) => ch.heldBy === whichHand);
    if (held) {
      held.heldBy = null;
      const fwd = new THREE.Vector3();
      (controllerObj?.getWorldDirection?.(fwd) || camera.getWorldDirection(fwd));
      fwd.y *= 0.2;
      fwd.normalize();
      held.vel.copy(fwd.multiplyScalar(1.15));
      held.vel.y = 0.35;
      toastFn?.("Dropped Event Chip.");
      return true;
    }

    if (!raycastHit?.object) return false;

    let obj = raycastHit.object;
    while (obj && obj.parent && !obj.userData?.isEventChip && obj !== obj.parent) obj = obj.parent;
    if (!obj?.userData?.isEventChip) return false;

    const entry = this.sim.chips.find((ch) => ch.mesh === obj);
    if (!entry) return false;

    entry.heldBy = whichHand;
    entry.vel.set(0, 0, 0);
    entry.spin.set(0, 0, 0);
    toastFn?.("Picked up Event Chip.");
    return true;
  },

  update(dt, leftControllerObj, rightControllerObj, camera) {
    if (!this.scene) return;

    // attach held chips to controllers
    for (const ch of this.sim.chips) {
      if (ch.heldBy === "left" && leftControllerObj) {
        leftControllerObj.getWorldPosition(ch.mesh.position);
        ch.mesh.position.add(new THREE.Vector3(0, -0.02, -0.08));
        continue;
      }
      if (ch.heldBy === "right" && rightControllerObj) {
        rightControllerObj.getWorldPosition(ch.mesh.position);
        ch.mesh.position.add(new THREE.Vector3(0, -0.02, -0.08));
        continue;
      }
    }

    // integrate
    for (const ch of this.sim.chips) {
      if (ch.heldBy) continue;

      ch.vel.y += this.sim.gravity * dt;

      ch.mesh.position.x += ch.vel.x * dt;
      ch.mesh.position.y += ch.vel.y * dt;
      ch.mesh.position.z += ch.vel.z * dt;

      const minY = this.sim.floorY + this.sim.chipHeight * 0.5;
      if (ch.mesh.position.y < minY) {
        ch.mesh.position.y = minY;
        if (ch.vel.y < 0) ch.vel.y = -ch.vel.y * this.sim.restitution;
        ch.vel.x *= this.sim.friction;
        ch.vel.z *= this.sim.friction;
        if (Math.abs(ch.vel.y) < 0.12) ch.vel.y = 0;
      }

      ch.mesh.rotation.x += ch.spin.x * dt;
      ch.mesh.rotation.y += ch.spin.y * dt;
      ch.mesh.rotation.z += ch.spin.z * dt;
      ch.spin.multiplyScalar(this.sim.spinFriction);
    }

    // chip-chip separation
    const chips = this.sim.chips;
    for (let i = 0; i < chips.length; i++) {
      const a = chips[i];
      if (a.heldBy) continue;
      for (let j = i + 1; j < chips.length; j++) {
        const b = chips[j];
        if (b.heldBy) continue;

        const dx = b.mesh.position.x - a.mesh.position.x;
        const dz = b.mesh.position.z - a.mesh.position.z;
        const distSq = dx * dx + dz * dz;
        const min = this.sim.chipRadius * 2.05;

        if (distSq > 0 && distSq < min * min) {
          const dist = Math.sqrt(distSq);
          const push = (min - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;

          a.mesh.position.x -= nx * push;
          a.mesh.position.z -= nz * push;
          b.mesh.position.x += nx * push;
          b.mesh.position.z += nz * push;

          a.vel.x *= 0.98; a.vel.z *= 0.98;
          b.vel.x *= 0.98; b.vel.z *= 0.98;
        }
      }
    }
  },

  _createChipMesh() {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(this.sim.chipRadius, this.sim.chipRadius, this.sim.chipHeight, 32),
      this.mat.gold
    );
    body.rotation.x = Math.PI / 2;
    g.add(body);

    const top = new THREE.Mesh(new THREE.CircleGeometry(this.sim.chipRadius * 0.88, 32), this.mat.label);
    top.position.y = this.sim.chipHeight * 0.52;
    top.rotation.x = -Math.PI / 2;
    g.add(top);

    const bot = new THREE.Mesh(new THREE.CircleGeometry(this.sim.chipRadius * 0.88, 32), this.mat.label);
    bot.position.y = -this.sim.chipHeight * 0.52;
    bot.rotation.x = Math.PI / 2;
    g.add(bot);

    g.name = "event_chip_mesh";
    return g;
  },

  _makeChipLabelTexture(line1, line2) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "rgba(10,10,18,0.92)";
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = "rgba(0,255,170,0.85)";
    ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(256, 256, 214, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = "rgba(255,60,120,0.85)";
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(256, 256, 184, 0, Math.PI * 2); ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 92px system-ui";
    ctx.fillText(line1, 256, 240);

    ctx.fillStyle = "rgba(201,162,77,0.98)";
    ctx.font = "bold 110px system-ui";
    ctx.fillText(line2, 256, 360);

    return new THREE.CanvasTexture(c);
  },
};

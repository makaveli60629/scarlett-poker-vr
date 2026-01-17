// /js/world.js — ScarlettVR Poker (Update 4.3)
// World singleton: scene objects, simple physics, events, modules glue.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { Dissolve } from "./modules/dissolve.js";

const _events = new Map();
const _on = (name, fn) => {
  if (!_events.has(name)) _events.set(name, new Set());
  _events.get(name).add(fn);
};
const _emit = (name, payload) => {
  const set = _events.get(name);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); } catch (e) { console.warn("[World] event handler error", name, e); }
  }
};

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

// Minimal rigid-ish chip physics (position + velocity) for finger collisions.
class ChipBody {
  constructor(mesh) {
    this.mesh = mesh;
    this.v = new THREE.Vector3();
    this.mass = 1;
    this.radius = 0.022; // meters-ish
  }
}

const _tmpV = new THREE.Vector3();

export const World = {
  BUILD: "UPDATE_4_3_FULL",

  // set at init
  scene: null,
  renderer: null,
  camera: null,

  // hands
  hands: [], // { hand, index, tipSpheres: Map(jointName -> {pos,r}) }

  // objects
  table: null,
  chips: [], // ChipBody
  npcs: new Map(), // id -> Object3D

  // dissolve effects
  dissolves: [],

  // gameplay-ish
  chipsBank: 0,

  on: _on,
  emit: _emit,

  init({ scene, renderer, camera }) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this._buildRoom();
    this._spawnDemoChips();

    // Debug hotkeys (desktop): simulate events
    window.addEventListener('keydown', (e) => {
      if (e.key === 'k') this.emit('moderation:voteKick', 'player_demo');
      if (e.key === 'j') this.emit('hand:rareHand', 'ROYAL_FLUSH');
    });
  },

  setTeleportEnabled(on) {
    // placeholder: you can wire to your locomotion system; kept for parity
    this._teleportEnabled = !!on;
  },

  runModuleTest() {
    // Quick sanity checks that core systems are present.
    const ok = {
      scene: !!this.scene,
      renderer: !!this.renderer,
      camera: !!this.camera,
      chips: this.chips.length,
      hands: this.hands.filter(Boolean).length,
      dissolveModule: true,
    };
    return ok;
  },


  registerHand(hand, index) {
    // We track only a subset of joints for collision: thumb tip + index tip + middle tip.
    this.hands[index] = {
      hand,
      index,
      tips: [
        'thumb-tip',
        'index-finger-tip',
        'middle-finger-tip',
      ],
      spheres: new Map(),
    };
  },

  // --- World building ---
  _buildRoom() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Soft ambient
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.9);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1.5, 3.5, 1.2);
    dir.castShadow = true;
    this.scene.add(dir);

    // Table (simple)
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: 0x123f2a, roughness: 0.95 })
    );
    tableTop.position.set(0, 1.0, -1.0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.scene.add(tableTop);
    this.table = tableTop;

    // Debug “player demo” placeholder object for kick dissolve
    const demoPlayer = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x4444aa, roughness: 0.6 })
    );
    head.position.set(0.0, 1.6, -0.4);
    demoPlayer.add(head);
    demoPlayer.name = 'player_demo';
    this.scene.add(demoPlayer);
    this.npcs.set('player_demo', demoPlayer);
  },

  _spawnDemoChips() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.4, metalness: 0.0 });
    const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.008, 20);

    for (let i = 0; i < 18; i++) {
      const chip = new THREE.Mesh(geo, mat.clone());
      chip.position.set(
        (Math.random() - 0.5) * 0.25,
        1.04,
        -1.0 + (Math.random() - 0.5) * 0.25
      );
      chip.rotation.x = Math.PI / 2;
      chip.castShadow = true;
      chip.receiveShadow = true;
      this.scene.add(chip);
      this.chips.push(new ChipBody(chip));
    }
  },

  // --- NPC & FX API expected by modules ---
  spawnNPC(modelName, count = 1) {
    // Placeholder NPCs (guards) — replace with Meta Avatar later.
    const out = [];
    for (let i = 0; i < count; i++) {
      const npc = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12, 0.5, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.7 })
      );
      body.position.y = 1.1;
      npc.add(body);
      npc.position.set(-0.5 + i * 0.25, 0, -0.6);
      npc.name = `${modelName}_${Date.now()}_${i}`;
      this.scene.add(npc);
      out.push(npc);
    }
    return out;
  },

  animate(guards, animName, playerId) {
    // Very simple “grab and carry” placeholder: walk NPCs toward player, then move player upward.
    const target = this.npcs.get(playerId) || this.scene.getObjectByName(playerId);
    if (!target) return;

    const start = performance.now();
    const dur = 2600;
    const startPos = target.position.clone();
    const lift = new THREE.Vector3(0, 0.6, 0.5);

    const step = () => {
      const t = clamp((performance.now() - start) / dur, 0, 1);
      for (let i = 0; i < guards.length; i++) {
        const g = guards[i];
        g.position.lerpVectors(g.position, startPos.clone().add(new THREE.Vector3(-0.2 + i * 0.4, 0, 0)), 0.08);
        g.lookAt(target.getWorldPosition(_tmpV));
      }
      target.position.lerpVectors(startPos, startPos.clone().add(lift), t);

      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  dissolve(playerId, opts = {}) {
    const obj = this.npcs.get(playerId) || this.scene.getObjectByName(playerId);
    if (!obj) return;

    const fx = new Dissolve(obj, {
      color: opts.color ?? 0xff1a1a,
      duration: opts.duration ?? 900,
    });
    this.dissolves.push(fx);

    const start = performance.now();
    const poll = () => {
      if (fx.done) {
        obj.visible = false;
        return;
      }
      if (performance.now() - start < 5000) requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  },

  playFX(name) {
    // Minimal: flash a light near table.
    const light = new THREE.PointLight(0xffffff, 0.0, 3.0);
    light.position.copy(this.table.position).add(new THREE.Vector3(0, 0.6, 0));
    this.scene.add(light);

    const start = performance.now();
    const dur = 650;
    const step = () => {
      const t = clamp((performance.now() - start) / dur, 0, 1);
      light.intensity = (1 - t) * 8.0;
      if (t < 1) requestAnimationFrame(step);
      else this.scene.remove(light);
    };
    requestAnimationFrame(step);
  },

  awardChips(amount) {
    this.chipsBank += amount;
  },

  // --- Update loop ---
  update(t) {
    this._updateHandSpheres();
    this._updateChipPhysics(1 / 72);
    this._updateDissolves();
  },

  _updateDissolves() {
    for (let i = this.dissolves.length - 1; i >= 0; i--) {
      const fx = this.dissolves[i];
      fx.update();
      if (fx.done) this.dissolves.splice(i, 1);
    }
  },

  _updateHandSpheres() {
    // Extract XRHand joint positions into world-space spheres.
    for (const h of this.hands) {
      if (!h) continue;
      const hand = h.hand;
      if (!hand.joints) continue;

      for (const jointName of h.tips) {
        const j = hand.joints[jointName];
        if (!j) continue;
        j.getWorldPosition(_tmpV);

        // Empirical radii for better collision feel
        const r = jointName === 'thumb-tip' ? 0.012 : 0.010;
        h.spheres.set(jointName, { pos: _tmpV.clone(), r });
      }
    }
  },

  _updateChipPhysics(dt) {
    // gravity-ish + damping
    const gravity = -0.6;
    const tableY = 1.04; // chip center plane near table top

    for (const c of this.chips) {
      c.v.y += gravity * dt;
      c.v.multiplyScalar(0.985);
      c.mesh.position.addScaledVector(c.v, dt);

      // keep above table
      if (c.mesh.position.y < tableY) {
        c.mesh.position.y = tableY;
        c.v.y = 0;
      }

      // keep within table-ish radius
      const dx = c.mesh.position.x - this.table.position.x;
      const dz = c.mesh.position.z - this.table.position.z;
      const dist = Math.hypot(dx, dz);
      const maxR = 0.63;
      if (dist > maxR) {
        const scale = maxR / (dist || 1);
        c.mesh.position.x = this.table.position.x + dx * scale;
        c.mesh.position.z = this.table.position.z + dz * scale;
        c.v.x *= -0.35;
        c.v.z *= -0.35;
      }
    }

    // --- Finger collision fix (requested): prevent clipping by pushing chips away from fingertip spheres.
    // This is intentionally cheap & stable for Quest browser.
    for (const h of this.hands) {
      if (!h) continue;
      for (const s of h.spheres.values()) {
        for (const c of this.chips) {
          const p = c.mesh.position;
          const r = c.radius;
          const min = r + s.r;

          // horizontal collision only (chips slide on table)
          const vx = p.x - s.pos.x;
          const vz = p.z - s.pos.z;
          const d2 = vx * vx + vz * vz;

          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 1e-6;
            const nx = vx / d;
            const nz = vz / d;

            const push = (min - d);
            p.x += nx * push;
            p.z += nz * push;

            // velocity impulse: chips follow finger movement a bit
            c.v.x += nx * push * 8.0;
            c.v.z += nz * push * 8.0;
          }
        }
      }
    }
  },
};

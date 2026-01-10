// /js/world.js — Scarlett MASTER WORLD v12 (FULL)
// One world: Original Lobby (start) + Store (left) + Scorpion Room (right teleport + auto-seat).
// Includes: TeleportMachine pads, RoomManager, PokerSim, basic bot seating in scorpion.

import { TeleportMachine } from "./teleport_machine.js";
import { StoreSystem } from "./store.js";
import { ScorpionRoom } from "./scorpion_room.js";
import { RoomManager } from "./room_manager.js";
import { Bots } from "./bots.js";
import { PokerSim } from "./poker_sim.js";

export const World = {
  async init(ctx) {
    const { THREE, scene, renderer, camera, player, controllers, log } = ctx;

    // attach systems container
    ctx.systems = ctx.systems || {};
    ctx.anchors = ctx.anchors || {};
    ctx.seated = false;

    log?.("[world] init v12…");

    // Always-on global lighting (prevents black world)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.9);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(4, 10, 3);
    sun.castShadow = true;
    scene.add(sun);

    // Build lobby + store shell
    this._buildLobby(ctx);
    this._buildStoreShell(ctx);

    // Build scorpion room
    ScorpionRoom.init(ctx);
    ctx.systems.scorpion = ScorpionRoom;

    // Teleport pads (call ctx.onTeleportHit)
    try {
      TeleportMachine?.init?.({
        THREE, scene, renderer, camera, player, controllers, log,
        onHit: (id) => ctx.onTeleportHit?.(id),
        pads: [
          { id: "tp_store", label: "STORE", pos: new THREE.Vector3(-4.0, 0.01, -1.0) },
          { id: "tp_scorpion", label: "SCORPION ROOM", pos: new THREE.Vector3(4.0, 0.01, -1.0) },
          { id: "tp_lobby", label: "LOBBY", pos: new THREE.Vector3(0.0, 0.01, 3.2) },
        ],
      });
      log?.("[world] TeleportMachine ready ✅");
    } catch (e) {
      log?.("[world] TeleportMachine init error:", e);
    }

    // Store system (optional)
    try {
      if (StoreSystem?.init) {
        StoreSystem.init(ctx);
        ctx.systems.store = StoreSystem;
        log?.("[world] store system loaded ✅");
      } else {
        log?.("[world] store system missing (ok)");
      }
    } catch (e) {
      log?.("[world] store init error:", e);
    }

    // Bots (optional)
    try {
      ctx.Bots = Bots;
      await Bots?.init?.(ctx);
      log?.("[world] bots loaded ✅");
    } catch (e) {
      log?.("[world] bots init error:", e);
    }

    // PokerSim (cards visible)
    try {
      ctx.PokerSim = PokerSim;
      await PokerSim?.init?.(ctx);
      log?.("[world] PokerSim loaded ✅");
    } catch (e) {
      log?.("[world] PokerSim init error:", e);
    }

    // Room Manager (wires ctx.rooms + teleport hits)
    RoomManager.init(ctx);

    // Start lobby mode
    ctx.PokerSim?.setMode?.("lobby_demo");
    this.movePlayerTo("lobby_spawn", ctx);
    this.setSeated(false, ctx);

    // Seat 4 bots in Scorpion seats 1..4
    this._spawnScorpionBots(ctx);

    // expose ctx for debugging / main normalization
    this.ctx = ctx;

    log?.("[world] ready ✅");
    return this;
  },

  // ---------- public helpers ----------
  movePlayerTo(anchorName, ctx = this.ctx) {
    const a = ctx?.anchors?.[anchorName];
    if (!a || !ctx?.player) return;
    ctx.player.position.copy(a.position);
    ctx.player.rotation.y = a.rotation?.y || 0;
    ctx.log?.(`[world] movePlayerTo → ${anchorName}`);
  },

  setSeated(on, ctx = this.ctx) {
    ctx.seated = !!on;
    ctx.log?.(`[world] seated=${ctx.seated}`);
  },

  seatPlayer(seatIndex = 0, ctx = this.ctx) {
    const seat = ctx?.scorpion?.seats?.[seatIndex];
    if (!seat || !ctx?.player) return;

    const forward = new ctx.THREE.Vector3(0, 0, -1).applyEuler(seat.rotation);
    const sitPos = seat.position.clone().add(forward.multiplyScalar(0.22));
    ctx.player.position.copy(sitPos);
    ctx.player.rotation.y = seat.rotation.y;

    this.setSeated(true, ctx);
    ctx.PokerSim?.setHumanSeat?.(seatIndex);

    ctx.log?.(`[world] seatPlayer → seat ${seatIndex}`);
  },

  update(dt) {
    // Optional world update hook
    // (PokerSim loop uses setTimeout; TeleportMachine may have its own internal updates)
  },

  // ---------- build lobby ----------
  _buildLobby(ctx) {
    const { THREE, scene } = ctx;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x10121a, roughness: 0.9, metalness: 0.05 });
    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    mkWall(28, 4, 0.4, 0, 2, -14);
    mkWall(28, 4, 0.4, 0, 2, 14);
    mkWall(0.4, 4, 28, -14, 2, 0);
    mkWall(0.4, 4, 28, 14, 2, 0);

    // Anchors
    ctx.anchors.lobby_spawn = new THREE.Object3D();
    ctx.anchors.lobby_spawn.position.set(0, 0, 6.5);
    ctx.anchors.lobby_spawn.rotation.y = Math.PI;
    scene.add(ctx.anchors.lobby_spawn);

    ctx.anchors.store_spawn = new THREE.Object3D();
    ctx.anchors.store_spawn.position.set(-6.2, 0, 0.5);
    ctx.anchors.store_spawn.rotation.y = Math.PI / 2;
    scene.add(ctx.anchors.store_spawn);

    // scorpion entry anchor is inside scorpion group; create proxy in anchors
    ctx.anchors.scorpion_entry = new THREE.Object3D();
    ctx.anchors.scorpion_entry.position.set(0, 0, 4.6);
    ctx.anchors.scorpion_entry.rotation.y = Math.PI;
    scene.add(ctx.anchors.scorpion_entry);

    this._makeSign(ctx, "STORE", -6.5, 2.0, -1.0, Math.PI / 2);
    this._makeSign(ctx, "SCORPION ROOM", 6.5, 2.0, -1.0, -Math.PI / 2);

    ctx.log?.("[world] lobby built ✅");
  },

  _buildStoreShell(ctx) {
    const { THREE, scene } = ctx;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 2.7, 5.5),
      new THREE.MeshStandardMaterial({
        color: 0x0c1020, roughness: 0.9, metalness: 0.08, transparent: true, opacity: 0.35
      })
    );
    frame.position.set(-6.2, 1.35, 0.0);
    frame.receiveShadow = true;
    scene.add(frame);
  },

  _makeSign(ctx, text, x, y, z, ry) {
    const { THREE, scene } = ctx;

    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 256;
    const g = canvas.getContext("2d");
    g.fillStyle = "rgba(6,8,12,0.75)";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.font = "bold 54px system-ui, Arial";
    g.fillStyle = "#e8ecff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), mat);
    plane.position.set(x, y, z);
    plane.rotation.y = ry;
    scene.add(plane);
  },

  _spawnScorpionBots(ctx) {
    const seats = ctx?.scorpion?.seats;
    if (!seats || seats.length < 5) return;

    // If Bots module supports spawnSeatedBot use it; else fallback capsules
    for (let i = 1; i <= 4; i++) {
      const s = seats[i];
      const ok = ctx.Bots?.spawnSeatedBot?.(ctx, {
        seatIndex: i,
        position: s.position,
        rotationY: s.rotation.y,
        room: "scorpion",
      });

      if (!ok) {
        const b = this._fallbackBot(ctx);
        b.position.copy(s.position);
        b.rotation.y = s.rotation.y;
        b.position.add(new ctx.THREE.Vector3(0, 0, 0.15));
        ctx.scorpion.group.add(b);
      }
    }

    ctx.log?.("[world] scorpion bots seated ✅ (4 bots)");
  },

  _fallbackBot(ctx) {
    const { THREE } = ctx;
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.55, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.05 })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x5b647a, roughness: 0.75, metalness: 0.05 })
    );
    head.position.y = 1.32;
    head.castShadow = true;
    g.add(head);

    return g;
  },
};

// js/boss_table.js — Boss Table + VIP Spectator Rail (Spectator Only) (8.2 Anchors Upgrade)
import * as THREE from "./three.js";
import { registerZone } from "./state.js";
import { SpectatorRail } from "./spectator_rail.js";

export const BossTable = {
  group: null,
  center: new THREE.Vector3(0, 0, -6.5),
  zoneRadius: 4.1,

  // anchors are created on build()
  anchors: {
    tableTop: null,        // mesh (named BossTableTop)
    community: null,       // Object3D (named BossCommunityAnchor)
    pot: null,             // Object3D (named BossPotAnchor)
    dealer: null,          // Object3D (named BossDealerAnchor) — invisible reference only
    seats: [],             // Object3D[] (named BossSeat_i)
    betLine: null,         // mesh ring on felt
    chipLine: null,        // mesh ring on felt
  },

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "BossTableArea";
    this.group.position.copy(this.center);

    // ---- Table base + top ----
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.05, 0.6, 28),
      new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
    );
    base.position.y = 0.3;

    const topMat = new THREE.MeshStandardMaterial({
      color: 0x5a0b0b,
      roughness: 0.65,
      emissive: 0x120000,
      emissiveIntensity: 0.35,
    });

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.75, 2.9, 0.2, 44),
      topMat
    );
    top.name = "BossTableTop";
    top.position.y = 0.92;

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.82, 0.11, 14, 56),
      new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness: 0.75 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.0;

    // Crown pedestal placeholder (you can hide this later if desired)
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.22, 18),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.6,
        emissive: 0x003322,
        emissiveIntensity: 0.6,
      })
    );
    pedestal.name = "BossCrownPedestal";
    pedestal.position.set(0, 1.05, 0);

    this.group.add(base, top, rim, pedestal);

    // ---- Betting line + chip line (on felt) ----
    // Table top center height ~ 0.92 + 0.1 = 1.02ish; keep rings slightly above felt
    const feltY = 1.02;

    const betLine = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.03, 10, 80),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.15,
        roughness: 0.35,
      })
    );
    betLine.name = "BossBetLine";
    betLine.rotation.x = Math.PI / 2;
    betLine.position.y = feltY + 0.01;

    const chipLine = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.025, 10, 90),
      new THREE.MeshStandardMaterial({
        color: 0xff3366,
        emissive: 0xff3366,
        emissiveIntensity: 0.85,
        roughness: 0.4,
      })
    );
    chipLine.name = "BossChipLine";
    chipLine.rotation.x = Math.PI / 2;
    chipLine.position.y = feltY + 0.01;

    this.group.add(betLine, chipLine);
    this.anchors.betLine = betLine;
    this.anchors.chipLine = chipLine;

    // ---- Inner ring (visual cue zone) ----
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.zoneRadius, 0.06, 10, 90),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.6,
        roughness: 0.35,
      })
    );
    ring.name = "BossZoneRing";
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    this.group.add(ring);

    // ---- Anchors for sim snapping (invisible Object3D) ----
    const community = new THREE.Object3D();
    community.name = "BossCommunityAnchor";
    community.position.set(0, feltY + 0.55, 0.10); // hover cards here
    this.group.add(community);

    const pot = new THREE.Object3D();
    pot.name = "BossPotAnchor";
    pot.position.set(0, feltY + 0.40, -0.35); // pot text/stack anchor
    this.group.add(pot);

    const dealer = new THREE.Object3D();
    dealer.name = "BossDealerAnchor";
    dealer.position.set(0, feltY + 0.30, 0.0); // reference only
    this.group.add(dealer);

    this.anchors.tableTop = top;
    this.anchors.community = community;
    this.anchors.pot = pot;
    this.anchors.dealer = dealer;

    // ---- Seat anchors (6 seats around table) ----
    // These are used by poker_simulation.js to place bots correctly.
    this.anchors.seats = [];
    const seatCount = 6;
    const seatRadius = 3.05;

    for (let i = 0; i < seatCount; i++) {
      const a = (i / seatCount) * Math.PI * 2;
      const seat = new THREE.Object3D();
      seat.name = `BossSeat_${i}`;
      seat.position.set(Math.cos(a) * seatRadius, 0, Math.sin(a) * seatRadius);
      seat.lookAt(0, 1.0, 0);
      this.group.add(seat);
      this.anchors.seats.push(seat);
    }

    // ---- Lighting around boss table ----
    const aLight = new THREE.PointLight(0x00ffaa, 0.65, 18);
    aLight.position.set(0, 2.6, 0);
    this.group.add(aLight);

    const bLight = new THREE.PointLight(0xff3366, 0.45, 18);
    bLight.position.set(2.5, 2.1, 2.5);
    this.group.add(bLight);

    // ---- Add to scene ----
    scene.add(this.group);

    // VIP Spectator rail around zone
    SpectatorRail.build(scene, this.center, this.zoneRadius + 0.35, { postCount: 20 });

    // No-entry zone (spectator only)
    registerZone({
      name: "boss_table_zone",
      center: this.center,
      radius: this.zoneRadius,
      yMin: -2,
      yMax: 4,
      mode: "block",
      message: "Boss Table: Spectator Only",
      strength: 0.32,
    });

    return this.group;
  },

  // --- Helpers for other systems (World / PokerSimulation) ---
  getAnchors() {
    // Returns references (local space). Consumers can use getWorldPosition().
    return this.anchors;
  },

  getSeatWorldPositions(targetArray = []) {
    targetArray.length = 0;
    for (const s of this.anchors.seats || []) {
      const v = new THREE.Vector3();
      s.getWorldPosition(v);
      targetArray.push(v);
    }
    return targetArray;
  },

  getWorldCenter(out = new THREE.Vector3()) {
    if (!this.group) return out.copy(this.center);
    return this.group.getWorldPosition(out);
  },
};

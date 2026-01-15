import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { DIMS } from "./world_constants.js";
import { setReceiveCast, addCollider } from "./world_helpers.js";

export function buildLobby(world, mats, quality = "quest") {
  const { FLOOR_Y, LOBBY_R, LOBBY_H, PIT_R_OUT, PIT_R_IN, PIT_DEPTH } = DIMS;

  const g = new THREE.Group();
  g.name = "LobbyAndPit";
  world.group.add(g);

  // Lobby floor
  {
    const geo = new THREE.CircleGeometry(LOBBY_R, quality === "high" ? 96 : 64);
    const mesh = setReceiveCast(new THREE.Mesh(geo, mats.matCarpet), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y;
    g.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(LOBBY_R - 0.35, LOBBY_R, quality === "high" ? 96 : 64),
      mats.matTrim
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = FLOOR_Y + 0.004;
    g.add(ring);
  }

  // Lobby wall
  {
    const geo = new THREE.CylinderGeometry(LOBBY_R, LOBBY_R, LOBBY_H, quality === "high" ? 96 : 64, 1, true);
    const mesh = setReceiveCast(new THREE.Mesh(geo, mats.matWall), false, true);
    mesh.position.y = FLOOR_Y + LOBBY_H / 2;
    g.add(mesh);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(LOBBY_R - 0.2, 0.08, 12, quality === "high" ? 160 : 112),
      mats.matNeonPink
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = FLOOR_Y + 2.3;
    g.add(band);
  }

  // Pit
  const pit = new THREE.Group();
  pit.name = "Pit";
  g.add(pit);

  // Walk ring
  {
    const geo = new THREE.RingGeometry(PIT_R_IN, PIT_R_OUT, quality === "high" ? 80 : 56);
    const mesh = setReceiveCast(new THREE.Mesh(geo, mats.matCarpet), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y + 0.006;
    pit.add(mesh);
  }

  // Bowl floor (recessed)
  {
    const geo = new THREE.CircleGeometry(PIT_R_IN - 0.1, quality === "high" ? 64 : 48);
    const mesh = setReceiveCast(new THREE.Mesh(geo, mats.matConcrete), false, true);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = FLOOR_Y - PIT_DEPTH;
    pit.add(mesh);
  }

  // Bowl wall
  {
    const geo = new THREE.CylinderGeometry(PIT_R_IN, PIT_R_IN, PIT_DEPTH, quality === "high" ? 80 : 56, 1, true);
    const mesh = setReceiveCast(new THREE.Mesh(geo, mats.matWall), false, true);
    mesh.position.y = FLOOR_Y - PIT_DEPTH / 2;
    pit.add(mesh);
  }

  // Steps (north)
  {
    const steps = new THREE.Group();
    steps.name = "PitSteps";
    pit.add(steps);

    const stepCount = 6;
    const stepW = 4.2;
    const stepD = 0.8;
    const stepH = PIT_DEPTH / stepCount;
    const baseZ = PIT_R_IN - 0.4;

    for (let i = 0; i < stepCount; i++) {
      const geo = new THREE.BoxGeometry(stepW, stepH, stepD);
      const m = new THREE.Mesh(geo, mats.matConcrete);
      m.position.set(0, FLOOR_Y - stepH * (i + 0.5), baseZ - i * stepD);
      setReceiveCast(m, false, true);
      steps.add(m);
    }
  }

  // Guardrail
  {
    const rail = new THREE.Group();
    rail.name = "PitRail";
    g.add(rail);

    const posts = quality === "high" ? 40 : 28;
    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      const r = PIT_R_OUT + 0.25;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.05, 10), mats.matTrim);
      post.position.set(x, FLOOR_Y + 0.52, z);
      setReceiveCast(post, true, true);
      rail.add(post);
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(PIT_R_OUT + 0.25, 0.07, 12, quality === "high" ? 120 : 84),
      mats.matTrim
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = FLOOR_Y + 1.05;
    setReceiveCast(ring, true, true);
    rail.add(ring);

    addCollider(world, ring, "rail");
  }

  // Center table anchor + placeholder
  {
    const tableGroup = new THREE.Group();
    tableGroup.name = "CenterTableAnchor";
    tableGroup.position.set(0, FLOOR_Y - PIT_DEPTH + 0.02, 0);
    world.anchors.table = tableGroup;
    pit.add(tableGroup);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.2, 0.45, quality === "high" ? 48 : 32), mats.matGold);
    base.position.y = 0.22; setReceiveCast(base, true, true); tableGroup.add(base);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.14, quality === "high" ? 64 : 48), mats.matConcrete);
    felt.position.y = 0.52; setReceiveCast(felt, true, true); tableGroup.add(felt);

    const neon = new THREE.Mesh(
      new THREE.TorusGeometry(3.15, 0.05, 10, quality === "high" ? 120 : 84),
      mats.matNeonCyan
    );
    neon.rotation.x = Math.PI / 2;
    neon.position.y = 0.6; setReceiveCast(neon, true, true); tableGroup.add(neon);
  }

  // Lobby boundary collider
  {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(LOBBY_R - 0.2, LOBBY_R - 0.2, 3.4, quality === "high" ? 96 : 64, 1, true),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    col.position.y = FLOOR_Y + 1.7;
    col.userData.collider = true;
    col.userData.kind = "boundary";
    world.group.add(col);
    world.colliders.push(col);
  }

  return g;
}

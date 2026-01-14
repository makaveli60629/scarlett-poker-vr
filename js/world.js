// /js/world.js
// SCARLETT VR POKER — MASTER WORLD
// Guaranteed visible on Android + Quest
// v1.0

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export function buildWorld(ctx) {
  const {
    scene,
    camera,
    rig,
    log = console.log
  } = ctx;

  log("[world] buildWorld() start");

  /* -------------------------------------------------
     SAFETY CHECKS
  ------------------------------------------------- */
  if (!scene) throw new Error("World: scene missing");
  if (!camera) throw new Error("World: camera missing");

  /* -------------------------------------------------
     SKY / BACKGROUND  (CRITICAL – prevents black)
  ------------------------------------------------- */
  scene.background = new THREE.Color(0x0b1020);

  const skyGeo = new THREE.SphereGeometry(100, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x111833,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  /* -------------------------------------------------
     LIGHTING (ABSOLUTELY REQUIRED)
  ------------------------------------------------- */
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(5, 10, 3);
  sun.castShadow = false;
  scene.add(sun);

  log("[world] lights added");

  /* -------------------------------------------------
     FLOOR (REFERENCE + SCALE CHECK)
  ------------------------------------------------- */
  const floorGeo = new THREE.CircleGeometry(20, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 1,
    metalness: 0
  });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  log("[world] floor added");

  /* -------------------------------------------------
     POKER PIT (DIVOT STYLE)
  ------------------------------------------------- */
  const pitGeo = new THREE.CylinderGeometry(6, 6, 0.4, 48, 1, true);
  const pitMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    side: THREE.DoubleSide
  });

  const pit = new THREE.Mesh(pitGeo, pitMat);
  pit.position.y = -0.2;
  scene.add(pit);

  /* -------------------------------------------------
     POKER TABLE (CENTERPIECE)
  ------------------------------------------------- */
  const tableGeo = new THREE.CylinderGeometry(3, 3, 0.6, 48);
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x0a5c3b,
    roughness: 0.9
  });

  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.y = 0.3;
  scene.add(table);

  /* -------------------------------------------------
     TABLE RAIL
  ------------------------------------------------- */
  const railGeo = new THREE.TorusGeometry(3.05, 0.15, 16, 64);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a
  });

  const rail = new THREE.Mesh(railGeo, railMat);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.6;
  scene.add(rail);

  /* -------------------------------------------------
     DEBUG AXES (YOU CAN REMOVE LATER)
  ------------------------------------------------- */
  const axes = new THREE.AxesHelper(2);
  axes.position.y = 0.01;
  scene.add(axes);

  /* -------------------------------------------------
     PLAYER SPAWN FIX (QUEST SAFE)
  ------------------------------------------------- */
  if (rig) {
    rig.position.set(0, 1.6, 4);
    log("[world] rig positioned", rig.position.toArray());
  } else {
    camera.position.set(0, 1.6, 4);
    log("[world] camera positioned");
  }

  /* -------------------------------------------------
     WORLD ROOT (FOR FUTURE SYSTEMS)
  ------------------------------------------------- */
  const worldRoot = new THREE.Group();
  worldRoot.name = "WORLD_ROOT";
  scene.add(worldRoot);

  worldRoot.add(floor, pit, table, rail);

  log("[world] build complete ✅");

  return {
    floor,
    pit,
    table,
    rail,
    sky,
    lights: { ambient, sun }
  };
}

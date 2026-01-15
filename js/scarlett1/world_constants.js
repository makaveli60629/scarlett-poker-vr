import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export const BUILD = "WORLD_SCARLETT1_v2_7_mod";

export const DEFAULT_QUALITY = "quest"; // "quest" | "high"

export const DIMS = {
  FLOOR_Y: 0,

  LOBBY_R: 22,
  LOBBY_H: 5.0,

  HALL_W: 6.0,
  HALL_L: 18.0,

  ROOM_W: 18.0,
  ROOM_L: 18.0,
  ROOM_H: 4.6,

  PIT_R_OUT: 9.2,
  PIT_R_IN: 6.0,
  PIT_DEPTH: 0.9
};

export function getSpawns() {
  return {
    SPAWN_N: { pos: new THREE.Vector3(0, 0, 18), yaw: Math.PI },
    SPAWN_S: { pos: new THREE.Vector3(0, 0, -18), yaw: 0 },
    SPAWN_E: { pos: new THREE.Vector3(18, 0, 0), yaw: -Math.PI / 2 },
    SPAWN_W: { pos: new THREE.Vector3(-18, 0, 0), yaw: Math.PI / 2 }
  };
}

export function getCardinals() {
  const { LOBBY_R, HALL_L, ROOM_L } = DIMS;
  const hallN = { x: 0, z: LOBBY_R + HALL_L / 2, yaw: Math.PI };
  const hallS = { x: 0, z: -(LOBBY_R + HALL_L / 2), yaw: 0 };
  const hallE = { x: LOBBY_R + HALL_L / 2, z: 0, yaw: -Math.PI / 2 };
  const hallW = { x: -(LOBBY_R + HALL_L / 2), z: 0, yaw: Math.PI / 2 };

  const roomN = { x: 0, z: LOBBY_R + HALL_L + ROOM_L / 2, label: "STORE", theme: "store" };
  const roomS = { x: 0, z: -(LOBBY_R + HALL_L + ROOM_L / 2), label: "VIP", theme: "vip" };
  const roomE = { x: LOBBY_R + HALL_L + ROOM_L / 2, z: 0, label: "SCORP", theme: "scorp" };
  const roomW = { x: -(LOBBY_R + HALL_L + ROOM_L / 2), z: 0, label: "GAMES", theme: "games" };

  return { hallN, hallS, hallE, hallW, roomN, roomS, roomE, roomW };
}

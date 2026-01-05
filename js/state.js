// Scarlett Poker VR — Update 6.2
// CORE LOCKED — DO NOT MODIFY WITHOUT VERSION BUMP

export const State = {
  version: "6.2-core",
  features: {
    crowns: true,
    tournaments: true,
    roamingBosses: true,
    spectatorOnlyBossTable: true,
  },

  player: {
    height: 1.6,
    radius: 0.22,
  },

  world: {
    colliders: [],
    interactables: [],
    spawnPads: [],
    activePadIndex: 0,
  },

  ui: { menuOpen: false },

  game: {
    chipsStart: 10000,
    // Boss table is show-only
    bossTableLocked: true,
  }
};

export function registerCollider(obj, aabb) {
  obj.userData.collider = true;
  obj.userData.aabb = aabb;
  State.world.colliders.push(obj);
}

export function registerInteractable(obj, onClick) {
  obj.userData.interactable = true;
  obj.userData.onClick = onClick;
  State.world.interactables.push(obj);
}

export function registerSpawnPad(obj) {
  obj.userData.isSpawnPad = true;
  State.world.spawnPads.push(obj);
}

// js/state.js — Minimal shared state + zones (8.0)
const _store = new Map();

const _zones = []; // {name, center, radius, yMin, yMax, mode, message, strength}

export const State = {
  get(key, fallback = null) {
    return _store.has(key) ? _store.get(key) : fallback;
  },
  set(key, value) {
    _store.set(key, value);
    return value;
  },
  has(key) {
    return _store.has(key);
  },
  del(key) {
    _store.delete(key);
  },
  dump() {
    return Object.fromEntries(_store.entries());
  }
};

// --- Room manager compatibility ---
export function setCurrentRoom(name) {
  State.set("current_room", name);
}
export function getCurrentRoom() {
  return State.get("current_room", "vip_room");
}

// --- Zone system compatibility ---
export function registerZone(zone) {
  if (!zone?.name) zone.name = `zone_${_zones.length}`;
  _zones.push(zone);
  return zone;
}

export function getZones() {
  return _zones.slice();
}

export function clearZones() {
  _zones.length = 0;
}

// core/state.js — bridge + stubs (keeps core imports stable)

export * from "../js/state.js";

// Some core modules still import registerCollider.
// If js/state.js doesn't export it yet, this stub prevents crash.
// If js/state.js DOES export it, this still won't hurt anything.
export function registerCollider() { /* stub */ }
export function unregisterCollider() { /* stub */ }
export function getCollidersArray() { return []; }
export const State = {
  registerCollider,
  unregisterCollider,
  getCollidersArray,
  registerInteractable,
  getInteractablesArray,
  activateObject
};

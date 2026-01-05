// js/state.js — single source of truth for runtime state (6.2)
// This file exports BOTH:
// 1) named functions (for files that do: import { registerCollider } from "./state.js")
// 2) a State object (for files that do: import { State } from "./state.js")

import {
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,
  registerCollider,
  unregisterCollider,
  getCollidersArray,
} from "./state_v62.js";

export {
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,
  registerCollider,
  unregisterCollider,
  getCollidersArray,
};

// Optional convenience object
export const State = {
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,
  registerCollider,
  unregisterCollider,
  getCollidersArray,
};

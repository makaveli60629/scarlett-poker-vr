// core/state.js — bridge/re-export so core modules can import "./state.js"
export {
  registerInteractable,
  unregisterInteractable,
  getInteractablesArray,
  activateObject,
  registerCollider,
  unregisterCollider,
  getCollidersArray
} from "../js/state.js";

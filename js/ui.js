// /js/ui.js — minimal UI tick (keeps overlay alive)

export const UI = {
  overlay: null,
  init({ overlay }) {
    this.overlay = overlay;
  },
  update() {}
};

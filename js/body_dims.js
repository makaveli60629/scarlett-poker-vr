// /js/body_dims.js — canonical avatar + shirt dimensions (meters)
export const BODY_DIMS = {
  torso: {
    radius: 0.18,     // capsule radius
    height: 0.40,     // cylinder height (CapsuleGeometry 2nd arg)
    centerY: 0.95,    // torso center position
  },
  head: {
    radius: 0.15,
    centerY: 1.38,
  },
  shirt: {
    frontZ: 0.185,    // where logos sit in front of chest
    logoWidth: 0.22,
    logoHeight: 0.11,
    logoY: 1.00,
  }
};

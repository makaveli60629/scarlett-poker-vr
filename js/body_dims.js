// /js/body_dims.js — canonical avatar + shirt dimensions (meters)
export const BODY_DIMS = {
  torso: {
    radius: 0.18,   // CapsuleGeometry radius
    height: 0.40,   // CapsuleGeometry length (cylindrical part)
    centerY: 0.95,  // torso center
  },

  head: {
    radius: 0.15,
    centerY: 1.38,
  },

  wrists: {
    left:  { x: -0.22, y: 0.95, z: 0.0 },
    right: { x:  0.22, y: 0.95, z: 0.0 },
  },

  shirt: {
    // Shirt “wrapper” (3D mesh) that uses your atlas texture
    width: 0.46,
    height: 0.52,
    depth: 0.28,
    centerY: 0.95,
    zOffset: 0.01,     // small forward offset to avoid z-fighting
    textureUrl: "assets/textures/shirt_diffuse.png",
  },

  // Optional logo plane placement (if you ever use it again)
  logo: {
    z: 0.185,
    width: 0.22,
    height: 0.11,
    y: 1.00,
  },
};

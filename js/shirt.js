import { ShirtSystem } from "./shirt.js";

// after grips exist:
const shirts = ShirtSystem.create({ textureUrl: "assets/textures/shirt_diffuse.png" });

// whenever grips are ready:
shirts.attachToControllerGrip(leftGrip);
shirts.attachToControllerGrip(rightGrip);

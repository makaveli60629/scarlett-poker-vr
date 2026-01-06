// /js/three.js
// GitHub Pages-safe shim for Three.js
// - Supports BOTH:
//     import * as THREE from "./three.js"
//     import THREE from "./three.js"
// - Avoids the CDN "no default export" problem.

import * as THREE_NS from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export default THREE_NS;
export * from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

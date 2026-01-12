// /js/three.js — Scarlett Three Wrapper (NO "three" bare imports anywhere)

// THREE core from CDN (fine)
export * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// IMPORTANT: use our local standalone VRButton (no imports)
export { VRButton } from "./VRButton.js";

// Optional: DO NOT export XRControllerModelFactory from CDN unless you truly need it,
// because it also imports "three" bare inside examples.
// If you need it later, we’ll make a local safe version.

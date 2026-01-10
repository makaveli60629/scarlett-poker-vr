import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

export async function init(ctx) {
  const group = new THREE.Group();
  group.name = "Jumbotron";
  group.position.set(0, 2.4, -2.0);

  const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.75, 6, 1, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    roughness: 0.55,
    metalness: 0.15,
    emissive: new THREE.Color(0x001018),
    emissiveIntensity: 0.65
  });
  const prism = new THREE.Mesh(geo, mat);
  group.add(prism);

  // CSS2D panel
  const el = document.createElement("div");
  el.className = "nametag-container";
  el.style.borderLeft = "4px solid #ff2d7a";
  el.innerHTML = `JUMBOTRON<span class="nametag-sub">NFL Scores: (placeholder)</span>`;
  const label = new CSS2DObject(el);
  label.position.set(0, 0.55, 0);
  group.add(label);

  ctx.scene.add(group);
  ctx.jumbotron = { group, labelEl: el, t: 0 };

  ctx.LOG?.push?.("log", "[JumbotronModule] init ✅");
}

export function update(dt, ctx) {
  if (!ctx.jumbotron) return;
  ctx.jumbotron.t += dt;

  // tiny spin
  ctx.jumbotron.group.rotation.y += dt * 0.25;

  // placeholder scoreboard text
  const secs = Math.floor(ctx.jumbotron.t);
  if (secs % 2 === 0) {
    ctx.jumbotron.labelEl.querySelector(".nametag-sub").textContent =
      `Bears 0 — Packers 0 • ${new Date().toLocaleTimeString()}`;
  }
}

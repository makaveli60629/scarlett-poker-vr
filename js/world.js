export function initWorld({ diag }) {
  const cards = document.querySelectorAll("#community .card");
  let t = 0;
  function step(){
    t += 0.016;
    const lift = 0.002 + (Math.sin(t)*0.001);
    cards.forEach((c, i) => {
      if (!c.object3D) return;
      c.object3D.position.y = lift + i*0.0002;
      c.object3D.rotation.z = Math.sin(t + i)*0.03;
    });
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  diag.write("[world] community card animation ✅");

  const logLoaded = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("model-loaded", () => diag.write(`[glb] ${id} model-loaded ✅`));
    el.addEventListener("model-error", (e) => diag.write(`[glb] ${id} model-error ❌ ${e?.detail?.message||""}`));
  };
  ["mannequin","walker","bot1","bot2"].forEach(logLoaded);
}

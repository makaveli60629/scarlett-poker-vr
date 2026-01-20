// js/world.js
export function initWorld({ diag }) {
  // Animate community cards for "game is playing" vibe.
  const cards = document.querySelectorAll("#community .card");
  let t = 0;
  function step(){
    t += 0.016;
    const lift = 0.002 + (Math.sin(t)*0.001);
    cards.forEach((c, i) => {
      c.object3D.position.y = lift + i*0.0002;
      c.object3D.rotation.z = Math.sin(t + i)*0.03;
    });
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  diag.write("[world] community card animation ✅");
  return { ok: true };
}

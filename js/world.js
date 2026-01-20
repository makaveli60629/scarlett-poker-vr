export function initWorld({ diag }) {
  const comm = Array.from(document.querySelectorAll("#community .card"));
  const hole1 = Array.from(document.querySelectorAll("#hole1 .hcard"));
  const hole2 = Array.from(document.querySelectorAll("#hole2 .hcard"));
  let t = 0;

  // Idle float for community cards
  function idleFloat(){
    t += 0.016;
    const lift = 0.002 + (Math.sin(t)*0.001);
    comm.forEach((c, i) => {
      if (!c.object3D) return;
      c.object3D.position.y = lift + i*0.0002;
      c.object3D.rotation.z = Math.sin(t + i)*0.03;
    });
    requestAnimationFrame(idleFloat);
  }
  requestAnimationFrame(idleFloat);

  // Deal-in animation (scale in)
  function dealIn(){
    const all = [...comm, ...hole1, ...hole2];
    all.forEach((c) => {
      if (!c.object3D) return;
      c.object3D.scale.setScalar(0.001);
    });
    const start = performance.now();
    const dur = 850;
    const ease = (x)=> 1 - Math.pow(1-x, 3);

    function step(now){
      all.forEach((c, i) => {
        if (!c.object3D) return;
        const delay = i * 60;
        const u = Math.min(1, Math.max(0, (now - start - delay) / dur));
        const e = ease(u);
        c.object3D.scale.setScalar(0.001 + e*0.999);
      });
      if (now < start + dur + all.length*60) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  setTimeout(dealIn, 350);
  diag.write("[world] lobby + cards ready ✅");

  // GLB load logging
  const logLoaded = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("model-loaded", () => diag.write(`[glb] ${id} model-loaded ✅`));
    el.addEventListener("model-error", (e) => diag.write(`[glb] ${id} model-error ❌ ${e?.detail?.message||""}`));
  };
  ["mannequin","walker","bot1","bot2","bot3","bot4"].forEach(logLoaded);
}

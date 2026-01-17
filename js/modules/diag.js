// /js/modules/diag.js

export function installDiag(ctx){
  const dwrite = (m)=>{ try{ window.__scarlettDiagWrite?.(m); }catch(_){ } };
  dwrite('[status] MODULE DIAG ✅');

  const btn = document.getElementById('btnDiag');
  const panel = document.getElementById('diagHud');
  btn?.addEventListener('click', ()=>{
    panel?.classList.toggle('hidden');
  });

  // Fullscreen blockers scan (quick)
  requestAnimationFrame(()=>{
    dwrite('');
    dwrite('--- FULLSCREEN BLOCKERS ---');
    const app = document.getElementById('app');
    if (app){
      const cs = getComputedStyle(app);
      dwrite(`div#app z=${cs.zIndex} pe=${cs.pointerEvents}`);
    }
  });
}

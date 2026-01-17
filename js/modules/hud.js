// /js/modules/hud.js

export function installHUD(ctx){
  const hud = document.getElementById('hud');
  const btnHideHUD = document.getElementById('btnHideHUD');
  const hint = document.getElementById('hint');
  const pip = document.getElementById('pipWrap');

  btnHideHUD?.addEventListener('click', ()=>{
    const hidden = hud?.classList.toggle('hidden');
    if (hidden){
      btnHideHUD.textContent = 'Show HUD';
      hint?.classList.add('hidden');
      pip?.classList.add('hidden');
    } else {
      btnHideHUD.textContent = 'Hide HUD';
      hint?.classList.remove('hidden');
      pip?.classList.remove('hidden');
    }
  });

  return { hud };
}

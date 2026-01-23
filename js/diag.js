export function createDiag(buildName){
  const panel = document.getElementById('diagPanel');
  const textEl = document.getElementById('diagText');
  const metaEl = document.getElementById('diagMeta');
  const closeBtn = document.getElementById('btnCloseDiag');

  const lines = [];
  let meta = {};

  function render(){
    metaEl.textContent =
      `BUILD=${buildName} | secure=${meta.secureContext} | xr=${meta.xr} | touch=${meta.touch}\n` +
      `${meta.href || ''}\n${meta.ua || ''}`;
    textEl.textContent = lines.join('\n');
  }

  function log(s){
    lines.push(String(s));
    if (lines.length > 600) lines.splice(0, lines.length-600);
    render();
  }

  function open(){ panel.classList.remove('hidden'); }
  function close(){ panel.classList.add('hidden'); }
  function toggle(){ panel.classList.toggle('hidden'); }
  function setMeta(m){ meta = { ...meta, ...m }; render(); }

  closeBtn.addEventListener('click', close);
  window.SCARLETT_DIAG = { log, open, close, toggle, setMeta };

  return { log, open, close, toggle, setMeta };
}

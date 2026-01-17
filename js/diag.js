export const Diag = {
  create(APP_STATE){
    const panel = document.getElementById('panel');
    const logs = [];
    let fps = 60, acc = 0, frames = 0;

    function ts(){
      const d = new Date();
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    }

    function log(msg){
      logs.push(`[${ts()}] ${msg}`);
      if(logs.length > 120) logs.shift();
      if(panel && panel.style.display === 'block'){
        panel.textContent = render();
      }
    }

    function tick(dt){
      acc += dt; frames++;
      if(acc >= 0.5){
        fps = Math.round(frames / acc);
        acc = 0; frames = 0;
      }
      if(panel && panel.style.display === 'block'){
        panel.textContent = render();
      }
    }

    function setModuleTest(){ log('[status] MODULE TEST ✅'); }

    function render(){
      const header =
`MODULE TEST ✅
three=${APP_STATE.three}
xr=${APP_STATE.xr}
renderer=${APP_STATE.renderer}
world=${APP_STATE.world}
floors=${(APP_STATE.floors?.length ?? 0)}
inXR=${APP_STATE.inXR}
touch=${APP_STATE.touchOn}
build=${APP_STATE.build}

XR BASELINE (v4.5)
----------------------------
BUILD=${APP_STATE.build}
inXR=${APP_STATE.inXR}
teleportEnabled=${APP_STATE.teleportEnabled}
floors=${(APP_STATE.floors?.length ?? 0)}

[LEFT]  connected=${APP_STATE.left.connected} gamepad=${APP_STATE.left.gamepad}
[RIGHT] connected=${APP_STATE.right.connected} gamepad=${APP_STATE.right.gamepad}

FPS=${fps}

Logs
`;
      return header + logs.slice(-50).join('\n');
    }

    return { log, tick, render, setModuleTest };
  }
};

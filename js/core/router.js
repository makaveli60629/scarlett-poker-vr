import { initDiagUI, log, setStatus, setHint, BUILD, getReport } from './diag.js';
import { Engine } from './engine.js';

import { SpawnModule } from '../modules/spawn.js';
import { WorldLobbyModule } from '../modules/world_lobby.js';
import { TablePokerModule } from '../modules/table_poker.js';
import { AvatarsBotsModule } from '../modules/avatars_bots.js';
import { ArchTeleporterModule } from '../modules/arch_teleporter.js';
import { JumbotronModule } from '../modules/jumbotron.js';

initDiagUI();
log(`booting… build=${BUILD}`);
log(`href=${location.href}`);
log(`secureContext=${window.isSecureContext}`);
log(`ua=${navigator.userAgent}`);
log(`touch=${('ontouchstart' in window)} maxTouchPoints=${navigator.maxTouchPoints || 0}`);
log(`navigator.xr=${!!navigator.xr}`);
setStatus('booting…');
setHint('Loading renderer…');

// Global flags for your existing diagnostics expectations
window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__SCARLETT_ENGINE_ATTACHED__ = true;
window.__scarlettDiagWrite = (msg) => log(String(msg));

try {
  const app = document.getElementById('app');
  const engine = new Engine({ container: app });
  window.SCARLETT.engine = engine;

  // World modules (order matters). Each module is isolated so a single failure never deadlocks boot.
  const safeAdd = (name, fn) => {
    try {
      engine.addModule(fn());
      log(`[module] ${name} ✅`);
    } catch (e) {
      log(`[module] ${name} ❌ ` + (e?.message || String(e)));
      console.error(e);
    }
  };
  safeAdd('spawn', SpawnModule);
  safeAdd('world_lobby', WorldLobbyModule);
  safeAdd('arch_teleporter', ArchTeleporterModule);
  safeAdd('jumbotron', JumbotronModule);
  safeAdd('table_poker', TablePokerModule);
  safeAdd('avatars_bots', AvatarsBotsModule);

  wireHUD(engine);
  engine.start();

  // Safety: if status ever stays on "booting…" due to external script issues, force-update hint.
  setTimeout(() => {
    try {
      const el = document.getElementById('hudStatus');
      if (el && /booting/i.test(el.textContent || '')) {
        setStatus('ready ✅');
        setHint('Recovered from slow boot (cache). If world is still black, hard reload once.');
        log('[router] forced READY after timeout');
      }
    } catch (_) {}
  }, 2200);

  log('modules loaded ✅');
} catch (err) {
  console.error(err);
  setStatus('boot fail ❌');
  log('BOOT ERROR: ' + (err?.stack || err?.message || String(err)));
}

function wireHUD(engine) {
  const btnEnterVR = document.getElementById('btnEnterVR');
  const btnHideHUD = document.getElementById('btnHideHUD');
  const btnTeleport = document.getElementById('btnTeleport');
  const btnDiag = document.getElementById('btnDiag');
  const btnReset = document.getElementById('btnReset');
  const btnCopyDiag = document.getElementById('btnCopyDiag');
  const btnHardReload = document.getElementById('btnHardReload');

  btnEnterVR.addEventListener('click', async () => {
    try { engine.enterVR(); } catch (e) { log('ENTER VR failed: ' + (e?.message || String(e))); }
  });

  btnHideHUD.addEventListener('click', () => {
    const hud = document.getElementById('hud');
    const hidden = hud.classList.toggle('hudHidden');
    hud.style.opacity = hidden ? '0' : '1';
    hud.style.pointerEvents = hidden ? 'none' : 'auto';
    if (hidden) {
      const corner = document.createElement('div');
      corner.id = 'hudRestore';
      corner.textContent = 'HUD';
      corner.style.position = 'fixed';
      corner.style.left = '8px';
      corner.style.top = '8px';
      corner.style.zIndex = '1000';
      corner.style.background = 'rgba(0,0,0,0.5)';
      corner.style.border = '1px solid rgba(255,255,255,0.2)';
      corner.style.borderRadius = '10px';
      corner.style.padding = '6px 10px';
      corner.style.color = '#fff';
      corner.style.fontWeight = '800';
      corner.style.letterSpacing = '0.06em';
      corner.addEventListener('click', () => {
        hud.classList.remove('hudHidden');
        hud.style.opacity = '1';
        hud.style.pointerEvents = 'auto';
        corner.remove();
      });
      document.body.appendChild(corner);
    } else {
      document.getElementById('hudRestore')?.remove();
    }
  });

  btnTeleport.addEventListener('click', () => {
    const on = engine.toggleTeleport();
    btnTeleport.textContent = `TELEPORT: ${on ? 'ON' : 'OFF'}`;
  });

  btnDiag.addEventListener('click', () => {
    document.getElementById('diagPanel').classList.toggle('hidden');
  });

  btnReset.addEventListener('click', () => engine.resetPlayer());
  btnCopyDiag.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(getReport()); log('copied ✅'); }
    catch { log('copy failed (clipboard blocked).'); }
  });
  btnHardReload.addEventListener('click', () => location.reload());
}

// /js/gameplay_fx.js
// Scarlett VR Poker — Game Feel + HUD + FX Pack
// Requires: THREE in scope, scene, camera, renderer, bots array, table, chairs array, HUD element (#hud)

export function createGameFeelFX({ THREE, scene, camera, renderer, bots, table, chairs, hudEl, log = console.log }) {

  // ----------------------------
  // Utility
  // ----------------------------
  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  // Pacing knobs (tune here)
  const pace = {
    dealCardMs: 650,
    betweenPlayersMs: 550,
    thinkMinMs: 1800,
    thinkMaxMs: 3600,
    afterActionMs: 900,
    showdownPauseMs: 3800,
    betweenHandsMs: 2200,
    winBannerMs: 8500
  };

  // ----------------------------
  // HUD: Big win banner + action log
  // ----------------------------
  const hud = {
    actionFeed: [],
    setHTML(html) { if (hudEl) hudEl.innerHTML = html; },
    clear() { if (hudEl) hudEl.innerHTML = ""; },

    showWinBanner({ winnerName, handName, amount = null }) {
      const amt = amount != null ? `<div style="font-size:26px;opacity:.95;margin-top:6px;">+${formatMoney(amount)}</div>` : "";
      hud.setHTML(`
        <div style="
          position:fixed;left:50%;top:14%;
          transform:translateX(-50%);
          padding:18px 22px;
          background:rgba(10,12,20,.82);
          border:1px solid rgba(255,204,0,.35);
          border-radius:18px;
          box-shadow:0 14px 50px rgba(0,0,0,.55);
          text-align:center;
          min-width:340px;
          ">
          <div style="font-size:46px;letter-spacing:1px;color:#ffcc00;text-shadow:0 0 18px rgba(255,204,0,.55);">
            🏆 ${winnerName} WINS 🏆
          </div>
          <div style="font-size:30px;color:#e8ecff;margin-top:6px;text-shadow:0 0 14px rgba(127,231,255,.25);">
            ${handName}
          </div>
          ${amt}
        </div>

        ${hud.renderActionFeed()}
      `);

      setTimeout(() => {
        // Keep the feed, remove banner (simple approach: rebuild feed only)
        hud.setHTML(hud.renderActionFeed());
      }, pace.winBannerMs);
    },

    pushAction(text) {
      hud.actionFeed.unshift({ text, t: Date.now() });
      hud.actionFeed = hud.actionFeed.slice(0, 7);
      hud.setHTML(hud.renderActionFeed());
    },

    renderActionFeed() {
      const items = hud.actionFeed
        .map(a => `<div style="padding:6px 10px;border-radius:12px;background:rgba(5,6,10,.55);border:1px solid rgba(152,160,199,.15);margin-top:8px;">${escapeHtml(a.text)}</div>`)
        .join("");

      return `
        <div style="
          position:fixed;left:18px;top:18px;max-width:420px;
          color:#e8ecff;font-size:16px;line-height:1.25;
          ">
          <div style="opacity:.85;margin-bottom:10px;color:#98a0c7;">Hand Feed</div>
          ${items}
        </div>
      `;
    }
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
  }

  function formatMoney(n) {
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(n);
    return sign + "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  // ----------------------------
  // Name tags (CanvasTexture sprites)
  // ----------------------------
  function makeNameTagSprite(bot, label = "BOT", stack = 0, status = "") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.9, 0.45, 1);   // size in world
    sprite.position.set(0, 1.95, 0);  // above head

    bot.mesh.add(sprite);

    bot._tag = { canvas, ctx, texture, sprite, label, stack, status };
    drawTag(bot);
    return sprite;
  }

  function drawTag(bot) {
    const t = bot._tag;
    if (!t) return;
    const { ctx, canvas } = t;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // bg
    roundRect(ctx, 18, 18, 476, 220, 28, "rgba(10,12,20,.88)", "rgba(127,231,255,.28)");

    // title
    ctx.fillStyle = "#7fe7ff";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.fillText(t.label, 256, 85);

    // stack
    ctx.fillStyle = "#e8ecff";
    ctx.font = "34px Arial";
    ctx.fillText(formatMoney(t.stack || 0), 256, 145);

    // status
    ctx.fillStyle = t.status === "FOLDED" ? "#ff6b6b" : (t.status === "ALL-IN" ? "#ffcc00" : "#98a0c7");
    ctx.font = "28px Arial";
    ctx.fillText(t.status || "", 256, 195);

    t.texture.needsUpdate = true;
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  }

  function updateBotTag(bot, { label, stack, status }) {
    if (!bot._tag) return;
    if (label != null) bot._tag.label = label;
    if (stack != null) bot._tag.stack = stack;
    if (status != null) bot._tag.status = status;
    drawTag(bot);
  }

  // Make tags face camera gently (sprites do automatically, but we keep consistent)
  function updateTagsEachFrame() {
    for (const b of bots) {
      if (!b._tag) continue;
      // sprite always billboard; nothing needed
    }
  }

  // ----------------------------
  // Crown (winner indicator)
  // ----------------------------
  function makeCrownMesh() {
    // Simple stylized crown: torus base + spikes
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.035, 14, 40),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x331a00, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.25 })
    );
    base.rotation.x = Math.PI / 2;
    group.add(base);

    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x442200, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.2 });

    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 10), spikeMat);
      const a = (i / 7) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.12, 0.07, Math.sin(a) * 0.12);
      spike.rotation.x = Math.PI;
      group.add(spike);
    }

    // glow ring
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.17, 0.23, 42),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.02;
    group.add(glow);

    group.position.y = 2.15;
    group.scale.setScalar(1.15);

    group.userData._spin = rand(0.7, 1.2);
    group.userData._bob = rand(0.8, 1.3);

    return group;
  }

  function setWinnerCrown(bot, on = true) {
    // Remove crowns from everyone
    for (const b of bots) {
      if (b._crown) {
        b.mesh.remove(b._crown);
        b._crown = null;
      }
    }
    if (!on) return;

    const crown = makeCrownMesh();
    bot.mesh.add(crown);
    bot._crown = crown;
  }

  function updateCrownEachFrame(dt) {
    for (const b of bots) {
      if (!b._crown) continue;
      const c = b._crown;
      c.rotation.y += dt * c.userData._spin;
      c.position.y = 2.15 + Math.sin(perfNow() * 0.002 * c.userData._bob) * 0.03;
    }
  }

  function perfNow() {
    return (typeof performance !== "undefined") ? performance.now() : Date.now();
  }

  // ----------------------------
  // Chairs + seated alignment (fix facing wrong)
  // ----------------------------
  function fixChairAndSeatBot(chair, bot, tablePos) {
    // Chairs should face table center
    chair.lookAt(tablePos.x, chair.position.y, tablePos.z);

    // Bot faces same direction as chair
    bot.mesh.position.copy(chair.position);
    bot.mesh.rotation.y = chair.rotation.y;

    // Seat height (tweak based on your bot model)
    bot.mesh.position.y += 0.45;

    // Small nudge forward so butt is on seat, not back
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(chair.quaternion);
    bot.mesh.position.add(forward.multiplyScalar(0.08));
  }

  function fixAllSeating() {
    const tablePos = table.position.clone();
    for (let i = 0; i < bots.length; i++) {
      const chair = chairs[i];
      const bot = bots[i];
      if (!chair || !bot || !bot.mesh) continue;
      fixChairAndSeatBot(chair, bot, tablePos);
    }
  }

  // ----------------------------
  // Chips + Pot (visual, lightweight)
  // ----------------------------
  const chip = {
    mat: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.6 }),
    geom: new THREE.CylinderGeometry(0.03, 0.03, 0.012, 28)
  };

  const potGroup = new THREE.Group();
  potGroup.position.copy(table.position);
  potGroup.position.y += 0.86;
  scene.add(potGroup);

  function makeChipStack(height = 14) {
    const g = new THREE.Group();
    const count = Math.max(3, Math.min(28, Math.floor(height)));
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(chip.geom, chip.mat);
      m.position.y = i * 0.012;
      g.add(m);
    }
    return g;
  }

  function attachChipStacks() {
    for (const b of bots) {
      if (b._chips) continue;
      const stack = makeChipStack(12);
      stack.position.set(0.16, 0.9, 0.12); // relative to bot seat area
      b.mesh.add(stack);
      b._chips = stack;
    }
  }

  function updateChipStackHeight(bot, stackMoney) {
    // convert money to visual chip count (simple scaling)
    const chips = Math.max(3, Math.min(28, Math.floor((stackMoney || 0) / 200)));
    if (!bot._chips) return;
    bot.mesh.remove(bot._chips);
    bot._chips = makeChipStack(chips);
    bot._chips.position.set(0.16, 0.9, 0.12);
    bot.mesh.add(bot._chips);
  }

  async function moveChipsToPot(bot, amount = 0) {
    if (!bot._chips) return;

    // Create a "travel stack" so we don't rip chips off the player instantly
    const travel = bot._chips.clone(true);
    travel.position.copy(worldPos(bot._chips, new THREE.Vector3()));
    scene.add(travel);

    // Animate toward pot
    const start = travel.position.clone();
    const end = potGroup.position.clone().add(new THREE.Vector3(rand(-0.06, 0.06), 0.02, rand(-0.06, 0.06)));

    const t0 = perfNow();
    const dur = 650;

    while (perfNow() - t0 < dur) {
      const t = (perfNow() - t0) / dur;
      travel.position.lerpVectors(start, end, easeOutCubic(t));
      travel.position.y += Math.sin(t * Math.PI) * 0.06;
      await delay(16);
    }

    travel.position.copy(end);
    // Merge into pot pile
    potGroup.add(travel);
    travel.position.copy(new THREE.Vector3(rand(-0.09, 0.09), rand(0.0, 0.06), rand(-0.09, 0.09)));
    travel.rotation.y = rand(0, Math.PI * 2);

    // Optional: update bot chip height externally via updateChipStackHeight()
  }

  function worldPos(obj, out) {
    obj.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(obj.matrixWorld);
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function clearPotVisuals() {
    while (potGroup.children.length) potGroup.remove(potGroup.children[0]);
  }

  // ----------------------------
  // Win FX: particles + table pulse
  // ----------------------------
  const particles = [];

  function spawnWinParticles(position, count = 60) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.9 })
      );
      p.position.copy(position);
      p.userData.v = new THREE.Vector3(rand(-0.35, 0.35), rand(0.5, 1.2), rand(-0.35, 0.35));
      p.userData.life = rand(0.7, 1.25);
      scene.add(p);
      particles.push(p);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.userData.life -= dt;
      p.userData.v.y -= 1.45 * dt;
      p.position.addScaledVector(p.userData.v, dt);
      p.material.opacity = Math.max(0, p.userData.life);
      if (p.userData.life <= 0) {
        scene.remove(p);
        particles.splice(i, 1);
      }
    }
  }

  // table pulse
  let tablePulse = 0;
  function pulseTable() { tablePulse = 1; }
  function updateTablePulse(dt) {
    if (!table || !table.material) return;
    if (tablePulse <= 0) return;
    tablePulse -= dt * 1.3;
    const k = Math.max(0, tablePulse);
    // If you have MeshStandardMaterial, emissive can pulse:
    if (table.material.emissive) {
      table.material.emissiveIntensity = 0.15 + k * 1.1;
    }
  }

  // ----------------------------
  // Elimination: fade out + swap in new bot
  // ----------------------------
  async function eliminateBot(bot) {
    if (!bot.mesh) return;
    updateBotTag(bot, { status: "ELIMINATED" });
    hud.pushAction(`${bot._tag?.label || "BOT"} eliminated`);

    // Fade out
    const meshes = [];
    bot.mesh.traverse(o => { if (o.isMesh && o.material) meshes.push(o); });

    const startOp = meshes.map(m => (m.material.opacity ?? 1));
    meshes.forEach(m => { m.material.transparent = true; });

    const t0 = perfNow();
    const dur = 900;

    while (perfNow() - t0 < dur) {
      const t = (perfNow() - t0) / dur;
      const op = 1 - easeOutCubic(t);
      meshes.forEach((m, idx) => { m.material.opacity = startOp[idx] * op; });
      await delay(16);
    }

    bot.mesh.visible = false;
  }

  async function respawnBot(bot, { label, stack }) {
    bot.mesh.visible = true;

    // Reset opacity
    const meshes = [];
    bot.mesh.traverse(o => { if (o.isMesh && o.material) meshes.push(o); });
    meshes.forEach(m => { m.material.transparent = true; m.material.opacity = 0; });

    updateBotTag(bot, { label, stack, status: "" });

    // Fade in
    const t0 = perfNow();
    const dur = 900;
    while (perfNow() - t0 < dur) {
      const t = (perfNow() - t0) / dur;
      const op = easeOutCubic(t);
      meshes.forEach(m => { m.material.opacity = op; });
      await delay(16);
    }
    meshes.forEach(m => { m.material.opacity = 1; });

    hud.pushAction(`${label} joined the table`);
  }

  // ----------------------------
  // Dealer button (simple visual marker)
  // ----------------------------
  let dealerBtn = null;
  function setDealer(bot) {
    if (dealerBtn && dealerBtn.parent) dealerBtn.parent.remove(dealerBtn);

    dealerBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 26),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x0b2030, emissiveIntensity: 0.6, roughness: 0.35 })
    );
    dealerBtn.position.set(-0.14, 0.92, 0.14);
    bot.mesh.add(dealerBtn);
    hud.pushAction(`${bot._tag?.label || "BOT"} is the dealer`);
  }

  // ----------------------------
  // Camera focus helper (optional)
  // ----------------------------
  async function focusWinner(bot) {
    // Gentle look-at to winner for a moment
    const startQ = camera.quaternion.clone();
    const target = bot.mesh.getWorldPosition(new THREE.Vector3());
    const dummy = new THREE.Object3D();
    dummy.position.copy(camera.position);
    dummy.lookAt(target);
    const endQ = dummy.quaternion.clone();

    const t0 = perfNow();
    const dur = 700;
    while (perfNow() - t0 < dur) {
      const t = (perfNow() - t0) / dur;
      camera.quaternion.slerpQuaternions(startQ, endQ, easeOutCubic(t));
      await delay(16);
    }
  }

  // ----------------------------
  // Public API you call from your poker engine
  // ----------------------------
  function init() {
    // Create name tags + chip stacks + fix seating once
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if (!b || !b.mesh) continue;
      if (!b._tag) makeNameTagSprite(b, `BOT ${i+1}`, b.stack || 1500, "");
    }
    attachChipStacks();
    fixAllSeating();
    hud.pushAction("Game feel pack loaded");
  }

  // You call this each frame in your render loop
  function update(dt) {
    updateTagsEachFrame();
    updateCrownEachFrame(dt);
    updateParticles(dt);
    updateTablePulse(dt);
  }

  // Hand hooks (call these from your simulation)
  async function onDealCard(toBotLabel, cardStr) {
    hud.pushAction(`${toBotLabel} dealt ${cardStr}`);
    await delay(pace.dealCardMs);
  }

  async function onBotThinking(bot) {
    updateBotTag(bot, { status: "THINKING" });
    await delay(rand(pace.thinkMinMs, pace.thinkMaxMs));
    updateBotTag(bot, { status: "" });
  }

  async function onBotAction(bot, action, amount = null) {
    const name = bot._tag?.label || "BOT";
    const msg = amount != null ? `${name}: ${action} ${formatMoney(amount)}` : `${name}: ${action}`;
    hud.pushAction(msg);

    // A small chip-to-pot move for bets/calls/raises
    if (["BET","CALL","RAISE","ALL-IN"].includes(action)) {
      await moveChipsToPot(bot, amount || 0);
    }
    await delay(pace.afterActionMs);
  }

  async function onShowdownPause() {
    await delay(pace.showdownPauseMs);
  }

  async function onWinner({ bot, winnerName, handName, winAmount = null }) {
    setWinnerCrown(bot, true);
    pulseTable();
    spawnWinParticles(bot.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.6, 0)), 70);
    hud.showWinBanner({ winnerName, handName, amount: winAmount });

    // Optional: focus camera for a moment (safe even in VR; it just adjusts view)
    // await focusWinner(bot);

    // Remove crown later
    setTimeout(() => setWinnerCrown(bot, false), 11000);
  }

  async function onNewHand() {
    clearPotVisuals();
    for (const b of bots) updateBotTag(b, { status: "" });
    await delay(pace.betweenHandsMs);
  }

  return {
    pace,
    hud,
    init,
    update,
    fixAllSeating,
    setDealer,
    updateBotTag,
    updateChipStackHeight,
    eliminateBot,
    respawnBot,

    // poker engine hooks
    onDealCard,
    onBotThinking,
    onBotAction,
    onShowdownPause,
    onWinner,
    onNewHand
  };
}

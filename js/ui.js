import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const RANKS = ["BRONZE","SILVER","GOLD","PLATINUM","DIAMOND","LEGEND"];

function rankColor(rank){
  switch(rank){
    case "BRONZE": return "#b87333";
    case "SILVER": return "#c0c0c0";
    case "GOLD": return "#ffd54a";
    case "PLATINUM": return "#67d6ff";
    case "DIAMOND": return "#9b59ff";
    case "LEGEND": return "#ffcf6e";
    default: return "#ffffff";
  }
}

function teamColor(team){
  switch(team){
    case "SPADES": return "#cfd8ff";
    case "HEARTS": return "#ff4d6d";
    case "CLUBS": return "#33ff88";
    case "DIAMONDS": return "#2b7bff";
    default: return "#ffffff";
  }
}

function bgStyleColors(style){
  // Changeable backgrounds (extend later)
  switch(style){
    case "FELT_BLACK": return { bg:"#0a0b10", border:"#2a2f48" };
    case "NEON_PURPLE": return { bg:"#120a1f", border:"#7a2cff" };
    case "ICE_BLUE": return { bg:"#071321", border:"#67d6ff" };
    case "CRIMSON": return { bg:"#20080c", border:"#ff4d6d" };
    default: return { bg:"#0a0b10", border:"#2a2f48" };
  }
}

function badgeGlyph(ctx, x, y, size, id){
  // Simple icon shapes for now (no external images)
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;

  const s = size;
  if (id === "SHOWDOWN_TOP10") { // star
    ctx.beginPath();
    for (let i=0;i<10;i++){
      const a = (i/10)*Math.PI*2;
      const r = (i%2===0) ? s*0.42 : s*0.18;
      ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (id === "EVENT_WINNER") { // crown
    ctx.beginPath();
    ctx.moveTo(-s*0.4, s*0.25);
    ctx.lineTo(-s*0.25, -s*0.15);
    ctx.lineTo(0, s*0.05);
    ctx.lineTo(s*0.25, -s*0.15);
    ctx.lineTo(s*0.4, s*0.25);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (id === "STREAK_MASTER") { // flame
    ctx.beginPath();
    ctx.moveTo(0, -s*0.45);
    ctx.quadraticCurveTo(s*0.42, -s*0.05, s*0.05, s*0.45);
    ctx.quadraticCurveTo(-s*0.25, s*0.25, -s*0.12, 0);
    ctx.quadraticCurveTo(-s*0.25, -s*0.2, 0, -s*0.45);
    ctx.fill(); ctx.stroke();
  } else if (id === "FOUNDER") { // diamond
    ctx.beginPath();
    ctx.moveTo(0, -s*0.45);
    ctx.lineTo(s*0.35, 0);
    ctx.lineTo(0, s*0.45);
    ctx.lineTo(-s*0.35, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (id === "TEAM_MVP") { // medal
    ctx.beginPath();
    ctx.arc(0, 0, s*0.32, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s*0.18, -s*0.35);
    ctx.lineTo(-s*0.02, -s*0.12);
    ctx.lineTo(s*0.02, -s*0.12);
    ctx.lineTo(s*0.18, -s*0.35);
    ctx.stroke();
  } else { // default dot
    ctx.beginPath();
    ctx.arc(0, 0, s*0.25, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}

function makeTagTexture(identity, alpha, fx){
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  const { bg, border } = bgStyleColors(identity.bgStyle);
  const rCol = rankColor(identity.rank);
  const tCol = teamColor(identity.team);

  // Background plate
  ctx.globalAlpha = alpha;
  ctx.fillStyle = bg;
  roundRect(ctx, 16, 44, 480, 168, 22);
  ctx.fill();

  // Border
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  roundRect(ctx, 16, 44, 480, 168, 22);
  ctx.stroke();

  // Rank frame accent
  ctx.strokeStyle = rCol;
  ctx.lineWidth = 5;
  roundRect(ctx, 22, 50, 468, 156, 18);
  ctx.stroke();

  // Team underline
  ctx.strokeStyle = tCol;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(48, 188);
  ctx.lineTo(464, 188);
  ctx.stroke();

  // Badges row
  const badges = Array.isArray(identity.badges) ? identity.badges : [];
  const maxBadges = Math.min(badges.length, 6);
  let bx = 60;
  for (let i=0;i<maxBadges;i++){
    // badge pill
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    roundRect(ctx, bx-18, 62, 52, 36, 12);
    ctx.fill(); ctx.stroke();

    badgeGlyph(ctx, bx+8, 80, 30, badges[i]);
    bx += 66;
  }

  // Name
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(identity.name || "Player", 48, 132);

  // Rank text
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "bold 22px Arial";
  ctx.fillText(identity.rank || "BRONZE", 48, 168);

  // Legend subtle aura indicator
  if (identity.rank === "LEGEND") {
    ctx.strokeStyle = "rgba(255, 207, 110, 0.55)";
    ctx.lineWidth = 10;
    roundRect(ctx, 12, 40, 488, 176, 26);
    ctx.stroke();
  }

  // FX overlay (streak glow / fire)
  if (fx?.mode === "GLOW") {
    ctx.strokeStyle = `rgba(255,255,255,${0.22 * fx.intensity})`;
    ctx.lineWidth = 14;
    roundRect(ctx, 10, 38, 492, 180, 28);
    ctx.stroke();
  } else if (fx?.mode === "FIRE") {
    // Warm pulsing border
    ctx.strokeStyle = `rgba(255, 120, 60, ${0.35 * fx.intensity})`;
    ctx.lineWidth = 16;
    roundRect(ctx, 10, 38, 492, 180, 28);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  tex.anisotropy = 2;
  return tex;
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

export class GamerTags {
  constructor(scene, camera, opts={}){
    this.scene = scene;
    this.camera = camera;
    this.dwellSeconds = opts.dwellSeconds ?? 5.0;

    this.entries = new Map(); // playerId -> entry
    this.currentTarget = null;
    this.dwellTimer = 0;
  }

  attachToPlayer(playerObj, anchorObj){
    const id = playerObj.userData?.identity?.id || playerObj.uuid;
    const entry = this._makeEntry(playerObj, anchorObj);
    this.entries.set(id, entry);
  }

  _makeEntry(playerObj, anchorObj){
    const identity = playerObj.userData.identity;

    const geo = new THREE.PlaneGeometry(1.35, 0.68); // readable in VR
    const mat = new THREE.MeshBasicMaterial({ transparent:true, depthWrite:false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999;
    mesh.visible = false;

    anchorObj.add(mesh);

    return {
      player: playerObj,
      anchor: anchorObj,
      mesh,
      alpha: 0,
      show: false,
      fx: { mode:"NONE", intensity:0 },
      lastTexture: null,
      textureCooldown: 0
    };
  }

  // update(dt, lookedPlayerObjectOrNull)
  update(dt, looked){
    // Dwell tracking
    if (looked && looked.userData?.isPlayer) {
      if (this.currentTarget !== looked) {
        this.currentTarget = looked;
        this.dwellTimer = 0;
      } else {
        this.dwellTimer += dt;
      }
    } else {
      this.currentTarget = null;
      this.dwellTimer = 0;
    }

    // Show/hide based on dwell
    for (const entry of this.entries.values()){
      const isTarget = (this.currentTarget === entry.player);
      const shouldShow = isTarget && (this.dwellTimer >= this.dwellSeconds);

      entry.show = shouldShow;

      // Smooth fade (fast enough to feel responsive)
      const targetAlpha = entry.show ? 1 : 0;
      entry.alpha = THREE.MathUtils.damp(entry.alpha, targetAlpha, 10, dt);

      entry.mesh.visible = entry.alpha > 0.02;
      entry.mesh.material.opacity = entry.alpha;

      // Billboard face camera
      if (entry.mesh.visible) {
        entry.mesh.quaternion.copy(this.camera.quaternion);
      }

      // Update streak FX
      this._updateStreakFx(entry, dt);

      // Update texture at a controlled rate (so Android doesn’t choke)
      entry.textureCooldown -= dt;
      if (entry.mesh.visible && entry.textureCooldown <= 0) {
        entry.textureCooldown = 0.18; // ~5 fps updates max

        const identity = entry.player.userData.identity;
        const tex = makeTagTexture(identity, entry.alpha, entry.fx);

        // Clean up old texture to reduce memory usage
        if (entry.lastTexture) entry.lastTexture.dispose();
        entry.lastTexture = tex;

        entry.mesh.material.map = tex;
        entry.mesh.material.needsUpdate = true;
      }
    }
  }

  // Streak FX rules:
  // - 3 wins in a row => GLOW
  // - 5 wins in 15 min => FIRE
  // - decay after losses handled by your game logic (we include helper hooks)
  _updateStreakFx(entry, dt){
    const st = entry.player.userData?.identity?.streak;
    if (!st) { entry.fx = { mode:"NONE", intensity:0 }; return; }

    const now = performance.now();

    // Keep only last 15 minutes
    st.recentWins = (st.recentWins || []).filter(t => (now - t) <= 15*60*1000);

    const winsInRow = st.winsInARow || 0;
    const wins15 = st.recentWins.length;

    let mode = "NONE";
    if (wins15 >= 5) mode = "FIRE";
    else if (winsInRow >= 3) mode = "GLOW";

    // Intensity pulse (subtle)
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() * 0.006);
    const intensity = (mode === "NONE") ? 0 : pulse;

    entry.fx = { mode, intensity };
  }

  // Hooks you can call from poker logic later:
  onWin(playerObj){
    const st = playerObj.userData.identity.streak;
    st.winsInARow = (st.winsInARow || 0) + 1;
    st.recentWins = st.recentWins || [];
    st.recentWins.push(performance.now());
  }

  onLoss(playerObj){
    const st = playerObj.userData.identity.streak;
    // decay rules you specified:
    // lose 1 -> weaken (we handle by resetting winsInARow partially)
    // lose 2 -> remove (winsInARow to 0)
    st._lossCount = (st._lossCount || 0) + 1;
    if (st._lossCount === 1) {
      st.winsInARow = Math.max(0, (st.winsInARow || 0) - 2);
    } else {
      st.winsInARow = 0;
      st._lossCount = 0;
      st.recentWins = [];
    }
  }
               }

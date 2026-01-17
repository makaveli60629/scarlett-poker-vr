import * as THREE from "three";
import { buildPokerTable } from "./table.js";
import { buildChairs } from "./chair.js";

const botState = {
  inited: false,
  bots: [],
  pot: 0,
  phase: "idle",
  nextAt: 0,
  deck: [],
  community: []
};

function rnd(a,b){ return a + Math.random()*(b-a); }

function makeDeck() {
  const suits = ["S","H","D","C"];
  const ranks = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push(r+s);
  for (let i=deck.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function textSprite(text) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0,0,256,128);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0,0,256,128);
  g.fillStyle = "#9f9";
  g.font = "bold 26px ui-monospace,monospace";
  g.fillText(text, 14, 60);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(1.4, 0.7, 1);
  sp.userData._canvas = c;
  sp.userData._ctx = g;
  sp.userData._tex = tex;
  sp.userData._text = text;
  return sp;
}

function setSpriteText(sp, text) {
  const g = sp.userData._ctx;
  g.clearRect(0,0,256,128);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0,0,256,128);
  g.fillStyle = "#9f9";
  g.font = "bold 26px ui-monospace,monospace";
  g.fillText(text, 14, 60);
  sp.userData._tex.needsUpdate = true;
  sp.userData._text = text;
}

export async function initBots(ctx) {
  if (botState.inited) return;
  const { scene, log } = ctx;

  // Build table + chairs for bot demo
  buildPokerTable(ctx);
  buildChairs(ctx);

  // Create 3 bots (simple spheres) sitting at seats 1,3,5
  const picks = [0,2,4];
  for (let i=0;i<picks.length;i++){
    const seat = ctx.seats[picks[i]];
    const bot = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x8844ff, roughness: 0.85, metalness: 0.12, emissive: new THREE.Color(0x220033), emissiveIntensity: 0.25 })
    );
    bot.position.copy(seat.position).add(new THREE.Vector3(0,0.35,0));
    bot.name = `BOT_${i+1}`;
    scene.add(bot);

    const tag = textSprite(`BOT ${i+1} 10,000`);
    tag.position.copy(bot.position).add(new THREE.Vector3(0,0.35,0));
    scene.add(tag);

    botState.bots.push({ bot, tag, chips: 10000, last: "READY" });
  }

  botState.inited = true;
  botState.phase = "new_hand";
  botState.nextAt = performance.now() + 800;
  log?.("[bots] ready ✓ (3 demo bots + mini hand loop)");
}

function dealCommunity(ctx, n) {
  while (n-- > 0) botState.community.push(botState.deck.pop());
  // visualize on 5 card slots
  for (let i=0;i<ctx.cards.length;i++){
    const mat = ctx.cards[i].material;
    const has = botState.community[i];
    mat.opacity = has ? 0.95 : 0.15;
  }
}

function step(ctx) {
  const { log } = ctx;

  if (botState.phase === "new_hand") {
    botState.deck = makeDeck();
    botState.community = [];
    botState.pot = 0;
    log?.("🃏 New hand started (demo)");
    botState.phase = "preflop";
    botState.nextAt = performance.now() + 900;
    return;
  }

  if (botState.phase === "preflop") {
    // each bot posts small blind-ish
    for (const b of botState.bots) {
      const bet = Math.floor(rnd(50, 120));
      b.chips -= bet; botState.pot += bet;
      b.last = `BET ${bet}`;
      setSpriteText(b.tag, `${b.bot.name.replace("_"," ")} ${b.chips.toLocaleString()}`);
    }
    log?.(`💰 Pot = ${botState.pot.toLocaleString()} (preflop)`);
    botState.phase = "flop";
    botState.nextAt = performance.now() + 1200;
    return;
  }

  if (botState.phase === "flop") {
    dealCommunity(ctx, 3);
    log?.("🟩 FLOP dealt");
    botState.phase = "turn";
    botState.nextAt = performance.now() + 1200;
    return;
  }

  if (botState.phase === "turn") {
    dealCommunity(ctx, 1);
    log?.("🟨 TURN dealt");
    botState.phase = "river";
    botState.nextAt = performance.now() + 1200;
    return;
  }

  if (botState.phase === "river") {
    dealCommunity(ctx, 1);
    log?.("🟥 RIVER dealt");
    botState.phase = "showdown";
    botState.nextAt = performance.now() + 1200;
    return;
  }

  if (botState.phase === "showdown") {
    const winner = botState.bots[Math.floor(Math.random()*botState.bots.length)];
    winner.chips += botState.pot;
    setSpriteText(winner.tag, `${winner.bot.name.replace("_"," ")} ${winner.chips.toLocaleString()}`);
    log?.(`🏆 ${winner.bot.name} wins pot ${botState.pot.toLocaleString()} (demo)`);
    botState.phase = "new_hand";
    botState.nextAt = performance.now() + 1600;
    return;
  }
}

export function tick(ctx) {
  if (!botState.inited) return;
  const now = performance.now();
  if (now < botState.nextAt) return;
  step(ctx);
}

// /js/modules/_registry.js — Scarlett Module Loader (FULL)
// BUILD: MODULE_REGISTRY_FULL_v1_LOCKED
//
// ✅ Central list of modules (enable/disable safely)
// ✅ Safe dynamic import per-module (failures DO NOT crash world)
// ✅ Auto-register status into world.registry (diag)
// ✅ GitHub Pages cache-bust
//
// Module convention:
//   export async function init(ctx) { ... }
//   OR export default async function(ctx) { ... }
//
// ctx includes:
//   THREE, scene, renderer, player, registry, hooks, worldApi

export const MODULE_BUILD = "MODULE_REGISTRY_FULL_v1_LOCKED";

export const MODULES = [
  // ===============================
  // 🧱 CORE / VISUAL (SAFE FIRST)
  // ===============================
  { id:"WORLD_FULL", file:"world_full.js", enabled:true,  desc:"World visuals & static props" },
  { id:"ENV_LIGHT",  file:"environmentLighting.module.js", enabled:true,  desc:"Environment & lighting tuning" },
  { id:"TABLE_ART",  file:"tableArt.module.js", enabled:true,  desc:"Table textures & decals" },
  { id:"DISSOLVE",   file:"dissolve.js", enabled:true,  desc:"Material dissolve effects" },

  // ===============================
  // 🧍 PLAYER / AVATAR SYSTEM
  // ===============================
  { id:"LOCAL_PLAYER",  file:"localPlayer.module.js", enabled:true,  desc:"Local player root & state" },
  { id:"AVATARS",       file:"avatars.module.js", enabled:true,  desc:"Avatar entity system" },
  { id:"AVATAR_UI",     file:"avatarUI.module.js", enabled:true,  desc:"Avatar UI & selection" },
  { id:"AVATAR_CUSTOM", file:"avatarCustomization.module.js", enabled:false, desc:"Avatar customization (heavy/optional)" },
  { id:"AVATAR_ANIM",   file:"avatarAnimation.module.js", enabled:true,  desc:"Avatar animation bindings" },

  // ===============================
  // ✋ INPUT / XR / CONTROLLERS
  // ===============================
  { id:"LOCOMOTION_XR",     file:"locomotion_xr.js", enabled:true,  desc:"XR locomotion & snap turning" },
  { id:"GESTURE_CTRL",      file:"gestureControl.js", enabled:true,  desc:"Hand / gesture controls" },
  { id:"INTERACTION_HANDS", file:"interactionHands.module.js", enabled:true,  desc:"Hand interactions & raycasts" },
  { id:"HUD",               file:"hud.module.js", enabled:true,  desc:"HUD bindings & buttons" },
  { id:"MENU_UI",           file:"menuUI.module.js", enabled:true,  desc:"In-world menus" },

  // ===============================
  // 🃏 POKER CORE GAMEPLAY
  // ===============================
  { id:"POKER_TABLE",    file:"pokerTable.module.js", enabled:true,  desc:"Poker table logic & seats" },
  { id:"CARDS",          file:"cards.module.js", enabled:true,  desc:"Card spawning & handling" },
  { id:"CHIPS",          file:"chips.module.js", enabled:true,  desc:"Chip stacks & betting" },
  { id:"RULES_TXH",      file:"rulesTexasHoldem.module.js", enabled:true,  desc:"Texas Hold’em rules engine" },
  { id:"POKER_GAMEPLAY", file:"pokerGameplay.module.js", enabled:true,  desc:"Poker round flow" },
  { id:"JACKPOT",        file:"jackpot.js", enabled:false, desc:"Jackpot system (optional)" },

  // ===============================
  // 🔊 AUDIO
  // ===============================
  { id:"AUDIO_LOGIC", file:"audioLogic.js", enabled:true,  desc:"Global audio manager" },
  { id:"POKER_AUDIO", file:"pokerAudio.module.js", enabled:true,  desc:"Poker SFX & cues" },

  // ===============================
  // 🌐 NETWORK / LOBBY (ENABLE LAST)
  // ===============================
  { id:"NET_SYNC",      file:"netSync.module.js", enabled:false, desc:"Network sync (multiplayer)" },
  { id:"LOBBY_MATCH",   file:"lobbyMatchmaking.module.js", enabled:false, desc:"Lobby matchmaking" },
  { id:"LOBBY_STATIONS",file:"lobbyStations.module.js", enabled:true,  desc:"Lobby interaction stations" },

  // ===============================
  // 🛡️ SYSTEM / ADMIN
  // ===============================
  { id:"SETTINGS",   file:"settings.module.js", enabled:true,  desc:"User & system settings" },
  { id:"MODERATION", file:"moderation.js", enabled:false, desc:"Moderation / admin tools" },
  { id:"SLOTS_NET",  file:"slotsNet.module.js", enabled:false, desc:"Slots networking (future)" },
];

function addReg(registry, id, desc, status = "ok", extra = "") {
  try { registry?.add?.(id, desc, status, extra); } catch {}
}

export async function loadModules(ctx) {
  const { registry } = ctx;

  addReg(registry, "MODULE_LOADER", "Module loader online", "ok", `count=${MODULES.length}`);

  const results = [];

  for (const m of MODULES) {
    if (!m?.id || !m?.file) continue;

    const desc = m.desc || m.file;

    if (!m.enabled) {
      addReg(registry, m.id, `DISABLED — ${desc}`, "warn");
      results.push({ id: m.id, ok: true, disabled: true });
      continue;
    }

    try {
      addReg(registry, m.id, `loading — ${desc}`, "ok");

      // Cache-bust to defeat GitHub Pages module caching
      const mod = await import(`./${m.file}?v=${Date.now()}`);

      const init = mod.init || mod.default;
      if (typeof init !== "function") {
        addReg(registry, m.id, `no init() export — ${desc}`, "warn");
        results.push({ id: m.id, ok: true, warn: "no init()" });
        continue;
      }

      const api = await init(ctx);

      addReg(registry, m.id, `ready — ${desc}`, "ok");
      results.push({ id: m.id, ok: true, api });
    } catch (e) {
      const msg = e?.stack || e?.message || String(e);
      addReg(registry, m.id, `FAILED — ${desc}`, "fail", msg);
      results.push({ id: m.id, ok: false, error: msg });

      // Keep world alive; failures are shown in diag
      console.error(`[module:${m.id}]`, e);
    }
  }

  return results;
}

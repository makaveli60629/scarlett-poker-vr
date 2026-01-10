import * as THREE from "three";
import { createPhysicalChip } from "./ChipPhysicalityModule.js";

export async function init(ctx) {
  ctx.wallet = ctx.wallet || { chips: 5000 };
  ctx.bets = ctx.bets || { bears: 0, packers: 0 };

  ctx.chipPool = [];
  ctx.heldChip = { left: null, right: null };

  ctx.LOG?.push?.("log", "[BettingModule] init ✅");
}

export function spawnChipSet(ctx, originWorld) {
  const values = [10, 50, 100, 500, 1000];
  const base = originWorld.clone();

  for (let i = 0; i < values.length; i++) {
    const chip = createPhysicalChip(values[i]);
    chip.position.copy(base).add(new THREE.Vector3((i - 2) * 0.10, 0.02, 0));
    chip.userData.grabbable = true;
    ctx.scene.add(chip);
    ctx.chipPool.push(chip);
  }

  ctx.LOG?.push?.("log", "[BettingModule] spawned chip set ✅");
}

function nearestChip(ctx, handWorldPos, maxDist = 0.08) {
  let best = null;
  let bestD = maxDist;

  for (const c of ctx.chipPool) {
    if (!c.parent) continue;
    const d = c.position.distanceTo(handWorldPos);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function update(dt, ctx) {
  if (!ctx.renderer?.xr?.isPresenting) return;
  if (!ctx.gestures) return;

  _handLogic("left", ctx);
  _handLogic("right", ctx);
}

function _handLogic(side, ctx) {
  const g = ctx.gestures[side];
  const handObj = ctx.hands?.[side];
  if (!handObj) return;

  const handPos = new THREE.Vector3();
  handObj.getWorldPosition(handPos);

  // Grab on pinchDown if not holding
  if (g.pinchDown && !ctx.heldChip[side]) {
    const c = nearestChip(ctx, handPos, 0.09);
    if (c) {
      ctx.heldChip[side] = c;
      ctx.LOG?.push?.("log", `[Betting] ${side} grabbed chip ${c.userData.value}`);

      // click haptic
      ctx.haptics?.click?.("both");
    }
  }

  // While pinching: keep chip at hand
  if (g.pinch && ctx.heldChip[side]) {
    const c = ctx.heldChip[side];
    c.position.copy(handPos);
    c.position.y += 0.01;
  }

  // Release when pinch ends
  if (!g.pinch && ctx.heldChip[side]) {
    const c = ctx.heldChip[side];
    ctx.heldChip[side] = null;

    const v = c.userData.value || 0;

    // Release near table = place bet
    const tableCenter = new THREE.Vector3(0, 0.86, -1.2);
    const dToTable = c.position.distanceTo(tableCenter);

    if (dToTable < 0.65) {
      ctx.bets.bears += v;
      ctx.wallet.chips = Math.max(0, ctx.wallet.chips - v);

      ctx.LOG?.push?.("log", `[Betting] BET placed on BEARS: +${v} (total ${ctx.bets.bears})`);

      // Whale alert
      if (v > 500) {
        ctx.LOG?.push?.("warn", `[WHALE ALERT] Bet ${v} > 500 (glow + 10-pulse haptics)`);
        ctx.haptics?.whale?.("both");
      } else {
        ctx.haptics?.pulse?.("both", 0.55, 30);
      }

      // consume chip
      c.parent?.remove(c);
    } else {
      // Drop on floor
      c.position.y = 0.02;
      ctx.haptics?.pulse?.("both", 0.25, 18);
    }
  }
}

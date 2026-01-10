// /HapticModule.js — VR Boss Casino HapticModule v1.0 (Safe)
// Works when the runtime exposes a haptic actuator through XRInputSource.gamepad.
// Hands-only apps may or may not have haptics available; this module never hard-fails.

export async function init(ctx) {
  ctx.haptics = {
    available: false,
    lastProbe: 0,

    // pulse patterns
    pulse: async (handedness, strength = 0.6, durationMs = 35) => {
      const act = getActuator(ctx, handedness);
      if (!act) return false;
      return safePulse(act, strength, durationMs);
    },

    // Whale: 10 pulses
    whale: async (handedness = "both") => {
      const pattern = Array.from({ length: 10 }, () => ({ strength: 0.85, ms: 35, gap: 55 }));
      return playPattern(ctx, handedness, pattern);
    },

    // Click: 1 short pulse
    click: async (handedness = "both") => {
      const pattern = [{ strength: 0.45, ms: 22, gap: 0 }];
      return playPattern(ctx, handedness, pattern);
    }
  };

  ctx.LOG?.push?.("log", "[HapticModule] init ✅ (safe)");
}

export function update(dt, ctx) {
  // Lazy-probe availability every ~2s
  const now = performance.now();
  if (!ctx.haptics) return;
  if (now - (ctx.haptics.lastProbe || 0) < 2000) return;
  ctx.haptics.lastProbe = now;

  const left = !!getActuator(ctx, "left");
  const right = !!getActuator(ctx, "right");
  const avail = left || right;

  if (avail !== ctx.haptics.available) {
    ctx.haptics.available = avail;
    ctx.LOG?.push?.("log", `[HapticModule] available=${avail}`);
  }
}

function getActuator(ctx, handedness) {
  try {
    const session = ctx.renderer?.xr?.getSession?.();
    if (!session) return null;

    // Find XRInputSource by handedness (left/right)
    const src = Array.from(session.inputSources || []).find(s => s?.handedness === handedness);
    const gp = src?.gamepad;
    const act = gp?.hapticActuators?.[0] || gp?.vibrationActuator || null;

    // Some browsers expose "pulse" (GamepadHapticActuator), some expose "playEffect"
    return act || null;
  } catch {
    return null;
  }
}

async function safePulse(actuator, strength, durationMs) {
  try {
    // Standard: actuator.pulse(strength, duration)
    if (typeof actuator.pulse === "function") {
      await actuator.pulse(clamp01(strength), Math.max(1, durationMs | 0));
      return true;
    }

    // Alternate: actuator.playEffect("dual-rumble", {...})
    if (typeof actuator.playEffect === "function") {
      await actuator.playEffect("dual-rumble", {
        duration: Math.max(1, durationMs | 0),
        strongMagnitude: clamp01(strength),
        weakMagnitude: clamp01(strength)
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function playPattern(ctx, handedness, pattern) {
  const hands = handedness === "both" ? ["left", "right"] : [handedness];

  let any = false;
  for (const step of pattern) {
    const tasks = hands.map(async (h) => {
      const act = getActuator(ctx, h);
      if (!act) return false;
      const ok = await safePulse(act, step.strength, step.ms);
      return ok;
    });

    const results = await Promise.allSettled(tasks);
    if (results.some(r => r.status === "fulfilled" && r.value === true)) any = true;

    if (step.gap && step.gap > 0) await sleep(step.gap);
  }
  return any;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

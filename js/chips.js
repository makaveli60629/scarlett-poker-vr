// /js/modules/chips.js — wrapper to match manifest import path
export async function init(ctx={}){
  const m = await import("./chips.module.js");
  if (typeof m.init === "function") return m.init(ctx);
  if (m.default && typeof m.default.init === "function") return m.default.init(ctx);
  console.warn("[chips] chips.module.js loaded but no init() found");
}
export default { init };

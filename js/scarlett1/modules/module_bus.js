// /js/scarlett1/modules/module_bus.js
export class ModuleBus {
  constructor() { this.mods = []; }
  add(mod) { this.mods.push(mod); }
  async initAll(ctx) {
    for (const m of this.mods) if (m?.init) await m.init(ctx);
  }
  updateAll(ctx) {
    for (const m of this.mods) if (m?.update) m.update(ctx);
  }
}

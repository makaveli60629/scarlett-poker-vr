export function createInteractablesRegistryModule() {
  return {
    name: "interactables_registry",

    onEnable(ctx) {
      const log = (...a) => console.log("[interactables]", ...a);
      const map = new Map();

      function toObj(o) {
        return o && (o.isObject3D ? o : o.object3D || o.mesh || null);
      }

      ctx.interactables = {
        register(obj, meta = {}) {
          const o = toObj(obj);
          if (!o) return false;
          map.set(o, { ...meta, object: o });
          return true;
        },
        unregister(obj) {
          const o = toObj(obj);
          if (!o) return false;
          return map.delete(o);
        },
        clear() { map.clear(); },
        list() { return Array.from(map.values()); },
        objects() { return Array.from(map.keys()); },
        count() { return map.size; },
      };

      Object.defineProperty(ctx.interactables, "all", {
        get() { return Array.from(map.keys()); },
      });

      log("ready ✅");
    },
  };
}

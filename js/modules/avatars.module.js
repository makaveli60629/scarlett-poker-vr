// js/modules/avatars.module.js
// BUILD: AVATARS_FULL_v1
// Lightweight avatar placeholders + hook points for Meta avatar integration.
// Creates: local avatar proxy + bot avatars for world anchors.

export default {
  name: "avatars",
  init(input = {}, maybeApp) {
    const ctx = normalize(input, maybeApp);
    const { THREE, scene, rig, room, debug } = ctx;

    const group = new THREE.Group();
    group.name = "avatarsGroup";
    scene?.add(group);

    // Local avatar proxy (third-person marker)
    const local = makeAvatarProxy(THREE, 0x66ffcc);
    local.name = "avatar_local";
    local.visible = false; // default hidden in 1st person
    group.add(local);

    // Bot proxies if world provides bots
    const bots = [];
    const botGroup = new THREE.Group();
    botGroup.name = "avatar_bots";
    group.add(botGroup);

    const worldBots = room?.anchors?.bots || room?.anchors?.botGroup || room?.anchors?.botsGroup;
    if (worldBots?.children?.length) {
      for (let i = 0; i < worldBots.children.length; i++) {
        const b = makeAvatarProxy(THREE, 0x9999ff);
        b.name = `avatar_bot_${i}`;
        botGroup.add(b);
        bots.push({ proxy: b, target: worldBots.children[i] });
      }
    }

    // Expose API
    const api = {
      name: 'avatars',
      local,
      bots,
      setLocalVisible(v) { local.visible = !!v; },
      setBotsVisible(v) { botGroup.visible = !!v; },
      tick() {
        // follow rig (local)
        if (rig) {
          local.position.copy(rig.position);
          local.position.y = 0.0;
          local.rotation.y = rig.rotation.y;
        }
        // follow bots
        for (const b of bots) {
          if (!b.target) continue;
          b.proxy.position.copy(b.target.position);
          b.proxy.position.y = 0.0;
          b.proxy.rotation.y = b.target.rotation?.y || 0;
        }
      },
      dispose() {
        try { group.parent?.remove(group); } catch {}
      }
    };

    // legacy compat
    const legacy = ctx.avatars || globalThis.avatars;
    if (legacy) {
      legacy.enabled = true;
      legacy.local = api.local;
      legacy.list = [api.local, ...bots.map(b => b.proxy)];
    }

    globalThis.SCARLETT_AVATARS = api;
    debug?.log?.('avatars init ✅');
    return api;
  }
};

function makeAvatarProxy(THREE, color = 0xffffff) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.8, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 })
  );
  body.position.y = 0.9;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 })
  );
  head.position.y = 1.55;
  g.add(head);
  return g;
}

function normalize(input, maybeApp) {
  const ctx = input?.THREE ? input : null;
  const app = (ctx?.app || maybeApp || input?.app || input) || {};
  return {
    THREE: ctx?.THREE || app?.THREE || globalThis.THREE,
    scene: ctx?.scene || app?.scene || globalThis.scene,
    rig: ctx?.rig || app?.rig || globalThis.rig,
    room: ctx?.room || app?.room || globalThis.room,
    debug: ctx?.debug || app?.debug || globalThis.debug,
    avatars: ctx?.avatars || app?.avatars || globalThis.avatars,
  };
}

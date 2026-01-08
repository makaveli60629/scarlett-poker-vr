// /js/BotOutfits.js
// Centralized outfit sizing so bots look consistent.
// Call applyBotOutfit(botMeshOrGroup, { bodyScale, shirtScale, shirtYOffset })

export function applyBotOutfit(bot, opts = {}) {
  const bodyScale = opts.bodyScale ?? 1.0;
  const shirtScale = opts.shirtScale ?? 1.0;
  const shirtYOffset = opts.shirtYOffset ?? 0.0;

  // scale whole bot
  bot.scale.setScalar(bodyScale);

  // if your bot model has named parts, this will catch them:
  const shirt = bot.getObjectByName?.("Shirt") || bot.userData?.shirtMesh;
  if (shirt) {
    shirt.scale.setScalar(shirtScale);
    shirt.position.y += shirtYOffset;
  }

  // optional: tighten head placement if you use a head-only avatar
  const head = bot.getObjectByName?.("Head") || bot.userData?.headMesh;
  if (head && opts.headYOffset != null) {
    head.position.y = opts.headYOffset;
  }
}

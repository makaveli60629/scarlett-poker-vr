// Root boot (kept stable). Tries /js/boot.js first so you can keep Scarlett modules inside /js/.
(async () => {
  try {
    await import("./js/boot.js");
  } catch (e) {
    console.warn("[root boot] /js/boot.js not found or failed, falling back to ./boot_fallback.js", e);
    await import("./boot_fallback.js");
  }
})();
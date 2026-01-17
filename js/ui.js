export async function init(ctx) {
  const { log } = ctx;
  const store = document.getElementById("store-container");
  const toggle = () => {
    store.classList.toggle("on");
    log?.(`[ui] store ${store.classList.contains("on") ? "ON" : "OFF"}`);
  };

  // Desktop toggle
  window.addEventListener("keydown",(e)=>{
    if (e.key.toLowerCase() === "m") toggle();
  });

  // Android buttons
  window.addEventListener("scarlett_menu", toggle);
  window.addEventListener("scarlett_action", toggle);

  log?.("[ui] ready ✓ (M key / ACT/MENU toggles store)");
}

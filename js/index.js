// Locate your renderer.xr.addEventListener("sessionstart", ...) block
renderer.xr.addEventListener("sessionstart", () => {
  setHUDVisible(false);
  android.setEnabled(false);
  
  // --- ADD THESE TWO LINES TO FIX FACING ---
  player.position.set(0, 0, 8); 
  player.rotation.set(0, Math.PI, 0); // Forces 180° rotation to face the table
  
  log("[xr] sessionstart ✅ Facing Table, HUD hidden");
});

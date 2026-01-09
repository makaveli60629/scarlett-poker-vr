// /js/scorpion_room.js — Scorpion Room rules
// You spawn directly seated and instantly in game.

(function initScorpionRoom(){
  window.__SCARLETT_SCORPION__ = true;

  // Choose default seat index (0-7)
  // You can change it any time.
  window.__SCARLETT_SEAT_INDEX__ = 0;

  // Behavior flags
  window.__SCARLETT_SPAWN_MODE__ = "seated"; // "seated" or "lobby"

  // Optional: force recenter to seat
  window.__SCARLETT_RECENTER_MODE__ = "seat"; // "seat" or "lobby"
})();

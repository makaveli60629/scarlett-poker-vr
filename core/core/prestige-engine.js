window.PLAYER_RANK = "BRONZE";

const RANKS = ["BRONZE","SILVER","GOLD","CRIMSON"];

function updateRank(bank) {
  if (bank > 100000) window.PLAYER_RANK = "GOLD";
  if (bank > 250000) window.PLAYER_RANK = "CRIMSON";
}

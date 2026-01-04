export const State = {
  create(){
    return {
      // Global
      mode: "SPECTATE", // SPECTATE | SEATED
      audioOn: false,

      // Economy
      chips: 10000,
      eventChips: 0,
      membershipActive: false,

      // UI
      menuOpen: false,
      toast: "",

      // Movement / seating
      seatedSeatIndex: -1,
      canMove: true,

      // Table config
      maxSeats: 6,

      // Poker state
      handId: 0,
      street: "PREFLOP", // PREFLOP FLOP TURN RIVER SHOWDOWN
      pot: 0,
      currentBet: 0,

      // Players
      players: [], // {id,name,isBot,seatIndex,stack,inHand,folded,hand:[c1,c2],rankLabel}
      leaderboard: [],

      // Feature flags (so we can turn on/off safely)
      flags: {
        snapTurnDegrees: 45,
        teleportFadeMs: 220,
        showNameTagsSpectate: true,
        hideNameTagsSeated: true
      }
    };
  }
};

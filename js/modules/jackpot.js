// jackpot.js — High-value hand rewards

export const Jackpot = {
  checkHand(hand) {
    if (hand === 'ROYAL_FLUSH') return { chips: 100000, fx: 'GOLD_FIREWORKS' };
    if (hand === 'STRAIGHT_FLUSH') return { chips: 50000, fx: 'SILVER_SPARKS' };
    return null;
  }
};

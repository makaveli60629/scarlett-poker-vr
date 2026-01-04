export const State = {
  playerName: "Ron",
  rank: 7,
  money: 10000,

  addMoney(amount) {
    this.money = Math.max(0, (this.money || 0) + amount);
  }
};

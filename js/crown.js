export const Crown = {
  holder: null,        // who currently holds it
  title: "Boss Crown", // later you'll have tiers

  take(from, to) {
    this.holder = to;
    window.dispatchEvent(new CustomEvent("crown_taken", { detail: { from, to, title: this.title } }));
  }
};

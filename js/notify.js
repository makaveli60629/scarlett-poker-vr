export const Notify = {
  init() {
    window.addEventListener("notify", (e) => {
      const text = e?.detail?.text || "...";
      console.log("[Notify]", text);
    });

    window.addEventListener("crown_taken", (e) => {
      const d = e.detail;
      const text = `👑 Crown Taken: ${d.title} from ${d.from} -> ${d.to}`;
      console.log(text);
      window.dispatchEvent(new CustomEvent("notify", { detail: { text } }));
    });
  }
};

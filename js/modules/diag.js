export class Diag {
  constructor({ build }) {
    this.build = build;
    this.box = document.getElementById("diagText");
    this.lines = [];
    this.max = 220;
    this.write(`BUILD=${build}`);
  }

  write(msg) {
    const line = String(msg);
    this.lines.push(line);
    if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
    if (this.box) this.box.textContent = this.lines.join("\n");
    try { console.log(line); } catch (_) {}
  }
}

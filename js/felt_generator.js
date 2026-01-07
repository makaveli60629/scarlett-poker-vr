// /js/felt_generator.js
// Generates casino-style poker felt textures at runtime (NO downloads needed).
// Supports: 4 themes, 6/8 seats, round/oval layouts.
// Returns THREE.CanvasTexture + layout metadata.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const FeltGenerator = {
  THEMES: {
    classic_green: {
      baseA: "#0b3a2a",
      baseB: "#06261d",
      line:  "#e6d9b7",
      accent:"#d6b35a",
      glow:  "#00ffaa",
      text:  "#f2e9d2",
    },
    emerald_lux: {
      baseA: "#0a4a3a",
      baseB: "#04281f",
      line:  "#f0e7d1",
      accent:"#f7d37a",
      glow:  "#2bd7ff",
      text:  "#fff4dd",
    },
    black_gold: {
      baseA: "#111216",
      baseB: "#050608",
      line:  "#d2c08a",
      accent:"#ffcc66",
      glow:  "#ff2bd6",
      text:  "#ffe7b8",
    },
    custom: {
      baseA: "#223",
      baseB: "#111",
      line:  "#eee",
      accent:"#ffd27a",
      glow:  "#00ffaa",
      text:  "#fff",
    },
  },

  make({
    theme = "classic_green",
    seats = 6,
    shape = "oval", // "round" | "oval"
    size = 2048,
    title = "SCARLETT POKER",
    subtitle = "NO LIMIT HOLD'EM",
    custom = null, // optional theme overrides
  } = {}) {
    const t = { ...this.THEMES[theme] };
    if (custom) Object.assign(t, custom);

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const g = ctx.createRadialGradient(size*0.5, size*0.5, size*0.05, size*0.5, size*0.5, size*0.7);
    g.addColorStop(0, t.baseA);
    g.addColorStop(1, t.baseB);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Subtle fabric noise
    ctx.globalAlpha = 0.06;
    for (let i=0;i<9000;i++){
      const x = Math.random()*size, y = Math.random()*size;
      const a = Math.random()*0.7 + 0.3;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Layout coords (normalized)
    const cx = size*0.5, cy = size*0.5;

    // For oval: draw inside an ellipse zone so the layout looks correct
    const oval = (shape === "oval");
    const rx = size * (oval ? 0.40 : 0.40);
    const ry = size * (oval ? 0.30 : 0.40);

    // Helpers
    const strokeEllipse = (x, y, rx, ry, w, color, dash=[]) => {
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = w;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash);
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    };

    const fillEllipse = (x, y, rx, ry, color, alpha=1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    };

    // Outer & inner betting rings
    strokeEllipse(cx, cy, rx*1.05, ry*1.05, size*0.010, t.accent);
    strokeEllipse(cx, cy, rx*0.86, ry*0.86, size*0.006, t.line);
    strokeEllipse(cx, cy, rx*0.70, ry*0.70, size*0.004, t.line, [size*0.01, size*0.01]);

    // Pot circle
    fillEllipse(cx, cy, rx*0.22, ry*0.22, "#000000", 0.20);
    strokeEllipse(cx, cy, rx*0.22, ry*0.22, size*0.006, t.accent);
    ctx.save();
    ctx.fillStyle = t.text;
    ctx.font = `${Math.floor(size*0.035)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("POT", cx, cy);
    ctx.restore();

    // Seat boxes
    const seatBoxes = [];
    const n = seats;
    for (let i=0;i<n;i++){
      const a = (i/n)*Math.PI*2 - Math.PI/2;
      const px = cx + Math.cos(a)*(rx*0.88);
      const py = cy + Math.sin(a)*(ry*0.88);

      // Box orientation
      const bw = size*(oval ? 0.14 : 0.15);
      const bh = size*(oval ? 0.07 : 0.07);

      // Draw rotated rounded rect
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI/2);

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#000";
      roundRect(ctx, -bw/2, -bh/2, bw, bh, size*0.012, true, false);
      ctx.globalAlpha = 1;

      ctx.lineWidth = size*0.0038;
      ctx.strokeStyle = t.line;
      roundRect(ctx, -bw/2, -bh/2, bw, bh, size*0.012, false, true);

      // Small label line
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = size*0.0025;
      ctx.beginPath();
      ctx.moveTo(-bw*0.35, 0);
      ctx.lineTo(bw*0.35, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();

      seatBoxes.push({ index: i, angle: a });
    }

    // Dealer & blinds markers (top area)
    ctx.save();
    ctx.fillStyle = t.text;
    ctx.font = `${Math.floor(size*0.030)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DEALER", cx, cy - ry*0.62);
    ctx.fillText("SMALL BLIND", cx - rx*0.25, cy - ry*0.52);
    ctx.fillText("BIG BLIND",   cx + rx*0.25, cy - ry*0.52);
    ctx.restore();

    // Title arc (simple top arc)
    drawArcText(ctx, title, cx, cy, rx*0.82, -Math.PI*0.92, -Math.PI*0.08, Math.floor(size*0.050), t.text);
    drawArcText(ctx, subtitle, cx, cy, rx*0.74, -Math.PI*0.88, -Math.PI*0.12, Math.floor(size*0.030), t.accent);

    // Suit icons near bottom
    ctx.save();
    ctx.fillStyle = t.text;
    ctx.font = `${Math.floor(size*0.055)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♠  ♥  ♦  ♣", cx, cy + ry*0.65);
    ctx.restore();

    // Export as Three texture
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    return {
      texture: tex,
      theme: t,
      seats,
      shape,
      // these are helpful if you want exact seat positions later:
      seatBoxes,
    };
  },
};

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawArcText(ctx, text, cx, cy, radius, startAngle, endAngle, fontSize, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chars = [...text];
  const angleRange = endAngle - startAngle;
  const step = angleRange / Math.max(chars.length - 1, 1);

  for (let i=0;i<chars.length;i++){
    const a = startAngle + step*i;
    const x = cx + Math.cos(a)*radius;
    const y = cy + Math.sin(a)*radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI/2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

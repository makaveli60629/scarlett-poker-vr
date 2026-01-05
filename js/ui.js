import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const UI = {
  create({ scene, rig, camera }) {
    let audioOn = false;
    let audio;

    // Simple in-VR “toast” panel (always in front of you)
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), mat);
    panel.visible = false;
    scene.add(panel);

    let toastTimer = 0;

    function drawToast(title, body) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(10,12,16,0.85)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(80,200,255,0.75)";
      ctx.lineWidth = 8;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

      ctx.fillStyle = "#eaf6ff";
      ctx.font = "bold 54px Arial";
      ctx.fillText(title, 60, 120);

      ctx.fillStyle = "#cfe9ff";
      ctx.font = "36px Arial";
      wrapText(ctx, body, 60, 200, canvas.width - 120, 46);

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "28px Arial";
      ctx.fillText("Press OK in menu to close", 60, 460);

      tex.needsUpdate = true;
    }

    function toast(title, body, seconds = 2.5) {
      drawToast(title, body);
      panel.visible = true;
      toastTimer = seconds;
    }

    function update(dt) {
      // keep panel in front of camera
      if (panel.visible) {
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);

        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
        panel.position.copy(camPos).addScaledVector(camDir, 1.25);
        panel.quaternion.copy(camera.quaternion);
        panel.rotation.x += 0.06; // slight tilt down (nice)
        panel.position.y -= 0.12;

        toastTimer -= dt;
        if (toastTimer <= 0) panel.visible = false;
      }
    }

    function toggleAudio() {
      audioOn = !audioOn;
      if (audioOn) {
        if (!audio) {
          audio = new Audio("assets/audio/lobby_ambience.mp3");
          audio.loop = true;
          audio.volume = 0.65;
        }
        audio.play().catch(() => {});
        toast("Audio", "Music ON");
      } else {
        if (audio) audio.pause();
        toast("Audio", "Music OFF");
      }
    }

    // Menu overlay (simple HTML alert-style via toast for now)
    let menuOpen = false;
    function toggleMenu(setRoom) {
      menuOpen = !menuOpen;
      if (!menuOpen) {
        toast("Menu", "Closed");
        return;
      }
      toast("Menu", "Lobby (1) • Poker (2) • Store (3) • Audio (A)");
      // Keyboard shortcuts for testing (Quest can ignore)
      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "1") setRoom("lobby");
        if (k === "2") setRoom("poker");
        if (k === "3") setRoom("store");
        if (k === "a") toggleAudio();
        if (k === "escape") { menuOpen = false; window.removeEventListener("keydown", onKey); }
      };
      window.addEventListener("keydown", onKey, { once: false });
      // auto-remove listener when menu closes (simple)
      setTimeout(() => window.removeEventListener("keydown", onKey), 12000);
    }

    return { toast, update, toggleAudio, toggleMenu };
  }
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const w = ctx.measureText(testLine).width;
    if (w > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

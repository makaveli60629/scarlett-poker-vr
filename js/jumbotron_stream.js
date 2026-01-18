// /js/jumbotron_stream.js
// Plays HLS (.m3u8) via hls.js or MP4 natively.
// IMPORTANT: play() must be called from a user gesture (button/trigger).

export class JumbotronStream {
  constructor({ url, muted = true, loop = true } = {}) {
    this.url = url;
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.playsInline = true;
    this.video.muted = !!muted;
    this.video.loop = !!loop;
    this.video.preload = 'auto';
    this.video.autoplay = false;
    this.hls = null;
    this._loaded = false;
  }

  async load() {
    if (!this.url) throw new Error('JumbotronStream.load(): missing url');
    const isHls = this.url.includes('.m3u8');

    if (isHls && window.Hls && window.Hls.isSupported()) {
      this.hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
      this.hls.loadSource(this.url);
      this.hls.attachMedia(this.video);
      await new Promise((resolve, reject) => {
        const onErr = (evt, data) => {
          if (data && data.fatal) reject(new Error(`HLS fatal: ${data.type} ${data.details}`));
        };
        this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => resolve());
        this.hls.on(window.Hls.Events.ERROR, onErr);
      });
      this._loaded = true;
      return;
    }

    // Native fallback (mp4 or native HLS on some browsers)
    this.video.src = this.url;
    this._loaded = true;
  }

  async play() {
    if (!this._loaded) await this.load();
    await this.video.play();
  }

  pause() { try { this.video.pause(); } catch {} }
  setMuted(m) { this.video.muted = !!m; }

  destroy() {
    try { this.pause(); } catch {}
    if (this.hls) { try { this.hls.destroy(); } catch {} }
    this.hls = null;
    try {
      this.video.src = '';
      this.video.load();
    } catch {}
  }
}

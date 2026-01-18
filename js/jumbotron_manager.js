// /js/jumbotron_manager.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { JumbotronStream } from './jumbotron_stream.js';

export class JumbotronManager {
  constructor({ channelsUrl = './streams/channels.json', log = console.log } = {}) {
    this.channelsUrl = channelsUrl;
    this.log = log;
    this.channels = [];
    this.screens = []; // { mesh, stream, tex, channelIndex }
    this.activeAudioScreen = 0;
    this.started = false;
  }

  async loadChannels() {
    const r = await fetch(this.channelsUrl, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Failed to load channels: ${this.channelsUrl}`);
    const data = await r.json();
    this.channels = Array.isArray(data.channels) ? data.channels : [];
    if (!this.channels.length) throw new Error('channels.json has no channels[]');
  }

  async addScreen(mesh, initialChannelIndex = 0) {
    if (!this.channels.length) await this.loadChannels();

    const idx = ((initialChannelIndex % this.channels.length) + this.channels.length) % this.channels.length;
    const ch = this.channels[idx];

    const stream = new JumbotronStream({ url: ch.url, muted: true, loop: true });
    await stream.load();

    const tex = new THREE.VideoTexture(stream.video);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;

    mesh.material.map = tex;
    mesh.material.needsUpdate = true;

    const entry = { mesh, stream, tex, channelIndex: idx };
    this.screens.push(entry);
    stream.setMuted(true);

    return entry;
  }

  async startAll() {
    this.started = true;
    for (const s of this.screens) {
      try { await s.stream.play(); }
      catch (e) { this.log('[jumbotron] play failed', e); }
    }
    this.applyAudioRouting();
  }

  applyAudioRouting() {
    for (let i = 0; i < this.screens.length; i++) {
      const shouldMute = (i !== this.activeAudioScreen);
      this.screens[i].stream.setMuted(shouldMute);
    }
  }

  setActiveAudioScreen(i) {
    if (!this.screens.length) return;
    this.activeAudioScreen = Math.max(0, Math.min(this.screens.length - 1, i));
    this.applyAudioRouting();
  }

  cycleActiveAudio() {
    if (!this.screens.length) return;
    this.setActiveAudioScreen((this.activeAudioScreen + 1) % this.screens.length);
  }

  toggleMuteActive() {
    const s = this.screens[this.activeAudioScreen];
    if (!s) return;
    s.stream.setMuted(!s.stream.video.muted);
  }

  nextChannel(screenIndex = 0) { return this.changeChannel(screenIndex, +1); }
  prevChannel(screenIndex = 0) { return this.changeChannel(screenIndex, -1); }

  async changeChannel(screenIndex, delta) {
    const s = this.screens[screenIndex];
    if (!s) return;

    const next = ((s.channelIndex + delta) % this.channels.length + this.channels.length) % this.channels.length;
    const wasPlaying = this.started && !s.stream.video.paused;

    s.stream.destroy();

    const ch = this.channels[next];
    s.channelIndex = next;
    s.stream = new JumbotronStream({ url: ch.url, muted: true, loop: true });
    await s.stream.load();

    // Retarget the existing VideoTexture
    s.tex.image = s.stream.video;
    s.tex.needsUpdate = true;

    const shouldMute = (screenIndex !== this.activeAudioScreen);
    s.stream.setMuted(shouldMute);

    if (wasPlaying) {
      try { await s.stream.play(); }
      catch (e) { this.log('[jumbotron] channel play failed', e); }
    }
  }

  label(i) {
    const s = this.screens[i];
    if (!s) return '';
    const ch = this.channels[s.channelIndex];
    return `${ch?.name || '?'} (${s.channelIndex + 1}/${this.channels.length})${i === this.activeAudioScreen ? ' 🔊' : ''}${s.stream.video.muted ? ' 🔇' : ''}`;
  }
}

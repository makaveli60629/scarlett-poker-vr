import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { JumbotronStream } from "./jumbotron_stream.js";

export class JumbotronManager{
  constructor({channelsUrl}){
    this.channelsUrl=channelsUrl;
    this.channels=[];
    this.screens=[];
    this.activeAudioScreen=0;
  }
  async loadChannels(){
    const r=await fetch(this.channelsUrl);
    this.channels=(await r.json()).channels;
  }
  async addScreen(mesh,i=0){
    if(!this.channels.length) await this.loadChannels();
    const ch=this.channels[i%this.channels.length];
    const s=new JumbotronStream({url:ch.url,muted:true});
    await s.load();
    const t=new THREE.VideoTexture(s.video);
    mesh.material.map=t;
    this.screens.push({mesh,stream:s,channelIndex:i});
  }
  async startAll(){
    for(const s of this.screens) await s.stream.play();
    this.applyAudio();
  }
  applyAudio(){
    this.screens.forEach((s,i)=>s.stream.setMuted(i!==this.activeAudioScreen));
  }
  nextChannelActive(){this.change(this.activeAudioScreen,1)}
  prevChannelActive(){this.change(this.activeAudioScreen,-1)}
  async change(i,d){
    const s=this.screens[i];
    s.channelIndex=(s.channelIndex+d+this.channels.length)%this.channels.length;
    s.stream.url=this.channels[s.channelIndex].url;
    await s.stream.load();
    await s.stream.play();
  }
  toggleMuteActive(){
    const s=this.screens[this.activeAudioScreen];
    s.stream.setMuted(!s.stream.video.muted);
  }
}

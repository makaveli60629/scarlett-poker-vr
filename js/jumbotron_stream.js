export class JumbotronStream{
  constructor({url,muted=true}={}){
    this.url=url;
    this.video=document.createElement("video");
    this.video.crossOrigin="anonymous";
    this.video.muted=muted;
    this.video.playsInline=true;
    this.hls=null;
  }
  async load(){
    if(this.url.includes(".m3u8") && window.Hls?.isSupported()){
      this.hls=new Hls();
      this.hls.loadSource(this.url);
      this.hls.attachMedia(this.video);
      await new Promise(r=>this.hls.on(Hls.Events.MANIFEST_PARSED,r));
    } else {
      this.video.src=this.url;
    }
  }
  async play(){await this.video.play();}
  setMuted(v){this.video.muted=v;}
}

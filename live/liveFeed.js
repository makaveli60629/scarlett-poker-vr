import { ChipBus } from '../modules/state.js';

export const LiveFeedEngine = {
  start(){
    console.log("LiveFeedEngine online (demo ticker)");
    this.tick();
    setInterval(()=>this.tick(), 60000);
  },
  tick(){
    // Demo-safe ticker: you can swap in real APIs later.
    ChipBus.emit('LIVE_UPDATE', {
      ticker: 'UFC 324 (Jan 24): Gaethje vs Pimblett • NFL Playoffs (Jan 25): Patriots @ Broncos | Rams @ Seahawks'
    });
  }
};

import { ChipBus } from './modules/state.js';
import { Compliance } from './security/compliance.js';
import { Gatekeeper } from './security/gatekeeper.js';
import { LiveFeedEngine } from './live/liveFeed.js';
import { WatchOS } from './watch/watch.js';
import { GoldenTicket } from './modules/goldenTicket.js';
import { AdminSuite } from './admin/ninja.js';

console.log("COLISEUM PRIVATE CLUB BOOT (V4.9)");

WatchOS.init();
GoldenTicket.init();
AdminSuite.init();

// Legal + gate flow
Compliance.init();
Gatekeeper.init();

// Live ticker
LiveFeedEngine.start();

ChipBus.emit("SYSTEM_READY");

import {registerWorld} from "./world.js";
import {registerTable} from "./table.js";
import {registerAvatars} from "./avatars.js";
import {registerPokerDemo} from "./pokerDemo.js";
export function registerAll(e){registerWorld(e);registerTable(e);registerAvatars(e);registerPokerDemo(e);}
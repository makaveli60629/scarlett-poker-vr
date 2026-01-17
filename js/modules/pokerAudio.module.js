import { PokerAudio } from "./audioLogic.js";
import GestureDefault, * as GestureNS from "./gestureControl.js";

const GestureControl = GestureNS.GestureControl || GestureDefault || GestureNS.default;

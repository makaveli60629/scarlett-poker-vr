// Fallback boot if /js/boot.js is missing. (Still shows HUD + loads modules from root.)
import { Boot } from "./js/boot_core.js";
Boot.start({ basePaths: ["./", "./js/"] });

const CONFIG = {
    controls: {
        leftHand: { thumbstick: "Movement", xButton: "Store/Menu" },
        rightHand: { trigger: "Bet", aButton: "Check/Call", bButton: "Fold" }
    },
    gameLogic: {
        winDisplayMs: 10000,
        highlightWinner: true,
        autoSit: true
    },
    assets: {
        texturePath: "assets/textures/"
    }
};
export default CONFIG;


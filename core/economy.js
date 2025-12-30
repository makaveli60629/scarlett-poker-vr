AFRAME.registerSystem('economy', {
    schema: {},

    init: function () {
        // Initialize pots and daily events
        this.pots = {}; // key = tableID, value = total pot
        this.dailyRewardClaimed = {};
        this.tournaments = {}; // key = tournamentID
    },

    createTable: function(tableID) {
        this.pots[tableID] = 0;
    },

    placeBet: function(tableID, playerID, amount) {
        const inv = this.el.sceneEl.systems['inventory'];
        inv.subtractChips(playerID, amount);
        this.pots[tableID] += amount;

        // Update HUD
        const wrist = document.querySelector('[wrist-hud]');
        if (wrist) wrist.components['wrist-hud'].chipText.setAttribute('value', 'CHIPS: $' + inv.getChips(playerID));
        console.log(`Player ${playerID} bet $${amount} on table ${tableID}. Total pot: $${this.pots[tableID]}`);
    },

    getPot: function(tableID) {
        return this.pots[tableID] || 0;
    },

    distributePot: function(tableID, winners) {
        const inv = this.el.sceneEl.systems['inventory'];
        const totalPot = this.getPot(tableID);
        if (winners.length === 0) return;

        const winAmount = Math.floor(totalPot / winners.length);
        winners.forEach(playerID => {
            inv.addChips(playerID, winAmount);
        });

        this.pots[tableID] = 0;
        console.log(`Distributed $${totalPot} among winners: ${winners.join(', ')}`);
    },

    giveDailyReward: function(playerID) {
        const today = new Date().toDateString();
        if (this.dailyRewardClaimed[playerID] === today) {
            console.log(`Player ${playerID} already claimed daily reward.`);
            return;
        }
        const inv = this.el.sceneEl.systems['inventory'];
        inv.addChips(playerID, 1000); // daily free chips
        this.dailyRewardClaimed[playerID] = today;
        console.log(`Daily reward given to player ${playerID}.`);
    },

    createTournament: function(tournamentID, entryCost, prizeAmount, startTime) {
        this.tournaments[tournamentID] = {
            entryCost: entryCost,
            prize: prizeAmount,
            startTime: startTime,
            players: []
        };
        console.log(`Tournament ${tournamentID} created. Entry: $${entryCost}, Prize: $${prizeAmount}`);
    },

    joinTournament: function(tournamentID, playerID) {
        const inv = this.el.sceneEl.systems['inventory'];
        const tour = this.tournaments[tournamentID];
        if (!tour) return console.log(`Tournament ${tournamentID} does not exist.`);
        if (inv.getChips(playerID) < tour.entryCost) return console.log(`Player ${playerID} cannot afford entry.`);
        
        inv.subtractChips(playerID, tour.entryCost);
        tour.players.push(playerID);
        console.log(`Player ${playerID} joined tournament ${tournamentID}.`);
    },

    awardTournamentWinner: function(tournamentID, winnerID) {
        const inv = this.el.sceneEl.systems['inventory'];
        const tour = this.tournaments[tournamentID];
        if (!tour) return console.log(`Tournament ${tournamentID} not found.`);

        inv.addChips(winnerID, tour.prize);
        console.log(`Tournament ${tournamentID} winner: ${winnerID}, prize: $${tour.prize}`);
        delete this.tournaments[tournamentID];
    },

    // AI bot betting for tables
    botBet: function(tableID, botID) {
        const inv = this.el.sceneEl.systems['inventory'];
        const betAmount = Math.floor(Math.random() * 500) + 100; // random bot bet 100-600
        if (inv.getChips(botID) < betAmount) return;
        this.placeBet(tableID, botID, betAmount);
        console.log(`Bot ${botID} bet $${betAmount} on table ${tableID}.`);
    }
});

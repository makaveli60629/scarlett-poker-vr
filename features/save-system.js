// --- THE MEMORY DNA ---

export const SaveSystem = {
    // 1. DATA STRUCTURE
    data: {
        blueChips: 0,
        equippedItems: [],
        lastLogin: null
    },

    // 2. LOAD EVERYTHING
    load() {
        const saved = localStorage.getItem('brick_club_dna');
        if (saved) {
            this.data = JSON.parse(saved);
            console.log("Welcome back! DNA Loaded.");
        } else {
            console.log("New Player detected. Creating DNA...");
            this.save();
        }
        return this.data;
    },

    // 3. SAVE EVERYTHING
    save() {
        localStorage.setItem('brick_club_dna', JSON.stringify(this.data));
    },

    // 4. TRANSACTION LOGIC
    addChips(amount) {
        this.data.blueChips += amount;
        this.save();
    },

    spendChips(amount) {
        if (this.data.blueChips >= amount) {
            this.data.blueChips -= amount;
            this.save();
            return true;
        }
        return false;
    }
};

// Logic to manage Blue Chips and Savings
export const CurrencySystem = {
    balance: localStorage.getItem('blue_chips') || 0,
    add(amount) {
        this.balance = parseInt(this.balance) + amount;
        localStorage.setItem('blue_chips', this.balance);
        console.log("New Balance:", this.balance);
    },
    withdraw(amount) {
        if (this.balance >= amount) {
            this.balance -= amount;
            localStorage.setItem('blue_chips', this.balance);
            return true;
        }
        return false;
    }
};

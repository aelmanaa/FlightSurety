

export default class Passenger {

    constructor(_address, _balance, _getBalance, _pay) {
        this._address = _address
        this._balance = _balance
        this._getBalance = _getBalance
        this._pay = _pay
    }

    get address() {
        return this._address
    }

    get balance() {
        return this._balance
    }

    async updateBalance(){
      this._balance = await this._getBalance(this._address).call()
    }

    async pay(){
        await this._pay().send({from: this._address})
    }

}
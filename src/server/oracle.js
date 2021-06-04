class Oracle {
    _address = ''
    _indexes = []

    constructor(address) {
        this._address = address
    }

    set indexes(indexes) {
        this._indexes = indexes
    }

    get indexes() {
        return this._indexes
    }

    get address() {
        return this._address
    }

    log() {
        return `Address is '${this._address}' and indexes are '${this._indexes}'`
    }

    setRegisterMethod(registerOracle) {
        this._registerOracle = registerOracle
    }

    setGetIndexesMethod(getIndexesMethod) {
        this._getIndexesMethod = getIndexesMethod
    }

    async register(fee) {
        await this._registerOracle().send({
            from: this._address, value: fee
        })

         this._indexes = await this._getIndexesMethod().call({ from: this._address })
    }
}


export default Oracle
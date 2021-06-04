class Oracle {
    _address = ''
    _indexes = []
    _isRegistered = false

    constructor(address, registerOracle, getIndexesMethod, submitOracleResponse) {
        this._address = address
        this._registerOracle = registerOracle
        this._getIndexesMethod = getIndexesMethod
        this._submitOracleResponse = submitOracleResponse

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

    get registered() {
        return this._isRegistered
    }

    log() {
        return `Oracle resgitered '${this._isRegistered}' . Address is '${this._address}' and indexes are '${this._indexes}'`
    }


    async registerAndIndexes(fee) {
        await this._register(fee)
        if (this._isRegistered) {
            this._indexes = await this._retrieveIndexes()
        }
    }

    async _retrieveIndexes() {
        try {
            return await this._getIndexesMethod().call({ from: this._address })
        } catch (error) {
            console.log('Error while getting indexes ', error)
            throw new Error('Error while getting indexes')
        }
    }


    async _register(fee) {

        try {
            await this._registerOracle().send({
                from: this._address, value: fee
            })
            this._isRegistered = true
        } catch (error) {
            console.log('Error during registration ')
            this._isRegistered = false
        }
    }
}


export default Oracle
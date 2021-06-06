class Oracle {
    _address = ''
    _indexes = []
    _isRegistered = false

    constructor(address, registerOracle, getIndexesMethod, submitOracleResponse, isOracleRegistered) {
        this._address = address
        this._registerOracle = registerOracle
        this._getIndexesMethod = getIndexesMethod
        this._submitOracleResponse = submitOracleResponse
        this._isOracleRegistered = isOracleRegistered

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

    async submitResponse(index, airline, flight, timestamp, statusCode) {
        await this._submitOracleResponse(index, airline, flight, timestamp, statusCode).send({
            from: this._address
        })
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
        let isRegistered = await this._isOracleRegistered(this._address).call()
        if(isRegistered){
            console.log(`oracle ${this._address} already registered, skipping registration`)
            this._isRegistered = true
        }else{
            try {
                await this._registerOracle().send({
                    from: this._address, value: fee
                })
                this._isRegistered = true
            } catch (error) {
                console.log('Error during registration ', error.message)
                this._isRegistered = false
            }
        }

    }
}


export default Oracle
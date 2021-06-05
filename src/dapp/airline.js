
import Flight from './flight'

export default class Airline {

    _flights = []
    _address = ''
    _isRegistered = false
    _isQueueRegistration = false
    _isQueueForVote = false



    constructor(_address, _stake, _register, _vote, _isRegisteredAirline, _airlineQueueState) {
        this._address = _address.toLowerCase()
        this._stake = _stake
        this._register = _register
        this._vote = _vote
        this._isRegisteredAirline = _isRegisteredAirline
        this._airlineQueueState = _airlineQueueState
    }

    async stake(fee) {
        try {
            await this._stake().send({ from: this._address, value: fee })
        } catch (e) {
            console.log(e)
        }
    }

    async register(_airline) {
        try {
            await this._register(_airline).send({ from: this._address })
        } catch (e) {
            console.log(e)
            throw new Error('error during registration')
        }
    }

    async vote(_airline, _answer) {
        try {
            await this._vote(_airline, _answer).send({ from: this._address })
        } catch (e) {
            console.log(e)
            throw new Error('error during voting')
        }
    }



    addFlight(_number, _timestamp) {
        this._flights.push(new Flight(_number, _timestamp))
    }

    get flights() {
        return this._flights;
    }

    get address() {
        return this._address
    }

    get isRegistered() {
        return this._isRegistered
    }

    get isQueueRegistration() {
        return this._isQueueRegistration
    }

    get isQueueForVote() {
        return this._isQueueForVote
    }

    async refreshState() {
        try {
            this._isRegistered = await this._isRegisteredAirline(this._address).call()
            let state = await this._airlineQueueState(this._address).call()
            this._isQueueRegistration = state.isInTheQueue
            this._isQueueForVote = state.isReadyForVote
        } catch (e) {
            console.log(e)
            throw new Error('error while refreshing state')
        }
    }


}
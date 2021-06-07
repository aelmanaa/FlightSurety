

export default class Deposit {

    constructor(_passenger,_flight, _deposit){
        this._passenger = _passenger
        this._flight = _flight
        this._deposit = _deposit
    }

    get passenger(){
        return this._passenger
    }

    get flight(){
        return this._flight
    }

    get deposit(){
        return this._deposit
    }

    set deposit(_deposit){
        this._deposit = _deposit
    }

}
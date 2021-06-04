

export default class Flight {

    STATUS_CODE_UNKNOWN = 0
    STATUS_CODE_ON_TIME = 10
    STATUS_CODE_LATE_AIRLINE = 20
    STATUS_CODE_LATE_WEATHER = 30
    STATUS_CODE_LATE_TECHNICAL = 40
    STATUS_CODE_LATE_OTHER = 50

    _number = ''
    _timestamp = ''
    _status = ''

    constructor(_number, _timestamp) {
        this._number = _number
        this._timestamp = _timestamp
        this._status = STATUS_CODE_UNKNOWN
    }

    get status() {
        return this._status
    }

    get timestamp() {
        return this._timestamp
    }

    get number() {
        return this._number
    }

    set status(_status) {
        this._status = status
    }
}
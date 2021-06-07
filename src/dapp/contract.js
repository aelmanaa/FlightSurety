import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import flightSuretyData from '../../build/contracts/FlightSuretyData.json'
import Config from './config.json'
import Web3 from 'web3'
import Airline from './airline'
import Flight from './flight'
import Deposit from './deposit'
import Passenger from './passenger'


const STAKE_PRICE = '10'

export default class Contract {
    _airlines = []
    _flights = []
    _currentAccount = ''
    _deposits = []
    _passengers = []



    constructor(network, callback) {

        this._config = Config[network];
        //this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')))
        if (window.ethereum) {
            this.web3 = new Web3(window.ethereum)
        }
        else {
            throw new Error('Metamask not installed')
        }

        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this._config.appAddress)
        this.flightSuretyData = new this.web3.eth.Contract(flightSuretyData.abi, this._config.dataAddress)
        this.initialize(callback);


    }

    async initAccounts() {
        await this.getMetaskAccountID()
        window.ethereum.on('accountsChanged', async (acc) => {

            try {
                this._currentAccount = acc[0]
                this.updateCurrentAccountElement(this._currentAccount)
            } catch (error) {
                console.log('Error while retrieving current account:', error)
                return

            }
        })

        let balance = this.web3.utils.fromWei(await this.web3.eth.getBalance(this._config.dataAddress), 'ether')
        console.log('flightSuretyData balance ', balance)

        balance = this.web3.utils.fromWei(await this.web3.eth.getBalance(this._config.appAddress), 'ether')
        console.log('flightSuretyApp balance ', balance)

    }


    async initEvents() {

        try {
            let events = await this.flightSuretyApp.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' })
            let ret
            for (let log of events) {
                switch (log.event) {
                    case "OracleRegistered":
                        break
                    case "AIRLINE_REGISTRED":
                    case "AIRLINE_READY_FOR_VOTE":
                    case "AIRLINE_QUEUED":
                        console.log(log)
                        let newAirline = new Airline(log.returnValues._airline,
                            this.flightSuretyApp.methods.stakeAirline,
                            this.flightSuretyApp.methods.registerAirline,
                            this.flightSuretyApp.methods.voteAirline,
                            this.flightSuretyData.methods.isRegistredAirline,
                            this.flightSuretyApp.methods.airlineQueueState,
                            this.flightSuretyApp.methods.registerFlight
                        )
                        await newAirline.refreshState()
                        this.replaceOrPushAirline(newAirline)
                        break
                    case "AIRLINE_REFUSED":
                        console.log(log)
                        this.removeAirline(log.returnValues._airline)
                        break
                    case "FLIGHT_REGISTERED":
                        console.log(log)
                        let newFlight = new Flight(log.returnValues._airline,
                            log.returnValues._flight,
                            log.returnValues._timestamp,
                            log.returnValues._status,
                            this.flightSuretyApp.methods.fetchFlightStatus,
                            log.returnValues._key
                        )
                        this._flights.push(newFlight)
                        break
                    case "FlightStatusInfo":
                        console.log(log)
                        ret = log.returnValues
                        this._flights.forEach((flight) => {
                            if (ret._airline.toLowerCase() === flight._airline.toLowerCase() &&
                                ret._flight === flight.number &&
                                ret._timestamp === flight.timestamp) {
                                flight.status = ret._status
                            }
                        })
                        break
                    case "INSURANCE_DEPOSITED":
                        console.log(log)
                        ret = log.returnValues
                        let passenger = new Passenger(ret._passenger, '0', this.flightSuretyData.methods.getBalance, this.flightSuretyData.methods.pay)
                        await passenger.updateBalance()
                        let flightKey = ret._key
                        let totalDeposit = ret._totalDeposit
                        let flight = this.findFlightByKey(flightKey)
                        let newDeposit = new Deposit(passenger, flight, totalDeposit)
                        this.reduceDeposits(newDeposit)
                        this.reducePassengers(passenger)
                        break
                    default:
                        console.log(log)
                }
            }
        } catch (error) {
            console.log('error while fetching events.', error)
            throw new Error('Error while fetching events')
        }

        this.flightSuretyApp.events.allEvents().on('data', async (log) => {
            let ret
            switch (log.event) {
                case "OracleRegistered":
                    break
                case "AIRLINE_REGISTRED":
                case "AIRLINE_READY_FOR_VOTE":
                case "AIRLINE_QUEUED":
                    console.log(log)
                    let airline = new Airline(log.returnValues._airline,
                        this.flightSuretyApp.methods.stakeAirline,
                        this.flightSuretyApp.methods.registerAirline,
                        this.flightSuretyApp.methods.voteAirline,
                        this.flightSuretyData.methods.isRegistredAirline,
                        this.flightSuretyApp.methods.airlineQueueState,
                        this.flightSuretyApp.methods.registerFlight
                    )
                    await airline.refreshState()
                    this.replaceOrPushAirline(airline)
                    this.triggerRefreshAirlines(this)
                    break
                case "AIRLINE_REFUSED":
                    console.log(log)
                    this.removeAirline(log.returnValues._airline)
                    this.triggerRefreshAirlines(this)
                    break
                case "FLIGHT_REGISTERED":
                    console.log(log)
                    let newFlight = new Flight(log.returnValues._airline,
                        log.returnValues._flight,
                        log.returnValues._timestamp,
                        log.returnValues._status,
                        this.flightSuretyApp.methods.fetchFlightStatus,
                        log.returnValues._key
                    )
                    this._flights.push(newFlight)
                    this.triggerRefreshFlights(this)
                    break
                case "FlightStatusInfo":
                    console.log(log)
                    ret = log.returnValues
                    this._flights.forEach(flight => {
                        if (ret._airline.toLowerCase() === flight._airline.toLowerCase() &&
                            ret._flight === flight.number &&
                            ret._timestamp === flight.timestamp) {
                            flight.status = ret._status
                        }
                    })
                    this.triggerRefreshFlights(this)
                    break
                case "INSURANCE_DEPOSITED":
                    console.log(log)
                    ret = log.returnValues
                    let passenger = new Passenger(ret._passenger, '0', this.flightSuretyData.methods.getBalance, this.flightSuretyData.methods.pay)
                    await passenger.updateBalance()
                    let flightKey = ret._key
                    let totalDeposit = ret._totalDeposit
                    let flight = this.findFlightByKey(flightKey)
                    let newDeposit = new Deposit(passenger, flight, totalDeposit)
                    this.reduceDeposits(newDeposit)
                    this.reducePassengers(passenger)
                    this.triggerRefreshDeposits(this)
                    this.triggerRefreshPassengers(this)
                    break
                default:
                    console.log(log)
            }
        }).on('error', (error, receipt) => {
            console.log('received event error: ', error)
            console.log('received recept error: ', receipt)
        })

    }

    async initialize(callback) {
        await this.initAccounts()

        await this.initEvents()


        // initialize trigger for frontend
        this.updateCurrentAccountElement = () => { }
        this.triggerRefreshAirlines = () => { }

        this.triggerRefreshFlights = () => { }
        this.triggerRefreshDeposits = () => { }
        this.triggerRefreshPassengers = () => { }

        await callback()
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    async stakeAirline() {

        let airline = new Airline(this._currentAccount,
            this.flightSuretyApp.methods.stakeAirline,
            this.flightSuretyApp.methods.registerAirline,
            this.flightSuretyApp.methods.voteAirline,
            this.flightSuretyData.methods.isRegistredAirline,
            this.flightSuretyApp.methods.airlineQueueState,
            this.flightSuretyApp.methods.registerFlight
        )

        this._airlines.push(airline)
        await airline.stake(this.web3.utils.toWei(STAKE_PRICE, 'ether'))
    }

    async registerAirline(address) {
        // first check that the caller is a registered airline
        let callers = this._airlines.filter(airline => airline.address.toLowerCase() === this._currentAccount.toLowerCase())
        let caller
        if (callers.length !== 1) {
            console.error('Number of airlines to call registeration is not corrrect ', callers.length)
        } else {
            caller = callers[0]
        }

        if (!caller.isRegistered) {
            console.error('Caller airline is not registered. It cannot register another airline ', caller)
        } else {

            // first find airline
            let res = this._airlines.filter(airline => airline.address.toLowerCase() === address.toLowerCase())
            if (res.length !== 1) {
                console.error('Number of airlines to be registered is not corrrect ', res.length)
            } else {
                let airline = res[0]
                await caller.register(airline.address)

            }

        }


    }


    async voteAirline(address, answer) {
        // first check that the caller is a registered airline
        let callers = this._airlines.filter(airline => airline.address.toLowerCase() === this._currentAccount.toLowerCase())
        let caller
        if (callers.length !== 1) {
            console.error('Number of airlines to call registeration is not corrrect ', callers.length)
        } else {
            caller = callers[0]
        }

        if (!caller.isRegistered) {
            console.error('Caller airline is not registered. It cannot vote for another airline ', caller)
        } else {

            // first find airline
            let res = this._airlines.filter(airline => airline.address.toLowerCase() === address.toLowerCase())
            if (res.length !== 1) {
                console.error('Number of airlines to be registered is not corrrect ', res.length)
            } else {
                let airline = res[0]
                await caller.vote(airline.address, answer)

            }

        }
    }

    async registerFlight(flightNumber) {
        // first check if caller is in list of known Airlines
        let callers = this._airlines.filter(airline => airline.address.toLowerCase() === this._currentAccount.toLowerCase())
        if (callers.length !== 1) {
            console.error('Number of airlines to call registeration is not corrrect ', callers.length)
        } else {
            let airline = callers[0]
            let timestamp = Math.floor(3600 + (Date.now() / 1000))  // 1hour from now
            await airline.registerFlight(flightNumber, timestamp)

        }

    }


    async fetchFlightStatus(flightNumber) {
        // find flight
        let res = this._flights.filter(flight => flight.number.toLowerCase() === flightNumber.toLowerCase())
        if (res.length !== 1) {
            console.error('Number of flights is not corrrect ', res.length)
        } else {
            let flight = res[0]
            await flight.fetchFlightStatus(this._currentAccount)

        }

    }

    async withdrawBalance(passengerAddress) {
        if (passengerAddress !== this._currentAccount) {
            console.error(`Cannot withdraw money of another account ${passengerAddress} != ${this._currentAccount}`)
        } else {
            let passenger = this._passengers.filter(pass => pass.address === passengerAddress)[0]
            await passenger.pay()
            await passenger.updateBalance()
            this.reducePassengers(passenger)
            this.triggerRefreshPassengers(this)
        }
    }

    async buy(flightKey, deposit) {
        let flight = this._flights.filter(fl => fl.key === flightKey)[0]
        await this.flightSuretyApp.methods.buy(flight.airline, flight.number, flight.timestamp).send({ from: this._currentAccount, value: deposit })
    }

    async getMetaskAccountID() {

        try {

            const accounts = await this.web3.eth.getAccounts()
            this._currentAccount = accounts[0]

        } catch (error) {
            console.log('Error while retrieving current account:', error)
            return

        }

    }

    get airlines() {
        return this._airlines
    }

    get flights() {
        return this._flights
    }

    get passengers() {
        return this._passengers
    }

    get deposits() {
        return this._deposits
    }

    get currentAccount() {
        return this._currentAccount
    }


    replaceOrPushAirline(airline) {
        let indexOfAirline = this._airlines.findIndex(_a => {
            return _a.address.toLowerCase() === airline.address.toLowerCase()
        })
        if (indexOfAirline > -1) {
            this._airlines[indexOfAirline] = airline
        } else {
            this._airlines.push(airline)
        }
    }

    removeAirline(address) {
        this._airlines = this._airlines.filter(a => {
            return address.toLowerCase() !== a.address.toLowerCase()
        })
    }


    findFlightByKey(flightKey) {
        let results = this._flights.filter(flight => flight.key === flightKey)
        if (results.length !== 1) {
            throw new Error(`Number of flights ${results.length} for this key ${flightKey} is not correct`)
        } else {
            return results[0]
        }
    }

    reduceDeposits(newDeposit) {
        console.log('deposit ', newDeposit)
        let idx = -1
        this._deposits.forEach((deposit, index) => {
            if (deposit.passenger.address === newDeposit.passenger.address &&
                deposit.flight.number === newDeposit.flight.number
                && deposit.flight.timestamp === newDeposit.flight.timestamp) {
                idx = index
            }
        })
        if (idx === -1) {
            this._deposits.push(newDeposit)
        } else {
            this._deposits[idx] = newDeposit
        }
        console.log('deposits ', this._deposits)
    }

    reducePassengers(newPassenger) {
        let idx = -1
        this._passengers.forEach((passenger, index) => {
            if (passenger.address === newPassenger.address) {
                idx = index
            }
        })
        if (idx === -1) {
            this._passengers.push(newPassenger)
        } else {
            this._passengers[idx] = newPassenger
        }
    }
}
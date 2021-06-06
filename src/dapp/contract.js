import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import flightSuretyData from '../../build/contracts/FlightSuretyData.json'
import Config from './config.json'
import Web3 from 'web3'
import Airline from './airline'
import Flight from './flight'


const STAKE_PRICE = '10'

export default class Contract {
    _airlines = []
    _flights = []
    _currentAccount = ''



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
            for (let log of events) {
                switch (log.event) {
                    case "AIRLINE_REGISTRED":
                    case "AIRLINE_READY_FOR_VOTE":
                    case "AIRLINE_QUEUED":

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
                        this.removeAirline(log.returnValues._airline)
                        break
                    case "FLIGHT_REGISTERED":
                        let newFlight = new Flight(log.returnValues._airline,
                            log.returnValues._flight,
                            log.returnValues._timestamp,
                            log.returnValues._status,
                            this.flightSuretyApp.methods.fetchFlightStatus
                        )
                        this._flights.push(newFlight)
                        break
                    case "FlightStatusInfo":
                        let ret = log.returnValues
                        this._flights.forEach(flight => {
                            if (ret._airline.toLowerCase() === flight._airline.toLowerCase() &&
                                ret._flight === flight.number &&
                                ret._timestamp === flight.timestamp) {
                                flight.status = ret._status
                            }
                        })
                        this.triggerRefreshFlights(this)
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
            console.log('event received ', log)
            switch (log.event) {
                case "AIRLINE_REGISTRED":
                case "AIRLINE_READY_FOR_VOTE":
                case "AIRLINE_QUEUED":
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
                    this.removeAirline(log.returnValues._airline)
                    this.triggerRefreshAirlines(this)
                    break
                case "FLIGHT_REGISTERED":
                    let newFlight = new Flight(log.returnValues._airline,
                        log.returnValues._flight,
                        log.returnValues._timestamp,
                        log.returnValues._status,
                        this.flightSuretyApp.methods.fetchFlightStatus
                    )
                    this._flights.push(newFlight)
                    this.triggerRefreshFlights(this)
                    break
                case "FlightStatusInfo":
                    let ret = log.returnValues
                    this._flights.forEach(flight => {
                        if (ret._airline.toLowerCase() === flight._airline.toLowerCase() &&
                            ret._flight === flight.number &&
                            ret._timestamp === flight.timestamp) {
                            flight.status = ret._status
                        }
                    })
                    this.triggerRefreshFlights(this)
                    break
                default:
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

    async fetchFlightStatus(flightNumber){
        // find flight
        let res = this._flights.filter(flight => flight.number.toLowerCase() === flightNumber.toLowerCase())
        if (res.length !== 1) {
            console.error('Number of flights is not corrrect ', res.length)
        } else {
            let flight = res[0]
            await flight.fetchFlightStatus(this._currentAccount)

        }

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
}
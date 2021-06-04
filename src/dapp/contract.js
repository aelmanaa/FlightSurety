import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import flightSuretyData from '../../build/contracts/FlightSuretyData.json'
import Config from './config.json'
import Web3 from 'web3'
import Airline from './airline'


const STAKE_PRICE = '10'

export default class Contract {
    _airlines = []
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
        window.ethereum.on('accountsChanged', async(acc) => {

        try {
                this._currentAccount = acc[0]
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
                        this._airlines.push(
                            new Airline(log.returnValues._airline,
                                this.flightSuretyApp.methods.stakeAirline,
                                this.flightSuretyApp.methods.registerAirline,
                                this.flightSuretyApp.methods.voteAirline,
                                this.flightSuretyData.methods.isRegistredAirline,
                                this.flightSuretyApp.methods.airlineQueueState
                            ))
                        await this._airlines[0].refreshState()
                        break
                    case "AIRLINE_QUEUED":
                            let airline = new Airline(log.returnValues._airline,
                                this.flightSuretyApp.methods.stakeAirline,
                                this.flightSuretyApp.methods.registerAirline,
                                this.flightSuretyApp.methods.voteAirline,
                                this.flightSuretyData.methods.isRegistredAirline,
                                this.flightSuretyApp.methods.airlineQueueState
                            )
                            await airline.refreshState()
                            this.replaceOrPushAirline(airline)
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
                case "AIRLINE_QUEUED":
                    let airline = new Airline(log.returnValues._airline,
                        this.flightSuretyApp.methods.stakeAirline,
                        this.flightSuretyApp.methods.registerAirline,
                        this.flightSuretyApp.methods.voteAirline,
                        this.flightSuretyData.methods.isRegistredAirline,
                        this.flightSuretyApp.methods.airlineQueueState
                    )
                    await airline.refreshState()
                    this.replaceOrPushAirline(airline)
                    this.triggerRefreshAirlines(this._airlines)
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
        this.triggerRefreshAirlines = () => {}

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
            this.flightSuretyApp.methods.airlineQueueState
        )

        this._airlines.push(airline)
        await airline.stake(this.web3.utils.toWei(STAKE_PRICE, 'ether'))
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
    
    get currentAccount(){
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
}
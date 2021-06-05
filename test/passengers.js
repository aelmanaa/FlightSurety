let FlightSuretyApp = artifacts.require("FlightSuretyApp")
let FlightSuretyData = artifacts.require("FlightSuretyData")
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { expectEvent } = require('@openzeppelin/test-helpers')
const { assert } = require('chai')
chai.use(chaiAsPromised)
const { expect } = chai
chai.should()

const { sleepNow } = require('./testConfig')

contract('Passengers', async (accounts) => {

    const TEST_ORACLES_COUNT = 20
    const STATUS_CODE_UNKNOWN = 0
    const STATUS_CODE_ON_TIME = 10
    const STATUS_CODE_LATE_AIRLINE = 20
    const STATUS_CODE_LATE_WEATHER = 30
    const STATUS_CODE_LATE_TECHNICAL = 40
    const STATUS_CODE_LATE_OTHER = 50
    const MIN_RESPONSES = 3
    const PASSENGER_INSURANCE_LIMIT = '1'

    let owner, firstAirline, passengers, oracles, flightSuretyData, flightSuretyApp, flight, timestamp, flightTwo
    before('setup contract', async () => {
        owner = accounts[0]
        firstAirline = accounts[1]
        passengers = accounts.slice(2, 5)
        oracles = accounts.slice(5)

        flightSuretyData = await FlightSuretyData.new()
        flightSuretyApp = await FlightSuretyApp.new()

        await flightSuretyData.registerLinkedSuretyApp(flightSuretyApp.address)
        await flightSuretyApp.setUp(flightSuretyData.address, firstAirline, { value: web3.utils.toWei('10', 'ether'), from: owner })

        // register flight
        flight = 'ND1309'; // Course number
        timestamp = Math.floor(3600 + (Date.now() / 1000))  // 1hour from now
        await flightSuretyApp.registerFlight(firstAirline, flight, timestamp)

        flightTwo = 'ND1310'
        await flightSuretyApp.registerFlight(firstAirline, flightTwo, timestamp)

        // initial funding 
        await flightSuretyData.fund({ value: web3.utils.toWei('10', 'ether'), from: owner })

        // Register oracles
        let fee = await flightSuretyApp.REGISTRATION_FEE.call()

        for (let a = 0; a < TEST_ORACLES_COUNT; a++) {
            try {
                await flightSuretyApp.registerOracle({ from: oracles[a], value: fee })
            } catch (e1) {
                await sleepNow(2000)
                //retry 2 times with exponential backoff, there are random revert issues when the loop is too fast
                try {
                    await flightSuretyApp.registerOracle({ from: oracles[a], value: fee })
                }
                catch (e2) {
                    await sleepNow(4000)
                    try {
                        await flightSuretyApp.registerOracle({ from: oracles[a], value: fee })
                    } catch (e3) {
                        await sleepNow(8000)
                        await flightSuretyApp.registerOracle({ from: oracles[a], value: fee })
                    }
                }

            }
        }

    })

    describe('test buying', async () => {
        it('must be known ariline', async () => {
            //owner is not airline
            await flightSuretyApp.buy(owner, flight, timestamp, { value: '1', from: passengers[0] }).should.be.rejectedWith('Airline not registred')
        })

        it('require valid flight number', async () => {
            await flightSuretyApp.buy(firstAirline, '', timestamp, { value: '1', from: passengers[0] }).should.be.rejectedWith('Flight number not valid')
        })

        it('require valid timestamp', async () => {
            await flightSuretyApp.buy(firstAirline, flight, Math.floor((Date.now() / 1000) - 3600), { value: '1', from: passengers[0] }).should.be.rejectedWith('Flight cannot be in the past')
        })

        it('require registred flight', async () => {
            await flightSuretyApp.buy(firstAirline, 'ND1409', timestamp, { value: '1', from: passengers[0] }).should.be.rejectedWith('Flight must be registered')

        })

        it('can deposit full amount', async () => {
            let key = await flightSuretyApp.getFlightKey(firstAirline, flight, timestamp)
            let result = await flightSuretyApp.buy(firstAirline, flight, timestamp, { value: web3.utils.toWei(PASSENGER_INSURANCE_LIMIT, 'ether'), from: passengers[0] })


            // check event
            expectEvent(result, 'INSURANCE_DEPOSITED', { _passenger: passengers[0], _key: key, _depositedAmount: web3.utils.toWei(PASSENGER_INSURANCE_LIMIT, 'ether'), _totalDeposit: web3.utils.toWei(PASSENGER_INSURANCE_LIMIT, 'ether') })
        })
        it('cannot deposit once deposit limit reached', async () => {
            await flightSuretyApp.buy(firstAirline, flight, timestamp, { value: web3.utils.toWei(PASSENGER_INSURANCE_LIMIT, 'ether'), from: passengers[0] }).should.be.rejectedWith('Insurance limit amount exceeded')

        })

        it('can deposit several times', async () => {
            let key = await flightSuretyApp.getFlightKey(firstAirline, flight, timestamp)
            let result = await flightSuretyApp.buy(firstAirline, flight, timestamp, { value: web3.utils.toWei('0.5', 'ether'), from: passengers[1] })
            expectEvent(result, 'INSURANCE_DEPOSITED', { _passenger: passengers[1], _key: key, _depositedAmount: web3.utils.toWei('0.5', 'ether'), _totalDeposit: web3.utils.toWei('0.5', 'ether') })

            result = await flightSuretyApp.buy(firstAirline, flight, timestamp, { value: web3.utils.toWei('0.5', 'ether'), from: passengers[1] })
            expectEvent(result, 'INSURANCE_DEPOSITED', { _passenger: passengers[1], _key: key, _depositedAmount: web3.utils.toWei('0.5', 'ether'), _totalDeposit: web3.utils.toWei('1', 'ether') })

            await flightSuretyApp.buy(firstAirline, flight, timestamp, { value: web3.utils.toWei(PASSENGER_INSURANCE_LIMIT, 'ether'), from: passengers[1] }).should.be.rejectedWith('Insurance limit amount exceeded')
        })

        it('same passenger can deposit for another flight', async () => {
            let key = await flightSuretyApp.getFlightKey(firstAirline, flightTwo, timestamp)

            let result = await flightSuretyApp.buy(firstAirline, flightTwo, timestamp, { value: web3.utils.toWei('0.5', 'ether'), from: passengers[1] })
            expectEvent(result, 'INSURANCE_DEPOSITED', { _passenger: passengers[1], _key: key, _depositedAmount: web3.utils.toWei('0.5', 'ether'), _totalDeposit: web3.utils.toWei('0.5', 'ether') })

            // check total deposit should be 1
            let keyOne = await flightSuretyApp.getFlightKey(firstAirline, flight, timestamp)
            let depositOne = await flightSuretyData.getDeposit(passengers[1], keyOne)
            let depositTwo = await flightSuretyData.getDeposit(passengers[1], key)
            assert.equal(depositOne.toString(), web3.utils.toWei('1', 'ether'), 'Deposit1 not correct')
            assert.equal(depositTwo.toString(), web3.utils.toWei('0.5', 'ether'), 'Deposit2 not correct')
        })

        it('flights have the right passenger number', async () => {
            let flightOnePassengerNumber = await flightSuretyApp.getFlightPassengersNumber(firstAirline, flight, timestamp)
            let flightTwoPassengerNumber = await flightSuretyApp.getFlightPassengersNumber(firstAirline, flightTwo, timestamp)

            assert.equal(flightOnePassengerNumber.toString(), '2', 'Number of passengers not correct')
            assert.equal(flightTwoPassengerNumber.toString(), '1', 'Number of passengers not correct')
        })
    })

    describe('test release insurance', async () => {
        // passenger 0 took insurance for 1 flight & passenger 1 took insurnace for 2 flights
        let resultFlightOne
        let insurees
        before('request flight status', async () => {
            let result, chosenIndex, consensusCounter = 1

            // flight one late because of airlines, both passengers should be credited
            result = await flightSuretyApp.fetchFlightStatus(firstAirline, flight, timestamp)
            chosenIndex = result.logs.filter(log => log.event === 'OracleRequest')[0].args['_index'].toString()
            for (let a = 0; a < TEST_ORACLES_COUNT; a++) {

                // Get oracle information
                let oracleIndexes = await flightSuretyApp.getMyIndexes({ from: oracles[a] })
                for (let idx = 0; idx < 3; idx++) {
                    if (oracleIndexes[idx].toString() !== chosenIndex) {
                        // expect error if we call oracle
                        await flightSuretyApp.submitOracleResponse(oracleIndexes[idx], firstAirline, flight, timestamp, STATUS_CODE_LATE_AIRLINE, { from: oracles[a] }).should.be.rejectedWith('Flight or timestamp or index do not match oracle request')
                    } else {
                        //success
                        result = await flightSuretyApp.submitOracleResponse(oracleIndexes[idx], firstAirline, flight, timestamp, STATUS_CODE_LATE_AIRLINE, { from: oracles[a] })
                        consensusCounter++
                    }
                    await sleepNow(1000)
                }

            }
            if (consensusCounter >= MIN_RESPONSES) {
                expectEvent(result, 'FlightStatusInfo', { _airline: firstAirline, _flight: flight, _timestamp: timestamp.toString(), _status: STATUS_CODE_LATE_AIRLINE.toString() })
                resultFlightOne = result
            } else {
                throw new Error(`Consensus ${MIN_RESPONSES} not reached. number responses is ${consensusCounter}`)
            }

            // flight two late because of weather, passenger will not be credited
            consensusCounter = 1
            result = await flightSuretyApp.fetchFlightStatus(firstAirline, flightTwo, timestamp)
            chosenIndex = result.logs.filter(log => log.event === 'OracleRequest')[0].args['_index'].toString()

            for (let a = 0; a < TEST_ORACLES_COUNT; a++) {

                // Get oracle information
                let oracleIndexes = await flightSuretyApp.getMyIndexes({ from: oracles[a] })
                for (let idx = 0; idx < 3; idx++) {
                    if (oracleIndexes[idx].toString() !== chosenIndex) {
                        // expect error if we call oracle
                        await flightSuretyApp.submitOracleResponse(oracleIndexes[idx], firstAirline, flightTwo, timestamp, STATUS_CODE_LATE_WEATHER, { from: oracles[a] }).should.be.rejectedWith('Flight or timestamp or index do not match oracle request')
                    } else {
                        //success
                        result = await flightSuretyApp.submitOracleResponse(oracleIndexes[idx], firstAirline, flightTwo, timestamp, STATUS_CODE_LATE_WEATHER, { from: oracles[a] })
                        consensusCounter++
                    }
                    await sleepNow(1000)
                }
            }
            if (consensusCounter >= MIN_RESPONSES) {
                expectEvent(result, 'FlightStatusInfo', { _airline: firstAirline, _flight: flightTwo, _timestamp: timestamp.toString(), _status: STATUS_CODE_LATE_WEATHER.toString() })
            } else {
                throw new Error(`Consensus ${MIN_RESPONSES} not reached. number responses is ${consensusCounter}`)
            }
        })

        it('Flights have the right status code', async () => {
            let flightOneStatusCode = await flightSuretyApp.getFlightStatusCode(firstAirline, flight, timestamp)
            assert.equal(flightOneStatusCode.toString(), STATUS_CODE_LATE_AIRLINE.toString(), 'Status not correct')

            let flightTwoStatusCode = await flightSuretyApp.getFlightStatusCode(firstAirline, flightTwo, timestamp)
            assert.equal(flightTwoStatusCode.toString(), STATUS_CODE_LATE_WEATHER.toString(), 'Status not correct')
        })

        it('Expect event FLIGHT_INSURANCE_TOBE_RELEASED for flight one passengers', async () => {
            let key = await flightSuretyApp.getFlightKey(firstAirline, flight, timestamp)
            let passengerNumber = await flightSuretyApp.getFlightPassengersNumber(firstAirline, flight, timestamp)
            expectEvent(resultFlightOne, 'FLIGHT_INSURANCE_TOBE_RELEASED', { _airline: firstAirline, _flight: flight, _timestamp: timestamp.toString(), _key: key, _passengersNumber: passengerNumber.toString() })
        })

        it('Cannot release insurance of flight 2', async () => {
            await flightSuretyApp.releaseInsurance(firstAirline, flightTwo, timestamp).should.be.rejectedWith('Cannot release insurance. status code not correct')
        })

        it('Release insurance for flight 1', async () => {
            let flightOnePassengerNumber = await flightSuretyApp.getFlightPassengersNumber(firstAirline, flight, timestamp)
            let key = await flightSuretyApp.getFlightKey(firstAirline, flight, timestamp)
            let res, deposit, balance
            insurees = await flightSuretyApp.getFlightPassengersList(key)
            let passenger
            for (let i = 0; i < flightOnePassengerNumber; i++) {
                passenger = insurees[flightOnePassengerNumber - 1 - i]
                res = await flightSuretyApp.releaseInsurance(firstAirline, flight, timestamp)
                expectEvent(res, 'INSURANCE_RELEASED', { _passenger: passenger, _key: key, _totalDeposit: web3.utils.toWei('1', 'ether'), _totalReleased: web3.utils.toWei('1.5', 'ether'), _totalBalance: web3.utils.toWei('1.5', 'ether') })
                //check deposit cleared
                deposit = await flightSuretyData.getDeposit(passenger, key)
                assert.equal(deposit.toString(), web3.utils.toWei('0', 'ether'), 'Deposit not correct')

                // check balance in flight surety data, each passenger has 1.5 ether
                balance = await flightSuretyData.getBalance(passenger)
                assert.equal(balance.toString(), web3.utils.toWei('1.5', 'ether'), 'Balance not correct')

            }

            // check insuree list has been cleared

            flightOnePassengerNumber = await flightSuretyApp.getFlightPassengersNumber(firstAirline, flight, timestamp)
            assert.equal(flightOnePassengerNumber.toString(), '0', 'Insuree list should be cleared')
        })

        it('Insurees can withraw their money', async () => {
            let balanceBefore, balanceAfter, delta, blockedBalance
            for (let insuree of insurees) {

                blockedBalance = await flightSuretyData.getBalance(insuree)
                assert.equal(blockedBalance.toString(), web3.utils.toWei('1.5', 'ether'), 'Balance not correct')


                balanceBefore = web3.utils.toBN(await web3.eth.getBalance(insuree))
                // withdraw balance
                await flightSuretyData.pay({ from: insuree, gasPrice: '0' })
                balanceAfter = web3.utils.toBN(await web3.eth.getBalance(insuree))
                delta = web3.utils.fromWei(balanceAfter.sub(balanceBefore), 'ether')
                // check balance
                expect(delta, 'Error: insuree didnt get his payment').to.equal('1.5')

                // balance cleared
                blockedBalance = await flightSuretyData.getBalance(insuree)
                assert.equal(blockedBalance.toString(), web3.utils.toWei('0', 'ether'), 'Balance not cleared')
            }

        })


    })

})

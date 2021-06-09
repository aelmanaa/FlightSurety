let FlightSuretyApp = artifacts.require("FlightSuretyApp")
let FlightSuretyData = artifacts.require("FlightSuretyData")
const chai = require('chai')
const Web3 = require('web3')
const chaiAsPromised = require('chai-as-promised')
const { expectEvent } = require('@openzeppelin/test-helpers')
chai.use(chaiAsPromised)
const { expect } = chai
chai.should()

const { sleepNow } = require('./testConfig')



contract('Oracles', async (accounts) => {


  const TEST_ORACLES_COUNT = 20
  const STATUS_CODE_UNKNOWN = 0
  const STATUS_CODE_ON_TIME = 10
  const STATUS_CODE_LATE_AIRLINE = 20
  const STATUS_CODE_LATE_WEATHER = 30
  const STATUS_CODE_LATE_TECHNICAL = 40
  const STATUS_CODE_LATE_OTHER = 50
  const MIN_RESPONSES = 3

  let owner, firstAirline, oracles, flightSuretyData, flightSuretyApp
  before('setup contract', async () => {
    owner = accounts[0]
    firstAirline = accounts[1]
    oracles = accounts.slice(2)

    flightSuretyData = await FlightSuretyData.new()
    flightSuretyApp = await FlightSuretyApp.new()

    await flightSuretyData.registerLinkedSuretyApp(flightSuretyApp.address)
    await flightSuretyApp.setUp(flightSuretyData.address, firstAirline, { from: owner, value: web3.utils.toWei('10', 'ether') })

    // initial funding 
    await flightSuretyData.fund({ value: web3.utils.toWei('100', 'ether'), from: owner })

    // Watch contract events

  })


  it('can register oracles', async () => {
    // ARRANGE
    let fee = await flightSuretyApp.REGISTRATION_FEE.call()

    async function registerOracle(oracle) {
      await flightSuretyApp.registerOracle({ from: oracle, value: fee })

    }



    // ACT
    for (oracle of oracles) {
      try {
        await registerOracle(oracle)
      } catch (e1) {
        await sleepNow(2000)
        //retry 2 times with exponential backoff, there are random revert issues when the loop is too fast
        try {
          await registerOracle(oracle)
        }
        catch (e2) {
          await sleepNow(4000)
          try {
            await registerOracle(oracle)
          } catch (e3) {
            await sleepNow(8000)
            await registerOracle(oracle)
          }
        }

      }
    }
  })

  it('can request flight status', async () => {

    // ARRANGE
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(3600 + (Date.now() / 1000))  // 1hour from now

    // register airline

    await flightSuretyApp.registerFlight(firstAirline, flight, timestamp)

    // Submit a request for oracles to get status information for a flight
    let result = await flightSuretyApp.fetchFlightStatus(firstAirline, flight, timestamp)
    // check event
    expectEvent(result, 'OracleRequest', { _airline: firstAirline, _flight: flight, _timestamp: timestamp.toString() })
    let chosenIndex = result.logs.filter(log => log.event === 'OracleRequest')[0].args['_index'].toString()



    let consensusCounter = 1

    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature

    for (let a = 0; a < oracles.length; a++) {

      // Get oracle information
      let oracleIndexes = await flightSuretyApp.getMyIndexes({ from: oracles[a] })
      let oracleIdx = oracleIndexes.map(x => x.toString())
      if (oracleIdx.includes(chosenIndex)) {
        result = await flightSuretyApp.submitOracleResponse(chosenIndex, firstAirline, flight, timestamp, STATUS_CODE_ON_TIME, { from: oracles[a] })
        consensusCounter++

      } else {
        await flightSuretyApp.submitOracleResponse(oracleIdx[0], firstAirline, flight, timestamp, STATUS_CODE_ON_TIME, { from: oracles[a] }).should.be.rejectedWith('Flight or timestamp or index do not match oracle request')
      }

    }
    if (consensusCounter >= MIN_RESPONSES) {
      expectEvent(result, 'FlightStatusInfo', { _airline: firstAirline, _flight: flight, _timestamp: timestamp.toString(), _status: STATUS_CODE_ON_TIME.toString() })
    }

  })

})

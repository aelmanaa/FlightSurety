let FlightSuretyApp = artifacts.require("FlightSuretyApp")
let FlightSuretyData = artifacts.require("FlightSuretyData")
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { assert } = require('chai')
chai.use(chaiAsPromised)
chai.should()


contract('Check operational (stop loss)', async (accounts) => {
    let flightSuretyData, flightSuretyApp, owner, airlines

    before('setup contract', async () => {
        owner = accounts[0]
        airlines = accounts.slice(1)
        flightSuretyData = await FlightSuretyData.new({ from: owner })
        flightSuretyApp = await FlightSuretyApp.new({ from: owner })

        await flightSuretyData.registerLinkedSuretyApp(flightSuretyApp.address, { from: owner })
        await flightSuretyApp.setUp(flightSuretyData.address, airlines[0], { from: owner, value: web3.utils.toWei('10', 'ether') })
    })

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await flightSuretyData.isOperational()
        assert.equal(status, true, "Incorrect initial operating status value")

        status = await flightSuretyApp.isOperational()
        assert.equal(status, true, "Incorrect initial operating status value")

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account

        await flightSuretyData.setOperatingStatus(false, { from: airlines[5] }).should.be.rejectedWith('Caller is not contract owner')

        await flightSuretyApp.setOperatingStatus(false, { from: airlines[6] }).should.be.rejectedWith('Caller is not contract owner')


    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // should be success
        await flightSuretyData.setOperatingStatus(false, { from: owner })
        await flightSuretyApp.setOperatingStatus(false, { from: owner })


    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await flightSuretyData.setOperatingStatus(false, { from: owner })

        await flightSuretyData.registerAirline(airlines[1], { from: owner }).should.be.rejectedWith('Contract is currently not operational')


        // Set it back for other tests to work
        await flightSuretyData.setOperatingStatus(true, { from: owner })


        await flightSuretyApp.setOperatingStatus(false, { from: owner })

        await flightSuretyApp.registerAirline(airlines[1], { from: airlines[0] }).should.be.rejectedWith('Contract is currently not operational')

        // Set it back for other tests to work
        await flightSuretyApp.setOperatingStatus(true, { from: owner })

    })
})

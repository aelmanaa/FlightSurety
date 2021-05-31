const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = async function (deployer) {

    let firstAirline = '0xCC3C61e086542E0E7702989F2951332292C913A5'
    await deployer.deploy(FlightSuretyData)
    await deployer.deploy(FlightSuretyApp)
    let flightSuretyApp = await FlightSuretyApp.deployed()
    let flightSuretyData = await FlightSuretyData.deployed()

    await flightSuretyData.registerLinkedSuretyApp(FlightSuretyApp.address)
    await flightSuretyApp.setUp(FlightSuretyData.address, firstAirline, {value: web3.utils.toWei('10','ether')})

    let config = {
        localhost: {
            url: 'http://localhost:8545',
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address
        }
    }
    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');

}
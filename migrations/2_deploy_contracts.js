const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = async function (deployer, network, accounts) {

    let firstAirline = accounts[1]
    await deployer.deploy(FlightSuretyData)
    await deployer.deploy(FlightSuretyApp)
    let flightSuretyApp = await FlightSuretyApp.deployed()
    let flightSuretyData = await FlightSuretyData.deployed()

    await flightSuretyData.registerLinkedSuretyApp(FlightSuretyApp.address)
    await flightSuretyData.fund({ value: web3.utils.toWei('100', 'ether'), from: accounts[0] })
    await flightSuretyApp.setUp(FlightSuretyData.address, firstAirline, { from: accounts[0], value: web3.utils.toWei('100', 'ether') })

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
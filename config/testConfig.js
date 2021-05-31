
let FlightSuretyApp = artifacts.require("FlightSuretyApp")
let FlightSuretyData = artifacts.require("FlightSuretyData")
let BigNumber = require('bignumber.js')

let Config = async function(accounts) {

    let isEventFound = (eventArray, eventName, argObject) => {
        let filteredArray = eventArray.filter(element => {
            if (element.event === eventName) {
                let isAllArgsFound = true
                Object.keys(argObject).forEach(key => {
                    if (element.returnValues[key] !== argObject[key]) {
                        console.log(key)
                        console.log(element.returnValues[key])
                        console.log(typeof element.returnValues[key])
                        console.log(argObject[key])
                        console.log(typeof argObject[key])
                        isAllArgsFound = false
                    }
                })
                return isAllArgsFound
            } else {
                return false
            }
        })
    
        return filteredArray.length > 0
    
    }

    let owner = accounts[0];   
    let testAddresses = accounts.slice(1)

    let flightSuretyData = await FlightSuretyData.deployed()
    // deploy 1st airline
    let flightSuretyApp = await FlightSuretyApp.deployed()

    
    return {
        owner: owner,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp,
        isEventFound: isEventFound
    }
}

module.exports = {
    Config: Config
};


/**
 * 
 * Available Accounts
==================
(0) 0x627306090abaB3A6e1400e9345bC60c78a8BEf57 (100 ETH)
(1) 0xf17f52151EbEF6C7334FAD080c5704D77216b732 (100 ETH)
(2) 0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef (100 ETH)
(3) 0x821aEa9a577a9b44299B9c15c88cf3087F3b5544 (100 ETH)
(4) 0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2 (100 ETH)
(5) 0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e (100 ETH)
(6) 0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5 (100 ETH)
(7) 0x0F4F2Ac550A1b4e2280d04c21cEa7EBD822934b5 (100 ETH)
(8) 0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc (100 ETH)
(9) 0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE (100 ETH)
(10) 0xE44c4cf797505AF1527B11e4F4c6f95531b4Be24 (100 ETH)
(11) 0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2 (100 ETH)
(12) 0xF014343BDFFbED8660A9d8721deC985126f189F3 (100 ETH)
(13) 0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9 (100 ETH)
(14) 0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4 (100 ETH)
(15) 0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86 (100 ETH)
(16) 0xc449a27B106BE1120Bd1Fd62F8166A2F61588eb9 (100 ETH)
(17) 0xF24AE9CE9B62d83059BD849b9F36d3f4792F5081 (100 ETH)
(18) 0xc44B027a94913FB515B19F04CAf515e74AE24FD6 (100 ETH)
(19) 0xcb0236B37Ff19001633E38808bd124b60B1fE1ba (100 ETH)
(20) 0x715e632C0FE0d07D02fC3d2Cf630d11e1A45C522 (100 ETH)
(21) 0x90FFD070a8333ACB4Ac1b8EBa59a77f9f1001819 (100 ETH)
(22) 0x036945CD50df76077cb2D6CF5293B32252BCe247 (100 ETH)
(23) 0x23f0227FB09D50477331D2BB8519A38a52B9dFAF (100 ETH)
(24) 0x799759c45265B96cac16b88A7084C068d38aFce9 (100 ETH)
(25) 0xA6BFE07B18Df9E42F0086D2FCe9334B701868314 (100 ETH)
(26) 0x39Ae04B556bbdD73123Bab2d091DCD068144361F (100 ETH)
(27) 0x068729ec4f46330d9Af83f2f5AF1B155d957BD42 (100 ETH)
(28) 0x9EE19563Df46208d4C1a11c9171216012E9ba2D0 (100 ETH)
(29) 0x04ab41d3d5147c5d2BdC3BcFC5e62539fd7e428B (100 ETH)
(30) 0xeF264a86495fF640481D7AC16200A623c92D1E37 (100 ETH)
(31) 0x645FdC97c87c437da6b11b72471a703dF3702813 (100 ETH)
(32) 0xbE6f5bF50087332024634d028eCF896C7b482Ab1 (100 ETH)
(33) 0xcE527c7372B73C77F3A349bfBce74a6F5D800d8E (100 ETH)
 * 
 * 
 */
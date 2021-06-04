const HDWalletProvider = require("@truffle/hdwallet-provider")

const mnemonicPhrase = "shallow more plastic pair asset rare inherit upon issue degree they hobby" // 12 word mnemonic


import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import Oracle from './oracle.js'
import Config from './config.json'
import Web3 from 'web3'


export default async () => {
    console.log('setup debut')
    let config = Config['localhost']
    let provider = new HDWalletProvider({
        mnemonic: {
            phrase: mnemonicPhrase
        },
        providerOrUrl: config.url.replace('http', 'ws'),
        numberOfAddresses: 50
    })
    let web3 = new Web3(provider)
    let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress)
    let accounts, owner, airlines, passengers, oracles = []

    try {

        accounts = await web3.eth.getAccounts()
        owner = accounts[0]
        web3.eth.defaultAccount = owner
        airlines = accounts.slice(1, 5)
        passengers = accounts.slice(5, 10)
        oracles = []
        accounts.slice(10).forEach(acc => oracles.push(new Oracle(acc)))
    } catch (error) {
        console.log('Error while retrieving current account:', error)
        throw new Error('Error while retrieving current account')
    }

    console.log('setup fin')

    return {
        accounts,
        owner,
        airlines,
        passengers,
        oracles,
        flightSuretyApp,
        web3
    }
}




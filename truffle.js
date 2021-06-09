let HDWalletProvider = require("@truffle/hdwallet-provider")
let mnemonicPhrase = "shallow more plastic pair asset rare inherit upon issue degree they hobby"

module.exports = {
  networks: {
    development: {
      provider: () => new HDWalletProvider({
        mnemonic: {
          phrase: mnemonicPhrase
        },
        providerOrUrl: 'http://127.0.0.1:8545'
        ,
        addressIndex: 0,
        numberOfAddresses: 50
      }),
      network_id: "*", // Match any network id
      //gas: 6300000
    },
  },
  compilers: {
    solc: {
      version: "0.8.4",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        }
        //  evmVersion: "byzantium"
        // }
      },
    }
  }
};
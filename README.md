# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Prerequisites

* Metamask , you can use a test profile (check the following  [Link](https://genobank.io/create-metamask-identity)) and setup the mnemonic to `shallow more plastic pair asset rare inherit upon issue degree they hobby`
* Node: v12.22.1
* Npm: v7.15.0
* Truffle: v5.3.7
* Ganache-cli or Ganache desktop. make sure it runs on port `8545`, with same mnemonic as Metamask and enough Ethers to run the tests. you can start ganache-cli with the following command: `ganache-cli -a 50 -e 10000 -m "shallow more plastic pair asset rare inherit upon issue degree they hobby"`

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`


## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate -- network developement --reset`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)

# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course. A basic diagram is attached here:
![FlightSurety diagram](/dapp-diagram.jpg)

* Blockchain is started up using ganache-cli or ganache-dekstop (cfr. Prerequisites)
* 2 contracts are deployed on the local blockchain: FlightSuretyData & FlightSuretyApp. Business logic is performed by FlightSuretyApp and the state is persisted within FlightSuretyData
* The server side is a nodejs application . It performs Oracles logic. Also it loop over FLightSuretyApp to release insurance. In fact, We prefer to perform loops overy arrays outside of the blockchain in order to not lock the contract due to out of gas
* The client side (browser) is a html,css,javascript application. It handles Airlines and Passengers functionalities 
* Both applications listen and react to events emitted by the blockchain. For instance:
  *   the client side requests informations regarding a flight 'fetchFlightStatus'
  *   An event 'OracleRequest' is emitted by the smart contract 'FlightSuretyApp'
  *   Elligible Oracles (based on the index in the event) on the nodejs app communicates with 'FlightSuretyApp' by calling 'submitOracleResponses' in order to submit the status of a flight
  *   Once the minimal number of similar answers (oracles consensus) is reached, an event 'FlightStatusInfo' is emmited. If the status of a flight is 'late airline' then another event is emitted 'FLIGHT_INSURANCE_TOBE_RELEASED' in order to release deposits for insurees
  *   client side listens to 'FlightStatusInfo' in order to automatically updates the cient side with the flights' status codes
  *   nodejs application listens to 'FLIGHT_INSURANCE_TOBE_RELEASED' , checks the number of insures by calling 'getFlightPassengersNumber' then loops over 'releaseInsurance' method until there are no more insurees
  *   'releaseInsurance' emits event 'INSURANCE_RELEASED' with the address of the insuree and other details such as flight number and amount released
  *   Every passenger can then pay out himself via the DAPP. Thus,  payments of insurees is done via pull rather than push
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

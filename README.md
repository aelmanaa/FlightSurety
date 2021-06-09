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


## Tests

To run truffle tests:

* `truffle test ./test/flightSuretyStopLoss` : This tests that FlightSuretyData & FlightSuretyApp can be made unoperational by the contract owner. When contract are non operationals then no one can call their functionalities anymore until the contracts are made operational again by the contract owner
* `truffle test ./test/oracles.js` : This tests oracles registration, fetching indexes and submitting flight status info
* `truffle test ./test/airline.js` : This tests airlines registration and consensus for airline registration. In fact as per the requirements
  * 1st airline is registered by the owner during the creation of the contract
  *  the next 3 airlines must stake 10 ETHER first then they are in a queue until an airline which is already registered approves their registration
  *  Starting from 5 airlines, a new airlines has to stake, another airlines approves its registration then other airlines start voting. if >50 % of favorable answers is reached then the new airline is registered
*  `truffle test ./test/passengers.js`: 
   *  checks that a registered airline can register a flight. 
   *  checks that a passenger can deposit for a flight (insurance)
   *  checks that anyone can requests information regarding the status of a flight
   *  checks that in case an airline is late then passengers are credited with 1.5 of their initial deposit
   *  checks that in case an airline is late due other reasons(e.g.: weather) then passengers are not credited

## Demo

To use the dapp:

`truffle migrate -- network developement --reset`
`npm run dapp`

To view dapp:

`http://localhost:8000`

Start server in a new terminal

`npm run server`
server listens on:
`http://localhost:3000`

* At initialisation, The DAPP looks like : 
![Dapp init](/images/init.png)

It contains only one flight which is the one registered by the contract owner during creation

* You can then switch to another account using Metamask and then click on 'Airline staking' , the airline appears in the airlines table. It is marked as in a quueue of registration which means that the first airline must approve it

![Dapp init](/images/afterstaking.png)

* Switch back to first airline using Metamask and click on 'Register'(next to the queued airline) , then you'll see the airline marked as registered
  
![Dapp init](/images/2ndairlineregistered.png)

*  Repeat this process until the 5th airline. Once one of the already registered clicks on "Register", the queued airline is queued for voting (consensus required starting from 5th airline)
  
![Dapp init](/images/5thairlinereadyforvote.png)

*  The registered airlines can start voting. The airline requires only 2 more votes (the airline which approved registration has a vote marked as 'Yes'). After 3 votes, the airline is registered

![Dapp init](/images/5thairlineafter3rdvote.png)

## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](https://docs.soliditylang.org/en/v0.8.4/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://web3js.readthedocs.io/en/v1.2.11/)

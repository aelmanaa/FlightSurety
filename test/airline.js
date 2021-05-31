let Test = require('../config/testConfig.js')
let FlightSuretyApp = artifacts.require("FlightSuretyApp")
let FlightSuretyData = artifacts.require("FlightSuretyData")
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { expectEvent } = require('@openzeppelin/test-helpers')
chai.use(chaiAsPromised)
const { expect } = chai
chai.should()



contract('Airline Tests', async (accounts) => {

    let config = Test.Config
    let owner, airlines, flightSuretyData, flightSuretyApp, isEventFound
    before('setup contract', async () => {

        config = await Test.Config(accounts)
        owner = accounts[0]
        airlines = accounts.slice(1)
        flightSuretyData = await FlightSuretyData.new()
        flightSuretyApp = await FlightSuretyApp.new()
        await flightSuretyData.registerLinkedSuretyApp(flightSuretyApp.address)
        await flightSuretyApp.setUp(flightSuretyData.address, airlines[0], { value: web3.utils.toWei('10', 'ether')})
        isEventFound = config.isEventFound
    })

    describe('Check initial state', async () => {

        it('1st airline is registered', async () => {
            let isRegistered = await flightSuretyData.isRegistredAirline(airlines[0]);
            assert.equal(isRegistered, true, "1st airline not registered");
        })

        it('Only 1 registered airline', async () => {
            let numRegistered = await flightSuretyData.numberOfRegistredAirlines();
            assert.equal(numRegistered, 1, `Number of registered airlines ${numRegistered} should be 1`);
        })

        it('Event emitted during registation of 1st airline', async () => {
            let flightSuretyAppEvents = await flightSuretyApp.contract.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' })
            expect(isEventFound(flightSuretyAppEvents, 'AIRLINE_REGISTRED', { _airline: airlines[0], _votesInFavor: '0', _votesAgainst: '0', _numberAirlines: '1' })).to.equal(true)

        })


    })

    describe('Stake airline before registration', async () => {

        it('Only a non registered airline can stake', async () => {
            await flightSuretyApp.stakeAirline({ from: airlines[0] }).should.be.rejectedWith('Airline already registred')
        })

        it('Must pay > 10eth to stake', async () => {
            await flightSuretyApp.stakeAirline({ from: airlines[1], value: web3.utils.toWei('1', 'ether') }).should.be.rejectedWith('Airline registration fee is required');
        })

        it('Stake, change returned back', async () => {
            let newAirline = airlines[1]
            const originalAirlineBalance = web3.utils.toBN(await web3.eth.getBalance(newAirline))
            let result = await flightSuretyApp.stakeAirline({ from: newAirline, value: web3.utils.toWei('40', 'ether'), gasPrice: '0' })
            const newAirlineBalance = web3.utils.toBN(await web3.eth.getBalance(newAirline))
            const delta = web3.utils.fromWei(originalAirlineBalance.sub(newAirlineBalance), 'ether')

            // check balance
            expect(delta, 'Error: Airline didnt get the right change').to.equal('10')

            // check event
            expectEvent(result, 'AIRLINE_QUEUED', { _airline: newAirline })

            // check state
            let state = await flightSuretyApp.airlineQueueState(newAirline)
            assert.equal(state.isInTheQueue, true, `Airline should be in the queue`)
            assert.equal(state.isReadyForVote, false, `Airline should not be ready for vote`)
            assert.equal(state.votesInFavor.toString(), '0', `Airline shouldn't receive any votes`)
            assert.equal(state.votesAgainst.toString(), '0', `Airline shouldn't receive any votes`)

            // number of registered airlines still 1
            let numRegistered = await flightSuretyData.numberOfRegistredAirlines()
            assert.equal(numRegistered, 1, `Number of registered airlines ${numRegistered} should be 1`)

        })

        it('Airline cannot stake if it is in the queue', async () => {
            let newAirline = airlines[1]
            await flightSuretyApp.stakeAirline({ from: newAirline, value: web3.utils.toWei('10', 'ether') }).should.be.rejectedWith('Airline already in the queue for registration');
        })

    })

    describe('Register airline', async () => {

        before('stake', async () => {
            await flightSuretyApp.stakeAirline({ from: airlines[2], value: web3.utils.toWei('10', 'ether') })
        })

        it('Only a non registered airline can be registered', async () => {
            await flightSuretyApp.registerAirline(airlines[0], { from: airlines[0] }).should.be.rejectedWith('Airline already registred')
        })

        it('Must be in queue for registration (has already staked)', async () => {
            await flightSuretyApp.registerAirline(airlines[3], { from: airlines[0] }).should.be.rejectedWith('Airline must be queued for registration')
        })

        it('Must be already registered airline in order to register another airline)', async () => {
            await flightSuretyApp.registerAirline(airlines[2], { from: airlines[3] }).should.be.rejectedWith('Only a registred airline may register or vote')
        })

        it('Can register airline which has staked)', async () => {
            let result = await flightSuretyApp.registerAirline(airlines[2], { from: airlines[0] })

            // check event
            expectEvent(result, 'AIRLINE_REGISTRED', { _airline: airlines[2], _votesInFavor: '1', _votesAgainst: '0', _numberAirlines: '2' })
            expectEvent(result, 'AIRLINE_VOTED_YES', { _airline: airlines[2], _voter: airlines[0] })

            let numRegistered = await flightSuretyData.numberOfRegistredAirlines()
            assert.equal(numRegistered, 2, `Number of registered airlines ${numRegistered} should be 2`)

            let isRegistered = await flightSuretyData.isRegistredAirline(airlines[2])
            assert.equal(isRegistered, true, "Airline not registered")

            // check state
            let state = await flightSuretyApp.airlineQueueState(airlines[2])
            assert.equal(state.isInTheQueue, false, `Airline should be removed from the queue`)
            assert.equal(state.isReadyForVote, false, `Airline should  be removed from the queue`)
            assert.equal(state.votesInFavor.toString(), '0', `Airline should  be removed from the queue`)
            assert.equal(state.votesAgainst.toString(), '0', `Airline should  be removed from the queue`)
        })

    })

    describe('Consensus checks', async () => {

        before('register 4 airlines', async () => {
            // airlines[2] and airlines[0] registered at this stage

            // register airline[3]
            await flightSuretyApp.stakeAirline({ from: airlines[3], value: web3.utils.toWei('10', 'ether') })
            let result = await flightSuretyApp.registerAirline(airlines[3], { from: airlines[0] })

            // register airline[4]
            await flightSuretyApp.stakeAirline({ from: airlines[4], value: web3.utils.toWei('10', 'ether') })
            result = await flightSuretyApp.registerAirline(airlines[4], { from: airlines[2] })

            let numRegistered = await flightSuretyData.numberOfRegistredAirlines()
            assert.equal(numRegistered, 4, `Number of registered airlines ${numRegistered} should be 4`)

            // register airline[1], should be put in the queue for vote
            result = await flightSuretyApp.registerAirline(airlines[1], { from: airlines[3] })

            expectEvent(result, 'AIRLINE_READY_FOR_VOTE', { _airline: airlines[1] })
            expectEvent(result, 'AIRLINE_VOTED_YES', { _airline: airlines[1], _voter: airlines[3] })

        })

        it('airline1 still queued. not an airline yet', async () => {
            let isRegistered = await flightSuretyData.isRegistredAirline(airlines[1])
            assert.equal(isRegistered, false, "Airline registered")

            let numRegistered = await flightSuretyData.numberOfRegistredAirlines()
            assert.equal(numRegistered, 4, `Number of registered airlines ${numRegistered} should be 4`)


            // check state
            let state = await flightSuretyApp.airlineQueueState(airlines[1])
            assert.equal(state.isInTheQueue, true, `Airline should be in the queue`)
            assert.equal(state.isReadyForVote, true, `Airline should  be ready for vote`)
            assert.equal(state.votesInFavor.toString(), '1', `Airline should  have received 1 vote`)
            assert.equal(state.votesAgainst.toString(), '0', `Airline should  have received 0 vote against`)
        })

        it('airline1 cannot stake as it is ready for vote', async () => {
            await flightSuretyApp.stakeAirline({ from: airlines[1], value: web3.utils.toWei('10', 'ether') }).should.be.rejectedWith('Airline already in the queue for registration')
        })

        it('airline1 cannot be registered again', async () => {
            await flightSuretyApp.registerAirline(airlines[1], { from: airlines[0] }).should.be.rejectedWith('The airline is in the queue for vote')
        })

        it('registrer airline cannot vote', async () => {
            await flightSuretyApp.voteAirline(airlines[1], true, { from: airlines[3] }).should.be.rejectedWith('You cannot vote for an airline twice')
        })

        it('airline must be in queue for vote', async () => {
            await flightSuretyApp.voteAirline(airlines[5], true, { from: airlines[3] }).should.be.rejectedWith('The airline must be the queue for vote')
        })

        it('airline registered with > 50% favor', async () => {
            // 2nd voter            
            let result = await flightSuretyApp.voteAirline(airlines[1], true, { from: airlines[0] })
            expectEvent(result, 'AIRLINE_VOTED_YES', { _airline: airlines[1], _voter: airlines[0] })
            let isRegistered = await flightSuretyData.isRegistredAirline(airlines[1])
            assert.equal(isRegistered, false, "Airline registered")

            //3rd voter vote no 
            result = await flightSuretyApp.voteAirline(airlines[1], false, { from: airlines[2] })
            expectEvent(result, 'AIRLINE_VOTED_NO', { _airline: airlines[1], _voter: airlines[2] })
            isRegistered = await flightSuretyData.isRegistredAirline(airlines[1])
            assert.equal(isRegistered, false, "Airline registered")

            // check state
            let state = await flightSuretyApp.airlineQueueState(airlines[1])
            assert.equal(state.isInTheQueue, true, `Airline should be in the queue`)
            assert.equal(state.isReadyForVote, true, `Airline should  be ready for vote`)
            assert.equal(state.votesInFavor.toString(), '2', `Airline should  have received 1 vote in favor`)
            assert.equal(state.votesAgainst.toString(), '1', `Airline should  have received 1 vote against`)

            // 4rd voter votes yes. must be registered
            result = await flightSuretyApp.voteAirline(airlines[1], true, { from: airlines[4] })
            expectEvent(result, 'AIRLINE_VOTED_YES', { _airline: airlines[1], _voter: airlines[4] })
            isRegistered = await flightSuretyData.isRegistredAirline(airlines[1])
            assert.equal(isRegistered, true, "Airline not registered")

            expectEvent(result, 'AIRLINE_REGISTRED', { _airline: airlines[1], _votesInFavor: '3', _votesAgainst: '1', _numberAirlines: '5' })

            // check state
            state = await flightSuretyApp.airlineQueueState(airlines[1])
            assert.equal(state.isInTheQueue, false, `Airline should not be in the queue`)
            assert.equal(state.isReadyForVote, false, `Airline should not be in the queue`)
            assert.equal(state.votesInFavor.toString(), '0', `Airline should not be in the queue`)
            assert.equal(state.votesAgainst.toString(), '0', `Airline should not be in the queue`)
        })

        it('consensus can refuse airline', async () => {
            // there are 5 airlines at this stage
            await flightSuretyApp.stakeAirline({ from: airlines[5], value: web3.utils.toWei('10', 'ether') })

            //1st airline registers --> yes
            await flightSuretyApp.registerAirline(airlines[5], { from: airlines[0] })

            //2nd airline votes yes
            await flightSuretyApp.voteAirline(airlines[5], true, { from: airlines[1] })

            //3rd airline votes no
            await flightSuretyApp.voteAirline(airlines[5], false, { from: airlines[2] })

            //4th airline votes no
            await flightSuretyApp.voteAirline(airlines[5], false, { from: airlines[3] })

            //5th airline votes no
            let result = await flightSuretyApp.voteAirline(airlines[5], false, { from: airlines[4] })
            expectEvent(result, 'AIRLINE_VOTED_NO', { _airline: airlines[5], _voter: airlines[4] })
            expectEvent(result, 'AIRLINE_REFUSED', { _airline: airlines[5], _votesInFavor: '2', _votesAgainst: '3', _numberAirlines: '5' })

            let isRegistered = await flightSuretyData.isRegistredAirline(airlines[5])
            assert.equal(isRegistered, false, "Airline  registered")

            let numRegistered = await flightSuretyData.numberOfRegistredAirlines()
            assert.equal(numRegistered, 5, `Number of registered airlines ${numRegistered} should be 5`)


            // check state
            let state = await flightSuretyApp.airlineQueueState(airlines[5])
            assert.equal(state.isInTheQueue, false, `Airline should not be in the queue`)
            assert.equal(state.isReadyForVote, false, `Airline should not be in the queue`)
            assert.equal(state.votesInFavor.toString(), '0', `Airline should not be in the queue`)
            assert.equal(state.votesAgainst.toString(), '0', `Airline should not be in the queue`)

        })

    })

})

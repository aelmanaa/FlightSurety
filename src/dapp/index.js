
import DOM from './dom'
import Contract from './contract'
import './flightsurety.css'
import Web3 from 'web3'


let renderBool = (bool) => {
    switch (bool) {
        case true:
            return 'YES'
        default:
            return 'NO'
    }
}

let toEther = (amount) => {
    return Web3.utils.fromWei(amount,'ether')
}

let toWei = (amount) => {
    return Web3.utils.toWei(amount,'ether')
}


let timestampToHumanFormat = (timestamp) => {
    // timestamp from ETH is in seconds
    let date = new Date(timestamp * 1000)
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

let renderStatusCode = (status) => {
    switch (status) {
        case '0':
            return 'UNKNOWN'
        case '10':
            return 'ON TIME'
        case '20':
            return 'AIRLINE LATE'
        case '30':
            return 'DELAY DUE TO WEATHER'
        case '40':
            return 'DELAY DUE TO TECHNICAL ISSUES'
        case '50':
            return 'DELAY DUE TO MANY ISSUES'
        default:
            console.error('STATUS NOT KNOWN ', status)
            return ''
    }
}

let renderAddress = (address) => {
    return address.substring(0, 4) + '..' + address.substring(address.length - 3, address.length)
}

(async () => {

    let result = null;




    ethereum
        .request({ method: 'eth_requestAccounts' })
        .catch((error) => {
            if (error.code === 4001) {
                // EIP-1193 userRejectedRequest error
                console.log('Please connect to MetaMask.');
            } else {
                console.error(error);
            }
        })

    let contract = new Contract('localhost', async () => {

        // render
        updateCurrentAccountElement(contract.currentAccount)
        displayAirlines(contract)
        displayFlights(contract)
        displayDeposits(contract)
        displayPassengers(contract)


        // Read contract status
        contract.isOperational((error, result) => {
            updateContractState(result)
        })

        // stake airline
        DOM.elid('stake-airline').addEventListener('click', async () => {
            await contract.stakeAirline()
        })


        // airline register flight
        DOM.elid('register-flight').addEventListener('click', async () => {
            let flight = DOM.elid('airline-flight-number').value;
            await contract.registerFlight(flight)
        })



        //setup triggers
        contract.updateCurrentAccountElement = updateCurrentAccountElement
        contract.triggerRefreshAirlines = triggerRefreshAirlines
        contract.triggerRefreshFlights = triggerRefreshFlights
        contract.triggerRefreshDeposits = triggerRefreshDeposits
        contract.triggerRefreshPassengers = triggerRefreshPassengers

    })


})()



function updateContractState(state) {
    DOM.elid('operational-status').innerHTML = 'Operational Status: ' + state
}


function updateCurrentAccountElement(currentAccount) {
    DOM.elid('current-account').innerHTML = 'Logged in account: ' + currentAccount
}

function triggerRefreshAirlines(contract) {
    displayAirlines(contract)
}

function triggerRefreshFlights(contract) {
    displayFlights(contract)
}

function triggerRefreshDeposits(contract) {
    displayDeposits(contract)
}

function triggerRefreshPassengers(contract) {
    displayPassengers(contract)
}

function displayAirlines(contract) {
    DOM.clearTbody('airlines')
    let table = document.getElementById('airlines')
    let tbody = table.appendChild(DOM.tbody())
    let tr, cell
    for (let airline of contract.airlines) {
        tr = tbody.appendChild(DOM.tr({ id: airline.address }))
        tr.append(DOM.th({ scope: 'row' }, renderAddress(airline.address)))
        tr.append(DOM.td({}, renderBool(airline.isRegistered)))
        tr.append(DOM.td({}, renderBool(airline.isQueueForVote)))
        tr.append(DOM.td({}, renderBool(airline.isQueueRegistration)))
        cell = tr.appendChild(DOM.td({}))
        if (!airline.isRegistered) {
            if (airline.isQueueForVote) {
                cell.appendChild(DOM.button({ name: 'vote-airline', className: 'btn btn-primary' }, 'Vote'))
                cell.appendChild(DOM.input({ name: 'vote-airline-response', type: 'checkbox', checked: true }))

            } else if (airline.isQueueRegistration) {
                cell.appendChild(DOM.button({ name: 'register-airline', className: 'btn btn-primary' }, 'Register'))
            } else {
                console.error('State of airline not correct ', airline)
                cell.appendChild(DOM.span({}, 'Error.State not correct'))
            }
        }

    }


    // register for airline
    for (let domElement of DOM.elemmentsName('register-airline')) {
        domElement.addEventListener('click', async (self) => {
            let source = self.target
            let airlineAddress = DOM.closestRowParentInTable(source).id
            await contract.registerAirline(airlineAddress)

        })

    }

    // vote for airline
    for (let domElement of DOM.elemmentsName('vote-airline')) {
        domElement.addEventListener('click', async (self) => {
            let source = self.target
            let airlineAddress = DOM.closestRowParentInTable(source).id
            await contract.voteAirline(airlineAddress, DOM.ckeckBoxOfButtonInTable(source).checked)

        })

    }
}


function displayFlights(contract) {
    DOM.clearTbody('flights')
    let table = document.getElementById('flights')
    let tbody = table.appendChild(DOM.tbody())
    let tr, cell1 , cell2
    for (let flight of contract.flights) {
        tr = tbody.appendChild(DOM.tr({ id: flight.key }))
        tr.append(DOM.th({ scope: 'row' }, renderAddress(flight.airline)))
        tr.append(DOM.td({}, flight.number.toUpperCase()))
        tr.append(DOM.td({}, timestampToHumanFormat(flight.timestamp)))
        tr.append(DOM.td({}, renderStatusCode(flight.status)))
        cell1 = tr.appendChild(DOM.td({}))
        cell1.appendChild(DOM.button({ name: 'request-flight-status', className: 'btn btn-primary' }, 'Flight status'))
        cell2 = tr.appendChild(DOM.td({ className: 'td-insurance' }))
        cell2.appendChild(DOM.input({ name: 'subscribe-insurance-input' }))
        cell2.appendChild(DOM.span({}, 'ETH'))
        cell2.appendChild(DOM.button({ name: 'subscribe-insurance', className: 'btn btn-primary' }, 'Subscribe'))

    }

    // submit request for oracles
    for (let domElement of DOM.elemmentsName('request-flight-status')) {
        domElement.addEventListener('click', async (self) => {
            let source = self.target
            let flightKey = DOM.closestRowParentInTable(source).id
            await contract.fetchFlightStatus(flightKey)

        })

    }

    for (let domElement of DOM.elemmentsName('subscribe-insurance')) {
        domElement.addEventListener('click', async (self) => {
            let source = self.target
            let flightKey = DOM.closestRowParentInTable(source).id
            let flightDom = DOM.closestRowParentInTable(source)
            let deposit = flightDom.getElementsByTagName('input')[0].value
            await contract.buy(flightKey,toWei(deposit))

        })

    }
}


function displayDeposits(contract) { 
    DOM.clearTbody('deposits')
    let table = document.getElementById('deposits')
    let tbody = table.appendChild(DOM.tbody())
    let tr, cell
    for (let deposit of contract.deposits) {
        tr = tbody.appendChild(DOM.tr({ id: deposit.passenger.address + '-' + deposit.flight.number }))
        tr.append(DOM.th({ scope: 'row' }, renderAddress(deposit.passenger.address )))
        tr.append(DOM.td({}, renderAddress(deposit.flight.airline )))
        tr.append(DOM.td({}, deposit.flight.number.toUpperCase()))
        tr.append(DOM.td({}, timestampToHumanFormat(deposit.flight.timestamp)))
        cell = tr.appendChild(DOM.td({}, toEther(deposit.deposit)))
        cell.appendChild(DOM.span({}, 'ETH'))
    }
}

function displayPassengers(contract) {
    DOM.clearTbody('passengers')
    let table = document.getElementById('passengers')
    let tbody = table.appendChild(DOM.tbody())
    let tr, cell1, cell2
    for (let passenger of contract.passengers) {
        tr = tbody.appendChild(DOM.tr({ id: passenger.address }))
        tr.append(DOM.th({ scope: 'row' }, renderAddress(passenger.address)))
        cell1 = tr.appendChild(DOM.td({}, toEther(passenger.balance)))
        cell1.appendChild(DOM.span({}, 'ETH'))
        cell2 = tr.appendChild(DOM.td({}))
        cell2.append(DOM.button({ name: 'withdraw-balance', className: 'btn btn-primary' }, 'Withdraw balance'))
       
    }

    for (let domElement of DOM.elemmentsName('withdraw-balance')) {
        domElement.addEventListener('click', async (self) => {
            let source = self.target
            let passengerAddress = DOM.closestRowParentInTable(source).id
            await contract.withdrawBalance(passengerAddress)

        })

    }

}








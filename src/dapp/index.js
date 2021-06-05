
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


let renderBool = (bool) => {
    switch (bool) {
        case true:
            return 'YES'
        default:
            return 'NO'
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
        displayAirlines(contract, contract.airlines)


        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            })
        })




        //setup triggers
        contract.updateCurrentAccountElement = updateCurrentAccountElement
        contract.triggerRefreshAirlines = triggerRefreshAirlines

    })


})()


function updateCurrentAccountElement(currentAccount) {
    DOM.elid('current-account').innerHTML = 'Logged in account: ' + currentAccount
}

function triggerRefreshAirlines(contract, airlines) {
    displayAirlines(contract, airlines)
}

function displayAirlines(contract, airlines) {
    DOM.clearTbody('airlines')
    let table = document.getElementById('airlines')
    let tbody = table.appendChild(DOM.tbody())
    let tr, cell
    for (let airline of airlines) {
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

    // stake airline
    DOM.elid('stake-airline').addEventListener('click', async () => {
        await contract.stakeAirline()
    })

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

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}









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

        // stake airline
        DOM.elid('stake-airline').addEventListener('click', async () => {
            await contract.stakeAirline()
        })

        displayAirlines(contract.airlines)

        //setup triggers
        contract.triggerRefreshAirlines = triggerRefreshAirlines

    })


})()

function triggerRefreshAirlines(airlines) {
    displayAirlines(airlines)
}

function displayAirlines(airlines) {
    DOM.clearTbody('airlines')
    let table = document.getElementById('airlines')
    let tbody = table.appendChild(DOM.tbody())
    let tr
    for (let airline of airlines) {
        tr = tbody.appendChild(DOM.tr())
        tr.append(DOM.th({ scope: 'row' }, renderAddress(airline.address)))
        tr.append(DOM.td({}, renderBool(airline.isRegistered)))
        tr.append(DOM.td({}, renderBool(airline.isQueueForVote)))
        tr.append(DOM.td({}, renderBool(airline.isQueueRegistration)))
        tr.append(DOM.td({}, 'click here vote')) 
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








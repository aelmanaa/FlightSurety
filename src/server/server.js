
import Setup from './setup'
import express from 'express'


const STATUS_CODES = [10, 20, 30, 40, 50]

let timestampToHumanFormat = (timestamp) => {
  // timestamp from ETH is in seconds
  let date = new Date(timestamp * 1000)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

let parseEvent = async (log, web3) => {
  try {
    let blockNumber = log.blockNumber
    let block = await web3.eth.getBlock(blockNumber)
    let timestamp = block.timestamp
    let timestampInHumanFormat = timestampToHumanFormat(timestamp)
    let returnValues = log.returnValues

    console.log(`Event received. Timestamp : ${timestampInHumanFormat} - Event: ${log.event} - TransactionHash: ${log.transactionHash} - Return values: ${JSON.stringify(returnValues)}`)

  } catch (error) {
    console.log('error while parsing event', error)
  }
}


const registerAndGetRegistered = async (oracles, fee) => {

  for (let oracle of oracles) {
    await oracle.registerAndIndexes(fee)
    console.log(oracle.log())
  }

  return oracles.filter(oracle => {
    return oracle.registered
  })

}

(async () => {

  let sleepNow = delay => new Promise(resolve => setTimeout(resolve, delay))

  let {
    accounts,
    owner,
    airlines,
    passengers,
    oracles,
    flightSuretyApp,
    web3,
    flightSuretyAppws,
    web3ws
  } = await Setup()

  let methods = flightSuretyApp.methods

  let fee = await methods.REGISTRATION_FEE().call()
  console.log('fee ', fee)
  console.log('oracles length ', oracles.length)
  let oracleIndexes = []
  //console.log('owner ', owner)
  //console.log('oracles ', oracles)


  let registeredOracles = await registerAndGetRegistered(oracles, fee)
  console.log('Number of registered oracles ', registeredOracles.length)

  flightSuretyAppws.events.allEvents().on('data', async (log) => {
    await parseEvent(log, web3ws)
    switch (log.event) {
      case "OracleRequest":
        let index = log.returnValues._index
        let airline = log.returnValues._airline
        let flight = log.returnValues._flight
        let timestamp = log.returnValues._timestamp
        let statusCode

        let elligibleOracles = registeredOracles.filter(oracle => {
          let indexes = oracle.indexes
          return indexes.includes(index)
        })

        elligibleOracles.forEach(async (oracle) => {
          statusCode = STATUS_CODES[Math.floor(Math.random() * 5)]
          console.log(`Elligible oracle ${oracle.address} - Index ${index} - airline ${airline} - flight ${flight} - timetamp ${timestamp} - statusCode ${statusCode}`)
          await oracle.submitResponse(index, airline, flight, timestamp, statusCode)

        })
        break
      default:
    }
  }).on('error', (error, receipt) => {
    console.log('received event error: ', error)
    console.log('received recept error: ', receipt)
  })





  /*
  flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
  })
  */

})()

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app







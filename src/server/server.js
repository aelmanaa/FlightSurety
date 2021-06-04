
import Setup from './setup'
import express from 'express'


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
    web3
  } = await Setup()

  let methods = flightSuretyApp.methods

  let fee = await methods.REGISTRATION_FEE().call()
  console.log('fee ', fee)
  console.log('oracles length ', oracles.length)
  let oracleIndexes = []
  //console.log('owner ', owner)
  //console.log('oracles ', oracles)


  let registeredOracles = await registerAndGetRegistered(oracles , fee)
  console.log('Number of registered oracles ', registeredOracles.length)





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








import Setup from './setup'
import express from 'express'


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
  let oracleIndexes = []
  //console.log('owner ', owner)
  //console.log('oracles ', oracles)

  console.log('accounts ', accounts)


  let cpt = 0, stop
  for (let oracle of oracles) {
    oracle.setRegisterMethod(methods.registerOracle)
    oracle.setGetIndexesMethod(methods.getMyIndexes)

    await oracle.register(fee)
    console.log(oracle.log())

    /*
    stop = false
    methods.registerOracle().send({
      from: oracle.address, value: fee
    }, async (error, result) => {
      console.log(error)
      if(result){
        console.log(result)
        oracleIndexes = await methods.getMyIndexes().call({ from: oracle.address })
        oracle.indexes = oracleIndexes
        console.log(oracle.log())
      }
      
    })

    
    while (cpt < 10 && !stop) {
      try {
        await methods.registerOracle().send({
          from: oracle.address, value: fee
        }, (error, result) => {
          console.log(error)
          console.log(result)
        })
        console.log(`success for ${oracle.address}`)
        cpt = 0
        stop = true
      } catch (e) {
        cpt++
        await sleepNow(5000)
        console.log(`failure for ${oracle.address}`)
        console.log(e)
      }
      
  }*/




  }



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







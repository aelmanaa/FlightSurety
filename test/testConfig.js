
let isEventFound = (eventArray, eventName, argObject) => {
    let filteredArray = eventArray.filter(element => {
        if (element.event === eventName) {
            let isAllArgsFound = true
            Object.keys(argObject).forEach(key => {
                if (element.returnValues[key] !== argObject[key]) {
                    console.log(key)
                    console.log(element.returnValues[key])
                    console.log(typeof element.returnValues[key])
                    console.log(argObject[key])
                    console.log(typeof argObject[key])
                    isAllArgsFound = false
                }
            })
            return isAllArgsFound
        } else {
            return false
        }
    })

    return filteredArray.length > 0

}

let sleepNow = delay => new Promise(resolve => setTimeout(resolve, delay))



module.exports = {
    isEventFound,
    sleepNow
}
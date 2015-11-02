const bluebird = require("bluebird")
const colors = require("colors/safe")
const docopt = require("docopt").docopt
const fs = bluebird.promisifyAll(require("fs"))

const status = require("./commands/status")

const options = docopt(`
  usage:
    whale status <environment>
`)

const commands = {
  status
}

fs.readFileAsync("services.json")
  .then(JSON.parse)
  .then(function(config) {
    const command = Object.keys(commands).find((command) => options[command] === true)
    return commands[command](config, options)
  })
  .catch(function(error) {
    console.error(colors.red("ERROR: ") + error.message)
    process.exit(1)
  })

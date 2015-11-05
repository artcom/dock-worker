import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import {docopt} from "docopt"
import fs from "fs"

import status from "./commands/status"
import deploy from "./commands/deploy"
import setCredentials from "./commands/setCredentials"

const readFileAsync = bluebird.promisify(fs.readFile)

const options = docopt(`
  usage:
    whale <environment> status
    whale <environment> deploy
    whale set-credentials <host>
`)

const commands = {
  status,
  deploy,
  "set-credentials": setCredentials
}

readFileAsync("services.json")
  .then(JSON.parse)
  .then(function(config) {
    const command = _.find(commands, (command, name) => options[name] === true)
    return command(config, options)
  })
  .catch(function(error) {
    console.log(colors.red("ERROR: ") + error.message)
    console.log(error.stack)
    process.exit(1)
  })

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import {docopt} from "docopt"
import fs from "fs"

import status from "./commands/status"
import deploy from "./commands/deploy"
import version from "./commands/version"

const readFileAsync = bluebird.promisify(fs.readFile)

const options = docopt(`
  usage:
    dock <environment> status
    dock <environment> deploy [<app>...]
    dock version
`)

const commands = {
  status,
  deploy,
  version
}

readFileAsync("Dockfile.json")
  .then(JSON.parse)
  .then(function(config) {
    const command = _.find(commands, (command, name) => options[name] === true)
    return command(config, options)
  })
  .catch(function(error) {
    console.log(colors.red("ERROR: ") + error.message)
    process.exit(1)
  })

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import {docopt} from "docopt"
import fs from "fs"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

import status from "./commands/status"
import deploy from "./commands/deploy"

const readFileAsync = bluebird.promisify(fs.readFile)

const options = docopt(`
  usage:
    whale status <environment> --user=<username>
    whale deploy <environment> --user=<username>
`)

const commands = {
  status,
  deploy
}

readFileAsync("services.json")
  .then(JSON.parse)
  .then(function(config) {
    const environment = options["<environment>"]
    const user = options["--user"]
    const host = config.environments[environment]

    const dokku = new Dokku(host)
    const repoCache = new RepoCache(".cache", user)

    const command = _.find(commands, (command, name) => options[name] === true)
    return command(config, options, dokku, repoCache)
  })
  .catch(function(error) {
    console.log(colors.red("ERROR: ") + error.message)
    console.log(error.stack)
    process.exit(1)
  })

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import {docopt} from "docopt"
import fs from "fs"

import RepoCache from "./repoCache"

import status from "./commands/status"
import deploy from "./commands/deploy"

const readFileAsync = bluebird.promisify(fs.readFile)

const options = docopt(`
  usage:
    whale <environment> status --user=<username>
    whale <environment> deploy --user=<username>
`)

const commands = {
  status,
  deploy
}

readFileAsync("services.json")
  .then(JSON.parse)
  .then(function({environments, services}) {
    const user = options["--user"]
    const environment = _.find(environments, "name", options["<environment>"])

    const repoCache = new RepoCache(".cache", user)

    const command = _.find(commands, (command, name) => options[name] === true)
    return command(environment, filter(environment, services), repoCache)
  })
  .catch(function(error) {
    console.log(colors.red("ERROR: ") + error.message)
    console.log(error.stack)
    process.exit(1)
  })

function filter(environment, services) {
  return services.filter((service) => _.contains(service.environments, environment.name))
}

#! /usr/bin/env node

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import {docopt} from "docopt"
import fs from "fs"

import status from "./commands/status"
import deploy from "./commands/deploy"
import environments from "./commands/environments"
import version from "./commands/version"

const readFileAsync = bluebird.promisify(fs.readFile)

const options = docopt(`
  usage:
    dock <environment> status
    dock <environment> deploy [--yes] [<app>...]
    dock environments
    dock version
`)

const commands = {
  status,
  deploy,
  environments,
  version
}

readDockfile()
  .then(function(dockfile) {
    const command = _.find(commands, (command, name) => options[name] === true)
    return command(dockfile, options)
  })
  .catch(function(error) {
    console.error(colors.red("ERROR: ") + error.message)
    process.exitCode = 1
  })

function readDockfile() {
  return readFileAsync("Dockfile.json")
    .catch(function() {
      throw new Error("Could not read Dockfile.json in current working directory")
    }).then(function(content) {
      try {
        return JSON.parse(content)
      } catch (error) {
        throw new Error(`Syntax error in Dockfile.json: ${error.message}`)
      }
    })
}

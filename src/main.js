#! /usr/bin/env node

import bluebird from "bluebird"
import chalk from "chalk"
import { docopt } from "docopt"
import find from "lodash/find"
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

main()

async function main() {
  try {
    const dockfile = await readDockfile()
    const command = find(commands, (command, name) => options[name] === true)
    await command(dockfile, options)
  } catch (error) {
    console.error(chalk.red("ERROR: ") + error.message)
    process.exitCode = 1
  }
}

async function readDockfile() {
  try {
    const content = await readFileAsync("Dockfile.json")
    return JSON.parse(content)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Syntax error in Dockfile.json: ${error.message}`)
    } else {
      throw new Error("Could not read Dockfile.json in current working directory")
    }
  }
}

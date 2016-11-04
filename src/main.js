#! /usr/bin/env node

import chalk from "chalk"
import { docopt } from "docopt"
import find from "lodash/find"

import { readDockfile } from "./dockfile"

import status from "./commands/status"
import deploy from "./commands/deploy"
import environments from "./commands/environments"
import version from "./commands/version"

const options = docopt(`
  Usage:
    dock <environment> status [options]
    dock <environment> deploy [--yes] [<app>...] [options]
    dock environments [options]
    dock version

  Options:
    -f FILE --file=FILE     Dockfile path [default: Dockfile.json]
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
    const dockfile = await readDockfile(options["--file"])
    const command = find(commands, (command, name) => options[name] === true)
    await command(dockfile, options)
  } catch (error) {
    console.error(chalk.red("ERROR: ") + error.message)
    process.exitCode = 1
  }
}

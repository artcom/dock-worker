#! /usr/bin/env node
import chalk from "chalk"
import { docopt } from "docopt"
import find from "lodash/find"
import fs from "fs"
import { promisify } from "util"

import status from "./commands/status"
import deploy from "./commands/deploy"
import environments from "./commands/environments"
import version from "./commands/version"

import { EnvCommand } from "./commands/envCommand"

import { Dockfile } from "./types"

const readFileAsync = promisify(fs.readFile)

const options = docopt(`
  Usage:
    dock <environment> status [options]
    dock <environment> deploy [--yes] [<app>...] [options]
    dock environments [options]
    dock version

  Options:
    -f FILE --file=FILE     Dockfile path [default: Dockfile.json]
`, {})

const commands = {
  status,
  deploy,
  environments,
  version
}

main()

async function main() {
  try {
    const dockfile: Dockfile = await readDockfile(options["--file"])
    const command: EnvCommand = find(commands, (command, name) => options[name] === true)
    await command(dockfile, options)
  } catch (error) {
    console.error(chalk.red("ERROR: ") + error.message)
    process.exitCode = 1
  }
}

async function readDockfile(file): Promise<Dockfile> {
  try {
    const content: Buffer = await readFileAsync(file)
    return JSON.parse(content.toString())
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Syntax error in ${file}: ${error.message}`)
    } else {
      throw new Error(`Could not read ${file}: ${error.message}`)
    }
  }
}

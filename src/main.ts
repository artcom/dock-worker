#! /usr/bin/env node

import chalk from "chalk"
import fs from "fs"
import { promisify } from "util"
import { docopt } from "docopt"
import find from "lodash/find.js"

import status from "./commands/status.js"
import deploy from "./commands/deploy.js"
import environments from "./commands/environments.js"
import logs from "./commands/logs.js"
import outdated from "./commands/outdated.js"
import version from "./commands/version.js"

import { EnvCommand } from "./commands/envCommand.js"
import { DockError, EXIT_ENVIRONMENT } from "./output.js"

import { Dockfile } from "./types.js"

const readFileAsync = promisify(fs.readFile)

const options = docopt(
  `
  Usage:
    dock <environment> status [--json] [options]
    dock <environment> deploy [--yes] [--dry-run] [--json] [<app>...] [options]
    dock <environment> logs <app> [--num=N] [--json] [options]
    dock <environment> outdated [options]
    dock environments [options]
    dock version

  Options:
    -f FILE --file=FILE     Dockfile path [default: Dockfile.json]
    -n N --num=N            number of log lines [default: 100]
    --json                  print one JSON object per line to stdout
    --dry-run               show what deploy would do without changing anything
`,
  {},
)

const commands = {
  status,
  deploy,
  logs,
  outdated,
  environments,
  version,
}

main()

async function main() {
  try {
    const dockfile: Dockfile = await readDockfile(options["--file"])
    const command: EnvCommand = find(
      commands,
      (_, name) => options[name] === true,
    )
    await command(dockfile, options)
  } catch (error) {
    console.error(chalk.red("ERROR: ") + error.message)
    process.exitCode = error instanceof DockError ? error.exitCode : 1
  }
}

async function readDockfile(file): Promise<Dockfile> {
  try {
    const content: Buffer = await readFileAsync(file)
    return JSON.parse(content.toString())
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new DockError(
        `Syntax error in ${file}: ${error.message}`,
        EXIT_ENVIRONMENT,
      )
    } else {
      throw new DockError(
        `Could not read ${file}: ${error.message}`,
        EXIT_ENVIRONMENT,
      )
    }
  }
}

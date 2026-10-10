import Dokku from "../dokku.js"
import envCommand from "./envCommand.js"
import { parseLogLine } from "../logLine.js"
import { DockError, EXIT_USAGE, printJson } from "../output.js"

import { AppDescription } from "../types.js"

export default envCommand(logs)

async function logs(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: unknown,
  options: any,
) {
  const [appName] = options["<app>"]
  const num = Number(options["--num"])

  if (!Number.isInteger(num) || num <= 0) {
    throw new DockError(`Invalid --num "${options["--num"]}"`, EXIT_USAGE)
  }

  const output = await dokku.logs(appName, num)
  const lines = output.split("\n").filter((line) => line !== "")

  if (options["--json"]) {
    lines.map(parseLogLine).forEach(printJson)
  } else {
    lines.forEach((line) => console.log(line))
  }
}

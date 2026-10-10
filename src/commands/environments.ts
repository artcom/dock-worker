import chalk from "chalk"

import ansiTable from "../ansiTable.js"

export default function environments(dockfile) {
  const rows = dockfile.environments.map((environment) => [
    chalk.bold(environment.name),
    environment.host,
  ])

  console.log(ansiTable(rows))
}

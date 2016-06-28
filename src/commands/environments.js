import chalk from "chalk"
import table from "text-table"

export default function(dockfile) {
  const rows = dockfile.environments.map(environment =>
    [chalk.bold(environment.name), environment.host]
  )

  console.log(table(rows))
}

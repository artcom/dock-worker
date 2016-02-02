import colors from "colors/safe"
import table from "text-table"

export default function(dockfile) {
  const rows = dockfile.environments.map(function(environment) {
    return [colors.bold(environment.name), environment.host]
  })

  console.log(table(rows))
}

import colors from "colors/safe"
import table from "text-table"

export default function(config) {
  const rows = config.environments.map(function(environment) {
    return [colors.bold(environment.name), environment.host]
  })

  console.log(table(rows))
}

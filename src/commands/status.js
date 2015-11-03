import colors from "colors/safe"
import table from "text-table"

import * as status from "../status"

const statusColor = {
  deployed: colors.green,
  missing: colors.red,
  additional: colors.gray
}

export default function(config, options, dokku, repoCache) {
  const environment = options["<environment>"]
  console.log(`status of ${environment} (${dokku.host})\n`)

  return status.determine(config, dokku, repoCache).then(function(apps) {
    const rows = apps.map((app) => {
      return [app.name, formatStatus(app), formatVersion(app)]
    })

    console.log(table(rows))
  })
}

function formatStatus(app) {
  const color = statusColor[app.status]
  return color(app.status)
}

function formatVersion(app) {
  const actual = app.version
  const expected = app.config ? app.config.version : ""
  const color = actual === expected ? colors.green : colors.red
  return color(actual)
}

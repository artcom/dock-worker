import colors from "colors/safe"
import table from "text-table"

import * as status from "../status"

const statusColor = {
  deployed: colors.green,
  missing: colors.red,
  additional: colors.gray
}

export default function(environment, services, repoCache) {
  console.log(`status of ${environment.name} (${environment.host})\n`)

  return status.determine(environment, services, repoCache).then(function(apps) {
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

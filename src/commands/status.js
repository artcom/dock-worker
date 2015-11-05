import colors from "colors/safe"
import table from "text-table"

import envCommand from "./envCommand"
import * as status from "../status"

const statusColor = {
  deployed: colors.green,
  missing: colors.red,
  additional: colors.gray
}

export default envCommand(function(environment, services, repoCache) {
  return status.determine(environment, services, repoCache).then(function(apps) {
    const rows = apps.map((app) => {
      return [app.name, formatStatus(app), formatVersion(app)]
    })

    console.log(table(rows))
  })
})

function formatStatus(app) {
  const color = statusColor[app.status]
  return color(app.status)
}

function formatVersion({expectedVersion, deployedVersion}) {
  if (expectedVersion) {
    if (expectedVersion === deployedVersion) {
      return colors.green(deployedVersion)
    } else {
      return `${colors.red(deployedVersion)} (expected ${expectedVersion})`
    }
  } else {
    return ""
  }
}

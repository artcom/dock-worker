import colors from "colors/safe"
import table from "text-table"

import envCommand from "./envCommand"
import * as status from "../status"

const statusColor = {
  deployed: colors.green,
  missing: colors.red,
  additional: colors.gray
}

export default envCommand(function(environment, services) {
  return status.determine(environment, services).then(function(apps) {
    const rows = apps.map((app) => {
      return [formatName(app), formatStatus(app), formatVersion(app)]
    })

    console.log(table(rows))
  })
})

function formatName(app) {
  return colors.bold(app.name)
}

function formatStatus(app) {
  const color = statusColor[app.status]
  return color(app.status)
}

function formatVersion(app) {
  if (app.status === "deployed") {
    if (app.expected.version === app.deployed.version) {
      return colors.green(app.deployed.version)
    } else {
      return `${colors.red(app.deployed.version)} (expected ${app.expected.version})`
    }
  } else {
    return ""
  }
}

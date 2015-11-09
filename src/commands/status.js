/* @flow */

import colors from "colors/safe"
import table from "text-table"

import envCommand from "./envCommand"
import * as status from "../status"

import type {Status} from "../status"
import type {Environment, Services} from "../types"

const statusColor = {
  deployed: colors.green,
  missing: colors.red,
  additional: colors.gray
}

export default envCommand(function(environment: Environment, services: Services) {
  return status.determine(environment, services).then(function(apps) {
    const rows = apps.map((app) => {
      return [formatName(app), formatStatus(app), formatVersion(app)]
    })

    console.log(table(rows))
  })
})

function formatName(app: Status) {
  return colors.bold(app.name)
}

function formatStatus(app: Status) {
  const color = statusColor[app.type]
  return color(app.type)
}

function formatVersion(app: Status) {
  if (app.type === "deployed") {
    const color = app.version.expected === app.version.deployed ? colors.green : colors.red
    return color(app.version.deployed)
  } else {
    return ""
  }
}

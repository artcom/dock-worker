/* @flow */

import _ from "lodash"
import colors from "colors/safe"
import table from "text-table"

import envCommand from "./envCommand"
import {loadAppData} from "../appData"

import type {AppData} from "../appData"
import type {Environment, ServiceConfigs} from "../types"

export default envCommand(function(environment: Environment, configs: ServiceConfigs) {
  return loadAppData(environment, configs).then(function(appData) {
    const rows = appData.map((app) => {
      return [
        printName(app),
        printStatus(app),
        printVersion(app),
        print("config", app),
        print("dockerOptions", app)
      ]
    })

    console.log(table(rows))
  })
})

function printName(app: AppData) {
  return colors.bold(app.name)
}

function printStatus(app: AppData) {
  const color = statusColor(app)
  return color(app.status)
}

function statusColor(app: AppData) {
  switch (app.status) {
    case "deployed":
      if (_.every(["version", "config", "dockerOptions"].map(isUpToDate(app)))) {
        return colors.green
      }

      return colors.yellow

    case "missing":
      return colors.red

    case "additional":
      return colors.gray

    default:
      return colors.white
  }
}

function printVersion(app: AppData) {
  if (app.status === "deployed") {
    const color = isUpToDate(app, "version") ? colors.green : colors.red
    return color(app.deployed.version)
  } else {
    return ""
  }
}

function print(key, app: AppData) {
  if (app.status === "deployed") {
    const color = isUpToDate(app, key) ? colors.green : colors.red
    return color(key)
  } else {
    return ""
  }
}

const isUpToDate = _.curry(function(app, key) {
  return _.isEqual(app.config[key], app.deployed[key])
})

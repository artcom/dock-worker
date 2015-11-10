/* @flow */

import _ from "lodash"
import colors from "colors/safe"
import table from "text-table"

import envCommand from "./envCommand"
import {determineStatus} from "../status"

import type {Status} from "../status"
import type {Environment, Services} from "../types"

export default envCommand(function(environment: Environment, services: Services) {
  return determineStatus(environment, services).then(function(apps) {
    const rows = apps.map((app) => {
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

function printName(app: Status) {
  return colors.bold(app.name)
}

function printStatus(app: Status) {
  const color = statusColor(app)
  return color(app.type)
}

function statusColor(app) {
  switch (app.type) {
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

function printVersion(app: Status) {
  const color = isUpToDate(app, "version") ? colors.green : colors.red
  return color(app.version.deployed)
}

function print(key, app: Status) {
  if (app.type === "deployed") {
    const color = isUpToDate(app, key) ? colors.green : colors.red
    return color(key)
  } else {
    return ""
  }
}

const isUpToDate = _.curry(function(app, key) {
  if (app.type === "deployed") {
    const property = app[key]
    return _.isEqual(property.expected, property.deployed)
  } else {
    return false
  }
})

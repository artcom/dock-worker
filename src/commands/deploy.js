/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import read from "read"
import yn from "yn"

import envCommand from "./envCommand"
import {deriveActions} from "../actions"
import {loadAppData} from "../appData"

import type {Environment, ServiceConfigs} from "../types"

const readAsync = bluebird.promisify(read)

export default envCommand(function(environment: Environment, configs: ServiceConfigs) {
  return loadAppData(environment, configs).then(function(appData) {
    const appActions = _(appData)
      .map((app) => ({ app, actions: deriveActions(app) }))
      .reject(({actions}) => _.isEmpty(actions))
      .value()

    if (_.isEmpty(appActions)) {
      console.log("All services up-to-date")
    } else {
      printActions(appActions)

      return readAsync({ prompt: "apply changes (y/N)?" }).then((response) => {
        if (yn(response)) {
          runActions(appActions, environment)
        }
      })
    }
  })
})

function printActions(appActions) {
  appActions.forEach(({app, actions}) => {
    printApp(app)
    actions.forEach(printAction)
  })
}

function runActions(appActions, environment) {
  return bluebird.mapSeries(appActions, ({app, actions}) => {
    printApp(app)

    return bluebird.mapSeries(actions, (action) => {
      printAction(action)
      return action.run(environment)
    })
  })
}

function printApp(app) {
  console.log(colors.bold(app.name))
}

function printAction(action) {
  console.log("  " + colors.cyan(action.describe()))
}

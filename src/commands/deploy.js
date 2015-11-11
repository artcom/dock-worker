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
          return _(appActions)
            .pluck("actions")
            .flatten()
            .map((action) => action.run(environment))
            .value()
        }
      })
    }
  })
})

function printActions(appActions) {
  appActions.forEach(({app, actions}) => {
    console.log(colors.bold(app.name))

    _(actions)
      .map((action) => action.describe())
      .flatten()
      .forEach((description) => console.log("  " + description))
      .value()
  })
}

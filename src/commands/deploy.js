/* @flow */

import _ from "lodash"
import colors from "colors/safe"

import envCommand from "./envCommand"
import {deriveActions} from "../actions"
import {loadAppData} from "../appData"

import type {Environment, ServiceConfigs} from "../types"

export default envCommand(function(environment: Environment, configs: ServiceConfigs) {
  return loadAppData(environment, configs).then(function(appData) {
    appData.forEach(function(app) {
      const actions = deriveActions(app)

      if (!_.isEmpty(actions)) {
        console.log(colors.bold(app.name))

        _(actions)
          .map((action) => action.describe())
          .flatten()
          .forEach((description) => console.log("  " + description))
          .value()
      }
    })
  })
})

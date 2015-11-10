/* @flow */

import _ from "lodash"
import colors from "colors/safe"

import envCommand from "./envCommand"
import {deriveActions} from "../actions"
import {determineStatus} from "../status"

import type {Environment, Services} from "../types"

export default envCommand(function(environment: Environment, services: Services) {
  return determineStatus(environment, services).then(function(apps) {
    apps.forEach(function(app) {
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

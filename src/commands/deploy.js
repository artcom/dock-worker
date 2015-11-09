/* @flow */

import _ from "lodash"
import util from "util"

import envCommand from "./envCommand"
import * as actions from "../actions"
import * as status from "../status"

import type {Environment, Services} from "../types"

export default envCommand(function(environment: Environment, services: Services) {
  return status.determine(environment, services).then(function(apps) {
    _(apps)
      .map(actions.derive)
      .flatten()
      .forEach(function(action) {
        console.log(util.inspect(action, { depth: null }))
      })
      .value()
  })
})

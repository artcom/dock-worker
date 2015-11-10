/* @flow */

import _ from "lodash"

import ConfigAction from "./configAction"
import DockerOptionAction from "./dockerOptionAction"
import PushAction from "./pushAction"

import type {AppData} from "../appData"

export type Action = ConfigAction | DockerOptionAction | PushAction

export function deriveActions(app: AppData): Array<Action> {
  const actions = []

  if (app.status === "missing") {
    actions.push(new PushAction(app))

    if (!_.isEmpty(app.config.config)) {
      actions.push(new ConfigAction(app))
    }

    if (!_.isEmpty(app.config.dockerOptions)) {
      actions.push(new DockerOptionAction(app))
    }
  } else if (app.status === "deployed") {
    if (app.config.version !== app.deployed.version) {
      actions.push(new PushAction(app))
    }

    if (!_.isEqual(app.config.config || {}, app.deployed.config)) {
      actions.push(new ConfigAction(app))
    }

    if (!_.isEqual(app.config.dockerOptions || {}, app.deployed.dockerOptions)) {
      actions.push(new DockerOptionAction(app))
    }
  }

  return actions
}

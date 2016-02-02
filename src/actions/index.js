/* @flow */

import _ from "lodash"

import ConfigAction from "./configAction"
import CreateAction from "./createAction"
import DockerOptionAction from "./dockerOptionAction"
import PushAction from "./pushAction"
import StartAction from "./startAction"

import type {AppData} from "../appData"

export type Action = ConfigAction | CreateAction | DockerOptionAction | PushAction | StartAction

export function deriveActions(app: AppData): Array<Action> {
  const actions = []

  if (app.status === "missing" || app.status === "created") {
    if (app.status === "missing") {
      actions.push(new CreateAction(app))
    }

    if (!_.isEmpty(app.description.config)) {
      actions.push(new ConfigAction(app))
    }

    if (!_.isEmpty(app.description.dockerOptions)) {
      actions.push(new DockerOptionAction(app))
    }

    actions.push(new PushAction(app.description))
  } else if (app.status === "deployed") {
    if (!_.isEqual(app.description.config, app.deployed.config)) {
      actions.push(new ConfigAction(app))
    }

    if (!_.isEqual(app.description.dockerOptions, app.deployed.dockerOptions)) {
      actions.push(new DockerOptionAction(app))
    }

    if (app.description.version !== app.deployed.version) {
      actions.push(new PushAction(app.description))
    }

    if (_.isEmpty(actions) && !app.running) {
      actions.push(new StartAction(app))
    }
  }

  return actions
}

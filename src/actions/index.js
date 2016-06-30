/* @flow */

import isEqual from "lodash/isEqual"

import ConfigAction from "./configAction"
import CreateAction from "./createAction"
import DockerOptionAction from "./dockerOptionAction"
import PushAction from "./pushAction"
import StartAction from "./startAction"

import type { AppData } from "../appData"

export type Action = ConfigAction | CreateAction | DockerOptionAction | PushAction | StartAction

export function deriveActions(app: AppData): Array<Action> {
  const actions = []

  if (app.status !== "unknown") {
    if (app.status === "missing") {
      actions.push(new CreateAction(app))
    }

    if (!isEqual(app.description.config, app.actual.config)) {
      actions.push(new ConfigAction(app))
    }

    if (!isEqual(app.description.dockerOptions, app.actual.dockerOptions)) {
      actions.push(new DockerOptionAction(app))
    }

    if (app.description.version !== app.actual.version) {
      actions.push(new PushAction(app.description))
    }

    if (!app.running && actions.length === 0) {
      actions.push(new StartAction(app))
    }
  }

  return actions
}

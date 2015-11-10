import _ from "lodash"

import ConfigAction from "./configAction"
import DockerOptionAction from "./dockerOptionAction"
import PushAction from "./pushAction"

import type {Status} from "./status"

export type Action = ConfigAction | DockerOptionAction | PushAction

export function deriveActions(app: Status): Array<Action> {
  const actions = []

  if (app.type === "missing") {
    actions.push(new PushAction(app))

    if (!_.isEmpty(app.config)) {
      actions.push(new ConfigAction(app))
    }

    if (!_.isEmpty(app.dockerOptions)) {
      actions.push(new DockerOptionAction(app))
    }
  } else if (app.type === "deployed") {
    if (app.version.expected !== app.version.deployed) {
      actions.push(new PushAction(app))
    }

    if (!_.isEqual(app.config.expected, app.config.deployed)) {
      actions.push(new ConfigAction(app))
    }

    if (!_.isEqual(app.dockerOptions.expected, app.dockerOptions.deployed)) {
      actions.push(actions.push(new DockerOptionAction(app)))
    }
  }

  return actions
}

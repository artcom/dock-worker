import {
  needsConfigAction,
  makeConfigAction,
  isConfigAction,
} from "./configAction.js"
import {
  needsCreateAction,
  makeCreateAction,
  isCreateAction,
} from "./createAction.js"
import {
  needsDockerOptionAction,
  makeDockerOptionAction,
  isDockerOptionAction,
} from "./dockerOptionAction.js"
import { needsPushAction, makePushAction, isPushAction } from "./pushAction.js"
import {
  needsStartAction,
  makeStartAction,
  isStartAction,
} from "./startAction.js"

import { AppData } from "../appData.js"
import Dokku from "../dokku.js"
import RepoCache from "../repoCache.js"

export type Action = {
  describe: () => Array<string>
  run: (dokku: Dokku, repoCache: RepoCache) => Promise<void>
}

export function deriveActions(app: AppData): Array<Action> {
  if (app.status === "unknown") {
    return []
  }

  const actions = []

  if (needsCreateAction(app)) {
    actions.push(makeCreateAction(app))
  }

  if (needsConfigAction(app)) {
    actions.push(makeConfigAction(app))
  }

  if (needsDockerOptionAction(app)) {
    actions.push(makeDockerOptionAction(app))
  }

  if (needsPushAction(app)) {
    actions.push(makePushAction(app))
  }

  if (needsStartAction(app, actions)) {
    actions.push(makeStartAction(app))
  }

  return actions
}

export type ActionKind =
  "create" | "config" | "docker-options" | "push" | "start"

export function actionKind(action: Action): ActionKind {
  if (isCreateAction(action)) return "create"
  if (isConfigAction(action)) return "config"
  if (isDockerOptionAction(action)) return "docker-options"
  if (isPushAction(action)) return "push"
  if (isStartAction(action)) return "start"
  throw new Error("Unknown action")
}

export function serializeAction(action: Action) {
  return { kind: actionKind(action), changes: action.describe() }
}

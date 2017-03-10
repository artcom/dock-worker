/* @flow */

import { needsConfigAction, makeConfigAction } from "./configAction"
import { needsCreateAction, makeCreateAction } from "./createAction"
import { needsDockerOptionAction, makeDockerOptionAction } from "./dockerOptionAction"
import { needsPushAction, makePushAction } from "./pushAction"
import { needsStartAction, makeStartAction } from "./startAction"

import type { AppData } from "../appData"
import type Dokku from "../dokku"
import type RepoCache from "../repoCache"

export type Action = {
  describe: () => Array<string>,
  run: (dokku: Dokku, repoCache: RepoCache) => Promise<>
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

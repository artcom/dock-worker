/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import table from "text-table"

import {deriveActions} from "../actions"
import ConfigAction from "../actions/configAction"
import DockerOptionAction from "../actions/dockerOptionAction"
import PushAction from "../actions/pushAction"

import {loadContext} from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"
import showProgress from "../showProgress"

import type {Action} from "../actions"
import type {AppData, DeployedAppData} from "../appData"
import type {AppConfig} from "../types"

export default envCommand(status)

function status(configs: Array<AppConfig>, dokku: Dokku, repoCache: RepoCache) {
  return showProgress(
    (spinner) => colors.gray(`loading service list ${spinner}`),
    loadContext(configs, dokku, repoCache)
  ).then((context) => {
    const apps = context.listApps()
    const data = {}

    function updateAppData(appData) {
      data[appData.name] = appData
    }

    return showProgress(
      (spinner) => createTable(apps, data, spinner),
      bluebird.map(apps, (app) => context.loadAppData(app).then(updateAppData), { concurrency: 4 })
    ).then(() => console.log(createTable(apps, data)))
  })
}

function createTable(apps, data, spinner) {
  const rows = apps.map((app) =>
    data[app]
      ? createRow(data[app])
      : [name(app), colors.gray(spinner)]
  )

  return table(rows)
}

function createRow(app: AppData) {
  switch (app.status) {
    case "missing":
      return [name(app.name), colors.red("missing")]
    case "created":
      return [name(app.name), colors.red("created")]
    case "deployed":
      const actions = deriveActions(app)
      const color = _.isEmpty(actions) ? colors.green : colors.yellow
      const running = app.running ? color("running") : colors.red("stopped")
      return [name(app.name), running, version(app, actions), deploymentStatus(app, actions)]
    case "unknown":
      return [name(app.name), colors.gray(app.running ? "running" : "stopped")]
    default:
      return []
  }
}

function name(app: string) {
  return colors.bold(app)
}

function version(app: DeployedAppData, actions: Array<Action>) {
  const outdated = actions.some((action) => action instanceof PushAction)
  const color = outdated ? colors.red : colors.green
  return color(app.deployed.version)
}

function deploymentStatus(app: DeployedAppData, actions: Array<Action>) {
  const status = []

  if (actions.some((action) => action instanceof ConfigAction)) {
    status.push(colors.red("config"))
  }

  if (actions.some((action) => action instanceof DockerOptionAction)) {
    status.push(colors.red("docker-options"))
  }

  return status.join(", ")
}

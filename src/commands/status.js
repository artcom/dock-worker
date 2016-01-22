/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import table from "text-table"

import {deriveActions} from "../actions"
import ConfigAction from "../actions/configAction"
import DockerOptionAction from "../actions/dockerOptionAction"
import PushAction from "../actions/pushAction"
import {createProviderWithProgress} from "../appData"
import envCommand from "./envCommand"

import type {Action} from "../actions"
import type {AppData, DeployedAppData} from "../appData"
import type {Environment, AppConfig} from "../types"

export default envCommand(function(environment: Environment, configs: Array<AppConfig>) {
  return createProviderWithProgress(environment, configs).then((provider) => {
    const apps = provider.apps()
    return bluebird.map(apps, (app) => provider.loadAppDataWithProgress(app).then(createRow), {
      concurrency: 4
    })
  }).then((rows) => {
    console.log(table(rows))
  })
})

function createRow(app: AppData) {
  switch (app.status) {
    case "missing":
      return [name(app), colors.red("missing")]
    case "created":
      return [name(app), colors.red("created")]
    case "deployed":
      const actions = deriveActions(app)
      const color = _.isEmpty(actions) ? colors.green : colors.yellow
      const running = app.running ? color("running") : colors.red("stopped")
      return [name(app), running, version(app, actions), deploymentStatus(app, actions)]
    case "additional":
      return [name(app), colors.gray(app.running ? "running" : "stopped")]
    default:
      return []
  }
}

function name(app: AppData) {
  return colors.bold(app.name)
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

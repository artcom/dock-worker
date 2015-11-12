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
import type {Environment, ServiceConfigs} from "../types"

export default envCommand(function(environment: Environment, configs: ServiceConfigs) {
  return createProviderWithProgress(environment, configs).then((provider) => {
    const apps = provider.apps()
    return bluebird.mapSeries(apps, (app) => provider.loadAppDataWithProgress(app).then(createRow))
  }).then((rows) => {
    console.log(table(rows))
  })
})

function createRow(app) {
  switch (app.status) {
    case "missing":
      return [name(app), colors.red("missing")]
    case "deployed":
      const actions = deriveActions(app)
      const color = _.isEmpty(actions) ? colors.green : colors.yellow
      return [name(app), color("deployed")].concat(deploymentStatus(app, actions))
    case "additional":
      return [name(app), colors.gray("additional")]
    default:
      return []
  }
}

function name(app: AppData) {
  return colors.bold(app.name)
}

function deploymentStatus(app: DeployedAppData, actions: Array<Action>) {
  return [
    colorize(app.deployed.version, _.some(actions, (action) => action instanceof PushAction)),
    colorize("config", _.some(actions, (action) => action instanceof ConfigAction)),
    colorize("docker-options", _.some(actions, (action) => action instanceof DockerOptionAction))
  ]
}

function colorize(string: string, dirty: boolean) {
  const color = dirty ? colors.red : colors.green
  return color(string)
}

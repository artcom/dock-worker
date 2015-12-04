/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import read from "read"
import yn from "yn"

import {deriveActions} from "../actions"
import {createProviderWithProgress} from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import showProgress from "../showProgress"

import type {Environment, AppConfig} from "../types"

const readAsync = bluebird.promisify(read)

export default envCommand(function(environment: Environment, configs: Array<AppConfig>) {
  return createProviderWithProgress(environment, configs)
    .then(deriveAllAppActions)
    .then((appActions) => {
      if (_.isEmpty(appActions)) {
        console.log("all apps up-to-date")
      } else {
        return runActionsWithConfirmation(appActions, environment)
      }
    })
})

function deriveAllAppActions(provider) {
  const apps = provider.apps()

  return bluebird.mapSeries(apps, (name) =>
    provider.loadAppDataWithProgress(name).then(deriveAndPrintAppActions)
  ).then(_.compact)
}

function deriveAndPrintAppActions(app) {
  const actions = deriveActions(app)

  if (_.isEmpty(actions)) {
    return null
  }

  printApp(app)
  actions.forEach(printAction)

  return { app, actions }
}

function runActionsWithConfirmation(appActions, environment) {
  return readAsync({ prompt: "apply changes (y/N)?" }).then((response) => {
    if (yn(response)) {
      return runActions(appActions, environment)
    }
  })
}

function runActions(appActions, environment) {
  const dokku = new Dokku(environment)

  return bluebird.mapSeries(appActions, ({app, actions}) => {
    printApp(app)

    return bluebird.mapSeries(actions, (action) =>
      showProgress(indentDescription(action), action.run(dokku, environment))
        .then(() => printAction(action))
    )
  })
}

function printApp(app) {
  console.log(colors.bold(app.name))
}

function printAction(action) {
  console.log(colors.cyan(indentDescription(action)))
}

function indentDescription(action) {
  return _(action.describe())
    .map((description) => "  " + description)
    .join("\n")
}

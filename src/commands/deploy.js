/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"
import read from "read"
import yn from "yn"

import {deriveActions} from "../actions"
import {createProvider} from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import showProgress from "../showProgress"

import type {Action} from "../actions"
import type {Environment, AppConfig} from "../types"

const readAsync = bluebird.promisify(read)

type AppActions = {
  app: string,
  actions?: Array<Action>
}

export default envCommand(deploy)

function deploy(environment: Environment, configs: Array<AppConfig>, options: any) {
  return showProgress(
    (spinner) => colors.gray(`loading service list ${spinner}`),
    createProvider(environment, configs)
  ).then(loadAndDisplayAppActions).then((appActions) =>
    applyAppActions(appActions, environment, options["--yes"])
  )
}

function loadAndDisplayAppActions(provider) {
  const apps = provider.apps()
  let appActionsList: Array<AppActions> = apps.map((app) => ({ app }))

  function deriveAppAction(app) {
    return provider.loadAppData(app)
      .then(deriveActions)
      .then((actions) => {
        _.remove(appActionsList, { app })

        if (actions.length > 0) {
          appActionsList.push({ app, actions })
        }

        appActionsList = _.sortBy(appActionsList, "app")
      })
  }

  return showProgress(
    (spinner) => printList(appActionsList, spinner),
    bluebird.map(apps, deriveAppAction, { concurrency: 4 })
  ).then(() => appActionsList)
}

function applyAppActions(appActionsList, environment, yes) {
  if (appActionsList.length === 0) {
    return console.log("nothing to deploy")
  }

  console.log(printList(appActionsList))
  const confirm = yes ? Promise.resolve(true) : askForConfirmation()

  return confirm.then((confirmed) => {
    if (confirmed) {
      return runActions(appActionsList, environment)
    }
  })
}

function askForConfirmation() {
  return readAsync({ prompt: "apply changes (y/N)?" }).then(yn)
}

function runActions(appActionsList, environment) {
  const dokku = new Dokku(environment)

  return bluebird.mapSeries(appActionsList, ({ app, actions }) => {
    console.log(printName(app))

    return bluebird.mapSeries(actions, (action) =>
      showProgress(
        (spinner) => colors.gray(`${printAction(action)} ${spinner}`),
        action.run(dokku, environment)
      ).then(() => console.log(colors.cyan(printAction(action))))
    )
  })
}

function printList(appActionsList: Array<AppActions>, spinner: string = ""): string {
  const lines = appActionsList.map((appActions) => printAppActions(appActions, spinner))
  return lines.join("\n")
}

function printAppActions({ app, actions }: AppActions, spinner: string): string {
  if (!actions) {
    return `${printName(app)} ${colors.gray(spinner)}`
  }

  const lines = actions.map((action) => colors.gray(printAction(action)))
  lines.unshift(printName(app))

  return lines.join("\n")
}

function printName(app: string): string {
  return colors.bold(app)
}

function printAction(action: Action): string {
  return _(action.describe())
    .map((description) => "  " + description)
    .join("\n")
}

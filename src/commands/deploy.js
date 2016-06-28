/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import chalk from "chalk"
import read from "read"
import yn from "yn"

import { deriveActions } from "../actions"
import { loadContext } from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"
import showProgress from "../showProgress"

import type { Action } from "../actions"
import type { AppDescription } from "../types"

const readAsync = bluebird.promisify(read)

type AppActions = {
  appName: string,
  actions?: Array<Action>
}

export default envCommand(deploy)

function deploy(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) {
  const selectedApps = options["<app>"]
  validateSelectedApps(descriptions, selectedApps)

  return showProgress(
    (spinner) => chalk.gray(`loading service list ${spinner}`),
    loadContext(descriptions, dokku, repoCache)
  ).then((context) =>
    loadAppActions(context, descriptions, selectedApps)
  ).then((appActions) =>
    applyAppActions(appActions, dokku, repoCache, options["--yes"])
  )
}

function validateSelectedApps(descriptions, selectedApps) {
  selectedApps.forEach((appName) => {
    if (!_.find(descriptions, ["name", appName])) {
      throw new Error(`Unknown app "${appName}"`)
    }
  })
}

function loadAppActions(context, descriptions, selectedApps) {
  const appNames = context.listAppNames().filter((appName) => {
    const description = _.find(descriptions, ["name", appName])
    return description && hasBeenSelected(description, selectedApps)
  })

  const appActionsList: Array<AppActions> = appNames.map((appName) => ({ appName }))

  function deriveAppAction(appName) {
    return context.loadAppData(appName)
      .then(deriveActions)
      .then((actions) => {
        if (actions.length > 0) {
          const appActions = _.find(appActionsList, { appName })
          appActions.actions = actions
        } else {
          _.remove(appActionsList, { appName })
        }
      })
  }

  return showProgress(
    (spinner) => printList(appActionsList, spinner),
    bluebird.map(appNames, deriveAppAction, { concurrency: 4 })
  ).then(() => appActionsList)
}

function hasBeenSelected(description: AppDescription, selectedApps: Array<string>) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, description.name)
  }
}

function applyAppActions(appActionsList, dokku, repoCache, yes) {
  if (appActionsList.length === 0) {
    return console.log("nothing to deploy")
  }

  console.log(printList(appActionsList))
  const confirm = yes ? Promise.resolve(true) : askForConfirmation()

  return confirm.then((confirmed) => {
    if (confirmed) {
      return runActions(appActionsList, dokku, repoCache)
    }
  })
}

function askForConfirmation() {
  return readAsync({ prompt: "apply changes (y/N)?" }).then(yn)
}

function runActions(appActionsList, dokku, repoCache) {
  return bluebird.mapSeries(appActionsList, ({ appName, actions }) => {
    console.log(printName(appName))

    return bluebird.mapSeries(actions, (action) =>
      showProgress(
        (spinner) => chalk.gray(`${printAction(action)} ${spinner}`),
        action.run(dokku, repoCache)
      ).then(() => console.log(chalk.cyan(printAction(action))))
    )
  })
}

function printList(appActionsList: Array<AppActions>, spinner: string = ""): string {
  const lines = appActionsList.map((appActions) => printAppActions(appActions, spinner))
  return lines.join("\n")
}

function printAppActions({ appName, actions }: AppActions, spinner: string): string {
  if (!actions) {
    return `${printName(appName)} ${chalk.gray(spinner)}`
  }

  const lines = actions.map((action) => chalk.gray(printAction(action)))
  lines.unshift(printName(appName))

  return lines.join("\n")
}

function printName(appName: string): string {
  return chalk.bold(appName)
}

function printAction(action: Action): string {
  return _(action.describe())
    .map((description) => `  ${description}`)
    .join("\n")
}

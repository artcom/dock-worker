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

async function deploy(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) {
  const selectedApps = options["<app>"]
  validateSelectedApps(descriptions, selectedApps)

  const context = await showProgress(
    (spinner) => chalk.gray(`loading service list ${spinner}`),
    loadContext(descriptions, dokku, repoCache)
  )

  const appActions = await loadAppActions(context, descriptions, selectedApps)
  await applyAppActions(appActions, dokku, repoCache, options["--yes"])
}

function validateSelectedApps(descriptions, selectedApps) {
  selectedApps.forEach((appName) => {
    if (!_.find(descriptions, ["name", appName])) {
      throw new Error(`Unknown app "${appName}"`)
    }
  })
}

async function loadAppActions(context, descriptions, selectedApps) {
  const appNames = context.listAppNames().filter((appName) => {
    const description = _.find(descriptions, ["name", appName])
    return description && hasBeenSelected(description, selectedApps)
  })

  const appActionsList: Array<AppActions> = appNames.map((appName) => ({ appName }))

  async function deriveAppAction(appName) {
    const appData = await context.loadAppData(appName)
    const actions = deriveActions(appData)

    if (actions.length > 0) {
      const appActions = _.find(appActionsList, { appName })
      appActions.actions = actions
    } else {
      _.remove(appActionsList, { appName })
    }
  }

  await showProgress(
    (spinner) => printList(appActionsList, spinner),
    bluebird.map(appNames, deriveAppAction, { concurrency: 4 })
  )

  return appActionsList
}

function hasBeenSelected(description: AppDescription, selectedApps: Array<string>) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, description.name)
  }
}

async function applyAppActions(appActionsList, dokku, repoCache, yes) {
  if (appActionsList.length === 0) {
    return console.log("nothing to deploy")
  }

  console.log(printList(appActionsList))

  if (yes || await askForConfirmation()) {
    await runActions(appActionsList, dokku, repoCache)
  }
}

async function askForConfirmation() {
  const input = readAsync({ prompt: "apply changes (y/N)?" })
  return yn(input)
}

function runActions(appActionsList, dokku, repoCache) {
  return bluebird.mapSeries(appActionsList, ({ appName, actions }) => {
    console.log(printName(appName))

    return bluebird.mapSeries(actions, async function (action) {
      await showProgress(
        (spinner) => chalk.gray(`${printAction(action)} ${spinner}`),
        action.run(dokku, repoCache)
      )

      console.log(chalk.cyan(printAction(action)))
    })
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

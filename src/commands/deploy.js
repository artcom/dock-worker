/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import chalk from "chalk"
import read from "read"
import yn from "yn"

import { deriveActions } from "../actions"
import { loadAppData } from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"
import showProgress from "../showProgress"

import type { Action } from "../actions"
import type { AppDescription } from "../types"

const readAsync = bluebird.promisify(read)

type AppActions = {
  appName: string,
  actions: Array<Action>
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

  const apps = await loadAppData(descriptions, dokku, repoCache, selectedApps)
  const appActions = apps
    .map(app => ({ appName: app.name, actions: deriveActions(app) }))
    .filter(({ actions }) => actions.length > 0)

  await applyAppActions(appActions, dokku, repoCache, options["--yes"])
}

function validateSelectedApps(descriptions, selectedApps) {
  selectedApps.forEach((appName) => {
    if (!_.find(descriptions, ["name", appName])) {
      throw new Error(`Unknown app "${appName}"`)
    }
  })
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

function printList(appActionsList: Array<AppActions>): string {
  return appActionsList.map(printAppActions).join("\n")
}

function printAppActions({ appName, actions }: AppActions): string {
  const lines = actions.map(action => chalk.gray(printAction(action)))
  return [printName(appName), ...lines].join("\n")
}

function printName(appName: string): string {
  return chalk.bold(appName)
}

function printAction(action: Action): string {
  return action.describe()
    .map(description => `  ${description}`)
    .join("\n")
}

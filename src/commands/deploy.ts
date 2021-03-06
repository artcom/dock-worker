import chalk from "chalk"
import read from "read-promise"
import yn from "yn"
import find from "lodash/find"

import { deriveActions, Action } from "../actions"
import { loadAppData } from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"
import showMessageUntilSettled from "../showMessageUntilSettled"

import { AppDescription } from "../types"

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

function validateSelectedApps(descriptions: Array<AppDescription>, selectedApps): void {
  selectedApps.forEach(appName => {
    if (!find(descriptions, ["name", appName])) {
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
  const input = await read({ prompt: "apply changes (y/N)?" })
  return yn(input)
}

async function runActions(appActionsList, dokku, repoCache) {
  for (const { appName, actions } of appActionsList) {
    console.log(printName(appName))

    for (const action of actions) {
      const message = spinner => chalk.gray(`${printAction(action)} ${spinner}`)
      await showMessageUntilSettled(message, action.run(dokku, repoCache))
      console.log(chalk.cyan(printAction(action)))
    }
  }
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

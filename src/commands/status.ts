import chalk from "chalk"

import { deriveActions } from "../actions"
import { isConfigAction } from "../actions/configAction"
import { isDockerOptionAction } from "../actions/dockerOptionAction"
import { isPushAction } from "../actions/pushAction"

import ansiTable from "../ansiTable"
import { loadAppData } from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"

import { Action } from "../actions"
import { AppData, KnownAppData } from "../appData"
import { AppDescription } from "../types"

export default envCommand(status)

async function status(descriptions: Array<AppDescription>, dokku: Dokku, repoCache: RepoCache) {
  const apps = await loadAppData(descriptions, dokku, repoCache)
  console.log(createTable(apps))
}

function createTable(apps) {
  const rows = apps.map(createRow)
  return ansiTable(rows)
}

function createRow(app: AppData) {
  switch (app.status) {
    case "missing":
      return [
        name(app.name),
        chalk.red("✗"),
        chalk.red("missing")
      ]

    case "exists": {
      const actions = deriveActions(app)

      return [
        name(app.name),
        actions.length === 0 ? chalk.green("✓") : chalk.red("✗"),
        state(app),
        version(app, actions),
        deploymentStatus(app, actions)
      ]
    }

    case "unknown":
      return [
        name(app.name),
        chalk.gray("·"),
        state(app, chalk.gray),
        chalk.gray(app.actual.version)
      ]

    default:
      return []
  }
}

function name(appName: string) {
  return chalk.bold(appName)
}

function state(app: AppData, overrideColor?: Function): string {
  if (app.deployed) {
    if (app.running) {
      const color = overrideColor || chalk.green
      return color("running")
    } else {
      const color = overrideColor || chalk.red
      return color("stopped")
    }
  } else {
    const color = overrideColor || chalk.red
    return color("created")
  }
}

function version(app: AppData, actions: Array<Action>) {
  const outdated = actions.some(isPushAction)
  const color = outdated ? chalk.red : chalk.green
  return color(app.actual.version)
}

function deploymentStatus(app: KnownAppData, actions: Array<Action>) {
  const status = []

  if (actions.some(isConfigAction)) {
    status.push("config")
  }

  if (actions.some(isDockerOptionAction)) {
    status.push("docker-options")
  }

  return chalk.red(status.join(", "))
}

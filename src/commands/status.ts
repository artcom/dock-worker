import chalk from "chalk"

import { deriveActions, actionKind, Action } from "../actions/index.js"
import { isConfigAction } from "../actions/configAction.js"
import { isDockerOptionAction } from "../actions/dockerOptionAction.js"
import { isPushAction } from "../actions/pushAction.js"

import ansiTable from "../ansiTable.js"
import { loadAppData, AppData } from "../appData.js"
import Dokku from "../dokku.js"
import envCommand from "./envCommand.js"
import RepoCache from "../repoCache.js"
import { printJson } from "../output.js"

import { AppDescription } from "../types.js"

export default envCommand(status)

async function status(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any,
  { environment },
) {
  const apps = await loadAppData(descriptions, dokku, repoCache)

  if (options["--json"]) {
    apps.forEach((app) => printJson(serializeApp(app, environment.name)))
  } else {
    console.log(createTable(apps))
  }
}

function serializeApp(app: AppData, environment: string) {
  const actions = deriveActions(app)

  return {
    app: app.name,
    environment,
    status: app.status,
    deployed: app.deployed,
    running: app.running,
    inSync: app.status !== "unknown" && actions.length === 0,
    version: {
      expected: app.description ? app.description.version : null,
      actual: app.actual.version || null,
    },
    pending: actions.map(actionKind),
  }
}

function createTable(apps) {
  const rows = apps.map(createRow)
  return ansiTable(rows)
}

function createRow(app: AppData) {
  switch (app.status) {
    case "missing":
      return [name(app.name), chalk.red("✗"), chalk.red("missing")]

    case "exists": {
      const actions = deriveActions(app)

      return [
        name(app.name),
        actions.length === 0 ? chalk.green("✓") : chalk.red("✗"),
        state(app),
        version(app, actions),
        deploymentStatus(actions),
      ]
    }

    case "unknown":
      return [
        name(app.name),
        chalk.gray("·"),
        state(app, chalk.gray),
        chalk.gray(app.actual.version),
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

function deploymentStatus(actions: Array<Action>) {
  const result = []

  if (actions.some(isConfigAction)) {
    result.push("config")
  }

  if (actions.some(isDockerOptionAction)) {
    result.push("docker-options")
  }

  return chalk.red(result.join(", "))
}

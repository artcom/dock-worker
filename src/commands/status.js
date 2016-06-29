/* @flow */

import bluebird from "bluebird"
import chalk from "chalk"

import { deriveActions } from "../actions"
import ConfigAction from "../actions/configAction"
import DockerOptionAction from "../actions/dockerOptionAction"
import PushAction from "../actions/pushAction"

import ansiTable from "../ansiTable"
import { loadContext } from "../appData"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"
import showProgress from "../showProgress"

import type { Action } from "../actions"
import type { AppData, KnownAppData } from "../appData"
import type { AppDescription } from "../types"

export default envCommand(status)

function status(descriptions: Array<AppDescription>, dokku: Dokku, repoCache: RepoCache) {
  return showProgress(
    (spinner) => chalk.gray(`loading service list ${spinner}`),
    loadContext(descriptions, dokku, repoCache)
  ).then((context) => {
    const appNames = context.listAppNames()
    const apps = {}

    function updateApp(app) {
      apps[app.name] = app
    }

    return showProgress(
      (spinner) => createTable(appNames, apps, spinner),
      bluebird.map(appNames, (appName) => context.loadAppData(appName).then(updateApp), {
        concurrency: 4
      })
    ).then(() => console.log(createTable(appNames, apps)))
  })
}

function createTable(appNames, apps, spinner) {
  const rows = appNames.map((appName) =>
    apps[appName]
      ? createRow(apps[appName])
      : [name(appName), chalk.gray(spinner)]
  )

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
  const outdated = actions.some((action) => action instanceof PushAction)
  const color = outdated ? chalk.red : chalk.green
  return color(app.actual.version)
}

function deploymentStatus(app: KnownAppData, actions: Array<Action>) {
  const status = []

  if (actions.some((action) => action instanceof ConfigAction)) {
    status.push("config")
  }

  if (actions.some((action) => action instanceof DockerOptionAction)) {
    status.push("docker-options")
  }

  return chalk.red(status.join(", "))
}

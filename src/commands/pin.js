/* @flow */

import bluebird from "bluebird"
import chalk from "chalk"
import find from "lodash/find"
import read from "read"
import yn from "yn"

import { loadAppData } from "../appData"
import { readDockfile, updateDockfile } from "../dockfile"
import Dokku from "../dokku"
import envCommand from "./envCommand"
import RepoCache from "../repoCache"

import type { AppData } from "../appData"
import type { AppDescription } from "../types"

const readAsync = bluebird.promisify(read)

export default envCommand(pin)

async function pin(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) {
  const selectedApps = options["<app>"]
  validateSelectedApps(descriptions, selectedApps)

  const apps = await loadAppData(descriptions, dokku, repoCache, selectedApps)
  await bluebird.mapSeries(apps, app => pinVersion(app, options))
}

function validateSelectedApps(descriptions, selectedApps) {
  selectedApps.forEach(appName => {
    if (!find(descriptions, ["name", appName])) {
      throw new Error(`Unknown app "${appName}"`)
    }
  })
}

async function pinVersion(app: AppData, options: any) {
  const appName = chalk.bold.white(app.name)

  if (app.status === "unknown") {
    console.log(chalk.gray(`${appName} is unknown.`))
  } else if (app.status === "missing") {
    console.log(chalk.red(`${appName}" has not been deployed yet.`))
  } else if (app.description.version === app.actual.version) {
    console.log(chalk.green(`${appName} versions match.`))
  } else {
    await handleDifferentVersions(appName, app, options)
  }
}

async function handleDifferentVersions(appName, app, options) {
  const version = chalk.bold(app.actual.version)

  const input = await readAsync({ prompt: chalk.cyan(
    `${appName} versions differ. Pin to version ${version} (y/N)?`
  ) })

  if (yn(input)) {
    const dockfile = await readDockfile(options)
    const description = find(dockfile.apps, ["name", app.name])
    description.version = app.actual.version
    await updateDockfile(dockfile, options)
  }
}

/* @flow */

import _ from "lodash"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {AppConfig, Options} from "../types"

type Command = (config: any, options: any) => Promise

type EnvCommand = (
  apps: Array<AppConfig>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) => Command

export default function(callback: EnvCommand): Command {
  return function(config, options) {
    const environment = _.chain(config.environments)
      .find(["name", options["<environment>"]])
      .value()

    const apps = _.chain(config.apps)
      .filter((app) => hasBeenSelected(app, options["<app>"]))
      .filter((app) => shouldBeDeployed(app, environment.name))
      .map((app) => configureAppForEnvironment(app, environment.name))
      .defaults({ config: {}, dockerOptions: {}, stopBeforeDeployment: false })
      .value()

    const dokku = new Dokku(environment.host)
    const repoCache = new RepoCache(environment.host)

    return callback(apps, dokku, repoCache, options)
      .then((result) => {
        dokku.disconnect()
        return result
      })
      .catch((error) => {
        dokku.disconnect()
        throw error
      })
  }
}

function hasBeenSelected(app: AppConfig, selectedApps: Array<string>) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, app.name)
  }
}

function shouldBeDeployed(app: AppConfig, environment: string) {
  if (app.environments) {
    return _.includes(app.environments, environment)
  } else {
    return true
  }
}

function configureAppForEnvironment(app: AppConfig, environment: string) {
  return Object.assign({}, app, {
    config: selectEnvironmentOptions(app.config, environment),
    dockerOptions: selectEnvironmentOptions(app.dockerOptions, environment)
  })
}

function selectEnvironmentOptions(options: Options, environment: string) {
  return _(options)
    .mapValues((value) => {
      if (_.isPlainObject(value)) {
        return value[environment]
      } else {
        return value
      }
    })
    .omit(_.isUndefined)
    .value()
}

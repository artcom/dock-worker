/* @flow */

import _ from "lodash"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {AppConfig} from "../types"

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
      .defaults({ protocol: "ssh", username: "dokku" })
      .value()

    const apps = _.chain(config.apps)
      .filter((app) => hasBeenSelected(app, options["<app>"]))
      .filter((app) => shouldBeDeployed(app, environment))
      .map((app) => configureAppForEnvironment(app, environment))
      .defaults({ config: {}, dockerOptions: {}, stopBeforeDeployment: false })
      .value()

    const dokku = new Dokku(environment)
    const repoCache = new RepoCache(environment)

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

function hasBeenSelected(app, selectedApps) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, app.name)
  }
}

function shouldBeDeployed(app, environment) {
  if (app.environments) {
    return _.includes(app.environments, environment.name)
  } else {
    return true
  }
}

function configureAppForEnvironment(app, environment) {
  return Object.assign({}, app, {
    config: selectEnvironmentOptions(app.config, environment),
    dockerOptions: selectEnvironmentOptions(app.dockerOptions, environment)
  })
}

function selectEnvironmentOptions(options, environment) {
  return _(options)
    .mapValues((value) => {
      if (_.isPlainObject(value)) {
        return value[environment.name]
      } else {
        return value
      }
    })
    .omit(_.isUndefined)
    .value()
}

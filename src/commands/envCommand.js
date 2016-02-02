/* @flow */

import _ from "lodash"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type {AppDescription, Options} from "../types"

type Command = (dockfile: any, options: any) => Promise

type EnvCommand = (
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) => Command

export default function(callback: EnvCommand): Command {
  return function(dockfile, options) {
    const environment = _.chain(dockfile.environments)
      .find(["name", options["<environment>"]])
      .value()

    const descriptions = _.chain(dockfile.apps)
      .filter((app) => hasBeenSelected(app, options["<app>"]))
      .filter((app) => shouldBeDeployed(app, environment.name))
      .map((app) => configureAppForEnvironment(app, environment.name))
      .defaults({ config: {}, dockerOptions: {}, stopBeforeDeployment: false })
      .value()

    const dokku = new Dokku(environment.host)
    const repoCache = new RepoCache(environment.host)

    return callback(descriptions, dokku, repoCache, options)
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

function hasBeenSelected(description: AppDescription, selectedApps: Array<string>) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, description.name)
  }
}

function shouldBeDeployed(description: AppDescription, environment: string) {
  if (description.environments) {
    return _.includes(description.environments, environment)
  } else {
    return true
  }
}

function configureAppForEnvironment(description: AppDescription, environment: string) {
  return Object.assign({}, description, {
    config: selectEnvironmentOptions(description.config, environment),
    dockerOptions: selectEnvironmentOptions(description.dockerOptions, environment)
  })
}

function selectEnvironmentOptions(options: Options, environment: string): Options {
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

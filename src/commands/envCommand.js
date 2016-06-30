/* @flow */

import _ from "lodash"
import url from "url"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import type { AppDescription, Options } from "../types"

type Command = (dockfile: any, options: any) => Promise

type EnvCommand = (
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) => Promise

export default function(callback: EnvCommand): Command {
  return async function(dockfile, options) {
    const environment = _.chain(dockfile.environments)
      .find(["name", options["<environment>"]])
      .value()

    if (!environment) {
      throw new Error(`Environment "${options["<environment>"]}" not found in Dockfile.json`)
    }

    const descriptions = _.chain(dockfile.apps)
      .filter((app) => shouldBeDeployed(app, environment.name))
      .map((app) => configureAppForEnvironment(app, environment.name))
      .defaults({ config: {}, dockerOptions: {}, stopBeforeDeployment: false })
      .value()

    const dokku = new Dokku(environment.host)
    const repoCache = new RepoCache(url.format({
      slashes: true,
      protocol: "ssh",
      auth: "dokku",
      host: environment.host
    }))

    try {
      return await callback(descriptions, dokku, repoCache, options)
    } finally {
      dokku.disconnect()
    }
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
    .omitBy(_.isUndefined)
    .value()
}

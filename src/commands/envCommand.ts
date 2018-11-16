import find from "lodash/find"
import isPlainObject from "lodash/isPlainObject"
import mapValues from "lodash/mapValues"
import omitBy from "lodash/omitBy"
import url from "url"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import { AppDescription, Options, Dockfile } from "../types"

export type EnvCommand = (dockfile: Dockfile, options: any) => any

type Command = (
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) => any

export default function(callback: Command): EnvCommand {
  return async function(dockfile, options) {
    const environment = find(dockfile.environments, ["name", options["<environment>"]])

    if (!environment) {
      throw new Error(`Environment "${options["<environment>"]}" not found in Dockfile.json`)
    }

    const descriptions = dockfile.apps
      .filter(app => shouldBeDeployed(app, environment.name))
      .map(app => configureAppForEnvironment(app, environment.name))

    const dokku = new Dokku(environment.host)
    const repoCache = new RepoCache(url.format({
      slashes: true,
      protocol: "ssh",
      auth: "dokku",
      host: environment.host
    }))

    try {
      await callback(descriptions, dokku, repoCache, options)
    } finally {
      dokku.disconnect()
    }
  }
}

function shouldBeDeployed(description: AppDescription, environment: string) {
  if (description.environments) {
    return description.environments.includes(environment)
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
  const envOptions = mapValues(options, value => {
    if (isPlainObject(value)) {
      return value[environment]
    } else {
      return value
    }
  })

  return omitBy(envOptions, option => option === undefined)
}

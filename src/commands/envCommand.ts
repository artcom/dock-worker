import url from "url"
import find from "lodash/find"
import isPlainObject from "lodash/isPlainObject"
import mapValues from "lodash/mapValues"
import omitBy from "lodash/omitBy"

import Dokku from "../dokku"
import RepoCache from "../repoCache"

import { AppDescription, Environment, Options, Dockfile } from "../types"

export type EnvCommand = (dockfile: Dockfile, options: any) => any

type Command = (
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  options: any
) => any

export default (callback: Command): EnvCommand => async (dockfile, options) => {
  const environment = find(dockfile.environments, ["name", options["<environment>"]])

  if (!environment) {
    throw new Error(`Environment "${options["<environment>"]}" not found in Dockfile.json`)
  }

  const descriptions = dockfile.apps
    .filter(app => shouldBeDeployed(app, environment.name))
    .map(app => configureAppForEnvironment(app, environment))

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

function shouldBeDeployed(description: AppDescription, environment: string) {
  if (description.environments) {
    return description.environments.includes(environment)
  } else {
    return true
  }
}

function configureAppForEnvironment(description: AppDescription, { host, name }: Environment) {
  return Object.assign({}, description, {
    config: resolveHost(selectEnvironmentOptions(description.config, name), host),
    dockerOptions: selectEnvironmentOptions(description.dockerOptions, name)
  })
}

function selectEnvironmentOptions(options: Options, environment: string): Options {
  const envOptions = mapValues(options, value => isPlainObject(value) ? value[environment] : value)
  return omitBy(envOptions, option => option === undefined)
}

function resolveHost(options: Options, host): Options {
  return mapValues(options, (value: string) => value.replace(/\${host}/g, host))
}

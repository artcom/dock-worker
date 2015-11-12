/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "./dokku"
import RepoCache from "./repoCache"
import showProgress from "./showProgress"

import type {Options, Environment, ServiceConfig, ServiceConfigs} from "./types"

export type AppData = DeployedAppData | MissingAppData | AdditionalAppData

export type DeployedAppData = {
  name: string,
  status: "deployed",
  config: ServiceConfig,
  deployed: DeployedConfig
}

type DeployedConfig = {
  version: string,
  config: Options,
  dockerOptions: Options
}

export type MissingAppData = {
  name: string,
  status: "missing",
  config: ServiceConfig
}

export type AdditionalAppData = {
  name: string,
  status: "additional"
}

class Context {
  /* jscs:disable disallowSemicolons */
  environment: Environment;
  configs: ServiceConfigs;
  available: Array<string>;

  dokku: Dokku;
  /* jscs:enable disallowSemicolons */

  constructor(environment, configs) {
    this.environment = environment
    this.configs = configs.filter((config) => configuredForEnvironment(config, environment))
    this.dokku = new Dokku(environment.host)
  }

  definedServiceConfigStatus(config: ServiceConfig): Promise<AppData> {
    const name = config.name

    if (_.includes(this.available, name)) {
      return this.deployedConfig(name).then((deployed) => ({
        name,
        status: "deployed",
        config: config,
        deployed
      }))
    } else {
      return Promise.resolve({
        name,
        status: "missing",
        config: config
      })
    }
  }

  deployedConfig(name: string): Promise<DeployedConfig> {
    return bluebird.props({
      version: this.deployedVersion(name),
      config: this.dokku.config(name),
      dockerOptions: this.dokku.dockerOptions(name)
    })
  }

  deployedVersion(name: string): Promise<string> {
    const repoCache = RepoCache.get()

    return repoCache.getRepo(name, this.environment)
      .then((repo) => repo.fetch(this.environment.name))
      .then((repo) => repo.showRef(`refs/remotes/${this.environment.name}/master`))
      .catch(() => "not deployed yet")
  }

  additionalServiceConfigStatus(name: string): AppData {
    return {
      name,
      status: "additional"
    }
  }
}

function configuredForEnvironment(config, environment) {
  if (config.environments) {
    return _.contains(config.environments, environment.name)
  } else {
    return true
  }
}

export function loadAppData(
  environment: Environment,
  configs: ServiceConfigs
): Promise<Array<AppData>> {
  const context = new Context(environment, configs)

  return context.dokku.apps().then((available) => {
    context.available = available

    const defined = _.map(context.configs, "name")
    const additional = _.difference(available, defined)
      .map((name) => context.additionalServiceConfigStatus(name))

    return bluebird.mapSeries(context.configs, (config) =>
      context.definedServiceConfigStatus(config)
    ).then((deployedAndMissing) => {
      const appData = deployedAndMissing.concat(additional)
      return _.sortBy(appData, "name")
    })
  })
}

export const loadAppDataWithProgress = showProgress(
  "loading service configuration",
  loadAppData
)

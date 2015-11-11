/* @flow */

import _ from "lodash"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

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
    this.configs = configs.filter((config) => _.contains(config.environments, environment.name))

    this.dokku = new Dokku(environment.host)
  }

  definedServiceConfigStatus(serviceConfig: ServiceConfig): Promise<AppData> {
    const name = serviceConfig.name

    if (_.includes(this.available, name)) {
      return Promise.all([
        this.deployedVersion(serviceConfig),
        this.dokku.config(name),
        this.dokku.dockerOptions(name)
      ]).then(([version, config, dockerOptions]: [string, Options, Options]) => {
        return {
          name,
          status: "deployed",
          config: serviceConfig,
          deployed: {
            version,
            config,
            dockerOptions
          }
        }
      })
    } else {
      return Promise.resolve({
        name,
        status: "missing",
        config: serviceConfig
      })
    }
  }

  deployedVersion(config: ServiceConfig): Promise<string> {
    const repoCache = RepoCache.get()

    return repoCache.getRepo(config, this.environment)
      .then((repo) => repo.fetch(this.environment.name))
      .then((repo) => repo.showRef(`refs/remotes/${this.environment.name}/master`))
      .catch(() => "not deployed yet")
  }

  additionalServiceConfigStatus(name: string): Promise<AppData> {
    return Promise.resolve({
      name,
      status: "additional"
    })
  }
}

export function loadAppData(
  environment: Environment,
  configs: ServiceConfigs
): Promise<Array<AppData>> {
  const context = new Context(environment, configs)

  return context.dokku.apps().then((available) => {
    context.available = available

    const deployedAndMissing = context.configs
      .map((config) => context.definedServiceConfigStatus(config))

    const defined = _.map(context.configs, "name")
    const additional = _.difference(available, defined)
      .map((name) => context.additionalServiceConfigStatus(name))

    return Promise.all(deployedAndMissing.concat(additional))
      .then((appData) => _.sortBy(appData, "name"))
  })
}

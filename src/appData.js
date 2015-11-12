/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import colors from "colors/safe"

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

class Provider {
  /* jscs:disable disallowSemicolons */
  environment: Environment;
  configs: ServiceConfigs;

  missing: Array<string>;
  deployed: Array<string>;
  additional: Array<string>;

  dokku: Dokku;
  /* jscs:enable disallowSemicolons */

  constructor(environment, configs) {
    this.environment = environment
    this.configs = configs.filter((config) => configuredForEnvironment(config, environment))
    this.dokku = new Dokku(environment.host)
  }

  initialize(): Promise<Provider> {
    return this.dokku.apps().then((available) => {
      const defined = _.map(this.configs, "name")

      this.missing = _.difference(defined, available)
      this.deployed = _.intersection(defined, available)
      this.additional = _.difference(available, defined)

      return this
    })
  }

  apps(): Array<string> {
    return _.flatten([
      this.missing,
      this.deployed,
      this.additional
    ]).sort()
  }

  loadAppData(name: string): Promise<AppData> {
    if (_.contains(this.missing, name)) {
      const config = _.find(this.configs, { name })
      return this.missingAppData(config)
    } else if (_.contains(this.deployed, name)) {
      const config = _.find(this.configs, { name })
      return this.definedAppData(config)
    } else if (_.contains(this.additional, name)) {
      return this.additionalAppData(name)
    } else {
      return Promise.reject()
    }
  }

  loadAppDataWithProgress(name: string): Promise<AppData> {
    const apps = this.apps()
    const index = apps.indexOf(name) + 1
    const count = apps.length
    const message = `loading configuration for ${colors.bold(name)} (${index}/${count})`

    return showProgress(message, this.loadAppData(name))
  }

  missingAppData(config: ServiceConfig): Promise<AppData> {
    return Promise.resolve({
      name: config.name,
      status: "missing",
      config: config
    })
  }

  definedAppData(config: ServiceConfig): Promise<AppData> {
    return this.deployedConfig(config.name).then((deployed) => ({
      name: config.name,
      status: "deployed",
      config: config,
      deployed
    }))
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

  additionalAppData(name: string): Promise<AppData> {
    return Promise.resolve({
      name,
      status: "additional"
    })
  }
}

function configuredForEnvironment(config, environment) {
  if (config.environments) {
    return _.contains(config.environments, environment.name)
  } else {
    return true
  }
}

export function createProvider(
  environment: Environment,
  configs: ServiceConfigs
): Promise<Provider> {
  const provider = new Provider(environment, configs)
  return provider.initialize()
}

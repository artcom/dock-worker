/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "./dokku"
import RepoCache from "./repoCache"
import showProgress from "./showProgress"

import type {Options, Environment, AppConfig} from "./types"

export type AppData = MissingAppData | CreatedAppData | DeployedAppData | AdditionalAppData

export type MissingAppData = {
  name: string,
  status: "missing",
  config: AppConfig
}

export type CreatedAppData = {
  name: string,
  status: "created",
  config: AppConfig
}

export type DeployedAppData = {
  name: string,
  status: "deployed",
  running: bool,
  config: AppConfig,
  deployed: DeployedConfig
}

type DeployedConfig = {
  version: string,
  config: Options,
  dockerOptions: Options
}

export type AdditionalAppData = {
  name: string,
  status: "additional",
  running: bool
}

class Provider {
  /* jscs:disable disallowSemicolons */
  environment: Environment;
  configs: Array<AppConfig>;
  status: { [key: string]: string };

  missing: Array<string>;
  deployed: Array<string>;
  additional: Array<string>;

  dokku: Dokku;
  /* jscs:enable disallowSemicolons */

  constructor(environment, configs) {
    this.environment = environment
    this.configs = configs
    this.dokku = new Dokku(environment)
  }

  initialize(): Promise<Provider> {
    return this.dokku.ls().then((list) => {
      const available = _.map(list, "name")
      const defined = _.map(this.configs, "name")

      this.status = _.chain(list)
        .map(({ name, status }) => [name, status])
        .fromPairs()
        .value()

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
    if (_.includes(this.missing, name)) {
      const config = _.find(this.configs, { name })
      return this.missingAppData(config)
    } else if (_.includes(this.deployed, name)) {
      const config = _.find(this.configs, { name })
      if (this.status[name] === "NOT_DEPLOYED") {
        return this.createdAppData(config)
      } else {
        return this.deployedAppData(config, this.status[name] === "running")
      }
    } else if (_.includes(this.additional, name)) {
      return this.additionalAppData(name, this.status[name] === "running")
    } else {
      return Promise.reject()
    }
  }

  loadAppDataWithProgress(name: string): Promise<AppData> {
    return showProgress("loading configuration", this.loadAppData(name))
  }

  missingAppData(config: AppConfig): Promise<AppData> {
    return Promise.resolve({
      name: config.name,
      status: "missing",
      config
    })
  }

  createdAppData(config: AppConfig): Promise<AppData> {
    return Promise.resolve({
      name: config.name,
      status: "created",
      config
    })
  }

  deployedAppData(config: AppConfig, running: bool): Promise<AppData> {
    return this.deployedConfig(config.name).then((deployed) => ({
      name: config.name,
      status: "deployed",
      running,
      config,
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
    const repoCache = new RepoCache()

    return repoCache.getRepo(name, this.environment)
      .then((repo) => repo.fetch(this.environment.name))
      .then((repo) => repo.showRef(`refs/remotes/${this.environment.name}/master`))
      .catch(() => "not deployed yet")
  }

  additionalAppData(name: string, running: bool): Promise<AppData> {
    return Promise.resolve({
      name,
      status: "additional",
      running
    })
  }
}

export function createProvider(
  environment: Environment,
  configs: Array<AppConfig>
): Promise<Provider> {
  const provider = new Provider(environment, configs)
  return provider.initialize()
}

export function createProviderWithProgress(
  environment: Environment,
  configs: Array<AppConfig>
): Promise<Provider> {
  return showProgress("loading configuration", createProvider(environment, configs))
}

/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

import type {Options, AppConfig} from "./types"

export type AppData = MissingAppData | CreatedAppData | DeployedAppData | UnknownAppData

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

export type UnknownAppData = {
  name: string,
  status: "unknown",
  running: bool
}

type DeployedConfig = {
  version: string,
  config: Options,
  dockerOptions: Options
}

class Provider {
  /* jscs:disable disallowSemicolons */
  configs: Array<AppConfig>;
  status: { [key: string]: string };

  missingApps: Array<string>;
  knownApps: Array<string>;
  unknownApps: Array<string>;

  dokku: Dokku;
  repoCache: RepoCache;
  /* jscs:enable disallowSemicolons */

  constructor(configs, dokku, repoCache) {
    this.configs = configs
    this.dokku = dokku
    this.repoCache = repoCache
  }

  initialize(): Promise<Provider> {
    return this.dokku.ls().then((list) => {
      const available = _.map(list, "name")
      const defined = _.map(this.configs, "name")

      this.status = _.chain(list)
        .map(({ name, status }) => [name, status])
        .fromPairs()
        .value()

      this.missingApps = _.difference(defined, available)
      this.knownApps = _.intersection(defined, available)
      this.unknownApps = _.difference(available, defined)

      return this
    })
  }

  apps(): Array<string> {
    return _.flatten([
      this.missingApps,
      this.knownApps,
      this.unknownApps
    ]).sort()
  }

  loadAppData(name: string): Promise<AppData> {
    if (_.includes(this.missingApps, name)) {
      const config = _.find(this.configs, { name })
      return this.missingAppData(config)
    } else if (_.includes(this.knownApps, name)) {
      const config = _.find(this.configs, { name })
      if (this.status[name] === "NOT_DEPLOYED") {
        return this.createdAppData(config)
      } else {
        return this.deployedAppData(config, this.status[name] === "running")
      }
    } else if (_.includes(this.unknownApps, name)) {
      return this.unknownAppData(name, this.status[name] === "running")
    } else {
      return Promise.reject()
    }
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
    return this.repoCache.getRepo(name)
      .then((repo) => repo.fetch(this.repoCache.DOKKU_REMOTE))
      .then((repo) => repo.showRef(`refs/remotes/${this.repoCache.DOKKU_REMOTE}/master`))
      .catch(() => "not deployed yet")
  }

  unknownAppData(name: string, running: bool): Promise<AppData> {
    return Promise.resolve({
      name,
      status: "unknown",
      running
    })
  }
}

export function createProvider(
  configs: Array<AppConfig>,
  dokku: Dokku,
  repoCache: RepoCache
): Promise<Provider> {
  const provider = new Provider(configs, dokku, repoCache)
  return provider.initialize()
}

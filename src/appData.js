/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

import type {Options, AppDescription} from "./types"

export type AppData = MissingAppData | CreatedAppData | DeployedAppData | UnknownAppData

export type MissingAppData = {
  name: string,
  status: "missing",
  running: false,
  description: AppDescription,
  actual: ActualConfig
}

export type CreatedAppData = {
  name: string,
  status: "created",
  running: false,
  description: AppDescription,
  actual: ActualConfig
}

export type DeployedAppData = {
  name: string,
  status: "deployed",
  running: bool,
  description: AppDescription,
  actual: ActualConfig
}

export type UnknownAppData = {
  name: string,
  status: "unknown",
  running: bool
}

type ActualConfig = {
  version: string,
  config: Options,
  dockerOptions: Options
}

class Context {
  /* jscs:disable disallowSemicolons */
  descriptions: Array<AppDescription>;
  status: { [key: string]: string };

  missingApps: Array<string>;
  knownApps: Array<string>;
  unknownApps: Array<string>;

  dokku: Dokku;
  repoCache: RepoCache;
  /* jscs:enable disallowSemicolons */

  constructor(descriptions, dokku, repoCache) {
    this.descriptions = descriptions
    this.dokku = dokku
    this.repoCache = repoCache
  }

  initialize(): Promise<Context> {
    return this.dokku.ls().then((list) => {
      const available = _.map(list, "name")
      const defined = _.map(this.descriptions, "name")

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

  listAppNames(): Array<string> {
    return _.flatten([
      this.missingApps,
      this.knownApps,
      this.unknownApps
    ]).sort()
  }

  loadAppData(name: string): Promise<AppData> {
    if (_.includes(this.missingApps, name)) {
      const config = _.find(this.descriptions, { name })
      return this.missingAppData(config)
    } else if (_.includes(this.knownApps, name)) {
      const config = _.find(this.descriptions, { name })
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

  missingAppData(description: AppDescription): Promise<MissingAppData> {
    return Promise.resolve({
      name: description.name,
      status: "missing",
      running: false,
      description,
      actual: {
        version: "",
        config: {},
        dockerOptions: {}
      }
    })
  }

  createdAppData(description: AppDescription): Promise<CreatedAppData> {
    return bluebird.props({
      version: "",
      config: this.dokku.config(description.name),
      dockerOptions: this.dokku.dockerOptions(description.name)
    }).then((actual) => ({
      name: description.name,
      status: "created",
      running: false,
      description,
      actual
    }))
  }

  deployedAppData(description: AppDescription, running: bool): Promise<DeployedAppData> {
    return bluebird.props({
      version: this.actualVersion(description.name),
      config: this.dokku.config(description.name),
      dockerOptions: this.dokku.dockerOptions(description.name)
    }).then((actual) => ({
      name: description.name,
      status: "deployed",
      running,
      description,
      actual
    }))
  }

  actualVersion(name: string): Promise<string> {
    return this.repoCache.getRepo(name)
      .then((repo) => repo.fetch(this.repoCache.DOKKU_REMOTE))
      .then((repo) => repo.showRef(`refs/remotes/${this.repoCache.DOKKU_REMOTE}/master`))
      .catch(() => "not deployed yet")
  }

  unknownAppData(name: string, running: bool): Promise<UnknownAppData> {
    return Promise.resolve({
      name,
      status: "unknown",
      running
    })
  }
}

export function loadContext(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache
): Promise<Context> {
  const context = new Context(descriptions, dokku, repoCache)
  return context.initialize()
}

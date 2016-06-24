/* @flow */

import _ from "lodash"
import bluebird from "bluebird"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

import type { Options, AppDescription } from "./types"

export type AppData = KnownAppData | UnknownAppData

export type KnownAppData = {
  name: string,
  status: "missing" | "exists",
  deployed: bool,
  running: bool,
  description: AppDescription,
  actual: ActualConfig
}

export type UnknownAppData = {
  name: string,
  status: "unknown",
  deployed: bool,
  running: bool,
  actual: ActualConfig
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
  existingApps: Array<string>;
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
      this.existingApps = _.intersection(defined, available)
      this.unknownApps = _.difference(available, defined)

      return this
    })
  }

  listAppNames(): Array<string> {
    return _.flatten([
      this.missingApps,
      this.existingApps,
      this.unknownApps
    ]).sort()
  }

  loadAppData(name: string): Promise<AppData> {
    if (_.includes(this.missingApps, name)) {
      const config = _.find(this.descriptions, { name })
      return this.missingAppData(config)
    } else if (_.includes(this.existingApps, name)) {
      const config = _.find(this.descriptions, { name })
      return this.existingAppData(config, this.status[name])
    } else if (_.includes(this.unknownApps, name)) {
      return this.unknownAppData(name, this.status[name])
    } else {
      return Promise.reject()
    }
  }

  missingAppData(description: AppDescription): Promise<KnownAppData> {
    return Promise.resolve({
      name: description.name,
      status: "missing",
      deployed: false,
      running: false,
      description,
      actual: {
        version: "",
        config: {},
        dockerOptions: {}
      }
    })
  }

  existingAppData(description: AppDescription, status: string): Promise<KnownAppData> {
    const deployed = status !== "NOT_DEPLOYED"
    const running = status === "running"

    return bluebird.props({
      version: deployed ? this.actualVersion(description.name) : "",
      config: this.dokku.config(description.name),
      dockerOptions: this.dokku.dockerOptions(description.name)
    }).then((actual) => ({
      name: description.name,
      status: "exists",
      deployed,
      running,
      description,
      actual
    }))
  }

  unknownAppData(name: string, status: string): Promise<UnknownAppData> {
    const deployed = status !== "NOT_DEPLOYED"
    const running = status === "running"

    return bluebird.props({
      version: deployed ? this.actualVersion(name) : "",
      config: this.dokku.config(name),
      dockerOptions: this.dokku.dockerOptions(name)
    }).then((actual) => ({
      name,
      status: "unknown",
      deployed,
      running,
      actual
    }))
  }

  actualVersion(name: string): Promise<string> {
    return this.repoCache.getRepo(name)
      .then((repo) => repo.fetch(this.repoCache.DOKKU_REMOTE))
      .then((repo) => repo.showRef(`refs/remotes/${this.repoCache.DOKKU_REMOTE}/master`))
      .catch(() => "not deployed yet")
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

/* @flow */

import bluebird from "bluebird"
import chalk from "chalk"
import difference from "lodash/difference"
import find from "lodash/find"
import flatten from "lodash/flatten"
import intersection from "lodash/intersection"
import map from "lodash/map"
import fromPairs from "lodash/fromPairs"

import Dokku from "./dokku"
import RepoCache from "./repoCache"
import showProgress from "./showProgress"

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
  descriptions: Array<AppDescription>;
  status: { [key: string]: string };

  missingApps: Array<string>;
  existingApps: Array<string>;
  unknownApps: Array<string>;

  dokku: Dokku;
  repoCache: RepoCache;

  constructor(descriptions, dokku, repoCache) {
    this.descriptions = descriptions
    this.dokku = dokku
    this.repoCache = repoCache
  }

  async initialize(): Promise {
    const list = await this.dokku.ls()
    const available = map(list, "name")
    const defined = map(this.descriptions, "name")

    this.status = fromPairs(list.map(({ name, status }) => [name, status]))

    this.missingApps = difference(defined, available)
    this.existingApps = intersection(defined, available)
    this.unknownApps = difference(available, defined)
  }

  listAppNames(): Array<string> {
    return flatten([
      this.missingApps,
      this.existingApps,
      this.unknownApps
    ]).sort()
  }

  loadAppData(name: string): Promise<AppData> {
    if (this.missingApps.includes(name)) {
      const config = find(this.descriptions, { name })
      return this.missingAppData(config)
    } else if (this.existingApps.includes(name)) {
      const config = find(this.descriptions, { name })
      return this.existingAppData(config, this.status[name])
    } else if (this.unknownApps.includes(name)) {
      return this.unknownAppData(name, this.status[name])
    } else {
      return Promise.reject()
    }
  }

  async missingAppData(description: AppDescription): Promise<KnownAppData> {
    return {
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
    }
  }

  async existingAppData(description: AppDescription, status: string): Promise<KnownAppData> {
    const deployed = status !== "NOT_DEPLOYED"
    const running = status === "running"

    return {
      name: description.name,
      status: "exists",
      deployed,
      running,
      description,
      actual: {
        version: deployed ? await this.actualVersion(description.name) : "",
        config: await this.dokku.config(description.name),
        dockerOptions: await this.dokku.dockerOptions(description.name)
      }
    }
  }

  async unknownAppData(name: string, status: string): Promise<UnknownAppData> {
    const deployed = status !== "NOT_DEPLOYED"
    const running = status === "running"

    return {
      name,
      status: "unknown",
      deployed,
      running,
      actual: {
        version: deployed ? await this.actualVersion(name) : "",
        config: await this.dokku.config(name),
        dockerOptions: await this.dokku.dockerOptions(name)
      }
    }
  }

  async actualVersion(name: string): Promise<string> {
    const repo = await this.repoCache.getRepo(name)
    await repo.fetch(this.repoCache.DOKKU_REMOTE)
    return await repo.showRef(`refs/remotes/${this.repoCache.DOKKU_REMOTE}/master`)
  }
}

export async function loadAppData(
  descriptions: Array<AppDescription>,
  dokku: Dokku,
  repoCache: RepoCache,
  selectedApps: Array<string> = []
): Promise<Array<AppData>> {
  const context = new Context(descriptions, dokku, repoCache)
  const loadingListMessage = (spinner) => chalk.gray(`loading service list ${spinner}`)
  await showProgress(loadingListMessage, context.initialize())

  const appNames = context.listAppNames()
    .filter(appName => selectedApps.length === 0 || selectedApps.includes(appName))

  const inProgress = new Set()
  let completed = 0

  const loadingDataMessage = (spinner) => {
    const services = Array
      .from(inProgress)
      .map(appName => `${chalk.bold(appName)} ${spinner}`)

    const count = `(${completed}/${appNames.length})`
    return chalk.gray([`loading service data ${count}`, ...services].join("\n"))
  }

  return await showProgress(loadingDataMessage, bluebird.map(appNames, async function(appName) {
    inProgress.add(appName)
    const appData = await context.loadAppData(appName)
    inProgress.delete(appName)
    completed += 1
    return appData
  }, {
    concurrency: 4
  }))
}

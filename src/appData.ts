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
import showMessageUntilSettled from "./showMessageUntilSettled"

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

  async initialize(): Promise<> {
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

    const [version, config, dockerOptions] = await Promise.all([
      deployed ? this.actualVersion(description.name) : "",
      this.dokku.config(description.name),
      this.dokku.dockerOptions(description.name)
    ])

    return {
      name: description.name,
      status: "exists",
      deployed,
      running,
      description,
      actual: {
        version,
        config,
        dockerOptions
      }
    }
  }

  async unknownAppData(name: string, status: string): Promise<UnknownAppData> {
    const deployed = status !== "NOT_DEPLOYED"
    const running = status === "running"

    const [version, config, dockerOptions] = await Promise.all([
      deployed ? this.actualVersion(name) : "",
      this.dokku.config(name),
      this.dokku.dockerOptions(name)
    ])

    return {
      name,
      status: "unknown",
      deployed,
      running,
      actual: {
        version,
        config,
        dockerOptions
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
  await initializeWithMessage(context)

  const appNames = context.listAppNames()
    .filter(appName => selectedApps.length === 0 || selectedApps.includes(appName))

  return await loadAppDataWithMessage(context, appNames)
}

function initializeWithMessage(context) {
  const message = spinner => chalk.gray(`loading service list ${spinner}`)
  return showMessageUntilSettled(message, context.initialize())
}

function loadAppDataWithMessage(context, appNames) {
  const inProgress = new Set()
  let completed = 0

  const message = spinner => {
    const services = Array
      .from(inProgress)
      .map(appName => `${chalk.bold(appName)} ${spinner}`)

    const count = `(${completed}/${appNames.length})`
    return chalk.gray([`loading service data ${count}`, ...services].join("\n"))
  }

  return showMessageUntilSettled(message, bluebird.map(appNames, async appName => {
    inProgress.add(appName)
    const appData = await context.loadAppData(appName)
    inProgress.delete(appName)
    completed += 1
    return appData
  }, {
    concurrency: 4
  }))
}

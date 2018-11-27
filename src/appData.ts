import chalk from "chalk"
import difference from "lodash/difference"
import find from "lodash/find"
import flatten from "lodash/flatten"
import intersection from "lodash/intersection"
import map from "lodash/map"

import Dokku, { AppStatus } from "./dokku"
import RepoCache from "./repoCache"
import showMessageUntilSettled from "./showMessageUntilSettled"
import mapPromiseWithConcurrency from "./mapPromiseWithConcurrency"

import { AppDescription, Options } from "./types"

export type AppData = KnownAppData | UnknownAppData

export type KnownAppData = {
  name: string,
  status: "missing" | "exists" | "deployed",
  deployed: Boolean,
  running: Boolean,
  description: AppDescription,
  actual: ActualConfig
}

export type UnknownAppData = {
  name: string,
  status: "unknown",
  deployed: Boolean,
  running: Boolean,
  actual: ActualConfig
}

type ActualConfig = {
  version: string,
  config: Options,
  dockerOptions: Options
}

class Context {
  descriptions: AppDescription[]
  status: Map<string, AppStatus>

  missingApps: string[]
  existingApps: string[]
  unknownApps: string[]

  dokku: Dokku
  repoCache: RepoCache

  constructor(descriptions, dokku, repoCache) {
    this.descriptions = descriptions
    this.dokku = dokku
    this.repoCache = repoCache
  }

  async initialize(): Promise<void> {
    const list = await this.dokku.report()
    const available = map(list, "name")
    const defined = map(this.descriptions, "name")

    this.status = new Map()
    list.forEach(appStatus => {
      this.status.set(appStatus.name, appStatus)
    })

    this.missingApps = difference(defined, available)
    this.existingApps = intersection(defined, available)
    this.unknownApps = difference(available, defined)
  }

  listAppNames(): string[] {
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
      return this.existingAppData(config)
    } else if (this.unknownApps.includes(name)) {
      return this.unknownAppData(name)
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

  async existingAppData(description: AppDescription): Promise<KnownAppData> {
    const { deployed, running } = this.status.get(description.name)

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

  async unknownAppData(name: string): Promise<UnknownAppData> {
    const { deployed, running } = this.status.get(name)

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
  descriptions: AppDescription[],
  dokku: Dokku,
  repoCache: RepoCache,
  selectedApps: string[] = []
): Promise<AppData[]> {
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

  const loadAppData = async appName => {
    inProgress.add(appName)
    const appData = await context.loadAppData(appName)
    inProgress.delete(appName)
    completed += 1
    return appData
  }

  return showMessageUntilSettled(message, mapPromiseWithConcurrency(appNames, loadAppData, 5))
}

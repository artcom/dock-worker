import isEqual from "lodash/isEqual"

import diffOptions, { Change } from "../diffOptions"
import Dokku from "../dokku"

import { KnownAppData } from "../appData"
import { AppDescription } from "../types"

export function needsDockerOptionAction(app: KnownAppData): boolean {
  return !isEqual(app.description.dockerOptions, app.actual.dockerOptions)
}

export function makeDockerOptionAction(app: KnownAppData): DockerOptionAction {
  return new DockerOptionAction(app)
}

export function isDockerOptionAction(action: any): boolean {
  return action instanceof DockerOptionAction
}

class DockerOptionAction {
  changes: Array<Change>;
  description: AppDescription;

  constructor(app: KnownAppData) {
    this.changes = diffOptions(app.description.dockerOptions, app.actual.dockerOptions)
    this.description = app.description
  }

  describe(): Array<string> {
    return this.changes.map(describeChange)
  }

  async run(dokku: Dokku): Promise<void> {
    const appName = this.description.name

    for (const change of this.changes) {
      await applyChange(dokku, appName, change)
    }

    if (this.description.stopBeforeDeployment) {
      await dokku.stop(appName)
      await dokku.start(appName)
    } else {
      await dokku.restart(appName)
    }
  }
}

function describeChange(change: Change): string {
  switch (change.type) {
    case "add":
    case "update":
      return `set "${change.key}" for phases ${change.value.join(",")}`
    case "remove":
      return `remove "${change.key}" for phases ${change.oldValue.join(",")}`
    default:
      return ""
  }
}

async function applyChange(dokku: Dokku, appName: string, change: Change): Promise<void> {
  switch (change.type) {
    case "add": {
      const { key, value } = change
      await dokku.addDockerOption(appName, key, value)
      break
    }

    case "update": {
      const { key, value, oldValue } = change
      await dokku.removeDockerOption(appName, key, oldValue)
      await dokku.addDockerOption(appName, key, value)
      break
    }

    case "remove": {
      const { key, oldValue } = change
      await dokku.removeDockerOption(appName, key, oldValue)
      break
    }
  }
}

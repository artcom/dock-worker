/* @flow */

import diffOptions from "../diffOptions"
import Dokku from "../dokku"

import type { KnownAppData } from "../appData"
import type { Change } from "../diffOptions"
import type { AppDescription } from "../types"

export default class {
  changes: Array<Change>;
  description: AppDescription;

  constructor(app: KnownAppData) {
    this.changes = diffOptions(app.description.dockerOptions, app.actual.dockerOptions)
    this.description = app.description
  }

  describe(): Array<string> {
    return this.changes.map(describeChange)
  }

  async run(dokku: Dokku): Promise {
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

async function applyChange(dokku: Dokku, appName: string, change: Change): Promise {
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

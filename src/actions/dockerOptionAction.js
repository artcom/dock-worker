/* @flow */

import bluebird from "bluebird"

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

  run(dokku: Dokku): Promise {
    const appName = this.description.name

    return bluebird.each(this.changes, (change) => applyChange(dokku, appName, change))
      .then(() => {
        if (this.description.stopBeforeDeployment) {
          return dokku.stop(appName).then(() => dokku.start(appName))
        } else {
          return dokku.restart(appName)
        }
      })
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

function applyChange(dokku: Dokku, appName: string, change: Change): Promise {
  switch (change.type) {
    case "add": {
      const { key, value } = change
      return dokku.addDockerOption(appName, key, value)
    }

    case "update": {
      const { key, value, oldValue } = change
      return dokku.removeDockerOption(appName, key, oldValue)
        .then(() => dokku.addDockerOption(appName, key, value))
    }

    case "remove": {
      const { key, oldValue } = change
      return dokku.removeDockerOption(appName, key, oldValue)
    }

    default:
      return Promise.resolve()
  }
}
